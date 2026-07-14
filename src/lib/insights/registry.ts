// Registo central de detectores. Adicionar um novo insight = adicionar um
// detector aqui. Nada mais na app precisa mudar.

import type { Detector } from "./types";
import { rankingsDetector } from "./detectors/rankings";
import { evolutionDetector } from "./detectors/evolution";
import { recordsDetector } from "./detectors/records";
import { competitionsDetector } from "./detectors/competitions";
import { countriesDetector } from "./detectors/countries";
import { clubsDetector } from "./detectors/clubs";
import { playersDetector } from "./detectors/players";
import { coachesDetector } from "./detectors/coaches";
import { trendsDetector } from "./detectors/trends";

export const DETECTORS: Detector[] = [
  rankingsDetector,
  evolutionDetector,
  recordsDetector,
  competitionsDetector,
  countriesDetector,
  clubsDetector,
  playersDetector,
  coachesDetector,
  trendsDetector,
];

export function getDetector(id: string): Detector | undefined {
  return DETECTORS.find((d) => d.id === id);
}
