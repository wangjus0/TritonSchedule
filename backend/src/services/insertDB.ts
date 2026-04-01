import { connectToSupabase } from "./supabase.js";
import type { Course } from "../models/Course.js";
import type { Term } from "../models/Term.js";
import type { RMP } from "../models/RMP.js";
import { validateCourse } from "../utils/validateCourse.js";

// Helper to convert Course to Supabase format
function courseToSupabaseFormat(course: Course): any {
  return {
    name: course.Name,
    term: course.Term,
    teacher: course.Teacher,
    name_key: course.nameKey,
    lecture: course.Lecture ? { ...course.Lecture } : null,
    labs: course.Labs.length > 0 ? course.Labs.map(lab => ({ ...lab })) : [],
    discussions: course.Discussions.length > 0 ? course.Discussions.map(d => ({ ...d })) : [],
    midterms: course.Midterms.length > 0 ? course.Midterms.map(m => ({ ...m })) : [],
    final: course.Final ? { ...course.Final } : null,
    rmp: course.rmp ? { ...course.rmp } : null,
  };
}

// Insert courses (bulk upsert)
export async function insertCourses(courses: Course[]) {
  if (courses.length === 0) {
    console.log("No courses to insert");
    return;
  }

  const validCourses: Course[] = [];
  let invalidCount = 0;

  for (const course of courses) {
    const validation = validateCourse(course);
    if (validation.valid) {
      validCourses.push(course);
    } else {
      invalidCount++;
      console.warn(`Skipping invalid course: ${course.Name} - ${validation.errors.join(", ")}`);
    }
  }

  if (validCourses.length === 0) {
    console.log(`No valid courses to insert (${invalidCount} invalid)`);
    return;
  }

  const formattedCourses = validCourses.map(courseToSupabaseFormat);
  const supabase = await connectToSupabase();

  // Upsert courses by name_key and term (replace if exists)
  const { data, error } = await supabase
    .from('courses')
    .upsert(formattedCourses, { onConflict: 'name_key,term' })
    .select();

  if (error) {
    console.error('Error inserting courses:', error);
    throw error;
  }

  console.log(`Upserted ${data.length} courses${invalidCount > 0 ? ` (${invalidCount} invalid skipped)` : ''}`);
}

// Insert a single term (make it active, deactivate others)
export async function insertTerm(term: Term) {
  const supabase = await connectToSupabase();

  // First, deactivate all terms
  const { error: deactivateError } = await supabase
    .from('terms')
    .update({ is_active: false })
    .not('id', 'is', null);

  if (deactivateError) {
    console.error('Error deactivating terms:', deactivateError);
    throw deactivateError;
  }

  // Try to find existing term
  const { data: existing, error: findError } = await supabase
    .from('terms')
    .select('id, term, is_active')
    .eq('term', term.Term)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    console.error('Error finding term:', findError);
    throw findError;
  }

  if (existing) {
    // Update existing term to active
    const { error: updateError } = await supabase
      .from('terms')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating term:', updateError);
      throw updateError;
    }
    console.log(`Activated existing term: ${term.Term}`);
  } else {
    // Insert new term
    const { data: newTerm, error: insertError } = await supabase
      .from('terms')
      .insert([{ term: term.Term, is_active: true }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting term:', insertError);
      throw insertError;
    }
    console.log(`Created new term: ${term.Term}`);
  }
}

// Insert RMP data (bulk upsert)
export async function insertRMPData(rmpData: RMP[]) {
  if (rmpData.length === 0) {
    console.log("No RMP data to insert");
    return;
  }

  const formattedData = rmpData.map(rmp => ({
    name: rmp.name,
    name_key: rmp.nameKey,
    avg_rating: rmp.avgRating,
    avg_diff: rmp.avgDiff,
    take_again_percent: rmp.takeAgainPercent,
  }));

  const supabase = await connectToSupabase();

  const { data, error } = await supabase
    .from('rmp_data')
    .upsert(formattedData, { onConflict: 'name_key' })
    .select();

  if (error) {
    console.error('Error inserting RMP data:', error);
    throw error;
  }

  console.log(`Upserted ${data.length} RMP records`);
}

// Update course RMP data (by teacher nameKey and term)
export async function updateCourseRMP(teacherNameKey: string, rmp: RMP, curTerm?: string) {
  const supabase = await connectToSupabase();
  const term = curTerm ?? (await getActiveTerm())?.term;

  if (!term) {
    console.warn(`Cannot update RMP: no active term`);
    return;
  }

  const { error } = await supabase
    .from('courses')
    .update({
      rmp: {
        avgRating: rmp.avgRating,
        avgDiff: rmp.avgDiff,
        takeAgainPercent: rmp.takeAgainPercent,
        name: rmp.name,
        nameKey: rmp.nameKey,
      }
    })
    .eq('name_key', teacherNameKey)
    .eq('term', term);

  if (error) {
    console.error(`Error updating RMP for ${teacherNameKey}:`, error);
    throw error;
  }
}

// Get active term
export async function getActiveTerm() {
  const supabase = await connectToSupabase();

  const { data, error } = await supabase
    .from('terms')
    .select('term, is_active')
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching active term:', error);
    throw error;
  }

  return data;
}

// Clear courses for a term
export async function clearTermData(term: string) {
  const supabase = await connectToSupabase();

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('term', term);

  if (error) {
    console.error(`Error clearing courses for term ${term}:`, error);
    throw error;
  }

  console.log(`Cleared course data for term: ${term}`);
}

// Generic insert function that routes to appropriate table operation
export async function insertDB(
  content: unknown[],
  collection_name: string,
) {
  switch (collection_name) {
    case 'courses':
      const courses = content as Course[];
      await insertCourses(courses);
      break;
    case 'terms':
      if (content.length > 0) {
        await insertTerm(content[0] as Term);
      }
      break;
    case 'rmp_data':
      const rmpData = content as RMP[];
      await insertRMPData(rmpData);
      break;
    default:
      console.warn(`Unknown collection: ${collection_name}, skipping`);
  }
}
