import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { writeTasksFile, readTasks, setTaskDone, taskProgress } from "../src/tasks.js";
import { ensureProjectDirectories } from "../src/registry.js";
import { projectDir } from "../src/paths.js";

const TEST_NAME = "test-tasks-project";

afterEach(() => {
  fs.rmSync(projectDir(TEST_NAME), { recursive: true, force: true });
});

describe("tasks", () => {
  it("writes and parses a checklist from features", () => {
    ensureProjectDirectories(TEST_NAME);
    writeTasksFile(TEST_NAME, ["authentication", "billing"]);
    const tasks = readTasks(TEST_NAME);
    expect(tasks).toEqual([
      { text: "authentication", done: false },
      { text: "billing", done: false },
    ]);
  });

  it("marks a task done and tracks progress", () => {
    ensureProjectDirectories(TEST_NAME);
    writeTasksFile(TEST_NAME, ["authentication", "billing"]);
    setTaskDone(TEST_NAME, "authentication", true);
    expect(taskProgress(TEST_NAME)).toEqual({ done: 1, total: 2 });
  });
});
