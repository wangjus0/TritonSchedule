const RATE_MY_PROFESSORS_HOSTS = new Set([
  "ratemyprofessors.com",
  "www.ratemyprofessors.com",
]);

const UCSD_SCHOOL_ID = "1079";

export function normalizeProfessorProfileUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    const isProfessorProfile = /^\/professor\/\d+\/?$/.test(url.pathname);

    if (
      url.protocol !== "https:" ||
      !RATE_MY_PROFESSORS_HOSTS.has(url.hostname.toLowerCase()) ||
      !isProfessorProfile
    ) {
      return undefined;
    }

    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function getProfessorProfileUrl(profileUrl: string | undefined, instructor: string): string {
  return normalizeProfessorProfileUrl(profileUrl) ??
    `https://www.ratemyprofessors.com/search/professors/${UCSD_SCHOOL_ID}?q=${encodeURIComponent(instructor.trim())}`;
}
