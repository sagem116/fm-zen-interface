import { createFileRoute } from "@tanstack/react-router";
import { CareerPage } from "@/components/career/CareerPage";

export const Route = createFileRoute("/minha-carreira")({
  head: () => ({
    meta: [
      { title: "Minha Carreira — FM World Rankings" },
      {
        name: "description",
        content:
          "Career Center: painel completo da carreira do treinador — épocas, DNA, memórias, troféus, anuários.",
      },
      { property: "og:title", content: "Minha Carreira — FM World Rankings" },
      {
        property: "og:description",
        content: "O centro da tua carreira: épocas, DNA, troféus, memórias e recordes.",
      },
    ],
  }),
  component: CareerPage,
});
