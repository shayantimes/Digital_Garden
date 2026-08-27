const legacyNotesCategories = new Set(["Lab", "Learning", "Thinking"]);

export function normalizeGardenCategory(category: string) {
  const label = category.trim();
  return !label || legacyNotesCategories.has(label) ? "Notes" : label;
}

export function isGardenCategory(category: string, expected: string) {
  return normalizeGardenCategory(category) === normalizeGardenCategory(expected);
}
