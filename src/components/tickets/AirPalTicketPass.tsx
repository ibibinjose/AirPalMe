import { useEffect, useState } from "react";
import { Download, Share2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import { googleWalletTicketUrl, openAppleWalletPass, openGoogleWalletPass, ticketWalletPassUrl } from "@/lib/wallet";
import { makeQrDataUrl } from "@/lib/qr";
import { publicSiteOrigin } from "@/lib/public-origin";
import { shareNative } from "@/lib/native";
import { bookingDisplayPaid, ticketGateUrl, type Booking } from "@shared/booking";

interface Props {
  booking: Booking & { id: string };
  guestName?: string;
  hostName?: string;
  showActions?: boolean;
}

/** Gate-scan URL for the ticket QR. Same path the Apple and Google wallet barcodes encode. */
export function ticketQrHref(booking: Booking & { id: string }): string {
  return ticketGateUrl(booking, publicSiteOrigin());
}

/**
 * AirPal ticket pass — the wallet face for every booking. AirPal brand
 * chrome, same information architecture as a wallet pass: brand, event,
 * date/time, location, guest, host, and a gate QR.
 */
export function AirPalTicketPass({ booking, guestName, hostName, showActions = true }: Props) {
  const [qr, setQr] = useState("");
  const paid = bookingDisplayPaid(booking);

  useEffect(() => {
    let cancelled = false;
    void makeQrDataUrl(ticketQrHref(booking), 320)
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [booking.id, booking.eventId, booking.planId]);

  const when = [booking.date, booking.time].filter(Boolean).join(" · ");
  const where = [booking.suburb].filter(Boolean).join("");

  function print() {
    if (typeof document !== "undefined") document.body.classList.add("printing-ticket");
    if (typeof window !== "undefined") window.print();
    if (typeof document !== "undefined") {
      window.setTimeout(() => document.body.classList.remove("printing-ticket"), 500);
    }
  }

  async function share() {
    await shareNative({
      title: `Ticket — ${booking.title}`,
      text: `My ticket for ${booking.title} (${when})`,
      url: ticketQrHref(booking).replace(publicSiteOrigin(), ""),
    });
  }

  return (
    <article className="ticket-pass overflow-hidden rounded-3xl bg-brand text-white shadow-xs">
      <div className="flex items-start justify-between px-5 pt-4">
        <p className="font-display text-2xl font-bold tracking-tight">
          airpal<span className="text-gold">.me</span>
        </p>
        <p className="text-right text-[13px] font-semibold leading-tight opacity-90">
          {booking.date}
          {booking.time ? <span className="block">{booking.time}</span> : null}
        </p>
      </div>

      <h3 className="px-5 pt-3 font-display text-[22px] font-bold leading-snug">{booking.title}</h3>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pt-3 text-[14px]">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Location</dt>
          <dd className="font-semibold leading-snug">{where || "See event page"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Booking</dt>
          <dd className="font-mono text-[12px] leading-snug">{booking.id.slice(0, 12)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Guest</dt>
          <dd className="font-semibold leading-snug">{guestName || "Ticket holder"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Host</dt>
          <dd className="font-semibold leading-snug">{hostName || booking.providerName}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-center px-5 pb-2 pt-4">
        {qr ? (
          <img src={qr} alt={`Ticket QR for ${booking.title}`} className="h-44 w-44 rounded-2xl bg-white p-2" />
        ) : (
          <p className="py-8 text-[13px] opacity-70">Preparing QR…</p>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 px-5 pb-4 pt-1 text-[12px] font-semibold opacity-90">
        <Ticket size={13} /> {paid ? "Paid on AirPal — scan at the gate" : "Unpaid hold — pay to activate"}
      </p>

      {showActions && (
        <div className="no-print flex flex-col gap-2 bg-white px-4 py-3">
          <AppleWalletButton
            className="w-full justify-center"
            onClick={() => {
              const url = ticketWalletPassUrl(booking.id);
              void openAppleWalletPass(url, "AirPal-Ticket-" + booking.title);
            }}
          />
          <GoogleWalletButton
            className="w-full justify-center"
            onClick={() => {
              void openGoogleWalletPass(googleWalletTicketUrl(booking.id));
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="flex-1 gap-1.5" onClick={print}>
              <Download size={15} /> Save PDF
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 gap-1.5" onClick={() => void share()}>
              <Share2 size={15} /> Share
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
