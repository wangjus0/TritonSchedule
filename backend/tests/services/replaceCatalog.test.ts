import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockRpc = jest.fn<(
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: null; error: null }>>();

jest.unstable_mockModule("../../src/services/connectToDB.js", () => ({
  connectToDB: () => ({ rpc: mockRpc }),
}));

const { replaceCatalog } = await import("../../src/services/supabaseRepository.js");

describe("replaceCatalog", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("uploads bounded batches before finalizing the refresh", async () => {
    const offerings = Array.from({ length: 251 }, (_, index) => ({
      source_key: `CSE-${index}`,
    }));
    const catalog = {
      offerings,
      sections: [],
      meetings: [],
      event_packages: [],
      package_sections: [],
      module_routes: [],
    };

    await replaceCatalog(
      "FA26",
      [],
      catalog as unknown as Parameters<typeof replaceCatalog>[2],
    );

    const beginCall = mockRpc.mock.calls.find(
      ([name]) => name === "begin_class_planner_catalog_refresh",
    );
    const stageCalls = mockRpc.mock.calls.filter(
      ([name]) => name === "stage_class_planner_catalog_batch",
    );
    const finalizeCall = mockRpc.mock.calls.find(
      ([name]) => name === "finalize_class_planner_catalog_refresh",
    );

    expect(beginCall).toBeDefined();
    expect(stageCalls).toHaveLength(2);
    expect(stageCalls[0]?.[1].p_items).toHaveLength(250);
    expect(stageCalls[1]?.[1].p_items).toHaveLength(1);
    expect(finalizeCall?.[1].p_refresh_id).toBe(beginCall?.[1].p_refresh_id);
    expect(mockRpc).not.toHaveBeenCalledWith(
      "replace_class_planner_catalog",
      expect.anything(),
    );
  });
});
