import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import type { FacilityItem, PropertyInfo, StaffPick } from "@shared/airpal-data";
import { savePropertyProfile, updatePropertyWifi } from "@/lib/properties";
import { stampWifiSavedAt, wifiSavedAt } from "@/components/host/HostActivationChecklist";
import { getPropertyWifiRemote, liveBackendEnabled } from "@/lib/functions";
import { freshnessOf } from "@shared/freshness";

const field =
  "mt-1 h-12 w-full rounded-2xl bg-paper/70 px-4 text-[16px] md:text-[15px] ring-1 ring-line outline-none transition focus:bg-card focus:ring-2 focus:ring-brand/45";

export function HostPlaceForm({
  property,
  onSaved,
}: {
  property: PropertyInfo;
  onSaved: (next: PropertyInfo) => void;
}) {
  const [name, setName] = useState(property.name);
  const [tagline, setTagline] = useState(property.tagline || "");
  const [address, setAddress] = useState(property.address || "");
  const [phone, setPhone] = useState(property.phone || "");
  const [city, setCity] = useState(property.city || "");
  const [checkIn, setCheckIn] = useState(property.checkIn || "");
  const [checkOut, setCheckOut] = useState(property.checkOut || "");
  const [breakfast, setBreakfast] = useState(property.breakfast);
  const [facilities, setFacilities] = useState<FacilityItem[]>(property.facilities || []);
  const [picks, setPicks] = useState<StaffPick[]>(property.staffPicks || []);
  const [winbackTitle, setWinbackTitle] = useState(property.winbackOffer?.title || "");
  const [winbackDetail, setWinbackDetail] = useState(property.winbackOffer?.detail || "");
  const [network, setNetwork] = useState(property.wifi?.network || "");
  const [password, setPassword] = useState("");
  const [speed, setSpeed] = useState(property.wifi?.speed || "");
  const [saving, setSaving] = useState(false);
  const [savingWifi, setSavingWifi] = useState(false);

  useEffect(() => {
    setName(property.name);
    setTagline(property.tagline || "");
    setAddress(property.address || "");
    setPhone(property.phone || "");
    setCity(property.city || "");
    setCheckIn(property.checkIn || "");
    setCheckOut(property.checkOut || "");
    setBreakfast(property.breakfast);
    setFacilities(property.facilities || []);
    setPicks(property.staffPicks || []);
    setWinbackTitle(property.winbackOffer?.title || "");
    setWinbackDetail(property.winbackOffer?.detail || "");
    setNetwork(property.wifi?.network || "");
    setSpeed(property.wifi?.speed || "");
  }, [
    property.id,
    property.name,
    property.tagline,
    property.address,
    property.phone,
    property.city,
    property.checkIn,
    property.checkOut,
    property.breakfast,
    property.facilities,
    property.wifi,
    property.staffPicks,
    property.winbackOffer,
  ]);

  useEffect(() => {
    if (!property.id || property.id === "unknown" || !liveBackendEnabled()) return;
    void getPropertyWifiRemote({ propertyId: property.id })
      .then((res) => {
        if (res.network) setNetwork(res.network);
        if (res.password) setPassword(res.password);
        if (res.speed) setSpeed(res.speed);
      })
      .catch(() => undefined);
  }, [property.id]);

  async function savePlace(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Add the property name");
      return;
    }
    setSaving(true);
    try {
      const cleanPicks = picks
        .map((p, i) => {
          const detail = p.detail?.trim();
          return { id: p.id || `pick-${i}`, title: p.title.trim(), ...(detail ? { detail } : {}) };
        })
        .filter((p) => p.title)
        .slice(0, 3);
      const winback = winbackTitle.trim();
      const next = await savePropertyProfile(property.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        city: city.trim(),
        checkIn: checkIn.trim(),
        checkOut: checkOut.trim(),
        breakfast,
        facilities: facilities.filter((f) => f.name.trim()),
        staffPicks: cleanPicks,
        winbackOffer: winback
          ? {
              title: winback,
              ...(winbackDetail.trim() ? { detail: winbackDetail.trim() } : {}),
            }
          : undefined,
        confirmHours: true,
      });
      onSaved(next);
      toast.success("Stay details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save stay details");
    } finally {
      setSaving(false);
    }
  }

  async function saveWifi(e: FormEvent) {
    e.preventDefault();
    if (!network.trim() || !password.trim()) {
      toast.error("Set the guest network and password");
      return;
    }
    setSavingWifi(true);
    try {
      await updatePropertyWifi({
        propertyId: property.id,
        network: network.trim(),
        password: password.trim(),
        speed: speed.trim() || "Wi-Fi",
      });
      stampWifiSavedAt(property.id);
      onSaved({
        ...property,
        wifi: { network: network.trim(), password: password.trim(), speed: speed.trim() || "Wi-Fi" },
        wifiUpdatedAt: new Date().toISOString(),
      });
      toast.success("Wi-Fi updated for guests");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t save Wi-Fi");
    } finally {
      setSavingWifi(false);
    }
  }

  const wifiFresh = freshnessOf(property.wifiUpdatedAt || wifiSavedAt(property.id), "wifi");

  return (
    <div className="mt-5 space-y-5">
      <form onSubmit={savePlace} className="space-y-4 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Guest stay</p>
          <h2 className="font-display text-xl font-semibold tracking-tight">Place details</h2>
          <p className="mt-1 text-[13px] text-mute">
            What guests see after they scan. Saved to the live property record.
          </p>
        </div>
        <HostFreshnessBanner
          kind="hours"
          at={property.hoursVerifiedAt}
          onConfirm={async () => {
            const next = await savePropertyProfile(property.id, { confirmHours: true });
            onSaved(next);
          }}
        />
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Tagline</span>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={field} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>
        </div>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Address</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={field} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Check-in</span>
            <input value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Checkout</span>
            <input value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={field} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Breakfast hours</span>
            <input
              value={breakfast?.hours || ""}
              onChange={(e) => setBreakfast({ ...breakfast, hours: e.target.value })}
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Breakfast location</span>
            <input
              value={breakfast?.location || ""}
              onChange={(e) => setBreakfast({ ...breakfast, location: e.target.value })}
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Breakfast type</span>
            <input
              value={breakfast?.type || ""}
              onChange={(e) => setBreakfast({ ...breakfast, type: e.target.value })}
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink/70">Breakfast price</span>
            <input
              value={breakfast?.price || ""}
              onChange={(e) => setBreakfast({ ...breakfast, price: e.target.value })}
              className={field}
            />
          </label>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-ink/70">Facilities</p>
            <button
              type="button"
              className="text-xs font-semibold text-brand"
              onClick={() =>
                setFacilities((rows) => [...rows, { name: "", hours: "", floor: "", details: "", icon: "Sparkles" }])
              }
            >
              Add
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {facilities.map((row, i) => (
              <li key={`${row.name}-${i}`} className="rounded-2xl bg-paper/70 p-3 ring-1 ring-line">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={row.name}
                    placeholder="Name"
                    onChange={(e) =>
                      setFacilities((rows) => rows.map((r, n) => (n === i ? { ...r, name: e.target.value } : r)))
                    }
                    className={field + " mt-0"}
                  />
                  <input
                    value={row.hours}
                    placeholder="Hours"
                    onChange={(e) =>
                      setFacilities((rows) => rows.map((r, n) => (n === i ? { ...r, hours: e.target.value } : r)))
                    }
                    className={field + " mt-0"}
                  />
                  <input
                    value={row.floor}
                    placeholder="Floor"
                    onChange={(e) =>
                      setFacilities((rows) => rows.map((r, n) => (n === i ? { ...r, floor: e.target.value } : r)))
                    }
                    className={field + " mt-0"}
                  />
                  <input
                    value={row.details || ""}
                    placeholder="Details"
                    onChange={(e) =>
                      setFacilities((rows) => rows.map((r, n) => (n === i ? { ...r, details: e.target.value } : r)))
                    }
                    className={field + " mt-0"}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs text-mute hover:text-ink"
                  onClick={() => setFacilities((rows) => rows.filter((_, n) => n !== i))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-ink/70">Staff picks (shows in the guest companion)</p>
            {picks.length < 3 && (
              <button
                type="button"
                className="text-xs font-semibold text-brand"
                onClick={() => setPicks((rows) => [...rows, { id: `pick-${Date.now()}`, title: "", detail: "" }])}
              >
                Add
              </button>
            )}
          </div>
          <ul className="mt-2 space-y-2">
            {picks.map((row, i) => (
              <li key={row.id || i} className="rounded-2xl bg-paper/70 p-3 ring-1 ring-line">
                <div className="grid gap-2">
                  <input
                    value={row.title}
                    placeholder="Tonight: harbourside dinner cruise"
                    onChange={(e) =>
                      setPicks((rows) => rows.map((r, n) => (n === i ? { ...r, title: e.target.value } : r)))
                    }
                    className={field + " mt-0"}
                  />
                  <input
                    value={row.detail || ""}
                    placeholder="Why guests love it (optional)"
                    onChange={(e) =>
                      setPicks((rows) => rows.map((r, n) => (n === i ? { ...r, detail: e.target.value } : r)))
                    }
                    className={field + " mt-0"}
                  />
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs text-mute hover:text-ink"
                  onClick={() => setPicks((rows) => rows.filter((_, n) => n !== i))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {picks.length === 0 && (
            <p className="mt-2 text-xs text-mute">No picks yet — guests just see the standard companion.</p>
          )}
        </div>
        <div className="grid gap-3">
          <p className="text-[12px] font-semibold text-ink/70">Return-visit offer (shows after the guest rates)</p>
          <label className="block">
            <span className="text-[12px] text-mute">Offer title</span>
            <input
              value={winbackTitle}
              onChange={(e) => setWinbackTitle(e.target.value)}
              placeholder="10% off your next stay"
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-[12px] text-mute">Details</span>
            <input
              value={winbackDetail}
              onChange={(e) => setWinbackDetail(e.target.value)}
              placeholder="Mention this screen at checkout"
              className={field}
            />
          </label>
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save stay details"}
        </Button>
      </form>

      <form onSubmit={saveWifi} className="space-y-3 rounded-[28px] bg-card/90 p-5 ring-1 ring-line shadow-sm md:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Wi-Fi</p>
          <h2 className="font-display text-xl font-semibold tracking-tight">Guest network</h2>
          <p className="mt-1 text-[13px] text-mute">
            Password stays in host secrets — never on the public property doc. {wifiFresh.confirmedLabel}.
          </p>
        </div>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Network name</span>
          <input value={network} onChange={(e) => setNetwork(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Live guest password"
            className={field}
          />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-ink/70">Speed</span>
          <input value={speed} onChange={(e) => setSpeed(e.target.value)} className={field} />
        </label>
        <Button type="submit" className="w-full" disabled={savingWifi}>
          {savingWifi ? "Saving…" : "Save Wi-Fi"}
        </Button>
      </form>
    </div>
  );
}
