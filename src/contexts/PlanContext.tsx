import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { HangoutPlan, PlanStop, PlanType, PlanTheme } from "@shared/plan";
import { attendeeSeats, formatDateOption, headcountTaken, isPlanManager, isTicketed, normalizeAnswer, normalizePlusOnes, setAttendeeCheckedIn, validDateOption, waitlistQueue } from "@shared/plan";
import { goingFits, resolveRsvpStatus } from "@shared/plan-notify";
import type { Geo } from "@shared/nearby";
import { completePlan as storeCompletePlan,
  loadPlans,
  subscribePlans,
  savePlan,
  deletePlan as storeDeletePlan,
  getPlan as storeGetPlan,
  fetchRemotePlan,
  initPlanFirestoreSync,
  respondToPlan,
  addStopToPlan,
  updateStopInPlan,
  removeStopFromPlan,
  reorderStopsInPlan,
  voteStopInPlan,
  votePlanDateOption,
  addCommentToPlan,
  notifyStopChange,
  togglePlanSubscription,
  downloadPlanIcs,
  getPlanGoogleCalendarUrl,
} from "@/lib/plan-store";
import { useAuth } from "./AuthContext";
import { completePlanRemoteCall, liveBackendEnabled, voteDateOptionRemote } from "@/lib/functions";
import { trackContentAction } from "@/lib/analytics";
import { ensureAnonymousSession, isFirebaseConfigured } from "@/lib/firebase";
import { currencyForCity } from "@/lib/cities";
import { useBio } from "./BioContext";
import { toast } from "sonner";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { canRsvpAsGuest } from "@/lib/plan-invite";

import type {
  ExperienceCategory,
  PricingModel,
  PlanDepositConfig,
  PlanPricingTier,
  PlanInclusions,
  PlanBookingPolicy,
  PlanMultiDaySchedule,
} from "@shared/plan";

interface CreatePlanInput {
  title: string;
  type: PlanType;
  theme: PlanTheme;
  date: string;
  time: string;
  endTime?: string;
  city?: string;
  destination?: string;
  heroImage?: string;
  notes?: string;
  isPublic?: boolean;
  interests?: string[];
  geo?: Geo;
  initialStops?: Array<{
    name: string;
    time?: string;
    notes?: string;
    icon?: string;
    placeId?: string;
    address?: string;
  }>;
  invited?: Array<{ id: string; name: string; handle?: string }>;

  // Experience Marketplace Fields
  isExperience?: boolean;
  experienceCategory?: ExperienceCategory;
  pricingModel?: PricingModel;
  pricePerPerson?: number;
  currency?: string;
  depositConfig?: PlanDepositConfig;
  pricingTiers?: PlanPricingTier[];
  inclusions?: PlanInclusions;
  durationMode?: "single_day" | "multi_day";
  endDate?: string;
  multiDaySchedule?: PlanMultiDaySchedule[];
  bookingPolicy?: PlanBookingPolicy;
  capacity?: number;
}

interface PlanContextValue {
  plans: HangoutPlan[];
  myPlans: HangoutPlan[];
  publicPlans: HangoutPlan[];
  getPlan: (idOrCode: string) => HangoutPlan | undefined;
  fetchPlan: (idOrCode: string) => Promise<HangoutPlan | undefined>;
  createPlan: (input: CreatePlanInput) => HangoutPlan;
  updatePlan: (planId: string, patch: Partial<HangoutPlan>) => HangoutPlan | undefined;
  completePlan: (planId: string) => Promise<HangoutPlan | undefined>;
  deletePlan: (planId: string) => boolean;
  rsvpPlan: (
    planId: string,
    status: "going" | "maybe" | "declined",
    guestName?: string,
    notes?: string,
    plusOnes?: number,
    answers?: Record<string, string>,
  ) => Promise<HangoutPlan | undefined>;
  reviewRsvp: (
    planId: string,
    attendeeId: string,
    decision: "approve" | "decline",
  ) => HangoutPlan | undefined;
  toggleCheckIn: (planId: string, attendeeId: string) => HangoutPlan | undefined;
  proposeDateOption: (planId: string, input: { date: string; time?: string }) => HangoutPlan | undefined;
  lockDateOption: (planId: string, optionId: string) => HangoutPlan | undefined;
  reopenDatePoll: (planId: string) => HangoutPlan | undefined;
  voteDateOption: (planId: string, optionId: string) => Promise<HangoutPlan | undefined>;
  addStop: (
    planId: string,
    stop: {
      name: string;
      time?: string;
      notes?: string;
      placeId?: string;
      icon?: string;
      address?: string;
      addedByName?: string;
      addedByUid?: string;
    },
    opts?: { silent?: boolean },
  ) => HangoutPlan | undefined;
  updateStop: (planId: string, stopId: string, patch: Partial<Omit<PlanStop, "id">>) => HangoutPlan | undefined;
  removeStop: (planId: string, stopId: string) => HangoutPlan | undefined;
  reorderStops: (planId: string, fromIndex: number, toIndex: number) => HangoutPlan | undefined;
  voteStop: (planId: string, stopId: string) => HangoutPlan | undefined;
  addComment: (planId: string, text: string, photoUrl?: string) => HangoutPlan | undefined;
  followPlan: (planId: string, emailOrId?: string) => boolean;
  exportIcs: (plan: HangoutPlan) => void;
  openGoogleCalendar: (plan: HangoutPlan) => void;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<HangoutPlan[]>(() => loadPlans());
  const { user, requireUser } = useAuth();
  const { mine } = useBio();

