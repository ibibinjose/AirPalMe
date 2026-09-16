import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { LEGAL } from "@/lib/legal";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";

const TOPICS = [
  { id: "general", label: "General" },
  { id: "access", label: "Copy of my data" },
  { id: "delete", label: "Delete my data" },
  { id: "host", label: "Host / property" },
  { id: "business", label: "Local business" },
  { id: "handle", label: "Handle / trade mark" },
  { id: "legal", label: "Legal" },
] as const;

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("general");
  const [message, setMessage] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = `[AirPal.me] ${TOPICS.find((t) => t.id === topic)?.label} — ${name || "Message"}`;
    const body = [`Name: ${name}`, `Email: ${email}`, `Topic: ${topic}`, "", message].join("\n");
    const href = `mailto:${LEGAL.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    void navigator.clipboard?.writeText(`${subject}\n\n${body}`).then(
      () => toast.success("Copied. Your mail app should open."),
      () => toast.message("Open your mail app to send."),
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-md px-4 pb-6 pt-8 md:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Contact</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Write to us</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
          For access or deletion, choose that topic. To recover an @handle that matches your registered name, trade mark, or domain, choose Handle / trade mark or{" "}
          <Link href="/bio/recover" className="text-brand">
            recover
          </Link>
          . We aim to reply within 30 days.
        </p>
        <p className="mt-2 text-sm text-mute">
          Direct:{" "}
          <a href={`mailto:${LEGAL.email}`} className="text-brand">
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
                onClick={() => setTopic(t.id)}
                className={`h-9 rounded-full px-3 text-sm ${topic === t.id ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}
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
          <Button type="submit" className="w-full">
            Open email
          </Button>
        </form>
        <p className="mt-4 text-[12px] text-mute">
          We do not use this form for marketing. See the{" "}
          <Link href="/privacy" className="text-brand">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
