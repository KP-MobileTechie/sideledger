export const CATEGORIES = {
  income: ["Client Work", "Product Sales", "Tips", "Other"],
  expense: ["Software/Tools", "Equipment", "Fees", "Marketing", "Travel", "Supplies", "Other"],
} as const;

export type TxType = keyof typeof CATEGORIES;

export function isValidCategory(type: TxType, category: string): boolean {
  return (CATEGORIES[type] as readonly string[]).includes(category);
}
