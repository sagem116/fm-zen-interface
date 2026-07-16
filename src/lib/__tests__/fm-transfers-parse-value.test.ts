import { describe, it, expect } from "vitest";
import { parseValue } from "../fm-transfers";

describe("parseValue — Football Manager money formats", () => {
  const cases: Array<[unknown, number]> = [
    // Plain suffixes
    ["15M", 15_000_000],
    ["15 M", 15_000_000],
    ["15.5M", 15_500_000],
    ["2.5M", 2_500_000],
    ["2.5 M", 2_500_000],
    ["850K", 850_000],
    ["850 K", 850_000],
    ["850.5K", 850_500],
    ["1.5B", 1_500_000_000],

    // Currency prefixes
    ["€15M", 15_000_000],
    ["£15M", 15_000_000],
    ["$15M", 15_000_000],
    ["€850K", 850_000],

    // Full-word suffixes (English + Portuguese)
    ["15 Million", 15_000_000],
    ["15 million", 15_000_000],
    ["1 Billion", 1_000_000_000],
    ["500 mil", 500_000],
    ["1 milhão", 1_000_000],
    ["2 milhões", 2_000_000],

    // Absolute integers stay absolute
    ["15000000", 15_000_000],
    ["850000", 850_000],
    ["750000", 750_000],
    [15_000_000, 15_000_000],
    [750_000, 750_000],

    // Portuguese/English separators
    ["1.500.000", 1_500_000],
    ["1,500,000", 1_500_000],
    ["2,5M", 2_500_000],
    ["1,5 M", 1_500_000],
    ["15.000", 15_000],

    // No-value markers
    ["Free", 0],
    ["free", 0],
    ["Livre", 0],
    ["Loan", 0],
    ["Empréstimo", 0],
    ["Undisclosed", 0],
    ["Não divulgado", 0],
    ["N/A", 0],
    ["NA", 0],
    ["-", 0],
    ["—", 0],
    ["0", 0],
    ["", 0],
    [null, 0],
    [undefined, 0],
  ];

  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${expected}`, () => {
      expect(parseValue(input)).toBe(expected);
    });
  }

  it("regression: M is millions, never thousands", () => {
    expect(parseValue("15M")).toBe(15_000_000);
    expect(parseValue("15M")).not.toBe(15_000);
  });
  it("regression: K is thousands, never millions", () => {
    expect(parseValue("850K")).toBe(850_000);
    expect(parseValue("850K")).not.toBe(850_000_000);
  });
  it("regression: 2.5M is 2.5 million, never 2500 million", () => {
    expect(parseValue("2.5M")).toBe(2_500_000);
    expect(parseValue("2.5M")).not.toBe(2_500_000_000);
  });
  it("regression: 750000 (raw integer) stays absolute", () => {
    expect(parseValue("750000")).toBe(750_000);
    expect(parseValue(750_000)).toBe(750_000);
  });
});
