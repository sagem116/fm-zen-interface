# Score Studio v2 — Wizard, Categorias e Formato Canónico

Divido em duas fases independentes. Podes aprovar as duas ou só uma.

---

## Fase A — Formato Canónico (Human / AI Friendly)

Objetivo: permitir partilha e criação de Scores por humanos e por IA, sem tocar no Score Engine. Toda a lógica vive numa nova camada `src/lib/scores/canonical/`.

### A1. Definir o formato

Novo módulo `src/lib/scores/canonical/types.ts`:

```ts
CanonicalScore {
  name, entity: "player"|"club"|"coach"|"competition"|"country",
  category?, description?,
  attributes?: { name, weight }[],
  metrics?:    { name, weight }[],
  contexts?:   { name, weight }[],
  modifiers?:  { name, weight }[],
}
```

Weights em qualquer escala (são normalizados na conversão).

### A2. Camada de normalização (resolver)

`src/lib/scores/canonical/resolver.ts` — reaproveita `normalizeDictionaryToken` de `src/lib/dictionary/resolver.ts` e os índices de `src/lib/dictionary/registry.ts`. Para cada nome:

- match exato por alias → resolvido
- fuzzy (Levenshtein/Jaro) com threshold → sugestão
- múltiplos matches → ambíguo
- nenhum → não encontrado

Devolve `ResolutionReport` com listas `resolved / ambiguous / unknown` + sugestão top-1.

### A3. Conversores

`src/lib/scores/canonical/toInternal.ts` — Canónico → `ScoreDefinition`
`src/lib/scores/canonical/fromInternal.ts` — `ScoreDefinition` → Canónico (usa `dictionaryEntry.name` como nome legível)

Ambos com testes em `src/lib/scores/canonical/__tests__/`.

### A4. UI — Import/Export no Score Studio

Adicionar em `src/components/scores-studio/`:

- `CanonicalImportDialog.tsx`
  - textarea JSON + upload de ficheiro
  - preview com badges: ✓ reconhecido · ⚠ ambíguo · ❌ não encontrado
  - para cada ambíguo/desconhecido, dropdown com top-3 sugestões
  - botão "Importar" fica ativo só quando não há erros
- `CanonicalExportDialog.tsx`
  - dois botões: **Exportar Interno** (compat) / **Exportar Human/AI** (recomendado)
  - copy-to-clipboard + download `.json`

Integrar via botões no header do `ScoreStudio` existente.

### A5. Documentação in-app

Nova aba/painel "Formato Canónico" dentro do Score Studio com:
- explicação curta
- 5 exemplos prontos (jogador, clube, treinador, competição, país) em `src/lib/scores/canonical/examples/`
- botão "Copiar exemplo"

---

## Fase B — Wizard + Categorias + Preview

Objetivo: reduzir a barreira de entrada mantendo o editor avançado atual como "modo pro".

### B1. Wizard

Novo componente `src/components/scores-studio/wizard/ScoreWizard.tsx` com passos:

1. **Entidade** — jogador/clube/treinador/competição/país
2. **Template** — lista de presets oficiais (usa `defaultScoreDefinitions` como base) ou "começar do zero"
3. **Categoria & nome** — Ataque, Defesa, Financeiro, Reputação, Histórico…
4. **Atributos** — pesquisa inteligente com agrupamento por subcategoria (`DictionarySubcategory`); toggle + slider de peso
5. **Métricas** — igual, agrupadas por subcategoria (passing, shooting, defending, …)
6. **Preview** — top-20 do ranking calculado em tempo real + histograma de distribuição
7. **Guardar** — cria `ScoreDefinition` e abre no editor avançado

Estado local do wizard; só commita ao guardar.

### B2. Pesquisa inteligente

`src/components/scores-studio/wizard/SmartPicker.tsx`:
- input com fuzzy search sobre `name / aliases / abbreviation`
- filtros por `category` e `subcategory`
- badges visuais por categoria

### B3. Preview em tempo real

Reaproveita `evaluateScore` do Engine + a amostra atual carregada. Debounce 200ms.
Componentes: `WizardRankingPreview.tsx`, `WizardDistributionChart.tsx` (recharts, já no projeto).

### B4. Entry point

Botão **"Criar Score (Wizard)"** ao lado do atual "Novo" no header do `ScoreStudio`. O editor avançado atual fica intacto — o wizard é uma porta alternativa.

---

## Compatibilidade / não-mexer

- Score Engine, fórmulas, rankings, resultados, DB e estrutura interna: **inalterados**
- `ScoreDefinition`, `defaultScoreDefinitions`, `useRecruitmentScoreDefinitions`: inalterados
- Toda a nova lógica isolada em `src/lib/scores/canonical/` e `src/components/scores-studio/wizard/`

---

## Sugestão de ordem

Começaria por **Fase A** (menor superfície, valor imediato para partilha e prompts de IA) e depois **Fase B**. Ambas em turnos separados para manteres o preview verificável.

**Aprovas as duas fases, só a A, ou só a B?**
