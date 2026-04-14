// Client-side spoken-query normalization for voice search.
// Maps common spoken phrases to canonical search terms jewelry shoppers use.
// Intentionally small and conservative — applied only to voice transcripts.

const NUMBER_WORDS: Record<string, string> = {
  "one thousand": "1000",
  "five thousand": "5000",
  "ten thousand": "10000",
  "twenty thousand": "20000",
  "twenty five thousand": "25000",
  "fifty thousand": "50000",
  "one lakh": "100000",
  "two lakh": "200000",
  "five lakh": "500000",
  "ten lakh": "1000000",
  "one crore": "10000000",
};

// Each rule runs once in order. Patterns are lowercase; apply to lowercased text.
// Use word-boundary regexes to avoid accidental partial matches.
const SUBSTITUTIONS: Array<[RegExp, string]> = [
  // Karat variants (e.g. "twenty two karat", "22 carat", "22k")
  [/\b(?:twenty[\s-]?four|24)\s*(?:karat|carat|kt|k)\b/gi, "24K"],
  [/\b(?:twenty[\s-]?two|22)\s*(?:karat|carat|kt|k)\b/gi, "22K"],
  [/\b(?:eighteen|18)\s*(?:karat|carat|kt|k)\b/gi, "18K"],
  [/\b(?:fourteen|14)\s*(?:karat|carat|kt|k)\b/gi, "14K"],

  // "in rupees" / "rupees" — strip
  [/\b(?:in\s+)?rupees?\b/gi, ""],
  [/\brs\.?\b/gi, ""],

  // Price qualifiers
  [/\bunder\s+rupees?\s+/gi, "under "],
  [/\bbelow\s+/gi, "under "],
  [/\babove\s+/gi, "over "],
  [/\bmore than\s+/gi, "over "],
  [/\bless than\s+/gi, "under "],

  // Size phrases
  [/\bsize number\s+/gi, "size "],
  [/\bring size\s+/gi, "ring size "],

  // Common product synonyms
  [/\bmangal sutra\b/gi, "mangalsutra"],
  [/\bjhumkas?\b/gi, "jhumka"],
  [/\bnose pin\b/gi, "nose pin"],
];

/**
 * Normalize a spoken transcript into a canonical search query.
 * - Replaces spoken number words ("fifty thousand" → "50000")
 * - Normalizes karat phrasing ("twenty-two karat" → "22K")
 * - Strips filler ("in rupees")
 * - Collapses whitespace and trims
 */
export function normalizeVoiceQuery(raw: string): string {
  if (!raw) return "";

  let text = raw.toLowerCase();

  // Replace number words first so "under fifty thousand" → "under 50000".
  for (const [phrase, digits] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`\\b${phrase}\\b`, "gi");
    text = text.replace(re, digits);
  }

  // Apply keyword/unit substitutions.
  for (const [pattern, replacement] of SUBSTITUTIONS) {
    text = text.replace(pattern, replacement);
  }

  // Remove trailing punctuation and collapse whitespace.
  text = text.replace(/[.!?]+$/g, "");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
