## Módulo Mercado — Rankings de Transferências

Nova página `/mercado` isolada dos módulos existentes, com 3 tabs (Competição, Clube, Treinador) sobre os dados já persistidos em `transfers`.

### Arquitetura

```
src/lib/market-rankings/
  service.ts          -> fetch + índices (transfers, standings, clubs, countries, coach_assignments, player_profiles)
  compute.ts          -> agregações por competição / clube / treinador com filtros
  narrative.ts        -> geração de narrativa determinística
  hooks.ts            -> useMarketRankings (react-query, cache 10min)
  types.ts

src/components/market/
  MarketFilters.tsx   -> Época (intervalo), País, Continente, Competição, Tipo
  MarketTable.tsx     -> tabela reutilizável (7 colunas)
  MarketNarrative.tsx -> narrative + explain mode

src/routes/mercado.tsx  -> página com tabs
```

Sidebar: nova entrada em NAV_GROUPS na secção "Rankings" com ícone `ArrowLeftRight` (lucide) apontando para `/mercado`.

### Modelo de dados / cálculos

Fonte única: `transfers` (já existente, com value normalizado por `parseValue`). Cada transferência é lida uma vez.

Contexto por transferência:
- `buyerCompetition/country/continent`: derivado de `standings(season_year, club_name)` → competição do clube nessa época; fallback `clubs.country_id → countries.name`, `clubs.continent`.
- `sellerCompetition/country/continent`: idem sobre `from_club_name`.
- `age`: `player_profiles(player_name, season_year).age`.
- `coach` do lado comprador/vendedor: `coach_assignments(club_name, season_year)`.

Filtros aplicados aos rows agregados (ranking):
- `seasonFrom/seasonTo` — restringe transferências.
- `country` / `continent` / `competition` — filtra a chave do grupo (ex: só competições em Portugal).
- `type`:
  - `all`: total = compras + vendas
  - `buys`: valor de transferências onde a entidade é o comprador
  - `sales`: valor de transferências onde a entidade é o vendedor
  - `net`: compras − vendas

Colunas (todas as tabs):
1. Pos.
2. Nome (link para perfil quando aplicável)
3. Valor total transferências
4. Valor médio (só sobre transferências com valor > 0)
5. Maior transferência única
6. Idade média (inclui transferências sem valor)
7. Saldo compras/vendas

Regra de valores: `parseValue` já garante normalização K/M/B; para strings tipo `"84M € (114M €)"` a função actual normaliza numérico após remover símbolos — vou reforçar no parser para preferir o valor entre parênteses quando existir (regra pedida pelo user).

Tab **Competição**: agrupa por `competition` (via standings). Compras = transferências para clubes-membros; Vendas = de clubes-membros.

Tab **Clube**: agrupa por `to_club_name`/`from_club_name` normalizado. Nome linka `/clubes/:name`.

Tab **Treinador**: para cada `coach_assignment(coach, club, season)` atribui transferências desse clube nessa época ao treinador. Nome linka `/treinadores/:name`.

### Narrative Mode

Gerado por `narrative.ts` a partir dos agregados: 3–5 frases contextualizando o líder do ranking (maior spend, idade média vs global, agressividade de mercado). Sem AI, texto template determinístico com valores reais.

### Performance

- Uma única query batch por hook (Promise.all) → índices em memória.
- Agregação em `useMemo` com filtros.
- `react-query` com `staleTime: 10min`.
- Tabela usa virtualização se lista > 100 rows (via `@tanstack/react-virtual`, já usado no projeto).

### Histórico (fase futura)

`compute.ts` já produz agregados por (grupo, temporada); guardar isto em cache local (`localStorage`) por hash de filtros permite evolução temporal — deixo o gancho pronto mas UI de evolução fica para depois.

### Fora de scope

- Não altera `fm-transfers.ts` (só o parser ganha regra `()` — mudança mínima e coberta por teste novo).
- Não toca em `competition-market/*`, rankings mundiais, scores, etc.
