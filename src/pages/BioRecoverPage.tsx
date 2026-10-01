import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { handleFromName, handleMatchesClaim, normalizeHandle } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { LEGAL } from "@/lib/legal";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";

export function BioRecoverPage() {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [domain, setDomain] = useState("");
  const [trademark, setTrademark] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const matches = handleMatchesClaim(handle, { name, domain, trademark });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!normalizeHandle(handle) || !name.trim() || !registrationNumber.trim() || !email.trim()) {
      toast.error("Handle, registered name, number, and email");
      return;
    }
    if (!matches) {
      toast.error("Handle must match the registered name, trade mark, or domain");
      return;
    }
    const subject = `[AirPal.Me] Handle recovery @${normalizeHandle(handle)}`;
    const body = [
      `Handle: @${normalizeHandle(handle)}`,
      `Registered name: ${name}`,
      `Registration number: ${registrationNumber}`,
      `Domain: ${domain}`,
      `Trade mark: ${trademark}`,
      `Email: ${email}`,
      "",
      note,
    ].join("\n");
    window.location.href = `mailto:${LEGAL.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.message("Send the mail. We move the handle to the owner when the papers match.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 pb-28">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Trade mark</p>
      <h1 className="font-display mt-1 text-3xl font-semibold">Recover a handle</h1>
      <p className="mt-2 text-sm text-mute">
        If someone claimed @{handleFromName(name) || "yourname"} and you own the registered business name, trade mark,
        or matching domain, we give the handle to you.{" "}
        <Link href="/terms" className="text-brand">
          Terms
        </Link>
      </p>
      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle"
          required
          className={fieldInput}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Registered business name"
          required
          className={fieldInput}
        />
        <input
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="ABN / company number"
          required
          className={fieldInput}
        />
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          autoComplete="url"
          autoCapitalize="none"
          placeholder="Domain you own"
          className={fieldInput}
        />
        <input
          value={trademark}
          onChange={(e) => setTrademark(e.target.value)}
          placeholder="Trade mark number or words"
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
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Evidence (optional)"
          className={fieldTextarea}
        />
        {handle && !matches && (
          <p className="text-[12px] text-mute">The handle must match the name, mark, or domain.</p>
        )}
        <Button type="submit" className="w-full">
          Request recovery
        </Button>
      </form>
    </div>
  );
}
