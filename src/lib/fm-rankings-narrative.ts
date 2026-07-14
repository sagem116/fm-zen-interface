/**
 * Deterministic PT-PT narrative generator for a ranking entity.
 * Uses only data already produced by the ranking engine + raw source rows.
 * No LLM, no external calls. Pure string templates over numbers.
 */

import type { BreakdownItem, RankingEntry } from "./fm-rankings";
import { entityStats } from "./fm-rankings-analysis";
import { fmtPts } from "./fmt";

type Kind = "clubes" | "treinadores" | "paises";

const LABEL: Record<Kind, { singular: string; article: string }> = {
  clubes: { singular: "clube", article: "O" },
  treinadores: { singular: "treinador", article: "O" },
  paises: { singular: "país", article: "O" },
};

export function buildNarrative(
  name: string,
  kind: Kind,
  entry: RankingEntry | undefined,
  evolution: Record<number, number> | undefined,
  breakdown: BreakdownItem[] | undefined,
  ranks: RankingEntry[],
): string[] {
  const paragraphs: string[] = [];
  const lbl = LABEL[kind];
  if (!entry || !evolution) {
    return [`Sem dados suficientes para gerar uma narrativa sobre ${name}.`];
  }
  const stats = entityStats(evolution);
  const position = ranks.findIndex((r) => r.name === name) + 1;
  const total = ranks.length;

  // Opening
  if (position > 0) {
    paragraphs.push(
      `${lbl.article} ${lbl.singular} **${name}** ocupa atualmente a posição **#${position}** de ${total} no ranking, com ${fmtPts(entry.weighted)} pontos ponderados (${fmtPts(entry.raw)} brutos).`,
    );
  }

  // Historical range
  if (stats.first != null && stats.last != null) {
    if (stats.seasons === 1) {
      paragraphs.push(`Tem dados apenas na época **${stats.first}**.`);
    } else {
      paragraphs.push(
        `Presença em **${stats.seasons} épocas** entre ${stats.first} e ${stats.last}, com uma média de ${fmtPts(stats.avg)} pontos por época.`,
      );
    }
  }

  // Peak / worst
  if (stats.best && stats.worst && stats.best.year !== stats.worst.year) {
    paragraphs.push(
      `O pico histórico foi em **${stats.best.year}** (${fmtPts(stats.best.value)} pts), enquanto o pior registo foi em **${stats.worst.year}** (${fmtPts(stats.worst.value)} pts).`,
    );
  } else if (stats.best) {
    paragraphs.push(`Melhor época em **${stats.best.year}** (${fmtPts(stats.best.value)} pts).`);
  }

  // Momentum
  if (stats.seasons >= 2) {
    const dp = stats.deltaPrev;
    if (Math.abs(dp) > stats.avg * 0.05) {
      if (dp > 0) {
        paragraphs.push(`Última época em **subida** face à anterior (+${fmtPts(dp)} pts).`);
      } else {
        paragraphs.push(`Última época em **queda** face à anterior (${fmtPts(dp)} pts).`);
      }
    } else {
      paragraphs.push(`Última época em linha com a anterior (Δ ${fmtPts(dp)} pts).`);
    }
    if (stats.deltaPeak < 0 && stats.peak > 0) {
      const pct = Math.round((stats.deltaPeak / stats.peak) * 100);
      paragraphs.push(`Está a ${Math.abs(pct)}% abaixo do pico histórico de ${stats.best?.year}.`);
    } else if (stats.deltaPeak >= 0 && stats.best?.year === stats.last) {
      paragraphs.push(`A época mais recente iguala o pico histórico.`);
    }
    if (Math.abs(stats.trend) > stats.avg * 0.02) {
      paragraphs.push(
        stats.trend > 0
          ? `A tendência linear das últimas épocas é **ascendente** (+${fmtPts(stats.trend)} pts/época).`
          : `A tendência linear das últimas épocas é **descendente** (${fmtPts(stats.trend)} pts/época).`,
      );
    }
  }

  // Titles / bonuses
  if (breakdown && breakdown.length) {
    const titleItems = breakdown.filter(
      (it) => it.source === "champion-bonus" || it.source === "continental-win",
    );
    if (titleItems.length) {
      const byYear = new Map<number, string[]>();
      for (const it of titleItems) {
        const comp = it.competition ?? (it.division_label || "Competição");
        const list = byYear.get(it.season_year) ?? [];
        list.push(comp);
        byYear.set(it.season_year, list);
      }
      const parts = [...byYear.entries()]
        .sort((a, b) => a[0] - b[0])
        .slice(-6)
        .map(([y, comps]) => `${y} · ${[...new Set(comps)].join(", ")}`);
      paragraphs.push(`Conquistas mais recentes: ${parts.join("; ")}.`);
    }

    // Dominant competition
    const compContrib = new Map<string, number>();
    let totalW = 0;
    for (const it of breakdown) {
      const c = it.competition ?? it.division_label ?? it.module;
      compContrib.set(c, (compContrib.get(c) ?? 0) + it.weighted);
      totalW += it.weighted;
    }
    if (totalW > 0) {
      const [topComp, topW] = [...compContrib.entries()].sort((a, b) => b[1] - a[1])[0];
      const share = Math.round((topW / totalW) * 100);
      if (share >= 30) {
        paragraphs.push(`A maior parte da pontuação (${share}%) vem de **${topComp}**.`);
      }
    }
  }

  // Position framing
  if (position > 0 && total > 0) {
    const pct = Math.round((position / total) * 100);
    if (pct <= 5) paragraphs.push(`Faz parte do **top 5%** do ranking histórico.`);
    else if (pct <= 20) paragraphs.push(`Está entre os **top 20%** do ranking histórico.`);
    else if (pct >= 80) paragraphs.push(`Encontra-se no terço inferior do ranking histórico.`);
  }

  return paragraphs;
}
