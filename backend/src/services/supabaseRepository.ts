import type { PostgrestError } from "@supabase/supabase-js";
import type { Course } from "../models/Course.js";
import type { RMP } from "../models/RMP.js";
import type { Section } from "../models/Section.js";
import type { Term } from "../models/Term.js";
import { connectToDB } from "./connectToDB.js";

type CourseRow = {
	id: string;
	name: string;
	term: string;
	teacher: unknown;
	name_key: unknown;
	lecture: unknown | null;
	labs: unknown[];
	discussions: unknown[];
	midterms: unknown[];
	final: unknown | null;
	rmp: RMP | null;
};

type ProfessorRow = {
	name: string;
	name_key: string;
	avg_rating: number;
	avg_diff: number;
	take_again_percent: number;
};

type TermRow = {
	term: string;
	is_active: boolean;
};

const PAGE_SIZE = 1000;

function throwIfError(error: PostgrestError | null) {
	if (error) throw error;
}

function escapeLike(value: string) {
	return value.replace(/[\\%_]/g, "\\$&");
}

function flexibleLikePattern(value: string) {
	const tokens = value.trim().split(/\s+/).filter(Boolean).map(escapeLike);
	return `%${tokens.join("%")}%`;
}

function normalizeString(value: unknown) {
	return typeof value === "string" ? value : "";
}

function isCourseRow(row: unknown): row is CourseRow {
	if (!row || typeof row !== "object") return false;
	const candidate = row as Partial<CourseRow>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.name === "string" &&
		candidate.name.trim().length > 0 &&
		typeof candidate.term === "string" &&
		candidate.term.trim().length > 0
	);
}

function normalizeSection(value: unknown): Section | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;

	const section = value as Record<string, unknown>;
	return {
		Days: typeof section.Days === "string" ? section.Days : "",
		Time: typeof section.Time === "string" ? section.Time : "",
		Location: typeof section.Location === "string" ? section.Location : "",
	};
}

function normalizeSections(value: unknown): Section[] {
	if (!Array.isArray(value)) return [];
	return value
		.map(normalizeSection)
		.filter((section): section is Section => section !== null);
}

function toCourseDocument(row: CourseRow): Course & { id: string } {
	return {
		id: normalizeString(row.id),
		Name: normalizeString(row.name),
		Term: normalizeString(row.term),
		Teacher: normalizeString(row.teacher),
		Lecture: normalizeSection(row.lecture),
		Labs: normalizeSections(row.labs),
		Discussions: normalizeSections(row.discussions),
		Midterms: normalizeSections(row.midterms),
		Final: normalizeSection(row.final),
		nameKey: normalizeString(row.name_key),
		rmp: row.rmp,
	};
}

function toRmpDocument(row: ProfessorRow): RMP {
	return {
		avgRating: Number(row.avg_rating),
		avgDiff: Number(row.avg_diff),
		takeAgainPercent: Number(row.take_again_percent),
		name: row.name,
		nameKey: row.name_key,
	};
}

function toTermDocument(row: TermRow): Term {
	return {
		Term: row.term,
		IsActive: row.is_active,
	};
}

export async function searchCourses(course: string, term: string) {
	const supabase = connectToDB();
	const rows: CourseRow[] = [];
	let offset = 0;

	while (true) {
		let query = supabase
			.from("courses")
			.select(
				"id,name,term,teacher,name_key,lecture,labs,discussions,midterms,final,rmp",
			)
			.order("name", { ascending: true })
			.range(offset, offset + PAGE_SIZE - 1);

		if (course.length > 0) {
			query = query.ilike("name", flexibleLikePattern(course));
		}

		if (term.length > 0) {
			query = query.ilike("term", flexibleLikePattern(term));
		}

		const { data, error } = await query;
		throwIfError(error);

		const page = (data ?? []) as CourseRow[];
		rows.push(...page);

		if (page.length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
	}

	return rows.filter(isCourseRow).map(toCourseDocument);
}

export async function replaceCatalog(
	term: string,
	courses: Course[],
	professors: RMP[],
) {
	if (courses.length <= 0) {
		throw new Error("Refusing to replace catalog with no courses");
	}

	const supabase = connectToDB();
	const { error } = await supabase.rpc("replace_catalog", {
		p_courses: courses,
		p_professors: professors,
		p_term: term,
	});

	throwIfError(error);
}

export async function getActiveTermRow() {
	const supabase = connectToDB();
	const { data, error } = await supabase
		.from("terms")
		.select("term,is_active")
		.eq("is_active", true)
		.maybeSingle();

	throwIfError(error);

	return data ? toTermDocument(data as TermRow) : null;
}

export async function searchProfessor(nameKey?: string) {
	const supabase = connectToDB();

	if (nameKey) {
		const { data, error } = await supabase
			.from("professor")
			.select("name,name_key,avg_rating,avg_diff,take_again_percent")
			.eq("name_key", nameKey)
			.order("name", { ascending: true });

		throwIfError(error);
		return ((data ?? []) as ProfessorRow[]).map(toRmpDocument);
	}

	const rows: ProfessorRow[] = [];
	let offset = 0;

	while (true) {
		const { data, error } = await supabase
			.from("professor")
			.select("name,name_key,avg_rating,avg_diff,take_again_percent")
			.order("name", { ascending: true })
			.range(offset, offset + PAGE_SIZE - 1);

		throwIfError(error);

		const page = (data ?? []) as ProfessorRow[];
		rows.push(...page);

		if (page.length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
	}

	return rows.map(toRmpDocument);
}
