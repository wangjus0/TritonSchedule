import { detectCurrentTerm } from "./detectCurrentTerm.js";
import { getActiveTermFromDB } from "./getActiveTermFromDB.js";
import { createTerm } from "./createTerm.js";
import { startSearch } from "./startSearch.js";
import { markAllTermsInactive } from "./markAllTermsInactive.js";

export async function ingest() {

  const detectedTerm = await detectCurrentTerm(); // Determine new term
  const activeTerm = await getActiveTermFromDB(); // Determine term before

  if (!activeTerm) {
    // first-ever run
    await createTerm(detectedTerm);
    await startSearch(detectedTerm);
  } else if (activeTerm.Term !== detectedTerm) {
    // term rollover
    await markAllTermsInactive();
    await createTerm(detectedTerm);
    await startSearch(detectedTerm);
  } else {
    // updating course information
    await startSearch(detectedTerm);
  }

  return;

}
