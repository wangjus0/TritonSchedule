import { connectToDB } from "../services/connectToDB.js";
import { Db } from "mongodb";
import { disconnectFromDB } from "../services/disconnectFromDB.js";
import { detectCurrentTerm } from "./detectCurrentTerm.js";
import { getActiveTermFromDB } from "./getActiveTermFromDB.js";
import { createTerm } from "./createTerm.js";
import { startSearch } from "./startSearch.js";
import { markAllTermsInactive } from "./markAllTermsInactive.js";
// XXX: Current util functions for ingestion (gona use vercel cron http for repeated ingestion)
// https://vercel.com/docs/cron-jobs 
// - detectCurrentTerm() works
// - getActiveTermFromDB() works
// - createTerm() works
// - markAllTermsInactive() works
// - startSearch() works
// NOTES: 
// - I need to figure out what i'm going to do with course data from 2 terms ago.
// Because we want to keep up to 2 terms of data in the DB, so I need figure out the 
// document folder situation.
async function ingest() {
    const db = await connectToDB();
    const detectedTerm = await detectCurrentTerm(); // Determine new term
    const activeTerm = await getActiveTermFromDB(); // Determine term before
    if (!activeTerm) {
        // first-ever run
        await createTerm(detectedTerm);
        await startSearch(detectedTerm);
    }
    else if (activeTerm.term !== detectedTerm) {
        // term rollover
        await markAllTermsInactive();
        await createTerm(detectedTerm);
        await startSearch(detectedTerm);
    }
    await disconnectFromDB();
    return;
}
