import { coachScoreDefinitions } from "./coaches";
import { clubScoreDefinitions } from "./clubs";
import { competitionScoreDefinitions } from "./competitions";
import { countryScoreDefinitions } from "./countries";
import { playerScoreDefinitions } from "./players";
import type { ScoreProfile } from "../types";
import type { ScoreDefinition } from "../types";

export const defaultScoreDefinitions: ScoreDefinition[] = [
  ...playerScoreDefinitions,
  ...coachScoreDefinitions,
  ...clubScoreDefinitions,
  ...competitionScoreDefinitions,
  ...countryScoreDefinitions,
];

export const defaultScoreProfiles: ScoreProfile[] = [];
