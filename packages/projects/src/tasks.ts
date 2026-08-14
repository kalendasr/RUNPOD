import fs from "node:fs";
import { tasksPath } from "./paths.js";

export interface Task {
  text: string;
  done: boolean;
}

const CHECKBOX_PATTERN = /^- \[([ x])\] (.+)$/;

export function writeTasksFile(name: string, features: string[]): void {
  const lines = [
    `# Tasks: ${name}`,
    "",
    ...(features.length > 0
      ? features.map((feature) => `- [ ] ${feature}`)
      : ["- [ ] (no features defined yet)"]),
    "",
  ];
  fs.writeFileSync(tasksPath(name), lines.join("\n"), "utf8");
}

export function readTasks(name: string): Task[] {
  const filePath = tasksPath(name);
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.match(CHECKBOX_PATTERN))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({ done: match[1] === "x", text: match[2] }));
}

export function setTaskDone(name: string, taskText: string, done: boolean): void {
  const filePath = tasksPath(name);
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const updated = lines.map((line) => {
    const match = line.match(CHECKBOX_PATTERN);
    if (match && match[2] === taskText) {
      return `- [${done ? "x" : " "}] ${taskText}`;
    }
    return line;
  });
  fs.writeFileSync(filePath, updated.join("\n"), "utf8");
}

export function taskProgress(name: string): { done: number; total: number } {
  const tasks = readTasks(name);
  return { done: tasks.filter((t) => t.done).length, total: tasks.length };
}
