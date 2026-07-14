# Plano — Perfis Rápidos + Histórico de Imports

Dois objetivos independentes, sem alterar arquitetura, Design System, Engines (Imports/Rankings/Scores/Entity) nem fórmulas.

---

## Objetivo 1 — Perfis rápidos e estáveis

### Auditoria (pontos já identificados)

1. **Crash ativo** em `src/routes/jogadores.$name.tsx`:
   - Guard incorreto na linha 60: `if (!data && !fallbackProfile)` deveria ser `if (!profile && !fallbackProfile)`.
   - Quando `data` existe mas o jogador não é encontrado, `usedProfile` fica `null` e `usedProfile.history` rebenta.
   - Confirmado nos logs de runtime: `TypeError: Cannot read properties of null (reading 'history')` em `PlayerProfilePage`.

2. **`useRankings()`** é o fetch mais pesado e é chamado por **todas** as páginas de perfil (jogadores, treinadores, clubes, competições, países). Carrega o dataset inteiro no primeiro acesso.
   - Já é cacheado via TanStack Query, portanto reaproveita entre perfis.
   - Problema: no **primeiro** perfil aberto após reload, todo o processamento (ranks, evolução, standings, coach assignments, etc.) corre antes do render inicial.

3. **Cálculos pesados feitos em render** em cada perfil:
   - `jogadores.$name.tsx`: `rankForYear` percorre `data.data.players` **por cada época** dentro de um `useMemo` que depende de `data`, `profile`, `fallbackProfile`, `universe` — dispara sempre que `universe` muda de referência.
   - `narrativeCtx` reconstrói um `Map` sobre todos os jogadores para calcular o rank global.
   - Padrões semelhantes em `treinadores.$name.tsx`, `clubes.$name.tsx`, `competicoes.$name.tsx`, `paises.$name.tsx`.

4. **Componentes secundários carregados de forma síncrona** dentro do `ProfileShell` (registry de tabs). Todas as tabs importam os módulos à cabeça mesmo quando o utilizador só vê a tab default.

### Alterações

**Correções de robustez (prioridade 1 — resolve o crash)**

- `jogadores.$name.tsx`: corrigir o guard para `if (!profile && !fallbackProfile) return null;`.
- Auditar guards equivalentes em `treinadores.$name.tsx`, `clubes.$name.tsx`, `competicoes.$name.tsx`, `paises.$name.tsx`. Todos devem:
  - Verificar `profile`/`fallbackProfile` antes de aceder a `.history`, `.totals`, etc.
  - Substituir acessos crus por optional chaining + defaults (`?? []`, `?? {}`).
  - Devolver `"Sem dados disponíveis"` em vez de rebentar.

**Performance (prioridade 2 — sem tocar em engines)**

- Extrair "ranking por época" para um `useMemo` que depende apenas de `data` (fica cacheado entre trocas de perfil). Reutilizado por todos os perfis via um pequeno seletor em `src/lib/useRankings.ts` (memo com `WeakMap` sobre o `data`).
- Reduzir dependências dos `useMemo` em perfis: dropar `universe` das dependências dos cálculos que não o usam; usar `universe.getByName`/`getByIdu` fora do memo pesado.
- Split de tabs secundárias em `React.lazy` no `registry` de tabs de perfil (a tab default fica eager, o resto lazy) — mantém o Design System intacto.

**Robustez transversal**

- Wrapper `<ProfileErrorBoundary>` à volta de `ProfileShell` que apanha crashes e mostra `"Sem dados disponíveis"` em vez do error component genérico do router. Cada tab valida `ctx?.profile?.history ?? []`.

### Não-alvos (o que **não** vai ser mexido)

- `useRankings`, `buildPlayerProfile`, `buildCoachProfile`, etc. (engines).
- Estrutura de tabelas ou tipos.
- Estilos, tokens CSS, componentes de UI do shell.
- Fórmulas de Scores, Rankings, Editorial.

---

## Objetivo 2 — Histórico de Imports

### Auditoria

- `imports` é gravado por vários writers (`fm-player-profiles-writer.ts`, etc.) com `warnings: { messages: [...], records: N }` — estrutura antiga.
- Writers mais recentes gravam `warnings` como **array** direto (`generateImportReport`) ou como objeto rico com `statistics`, `resolvedColumns`, `trace`.
- A UI de detalhes lê apenas um dos formatos → contadores a 0 e avisos sem detalhe quando o formato não bate.

### Alterações (só na leitura/apresentação)

- Adicionar um **normalizador** `normalizeImportReport(raw)` em `src/lib/imports/report.ts` que aceita todas as variantes (`warnings: []`, `warnings: { messages }`, `warnings: { messages, records }`, `warnings: ImportReport`) e devolve sempre a mesma forma:
  ```
  {
    stats: { players, coaches, clubs, competitions, countries, created, updated, skipped, errors, warnings, durationMs },
    warnings: Array<{ type, message, source, severity }>,
    raw
  }
  ```
- `ImportReportViewer.tsx` passa a usar o normalizador. Se um campo não existir, mostra "—", nunca 0 fantasma.
- Detalhe dos avisos: expandir cada linha para mostrar `type`, `message`, `source`, `severity` (fallbacks para variantes antigas).
- Contador de avisos deixa de aparecer sem lista: se `warnings.length === 0`, não mostrar chip; se >0, sempre expansível.

### Não-alvos

- Nenhuma alteração aos writers, ao pipeline de import, ao formato gravado em BD, ou aos engines de Rankings/Scores.
- Compatibilidade total com registos existentes (o normalizador cobre todos os formatos históricos).

---

## Validação

- Playwright: abrir 5 perfis (jogador conhecido, jogador inexistente, treinador, clube, país) — todos abrem sem crash; jogador inexistente mostra "Sem dados disponíveis".
- Playwright: abrir `/importar`, expandir 3 imports (um com warnings, um só ok, um antigo) — todos apresentam contadores corretos e lista de avisos com detalhe.
- Confirmar que Rankings, Scores e Dashboard continuam a funcionar.

## Ficheiros que serão tocados (estimativa)

- `src/routes/jogadores.$name.tsx`, `treinadores.$name.tsx`, `clubes.$name.tsx`, `competicoes.$name.tsx`, `paises.$name.tsx` — guards + robustez.
- `src/components/profile/ProfileShell.tsx` + `registry.ts` — error boundary + lazy tabs.
- `src/lib/useRankings.ts` — seletor memoizado de rank-por-época (opcional).
- `src/lib/imports/report.ts` — adiciona `normalizeImportReport`.
- `src/components/ImportReportViewer.tsx` — usa o normalizador + detalhe de avisos.

Aprova para eu executar?
