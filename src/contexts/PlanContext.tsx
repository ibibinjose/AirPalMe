import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { HangoutPlan, PlanStop, PlanType, PlanTheme } from "@shared/plan";
import type { Geo } from "@shared/nearby";
import {
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
  addCommentToPlan,
  notifyStopChange,
  togglePlanSubscription,
  downloadPlanIcs,
  getPlanGoogleCalendarUrl,
} from "@/lib/plan-store";
import { useAuth } from "./AuthContext";
import { currencyForCity } from "@/lib/cities";
import { useBio } from "./BioContext";
import { toast } from "sonner";
import { triggerHaptic } from "@/lib/native";

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
  deletePlan: (planId: string) => boolean;
  rsvpPlan: (
    planId: string,
    status: "going" | "maybe" | "declined",
    guestName?: string,
    notes?: string,
  ) => HangoutPlan | undefined;
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

  const deletePlan = useCallback((planId: string) => {
    const success = storeDeletePlan(planId);
    if (success) {
      setPlans([...loadPlans()]);
      toast.success("Plan deleted");
    }
    return success;
  }, []);

  const rsvpPlan = useCallback(
    (planId: string, status: "going" | "maybe" | "declined", guestName?: string, notes?: string) => {
      if (!requireUser("Sign in to RSVP to plans.")) return undefined;
      const attendeeId =
        user?.uid || (typeof window !== "undefined" && localStorage.getItem("airpal.anon.id")) || `anon-${Date.now()}`;

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

      const updated = respondToPlan(planId, {
        id: attendeeId,
        name,
        handle: mine?.handle,
        status,
        notes,
        isAnonymous: !user,
      });

      if (updated) {
        void triggerHaptic("success");
        if (status === "going") toast.success(`You're in for "${updated.title}"! 🎉`);
        else if (status === "maybe") toast.info(`Marked as maybe for "${updated.title}"`);
        else toast.message("RSVP updated");
      }
      return updated;
    },
    [user, mine, requireUser],
  );

  const addStop = useCallback(
    (
      planId: string,
      stop: { name: string; time?: string; notes?: string; placeId?: string; icon?: string; address?: string },
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
        toast.success(
          `Added "${stop.name}" to the plan!${count > 0 ? ` Notified ${count} mate${count === 1 ? "" : "s"}.` : ""}`,
        );
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
        deletePlan,
        rsvpPlan,
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
