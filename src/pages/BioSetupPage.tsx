import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { placeByHandle } from "@/lib/catalog";
import { stallByHandle } from "@/lib/bio-handle";
import { toast } from "sonner";
import { BUSINESS_CATEGORIES, type BusinessCategoryId } from "@shared/business";
import { handleFromDomain, handleFromName, handleMatchesClaim, normalizeHandle, randomHexHandle } from "@shared/bio";
import { addressOk, countryByCode, emptyAddress, formatAddress, formatGps, isValidPhone, type AddressParts } from "@shared/geo-address";
import { authErrorMessage } from "@shared/auth-email";
import { isEmail, passwordOk } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { AuthGate } from "@/components/auth/AuthGate";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { AddressFields } from "@/components/forms/AddressFields";
import { PhoneField } from "@/components/forms/PhoneField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useListings } from "@/contexts/ListingsContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { liveBackendEnabled } from "@/lib/functions";
import { locateBusiness } from "@/lib/locate";
import { cn } from "@/lib/cn";

export function BioSetupPage() {
  const [, nav] = useLocation();
  const params = new URLSearchParams(useSearch());
  const asBusiness = params.get("kind") === "business";
  const { user, authReady, register, createHostProperty } = useAuth();
  const { mine, business, createProfile } = useBio();
  const { savePlace } = useListings();
  const wanted = params.get("handle") || "";
  const current = asBusiness ? business : mine;
  const [step, setStep] = useState(1);
  const [handle, setHandle] = useState(current?.handle || wanted);
  const [name, setName] = useState(current?.name || "");
  const [shortWhy, setShortWhy] = useState(current?.shortWhy || "");
  const [category, setCategory] = useState<BusinessCategoryId>(current?.category || "eat");
  const [hours, setHours] = useState("9am–5pm");
  const [registrationNumber, setRegistrationNumber] = useState(business?.registrationNumber || "");
  const [domain, setDomain] = useState(business?.domain || "");
  const [trademark, setTrademark] = useState(business?.trademark || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(current?.phone || "");
  const [address, setAddress] = useState<AddressParts>(emptyAddress("AU"));
  const [geo, setGeo] = useState(current?.geo);
  const [locating, setLocating] = useState(false);
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const exceptId = current?.id;
  const handleStatus = useHandleStatus(handle, exceptId);
  const suggested = useMemo(() => {
    if (asBusiness && domain) return handleFromDomain(domain) || handleFromName(name);
    return handleFromName(name);
  }, [asBusiness, domain, name]);
  const matches = handleMatchesClaim(handle, { name, domain, trademark });
  const handleOk = handleStatus.ok && (!asBusiness || matches);
  const nameOk = name.trim().length >= 2;
  const emailOk = !user ? isEmail(email) : true;
  const passOk = !user ? passwordOk(password) : true;

  useEffect(() => {
    const h = normalizeHandle(wanted);
    if (!h) return;
    setHandle(h);
    const place = placeByHandle(h);
    const stall = stallByHandle(h);
    if (place) {
      setName((n) => n || place.name);
      setShortWhy((n) => n || place.shortWhy);
      return;
    }
    if (!stall) return;
    setName((n) => n || stall.name);
    setShortWhy((n) => n || stall.shortWhy);
  }, [wanted]);

  async function locate() {
    setLocating(true);
    try {
      const found = await locateBusiness();
      setGeo(found.geo);
      if (found.fields) {
        const code = found.fields.countryCode || address.countryCode;
        setAddress((a) => ({
          ...a,
          countryCode: code || a.countryCode,
          line1: found.fields?.address || a.line1,
          city: found.fields?.city || a.city,
          region: found.fields?.state || a.region,
        }));
        const dial = countryByCode(code)?.dial;
        if (dial && !phone) setPhone(dial + " ");
      }
      toast.success(formatGps(found.geo.lat, found.geo.lng));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Location failed");
    } finally {
      setLocating(false);
    }
  }

  async function finish() {
    if (!handleOk) {
      toast.error(handleStatus.reason || "Handle taken");
      return;
    }
    setBusy(true);
    try {
      let createdPropId: string | undefined;
      const newAccount = !user;
      if (!user) {
        try {
          const res = await register(email, name || email, {
            kind: asBusiness ? "venue" : undefined,
            propertyName: asBusiness ? name : undefined,
            city: address.city || "Sydney",
            password,
          });
          createdPropId = res.propertyId;
        } catch (err) {
          if (liveBackendEnabled()) throw err;
        }
      } else if (asBusiness && (!user.propertyIds || !user.propertyIds.length)) {
        try {
          const res = await createHostProperty({
            propertyName: name,
            kind: "venue",
            city: address.city || "Sydney",
          });
          createdPropId = res.propertyId;
        } catch (err) {
          if (liveBackendEnabled()) throw err;
        }
      }
      await createProfile({
        handle: normalizeHandle(handle),
        name,
        city: address.city || "Sydney",
        category: asBusiness ? category : "services",
        shortWhy: shortWhy || (asBusiness ? name : "On AirPal"),
        kind: asBusiness ? "business" : "person",
        registeredName: asBusiness ? name : undefined,
        registrationNumber: asBusiness ? registrationNumber : undefined,
        domain: asBusiness ? domain : undefined,
        trademark: asBusiness ? trademark : undefined,
        phone: asBusiness ? phone : undefined,
        geo: asBusiness ? geo : undefined,
        propertyId: createdPropId || user?.propertyIds?.[0] || undefined,
      });
      if (asBusiness) {
        await savePlace({
          name,
          category,
          address: formatAddress(address),
          hours,
          shortWhy: shortWhy || name,
          phone,
          geo,
          handle: normalizeHandle(handle),
        });
      }
      toast.success(newAccount ? "Yours. Check your email to confirm the account" : "Yours");
      nav(asBusiness ? "/business" : "/bio/edit");
    } catch (err) {
      toast.error(authErrorMessage(err, "Failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-mute">Loading…</div>;
  }

  if (!user) {
    return (
      <AuthGate
        next={asBusiness ? "/bio/setup?kind=business" : "/bio/setup"}
        kicker={asBusiness ? "Host" : "Account"}
        title={asBusiness ? "List your place" : "Choose your handle"}
        lede="Sign in or create an account first. Full name, personal @ or hex id, email, password, then a confirm email."
      />
    );
  }

  function onPerson(e: FormEvent) {
    e.preventDefault();
    if (!nameOk || !handleOk || !emailOk || !passOk) {
      toast.error("Check the ticks");
      return;
    }
    void finish();
  }

  function nextBusiness() {
    if (step === 1) {
      if (!nameOk || !handleOk || !registrationNumber.trim() || !accept) {
        toast.error("Name, unique handle, registration, and the tick");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!addressOk(address) || !isValidPhone(phone) || !geo) {
        toast.error("Address, phone, and pin the place");
        return;
      }
      setStep(3);
      return;
    }
    void finish();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">{asBusiness ? "Host" : "AirPal.Me/@"}</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">{asBusiness ? "List your place" : "Your handle"}</h1>
      <p className="mt-2 text-sm text-mute">
        {asBusiness ? "Three short steps. Handle must be unique and match the registered name, mark, or domain." : "Pick a unique @. Ticks mean it checks out."}
      </p>

      {asBusiness && (
        <div className="mt-4 flex gap-2">
          {([1, 2, 3] as const).map((n) => (
            <span key={n} className={cn("h-8 flex-1 rounded-full text-center text-sm leading-8", step === n ? "bg-ink text-white" : "bg-white ring-1 ring-line")}>
              {n}
            </span>
          ))}
        </div>
      )}

      {!asBusiness && (
        <form className="mt-6 space-y-3" onSubmit={onPerson}>
          <ValidField label="Name" ok={nameOk}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!wanted) setHandle(handleFromName(e.target.value));
              }}
              autoComplete="name"
              className={fieldInput}
            />
          </ValidField>
          <ValidField
            label={`@${normalizeHandle(handle) || "handle"}`}
            ok={handleOk}
            error={handleStatus.reason || (handleStatus.checking ? undefined : null)}
            hint={handleStatus.checking ? "Checking…" : suggested && suggested !== normalizeHandle(handle) ? `Suggested @${suggested}` : "Unique"}
          >
            <input value={handle} onChange={(e) => setHandle(e.target.value)} className={fieldInput} />
          </ValidField>
          <button type="button" className="text-[12px] text-brand" onClick={() => setHandle(randomHexHandle(8))}>
            Use a hexadecimal id
          </button>
          {!user && (
            <>
              <ValidField label="Email" ok={emailOk} error={email && !emailOk ? "Need a real email" : null}>
                <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldInput} />
              </ValidField>
              <ValidField label="Password" ok={passOk} error={password && !passOk ? "At least 8 characters" : null}>
                <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldInput} />
              </ValidField>
            </>
          )}
          <Button type="submit" className="w-full" disabled={busy || !handleOk} loading={busy}>
            Claim
          </Button>
        </form>
      )}

      {asBusiness && step === 1 && (
        <div className="mt-6 space-y-3">
          <ValidField label="Registered business name" ok={nameOk}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!wanted) setHandle(handleFromName(e.target.value));
              }}
              className={fieldInput}
            />
          </ValidField>
          <ValidField
            label={`@${normalizeHandle(handle) || "handle"}`}
            ok={handleOk}
            error={handle && !matches ? "Must match name, mark, or domain" : handleStatus.reason}
            hint={handleStatus.checking ? "Checking…" : "No duplicates"}
          >
            <input value={handle} onChange={(e) => setHandle(e.target.value)} className={fieldInput} />
          </ValidField>
          <ValidField label="ABN / company number" ok={registrationNumber.trim().length >= 5}>
            <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className={fieldInput} />
          </ValidField>
          <ValidField label="Domain (optional)">
            <input
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                const from = handleFromDomain(e.target.value);
                if (from && !wanted) setHandle(from);
              }}
              placeholder="cutbar.com.au"
              className={fieldInput}
            />
          </ValidField>
          <ValidField label="Trade mark (optional)">
            <input value={trademark} onChange={(e) => setTrademark(e.target.value)} className={fieldInput} />
          </ValidField>
          <label className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3 text-sm ring-1 ring-line">
            <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
            <span>
              Registered business, I’m authorised, and this handle may move to the name / mark / domain owner.{" "}
              <Link href="/terms" className="text-brand">
                Terms
              </Link>
            </span>
          </label>
          <Button className="w-full" onClick={nextBusiness} disabled={!handleOk}>
            Next · address
          </Button>
        </div>
      )}

      {asBusiness && step === 2 && (
        <div className="mt-6 space-y-3">
          <Button variant="ghost" className="w-full" disabled={locating} onClick={() => void locate()}>
            {locating ? "Locating…" : geo ? `Pinned ${formatGps(geo.lat, geo.lng)} · update` : "Use current location"}
          </Button>
          {geo && (
            <p className="text-center text-[12px] text-mute">
              {formatGps(geo.lat, geo.lng)}
            </p>
          )}
          <AddressFields value={address} onChange={setAddress} />
          <PhoneField value={phone} onChange={setPhone} required />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-1" onClick={nextBusiness}>
              Next
            </Button>
          </div>
        </div>
      )}

      {asBusiness && step === 3 && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {BUSINESS_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn("h-9 rounded-full px-3 text-sm", category === c.id ? "bg-brand text-white" : "bg-white ring-1 ring-line")}
              >
                {c.label}
              </button>
            ))}
          </div>
          <ValidField label="Hours">
            <input value={hours} onChange={(e) => setHours(e.target.value)} className={fieldInput} />
          </ValidField>
          <ValidField label="Short why" ok={shortWhy.trim().length >= 4}>
            <input value={shortWhy} onChange={(e) => setShortWhy(e.target.value)} placeholder="Why guests come" className={fieldInput} />
          </ValidField>
          {!user && (
            <>
              <ValidField label="Email" ok={emailOk}>
                <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldInput} />
              </ValidField>
              <ValidField label="Password" ok={passOk}>
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldInput} />
              </ValidField>
            </>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button className="flex-1" disabled={busy} loading={busy} onClick={() => void finish()}>
              Publish
            </Button>
          </div>
        </div>
      )}

      {!asBusiness && (
        <button type="button" className="mt-5 w-full text-center text-sm text-brand" onClick={() => nav("/bio/setup?kind=business")}>
          Host a registered business
        </button>
      )}
    </div>
  );
}
