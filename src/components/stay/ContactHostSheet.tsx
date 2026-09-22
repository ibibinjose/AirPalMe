import { useEffect, useRef, useState } from "react";
import { Phone, Send } from "lucide-react";
import { nanoid } from "nanoid";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useStay } from "@/contexts/StayContext";
import { useStayUi } from "@/contexts/StayUiContext";
import { contactPrefill } from "@/lib/stay-answers";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";

type Msg = { id: string; from: "guest" | "host"; text: string; at: number };

const THREAD_KEY = "airpal.host-thread";
const CHIPS = ["Wi-Fi not connecting", "Late checkout?", "Extra towels", "AC in the room"];

function loadThread(): Msg[] {
  try {
    const raw = sessionStorage.getItem(THREAD_KEY);
    if (raw) return JSON.parse(raw) as Msg[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveThread(rows: Msg[]) {
  try {
    sessionStorage.setItem(THREAD_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export function ContactHostSheet() {
  const { property, roomLabel } = useStay();
  const { contactOpen, closeStayUi, contactDraft, setContactDraft } = useStayUi();
  const { t } = useLocale();
  const [thread, setThread] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThread(loadThread());
  }, []);

  useEffect(() => {
    if (!contactOpen) return;
    if (!contactDraft.trim()) setContactDraft(contactPrefill(property, roomLabel));
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, [contactOpen, contactDraft, property, roomLabel, setContactDraft]);

  function push(from: Msg["from"], text: string, existing = thread) {
    const next = [...existing, { id: nanoid(), from, text, at: Date.now() }];
    setThread(next);
    saveThread(next);
    return next;
  }

  function send() {
    const text = contactDraft.trim();
    if (!text) return;
    const next = push("guest", text);
    setContactDraft("");
    toast.success("Sent to the desk");
    window.setTimeout(() => {
      push("host", "Thanks — the desk has your note. We’ll come back shortly.", next);
    }, 900);
  }

  const tel = (property.phone || "").replace(/\s/g, "");
  const wa = (property.whatsapp || "").replace(/[^\d]/g, "");

  return (
    <Sheet open={contactOpen} onClose={closeStayUi} title={t("contactHost")}>
      <p className="mb-3 text-[12px] text-mute">
        {property.name}
        {roomLabel ? ` · Room ${roomLabel}` : ""}
      </p>

      <div className="scroll-container flex max-h-[40vh] flex-col gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line">
        {thread.length === 0 && <p className="text-[13px] text-mute">{t("frontDesk")}</p>}
        {thread.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.from === "guest"
                ? "ml-8 rounded-2xl rounded-br-md bg-brand px-3 py-2 text-[14px] text-white"
                : "mr-8 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[14px] ring-1 ring-line"
            }
          >
            {msg.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            className="h-8 rounded-full bg-paper px-3 text-[12px] ring-1 ring-line"
            onClick={() => setContactDraft(`${contactPrefill(property, roomLabel)}${chip}`)}
          >
            {chip}
          </button>
        ))}
      </div>

      <textarea
        value={contactDraft}
        onChange={(e) => setContactDraft(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-2xl bg-paper p-3 text-[15px] outline-none border border-line focus:border-brand"
        placeholder="Message the property manager"
      />
      <Button className="mt-3 w-full" onClick={send}>
        <Send size={16} /> {t("send")}
      </Button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`tel:${tel}`}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-paper text-sm ring-1 ring-line"
        >
          <Phone size={14} /> {t("call")}
        </a>
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center rounded-full bg-paper text-sm ring-1 ring-line"
        >
          WhatsApp
        </a>
      </div>
    </Sheet>
  );
}
