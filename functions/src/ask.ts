import { HttpsError, onCall } from "firebase-functions/v2/https";
import { enforceRateLimit, flagAutomation, isAnonymousAuth, noteAppCheck } from "./abuse";
import { writeAuthoritativeEvent } from "./analytics";
import { CALLABLE, db, requireAuth } from "./admin";

export const askAirPal = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "askAirPal");
  const uid = requireAuth(request.auth?.uid);
  const anonymous = isAnonymousAuth(request);
  await enforceRateLimit(uid, "ask", anonymous);
  const question = String(request.data?.question || "").trim();
  const propertyId = String(request.data?.propertyId || "").trim();
  const roomNumber = String(request.data?.roomNumber || "").trim();
  if (!question || !propertyId) throw new HttpsError("invalid-argument", "question and propertyId are required.");
  const limitSnap = await db.collection("rateLimits").doc(`${uid}_ask`).get();
  await flagAutomation({
    uid,
    action: "ask",
    anonymous,
    eventsInWindow: Number(limitSnap.data()?.count || 1),
    identicalPayloads: 0,
    missingAppCheck: !request.app,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpsError("failed-precondition", "AI assistant is not configured.");

  const propertySnap = await db.collection("properties").doc(propertyId).get();
  if (!propertySnap.exists) throw new HttpsError("not-found", "Property not found.");
  const property = propertySnap.data() || {};
  const [menuSnap, placesSnap] = await Promise.all([
    db.collection("properties").doc(propertyId).collection("menu").limit(40).get(),
    db.collection("properties").doc(propertyId).collection("places").limit(40).get(),
  ]);

  const knowledge = JSON.stringify({
    property: {
      name: property.name,
      city: property.city,
      address: property.address,
      checkIn: property.checkIn,
      checkOut: property.checkOut,
      breakfast: property.breakfast,
      facilities: property.facilities,
      phone: property.phone,
    },
    menu: menuSnap.docs.map((item) => item.data()),
    places: placesSnap.docs.map((item) => item.data()),
  });
  const prompt = [
    "You are AirPal, a careful hotel and destination companion.",
    "Answer only from the supplied property knowledge. If it is missing, say you do not know and suggest the front desk.",
    "Never invent prices, opening hours, bookings, emergency actions, or guarantees. Keep the answer concise and useful.",
    `Guest room: ${roomNumber || "not provided"}`,
    `Question: ${question}`,
    `Approved property knowledge: ${knowledge}`,
  ].join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
      }),
    },
  );
  if (!response.ok) throw new HttpsError("internal", "The AI assistant could not answer right now.");
  const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const answer = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join(" ")
    .trim();
  if (!answer) throw new HttpsError("internal", "The AI assistant returned an empty answer.");
  await writeAuthoritativeEvent({
    uid,
    eventName: "ask_answered",
    contextId: propertyId,
    contextType: "property",
    source: "internal",
    anonymous,
    properties: { contextId: propertyId, answerStatus: "shown", questionCategory: "stay", answerSource: "model" },
  });
  return { title: "AirPal", body: answer };
});