  useEffect(() => {
    const unsubStorage = subscribePlans(() => {
      setPlans([...loadPlans()]);
    });
    const unsubFirestore = initPlanFirestoreSync();
    const handleReload = () => {
      setPlans([...loadPlans()]);
    };
    window.addEventListener("airpal:reload-data", handleReload);
    return () => {
      unsubStorage();
      unsubFirestore();
      window.removeEventListener("airpal:reload-data", handleReload);
    };
  }, []);

  const myPlans = useMemo(() => {
    const uid = user?.uid;
    const anonId = typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null;
    return plans.filter((p) => {
      if (uid && (p.creator.uid === uid || p.attendees.some((a) => a.id === uid))) return true;
      if (anonId && p.attendees.some((a) => a.id === anonId)) return true;
      return false;
    });
  }, [plans, user]);

  const publicPlans = useMemo(() => {
    return plans.filter((p) => p.isPublic && p.status !== "cancelled");
  }, [plans]);

  const getPlan = useCallback((idOrCode: string) => {
    return storeGetPlan(idOrCode);
  }, []);

  const fetchPlan = useCallback(async (idOrCode: string) => {
    return await fetchRemotePlan(idOrCode);
  }, []);

  const createPlan = useCallback(
    (input: CreatePlanInput) => {
      const now = new Date().toISOString();
      const planId = `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const creatorName = user?.displayName || mine?.name || "Event Organiser";
      const creatorHandle = mine?.handle;

      const newPlan: HangoutPlan = {
        id: planId,
        title: input.title,
        type: input.type,
        theme: input.theme,
        creator: {
          uid: user?.uid,
          name: creatorName,
          handle: creatorHandle,
          isAnonymous: !user,
        },
        date: input.date,
        time: input.time,
        ...(input.endTime ? { endTime: input.endTime } : {}),
        datetime: `${input.date}T${input.time}:00`,
        city: input.city || "",
        destination: input.destination || input.city || "",
        heroImage: input.heroImage,
        notes: input.notes,
        stops: (input.initialStops || []).map((s, idx) => ({
          id: `stop-${idx + 1}`,
          name: s.name,
          time: s.time,
          notes: s.notes,
          icon: s.icon || "pin",
          placeId: s.placeId,
          address: s.address,
          addedByName: creatorName,
          addedByUid: user?.uid,
          votes: 1,
          voterUids: user?.uid ? [user.uid] : [],
        })),
        attendees: [
          {
            id:
              user?.uid ||
              (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null) ||
              `guest-${Date.now()}`,
            name: creatorName,
            handle: creatorHandle,
            status: "going" as const,
            isAnonymous: !user,
            respondedAt: now,
          },
          ...(input.invited || [])
            .filter((p) => p.id && p.id !== user?.uid)
            .map((p) => ({
              id: p.id,
              name: p.name,
              handle: p.handle,
              status: "maybe" as const,
              respondedAt: now,
            })),
        ],
        comments: [],
        subscribers: user?.email ? [user.email] : [],
        inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: "open",
        isPublic: input.isPublic ?? true,
        interests: (input.interests || []).map((t) => t.toLowerCase()),
        geo: input.geo,

        // Experience properties
        isExperience: input.isExperience,
        experienceCategory: input.experienceCategory,
        pricingModel: input.pricingModel,
        pricePerPerson: input.pricePerPerson,
        currency: input.currency || currencyForCity(input.city || input.destination) || "AUD",
        depositConfig: input.depositConfig,
        pricingTiers: input.pricingTiers,
        inclusions: input.inclusions,
        durationMode: input.durationMode,
        endDate: input.endDate,
        multiDaySchedule: input.multiDaySchedule,
        bookingPolicy: input.bookingPolicy,
        capacity: input.capacity,
        spotsBooked: 0,

        createdAt: now,
        updatedAt: now,
      };

      const saved = savePlan(newPlan);
      setPlans((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      void triggerHaptic("success");
      if (newPlan.isExperience && Number(newPlan.pricePerPerson || 0) > 0) {
        toast.success("Tickets are on. Share the link — guests pay by card.");
      } else {
        toast.success("Created — share the invite with your people.");
      }
      return saved;
    },
    [user, mine],
  );

  const updatePlan = useCallback((planId: string, patch: Partial<HangoutPlan>) => {
    const current = storeGetPlan(planId);
    if (!current) return undefined;
    const updated = savePlan({
      ...current,
      ...patch,
      interests: patch.interests !== undefined ? patch.interests.map((t) => t.toLowerCase()) : current.interests,
      datetime:
        patch.date || patch.time ? `${patch.date || current.date}T${patch.time || current.time}:00` : current.datetime,
    });
    setPlans([...loadPlans()]);
    toast.success("Plan updated successfully");
    return updated;
  }, []);

  const completePlan = useCallback(
    async (planId: string) => {
      if (!requireUser("Sign in to complete plans.")) return undefined;
      // Server first: authoritative status, audit record, and North Star event.
      if (user && isFirebaseConfigured) {
        try {
          const res = await completePlanRemoteCall({ planId });
          if (res?.ok) {
            const updated = storeCompletePlan(planId);
            if (updated) {
              setPlans([...loadPlans()]);
              toast.success(`Marked "${updated.title}" completed`);
            }
            return updated;
          }
        } catch {
          // Fall through to the device copy; the server stays authoritative on retry.
        }
      }
      const updated = storeCompletePlan(planId);
      if (!updated) return undefined;
      setPlans([...loadPlans()]);
      trackContentAction("experience_completed", planId, {
        contentId: planId,
        category: storeGetPlan(planId)?.isExperience ? "experience" : "plan",
      });
      toast.success(`Marked "${updated.title}" completed`);
      return updated;
    },
    [user, requireUser],
  );

  const deletePlan = useCallback((planId: string) => {
    const success = storeDeletePlan(planId);
    if (success) {
      setPlans([...loadPlans()]);
      toast.success("Plan deleted");
    }
    return success;
  }, []);

  const rsvpPlan = useCallback(
    async (
      planId: string,
      status: "going" | "maybe" | "declined",
      guestName?: string,
      notes?: string,
      plusOnes?: number,
      answers?: Record<string, string>,
    ) => {
      // Zero-friction guest RSVP: website guests answer from the invite link on
      // an anonymous Firebase session (satisfies the signed-in write rules;
      // tighter anonymous rate limits apply server-side). Native stays
      // account-gated per the shipped auth freeze.
      let anonUid: string | null = null;
      if (!user) {
        if (canRsvpAsGuest({ isNative: isNativeApp(), hasAccount: false })) {
          anonUid = await ensureAnonymousSession();
          if (!anonUid && !requireUser("Sign in to RSVP to plans.")) return undefined;
        } else if (!requireUser("Sign in to RSVP to plans.")) {
          return undefined;
        }
      }
      const attendeeId =
        user?.uid ||
        anonUid ||
        (typeof window !== "undefined" && localStorage.getItem("airpal.anon.id")) ||
        `anon-${Date.now()}`;

      if (typeof window !== "undefined" && !localStorage.getItem("airpal.anon.id")) {
        localStorage.setItem("airpal.anon.id", attendeeId);
      }

      const name =
        user?.displayName ||
        guestName?.trim() ||
        mine?.name ||
        (typeof window !== "undefined" && localStorage.getItem("airpal.guest.name")) ||
        "Guest Mate";

      if (guestName?.trim() && typeof window !== "undefined") {
        localStorage.setItem("airpal.guest.name", guestName.trim());
      }

      const seats = normalizePlusOnes(plusOnes);
      const current = storeGetPlan(planId);

      // Where the tap lands: approval-gated plans park newcomers as pending,
      // full plans park them on the waitlist. Ticketed bookings always land
      // going — Stripe spots govern those, not this guard.
      const resolved =
        current && !isTicketed(current) && status === "going"
          ? resolveRsvpStatus(current, attendeeId, status, seats)
          : status;

      // Growing your party trims to fit instead of bouncing or re-queueing.
      let finalSeats = seats;
      if (resolved === "going" && current && !isTicketed(current)) {
        const cap = Math.floor(Number(current.capacity));
        if (Number.isFinite(cap) && cap > 0) {
          const existing = current.attendees.find((a) => a.id === attendeeId);
          const room = Math.max(
            0,
            cap - (headcountTaken(current) - attendeeSeats(existing)) - 1,
          );
          if (seats > room) {
            finalSeats = room;
            toast.message(
              room > 0
                ? `Only room for a party of ${room + 1} — trimmed to fit.`
                : "This plan is full — your RSVP stays as is.",
            );
          }
        }
      }

      // Answers survive only for live questions, cleaned per type.
      const cleanAnswers: Record<string, string> = {};
      for (const q of current?.guestQuestions || []) {
        const v = normalizeAnswer(q, answers?.[q.id]);
        if (v) cleanAnswers[q.id] = v;
      }

      const updated = respondToPlan(planId, {
        id: attendeeId,
        name,
        handle: mine?.handle,
        status: resolved,
        plusOnes:
          finalSeats > 0 && (resolved === "going" || resolved === "waitlisted" || resolved === "pending")
            ? finalSeats
            : undefined,
        answers: Object.keys(cleanAnswers).length ? cleanAnswers : undefined,
        notes,
        isAnonymous: !user,
      });

      if (updated) {
        void triggerHaptic("success");
        if (resolved === "going") toast.success(`You're in for "${updated.title}"! 🎉`);
        else if (resolved === "pending") toast.message("Request sent — the host approves every guest.");
        else if (resolved === "waitlisted" && current) {
          const position = waitlistQueue(current).length + 1;
          toast.message(`This plan is full — you're #${position} on the waitlist.`);
        } else if (resolved === "maybe") toast.info(`Marked as maybe for "${updated.title}"`);
        else toast.message("RSVP updated");
      }
      return updated;
    },
    [user, mine, requireUser],
  );

  const reviewRsvp = useCallback(
    (planId: string, attendeeId: string, decision: "approve" | "decline") => {
      const current = storeGetPlan(planId);
      if (!current) return undefined;
      if (!isPlanManager(current, user?.uid)) {
        toast.error("Only the host can review requests.");
        return undefined;
      }
      const target = current.attendees.find((a) => a.id === attendeeId);
      if (!target || target.status !== "pending") return undefined;
      const nextStatus =
        decision === "decline" ? "declined" : goingFits(current, attendeeId, target.plusOnes) ? "going" : "waitlisted";
      const updated = savePlan({
        ...current,
        attendees: current.attendees.map((a) =>
          a.id === attendeeId ? { ...a, status: nextStatus, respondedAt: new Date().toISOString() } : a,
        ),
      });
      if (updated) {
        setPlans([...loadPlans()]);
        if (nextStatus === "going") toast.success(`${target.name} is in! 🎉`);
        else if (nextStatus === "waitlisted") toast.message("No seats left — moved to the waitlist.");
        else toast.message(`${target.name} was declined.`);
      }
      return updated;
    },
    [user],
  );

  // Host door check: flip one going guest's checked-in flag. Creator-only
  // write, no toast (rapid taps at the door) — the count tells the story.
  const toggleCheckIn = useCallback(
    (planId: string, attendeeId: string) => {
      const current = storeGetPlan(planId);
      if (!current) return undefined;
      if (!isPlanManager(current, user?.uid)) {
        toast.error("Only the host can check people in.");
        return undefined;
      }
      const target = current.attendees.find((a) => a.id === attendeeId);
      if (!target || target.status !== "going") return undefined;
      const updated = savePlan({
        ...current,
        attendees: setAttendeeCheckedIn(current.attendees, attendeeId, !target.checkedIn),
      });
      if (updated) {
        setPlans([...loadPlans()]);
        void triggerHaptic("light");
      }
      return updated;
    },
    [user],
  );

  const proposeDateOption = useCallback(
    (planId: string, input: { date: string; time?: string }) => {
      const current = storeGetPlan(planId);
      if (!current) return undefined;
      if (!isPlanManager(current, user?.uid)) {
        toast.error("Only the host can propose dates.");
        return undefined;
      }
      const date = String(input.date || "").trim();
      const time = String(input.time || "").trim();
      const errors = validDateOption({ date, time });
      if (errors.length) {
        toast.error(errors[0]!);
        return undefined;
      }
      if ((current.dateOptions || []).some((o) => o.date === date && String(o.time || "") === time)) {
        toast.message("That date is already on the poll.");
        return undefined;
      }
      if (!user) return undefined;
      const updated = savePlan({
        ...current,
        dateOptions: [
          ...(current.dateOptions || []),
          {
            id: `dateopt-${Date.now().toString(36)}`,
            date,
            time: time || undefined,
            votes: 0,
            voterUids: [],
            addedByUid: user.uid,
            addedByName: user.displayName || mine?.name || "Host",
          },
        ],
        // A fresh option reopens the question.
        datePollLocked: false,
      });
      if (updated) {
        setPlans([...loadPlans()]);
        toast.success("Date option added — votes decide.");
      }
      return updated;
    },
    [user, mine],
  );

  const lockDateOption = useCallback(
    (planId: string, optionId: string) => {
      const current = storeGetPlan(planId);
      if (!current) return undefined;
      if (!isPlanManager(current, user?.uid)) {
        toast.error("Only the host can lock the date.");
        return undefined;
      }
      const opt = (current.dateOptions || []).find((o) => o.id === optionId);
      if (!opt) return undefined;
      const time = String(opt.time || "").trim() || current.time;
      const updated = savePlan({
        ...current,
        date: opt.date,
        time,
        datetime: `${opt.date}T${time}:00`,
        datePollLocked: true,
      });
      if (updated) {
        setPlans([...loadPlans()]);
        toast.success(`Locked in ${formatDateOption(opt)} — tell the crew!`);
      }
      return updated;
    },
    [user],
  );

  const reopenDatePoll = useCallback(
    (planId: string) => {
      const current = storeGetPlan(planId);
      if (!current) return undefined;
      if (!isPlanManager(current, user?.uid)) {
        toast.error("Only the host can reopen the poll.");
        return undefined;
      }
      const updated = savePlan({ ...current, datePollLocked: false });
      if (updated) {
        setPlans([...loadPlans()]);
        toast.message("Date poll reopened.");
      }
      return updated;
    },
    [user],
  );

  const voteDateOption = useCallback(
    async (planId: string, optionId: string) => {
      if (!requireUser("Sign in to vote on dates.")) return undefined;
      const uid =
        user?.uid || (typeof window !== "undefined" && localStorage.getItem("airpal.anon.id")) || "guest";
      if (liveBackendEnabled()) {
        try {
          await voteDateOptionRemote({ planId, optionId });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not vote");
          return undefined;
        }
        // Server owns the count; mirror it locally without a direct write
        // (rules keep dateOptions host-only) until sync converges.
        const updated = votePlanDateOption(planId, optionId, uid, false);
        if (updated) {
          setPlans([...loadPlans()]);
          void triggerHaptic("light");
        }
        return updated;
      }
      const updated = votePlanDateOption(planId, optionId, uid, true);
      if (updated) {
        setPlans([...loadPlans()]);
        void triggerHaptic("light");
      }
      return updated;
    },
    [user, requireUser],
  );

  const addStop = useCallback(
    (
      planId: string,
      stop: { name: string; time?: string; notes?: string; placeId?: string; icon?: string; address?: string },
      opts?: { silent?: boolean },
    ) => {
      if (!requireUser("Sign in to add stops to plans.")) return undefined;
      const adderName = user?.displayName || mine?.name || "Mate";
      const updated = addStopToPlan(planId, {
        name: stop.name,
        time: stop.time,
        notes: stop.notes,
        icon: stop.icon,
        placeId: stop.placeId,
        address: stop.address,
        addedByName: adderName,
        addedByUid: user?.uid,
      });
      if (updated) {
        const notif = notifyStopChange(planId, "added", { stopName: stop.name, actorName: adderName });
        const count = notif?.recipientIds.length ?? 0;
        if (!opts?.silent) {
          toast.success(
            `Added "${stop.name}" to the plan!${count > 0 ? ` Notified ${count} mate${count === 1 ? "" : "s"}.` : ""}`,
          );
        }
      }
      return updated;
    },
    [user, mine, requireUser],
  );

  const updateStop = useCallback(
    (planId: string, stopId: string, patch: Partial<Omit<PlanStop, "id">>) => {
      if (!requireUser("Sign in to edit plan stops.")) return undefined;
      const actorName = user?.displayName || mine?.name || "Mate";
      const updated = updateStopInPlan(planId, stopId, patch);
      if (updated) {
        const stopName = updated.stops.find((s) => s.id === stopId)?.name ?? "stop";
        const notif = notifyStopChange(planId, "updated", { stopName, actorName });
        const count = notif?.recipientIds.length ?? 0;
        toast.success(`Updated stop${count > 0 ? ` · notified ${count} mate${count === 1 ? "" : "s"}` : ""}`);
      }
      return updated;
    },
    [user, mine, requireUser],
  );

  const removeStop = useCallback(
    (planId: string, stopId: string) => {
      if (!requireUser("Sign in to edit plan stops.")) return undefined;
      const actorName = user?.displayName || mine?.name || "Mate";
      const current = storeGetPlan(planId);
      const stopName = current?.stops.find((s) => s.id === stopId)?.name ?? "stop";
      const updated = removeStopFromPlan(planId, stopId);
      if (updated) {
        const notif = notifyStopChange(planId, "removed", { stopName, actorName });
        const count = notif?.recipientIds.length ?? 0;
        toast.success(`Removed "${stopName}"${count > 0 ? ` · notified ${count} mate${count === 1 ? "" : "s"}` : ""}`);
      }
      return updated;
    },
    [user, mine, requireUser],
  );

  const reorderStops = useCallback(
    (planId: string, fromIndex: number, toIndex: number) => {
      if (!requireUser("Sign in to edit plan stops.")) return undefined;
      const actorName = user?.displayName || mine?.name || "Mate";
      const updated = reorderStopsInPlan(planId, fromIndex, toIndex);
      if (updated && fromIndex !== toIndex) {
        const notif = notifyStopChange(planId, "reordered", { actorName });
        const count = notif?.recipientIds.length ?? 0;
        toast.success(`Itinerary reordered${count > 0 ? ` · notified ${count} mate${count === 1 ? "" : "s"}` : ""}`);
      }
      return updated;
    },
    [user, mine],
  );

  const voteStop = useCallback(
    (planId: string, stopId: string) => {
      if (!requireUser("Sign in to vote on stops.")) return undefined;
      const uid =
        user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null) || "guest";
      const updated = voteStopInPlan(planId, stopId, uid);
      if (updated) {
        void triggerHaptic("light");
      }
      return updated;
    },
    [user, requireUser],
  );

  const addComment = useCallback(
    (planId: string, text: string, photoUrl?: string) => {
      if (!text.trim()) return undefined;
      if (!requireUser("Sign in to post in crew discussions.")) return undefined;
      const authorName = user?.displayName || mine?.name || "Mate";
      const authorId =
        user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null) || "guest";
      const updated = addCommentToPlan(planId, {
        authorId,
        authorName,
        authorHandle: mine?.handle,
        text: text.trim(),
        photoUrl,
      });
      if (updated) {
        void triggerHaptic("light");
        toast.success("Comment posted!");
      }
      return updated;
    },
    [user, mine],
  );

  const followPlan = useCallback(
    (planId: string, emailOrId?: string) => {
      if (!requireUser("Sign in to follow plans.")) return false;
      let anonId = typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null;
      if (!anonId && typeof window !== "undefined") {
        anonId = `anon-${Date.now()}`;
        localStorage.setItem("airpal.anon.id", anonId);
      }
      const subscriber = emailOrId || user?.email || user?.uid || anonId || "anonymous-follower";

      const res = togglePlanSubscription(planId, subscriber);
      if (res) {
        if (res.subscribed) {
          toast.success("Following this plan! You'll receive updates.");
        } else {
          toast.message("Unfollowed plan updates");
        }
        return res.subscribed;
      }
      return false;
    },
    [user, requireUser],
  );

  const exportIcs = useCallback((plan: HangoutPlan) => {
    downloadPlanIcs(plan);
    toast.success("Downloaded calendar file (.ics)");
  }, []);

  const openGoogleCalendar = useCallback((plan: HangoutPlan) => {
    const url = getPlanGoogleCalendarUrl(plan);
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <PlanContext.Provider
      value={{
        plans,
        myPlans,
        publicPlans,
        getPlan,
        fetchPlan,
        createPlan,
        updatePlan,
        completePlan,
        deletePlan,
        rsvpPlan,
        reviewRsvp,
        toggleCheckIn,
        proposeDateOption,
        lockDateOption,
        reopenDatePoll,
        voteDateOption,
        addStop,
        updateStop,
        removeStop,
        reorderStops,
        voteStop,
        addComment,
        followPlan,
        exportIcs,
        openGoogleCalendar,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlans() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlans must be used within PlanProvider");
  return ctx;
}
