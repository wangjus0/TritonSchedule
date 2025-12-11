// Extracts all "Set-Cookie" headers and turns them into one Cookie string.
function extractCookies(resp) {
    const rawCookies = resp.headers.getSetCookie?.() ?? [];
    const sessionCookie = rawCookies.map((item) => item.split(";")[0]).join("; ");
    return sessionCookie;
}
async function run() {
    const searchUrl = "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm";
    const resultUrl = "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudentResult.htm";
    // Get new cookies per session
    const initResp = await fetch(searchUrl);
    const cookies = extractCookies(initResp);
    console.log("Using fresh cookies:", cookies);
    // Post body for course search request
    // const body =
    //   "selectedTerm=WI26&xsoc_term=&loggedIn=false&tabNum=tabs-crs&_selectedSubjects=1" +
    //   "&schedOption1=true&_schedOption1=on&_schedOption11=on&_schedOption12=on" +
    //   "&schedOption2=true&_schedOption2=on&_schedOption4=on&_schedOption5=on" +
    //   "&_schedOption3=on&_schedOption7=on&_schedOption8=on&_schedOption13=on" +
    //   "&_schedOption10=on&_schedOption9=on" +
    //   "&schDay=M&_schDay=on&schDay=T&_schDay=on&schDay=W&_schDay=on&schDay=R&_schDay=on" +
    //   "&schDay=F&_schDay=on&schDay=S&_schDay=on" +
    //   "&schStartTime=12%3A00&schStartAmPm=0&schEndTime=12%3A00&schEndAmPm=0" +
    //   "&_selectedDepartments=1&schedOption1Dept=true&_schedOption1Dept=on&_schedOption11Dept=on&_schedOption12Dept=on" +
    //   "&schedOption2Dept=true&_schedOption2Dept=on&_schedOption4Dept=on&_schedOption5Dept=on&_schedOption3Dept=on" +
    //   "&_schedOption7Dept=on&_schedOption8Dept=on&_schedOption13Dept=on&_schedOption10Dept=on&_schedOption9Dept=on" +
    //   "&schDayDept=M&_schDayDept=on&schDayDept=T&_schDayDept=on&schDayDept=W&_schDayDept=on&schDayDept=R&_schDayDept=on" +
    //   "&schDayDept=F&_schDayDept=on&schDayDept=S&_schDayDept=on" +
    //   "&schStartTimeDept=12%3A00&schStartAmPmDept=0&schEndTimeDept=12%3A00&schEndAmPmDept=0" +
    //   "&courses=cse&sections=is+this+working&instructorType=begin&instructor=&titleType=contain&title=" +
    //   "&_hideFullSec=on&_showPopup=on";
    const body = new URLSearchParams({
        selectedTerm: "WI26",
        courses: "cse",
        tabNum: "tabs-crs",
    });
    // Request
    const resp = await fetch(resultUrl, {
        method: "POST",
        headers: {
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "max-age=0",
            "Content-Type": "application/x-www-form-urlencoded",
            Origin: "https://act.ucsd.edu",
            Referer: searchUrl,
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
            "sec-ch-ua": `"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"`,
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": `"Android"`,
            Cookie: cookies,
        },
        body,
    });
    // Gets the HTML from request
    const html = await resp.text();
    console.log(html);
}
run();
export {};
