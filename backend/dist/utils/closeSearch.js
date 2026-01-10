import puppeteer from "puppeteer";
export async function closeSearch(page) {
    console.log("is this printing chat");
    await page.close();
}
