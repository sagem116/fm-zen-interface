import { describe, it, expect } from "vitest";
import {
  buildClubProfile,
  buildPlayerProfile,
  buildCoachProfile,
  buildCompetitionProfile,
  buildCountryProfile,
  createEngine,
  defaultConfig,
  getIntelligenceEngine,
  type Club,
  type Player,
  type EngineConfig,
} from "../";

const clubs: Club[] = [
  { id: "c1", name: "Old Legends", avgAge: 31, avgCA: 150, avgCP: 155 },
  { id: "c2", name: "Youth Academy", avgAge: 20, avgCA: 130, avgCP: 175 },
  { id: "c3", name: "Balanced FC", avgAge: 25, avgCA: 145, avgCP: 160 },
  { id: "c4", name: "Talent Powerhouse", avgAge: 24, avgCA: 170, avgCP: 180 },
];

describe("Intelligence Engine — clubs", () => {
  it("assigns 'Clube Jovem' to the youngest club", () => {
    const target = clubs[1];
    const result = buildClubProfile({ entity: target, cohort: clubs });
    const young = result.traits.find((t) => t.id === "trait.club.young");
    expect(young).toBeDefined();
    expect(young!.score).toBeGreaterThanOrEqual(55);
  });

  it("does NOT assign 'Clube Jovem' to the oldest club", () => {
    const target = clubs[0];
    const result = buildClubProfile({ entity: target, cohort: clubs });
    const young = result.traits.find((t) => t.id === "trait.club.young");
    expect(young).toBeUndefined();
  });

  it("assigns 'Plantel Talentoso' to the most talented club", () => {
    const target = clubs[3];
    const result = buildClubProfile({ entity: target, cohort: clubs });
    const talented = result.traits.find((t) => t.id === "trait.club.talented");
    expect(talented).toBeDefined();
    expect(talented!.score).toBeGreaterThanOrEqual(55);
  });

  it("is deterministic — same inputs produce same output", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const a = buildClubProfile({ entity: clubs[1], cohort: clubs, now });
    const b = buildClubProfile({ entity: clubs[1], cohort: clubs, now });
    expect(a).toEqual(b);
  });

  it("stamps config id/name/version on result", () => {
    const result = buildClubProfile({ entity: clubs[0], cohort: clubs });
    expect(result.configId).toBe(defaultConfig.id);
    expect(result.configName).toBe(defaultConfig.name);
    expect(result.configVersion).toBe(defaultConfig.version);
  });

  it("produces full evidence for each trait", () => {
    const result = buildClubProfile({ entity: clubs[1], cohort: clubs });
    for (const trait of result.traits) {
      expect(trait.evidence.length).toBeGreaterThan(0);
      for (const ev of trait.evidence) {
        expect(ev.metricId).toBeTruthy();
        expect(typeof ev.weight).toBe("number");
        expect(typeof ev.contribution).toBe("number");
      }
    }
  });
});

describe("Intelligence Engine — players/coaches/comps/countries", () => {
  it("assigns Wonderkid to young + high CA player", () => {
    const players: Player[] = [
      { id: "p1", name: "Kid Star", age: 18, ca: 160, goals: 20, games: 30 },
      { id: "p2", name: "Veteran", age: 34, ca: 150, goals: 5, games: 25 },
      { id: "p3", name: "Average", age: 26, ca: 120, goals: 10, games: 30 },
    ];
    const result = buildPlayerProfile({ entity: players[0], cohort: players });
    const wk = result.traits.find((t) => t.id === "trait.player.wonderkid");
    expect(wk).toBeDefined();
  });

  it("builds coach profile without crashing on missing metrics", () => {
    const coaches = [
      { id: "co1", name: "A", titles: 10, seasons: 15 },
      { id: "co2", name: "B", titles: 1, seasons: 5 },
    ];
    const result = buildCoachProfile({ entity: coaches[0], cohort: coaches });
    expect(result.entityId).toBe("co1");
    expect(result.traits.length).toBeGreaterThan(0);
  });

  it("builds competition profile", () => {
    const comps = [
      { id: "cm1", name: "Elite League", avgReputation: 90, goalsPerGame: 3.2 },
      { id: "cm2", name: "Regional", avgReputation: 40, goalsPerGame: 2.1 },
    ];
    const result = buildCompetitionProfile({ entity: comps[0], cohort: comps });
    expect(result.traits.find((t) => t.id === "trait.comp.prestigious")).toBeDefined();
  });

  it("builds country profile", () => {
    const countries = [
      { id: "co1", name: "Big Nation", playersAbroad: 300, internationalPoints: 2500 },
      { id: "co2", name: "Small Nation", playersAbroad: 10, internationalPoints: 200 },
    ];
    const result = buildCountryProfile({ entity: countries[0], cohort: countries });
    expect(result.traits.find((t) => t.id === "trait.country.powerhouse")).toBeDefined();
  });
});

describe("Intelligence Engine — extensibility", () => {
  it("accepts a custom EngineConfig without touching engine code", () => {
    const custom: EngineConfig = {
      id: "intelligence.custom",
      name: "Custom",
      version: "9.9.9",
      metrics: [
        {
          id: "custom.metric",
          kind: "club",
          label: "Custom",
          compute: (e) => (typeof e.foo === "number" ? e.foo : null),
        },
      ],
      rules: [
        {
          id: "custom.rule",
          kind: "club",
          aggregate: "weightedMean",
          inputs: [
            {
              metricId: "custom.metric",
              weight: 1,
              direction: "higher",
              normalize: { kind: "identity" },
            },
          ],
        },
      ],
      traits: [
        {
          id: "custom.trait",
          kind: "club",
          group: "x",
          label: "Custom Trait",
          polarity: "positive",
          ruleId: "custom.rule",
          minScore: 30,
        },
      ],
      profiles: [
        { id: "custom.profile", kind: "club", label: "Custom Profile", traitIds: ["custom.trait"] },
      ],
    };
    const engine = createEngine(custom);
    const result = engine.buildProfile({
      kind: "club",
      entity: { id: "x", name: "X", foo: 0.9 },
      cohort: [{ id: "x", name: "X", foo: 0.9 }],
    });
    expect(result.configVersion).toBe("9.9.9");
    expect(result.traits[0]?.id).toBe("custom.trait");
  });

  it("listMetrics/listTraits/listProfiles filter by kind", () => {
    const engine = getIntelligenceEngine();
    expect(engine.listMetrics("club").every((m) => m.kind === "club")).toBe(true);
    expect(engine.listTraits("player").every((t) => t.kind === "player")).toBe(true);
    expect(engine.listProfiles("coach").every((p) => p.kind === "coach")).toBe(true);
  });
});
