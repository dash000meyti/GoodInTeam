import { describe, expect, it } from "vitest";
import {
  GUIDE_EVENT,
  GUIDE_GREETED_KEY,
  GUIDE_IDLE_KEY,
  GUIDE_MOD_PREFIX,
  GUIDE_PREF_EVENT,
  GUIDE_PREF_KEY,
  GUIDE_SEEN_KEY,
  GUIDE_TEST_KEY,
  GUIDE_TIPS_KEY,
  guideAttrs,
  readGuidePref,
  readSessionFlag,
  spotAttrs,
} from "./guide-events";

describe("guide contract", () => {
  it("keeps the frozen storage keys and events", () => {
    expect([
      GUIDE_PREF_KEY,
      GUIDE_TIPS_KEY,
      GUIDE_TEST_KEY,
      GUIDE_SEEN_KEY,
      GUIDE_GREETED_KEY,
      GUIDE_IDLE_KEY,
      GUIDE_MOD_PREFIX,
      GUIDE_EVENT,
      GUIDE_PREF_EVENT,
    ]).toEqual([
      "gt-guide",
      "gt-guide-tips",
      "gt-guide-test",
      "gt-guide-seen",
      "gt-guide-greeted",
      "gt-guide-idle",
      "gt-guide-mod:",
      "gt:guide",
      "gt:guide-pref",
    ]);
  });

  it("builds the narration attributes", () => {
    expect(guideAttrs("home_work", "Real projects.")).toEqual({
      "data-guide": "home_work",
      "data-guide-say": "Real projects.",
    });
    expect(spotAttrs("brand-studio", "Design.")).toEqual({
      "data-guide-spot": "brand-studio",
      "data-guide-say": "Design.",
    });
  });

  it("storage readers survive a missing storage (node)", () => {
    expect(readGuidePref()).toBe(null);
    expect(readSessionFlag(GUIDE_GREETED_KEY)).toBe(false);
  });
});
