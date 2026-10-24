import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * SSR-safe client mount hook using React 19 useSyncExternalStore
 * Returns false on the server / prerender, true on the client.
 */
export function useIsMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
