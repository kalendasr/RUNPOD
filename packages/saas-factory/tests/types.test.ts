import { describe, expect, it } from "vitest";
import { pluralize, modelAccessor, routeSegment, validateEntitySpec } from "../src/types.js";

describe("types", () => {
  it("pluralizes simple names", () => {
    expect(pluralize("Customer")).toBe("Customers");
    expect(pluralize("Project")).toBe("Projects");
  });

  it("pluralizes names ending in s/x/ch/sh", () => {
    expect(pluralize("Address")).toBe("Addresses");
    expect(pluralize("Box")).toBe("Boxes");
  });

  it("pluralizes names ending in a consonant + y", () => {
    expect(pluralize("Company")).toBe("Companies");
  });

  it("lowercases the first letter for the model accessor", () => {
    expect(modelAccessor("Customer")).toBe("customer");
  });

  it("builds a route segment from the accessor's plural", () => {
    expect(routeSegment("Company")).toBe("companies");
  });

  it("rejects non-PascalCase entity names", () => {
    expect(() => validateEntitySpec({ name: "customer", fields: ["name"] })).toThrow();
  });

  it("rejects entities with no fields", () => {
    expect(() => validateEntitySpec({ name: "Customer", fields: [] })).toThrow();
  });

  it("rejects non-camelCase field names", () => {
    expect(() => validateEntitySpec({ name: "Customer", fields: ["Name"] })).toThrow();
  });
});
