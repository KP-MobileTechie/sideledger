import { describe, it, expect } from "vitest";
import { transactionInputSchema, settingsInputSchema } from "@/lib/validate";

describe("transactionInputSchema", () => {
  const valid = { type: "income", amount: "100.50", date: "2026-06-10", category: "Client Work", source: "Acme", note: "" };
  it("accepts valid input and converts amount to cents", () => {
    const r = transactionInputSchema.parse(valid);
    expect(r.amountCents).toBe(10050);
  });
  it("rejects category that does not match type", () => {
    expect(() => transactionInputSchema.parse({ ...valid, category: "Travel" })).toThrow();
  });
  it("rejects bad amount", () => {
    expect(() => transactionInputSchema.parse({ ...valid, amount: "-5" })).toThrow();
  });
});

describe("settingsInputSchema", () => {
  it("accepts a percent 0-100 and currency code", () => {
    expect(settingsInputSchema.parse({ taxSetAsidePercent: 30, currency: "USD" }).taxSetAsidePercent).toBe(30);
  });
  it("rejects out-of-range percent", () => {
    expect(() => settingsInputSchema.parse({ taxSetAsidePercent: 150, currency: "USD" })).toThrow();
  });
});
