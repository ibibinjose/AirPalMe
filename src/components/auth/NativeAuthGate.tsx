import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { isNativeApp } from "@/lib/native";
import { isNativeAuthPublicPath } from "@/lib/native-auth-gate";
import { NativeOpenScreen } from "./NativeOpenScreen";

/**
 * Native iOS/Android require an account. Web guests still browse without signing in.
 */
export function NativeAuthGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [path] = useLocation();

  if (!isNativeApp()) return children;
  if (user) return children;
  if (isNativeAuthPublicPath(path)) return children;
  return <NativeOpenScreen />;
}
