// WORKFLOW
// Check current row element
// - If is a header, scrape the class title and put it in the model
// - If it is a class section scrape the contents and push it to the
// model array
export async function scrapeCurrentPage(term, page) {
    const rows = await page.$$("tr");
    const results = [];
    let visited = new Set();
    let current = null;
    for (const row of rows) {
        // Gets course number
        const courseNumber = await row.$$eval("td.crsheader", (item) => item[1]?.textContent?.trim());
        // Gets class title
        const courseTitle = await row.$$eval("td.crsheader span.boldtxt", (item) => item[0]?.textContent?.trim());
        let combinedTitle = "";
        // Check if courseNumber or courseTitle is undefined
        // before assigning
        if (courseNumber != undefined && courseTitle != undefined) {
            combinedTitle = `${courseNumber} ${courseTitle}`;
        }
        if (combinedTitle.length > 0) {
            current = {
                Name: combinedTitle,
                Term: term,
                Teacher: "",
                Lecture: null,
                Discussions: [],
                Midterms: [],
                Final: null,
            };
            continue;
        }
        const nestedRows = await row.$$eval("td.brdr", (tds) => {
            const cells = new Array(13).fill("");
            for (let i = 0; i < tds.length; i++) {
                cells[i] = tds[i].textContent?.trim();
            }
            return cells;
        });
        console.log(nestedRows);
    }
    return results;
}
