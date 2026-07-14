export interface RecruitmentDictionaryAdapter {
  normalizeTerm(input: string): string;
}

export const defaultRecruitmentDictionaryAdapter: RecruitmentDictionaryAdapter = {
  normalizeTerm: (input) => input.trim(),
};
