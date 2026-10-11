import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { LEGAL } from "@/lib/legal";
import { triggerHaptic } from "@/lib/native";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";

const TOPICS = [
  { id: "general", label: "General" },
  { id: "ticketing", label: "Tickets & Passes" },
  { id: "host", label: "PBSA / Residence Host" },
  { id: "business", label: "Local Business / Merchant" },
  { id: "handle", label: "Handle / Trade Mark" },
  { id: "access", label: "Copy of My Data" },
  { id: "delete", label: "Delete My Data" },
  { id: "legal", label: "Legal & Compliance" },
] as const;

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("general");
  const [message, setMessage] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void triggerHaptic("medium");
    const subject = `[AirPal.me] ${TOPICS.find((t) => t.id === topic)?.label} — ${name || "Message"}`;
    const body = [`Name: ${name}`, `Email: ${email}`, `Topic: ${topic}`, "", message].join("\n");
    const href = `mailto:${LEGAL.contacts}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    void navigator.clipboard?.writeText(`${subject}\n\n${body}`).then(
      () => toast.success("Copied. Your mail app should open."),
      () => toast.message("Open your mail app to send."),
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-md px-4 pb-6 pt-8 md:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Contact</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Write to us</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
          For access or deletion, choose that topic. To recover an @handle that matches your registered name, trade
          mark, or domain, choose Handle / trade mark or{" "}
          <Link href="/bio/recover" className="text-accent">
            recover
          </Link>
          . We aim to reply within 30 days.
        </p>
        <p className="mt-2 text-sm text-mute">
          Direct:{" "}
          <a href={`mailto:${LEGAL.contacts}`} className="text-accent">
            {LEGAL.contacts}
          </a>
          {" · "}
          <a href={`mailto:${LEGAL.email}`} className="text-accent">
            {LEGAL.email}
          </a>
        </p>
        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            className={fieldInput}
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className={fieldInput}
          />
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setTopic(t.id);
                }}
                className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-xs font-semibold transition active:scale-95 ${
                  topic === t.id ? "bg-brand text-white shadow-xs" : "bg-card text-ink ring-1 ring-line hover:bg-paper"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            required
            className={`h-36 ${fieldTextarea}`}
          />
          <Button type="submit" size="lg" className="min-h-[44px] w-full rounded-full">
            Open email
          </Button>
        </form>
        <p className="mt-4 text-[12px] text-mute">
          We do not use this form for marketing. See the{" "}
          <Link href="/privacy" className="text-accent">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
