import { composeNarrative } from "../narrative";
import type { EditorialContext, NarrativePreset } from "../types";
import { buildComparisonNarrative } from "./comparison-engine";
import { buildContextNarrative } from "./context-engine";
import { buildExplainNarrative } from "./explain-engine";
import { buildStorytellingNarrative } from "./storytelling-engine";
import { buildTrendNarrative } from "./trend-engine";

export type EditorialNarrativeMode = "story" | "explain";

export interface EditorialNarrativeSection {
  id:
    | "executive"
    | "analysis"
    | "comparison"
    | "evolution"
    | "interpretation"
    | "trends"
    | "historical"
    | "explain"
    | "storytelling";
  title: string;
  items: string[];
}

export interface EditorialNarrativePackage {
  sections: EditorialNarrativeSection[];
}

const SECTION_IDS = new Set([
  "opening",
  "positioning",
  "drivers",
  "trajectory",
  "cycle",
  "ecosystem",
  "legacy",
  "season-story",
  "closing",
]);

export function buildEditorialNarrativePackage(
  ctx: EditorialContext,
  preset: NarrativePreset,
  mode: EditorialNarrativeMode = "story",
): EditorialNarrativePackage {
  const editorialBlocks = composeNarrative(ctx, "editorial", preset).filter((block) => SECTION_IDS.has(block.id));
  const executive = composeNarrative(ctx, "mini", preset).map((block) => block.text).slice(0, 3);
  const analysis = editorialBlocks
    .filter((block) => block.id !== "opening" && block.id !== "positioning")
    .map((block) => block.text);

  const comparison = buildComparisonNarrative(ctx);
  const evolution = buildTrendNarrative(ctx);
  const interpretation = buildInterpretationNarrative(ctx);
  const trends = buildStorytellingNarrative(ctx);
  const historical = buildContextNarrative(ctx);
  const explain = buildExplainNarrative(ctx);

  const sections: EditorialNarrativeSection[] = [];
  pushSection(sections, "executive", mode === "explain" ? "Leitura executiva" : "Resumo Executivo", executive);
  pushSection(sections, "analysis", "Análise Principal", analysis);
  pushSection(sections, "comparison", "Comparação", comparison);
  pushSection(sections, "evolution", "Evolução", evolution);
  pushSection(sections, "interpretation", "Interpretação", interpretation);
  pushSection(sections, "trends", "Tendências", trends);
  pushSection(sections, "historical", "Contexto Histórico", historical);
  pushSection(sections, "explain", mode === "explain" ? "Explain Mode" : "Porque existe este score", explain);

  if (mode !== "explain") {
    const storytelling = buildStorytellingNarrative(ctx);
    pushSection(sections, "storytelling", "Storytelling", storytelling);
  }

  return { sections };
}

function pushSection(
  sections: EditorialNarrativeSection[],
  id: EditorialNarrativeSection["id"],
  title: string,
  items: string[],
) {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (!clean.length) return;
  sections.push({ id, title, items: clean });
}

function buildInterpretationNarrative(ctx: EditorialContext): string[] {
  const out: string[] = [];

  if (ctx.evolution.deltaScore != null) {
    if (ctx.evolution.deltaScore > 0.5) {
      out.push(
        "O aumento de rendimento não deve ser lido como mera subida numérica: ele traduz uma campanha mais eficaz e um peso competitivo mais forte.",
      );
    } else if (ctx.evolution.deltaScore < -0.5) {
      out.push(
        "A descida do score não significa queda absoluta de qualidade; significa apenas que a entidade perdeu parte do seu impacto relativo no universo avaliado.",
      );
    } else {
      out.push(
        "A estabilidade do score sugere continuidade: a entidade não mudou de patamar, mas também não perdeu a identidade competitiva.",
      );
    }
  }

  if (ctx.evolution.deltaRank != null) {
    if (ctx.evolution.deltaRank < 0) {
      out.push(
        "Melhorar na classificação tem mais valor do que somar apenas pontos, porque indica ganho relativo face aos pares.",
      );
    } else if (ctx.evolution.deltaRank > 0) {
      out.push(
        "Perder posições explica menos sobre o valor absoluto e mais sobre o aumento da concorrência no mesmo espaço competitivo.",
      );
    }
  }

  if (ctx.confidence.level > 0) {
    out.push(
      "A interpretação deve sempre ser filtrada pela confiança do dado: mais cobertura significa leitura mais firme, menos cobertura significa prudência editorial.",
    );
  }

  if (ctx.topContributions.length) {
    out.push(
      "Os fatores de maior contributo mostram onde o modelo encontrou o verdadeiro motor do resultado, evitando leituras superficiais sobre apenas um número final.",
    );
  }

  return out.slice(0, 4);
}
