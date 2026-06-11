"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createTransaction as dbCreateTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  updateSettings as dbUpdateSettings,
} from "@/lib/db/queries";
import { transactionInputSchema, settingsInputSchema } from "@/lib/validate";

export type ActionResult = { ok: true } | { ok: false; error: string };

const DASHBOARD_PATH = "/dashboard";

function isUnauthenticated(err: unknown): boolean {
  return err instanceof Error && err.message === "UNAUTHENTICATED";
}

export async function addTransaction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const raw = {
      type: String(formData.get("type") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      date: String(formData.get("date") ?? ""),
      category: String(formData.get("category") ?? ""),
      source: String(formData.get("source") ?? ""),
      note: String(formData.get("note") ?? ""),
    };

    const parsed = transactionInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    await dbCreateTransaction(db, userId, parsed.data);
    revalidatePath(DASHBOARD_PATH);
    return { ok: true };
  } catch (err) {
    if (isUnauthenticated(err)) return { ok: false, error: "Not signed in" };
    throw err;
  }
}

export async function editTransaction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const id = Number(formData.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false, error: "Invalid id" };
    }

    const raw = {
      type: String(formData.get("type") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      date: String(formData.get("date") ?? ""),
      category: String(formData.get("category") ?? ""),
      source: String(formData.get("source") ?? ""),
      note: String(formData.get("note") ?? ""),
    };

    const parsed = transactionInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    const { type, amountCents, date, category, source, note } = parsed.data;
    const updated = await dbUpdateTransaction(db, userId, id, {
      type,
      amountCents,
      date,
      category,
      source,
      note,
    });

    if (updated === null) return { ok: false, error: "Not found" };

    revalidatePath(DASHBOARD_PATH);
    return { ok: true };
  } catch (err) {
    if (isUnauthenticated(err)) return { ok: false, error: "Not signed in" };
    throw err;
  }
}

export async function deleteTransactionAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const id = Number(formData.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false, error: "Invalid id" };
    }

    const ok = await dbDeleteTransaction(db, userId, id);
    if (!ok) return { ok: false, error: "Not found" };

    revalidatePath(DASHBOARD_PATH);
    return { ok: true };
  } catch (err) {
    if (isUnauthenticated(err)) return { ok: false, error: "Not signed in" };
    throw err;
  }
}

export async function updateSettingsAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();

    const raw = {
      taxSetAsidePercent: Number(formData.get("taxSetAsidePercent")),
      currency: String(formData.get("currency") ?? "USD"),
    };

    const parsed = settingsInputSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }

    await dbUpdateSettings(db, userId, parsed.data);
    revalidatePath(DASHBOARD_PATH);
    return { ok: true };
  } catch (err) {
    if (isUnauthenticated(err)) return { ok: false, error: "Not signed in" };
    throw err;
  }
}
