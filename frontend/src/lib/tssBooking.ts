import type { Course, DiscussionSection } from "@/data/sampleCourses";

const TSS_ORIGIN = "https://tss.ucsd.edu";
const TSS_EVENT_PACKAGE_HASH =
  /^#ZUSModule-display\?TileType=MYMOD&\/Detail\/EventPackage\/SM\/[^/?#]+\/00000000\/0\/0\/0\/00000000-0000-0000-0000-000000000000\/[^/?#]+\/[^/?#]+\/[^/?#]+\/\?$/;
const TSS_MODULE_HASH =
  /^#YSchedule-view&\/YUCSD_CON_MODULE\(AcademicYear='[^']+',AcademicPeriod='[^']+',ModuleID='[^']+'\)\?layout=MidColumnFullScreen$/;

type TssRouteKind = "event-package" | "module";

/**
 * Resolves the official TSS route for the complete section selection.
 *
 * Event-package routes must be shared by the lecture and every selected
 * discussion or lab.
 * Module fallbacks are accepted when Class Planner does not expose a package
 * deep link.
 * Returns `undefined` for incomplete selections, missing package metadata, or
 * routes outside the recognized HTTPS `tss.ucsd.edu/fiori` shapes.
 */
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
    return normalizeTssBookingUrl(course.tssFallbackUrl, "module");
  }

  const packageSets = [
    course.lectureEventPackageIds,
    ...(discussion ? [discussion.eventPackageIds] : []),
    ...(lab ? [lab.eventPackageIds] : []),
  ];

  if (!packageSets.every(hasPackageIds)) {
    return undefined;
  }

  for (const packageId of packageSets[0]!) {
    const isShared = packageSets
      .slice(1)
      .every((packageIds) => packageIds.includes(packageId));
    const bookingUrl = course.tssPackageUrls?.[packageId];

    if (isShared && bookingUrl) {
      const normalizedUrl = normalizeTssBookingUrl(bookingUrl, "event-package");

      if (normalizedUrl) {
        return normalizedUrl;
      }
    }
  }

  return undefined;
}

function hasPackageIds(packageIds: string[] | undefined): packageIds is string[] {
  return Boolean(packageIds?.length);
}

function normalizeTssBookingUrl(
  value: string,
  routeKind: TssRouteKind,
): string | undefined {
  try {
    const url = new URL(value);
    const routePattern = routeKind === "event-package"
      ? TSS_EVENT_PACKAGE_HASH
      : TSS_MODULE_HASH;

    return url.origin === TSS_ORIGIN &&
        url.pathname === "/fiori" &&
        url.search === "" &&
        url.username === "" &&
        url.password === "" &&
        routePattern.test(url.hash)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
