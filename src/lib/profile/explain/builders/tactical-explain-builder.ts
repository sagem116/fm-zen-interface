import type { StyleVector } from "@/lib/profile/style";
import type { ExplainSection } from "../types";

function bucket(value: number): "alto" | "médio" | "baixo" {
  if (value >= 70) return "alto";
  if (value <= 45) return "baixo";
  return "médio";
}

function line(label: string, value: number, high: string, low: string, neutral: string): string {
  const b = bucket(value);
  if (b === "alto") return `${label}: ${high}`;
  if (b === "baixo") return `${label}: ${low}`;
  return `${label}: ${neutral}`;
}

export function buildTacticalExplainSection(input: {
  title: string;
  subtitle: string;
  vector: StyleVector;
}): ExplainSection {
  const { vector } = input;
  const bullets = [
    line(
      "Construção",
      vector.buildUp,
      "participa de forma ativa na saída e progressão curta.",
      "aparece pouco na primeira fase e procura soluções diretas.",
      "alterna construção apoiada e passe vertical.",
    ),
    line(
      "Criação",
      vector.creativity,
      "tem impacto contínuo na criação de oportunidades.",
      "gera pouca criação direta e depende do coletivo.",
      "contribui em momentos selecionados da criação.",
    ),
    line(
      "Finalização",
      vector.finishing,
      "mantém presença forte em zonas de remate e conversão.",
      "não tem peso consistente no momento final da jogada.",
      "apresenta finalização funcional sem ser dominante.",
    ),
    line(
      "Pressão e recuperação",
      (vector.pressing + vector.recovery) / 2,
      "agride o portador e recupera cedo após perda.",
      "pressiona pouco e recupera mais em bloco baixo.",
      "pressiona por gatilho, sem volume permanente.",
    ),
    line(
      "Posse e risco",
      (vector.possession + vector.discipline) / 2,
      "mantém posse com segurança e risco controlado.",
      "assume risco elevado na circulação e perde estabilidade.",
      "equilibra posse e progressão com variação moderada.",
    ),
  ];

  return {
    id: "tactical-explain",
    title: input.title,
    subtitle: input.subtitle,
    body: "Leitura tática construída a partir dos vetores comportamentais de estilo e produção competitiva.",
    bullets,
    indicators: [
      { label: "Construção", value: vector.buildUp },
      { label: "Criatividade", value: vector.creativity },
      { label: "Finalização", value: vector.finishing },
      { label: "Pressão", value: vector.pressing },
      { label: "Recuperação", value: vector.recovery },
      { label: "Posse", value: vector.possession },
    ],
  };
}
