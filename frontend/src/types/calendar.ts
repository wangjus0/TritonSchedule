export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  color: string;
  isCourse?: boolean;
}

export type EventColor = {
  label: string;
  value: string;
};

export const eventColors: EventColor[] = [
  { label: "Blue", value: "hsl(221, 83%, 53%)" },
  { label: "Green", value: "hsl(142, 71%, 45%)" },
  { label: "Purple", value: "hsl(262, 83%, 58%)" },
  { label: "Orange", value: "hsl(25, 95%, 53%)" },
  { label: "Pink", value: "hsl(340, 82%, 52%)" },
  { label: "Teal", value: "hsl(180, 70%, 45%)" },
];
