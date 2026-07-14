import type { ScoreDefinition } from "../../types";
import { defenderScores } from "./defenders";
import { forwardScores } from "./forwards";
import { goalkeeperScores } from "./goalkeepers";
import { midfielderScores } from "./midfielders";
import { specialistPlayerScores } from "./specialists";

export const playerScoreDefinitions: ScoreDefinition[] = [
  ...goalkeeperScores,
  ...defenderScores,
  ...midfielderScores,
  ...forwardScores,
  ...specialistPlayerScores,
];
