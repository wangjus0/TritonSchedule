export function normalizeTeacherKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function teacherNamesMatch(left: string, right: string): boolean {
  const leftKey = normalizeTeacherKey(left);
  const rightKey = normalizeTeacherKey(right);

  if (!leftKey || !rightKey) {
    return false;
  }

  if (leftKey === rightKey || compact(leftKey) === compact(rightKey)) {
    return true;
  }

  const leftTokens = meaningfulTokens(leftKey);
  const rightTokens = meaningfulTokens(rightKey);

  if (leftTokens.length < 2 || rightTokens.length < 2) {
    return false;
  }

  if (sortedTokens(leftTokens) === sortedTokens(rightTokens)) {
    return true;
  }

  return leftTokens[0] === rightTokens[0] &&
    leftTokens.at(-1) === rightTokens.at(-1);
}

function compact(nameKey: string): string {
  return nameKey.replace(/\s/g, "");
}

function meaningfulTokens(nameKey: string): string[] {
  return nameKey.split(" ").filter((token) => token.length > 1);
}

function sortedTokens(tokens: readonly string[]): string {
  return tokens.slice().sort().join(" ");
}
