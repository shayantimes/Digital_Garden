import { describe, expect, it } from "vitest";
import { normalizeShelfCategory, normalizeShelfStatus, shelfStatusTone } from "../app/lib/shelf";

describe("shelf categories and progress", () => {
  it("provides a safe Books fallback for older shelf entries", () => {
    expect(normalizeShelfCategory(undefined)).toBe("Books");
    expect(normalizeShelfStatus("Books", undefined)).toBe("To Read");
  });

  it("uses progress labels that match each media category", () => {
    expect(normalizeShelfStatus("Movies", "Watching")).toBe("Watching");
    expect(normalizeShelfStatus("Games", "Reading")).toBe("To Play");
    expect(normalizeShelfStatus("Music", "Played")).toBe("");
  });

  it("maps progress labels to their visual tones", () => {
    expect(shelfStatusTone("Read")).toBe("complete");
    expect(shelfStatusTone("Playing")).toBe("active");
    expect(shelfStatusTone("Watchlist")).toBe("planned");
  });
});
