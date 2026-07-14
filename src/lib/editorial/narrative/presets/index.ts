import type { NarrativePreset } from "../../types";
import type { PresetFn } from "../preset-utils";
import { rankingsPreset } from "./rankings";
import { playerPreset } from "./player";
import { clubPreset } from "./club";
import { competitionPreset } from "./competition";
import { countryPreset } from "./country";
import { coachPreset } from "./coach";
import { hallOfFamePreset } from "./hallOfFame";
import { careerCenterPreset } from "./careerCenter";
import { explainPreset } from "./explain";

export const PRESETS: Record<NarrativePreset, PresetFn> = {
  rankings: rankingsPreset,
  player: playerPreset,
  club: clubPreset,
  competition: competitionPreset,
  country: countryPreset,
  coach: coachPreset,
  hallOfFame: hallOfFamePreset,
  careerCenter: careerCenterPreset,
  explain: explainPreset,
};

export {
  rankingsPreset,
  playerPreset,
  clubPreset,
  competitionPreset,
  countryPreset,
  coachPreset,
  hallOfFamePreset,
  careerCenterPreset,
  explainPreset,
};
