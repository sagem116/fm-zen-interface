import type { CareerId, CareerSnapshot, CareerStoreSnapshot } from "../types";
import type { CareerStore } from "../store";

export interface CareerRepository {
  list(): CareerSnapshot[];
  get(id: CareerId): CareerSnapshot | undefined;
  save(career: CareerSnapshot): void;
  remove(id: CareerId): void;
  getStoreSnapshot(): CareerStoreSnapshot;
  setActiveCareer(id: CareerId | undefined): void;
}

export class LocalCareerRepository implements CareerRepository {
  constructor(private readonly store: CareerStore) {}

  list(): CareerSnapshot[] {
    return Object.values(this.store.load().careers);
  }

  get(id: CareerId): CareerSnapshot | undefined {
    return this.store.load().careers[id];
  }

  save(career: CareerSnapshot): void {
    const snapshot = this.store.load();
    snapshot.careers[career.id] = career;
    this.store.save(snapshot);
  }

  remove(id: CareerId): void {
    const snapshot = this.store.load();
    delete snapshot.careers[id];
    if (snapshot.activeCareerId === id) snapshot.activeCareerId = undefined;
    this.store.save(snapshot);
  }

  getStoreSnapshot(): CareerStoreSnapshot {
    return this.store.load();
  }

  setActiveCareer(id: CareerId | undefined): void {
    const snapshot = this.store.load();
    snapshot.activeCareerId = id;
    this.store.save(snapshot);
  }
}
