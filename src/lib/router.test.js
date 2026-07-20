// Unit tests for the minimal hash router (Roadmap 2.7 / R4, routing from 2.3).

import { describe, it, expect } from "vitest";
import { pageToHash, parseHash, isDeepHash } from "./router";

describe("pageToHash", () => {
  it("maps simple pages", () => {
    expect(pageToHash("home")).toBe("#/");
    expect(pageToHash("all-courses")).toBe("#/courses");
    expect(pageToHash("dashboard")).toBe("#/dashboard");
    expect(pageToHash("gateway")).toBe("#/welcome");
  });

  it("maps entity pages with ids", () => {
    expect(pageToHash("navigator", { courseId: "abc" })).toBe("#/course/abc");
    expect(pageToHash("player", { lessonId: "L1" })).toBe("#/lesson/L1");
    expect(pageToHash("quiz", { quizId: "Q9" })).toBe("#/quiz/Q9");
    expect(pageToHash("course", { courseId: "abc" })).toBe("#/course-overview/abc");
  });

  it("falls back when the id is missing", () => {
    expect(pageToHash("navigator", {})).toBe("#/courses");
    expect(pageToHash("player", {})).toBe("#/");
    expect(pageToHash("quiz", {})).toBe("#/");
  });

  it("playlist play mode has a state-only hash", () => {
    expect(pageToHash("player", { isPlaylist: true, lessonId: "L1" })).toBe("#/play");
  });

  it("URL-encodes ids", () => {
    expect(pageToHash("player", { lessonId: "a b/c" })).toBe("#/lesson/a%20b%2Fc");
  });

  it("unknown page falls back to home", () => {
    expect(pageToHash("does-not-exist")).toBe("#/");
  });
});

describe("parseHash", () => {
  it("resolves empty/unknown to home", () => {
    expect(parseHash("")).toEqual({ name: "home", id: null });
    expect(parseHash("#/")).toEqual({ name: "home", id: null });
    expect(parseHash("#/garbage")).toEqual({ name: "home", id: null });
    expect(parseHash(undefined)).toEqual({ name: "home", id: null });
  });

  it("parses simple routes", () => {
    expect(parseHash("#/courses")).toEqual({ name: "all-courses", id: null });
    expect(parseHash("#/welcome")).toEqual({ name: "gateway", id: null });
    expect(parseHash("#/dashboard")).toEqual({ name: "dashboard", id: null });
  });

  it("parses entity routes with ids", () => {
    expect(parseHash("#/lesson/L1")).toEqual({ name: "lesson", id: "L1" });
    expect(parseHash("#/quiz/Q9")).toEqual({ name: "quiz", id: "Q9" });
    expect(parseHash("#/course/abc")).toEqual({ name: "course", id: "abc" });
    expect(parseHash("#/course-overview/abc")).toEqual({ name: "course-overview", id: "abc" });
  });

  it("decodes encoded ids (round-trip with pageToHash)", () => {
    const hash = pageToHash("player", { lessonId: "a b/c" });
    expect(parseHash(hash)).toEqual({ name: "lesson", id: "a b/c" });
  });
});

describe("isDeepHash", () => {
  it("deep links are restorable", () => {
    expect(isDeepHash("#/lesson/L1")).toBe(true);
    expect(isDeepHash("#/quiz/Q9")).toBe(true);
    expect(isDeepHash("#/dashboard")).toBe(true);
  });

  it("home and gateway are not deep", () => {
    expect(isDeepHash("#/")).toBe(false);
    expect(isDeepHash("")).toBe(false);
    expect(isDeepHash("#/welcome")).toBe(false);
  });
});
