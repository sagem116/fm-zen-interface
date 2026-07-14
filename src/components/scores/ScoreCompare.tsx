import type { ScoreEvaluationEntry } from "./types";
import { ScoreComparison } from "./ScoreComparison";

interface Props {
  options: string[];
  leftName: string;
  rightName: string;
  onLeftName: (name: string) => void;
  onRightName: (name: string) => void;
  left: ScoreEvaluationEntry | null;
  right: ScoreEvaluationEntry | null;
}

export function ScoreCompare(props: Props) {
  return <ScoreComparison {...props} />;
}
