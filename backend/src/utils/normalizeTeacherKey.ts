export function normalizeTeacherKey(name: string): string {
  // This value is persisted and queried as a database key. Keep the original
  // punctuation-deleting format stable; flexible comparison belongs below.
  return name
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();
}

export function teacherNamesMatch(left: string, right: string): boolean {
  const leftName = normalizeTeacherName(left);
  const rightName = normalizeTeacherName(right);

  if (!leftName || !rightName) {
    return false;
  }

  if (leftName === rightName || compact(leftName) === compact(rightName)) {
    return true;
  }

  const leftTokens = leftName.split(" ");
  const rightTokens = rightName.split(" ");

  return compatibleTokenSequences(leftTokens, rightTokens) ||
    compatibleTokenSequences(leftTokens, rightTokens.slice().reverse());
}

function compact(nameKey: string): string {
  return nameKey.replace(/\s/g, "");
}

function normalizeTeacherName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function compatibleTokenSequences(left: readonly string[], right: readonly string[]): boolean {
  if (tokenSequencesMatch(left, right)) {
    return true;
  }

  let longer: readonly string[];
  let shorter: readonly string[];
  if (left.length === right.length + 1) {
    longer = left;
    shorter = right;
  } else if (right.length === left.length + 1) {
    longer = right;
    shorter = left;
  } else {
    return false;
  }

  return longer.some((token, index) =>
    token.length === 1 &&
    tokenSequencesMatch(
      [...longer.slice(0, index), ...longer.slice(index + 1)],
      shorter,
    )
  );
}

function tokenSequencesMatch(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length &&
    left.every((token, index) => tokensMatch(token, right[index] ?? ""));
}

function tokensMatch(left: string, right: string): boolean {
  return left === right ||
    (left.length === 1 && right.startsWith(left)) ||
    (right.length === 1 && left.startsWith(right));
}
