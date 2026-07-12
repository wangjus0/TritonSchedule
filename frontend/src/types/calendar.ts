export interface CalendarEvent {
  id: string;
  title: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  color: string;
  isCourse?: boolean;
  courseId?: string;
  eventType?: string;
}

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";

export type EventColor = {
  label: string;
  value: string;
};

export const eventColors: EventColor[] = [
  { label: "Triton Blue", value: "#00629b" },
  { label: "Purple", value: "#7a48c9" },
  { label: "Pink", value: "#c4317f" },
  { label: "Orange", value: "#b8500a" },
  { label: "Teal", value: "#1f7d7a" },
  { label: "Green", value: "#2a8f3f" },
];
