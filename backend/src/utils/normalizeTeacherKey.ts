export function normalizeTeacherKey(name: string): string {
  // This value is persisted and queried as a database key. Keep the original
  // punctuation-deleting format stable; flexible comparison belongs below.
  return name
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();
}

const VERIFIED_FULL_NAME_ALIASES = new Set([
  "chung cheng|chung kuan cheng",
]);

const VERIFIED_GIVEN_NAME_ALIAS_GROUPS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(["beth", "elizabeth"]),
  new Set(["gary", "garrison"]),
  new Set(["joe", "joseph"]),
  new Set(["steve", "steven", "stephen"]),
];

export function teacherNamesMatch(left: string, right: string): boolean {
  const leftName = normalizeTeacherName(left);
  const rightName = normalizeTeacherName(right);

  if (!leftName || !rightName) {
    return false;
  }

  if (leftName === rightName || compact(leftName) === compact(rightName)) {
    return true;
  }

  if (verifiedFullNameAliasesMatch(leftName, rightName)) {
    return true;
  }

  const leftTokens = leftName.split(" ");
  const rightTokens = rightName.split(" ");

  const reversedRightTokens = rightTokens.slice().reverse();
  return compatibleTokenSequences(leftTokens, rightTokens) ||
    compatibleTokenSequences(leftTokens, reversedRightTokens) ||
    highConfidenceNameVariantsMatch(leftTokens, rightTokens) ||
    highConfidenceNameVariantsMatch(leftTokens, reversedRightTokens);
}

function verifiedFullNameAliasesMatch(left: string, right: string): boolean {
  return VERIFIED_FULL_NAME_ALIASES.has(`${left}|${right}`) ||
    VERIFIED_FULL_NAME_ALIASES.has(`${right}|${left}`);
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

function highConfidenceNameVariantsMatch(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length === 2 && right.length === 2) {
    const givenNamesMatch = givenNameVariantsMatch(left[0]!, right[0]!);
    const familyNamesMatch = familyNameVariantsMatch(left[1]!, right[1]!);
    const hasExactAnchor = left[0] === right[0] || left[1] === right[1];
    return givenNamesMatch && familyNamesMatch && hasExactAnchor;
  }

  let shorter: readonly string[];
  let longer: readonly string[];
  if (left.length === 2 && right.length >= 3) {
    shorter = left;
    longer = right;
  } else if (right.length === 2 && left.length >= 3) {
    shorter = right;
    longer = left;
  } else {
    return false;
  }

  return givenNameVariantsMatch(shorter[0]!, longer[0]!) &&
    familyNameVariantsMatch(shorter[1]!, longer[1]!) &&
    (shorter[0] === longer[0] || shorter[1] === longer[1]);
}

function givenNameVariantsMatch(left: string, right: string): boolean {
  if (left === right || areVerifiedGivenNameAliases(left, right)) {
    return true;
  }

  const shorter = left.length <= right.length ? left : right;
  const longer = shorter === left ? right : left;
  return (shorter.length >= 4 && longer.startsWith(shorter)) ||
    (shorter.length >= 5 && editDistanceAtMostOne(left, right));
}

function familyNameVariantsMatch(left: string, right: string): boolean {
  return left === right ||
    (Math.min(left.length, right.length) >= 5 && editDistanceAtMostOne(left, right));
}

function areVerifiedGivenNameAliases(left: string, right: string): boolean {
  return VERIFIED_GIVEN_NAME_ALIAS_GROUPS.some((group) =>
    group.has(left) && group.has(right)
  );
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) {
    return false;
  }

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (left.length > right.length) {
      leftIndex += 1;
    } else if (right.length > left.length) {
      rightIndex += 1;
    } else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  return edits + (leftIndex < left.length || rightIndex < right.length ? 1 : 0) <= 1;
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
