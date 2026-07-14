import type { CareerId, CareerSnapshot, CareerStoreSnapshot } from "../types";

export function selectCareerList(snapshot: CareerStoreSnapshot): CareerSnapshot[] {
  return Object.values(snapshot.careers).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectCareerById(
  snapshot: CareerStoreSnapshot,
  careerId: CareerId,
): CareerSnapshot | undefined {
  return snapshot.careers[careerId];
}

export function selectActiveCareer(snapshot: CareerStoreSnapshot): CareerSnapshot | undefined {
  if (!snapshot.activeCareerId) return undefined;
  return snapshot.careers[snapshot.activeCareerId];
}

export function selectCareerOrThrow(
  snapshot: CareerStoreSnapshot,
  careerId: CareerId,
): CareerSnapshot {
  const career = selectCareerById(snapshot, careerId);
  if (!career) throw new Error(`[career] not found: ${careerId}`);
  return career;
}
