import { useSyncExternalStore } from 'react';

/**
 * Returns true only on the client after hydration.
 * Uses useSyncExternalStore for a hydration-safe, lint-friendly implementation.
 * - Server render: returns false
 * - Client after hydration: returns true
 *
 * Use this to gate Framer Motion animations and avoid hydration mismatches.
 */
const emptySubscribe = () => () => {};

export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // Client snapshot: always mounted
    () => false   // Server snapshot: never mounted
  );
}
