import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AIRPAL_CLUB_ID, inviteMailto, isEmail, type ClubInvite, type ClubMember, type GuestEntry } from "@shared/club";
import {
  addGuest as persistGuest,
  guestsFor,
  loadInvites,
  loadMembers,
  recordInvite,
  removeGuest as dropGuest,
  removeMember,
  subscribeClub,
  upsertMember,
} from "@/lib/club-store";

type ClubValue = {
  members: ClubMember[];
  invites: ClubInvite[];
  memberByEmail: (email: string) => ClubMember | undefined;
  joinClub: (input: { email: string; name: string; city: string; invites: boolean; offers: boolean }) => ClubMember;
  leaveClub: (email: string) => void;
  guests: (clubId: string) => GuestEntry[];
  addGuest: (
    clubId: string,
    input: { email: string; name: string; note?: string; source?: GuestEntry["source"] },
  ) => GuestEntry;
  removeGuest: (clubId: string, email: string) => void;
  importClubToList: (clubId: string) => number;
  sendInvite: (clubId: string, subject: string, body: string, emails: string[]) => { href: string; copied: string };
};

const ClubContext = createContext<ClubValue | undefined>(undefined);

export function ClubProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<ClubMember[]>(() => (typeof window === "undefined" ? [] : loadMembers()));
  const [invites, setInvites] = useState<ClubInvite[]>(() => (typeof window === "undefined" ? [] : loadInvites()));
  const [guestTick, setGuestTick] = useState(0);

  const refresh = useCallback(() => {
    setMembers(loadMembers());
    setInvites(loadInvites());
    setGuestTick((n) => n + 1);
  }, []);

  useEffect(() => subscribeClub(refresh), [refresh]);

  const value = useMemo<ClubValue>(
    () => ({
      members,
      invites,
      memberByEmail: (email) => members.find((row) => row.email === email.trim().toLowerCase()),
      joinClub(input) {
        if (!isEmail(input.email)) throw new Error("Need an email");
        const row = upsertMember({ ...input, invites: input.invites, offers: input.offers });
        refresh();
        return row;
      },
      leaveClub(email) {
        removeMember(email);
        refresh();
      },
      guests: (clubId) => {
        void guestTick;
        return guestsFor(clubId);
      },
      addGuest(clubId, input) {
        if (!isEmail(input.email)) throw new Error("Need an email");
        const row = persistGuest(clubId, {
          email: input.email,
          name: input.name,
          note: input.note || "",
          source: input.source || "manual",
        });
        refresh();
        return row;
      },
      removeGuest(clubId, email) {
        dropGuest(clubId, email);
        refresh();
      },
      importClubToList(clubId) {
        const existing = new Set(guestsFor(clubId).map((row) => row.email));
        let n = 0;
        for (const row of loadMembers().filter((m) => m.invites)) {
          if (existing.has(row.email)) continue;
          persistGuest(clubId, { email: row.email, name: row.name, note: "AirPal Club", source: "airpal-club" });
          n += 1;
        }
        refresh();
        return n;
      },
      sendInvite(clubId, subject, body, emails) {
        const list = emails.map((e) => e.trim().toLowerCase()).filter(isEmail);
        if (!list.length) throw new Error("No emails");
        const href = inviteMailto(list, subject, body);
        recordInvite({ clubId, subject, body, emails: list });
        refresh();
        return { href, copied: list.join(", ") };
      },
    }),
    [guestTick, invites, members, refresh],
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub");
  return ctx;
}

export { AIRPAL_CLUB_ID };
