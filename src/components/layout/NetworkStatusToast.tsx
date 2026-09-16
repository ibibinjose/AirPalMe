import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function NetworkStatusToast() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowReconnected(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const visible = !isOnline || showReconnected;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 shadow-xl text-xs font-medium backdrop-blur-md ring-1 ${
              !isOnline
                ? "bg-stone-900/95 text-stone-100 ring-stone-700/80"
                : "bg-emerald-950/95 text-emerald-100 ring-emerald-700/80"
            }`}
          >
            {!isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <WifiOff size={14} className="text-amber-400 shrink-0" />
                <span>Offline Mode · Cached stays & places accessible</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <Wifi size={14} className="text-emerald-400 shrink-0" />
                <span>Back Online · Live updates active</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
