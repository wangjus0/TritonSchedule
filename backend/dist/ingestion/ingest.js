async function main() {
    // maybe add a acquire lock function to make sure there aren't any repeat scrapes
    // const detectedTerm = await detectCurrentTerm();
    // const activeTerm = await getActiveTermFromDB();
    //
    // if (!activeTerm) {
    //   // first-ever run
    //   await createTerm(detectedTerm);
    //   await scrapeFullTerm(detectedTerm);
    // } else if (activeTerm.term !== detectedTerm) {
    //   // term rollover
    //   await markAllTermsInactive();
    //   await createTerm(detectedTerm);
    //   await scrapeFullTerm(detectedTerm);
    // } else {
    //   // same term
    //   await scrapeIncremental(detectedTerm);
    // }
    // release lock function down here
}
export {};
