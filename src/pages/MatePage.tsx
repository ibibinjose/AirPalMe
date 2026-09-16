import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { ArrowRight, BadgeCheck, CalendarDays, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { ChatBox } from "@/components/messaging/ChatBox";
import { BookingsSection, createBookingForRequest } from "@/components/booking/BookingsSection";
import { MATE_USE_CASES, reviewValid, type MateRequest, type MateRequestStatus } from "@shared/mate-request";

const STEPS = [
  { title: "Tell us the plan", body: "What, when, where — and what kind of Mate you want along." },
  { title: "We match you", body: "An approved local Mate confirms. Every Mate is reviewed by a person." },
  { title: "Meet & review", body: "Meet in public, enjoy Sydney, rate each other after." },
];

const STATUS_LABEL: Record<MateRequestStatus, string> = {
  open: "Finding your Mate",
  matched: "Matched",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function MatePage() {
  const { user } = useAuth();
  const [, nav] = useLocation();
  const [requests, setRequests] = useState<MateRequest[] | null>(null);
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [booked, setBooked] = useState<Record<string, boolean>>({});
  const [bookingBusy, setBookingBusy] = useState(false);

  async function book(r: MateRequest) {
    if (!user || !r.matchedMateUid) return;
    setBookingBusy(true);
    try {
      await createBookingForRequest({
        requestId: r.id,
        providerUid: r.matchedMateUid,
        providerName: r.matchedMateName || "Your Mate",
        title: r.what,
        suburb: r.suburb,
        date: r.date,
        time: r.time,
        customerUid: user.uid,
      });
      setBooked((b) => ({ ...b, [r.id]: true }));
    } finally {
      setBookingBusy(false);
    }
  }
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  async function saveReview(r: MateRequest) {
    const db = getFirebaseDb();
    if (!db || !reviewValid(stars, reviewText)) return;
    setSavingReview(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, "mate_requests", r.id), {
        rating: stars,
        reviewText: reviewText.trim(),
        updatedAt: now,
      });
      setRequests((list) =>
        list ? list.map((x) => (x.id === r.id ? { ...x, rating: stars, reviewText: reviewText.trim(), updatedAt: now } : x)) : list,
      );
      setRatingFor(null);
      setReviewText("");
      setStars(5);
    } finally {
      setSavingReview(false);
    }
  }

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setRequests(null);
      return;
    }
    void getDocs(
      query(collection(db, "mate_requests"), where("ownerUid", "==", user.uid), orderBy("createdAt", "desc"), limit(5)),
    )
      .then((snap) =>
        setRequests(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MateRequest, "id">) }))),
      )
      .catch(() => setRequests([]));
  }, [user]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">AirPal Mate · Sydney</p>
      <h1 className="font-display mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
        Don&apos;t go alone.
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-7 text-mute">
        Got tickets but no one to go with? Want to explore Sydney? Tell us the plan — we&apos;ll find someone to go
        with you.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="lg" onClick={() => nav("/mate/request")}>
          Find someone to go with <ArrowRight size={17} />
        </Button>
        <Link href="/companion">
          <Button size="lg" variant="ghost">
            Become a Mate
          </Button>
        </Link>
      </div>

      {user && <BookingsSection />}

      {user && requests !== null && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-4">
          <h2 className="font-display text-base font-bold">Your requests</h2>
          {!isFirebaseConfigured || requests.length === 0 ? (
            <p className="mt-1 text-[13px] text-mute">
              No requests yet — your first one takes under a minute.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="py-2 text-sm">
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{r.what}</span>
                      <span className="block text-xs text-mute">
                        {r.suburb} · {r.date}
                        {r.matchedMateName ? ` · with ${r.matchedMateName}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </span>
                  {(r.status === "matched" || r.status === "completed") && r.matchedMateUid && (
                    <span className="mt-1.5 block">
                      <span className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setChatFor(chatFor === r.id ? null : r.id)}
                          className="text-xs font-semibold text-brand"
                        >
                          {chatFor === r.id ? "Hide chat" : `Chat with ${r.matchedMateName || "your Mate"}`}
                        </button>
                        {r.status === "matched" &&
                          (booked[r.id] ? (
                            <span className="text-xs font-semibold text-emerald-700">Booked ✓ see below</span>
                          ) : (
                            <button
                              onClick={() => void book(r)}
                              disabled={bookingBusy}
                              className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Book — pay later
                            </button>
                          ))}
                      </span>
                      {chatFor === r.id && (
                        <span className="mt-1.5 block">
                          <ChatBox requestId={r.id} />
                        </span>
                      )}
                    </span>
                  )}
                  {r.status === "completed" &&
                    (r.rating ? (
                      <span className="mt-1 flex items-center gap-1 text-xs text-mute">
                        <Star size={12} className="text-gold" fill="currentColor" /> You rated this {r.rating}/5
                        {r.reviewText ? ` — “${r.reviewText}”` : ""}
                      </span>
                    ) : ratingFor === r.id ? (
                      <span className="mt-2 block rounded-xl bg-paper p-3 ring-1 ring-line">
                        <span className="flex gap-1" role="radiogroup" aria-label="Rate this experience">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              role="radio"
                              aria-checked={stars === n}
                              aria-label={`${n} star${n > 1 ? "s" : ""}`}
                              onClick={() => setStars(n)}
                              className="p-0.5"
                            >
                              <Star
                                size={20}
                                className={n <= stars ? "text-gold" : "text-line"}
                                fill="currentColor"
                              />
                            </button>
                          ))}
                        </span>
                        <input
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="How was it? (optional)"
                          maxLength={500}
                          className="mt-2 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] outline-none placeholder:text-mute focus:border-brand"
                        />
                        <span className="mt-2 flex gap-1.5">
                          <Button size="sm" disabled={savingReview} loading={savingReview} onClick={() => void saveReview(r)}>
                            Save review
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRatingFor(null)}>
                            Cancel
                          </Button>
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setRatingFor(r.id);
                          setStars(5);
                          setReviewText("");
                        }}
                        className="mt-1 text-xs font-semibold text-brand"
                      >
                        Rate this experience
                      </button>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold tracking-tight">What do you want to do?</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {MATE_USE_CASES.map((c) => (
            <li key={c.id}>
              <Link
                href={`/mate/request?useCase=${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 hover:border-mute"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  {c.id === "events" ? <Sparkles size={18} /> : c.id === "social" ? <Users size={18} /> : <CalendarDays size={18} />}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{c.label}</span>
                  <span className="block text-xs text-mute">{c.line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold">Or start from an experience</h2>
            <p className="mt-0.5 text-[13px] text-mute">Pick something worth doing — then take a Mate along.</p>
          </div>
          <Link href="/experiences" className="shrink-0 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white">
            Browse
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-ink p-5 text-white">
        <h2 className="font-display text-xl font-bold">How it works</h2>
        <ol className="mt-3 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold">{s.title}</span>
                <span className="block text-[13px] leading-6 text-white/70">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-1.5 text-xs leading-5 text-white/70">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          Approved Mates only. Meet in public, keep chat in AirPal. Under 18s need a guardian.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-card p-5 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
          <BadgeCheck size={13} /> Verified locals
        </p>
        <p className="font-display mt-1 text-lg font-bold">Good with people? Get paid for it.</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-mute">
          Apply once, get reviewed by a person, then earn every time someone picks you.
        </p>
        <Link href="/companion">
          <Button variant="dark" className="mt-3">
            Apply to become a Mate
          </Button>
        </Link>
      </section>
    </div>
  );
}
