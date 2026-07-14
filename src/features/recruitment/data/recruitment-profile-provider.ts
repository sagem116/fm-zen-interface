import type { RecruitmentEntity } from "../types/recruitment-models";

export interface RecruitmentProfileProvider {
  getProfileById(id: string): RecruitmentEntity | null;
  getProfileByTypeAndName(type: RecruitmentEntity["type"], name: string): RecruitmentEntity | null;
}

export function createRecruitmentProfileProvider(
  entities: RecruitmentEntity[],
): RecruitmentProfileProvider {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const byTypeName = new Map(entities.map((e) => [`${e.type}:${e.name.toLowerCase()}`, e]));

  return {
    getProfileById: (id: string) => byId.get(id) ?? null,
    getProfileByTypeAndName: (type, name) =>
      byTypeName.get(`${type}:${name.toLowerCase()}`) ?? null,
  };
}
