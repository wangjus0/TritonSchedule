import type { Course, DiscussionSection } from "@/data/sampleCourses";

export function resolveTssBookingUrl(
  course: Course,
  discussion?: DiscussionSection,
  lab?: DiscussionSection,
): string | undefined {
  if ((course.discussionSections?.length ?? 0) > 0 && !discussion) {
    return undefined;
  }

  if ((course.labSections?.length ?? 0) > 0 && !lab) {
    return undefined;
  }

  if (course.tssFallbackUrl) {
    return normalizeTssBookingUrl(course.tssFallbackUrl);
  }

  if (!course.lectureEventPackageIds?.length) {
    return undefined;
  }

  const packageSets = [
    course.lectureEventPackageIds,
    discussion?.eventPackageIds,
    lab?.eventPackageIds,
  ].filter((packageIds): packageIds is string[] => packageIds !== undefined);

  if (
    packageSets.length === 0 ||
    packageSets.some((packageIds) => packageIds.length === 0)
  ) {
    return undefined;
  }

  for (const packageId of packageSets[0]!) {
    const isShared = packageSets
      .slice(1)
      .every((packageIds) => packageIds.includes(packageId));
    const bookingUrl = course.tssPackageUrls?.[packageId];

    if (isShared && bookingUrl) {
      const normalizedUrl = normalizeTssBookingUrl(bookingUrl);

      if (normalizedUrl) {
        return normalizedUrl;
      }
    }
  }

  return undefined;
}

function normalizeTssBookingUrl(value: string): string | undefined {
  try {
    const url = new URL(value);

    return url.protocol === "https:" && url.hostname === "tss.ucsd.edu"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
