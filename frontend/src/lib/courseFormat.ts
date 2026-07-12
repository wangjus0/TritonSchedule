export function formatScheduleDisplay(schedule: string): string {
  const trimmedSchedule = schedule.trim();
  if (!trimmedSchedule || trimmedSchedule.toLowerCase() === "schedule tba") {
    return "Days and time TBA";
  }

  const firstSpaceIndex = trimmedSchedule.indexOf(" ");
  if (firstSpaceIndex === -1) {
    return `${trimmedSchedule} - Time TBA`;
  }

  const days = trimmedSchedule.slice(0, firstSpaceIndex).trim();
  const time = trimmedSchedule.slice(firstSpaceIndex + 1).trim();
  return `${days} - ${time || "Time TBA"}`;
}

export function formatSectionDetail(section: { time: string; location: string }): string {
  return `${section.time} • ${section.location}`;
}
