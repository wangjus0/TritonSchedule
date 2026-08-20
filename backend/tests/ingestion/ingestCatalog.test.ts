import { describe, expect, it } from "@jest/globals";
import {
  ingestCatalog,
  type IngestCatalogDependencies,
} from "../../src/ingestion/ingestCatalog.js";
import { classPlannerCourse } from "./classPlannerFixtures.js";

describe("ingestCatalog", () => {
  it("builds one catalog snapshot through the scraper boundary", async () => {
    const course = classPlannerCourse(101, {
      module_name: "Design and Analysis of Algorithms",
    });
    const dependencies: IngestCatalogDependencies = {
      scrapeClassPlanner: async () => ({
        term: "FA26",
        courses: [course],
        routes: [
          {
            source_key: `CSE-101:${course.sections[0]!.section_id}`,
            module_id: "12345",
            representative_event_package_id: "15100000101",
            tss_url:
              "https://tss.ucsd.edu/fiori#ZUSModule-display?TileType=MYMOD&" +
              "/Detail/EventPackage/SM/12345/00000000/0/0/0/" +
              "00000000-0000-0000-0000-000000000000/15100000101/2026/2/?",
          },
        ],
      }),
    };

    const result = await ingestCatalog(undefined, dependencies);

    expect(result.term).toBe("FA26");
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]).toMatchObject({
      Name: "CSE 101: Design and Analysis of Algorithms",
      Teacher: "Ada Lovelace",
      Term: "FA26",
      nameKey: "ada lovelace",
    });
    expect(result.catalog.offerings).toHaveLength(1);
    expect(result.catalog.sections).toHaveLength(1);
    expect(result.catalog.event_packages[0]).toMatchObject({
      module_id: "12345",
      event_package_id: "1500000101",
    });
  });
});
