import { RECRUITMENT_ROUTES } from "../constants/recruitment-routes";

export interface RecruitmentQuickAction {
  label: string;
  to: string;
}

export interface RecruitmentContext {
  quickActions: RecruitmentQuickAction[];
}

export function buildRecruitmentContext(): RecruitmentContext {
  return {
    quickActions: [
      { label: "Pesquisar Jogadores", to: "/super-league/jogadores-clubes" },
      { label: "Pesquisar Treinadores", to: "/treinadores" },
      { label: "Abrir Shortlists", to: RECRUITMENT_ROUTES.shortlists },
      { label: "Tactical Recruitment", to: RECRUITMENT_ROUTES.tactical },
      { label: "Recruitment Intelligence", to: RECRUITMENT_ROUTES.intelligence },
      { label: "Recommendation Engine", to: RECRUITMENT_ROUTES.recomendacoes },
      { label: "Comparar Jogadores", to: "/comparar" },
      { label: "Comparar Treinadores", to: "/comparar" },
      { label: "Abrir Intelligence", to: "/insights" },
      { label: "Abrir Rankings", to: "/rankings" },
      { label: "Abrir Scores", to: "/scores" },
    ],
  };
}
