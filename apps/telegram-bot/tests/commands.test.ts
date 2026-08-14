import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/commands.js";

describe("parseCommand", () => {
  it("parses /projects", () => {
    expect(parseCommand("/projects")).toEqual({ type: "projects" });
  });

  it("parses /status <name>", () => {
    expect(parseCommand("/status my-app")).toEqual({ type: "status", name: "my-app" });
  });

  it("errors on /status with no name", () => {
    expect(parseCommand("/status")).toMatchObject({ type: "error" });
  });

  it("parses /new with type and features", () => {
    expect(parseCommand("/new alpha-red website landing-page contact-form")).toEqual({
      type: "new",
      name: "alpha-red",
      projectType: "website",
      features: ["landing-page", "contact-form"],
    });
  });

  it("rejects /new with an invalid type", () => {
    expect(parseCommand("/new alpha-red mobile-app")).toMatchObject({ type: "error" });
  });

  it("parses /deploy without confirmation as unconfirmed", () => {
    expect(parseCommand("/deploy alpha-red")).toEqual({ type: "deploy", name: "alpha-red", confirmed: false });
  });

  it("parses /deploy with confirm as confirmed", () => {
    expect(parseCommand("/deploy alpha-red confirm")).toEqual({ type: "deploy", name: "alpha-red", confirmed: true });
  });

  it("strips @BotName suffix from commands in group chats", () => {
    expect(parseCommand("/projects@Runpodjebot")).toEqual({ type: "projects" });
  });

  it("treats non-slash text as natural language", () => {
    expect(parseCommand("Build me a landing page for Alpha Red")).toEqual({
      type: "natural_language",
      text: "Build me a landing page for Alpha Red",
    });
  });

  it("returns an error for an unknown command", () => {
    expect(parseCommand("/frobnicate")).toMatchObject({ type: "error" });
  });
});
