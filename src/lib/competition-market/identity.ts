// Competition Market — Fase D
// Section 1: 12 classificações de identidade (score + nível + explicação + evolução).
// Section 16: 16 tags de "Inteligência de Mercado" com fontes explícitas.
// Deterministic. Sem IA. Sem percentis cross-competição (usa thresholds absolutos).

import type { CompetitionMarketData } from "./data";
import { normKey, seasonClubKey } from "./data";
import { computeFlow } from "./compute";
import {
  enrichTransfers,
  computeInternalExternal,
  computeNationalities,
  computeAgeProfile,
  computeTechnicalProfile,
} from "./profile";

export type Level = "Baixa" | "Média" | "Alta" | "Muito Alta";

export interface IdentityClassification {
  key: string;
  label: string;
  score: number; // 0–100
  level: Level;
  explanation: string;
  reasons: Array<{ metric: string; value: string }>;
  byYear: Array<{ season_year: number; score: number }>;
}

export interface IntelligenceTag {
  key: string;
  label: string;
  active: boolean;
  reason: string;
  sources: Array<{ metric: string; value: string }>;
}

// ------- Helpers -------
function levelOf(score: number): Level {
  if (score >= 75) return "Muito Alta";
  if (score >= 50) return "Alta";
  if (score >= 25) return "Média";
  return "Baixa";
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function pctScore(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return clamp01(numerator / denominator) * 100;
}
function fmtPct(n: number, d = 0) {
  return `${n.toFixed(d)}%`;
}
function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}€${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(0)}K`;
  return `${sign}€${abs.toFixed(0)}`;
}

// Compute the twelve identity classifications for a competition.
export function computeIdentity(m: CompetitionMarketData): IdentityClassification[] {
  const flow = computeFlow(m);
  const t = flow.total;
  const inout = computeInternalExternal(m);
  const items = enrichTransfers(m);
  const buys = items.filter((i) => i.side === "buy");
  const sales = items.filter((i) => i.side === "sale");
  const totalMoves = t.buys + t.sales || 1;

  // Age heuristics
  const buyAges = buys.map((i) => i.snapshot?.age).filter((a): a is number => a != null);
  const saleAges = sales.map((i) => i.snapshot?.age).filter((a): a is number => a != null);
  const avgBuyAge = buyAges.length ? buyAges.reduce((a, b) => a + b, 0) / buyAges.length : 0;
  const avgSaleAge = saleAges.length ? saleAges.reduce((a, b) => a + b, 0) / saleAges.length : 0;
  const youngBuys = buyAges.filter((a) => a < 23).length;
  const veteranBuys = buyAges.filter((a) => a >= 30).length;
  const youngSales = saleAges.filter((a) => a < 23).length;

  // Reputation / CA heuristics
  const buyRep = buys
    .map((i) => i.snapshot?.reputation)
    .filter((v): v is number => v != null);
  const saleRep = sales
    .map((i) => i.snapshot?.reputation)
    .filter((v): v is number => v != null);
  const avgBuyRep = buyRep.length ? buyRep.reduce((a, b) => a + b, 0) / buyRep.length : 0;
  const avgSaleRep = saleRep.length ? saleRep.reduce((a, b) => a + b, 0) / saleRep.length : 0;
  const starsBought = buyRep.filter((r) => r >= 8).length;
  const starsSold = saleRep.filter((r) => r >= 8).length;

  // Financial derived
  const spent = t.spent;
  const received = t.received;
  const roi = spent > 0 ? (received - spent) / spent : 0;

  // Yearly score helper: rebuild a metric per year
  const byYearMap = new Map<number, { buys: number; sales: number; spent: number; received: number }>();
  for (const y of flow.byYear) {
    byYearMap.set(y.season_year, {
      buys: y.buys,
      sales: y.sales,
      spent: y.spent,
      received: y.received,
    });
  }
  const years = flow.byYear.map((y) => y.season_year);
  const yearScore = (fn: (v: { buys: number; sales: number; spent: number; received: number }) => number) =>
    years.map((y) => ({ season_year: y, score: fn(byYearMap.get(y)!) }));

  const out: IdentityClassification[] = [];

  // 1. Importadora — muitas entradas, saldo negativo de jogadores
  {
    const importShare = t.buys / totalMoves;
    const score = importShare * 100;
    out.push({
      key: "importadora",
      label: "Importadora",
      score,
      level: levelOf(score),
      explanation: "Peso das contratações no total de movimentos.",
      reasons: [
        { metric: "Compras", value: String(t.buys) },
        { metric: "Vendas", value: String(t.sales) },
        { metric: "% Compras", value: fmtPct(importShare * 100) },
      ],
      byYear: yearScore((v) => (v.buys + v.sales ? (v.buys / (v.buys + v.sales)) * 100 : 0)),
    });
  }

  // 2. Exportadora
  {
    const exportShare = t.sales / totalMoves;
    const score = exportShare * 100;
    out.push({
      key: "exportadora",
      label: "Exportadora",
      score,
      level: levelOf(score),
      explanation: "Peso das vendas no total de movimentos.",
      reasons: [
        { metric: "Vendas", value: String(t.sales) },
        { metric: "% Vendas", value: fmtPct(exportShare * 100) },
        { metric: "Saldo financeiro", value: fmtMoney(t.financialBalance) },
      ],
      byYear: yearScore((v) => (v.buys + v.sales ? (v.sales / (v.buys + v.sales)) * 100 : 0)),
    });
  }

  // 3. Formadora — vende jovens (idade média venda < 24 e volume de <23 vendidos alto)
  {
    const youngShare = saleAges.length ? youngSales / saleAges.length : 0;
    const ageBonus = avgSaleAge > 0 ? clamp01((28 - avgSaleAge) / 8) : 0;
    const score = clamp01(youngShare * 0.7 + ageBonus * 0.3) * 100;
    out.push({
      key: "formadora",
      label: "Formadora",
      score,
      level: levelOf(score),
      explanation: "Vende maioritariamente jogadores jovens (<23 anos).",
      reasons: [
        { metric: "Jovens vendidos (<23)", value: String(youngSales) },
        { metric: "% de vendas <23", value: fmtPct(youngShare * 100) },
        { metric: "Idade média das vendas", value: avgSaleAge.toFixed(1) },
      ],
      byYear: [],
    });
  }

  // 4. Compradora — investimento elevado
  {
    const avgSeasonSpend = years.length ? spent / years.length : spent;
    const score = pctScore(avgSeasonSpend, 200_000_000); // €200M/época = topo
    out.push({
      key: "compradora",
      label: "Compradora",
      score,
      level: levelOf(score),
      explanation: "Investimento total e por época em contratações.",
      reasons: [
        { metric: "Total investido", value: fmtMoney(spent) },
        { metric: "Média por época", value: fmtMoney(avgSeasonSpend) },
        { metric: "Épocas", value: String(years.length || 1) },
      ],
      byYear: yearScore((v) => pctScore(v.spent, 200_000_000)),
    });
  }

  // 5. Vendedora — receita elevada
  {
    const avgSeasonReceive = years.length ? received / years.length : received;
    const score = pctScore(avgSeasonReceive, 200_000_000);
    out.push({
      key: "vendedora",
      label: "Vendedora",
      score,
      level: levelOf(score),
      explanation: "Receita total e por época com vendas.",
      reasons: [
        { metric: "Total recebido", value: fmtMoney(received) },
        { metric: "Média por época", value: fmtMoney(avgSeasonReceive) },
      ],
      byYear: yearScore((v) => pctScore(v.received, 200_000_000)),
    });
  }

  // 6. Desenvolvimento — compra jovens (idade média compras baixa)
  {
    const youngShare = buyAges.length ? youngBuys / buyAges.length : 0;
    const ageBonus = avgBuyAge > 0 ? clamp01((28 - avgBuyAge) / 8) : 0;
    const score = clamp01(youngShare * 0.6 + ageBonus * 0.4) * 100;
    out.push({
      key: "desenvolvimento",
      label: "Desenvolvimento",
      score,
      level: levelOf(score),
      explanation: "Aposta em contratações jovens (<23) para desenvolvimento.",
      reasons: [
        { metric: "Jovens contratados (<23)", value: String(youngBuys) },
        { metric: "% de compras <23", value: fmtPct(youngShare * 100) },
        { metric: "Idade média das compras", value: avgBuyAge.toFixed(1) },
      ],
      byYear: [],
    });
  }

  // 7. Veteranos — compra experientes (idade >=30)
  {
    const share = buyAges.length ? veteranBuys / buyAges.length : 0;
    const ageBonus = avgBuyAge > 0 ? clamp01((avgBuyAge - 25) / 8) : 0;
    const score = clamp01(share * 0.6 + ageBonus * 0.4) * 100;
    out.push({
      key: "veteranos",
      label: "Veteranos",
      score,
      level: levelOf(score),
      explanation: "Aposta em contratações experientes (≥30 anos).",
      reasons: [
        { metric: "Veteranos contratados (≥30)", value: String(veteranBuys) },
        { metric: "% compras ≥30", value: fmtPct(share * 100) },
        { metric: "Idade média das compras", value: avgBuyAge.toFixed(1) },
      ],
      byYear: [],
    });
  }

  // 8. Estrelas — compra jogadores de alta reputação
  {
    const share = buyRep.length ? starsBought / buyRep.length : 0;
    const repBonus = avgBuyRep ? clamp01((avgBuyRep - 5) / 5) : 0;
    const score = clamp01(share * 0.5 + repBonus * 0.5) * 100;
    out.push({
      key: "estrelas",
      label: "Estrelas",
      score,
      level: levelOf(score),
      explanation: "Contrata jogadores de elevada reputação (≥8).",
      reasons: [
        { metric: "Estrelas contratadas (rep≥8)", value: String(starsBought) },
        { metric: "% compras rep≥8", value: fmtPct(share * 100) },
        { metric: "Reputação média (compras)", value: avgBuyRep.toFixed(1) },
      ],
      byYear: [],
    });
  }

  // 9. Revenda — vende com margem positiva (proxy: saldo financeiro positivo relativo ao gasto)
  {
    const score = spent > 0 ? clamp01(roi / 2) * 100 : received > 0 ? 60 : 0;
    out.push({
      key: "revenda",
      label: "Revenda",
      score,
      level: levelOf(score),
      explanation: "Capacidade de gerar retorno face ao investimento.",
      reasons: [
        { metric: "ROI (recebido − gasto) / gasto", value: fmtPct(roi * 100) },
        { metric: "Recebido", value: fmtMoney(received) },
        { metric: "Gasto", value: fmtMoney(spent) },
      ],
      byYear: yearScore((v) => (v.spent > 0 ? clamp01((v.received - v.spent) / v.spent / 2) * 100 : 0)),
    });
  }

  // 10. Conservadora — poucos movimentos por época
  {
    const perSeason = years.length ? totalMoves / years.length : totalMoves;
    // 10 mov/época = neutro; ≤5 = muito conservadora; ≥20 = nada conservadora
    const score = clamp01((20 - perSeason) / 15) * 100;
    out.push({
      key: "conservadora",
      label: "Conservadora",
      score,
      level: levelOf(score),
      explanation: "Poucos movimentos por época de mercado.",
      reasons: [
        { metric: "Movimentos por época", value: perSeason.toFixed(1) },
        { metric: "Total de movimentos", value: String(totalMoves) },
        { metric: "Épocas", value: String(years.length || 1) },
      ],
      byYear: yearScore((v) => clamp01((20 - (v.buys + v.sales)) / 15) * 100),
    });
  }

  // 11. Agressiva — muitos movimentos por época
  {
    const perSeason = years.length ? totalMoves / years.length : totalMoves;
    const score = clamp01((perSeason - 5) / 15) * 100;
    out.push({
      key: "agressiva",
      label: "Agressiva",
      score,
      level: levelOf(score),
      explanation: "Mercado muito ativo em cada época.",
      reasons: [
        { metric: "Movimentos por época", value: perSeason.toFixed(1) },
        { metric: "Total de movimentos", value: String(totalMoves) },
      ],
      byYear: yearScore((v) => clamp01(((v.buys + v.sales) - 5) / 15) * 100),
    });
  }

  // 12. Equilibrada — compras ≈ vendas e saldo ≈ 0
  {
    const balanceBalance = 1 - clamp01(Math.abs(t.playerBalance) / Math.max(1, totalMoves));
    const finBalance = spent + received > 0
      ? 1 - clamp01(Math.abs(t.financialBalance) / (spent + received))
      : 1;
    const score = ((balanceBalance + finBalance) / 2) * 100;
    out.push({
      key: "equilibrada",
      label: "Equilibrada",
      score,
      level: levelOf(score),
      explanation: "Equilíbrio entre compras/vendas e saldo financeiro próximo de zero.",
      reasons: [
        { metric: "Saldo de jogadores", value: String(t.playerBalance) },
        { metric: "Saldo financeiro", value: fmtMoney(t.financialBalance) },
        { metric: "Compras / Vendas", value: `${t.buys} / ${t.sales}` },
      ],
      byYear: [],
    });
  }

  return out;
}

// -------- Section 16 — Intelligence tags --------
export function computeIntelligence(m: CompetitionMarketData): IntelligenceTag[] {
  const flow = computeFlow(m);
  const t = flow.total;
  const items = enrichTransfers(m);
  const buys = items.filter((i) => i.side === "buy");
  const sales = items.filter((i) => i.side === "sale");
  const inout = computeInternalExternal(m);
  const nat = computeNationalities(m);
  const age = computeAgeProfile(m);
  const tech = computeTechnicalProfile(m);
  const totalMoves = t.buys + t.sales || 1;
  const years = flow.byYear.length || 1;

  const tags: IntelligenceTag[] = [];

  const push = (
    key: string,
    label: string,
    active: boolean,
    reason: string,
    sources: Array<{ metric: string; value: string }>,
  ) => tags.push({ key, label, active, reason, sources });

  // Top nationality share
  const topNat = nat.byNationality[0];
  const topNatShare = topNat && nat.coverage ? topNat.buys / Math.max(1, nat.coverage) : 0;
  const totalBrasil = nat.byNationality
    .filter((n) => n.label.toLowerCase().includes("bras"))
    .reduce((s, n) => s + n.buys + n.sales, 0);
  const totalArg = nat.byNationality
    .filter((n) => n.label.toLowerCase().includes("argent"))
    .reduce((s, n) => s + n.buys + n.sales, 0);

  push(
    "dep-brasil",
    "Grande dependência do mercado brasileiro",
    nat.coverage > 20 && totalBrasil / Math.max(1, nat.coverage) >= 0.3,
    "Mais de 30% dos jogadores movimentados são brasileiros.",
    [{ metric: "Movimentos brasileiros", value: `${totalBrasil} / ${nat.coverage}` }],
  );
  push(
    "dep-argentina",
    "Grande dependência do mercado argentino",
    nat.coverage > 20 && totalArg / Math.max(1, nat.coverage) >= 0.25,
    "Mais de 25% dos jogadores movimentados são argentinos.",
    [{ metric: "Movimentos argentinos", value: `${totalArg} / ${nat.coverage}` }],
  );
  push(
    "diversificado",
    "Mercado muito diversificado",
    nat.byNationality.length >= 15 && topNatShare < 0.2,
    "Mais de 15 nacionalidades diferentes e nenhuma domina o mercado.",
    [
      { metric: "Nacionalidades distintas", value: String(nat.byNationality.length) },
      { metric: "Peso da 1ª nacionalidade", value: fmtPct(topNatShare * 100) },
    ],
  );
  push(
    "concentrado",
    "Mercado extremamente concentrado",
    !!topNat && topNatShare >= 0.5,
    "Mais de metade dos movimentos vêm de uma única nacionalidade.",
    [
      { metric: "Nacionalidade dominante", value: topNat?.label ?? "—" },
      { metric: "Peso", value: fmtPct(topNatShare * 100) },
    ],
  );

  // Age-based
  push(
    "esp-jovens",
    "Especialista em contratar jovens",
    age.buyStats.count > 5 && age.buyStats.avg > 0 && age.buyStats.avg < 23,
    "Idade média das contratações inferior a 23 anos.",
    [
      { metric: "Idade média (compras)", value: age.buyStats.avg.toFixed(1) },
      { metric: "Contratações <21", value: String(age.buyStats.under21) },
    ],
  );
  push(
    "esp-feitos",
    "Especialista em contratar jogadores feitos",
    age.buyStats.count > 5 && age.buyStats.avg >= 27,
    "Idade média das contratações igual ou superior a 27 anos.",
    [{ metric: "Idade média (compras)", value: age.buyStats.avg.toFixed(1) }],
  );
  push(
    "vende-talento",
    "Especialista em vender talento",
    age.saleStats.count > 5 && age.saleStats.avg > 0 && age.saleStats.avg < 24,
    "Idade média das vendas inferior a 24 anos.",
    [
      { metric: "Idade média (vendas)", value: age.saleStats.avg.toFixed(1) },
      { metric: "Jovens vendidos (<21)", value: String(age.saleStats.under21) },
    ],
  );
  push(
    "compra-experiencia",
    "Especialista em comprar experiência",
    age.buyStats.count > 5 && age.buyStats.over30 / Math.max(1, age.buyStats.count) >= 0.35,
    "Mais de 35% das contratações têm 30+ anos.",
    [
      {
        metric: "% compras ≥30",
        value: fmtPct((age.buyStats.over30 / Math.max(1, age.buyStats.count)) * 100),
      },
    ],
  );

  // Volume-based
  const perSeason = totalMoves / years;
  push(
    "muito-ativo",
    "Mercado muito ativo",
    perSeason >= 15,
    "Mais de 15 movimentos por época em média.",
    [{ metric: "Movimentos/época", value: perSeason.toFixed(1) }],
  );
  push(
    "conservador",
    "Mercado conservador",
    perSeason > 0 && perSeason <= 5,
    "Menos de 5 movimentos por época em média.",
    [{ metric: "Movimentos/época", value: perSeason.toFixed(1) }],
  );

  // Money-based
  const avgBuy = t.avgBuyValue;
  push(
    "inflacionado",
    "Mercado inflacionado",
    t.buys > 5 && avgBuy >= 15_000_000,
    "Valor médio por contratação ≥ €15M.",
    [
      { metric: "Valor médio (compras)", value: fmtMoney(avgBuy) },
      { metric: "Total gasto", value: fmtMoney(t.spent) },
    ],
  );
  push(
    "baixo-investimento",
    "Mercado de baixo investimento",
    t.buys > 5 && avgBuy > 0 && avgBuy < 1_000_000,
    "Valor médio por contratação inferior a €1M.",
    [{ metric: "Valor médio (compras)", value: fmtMoney(avgBuy) }],
  );

  // Internal partners
  push(
    "mercado-interno-forte",
    "Mercado interno muito forte",
    inout.buys.internal + inout.sales.internal >= 10 && inout.buys.internalPct >= 40,
    "Uma grande parte das transferências acontece dentro da própria competição.",
    [
      { metric: "% compras internas", value: fmtPct(inout.buys.internalPct) },
      { metric: "% vendas internas", value: fmtPct(inout.sales.internalPct) },
    ],
  );
  push(
    "mercado-externo",
    "Foco no mercado externo",
    inout.buys.internal + inout.buys.external > 5 && inout.buys.internalPct <= 10,
    "Quase todas as contratações vêm de fora da competição.",
    [
      { metric: "% compras externas", value: fmtPct(100 - inout.buys.internalPct) },
      { metric: "Parceiros externos", value: String(inout.buys.external) },
    ],
  );

  // Reputation-based
  push(
    "atrai-estrelas",
    "Atrai estrelas mundiais",
    tech.buys.avgReputation >= 7,
    "Reputação média das contratações ≥ 7.",
    [{ metric: "Reputação média (compras)", value: tech.buys.avgReputation.toFixed(1) }],
  );
  push(
    "vende-estrelas",
    "Exporta estrelas",
    tech.sales.avgReputation >= 7,
    "Reputação média das vendas ≥ 7.",
    [{ metric: "Reputação média (vendas)", value: tech.sales.avgReputation.toFixed(1) }],
  );

  return tags;
}
