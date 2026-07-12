const SEASON_CODES: Record<string, string> = {
  WI: "Winter",
  SP: "Spring",
  SU: "Summer",
  FA: "Fall",
};

export function formatTermLabel(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) {
    return "";
  }

  const compactMatch = trimmed.match(/^([A-Za-z]{2})(\d{2})$/);
  if (compactMatch) {
    const [, seasonCode, yearSuffix] = compactMatch;
    const season = SEASON_CODES[seasonCode.toUpperCase()];
    if (season) {
      return `${season} 20${yearSuffix}`;
    }
  }

  return trimmed;
}
