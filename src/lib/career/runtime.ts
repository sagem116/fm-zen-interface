import { LocalCareerStore } from "./store";
import { LocalCareerRepository } from "./repositories";
import { createCareerDomain } from "./services";

const sharedStore = new LocalCareerStore();
const sharedRepository = new LocalCareerRepository(sharedStore);
const sharedDomain = createCareerDomain({ repository: sharedRepository });

export function getCareerStore() {
  return sharedStore;
}

export function getCareerRepository() {
  return sharedRepository;
}

export function getCareerDomain() {
  return sharedDomain;
}
