# Mercado de Transferências das Competições

Módulo determinístico (sem IA) disponível no perfil de qualquer competição: Super League, Ligas Nacionais, Competições Continentais e Competições Internacionais. Todos os indicadores calculados a partir das transferências existentes, com histórico por época e agregado total.

## Arquitetura (partilhada entre fases)

Um único módulo `src/lib/competition-market/` cobre carregamento de dados, agregação e classificações.

```
src/lib/competition-market/
  types.ts            → tipos partilhados (Scope, MarketDataset, ...)
  data.ts             → useCompetitionMarket(name, scope) — carrega transfers + player_profiles + standings + coach_assignments filtrados por competição/época
  aggregate.ts        → normalizações comuns (por época + agregado)
  origin.ts           → origem/destino, países parceiros, mercado interno vs externo
  players.ts          → nacionalidades, perfil etário, técnico, posicional
  finance.ts          → fluxo financeiro, ROI, margens
  clubs.ts            → ranking de clubes ativos
  talent.ts           → exportação/importação de talento, jovens/pico/veteranos
  identity.ts         → 12 classificações da secção 1 + 16 tags "Inteligência de Mercado"
```

UI vive em `src/components/profile/tabs/competition/CompetitionMarketTab.tsx` com sub-navegação interna (as 16 secções agrupadas em 6 grupos de UI: Identidade · Fluxo · Origem & Destino · Perfil · Financeiro · Inteligência). Registada em `src/components/profile/tabs/index.tsx` com `kinds: ["competition"]`.

## Dados usados

- `transfers` (person_type='player') — colunas: from_club_name, to_club_name, value, season_year, person_name.
- `player_profiles` — CA, PA, VP, idade, altura, peso, nacionalidade, continente, posição.
- `standings` — resolve clubes da competição por época (`competition`, `module`).
- `coach_assignments` — resolve continental/international (competição → clubes participantes).
- `clubs` / `countries` — join club→país/continente para origem/destino/parceiros.

Perfis continentais e internacionais definem "clubes da competição" via `continental_results` / `international_results` para essa época; nacionais/super league via `standings.competition`.

Todos os indicadores devolvem `{ value, byYear[], evolution, sources: string[] }` — cada classificação regista quais métricas a originaram (requisito do utilizador).

## Faseamento proposto

### Fase A — Fundação + Fluxo (secções 2, 3, 4, 12)
- Resolução dos clubes da competição por época + query única (bulk).
- Fluxo global: compras, vendas, saldo jogadores/financeiro, médias, maiores, maior janela, evolução anual.
- Origem/destino: rankings por país, continente, competição, divisão, clube.
- Clubes mais ativos: rankings de compras/vendas/investimento/saldo.

### Fase B — Perfis (secções 5, 6, 7, 8, 10, 11)
- Nacionalidades preferidas (contratadas + vendidas): número, %, valor, CA, PA, idade, reputação.
- Perfil etário (7 buckets) + classificação automática.
- Perfil técnico (CA/PA/reputação/valor/altura/peso/experiência internacional).
- Perfil posicional detalhado (GR/DD/DC/DE/MDC/MC/MO/ED/EE/PL) + grupos + classificação "investe mais em defesa/meio/ataque".
- Tipo de contratações (livre, empréstimo, definitiva, fim contrato, regresso, promoção da formação) — inferido de `value=0`, `from_club_name` nulo/marcado, transição intra-clube.
- Mercado interno vs externo (dentro da própria liga, nacional, continental, intercontinental).

### Fase C — Financeiro + Talento (secções 9, 13, 14, 15)
- Perfil financeiro: ROI, margem, eficiência, rentabilidade, lucro/perda.
- Países parceiros: mapa fornecedor/recetor + histórico.
- Exportação de talento (jovens/pico/veteranos vendidos).
- Importação de talento (experientes, estrelas, jovens promissores, wonderkids, veteranos).

### Fase D — Identidade + Inteligência (secções 1, 16)
- 12 classificações da secção 1 (Importadora, Exportadora, Formadora, Compradora, Vendedora, Desenvolvimento, Veteranos, Estrelas, Revenda, Conservadora, Agressiva, Equilibrada) — cada uma com score, percentil calculado no universo de competições, explicação e evolução histórica.
- 16 tags de "Inteligência de Mercado" com fontes explícitas (métricas que produziram a conclusão).
- Percentis calculados uma única vez sobre todas as competições e cacheados via TanStack Query.

## Detalhes técnicos

- Todas as agregações são feitas em memória a partir de queries bulk (mesmo padrão de `useCoachRoster` + `useCoachUniverse` da Fase A/B do perfil de treinador).
- Cache TanStack Query por (nome_competição, âmbito), stale 10min.
- Zero alterações a Engines, Rankings, Scores ou schema da BD.
- Todas as classificações e tags emitem `reason` + `metric` visíveis no UI (nunca conclusão sem justificação).

## Fora do âmbito

- Não altera Engines, Rankings, Scores ou o perfil de outras entidades.
- Não introduz nova rota — vive dentro do perfil de competição já existente.
- Não altera fluxos de importação.

## Confirmação

Podemos avançar com a **Fase A** já ou preferes que revejamos algum ponto do plano primeiro? Se aprovares, prossigo com o carregamento de dados, secções 2–4 e 12 no próximo turno.
