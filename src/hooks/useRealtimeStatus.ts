import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RealtimeStatus = "connected" | "degraded" | "offline";

/**
 * Lightweight realtime health check with polling fallback.
 * - Pings Supabase periodically; if it fails, reports degraded/offline
 * - Uses navigator.onLine as a hint
 */
export const useRealtimeStatus = () => {
  const [status, setStatus] = useState<RealtimeStatus>("connected");
  const [lastOkAt, setLastOkAt] = useState<number>(Date.now());

  useEffect(() => {
    let mounted = true;
    let interval: number | undefined;

    const ping = async () => {
      // Cheap HEAD-like query
      try {
        await supabase
          .from("knowledge_sparks")
          .select("id", { head: true, count: "exact" })
          .limit(1);
        if (!mounted) return;
        setLastOkAt(Date.now());
        setStatus("connected");
      } catch {
        if (!mounted) return;
        const offline = typeof navigator !== "undefined" && navigator && "onLine" in navigator ? !navigator.onLine : false;
        if (offline) {
          setStatus("offline");
        } else {
          // If last OK was > 60s ago, consider degraded
          setStatus(Date.now() - lastOkAt > 60_000 ? "degraded" : "connected");
        }
      }
    };

    // Initial ping and interval
    ping();
    interval = window.setInterval(ping, 30_000);

    // React to browser online/offline
    const handleOnline = () => setStatus("connected");
    const handleOffline = () => setStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [lastOkAt]);

  const refetchInterval = useMemo(() => (status === "connected" ? false : 15_000), [status]);

  return { status, refetchInterval } as const;
};
