import { describe, it, expect } from "vitest";
import { parseToCents, formatCents } from "@/lib/money";

describe("parseToCents", () => {
  it("parses dollar strings to integer cents", () => {
    expect(parseToCents("12.34")).toBe(1234);
    expect(parseToCents("100")).toBe(10000);
    expect(parseToCents("0.05")).toBe(5);
    expect(parseToCents("1,234.50")).toBe(123450);
  });
  it("rejects invalid or negative input", () => {
    expect(() => parseToCents("abc")).toThrow();
    expect(() => parseToCents("-5")).toThrow();
    expect(() => parseToCents("")).toThrow();
  });
});

describe("formatCents", () => {
  it("formats cents as currency", () => {
    expect(formatCents(1234, "USD")).toBe("$12.34");
    expect(formatCents(0, "USD")).toBe("$0.00");
  });
});
