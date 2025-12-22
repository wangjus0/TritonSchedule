import type { Course } from "./Course.js";

export type Class = {
  name: string;
  teacher: string;
  lectures: Course[];
  discussions: Course[];
  midterms: Course[];
  final: Course | null;
}

// name: string;
// teacher: string;
// sections: Course[];
// discussions: Course[];
