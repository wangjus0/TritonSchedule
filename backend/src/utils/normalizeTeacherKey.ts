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

  const [leftTokens, rightTokens] = withoutUnpairedLeadingInitial(
    leftName.split(" "),
    rightName.split(" "),
  );

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

function withoutUnpairedLeadingInitial(
  left: string[],
  right: string[],
): [string[], string[]] {
  const leftHasInitial = left.length > 2 && left[0]?.length === 1;
  const rightHasInitial = right.length > 2 && right[0]?.length === 1;

  if (leftHasInitial === rightHasInitial) {
    return [left, right];
  }

  return leftHasInitial
    ? [left.slice(1), right]
    : [left, right.slice(1)];
}

function compatibleTokenSequences(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length &&
    left.every((token, index) => tokensMatch(token, right[index] ?? ""));
}

function tokensMatch(left: string, right: string): boolean {
  return left === right ||
    (left.length === 1 && right.startsWith(left)) ||
    (right.length === 1 && left.startsWith(right));
}
