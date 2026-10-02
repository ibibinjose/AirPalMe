import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, updateDoc, where } from "firebase/firestore";
import { ArrowRight, BadgeCheck, CalendarDays, MessageSquare, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { ChatBox } from "@/components/messaging/ChatBox";
import { AirPalChatModal } from "@/components/messaging/AirPalChatModal";
import { createConversationRecord } from "@/lib/chat-store";
import { matchChatActions, type UniversalConversation } from "@shared/messaging";
import { BookingsSection, createBookingForRequest } from "@/components/booking/BookingsSection";
import { PaymentCanceledNotice } from "@/components/booking/PaymentCanceledNotice";
import { createSubmitGuard } from "@/lib/submit-guard";
import { createBookingCheckoutSessionRemote } from "@/lib/functions";
import { TicketPass } from "@/components/plan/TicketPass";
import { PayoutSetupCard } from "@/components/connect/PayoutSetupCard";
import {
  canAcceptRequest,
  canLeaveReview,
  MATE_USE_CASES,
  matchReasons,
  reviewValid,
  type MateRequest,
  type MateRequestStatus,
} from "@shared/mate-request";
import { mateDiscoverReasons, type PublicMate } from "@shared/companion";
import { loadPublicMatesRemote } from "@/lib/companion-remote";
import { SearchBar } from "@/components/search/SearchBar";
import { openGlobalSearch } from "@/components/search/GlobalSearchModal";

const STEPS = [
  { title: "Tell us the plan", body: "What, when, where — and what kind of Mate you want along." },
  { title: "We match you", body: "An approved local Mate confirms. Every Mate is reviewed by a person." },
  { title: "Meet & review", body: "Meet in public, enjoy the night, rate each other after." },
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
  const bookedId = new URLSearchParams(useSearch()).get("booked") || "";
  const [requests, setRequests] = useState<MateRequest[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [assigned, setAssigned] = useState<MateRequest[]>([]);
  const [openJobs, setOpenJobs] = useState<MateRequest[]>([]);
  const [publicMates, setPublicMates] = useState<PublicMate[]>([]);
  const [isApprovedMate, setIsApprovedMate] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState<string | null>(null);
  const [chatFor, setChatFor] = useState<string | null>(null);
  const [booked, setBooked] = useState<Record<string, boolean>>({});
  const [bookingBusy, setBookingBusy] = useState(false);
  // Synchronous double-tap guard: `bookingBusy` only disables the button after
  // a re-render, so chip + button (or a fast double-tap) could file two
  // bookings for the same match.
  const bookGuardRef = useRef(createSubmitGuard());
  const [activeChatConv, setActiveChatConv] = useState<UniversalConversation | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [mateQuery, setMateQuery] = useState("");

  const filteredMates = useMemo(() => {
    if (!mateQuery.trim()) return publicMates;
    const q = mateQuery.trim().toLowerCase();
    return publicMates.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        (m.suburb && m.suburb.toLowerCase().includes(q)) ||
        (m.city && m.city.toLowerCase().includes(q)) ||
        m.interests.some((i) => i.toLowerCase().includes(q)) ||
        m.activities.some((a) => a.toLowerCase().includes(q)) ||
        (m.introduction && m.introduction.toLowerCase().includes(q)),
    );
  }, [publicMates, mateQuery]);

  function openMateChat(m: PublicMate) {
    const conv = createConversationRecord({
      type: "direct",
      peerUid: m.uid,
      peerName: m.firstName,
      peerPhoto: m.photo,
      title: `${m.firstName} · AirPal Mate`,
      subtitle: m.suburb || m.city || "Sydney",
      userUid: user?.uid || "guest",
      userName: user?.displayName || "Guest",
      photo: m.photo,
    });
    setActiveChatConv(conv);
    setChatModalOpen(true);
  }

  async function book(r: MateRequest) {
    if (!user || !r.matchedMateUid) return;
    if (!bookGuardRef.current.tryAcquire()) return;
    setBookingBusy(true);
    try {
      const priceCents = Math.round(Math.max(0, r.budget) * 100);
      const bookingId = await createBookingForRequest({
        requestId: r.id,
        providerUid: r.matchedMateUid,
        providerName: r.matchedMateName || "Your Mate",
        title: r.what,
        suburb: r.suburb,
        date: r.date,
        time: r.time,
        customerUid: user.uid,
        priceCents,
      });
      setBooked((b) => ({ ...b, [r.id]: true }));
      if (priceCents > 0) {
        const res = await createBookingCheckoutSessionRemote({ bookingId });
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
          return;
        }
        toast.error("Checkout didn’t open. Use Pay now on the booking below.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn’t start payment.");
    } finally {
      bookGuardRef.current.release();
      setBookingBusy(false);
    }
  }
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  async function saveReview(r: MateRequest, asMate: boolean) {
    const db = getFirebaseDb();
    if (!db || !reviewValid(stars, reviewText) || !canLeaveReview(r.status)) return;
    setSavingReview(true);
    try {
      const now = new Date().toISOString();
      const patch = asMate
        ? { mateRating: stars, mateReviewText: reviewText.trim(), updatedAt: now }
        : { rating: stars, reviewText: reviewText.trim(), updatedAt: now };
      await updateDoc(doc(db, "mate_requests", r.id), patch);
      const apply = (x: MateRequest): MateRequest => (x.id === r.id ? { ...x, ...patch } : x);
      setRequests((list) => (list ? list.map(apply) : list));
      setAssigned((list) => list.map(apply));
      setRatingFor(null);
      setReviewText("");
      setStars(5);
    } finally {
      setSavingReview(false);
    }
  }

  async function acceptRequest(r: MateRequest) {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    const blocked = canAcceptRequest(r, user.uid, isApprovedMate);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    setAcceptBusy(r.id);
    try {
      const name = user.displayName?.trim().split(/\s+/)[0] || "Mate";
      const claimed = await runTransaction(db, async (tx) => {
        const ref = doc(db, "mate_requests", r.id);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error("This request is gone.");
        const current = snap.data() as Omit<MateRequest, "id">;
        if (current.ownerUid === user.uid) throw new Error("You can't accept your own request.");
        if (current.status !== "open") throw new Error("Someone just claimed it — pick another open request.");
        const now = new Date().toISOString();
        tx.update(ref, {
          status: "matched",
          matchedMateUid: user.uid,
          matchedMateName: name,
          updatedAt: now,
        });
        return { ...r, ...current, id: r.id, status: "matched" as const, matchedMateUid: user.uid, matchedMateName: name, updatedAt: now };
      });
      setOpenJobs((list) => list.filter((x) => x.id !== r.id));
      setAssigned((list) => [claimed, ...list]);
      toast.success("Matched — say hello in the chat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't accept this request.");
    } finally {
      setAcceptBusy(null);
    }
  }

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setRequests(null);
      return;
    }
    setLoadError(false);
    void Promise.all([
      getDocs(
        query(
          collection(db, "mate_requests"),
          where("ownerUid", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5),
        ),
      ),
      getDocs(query(collection(db, "mate_requests"), where("matchedMateUid", "==", user.uid), limit(20))),
      getDoc(doc(db, "mates_public", user.uid)),
      loadPublicMatesRemote().catch(() => [] as PublicMate[]),
    ])
      .then(async ([mine, jobs, publicSnap, mates]) => {
        setRequests(mine.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MateRequest, "id">) })));
        const list = jobs.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<MateRequest, "id">) }))
          .filter((r) => r.ownerUid !== user.uid);
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAssigned(list);
        const approved = publicSnap.exists();
        setIsApprovedMate(approved);
        setPublicMates(mates.filter((m) => m.uid !== user.uid));
        if (approved) {
          const openSnap = await getDocs(
            query(collection(db, "mate_requests"), where("status", "==", "open"), limit(20)),
          );
          setOpenJobs(
            openSnap.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<MateRequest, "id">) }))
              .filter((r) => r.ownerUid !== user.uid),
          );
        } else {
          setOpenJobs([]);
        }
      })
      .catch(() => {
        setRequests([]);
        setAssigned([]);
        setOpenJobs([]);
        setPublicMates([]);
        setIsApprovedMate(false);
        setLoadError(true);
      });
  }, [user, reloadKey]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-28 md:px-6">
      <PaymentCanceledNotice />
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Hero, Request Actions, Assigned Jobs & Request History (7 cols) */}
        <div className="lg:col-span-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">AirPal Mate</p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-[1.05] tracking-tight text-ink">
            Go with your Mate, Friends &amp; Family.
          </h1>
          <p className="mt-2 max-w-lg text-[14px] sm:text-[15px] text-mute font-medium leading-relaxed">
            Want to do something, but have no one to go with? Find verified, local companions for concerts, exhibitions, cafes, and city walks.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="lg" className="rounded-full bg-brand font-semibold text-white shadow-md hover:bg-brand-ink cursor-pointer" onClick={() => nav("/mate/request")}>
              Find someone to go with <ArrowRight size={17} />
            </Button>
            <Link href="/companion">
              <Button size="lg" variant="ghost" className="rounded-full border border-line bg-card text-ink hover:bg-paper cursor-pointer">
                Become a Mate
              </Button>
            </Link>
          </div>

          {/* Trust & Safety Assurance Bar */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-mute font-medium">
            <span className="inline-flex items-center gap-1 text-ink font-semibold">
              <ShieldCheck size={14} className="text-emerald-500" /> 100% Identity-checked
            </span>
            <span>·</span>
            <span>Public meetups only</span>
            <span>·</span>
            <span>Zero hidden fees</span>
          </div>

          {/* Quick-Start Outing Ideas (Reduced Activation Energy) */}
          <div className="mt-4">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Popular outings</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                { label: "☕ Weekend Coffee & Walk", q: "Weekend coffee and harbour walk" },
                { label: "🎵 Live Gig / Concert", q: "Live music gig" },
                { label: "🎨 Art Gallery & Museum", q: "Art exhibition tour" },
                { label: "🍜 Foodie Dinner", q: "New restaurant food tour" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => nav(`/mate/request?what=${encodeURIComponent(item.q)}`)}
                  className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line shadow-2xs hover:bg-paper hover:ring-brand/40 transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

      {user && assigned.length > 0 && (
        <section className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
          <h2 className="font-display text-base font-bold">Assigned to you</h2>
          <p className="mt-1 text-[13px] text-mute">Chat, then confirm the booking when you&apos;re both in.</p>
          <ul className="mt-2 divide-y divide-line">
            {assigned.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.what}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {matchReasons(r).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
                        >
                          {reason}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </span>
                {r.status === "matched" && (
                  <span className="mt-2 block">
                    <button
                      onClick={() => setChatFor(chatFor === r.id ? null : r.id)}
                      className="text-xs font-semibold text-brand"
                    >
                      {chatFor === r.id ? "Hide chat" : "Open chat"}
                    </button>
                    {chatFor === r.id && (
                      <span className="mt-1.5 block">
                        <ChatBox requestId={r.id} peerUid={r.ownerUid} peerName="Requester" />
                      </span>
                    )}
                  </span>
                )}
                {r.status === "completed" &&
                  (r.mateRating ? (
                    <span className="mt-1 block text-xs text-mute">You rated this {r.mateRating}/5</span>
                  ) : ratingFor === r.id ? (
                    <span className="mt-2 block rounded-xl bg-paper p-3 ring-1 ring-line">
                      <span className="flex gap-0.5" role="radiogroup" aria-label="Rate this guest">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setStars(n)}
                            className="grid h-11 w-11 place-items-center"
                            aria-label={`${n} stars`}
                          >
                            <Star size={22} className={n <= stars ? "text-gold" : "text-line"} fill="currentColor" />
                          </button>
                        ))}
                      </span>
                      <input
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="How was it? (optional)"
                        maxLength={500}
                        className="mt-2 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-brand"
                      />
                      <span className="mt-2 flex gap-1.5">
                        <Button
                          size="sm"
                          disabled={savingReview}
                          loading={savingReview}
                          onClick={() => void saveReview(r, true)}
                        >
                          Save review
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRatingFor(null)}>
                          Cancel
                        </Button>
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRatingFor(r.id);
                        setStars(5);
                        setReviewText("");
                      }}
                      className="mt-1 text-xs font-semibold text-brand"
                    >
                      Rate this guest
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {user && isApprovedMate && (
        <section className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
          <h2 className="font-display text-base font-bold">Open requests</h2>
          <p className="mt-1 text-[13px] text-mute">Accept one that fits — they&apos;ll see why you matched.</p>
          {openJobs.length === 0 ? (
            <p className="mt-2 text-[13px] text-mute">Nothing open right now. Check back after someone posts a plan.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {openJobs.map((r) => (
                <li key={r.id} className="py-3 text-sm">
                  <span className="block truncate font-semibold">{r.what}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {matchReasons(r).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
                      >
                        {reason}
                      </span>
                    ))}
                  </span>
                  <button
                    type="button"
                    disabled={acceptBusy === r.id}
                    onClick={() => void acceptRequest(r)}
                    className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {acceptBusy === r.id ? "Accepting…" : "Accept this request"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {bookedId ? <TicketPass bookingId={bookedId} /> : null}
      {user && isApprovedMate && <PayoutSetupCard />}
      {user && <BookingsSection />}

      {user && loadError && (
        <div className="mt-6 rounded-3xl bg-card p-5 text-center ring-1 ring-line shadow-xs">
          <p className="text-sm font-semibold">Couldn’t load Mate requests</p>
          <p className="mt-1 text-[13px] text-mute">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-xs font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {user && requests !== null && !loadError && (
        <section className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
          <h2 className="font-display text-base font-bold">Your requests</h2>
          {!isFirebaseConfigured || requests.length === 0 ? (
            <p className="mt-1 text-[13px] text-mute">No requests yet — your first one takes under a minute.</p>
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
                              className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {r.budget > 0 ? `Book · about $${r.budget}` : "Book · free"}
                            </button>
                          ))}
                      </span>
                      {chatFor === r.id && r.matchedMateUid && (
                        <span className="mt-1.5 block">
                          <ChatBox
                            requestId={r.id}
                            peerUid={r.matchedMateUid}
                            peerName={r.matchedMateName || "Your Mate"}
                            actions={matchChatActions({
                              viewerIsCustomer: true,
                              matched: r.status === "matched",
                              booked: Boolean(booked[r.id]),
                              budget: r.budget,
                            })}
                            onAction={(id) => {
                              if (id === "book") void book(r);
                              else nav("/plan/new");
                            }}
                          />
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
                        <span className="flex gap-0.5" role="radiogroup" aria-label="Rate this experience">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              role="radio"
                              aria-checked={stars === n}
                              aria-label={`${n} star${n > 1 ? "s" : ""}`}
                              onClick={() => setStars(n)}
                              className="grid h-11 w-11 place-items-center"
                            >
                              <Star size={22} className={n <= stars ? "text-gold" : "text-line"} fill="currentColor" />
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
                          <Button
                            size="sm"
                            disabled={savingReview}
                            loading={savingReview}
                            onClick={() => void saveReview(r, false)}
                          >
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

        </div>

        {/* Right Column: Approved Mates Showcase, Use Cases & Host Onboarding (5 cols) */}
        <div className="mt-6 lg:mt-0 lg:col-span-5 space-y-6">
          {publicMates.length > 0 && (
            <section className="rounded-3xl border border-line bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Approved Mates</h2>
                  <p className="mt-0.5 text-[12px] text-mute">
                    Verified local companions.
                  </p>
                </div>
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                  {filteredMates.length} Active
                </span>
              </div>

              {/* Mobile, iOS and Android friendly search bar */}
              <div className="mt-3.5">
                <SearchBar
                  value={mateQuery}
                  onChange={setMateQuery}
                  sizeVariant="md"
                  variant="paper"
                  placeholder="Search mates by name, suburb, or interests…"
                  aria-label="Search mates"
                  showFullSearchAction={Boolean(mateQuery.trim())}
                  fullSearchLabel="Full Search"
                  onFullSearch={(q) => openGlobalSearch({ query: q, category: "people" })}
                />
              </div>

              {filteredMates.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-paper/60 p-4 text-center">
                  <p className="text-xs font-semibold text-ink">No mates found for &ldquo;{mateQuery}&rdquo;</p>
                  <p className="mt-0.5 text-[11px] text-mute">Try searching a different interest, hobby or suburb.</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMateQuery("")}
                      className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card cursor-pointer"
                    >
                      Clear search
                    </button>
                    <button
                      type="button"
                      onClick={() => openGlobalSearch({ query: mateQuery })}
                      className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink cursor-pointer"
                    >
                      Search all AirPal
                    </button>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {filteredMates.slice(0, 8).map((m) => (
                    <li key={m.uid} className="rounded-2xl bg-paper p-3.5 ring-1 ring-line transition hover:shadow-xs">
                      <div className="flex items-start gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-card ring-1 ring-line">
                          <Photo src={m.photo || "/media/harbour.jpg"} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <p className="font-display text-sm font-bold truncate text-ink">{m.firstName}</p>
                              <BadgeCheck size={14} className="text-brand shrink-0" />
                            </div>
                            <span className="text-[11px] font-semibold text-mute shrink-0">
                              {m.suburb || m.city || "Sydney"}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] text-mute line-clamp-2 leading-relaxed">
                            {m.introduction || "Approved local AirPal Mate for outings and experiences."}
                          </p>
                          <div className="mt-2 text-[11px] text-mute flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            {mateDiscoverReasons(m, requests?.[0]).map((reason, idx, arr) => (
                              <span key={reason} className="inline-flex items-center gap-1.5">
                                <span className="text-brand font-medium">{reason}</span>
                                {idx < arr.length - 1 && <span aria-hidden="true" className="text-line select-none">·</span>}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openMateChat(m)}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white hover:bg-brand-ink transition active:scale-95 cursor-pointer"
                            >
                              <MessageSquare size={13} />
                              Chat
                            </button>
                            <Link
                              href={`/mate/request?preferredMate=${m.uid}&name=${encodeURIComponent(m.firstName)}`}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-line/40 transition active:scale-95 cursor-pointer"
                            >
                              Pick for Request
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <h2 className="font-display text-xl font-bold tracking-tight">What do you want to do?</h2>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {MATE_USE_CASES.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/mate/request?useCase=${c.id}`}
                    className="apple-liquid-glass-card hover-lift flex items-center gap-3 rounded-2xl p-3.5 transition active:scale-[0.97]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                      {c.id === "events" ? (
                        <Sparkles size={18} />
                      ) : c.id === "social" ? (
                        <Users size={18} />
                      ) : (
                        <CalendarDays size={18} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{c.label}</span>
                      <span className="block truncate text-xs text-mute font-medium">{c.line}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="apple-liquid-glass-card rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold">Or start from an experience</h2>
                <p className="mt-0.5 text-[13px] text-mute font-medium">Pick something worth doing — then take a Mate along.</p>
              </div>
              <Link
                href="/experiences"
                className="shrink-0 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-ink transition active:scale-95"
              >
                Browse
              </Link>
            </div>
          </section>

          <section className="rounded-3xl bg-ink p-5 text-white shadow-sm">
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

          <section className="rounded-3xl border border-line bg-card p-5 text-center shadow-xs">
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              <BadgeCheck size={13} /> Verified locals
            </p>
            <p className="font-display mt-1 text-lg font-bold">Good with people? Get paid for it.</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] leading-6 text-mute">
              Apply once, get reviewed by a person, then earn every time someone picks you.
            </p>
            <Link href="/companion">
              <Button variant="dark" className="mt-3 rounded-full font-semibold">
                Apply to become a Mate
              </Button>
            </Link>
          </section>
        </div>
      </div>

      <AirPalChatModal
        open={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        conversation={activeChatConv}
      />
    </div>
  );
}
