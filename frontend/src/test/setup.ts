import "@testing-library/jest-dom/vitest";

const fetchStub = vi.fn(async () => ({
  json: async () => [],
})) as unknown as typeof fetch;

vi.stubGlobal("fetch", fetchStub);
