import { describe, it, expect } from "vitest";
import { CATEGORIES, isValidCategory } from "@/lib/categories";

describe("categories", () => {
  it("exposes fixed income and expense lists", () => {
    expect(CATEGORIES.income).toContain("Client Work");
    expect(CATEGORIES.expense).toContain("Software/Tools");
  });
  it("validates category against type", () => {
    expect(isValidCategory("income", "Client Work")).toBe(true);
    expect(isValidCategory("income", "Travel")).toBe(false);
    expect(isValidCategory("expense", "Travel")).toBe(true);
  });
});
