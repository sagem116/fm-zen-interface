// Gera título + descrição a partir de um template determinístico.
import { TEMPLATES, fill, type TemplateKey } from "./templates";

export function narrate(
  key: TemplateKey,
  vars: Record<string, string | number | null | undefined>,
): { title: string; description: string } {
  const t = TEMPLATES[key];
  return {
    title: fill(t.title, vars),
    description: fill(t.description, vars),
  };
}
