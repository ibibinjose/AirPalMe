import type { StaffTicket } from "@shared/airpal-data";

export type PropertyTicketAlert = {
  propertyId: string;
  open: number;
  urgent: number;
  latest: StaffTicket | null;
};

export type TicketAlertSummary = {
  openCount: number;
  urgentCount: number;
  propertyCount: number;
  latest: StaffTicket | null;
  perProperty: PropertyTicketAlert[];
};

/**
 * Summarize open (unresolved) guest tickets across the properties this host
 * watches. Callers pass only their own property rows, so an alert raised at
 * one hotel never leaks into another hotel's banner.
 */
export function summarizeOpenTickets(byProperty: Record<string, StaffTicket[]>): TicketAlertSummary {
  const perProperty: PropertyTicketAlert[] = [];
  let latest: StaffTicket | null = null;
  for (const [propertyId, rows] of Object.entries(byProperty)) {
    const open = (rows || []).filter((t) => t && t.status !== "resolved");
    if (!open.length) continue;
    open.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    perProperty.push({
      propertyId,
      open: open.length,
      urgent: open.filter((t) => t.urgency === "urgent").length,
      latest: open[0] || null,
    });
    if (open[0] && (!latest || open[0].createdAt > latest.createdAt)) latest = open[0];
  }
  perProperty.sort((a, b) => (b.latest?.createdAt || "").localeCompare(a.latest?.createdAt || ""));
  return {
    openCount: perProperty.reduce((n, p) => n + p.open, 0),
    urgentCount: perProperty.reduce((n, p) => n + p.urgent, 0),
    propertyCount: perProperty.length,
    latest,
    perProperty,
  };
}
