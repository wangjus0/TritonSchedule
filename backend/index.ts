// Normalizes raw cookies to create cookies string
function extractCookies(resp: Response): string {
  const rawCookies = resp.headers.getSetCookie?.() ?? [];
  const sessionCookie = rawCookies.map((item) => item.split(";")[0]).join("; ");
  return sessionCookie;
}

async function run() {
  // Search page endpoint
  const searchUrl =
    "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm";

  // Result page endpoint
  const resultUrl =
    "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudentResult.htm";

  // Fetch session cookies
  const initResp = await fetch(searchUrl);
  const cookies = extractCookies(initResp);

  // Request Body
  const body = new URLSearchParams({
    selectedTerm: "WI26",
    courses: "cse",
    tabNum: "tabs-crs",
  });

  // Request
  const resp = await fetch(resultUrl, {
    method: "POST",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36",
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
