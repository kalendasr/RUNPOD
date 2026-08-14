import { describe, expect, it, vi } from "vitest";
import { handleUpdate, type BotDeps } from "../src/bot.js";
import type { TelegramClient, TelegramUpdate } from "../src/telegramClient.js";
import type { FactoryClient } from "../src/factoryClient.js";

function makeUpdate(text: string, chatId = 123): TelegramUpdate {
  return {
    update_id: 1,
    message: { message_id: 1, date: 0, chat: { id: chatId, type: "private" }, text },
  };
}

function makeDeps(overrides: Partial<BotDeps> = {}): BotDeps & { sendMessage: ReturnType<typeof vi.fn> } {
  const sendMessage = vi.fn();
  const telegram = { sendMessage } as unknown as TelegramClient;
  const factory = {
    listProjects: vi.fn(async () => [{ name: "alpha-red", type: "website", status: "DRAFT" }]),
    getProject: vi.fn(async () => ({
      name: "alpha-red",
      type: "website",
      status: "DRAFT",
      taskProgress: { done: 0, total: 3 },
      latestTests: [],
      deployments: [],
    })),
    getLogs: vi.fn(async () => []),
    createProject: vi.fn(async () => ({})),
    runTests: vi.fn(async () => ({ outcome: "REVIEW", attempts: 1, reason: "ok" })),
    deploy: vi.fn(async () => ({ outcome: "DEPLOYED", url: "http://localhost:4001/", reason: "ok" })),
    stop: vi.fn(async () => ({ wasRunning: true, running: false })),
    runAutonomous: vi.fn(async () => ({
      projectName: "alpha-red",
      outcome: "REVIEW",
      attempts: 1,
      reason: "All tests passed",
      readyToDeploy: true,
    })),
  } as unknown as FactoryClient;

  return {
    telegram,
    factory,
    allowedChatIds: new Set([123]),
    sendMessage,
    ...overrides,
  };
}

describe("handleUpdate", () => {
  it("refuses messages from chats not in the allowlist", async () => {
    const deps = makeDeps({ allowedChatIds: new Set([999]) });
    await handleUpdate(makeUpdate("/projects"), deps);
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringMatching(/not configured/i));
    expect((deps.factory as any).listProjects).not.toHaveBeenCalled();
  });

  it("ignores updates with no message text", async () => {
    const deps = makeDeps();
    await handleUpdate({ update_id: 1 }, deps);
    expect(deps.sendMessage).not.toHaveBeenCalled();
  });

  it("lists projects on /projects", async () => {
    const deps = makeDeps();
    await handleUpdate(makeUpdate("/projects"), deps);
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("alpha-red"));
  });

  it("asks for confirmation on /deploy without confirm", async () => {
    const deps = makeDeps();
    await handleUpdate(makeUpdate("/deploy alpha-red"), deps);
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("/deploy alpha-red confirm"));
    expect((deps.factory as any).deploy).not.toHaveBeenCalled();
  });

  it("deploys on /deploy with confirm", async () => {
    const deps = makeDeps();
    await handleUpdate(makeUpdate("/deploy alpha-red confirm"), deps);
    expect((deps.factory as any).deploy).toHaveBeenCalledWith("alpha-red", "telegram");
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("DEPLOYED"));
  });

  it("creates a project on /new", async () => {
    const deps = makeDeps();
    await handleUpdate(makeUpdate("/new alpha-red website landing-page"), deps);
    expect((deps.factory as any).createProject).toHaveBeenCalledWith({
      name: "alpha-red",
      type: "website",
      features: ["landing-page"],
    });
  });

  it("sends an immediate ack, then forwards natural language to the autonomous pipeline", async () => {
    const deps = makeDeps();
    await handleUpdate(makeUpdate("Build me a landing page for Alpha Red"), deps);

    expect((deps.factory as any).runAutonomous).toHaveBeenCalledWith("Build me a landing page for Alpha Red");
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringMatching(/planning and building/i));
    expect(deps.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("REVIEW for \"alpha-red\" after 1 attempt(s)"),
    );
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("/deploy alpha-red"));
  });

  it("replies with an unrecognized message when the planner declines the brief", async () => {
    const deps = makeDeps();
    (deps.factory as any).runAutonomous = vi.fn(async () => {
      throw new Error("The brief doesn't look like a request to build something.");
    });
    await handleUpdate(makeUpdate("hello there"), deps);
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("couldn't understand"));
  });

  it("turns a thrown pipeline error into a chat reply instead of crashing", async () => {
    const deps = makeDeps();
    (deps.factory as any).runAutonomous = vi.fn(async () => {
      throw new Error("factory-api unreachable");
    });
    await handleUpdate(makeUpdate("Build me a shop"), deps);
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("factory-api unreachable"));
  });

  it("turns a thrown factory-api error into a chat reply instead of crashing", async () => {
    const deps = makeDeps();
    (deps.factory as any).listProjects = vi.fn(async () => {
      throw new Error("factory-api unreachable");
    });
    await handleUpdate(makeUpdate("/projects"), deps);
    expect(deps.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining("factory-api unreachable"));
  });
});
