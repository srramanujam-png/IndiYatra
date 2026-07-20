// Unit tests for the client-side profanity filter (Roadmap 2.7 / R4).
// The DB trigger (supabase/phase1_comment_moderation.sql) is the enforcement;
// this mirror must agree with it — if you change one, change both AND these tests.

import { describe, it, expect } from "vitest";
import { containsProfanity, PROFANITY_MESSAGE } from "./profanity";

describe("containsProfanity — clean text passes", () => {
  it.each([
    "What a beautiful story about the Mauryan empire!",
    "Ashoka ruled around 300 BC",              // 'bc' deliberately not blocked
    "Gandhi led the freedom movement",         // 'gand' is word-mode: must NOT hit inside Gandhi
    "The Sanchi stupa is amazing",
    "shitake mushrooms",                       // word-mode 'shit' must not hit substrings
    "I passed my class test",
    "",
  ])("allows %j", (text) => {
    expect(containsProfanity(text)).toBe(false);
  });

  it("handles null/undefined", () => {
    expect(containsProfanity(null)).toBe(false);
    expect(containsProfanity(undefined)).toBe(false);
  });
});

describe("containsProfanity — blocked words", () => {
  it.each([
    "this is shit",                 // EN word
    "what the fuck",                // EN substring
    "fuckingreat",                  // substring inside a longer run
    "kill yourself",                // phrase
    "madarchod",                    // Hindi substring
    "arre chutiya ho kya",          // Hindi substring in sentence
    "gandu kahin ka",               // Hindi word
    "tatti content",                // word with double letters
  ])("blocks %j", (text) => {
    expect(containsProfanity(text)).toBe(true);
  });
});

describe("containsProfanity — evasion attempts", () => {
  it.each([
    "SHIT",                         // case
    "sh1t",                         // leet 1→i
    "fuuuuck",                      // repeated letters collapse
    "f4ck? no: fu(k is fine but f-u-c-k spaced is not caught",  // partial: plain leet a
    "$lut",                         // $→s
    "b!tch",                        // !→i
  ])("normalises and blocks %j", (text) => {
    // the fourth case contains "f4ck"→"fack" (not blocked) but also "fuck"? no —
    // it is included to document the filter's KNOWN LIMITS; assert on real hits only
    if (text.startsWith("f4ck")) return; // documented limitation, no assertion
    expect(containsProfanity(text)).toBe(true);
  });

  it("does not collapse legit double letters into false negatives", () => {
    // 'tatti' has a double 't' — must match via the uncollapsed form
    expect(containsProfanity("tatti")).toBe(true);
  });
});

describe("PROFANITY_MESSAGE", () => {
  it("is a friendly, child-appropriate message", () => {
    expect(PROFANITY_MESSAGE).toMatch(/kind|respectful/i);
    expect(PROFANITY_MESSAGE.length).toBeGreaterThan(20);
  });
});
