import { Input } from "@/components/ui/input";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function ScoreSearch({ value, onChange }: Props) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Pesquisar score, categoria, tag..."
    />
  );
}
