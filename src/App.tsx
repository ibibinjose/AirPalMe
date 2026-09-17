import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { ZooLayer } from "@/components/zoo/ZooLayer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { ScrollProbe } from "@/components/debug/ScrollProbe";
import { DebugInfoOverlay } from "@/components/debug/DebugInfoOverlay";
import { NativeSplashTransition } from "@/components/layout/NativeSplashTransition";
import { AppProviders } from "@/app/providers";
import { AppRoutes } from "@/app/routes";
import { initNativeApp } from "@/lib/native";
import { installErrorTracking } from "@/lib/error-report";
import { initKeyboardManager } from "@/lib/keyboard";
import { useEffect } from "react";

function Boot() {
  useEffect(() => {
    installErrorTracking();
    // No boot-time anonymous sign-in: a guest identity is created lazily, only
    // when the stay QR check-in (or another identity-needing action) requires
    // one. Signing up later upgrades that same uid instead of forking.
    void initNativeApp({ deferSplashHide: true });
    const cleanupKeyboard = initKeyboardManager();
    return () => {
      cleanupKeyboard();
    };
  }, []);
  return (
    <AppShell>
      <AppRoutes />
      <ZooLayer />
      <SignInPrompt />
      <ScrollProbe />
      <DebugInfoOverlay />
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Toaster
          position="top-center"
          richColors
          offset="calc(env(safe-area-inset-top, 0px) + 112px)"
        />
        <NativeSplashTransition />
        <Boot />
      </AppProviders>
    </ErrorBoundary>
  );
}
