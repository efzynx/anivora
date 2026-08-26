/**
 * Title Normalizer & Deduplicator Engine
 * Implements heuristics from docs/SCRAPER.md (Trigram and Noise stripping)
 */
export class ContentNormalizer {
  private static readonly NOISE_PATTERNS = [
    /\[.*?\]/g,
    /\(.*?\)/g,
    /\b(sub\s*indo|subtitle\s*indonesia|subbed)\b/gi,
    /\b(ongoing|completed|tamat|batch)\b/gi,
    /\b(episode|eps?)\s*\d+/gi,
    /\b(season\s*\d+|s\d+)\b/gi,
    /\b(bd|bluray|uncensored|hd)\b/gi,
    /[_]/g,
  ];

  /**
   * Cleans external noise from scraped titles
   */
  public static cleanTitle(rawTitle: string): string {
    let clean = rawTitle;
    for (const pattern of this.NOISE_PATTERNS) {
      clean = clean.replace(pattern, ' ');
    }
    return clean.replace(/\s+/g, ' ').trim();
  }

  /**
   * Generates a URL-safe unique slug
   */
  public static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Calculates trigram string similarity between two strings (0.0 - 1.0)
   */
  public static calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const trigrams1 = this.getTrigrams(s1);
    const trigrams2 = this.getTrigrams(s2);

    let intersection = 0;
    const set2 = new Set(trigrams2);

    for (const tri of trigrams1) {
      if (set2.has(tri)) {
        intersection++;
      }
    }

    const total = trigrams1.length + trigrams2.length;
    return total === 0 ? 0.0 : (2.0 * intersection) / total;
  }

  private static getTrigrams(str: string): string[] {
    const padded = `  ${str} `;
    const trigrams: string[] = [];
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.push(padded.substring(i, i + 3));
    }
    return trigrams;
  }
}
