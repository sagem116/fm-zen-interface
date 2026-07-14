import type { PresetFn } from "../preset-utils";

/**
 * Explain preset — editorial decoding layer.
 * Focus: why the score exists, why the rank moved, and what the number means.
 */
export const explainPreset: PresetFn = ({ ctx, level, push }) => {
  push(
    "opening",
    [
      "Explain Mode abre a caixa negra editorial: o foco já não é o resultado bruto, mas a razão pela qual ele aparece.",
      "Este modo existe para mostrar como o score se transforma em posição, tendência e contexto.",
    ],
    "opening",
  );

  push(
    "positioning",
    [
      "A posição serve apenas como ponto de partida; o verdadeiro valor está no que a sustenta.",
      "A classificação só faz sentido quando lida ao lado da evolução e dos principais fatores de contribuição.",
    ],
    "positioning",
  );

  if (level === "mini") return;

  push(
    "drivers",
    [
      "Os fatores mais relevantes explicam a nota final melhor do que qualquer descrição isolada.",
      "O breakdown mostra onde o modelo encontrou o núcleo do desempenho.",
    ],
    "drivers",
  );

  push(
    "context",
    [
      "A leitura comparativa é essencial para perceber se o valor é dominante, apenas competitivo ou ainda em consolidação.",
      "O contexto histórico evita conclusões apressadas sobre um único número.",
    ],
    "context",
  );

  if (level === "editorial") {
    push(
      "closing",
      [
        "Explain Mode fecha sempre com a mesma regra: o score é um sinal, a interpretação é a decisão editorial.",
      ],
      "closing",
    );
  }

  void ctx;
};
