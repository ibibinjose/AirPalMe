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
import { ensureAnonymousSession } from "@/lib/firebase";
import { initNativeApp } from "@/lib/native";
import { installErrorTracking } from "@/lib/error-report";
import { initKeyboardManager } from "@/lib/keyboard";
import { useEffect } from "react";

function Boot() {
  useEffect(() => {
    installErrorTracking();
    void ensureAnonymousSession();
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
        <Toaster position="top-center" richColors offset="calc(env(safe-area-inset-top, 0px) + 112px)" />
        <NativeSplashTransition />
        <Boot />
      </AppProviders>
    </ErrorBoundary>
  );
}
