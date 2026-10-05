import { describe, expect, it } from "vitest";
import { isUrgentRequest, staffNeedKind } from "./receptionist";

describe("staffNeedKind", () => {
  it("detects linen, late checkout, maintenance, and cleaning needs", () => {
    expect(staffNeedKind("Can I get fresh towels and extra pillows?")).toBe("linen");
    expect(staffNeedKind("What time is checkout and can I get late checkout?")).toBe("late_checkout");
    expect(staffNeedKind("The AC is leaking in my room")).toBe("maintenance");
    expect(staffNeedKind("Please send housekeeping to clean the room")).toBe("cleaning");
  });

  it("detects general staff actions like keys, taxis, and luggage", () => {
    expect(staffNeedKind("I lost my room key")).toBe("general");
    expect(staffNeedKind("How do I book a taxi to the airport?")).toBe("general");
    expect(staffNeedKind("Can someone collect my luggage?")).toBe("general");
  });

  it("stays silent on answerable questions", () => {
    expect(staffNeedKind("What is the Wi-Fi network and password?")).toBeNull();
    expect(staffNeedKind("When and where is breakfast served?")).toBeNull();
    expect(staffNeedKind("Where is the swimming pool and what are the hours?")).toBeNull();
  });
});

describe("isUrgentRequest", () => {
  it("flags leaks and emergencies only", () => {
    expect(isUrgentRequest("There is a leak in the bathroom")).toBe(true);
    expect(isUrgentRequest("Emergency, please come now")).toBe(true);
    expect(isUrgentRequest("This is urgent, the door won't lock")).toBe(true);
    expect(isUrgentRequest("Can I get extra towels?")).toBe(false);
  });
});
