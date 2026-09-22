import {
  type HangoutPlan,
  formatPlanDate,
  formatTime12h,
  planInviteUrl,
  PLAN_TYPES,
  EXPERIENCE_CATEGORIES,
} from "@shared/plan";
import { makeQrDataUrl } from "@/lib/qr";
import { isNativeApp, shareNative } from "@/lib/native";

/**
 * Generates and prints a magazine-quality, print-optimized physical PDF / trip guide
 * for the plan with full itinerary stops, arrival times, addresses, notes, inclusions,
 * and a dynamic QR code linking back to the live digital plan.
 */
export async function exportPlanItineraryPdf(plan: HangoutPlan): Promise<"printed" | "shared"> {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://airpal.me";
  const inviteUrl = planInviteUrl(plan.id, origin);

  // Open synchronously inside the tap — any await before window.open hands
  // the popup to the blocker (iOS Safari and Android Chrome are strictest).
  const printWindow = window.open("", "_blank", "width=850,height=1100");
  if (!printWindow) {
    // App shells have no popup windows at all: share the live plan link so
    // the guest can open it in Safari/Chrome and print from there.
    if (isNativeApp()) {
      const shared = await shareNative({
        title: `${plan.title} — trip guide`,
        text: `Open "${plan.title}" in Safari or Chrome to print the trip guide:`,
        url: inviteUrl,
      });
      if (shared) return "shared";
    }
    throw new Error("Could not open print window. Please allow popups for this site.");
  }
  printWindow.document.write("<html><body><p>Preparing your trip guide…</p></body></html>");

  const qrDataUrl = await makeQrDataUrl(inviteUrl, 240);

  const typeInfo = PLAN_TYPES[plan.type] || PLAN_TYPES.custom;
  const occasionLabel =
    plan.isExperience && plan.experienceCategory
      ? `${EXPERIENCE_CATEGORIES[plan.experienceCategory]?.emoji || "✨"} ${EXPERIENCE_CATEGORIES[plan.experienceCategory]?.label || "Experience"}`
      : typeInfo.label;

  const stopsHtml =
    plan.stops.length > 0
      ? plan.stops
          .map(
            (stop, index) => `
      <div class="stop-item">
        <div class="stop-left">
          <div class="stop-number">#${index + 1}</div>
          <div class="stop-time">${stop.time ? formatTime12h(stop.time) : "Flexible"}</div>
        </div>
        <div class="stop-content">
          <div class="stop-header">
            <h3 class="stop-title">${escapeHtml(stop.name)}</h3>
          </div>
          ${stop.address ? `<div class="stop-address">📍 ${escapeHtml(stop.address)}</div>` : ""}
          ${stop.notes ? `<div class="stop-notes">${escapeHtml(stop.notes)}</div>` : ""}
        </div>
      </div>
    `,
          )
          .join("")
      : `<div class="empty-stops">No fixed stops listed. Check live plan for real-time updates.</div>`;

  const inclusionsHtml =
    plan.inclusions &&
    ((plan.inclusions.included && plan.inclusions.included.length > 0) ||
      (plan.inclusions.notIncluded && plan.inclusions.notIncluded.length > 0) ||
      (plan.inclusions.whatToBring && plan.inclusions.whatToBring.length > 0))
      ? `
    <div class="section-box inclusions-grid">
      ${
        plan.inclusions.included && plan.inclusions.included.length > 0
          ? `
        <div class="inc-col">
          <h4>✅ What's Included</h4>
          <ul>
            ${plan.inclusions.included.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `
          : ""
      }
      ${
        plan.inclusions.notIncluded && plan.inclusions.notIncluded.length > 0
          ? `
        <div class="inc-col">
          <h4>ℹ️ Not Included</h4>
          <ul class="muted-list">
            ${plan.inclusions.notIncluded.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `
          : ""
      }
      ${
        plan.inclusions.whatToBring && plan.inclusions.whatToBring.length > 0
          ? `
        <div class="inc-col">
          <h4>🎒 What to Bring</h4>
          <ul>
            ${plan.inclusions.whatToBring.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      `
          : ""
      }
    </div>
  `
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(plan.title)} — Itinerary & Trip Guide</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .guide-container {
      max-width: 800px;
      margin: 0 auto;
    }
    /* Header Card */
    .header-card {
      border: 2px solid #e5e7eb;
      border-radius: 16px;
      padding: 20px 24px;
      background: #fdfdfd;
      margin-bottom: 20px;
      position: relative;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .header-left {
      flex: 1;
    }
    .badge-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .badge.gold {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }
    .main-title {
      font-size: 24px;
      font-weight: 800;
      color: #111827;
      line-height: 1.2;
      margin-bottom: 6px;
    }
    .host-line {
      font-size: 12px;
      color: #6b7280;
      font-weight: 500;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9ca3af;
      font-weight: 600;
    }
    .meta-value {
      font-size: 13px;
      font-weight: 700;
      color: #1f2937;
      margin-top: 2px;
    }
    .qr-box {
      text-align: center;
      flex-shrink: 0;
      padding: 8px;
      border-radius: 12px;
      border: 1px dashed #d1d5db;
      background: #ffffff;
      width: 130px;
    }
    .qr-box img {
      width: 100px;
      height: 100px;
      display: block;
      margin: 0 auto;
    }
    .qr-label {
      font-size: 9px;
      color: #6b7280;
      margin-top: 4px;
      font-weight: 600;
      line-height: 1.2;
    }

    /* Notes Box */
    .notes-box {
      background: #f9fafb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 20px;
      font-size: 12px;
      color: #374151;
    }
    .notes-box strong {
      display: block;
      margin-bottom: 2px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #92400e;
    }

    /* Section Headers */
    .section-title {
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #111827;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #111827;
      padding-bottom: 4px;
    }
    .section-count {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
    }

    /* Itinerary Stops Timeline */
    .stops-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .stop-item {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .stop-left {
      width: 80px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      border-right: 1px solid #f3f4f6;
      padding-right: 12px;
    }
    .stop-number {
      font-size: 10px;
      font-weight: 800;
      color: #9ca3af;
      letter-spacing: 0.05em;
    }
    .stop-time {
      font-size: 13px;
      font-weight: 800;
      color: #111827;
      margin-top: 2px;
    }
    .stop-content {
      flex: 1;
      min-width: 0;
    }
    .stop-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .stop-address {
      font-size: 11px;
      color: #4b5563;
      margin-top: 3px;
      font-weight: 500;
    }
    .stop-notes {
      font-size: 11.5px;
      color: #6b7280;
      margin-top: 4px;
      background: #f9fafb;
      padding: 6px 10px;
      border-radius: 6px;
      font-style: italic;
    }

    /* Inclusions Grid */
    .inclusions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      padding: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #fdfdfd;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .inc-col h4 {
      font-size: 11px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 6px;
    }
    .inc-col ul {
      list-style: none;
      font-size: 11px;
      color: #374151;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .inc-col ul.muted-list {
      color: #6b7280;
    }
    .inc-col li {
      padding-left: 12px;
      position: relative;
    }
    .inc-col li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #9ca3af;
    }

    /* Footer */
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #9ca3af;
      page-break-inside: avoid;
    }
    .footer-brand {
      font-weight: 700;
      color: #4b5563;
    }

    /* Print action overlay for screen preview */
    .no-print-bar {
      background: #111827;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-radius: 12px;
    }
    .print-btn {
      background: #f59e0b;
      color: #000000;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 9999px;
      cursor: pointer;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="guide-container">
    <div class="no-print-bar">
      <div>
        <strong>Itinerary Print & PDF Guide Ready</strong>
        <p style="font-size: 11px; opacity: 0.8;">Choose "Save as PDF" in your print dialog for a digital file.</p>
      </div>
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
    </div>

    <!-- Header Card -->
    <div class="header-card">
      <div class="header-top">
        <div class="header-left">
          <div class="badge-row">
            <span class="badge gold">${escapeHtml(occasionLabel)}</span>
            <span class="badge">${plan.isPublic ? "Public Hangout" : "Private Group"}</span>
            ${plan.durationMode === "multi_day" ? `<span class="badge">Multi-Day Trip</span>` : ""}
          </div>
          <h1 class="main-title">${escapeHtml(plan.title)}</h1>
          <p class="host-line">Organised by <strong>${escapeHtml(plan.creator.name)}</strong> ${plan.creator.handle ? `(@${escapeHtml(plan.creator.handle)})` : ""}</p>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Date & Time</span>
              <span class="meta-value">${escapeHtml(formatPlanDate(plan.date, plan.time))}${plan.endTime ? ` – ${escapeHtml(formatTime12h(plan.endTime))}` : ""}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Destination / Area</span>
              <span class="meta-value">${escapeHtml(plan.destination || plan.city)}</span>
            </div>
          </div>
        </div>

        <div class="qr-box">
          <img src="${qrDataUrl}" alt="Event QR Code" />
          <div class="qr-label">Scan with camera for live updates & maps</div>
        </div>
      </div>
    </div>

    ${
      plan.notes
        ? `
      <div class="notes-box">
        <strong>Host Notes & Overview</strong>
        ${escapeHtml(plan.notes)}
      </div>
    `
        : ""
    }

    <!-- Stops Section -->
    <div class="section-title">
      <span>Itinerary Stops & Schedule</span>
      <span class="section-count">${plan.stops.length} planned ${plan.stops.length === 1 ? "stop" : "stops"}</span>
    </div>

    <div class="stops-list">
      ${stopsHtml}
    </div>

    <!-- Inclusions / What to bring -->
    ${inclusionsHtml}

    <!-- Footer -->
    <div class="footer">
      <span class="footer-brand">AirPal Events · Physical Trip Guide</span>
      <span>Live Link: ${escapeHtml(inviteUrl)} · Generated on ${new Date().toLocaleDateString()}</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      // Auto-trigger print dialog after brief rendering delay
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return "printed";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
