import { useSyncExternalStore } from "react";
import { onCareerEvent } from "../events";
import { getCareerRepository } from "../runtime";
import type { CareerId, CareerSnapshot, CareerStoreSnapshot } from "../types";
import { selectActiveCareer } from "../selectors";

// Cache the snapshot so useSyncExternalStore sees a stable reference between
// renders. The repository's getStoreSnapshot() deep-clones on every call, so
// without this cache each render would produce a new object and React would
// think the external store changed on every check — causing an infinite
// "Maximum update depth exceeded" loop.
let cachedSnapshot: CareerStoreSnapshot | null = null;

function readSnapshot(): CareerStoreSnapshot {
  if (cachedSnapshot === null) {
    cachedSnapshot = getCareerRepository().getStoreSnapshot();
  }
  return cachedSnapshot;
}

function invalidateSnapshot() {
  cachedSnapshot = null;
}

function subscribeStore(onStoreChange: () => void) {
  return onCareerEvent(() => {
    invalidateSnapshot();
    onStoreChange();
  });
}

function getSnapshot(): CareerStoreSnapshot {
  return readSnapshot();
}

export function useCareerStoreSnapshot(): CareerStoreSnapshot {
  return useSyncExternalStore(subscribeStore, getSnapshot, getSnapshot);
}

export function useResolvedCareer(careerId?: CareerId): CareerSnapshot | undefined {
  const snapshot = useCareerStoreSnapshot();
  if (careerId) return snapshot.careers[careerId];
  return selectActiveCareer(snapshot);
}
