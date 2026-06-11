import { z } from "zod";
import { parseToCents } from "@/lib/money";
import { isValidCategory, type TxType } from "@/lib/categories";

export const transactionInputSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string().min(1),
    source: z.string().max(120).optional().default(""),
    note: z.string().max(500).optional().default(""),
  })
  .transform((v, ctx) => {
    let amountCents: number;
    try {
      amountCents = parseToCents(v.amount);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid amount" });
      return z.NEVER;
    }
    if (!isValidCategory(v.type as TxType, v.category)) {
      ctx.addIssue({ code: "custom", message: "Category does not match type" });
      return z.NEVER;
    }
    return { type: v.type, amountCents, date: v.date, category: v.category, source: v.source, note: v.note };
  });

export const settingsInputSchema = z.object({
  taxSetAsidePercent: z.number().int().min(0).max(100),
  currency: z.string().length(3),
});
