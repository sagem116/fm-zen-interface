# Plano — Evolução Perfis, Pesquisa e Dashboard

Três áreas independentes. Todas reutilizam dados e componentes existentes. Nenhum cálculo é alterado.

---

## 1. Perfil de Treinadores — Balanço de Transferências

**Objetivo:** replicar no perfil do treinador a secção de mercado que já existe no perfil dos clubes.

**Fonte de dados:** tabela `transfers` (já existe) — filtrando pelo treinador em vez do clube. Assumimos ligação via `coach_assignments` (treinador × clube × época) para atribuir cada transferência ao treinador em funções nessa época.

**O que será mostrado:**
- KPIs: total gasto, total recebido, balanço líquido, nº contratações, nº vendas.
- Gráfico de evolução por época (barras receita/despesa + linha balanço).
- Tabela top compras / top vendas.
- Indicador de tendência (últimas 3 épocas vs anteriores).
- Narrativa editorial curta ("perfil comprador/vendedor/equilibrado", baseada apenas nos rácios).

**Reutilização:**
- Componente `ClubTransfersSection` (ou equivalente já existente no perfil do clube) — extrair a UI para um componente genérico `TransfersBalanceSection` que aceita a origem dos dados.
- Motor narrativo existente (`src/lib/editorial/engines`) — adicionar template `coach_market_policy`.

**Ficheiros:**
- Novo: `src/components/profile/tabs/CoachTransfersSection.tsx` (wrapper) ou reutilizar diretamente.
- Novo: `src/lib/coach-transfers.ts` (agregação por treinador).
- Editar: registry de tabs do perfil de treinador.

---

## 2. Pesquisa Global — Sticky + Command Palette Inteligente

**Objetivo:** transformar `GlobalSearch` numa pesquisa persistente, tolerante e agrupada.

**Comportamento:**
- **Sticky:** mover para dentro do `AppShell` header com `position: sticky; top: 0`, sempre visível durante scroll. Atalho `⌘K` / `Ctrl+K` continua a abrir o painel completo.
- **Command palette:** painel modal com secções agrupadas — Jogadores, Clubes, Treinadores, Competições, Países, Continentes.
- **Tolerância:** normalização de acentos (`String.normalize("NFD")`), lowercase, fuzzy matching (usar `fuse.js` — já disponível ou instalar), suporte a aliases se existirem em `player_profiles`/`clubs`.
- **Resultados relacionados:** para um jogador, mostrar também o clube atual e país; para um clube, treinador atual e país; etc. Ligar via joins existentes.
- **Atalhos:**
  - Pesquisas recentes (localStorage, max 8).
  - Entidades visitadas recentemente (já existe histórico em `useRecruitmentSourceData` — reaproveitar padrão).
  - Favoritos se a infra existir; caso contrário, deixar seção vazia (não criar do zero).

**Ficheiros:**
- Editar: `src/components/GlobalSearch.tsx` — reescrever como command palette (usar `cmdk` via shadcn `Command` que já está no projeto).
- Editar: `src/components/AppShell.tsx` — barra sticky no topo.
- Novo: `src/lib/global-search/index.ts` — indexação em memória + fuzzy.
- Novo: `src/lib/global-search/recent.ts` — localStorage helper.

---

## 3. Dashboard — Centro de Inteligência

**Objetivo:** reorganizar e enriquecer, sem tocar em cálculos.

**Nova estrutura em blocos:**
1. **Visão Geral** — KPIs de universo (jogadores, clubes, treinadores, competições, países, continentes) + histórico (épocas, primeiro/último ano, cobertura).
2. **Atividade Recente** — últimos imports, resumo da época, alertas.
3. **Evolução Histórica** — gráficos de tendência (nº jogadores, nº clubes, valor de mercado, transferências, rankings, scores) por época.
4. **Inteligência** — insights automáticos (existente `insights` engine) agrupados: ascensão, declínio, dominância, recordes.
5. **Destaques** — melhor jogador/clube/treinador/país, top scores, novos líderes, maiores compras/vendas.

**Novos cartões (todos derivados de dados existentes):**
- `DashboardUniverse` — KPIs de universo + histórico.
- `DashboardMarket` — totais de transferências, top compras/vendas.
- `DashboardTopEntities` — melhor entidade por categoria.
- `DashboardTrends` — sparklines/mini-charts de evolução.
- `DashboardMovers` — maiores subidas/descidas recentes (já parcialmente em `biggestRise/Fall`).

**Personalização:**
- Cada bloco envolvido em wrapper com `visible` + `order` guardado em localStorage (`dashboard-layout-v1`).
- Diálogo "Personalizar Dashboard" (reaproveitar padrão de `SidebarCustomizeDialog`) — reordenar via drag ou setas, toggle visibilidade.

**Ficheiros:**
- Novo: `src/components/dashboard/DashboardUniverse.tsx`, `DashboardMarket.tsx`, `DashboardTopEntities.tsx`, `DashboardTrends.tsx`, `DashboardMovers.tsx`, `DashboardCustomizeDialog.tsx`.
- Novo: `src/hooks/useDashboardLayout.ts`.
- Editar: `src/routes/index.tsx` — nova composição por blocos.

---

## Detalhes Técnicos

- Todas as narrativas usam `src/lib/editorial/engines` — apenas novos templates, sem inventar dados.
- Persistência local via `localStorage` (pesquisas recentes, layout do Dashboard).
- Fuzzy: usar `cmdk`+ normalização manual; adicionar `fuse.js` só se `cmdk` sozinho não chegar.
- Sem migrações de base de dados — tudo assenta em tabelas existentes.
- Cada área é entregue de forma incremental; podemos validar a Área 1 antes de avançar para as seguintes se preferires.

---

## Ordem de Execução Sugerida

1. **Perfil Treinador — Transferências** (menor risco, valor imediato).
2. **Pesquisa Global** (impacto UX transversal).
3. **Dashboard** (maior scope, beneficia da nova pesquisa).

Confirma se avanço nesta ordem, ou se preferes outra prioridade / entregar apenas uma das áreas primeiro.
