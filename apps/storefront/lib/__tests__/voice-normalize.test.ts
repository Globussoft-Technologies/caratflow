import { describe, it, expect } from "vitest";
import { normalizeVoiceQuery } from "@/lib/voice-normalize";

describe("normalizeVoiceQuery", () => {
  it("converts 'twenty-two karat' to '22K'", () => {
    expect(normalizeVoiceQuery("twenty-two karat gold ring")).toBe("22K gold ring");
  });

  it("converts 'twenty two karat' (space) to '22K'", () => {
    expect(normalizeVoiceQuery("twenty two karat gold")).toBe("22K gold");
  });

  it("converts '22 carat' to '22K'", () => {
    expect(normalizeVoiceQuery("22 carat bangles")).toBe("22K bangles");
  });

  it("replaces spoken 'fifty thousand' with '50000'", () => {
    expect(normalizeVoiceQuery("under fifty thousand")).toBe("under 50000");
  });

  it("strips 'in rupees' filler", () => {
    expect(normalizeVoiceQuery("necklace under 50000 in rupees")).toBe("necklace under 50000");
  });

  it("maps 'below' to 'under'", () => {
    expect(normalizeVoiceQuery("ring below 25000")).toBe("ring under 25000");
  });

  it("normalizes 'mangal sutra' to 'mangalsutra'", () => {
    expect(normalizeVoiceQuery("show me mangal sutra")).toBe("show me mangalsutra");
  });

  it("handles 'one lakh' number word", () => {
    expect(normalizeVoiceQuery("diamond set above one lakh")).toBe("diamond set over 100000");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeVoiceQuery("")).toBe("");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeVoiceQuery("  gold   ring  ")).toBe("gold ring");
  });
});
