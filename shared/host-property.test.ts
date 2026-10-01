import { describe, expect, it } from "vitest";
import { buildHostProperty, hostSecretsFromProperty, toPublicPropertyDoc } from "./host-property";

describe("buildHostProperty wifi defaults", () => {
  it("does not invent a guest password when the host omitted one", () => {
    const property = buildHostProperty({
      propertyName: "Harbour Rocks Hotel",
      ownerEmail: "host@example.com",
      kind: "hotel",
    });
    expect(property.wifi.network).toBe("Guest Wi-Fi");
    expect(property.wifi.password).toBe("");
  });

  it("keeps an explicit wifi password", () => {
    const property = buildHostProperty({
      propertyName: "Harbour Rocks Hotel",
      ownerEmail: "host@example.com",
      wifiNetwork: "HarbourHotel_Guest",
      wifiPassword: "rockssydney2026",
    });
    expect(property.wifi.network).toBe("HarbourHotel_Guest");
    expect(property.wifi.password).toBe("rockssydney2026");
  });

  it("keeps campus, hostel, and venue passwords empty until the host sets them", () => {
    expect(buildHostProperty({ propertyName: "College", ownerEmail: "a@b.c", kind: "campus" }).wifi.password).toBe("");
    expect(buildHostProperty({ propertyName: "Hostel", ownerEmail: "a@b.c", kind: "hostel" }).wifi.password).toBe("");
    expect(buildHostProperty({ propertyName: "The Hall", ownerEmail: "a@b.c", kind: "venue" }).kind).toBe("venue");
    expect(buildHostProperty({ propertyName: "The Hall", ownerEmail: "a@b.c", kind: "venue" }).wifi.password).toBe("");
  });
});

describe("wifi secret split", () => {
  it("strips password from the public property doc", () => {
    const property = buildHostProperty({
      propertyName: "Test Hotel",
      ownerEmail: "host@example.com",
      ownerId: "uid-1",
      wifiNetwork: "GuestNet",
      wifiPassword: "secret-pass",
    });
    const publicDoc = toPublicPropertyDoc(property);
    expect(publicDoc.wifi.password).toBe("");
    expect(publicDoc.wifi.network).toBe("GuestNet");
    expect(hostSecretsFromProperty(property)).toEqual({
      wifiPassword: "secret-pass",
      wifiNetwork: "GuestNet",
    });
  });

  it("strips the owner email from the public property doc", () => {
    const property = buildHostProperty({
      propertyName: "Test Hotel",
      ownerEmail: "host@example.com",
      ownerId: "uid-1",
    });
    expect(property.ownerEmail).toBe("host@example.com");
    expect(toPublicPropertyDoc(property).ownerEmail).toBeUndefined();
  });
});

describe("opaque property ids", () => {
  it("does not use the name-slug as the Firestore doc id for new properties", () => {
    const property = buildHostProperty({
      propertyName: "Harbour Rocks Hotel",
      ownerEmail: "host@example.com",
      kind: "hotel",
      city: "Sydney",
    });
    expect(property.id).toMatch(/^p_[a-zA-Z0-9]{10}$/);
    expect(property.handle).toBe("harbour-rocks-hotel");
    expect(property.slug).toBe("harbour-rocks-hotel");
    expect(property.vanityKey).toBe("sydney/harbour-rocks-hotel");
    expect(property.countryCode).toBe("AU");
  });

  it("stores host GPS and region for local matching", () => {
    const property = buildHostProperty({
      propertyName: "Kovalam Beach Inn",
      ownerEmail: "host@example.com",
      city: "Kovalam",
      country: "India",
      countryCode: "IN",
      state: "Kerala",
      geo: { lat: 8.4004, lng: 76.9787 },
    });
    expect(property.countryCode).toBe("IN");
    expect(property.state).toBe("Kerala");
    expect(property.geo).toEqual({ lat: 8.4004, lng: 76.9787 });
    expect(property.id).not.toBe(property.handle);
  });

  it("still accepts an explicit legacy id when provided", () => {
    const property = buildHostProperty({
      propertyName: "Harbour Rocks Hotel",
      ownerEmail: "host@example.com",
      id: "harbour-rocks-hotel-6cbbce",
    });
    expect(property.id).toBe("harbour-rocks-hotel-6cbbce");
    expect(property.handle).toBe("harbour-rocks-hotel");
  });
});
