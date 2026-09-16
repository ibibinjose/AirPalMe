import { describe, expect, it, vi, beforeEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar } from "@capacitor/status-bar";
import { hideNativeSplash, initNativeApp } from "./native";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: {
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
  },
  Style: {
    Light: "LIGHT",
    Dark: "DARK",
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
  },
}));

describe("native splash screen logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call SplashScreen.hide when not on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await hideNativeSplash();

    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });

  it("calls SplashScreen.hide with default 350ms fadeOutDuration when on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await hideNativeSplash();

    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 350 });
  });

  it("calls SplashScreen.hide with custom fadeOutDuration when provided", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    await hideNativeSplash({ fadeOutDuration: 500 });

    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 500 });
  });

  it("initNativeApp respects deferSplashHide option", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    await initNativeApp({ deferSplashHide: true });

    expect(StatusBar.setStyle).toHaveBeenCalled();
    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });

  it("initNativeApp hides splash screen by default if not deferred", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");

    await initNativeApp();

    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 350 });
  });
});
