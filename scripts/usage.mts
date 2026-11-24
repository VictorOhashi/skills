import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

export const DEFAULT_TRANSCRIPTS = path.join(os.homedir(), ".claude", "projects");
export const DEFAULT_STORE = path.join(os.homedir(), ".agents", "usage");
/** Next to this script in the catalog checkout and in the installed build alike. */
export const DEFAULT_CATALOG = path.join(path.dirname(import.meta.dirname), "skills");

/** How the next human prompt after a skill turn reads: a correction, anything else, or no prompt at all. */
export type Reaction = "correction" | "other" | "none";

/** Pointer back to the transcript record, so a retro can read the content locally. */
type Source = { id: string; sessionId: string; file: string; repo: string; at: string };

/**
 * One skill load. Turn metrics cover the records from the load until the next human prompt,
 * so skills loaded in the same turn share them.
 */
export type SkillRun = Source & {
  skill: string;
  /** Hash of the loaded skill text, so runs of different skill versions can be compared. */
  version: string;
  trigger: "model" | "user";
  subagent: boolean;
  endedAt: string;
  outputTokens: number;
  toolCalls: number;
  toolErrors: number;
  interrupted: boolean;
  reaction: Reaction;
};

/** A human prompt or an interruption; only its classification is kept, never its text. */
export type PromptEvent = Source & { kind: "correction" | "other" | "interrupt" };

export type Severity = "blocker" | "should" | "nit" | "pre-existing";

/** A reviewer finding (`R<n> [severity] <path>`); `id` hashes its line so quoted copies count once. */
export type Finding = Source & { severity: Severity; path: string };

export type FailureKind =
  | "exit"
  /** Exit status of commands that only read (`cat`, `grep`, `git log`): usually a search with no match. */
  | "probe"
  | "not-found"
  | "missing-path"
  | "timeout"
  | "blocked"
  | "denied"
  | "outside-worktree"
  | "rejected"
  | "interrupted";

/** A failed shell command; `command` keeps program and subcommand of each step, never arguments. */
export type CommandFailure = Source & { kind: FailureKind; command: string };

export type CheckKind = "preflight" | "push" | "e2e" | "test" | "typecheck" | "lint" | "build" | "ci-wait";

/**
 * A verification command and how long it took: from the call to its result, or to the completion notice when it ran
 * in the background. `outcome` is unknown when the command hides the check's exit code: a pipe without `pipefail`,
 * `|| ...`, or another command after `;`. Permission denials, interruptions and superseded runs are not recorded.
 */
export type CheckRun = Source & {
  kind: CheckKind;
  command: string;
  seconds: number;
  background: boolean;
  outcome: "ok" | "fail" | "unknown";
  /** The command also pushes (`pnpm preflight && git push`), though another check dominates its time. */
  pushes: boolean;
};

export type Usage = {
  runs: SkillRun[];
  prompts: PromptEvent[];
  findings: Finding[];
  failures: CommandFailure[];
  checks: CheckRun[];
};

type Store = Usage & {
  /** Bumped when parsing changes, so the next ingest re-reads every transcript still on disk. */
  version: 7;
  /** Transcript path -> mtime already ingested. */
  files: Record<string, number>;
};

const STORE_VERSION = 7;
const SKILL_HEADER = "Base directory for this skill: ";
const INTERRUPT = "[Request interrupted by user";
const WORKTREE = /\/\.(claude|codex)\/worktrees\/[^/]+/;
// Accents are stripped before matching, so the Portuguese words carry none.
const CORRECTION = /^(nao\b|na verdade|errad|incorret|desfaz|desfaca|revert|volta |volte |pare\b|para de|nao era|nao foi isso|wrong\b|undo\b|stop\b)|\b(esta errad|ta errad|nao e isso|nao pedi|voce errou|you broke|not what i)/;
const FINDING = /(?:^|\n)[ \t>*-]*R\d+ \[(blocker|should|nit|pre-existing)\] `?([^\s`]+)`?[^\n]*/g;
const SUBCOMMANDS = new Set(["pnpm", "npm", "yarn", "bun", "npx", "git", "gh", "docker", "make", "cargo", "go", "flutter", "dart", "uv", "pip", "poetry", "kubectl", "terraform", "supabase"]);
const READ_ONLY = new Set(["cat", "ls", "head", "tail", "grep", "rg", "find", "sed", "awk", "wc", "stat", "file", "tree", "jq", "diff", "git status", "git log", "git show", "git diff", "git rev-parse", "git branch", "git ls-files", "git grep", "git ls-remote"]);
const TRIVIAL = new Set(["cd", "echo", "printf", "sleep", "export", "set", "true", "false", "test", "[", "local", "source", "for", "done", "fi", "case", "esac", "function", "}", ")"]);
/** Shell words that start a step: the program comes right after them. */
const PREFIXES = new Set(["do", "then", "else", "elif", "if", "while", "until", "!", "{", "(", "time", "exec", "env", "timeout"]);
const PROGRAM = /^[\w.@+-]+$/;
/** Flags whose next word is their value, so it is not taken for the subcommand. */
const VALUE_FLAGS = new Set(["--filter", "-F", "-C", "--dir", "--prefix", "--cwd", "--repo", "-R", "--workspace", "-f", "--file", "-p", "--project", "-n", "--namespace", "--context", "-c", "--git-dir", "--work-tree"]);
/** Programs that run a project's checks; the check kind comes from their arguments. */
const RUNNERS = new Set(["pnpm", "npm", "yarn", "bun", "bunx", "npx", "turbo", "nx", "node", "tsx", "make", "cargo", "go", "flutter", "dart", "uv", "pytest", "vitest", "jest", "playwright", "tsc", "eslint", "oxlint", "biome", "ruff", "mypy", "pyright", "gradle", "gradlew", "mvn"]);
/** First match wins, so a step that names several kinds counts as the broadest one. */
const CHECK_WORDS: Array<[CheckKind, RegExp]> = [
  ["preflight", /\bpreflight\b/],
  ["e2e", /\b(e2e|playwright|golden)\b/],
  ["test", /\b(test|tests|vitest|jest|pytest)\b/],
  ["typecheck", /\b(typecheck|tsc|mypy|pyright)\b/],
  ["lint", /\b(lint|oxlint|eslint|biome|ruff|analyze)\b/],
  ["build", /\bbuild\b/],
];
/** Package manager subcommands that change or inspect dependencies instead of running a check. */
const NOT_CHECKS = new Set(["add", "install", "i", "remove", "rm", "uninstall", "why", "view", "info", "outdated", "update", "up", "link", "unlink", "pip"]);
const NOT_RUN = new Set<FailureKind>(["blocked", "denied", "rejected", "interrupted", "outside-worktree"]);
/** Script runners: the check is named by the script file, not by the directories in its path. */
const SCRIPT_RUNNERS = new Set(["node", "tsx"]);
/** When one command runs several checks, it counts as the one that dominates its time. */
const CHECK_ORDER: CheckKind[] = ["preflight", "push", "e2e", "test", "typecheck", "lint", "build", "ci-wait"];
/** Runs longer than this are left out of the times: a stuck process or a delayed completion notice. */
const LATE_SECONDS = 3600;
const NOTICE = /<task-notification>([\s\S]*?)<\/task-notification>/g;

type Line = Record<string, unknown>;
type OpenRun = Omit<SkillRun, "reaction"> & { messages: Set<string> };
type OpenCheck = Omit<CheckRun, "seconds" | "outcome"> & { masked: boolean };

export function parseTranscript(file: string, text: string): Usage {
  const usage: Usage = { runs: [], prompts: [], findings: [], failures: [], checks: [] };
  let open: OpenRun[] = [];
  const checks = new Map<string, OpenCheck>();
  const finish = (check: OpenCheck, at: string, failed: boolean, outcome?: CheckRun["outcome"]): void => {
    const { masked, ...rest } = check;
    const seconds = Math.max(0, (Date.parse(at) - Date.parse(check.at)) / 1000);
    usage.checks.push({ ...rest, seconds, outcome: outcome ?? (failed ? "fail" : masked ? "unknown" : "ok") });
    checks.delete(check.id);
  };
  // Resumed and forked sessions copy earlier records, sometimes more than once.
  const seen = new Set<string>();
  const commands = new Map<string, string>();
  // A session that `cd`s into a subfolder still belongs to the repository it started in.
  let sessionCwd: string | undefined;
  // Subagent transcripts start with the parent's briefing, which is not a human prompt.
  const subagent = file.includes(`${path.sep}subagents${path.sep}`);
  const close = (reaction: Reaction): void => {
    for (const { messages: _messages, ...run } of open) usage.runs.push({ ...run, reaction });
    open = [];
  };

  for (const raw of text.split("\n")) {
    const line = parseLine(raw);
    if (!line) continue;
    if (typeof line.uuid === "string") {
      if (seen.has(line.uuid)) continue;
      seen.add(line.uuid);
    }
    const at = typeof line.timestamp === "string" ? line.timestamp : undefined;
    if (!at) continue;
    if (sessionCwd === undefined && typeof line.cwd === "string" && line.cwd) sessionCwd = line.cwd;
    const repo = repoName(sessionCwd ?? line.cwd);
    const source = (id: string): Source => ({
      id,
      sessionId: typeof line.sessionId === "string" ? line.sessionId : path.basename(file, ".jsonl"),
      file,
      repo,
      at,
    });
    const uuid = typeof line.uuid === "string" ? line.uuid : `${file}:${at}`;
    const message = asRecord(line.message);
    const blocks = Array.isArray(message?.content) ? message.content.map(asRecord) : [];

    for (const text of strings(message?.content)) {
      for (const match of text.matchAll(FINDING)) {
        const severity = match[1] as Severity;
        const finding = match[0].replace(/^[\s>*-]*/, "").replace(/\s+/g, " ").trim();
        const id = createHash("sha256").update(`${repo}\0${finding}`).digest("hex").slice(0, 16);
        usage.findings.push({ ...source(id), severity, path: findingPath(match[2] ?? "", line.cwd) });
      }
    }
    for (const block of blocks) {
      if (block?.type === "tool_use" && block.name === "Bash" && typeof block.id === "string") {
        const input = asRecord(block.input);
        const command = String(input?.command ?? "");
        commands.set(block.id, command);
        const check = checkOf(command);
        if (check) checks.set(block.id, { ...source(block.id), ...check, command: commandSignature(command), background: input?.run_in_background === true });
      }
      if (block?.type === "tool_result" && typeof block.tool_use_id === "string") {
        const check = checks.get(block.tool_use_id);
        if (check && !check.background) {
          const output = strings(block.content).join("\n");
          // A background command answers at once, and so does one moved there after its timeout; its time ends with the completion notice.
          if (/running in background|moved to the background/.test(output)) check.background = true;
          else if (block.is_error === true) {
            const kind = failureKind(output);
            // A denied, blocked or interrupted call never ran the check to its end.
            if (NOT_RUN.has(kind)) checks.delete(check.id);
            // A missing file may be the check's failure or another step's.
            else finish(check, at, true, kind === "missing-path" || kind === "not-found" ? "unknown" : "fail");
          } else finish(check, at, false);
        }
      }
      if (block?.type === "tool_result" && block.is_error === true && typeof block.tool_use_id === "string") {
        const command = commands.get(block.tool_use_id);
        if (command !== undefined) {
          const signature = commandSignature(command);
          const kind = failureKind(strings(block.content).join("\n"));
          const probe = kind === "exit" && signature.split(" && ").every((step) => READ_ONLY.has(step));
          usage.failures.push({ ...source(block.tool_use_id), kind: probe ? "probe" : kind, command: signature });
        }
      }
    }

    if (checks.size > 0) {
      for (const body of noticesOf(line, message)) {
        const check = checks.get(/<tool-use-id>([^<]+)<\/tool-use-id>/.exec(body)?.[1] ?? "");
        if (!check?.background) continue;
        const status = /<status>([^<]+)<\/status>/.exec(body)?.[1];
        const summary = /<summary>([\s\S]*?)<\/summary>/.exec(body)?.[1] ?? "";
        const exit = [...summary.matchAll(/exit code (\d+)/g)].at(-1)?.[1];
        // A run stopped or replaced by the agent did not finish its check.
        if (status === "killed" || status === "stopped") checks.delete(check.id);
        else finish(check, at, status === "failed" || (exit !== undefined && exit !== "0"));
      }
    }

    const sidechain = subagent || line.isSidechain === true;
    const human = sidechain ? undefined : humanPrompt(line);
    if (human !== undefined) {
      const correction = isCorrection(human);
      usage.prompts.push({ ...source(uuid), kind: correction ? "correction" : "other" });
      close(correction ? "correction" : "other");
      continue;
    }
    if (!sidechain && line.type === "user" && textOf(message?.content).startsWith(INTERRUPT)) {
      usage.prompts.push({ ...source(uuid), kind: "interrupt" });
    }
    const loaded = skillLoad(line);
    if (loaded) {
      open.push({
        ...source(uuid),
        skill: loaded.skill,
        version: loaded.version,
        trigger: typeof line.sourceToolUseID === "string" ? "model" : "user",
        subagent,
        endedAt: at,
        outputTokens: 0,
        toolCalls: 0,
        toolErrors: 0,
        interrupted: false,
        messages: new Set(),
      });
      continue;
    }
    for (const run of open) {
      run.endedAt = at;
      addMetrics(run, line, blocks);
    }
  }
  close("none");
  return usage;
}

function addMetrics(run: OpenRun, line: Line, blocks: Array<Line | undefined>): void {
  const message = asRecord(line.message);
  if (line.type === "assistant" && message) {
    // Claude Code writes one record per content block, each repeating the message usage.
    const id = typeof message.id === "string" ? message.id : undefined;
    if (id && !run.messages.has(id)) {
      run.messages.add(id);
      run.outputTokens += Number(asRecord(message.usage)?.output_tokens ?? 0) || 0;
    }
    run.toolCalls += blocks.filter((block) => block?.type === "tool_use").length;
  }
  if (line.type === "user") {
    run.toolErrors += blocks.filter((block) => block?.type === "tool_result" && block.is_error === true).length;
    if (textOf(message?.content).startsWith(INTERRUPT)) run.interrupted = true;
  }
}

/**
 * Completion notices of background tasks. Claude Code records each one as a queue entry when it arrives and again
 * when the session reads it, as an attachment or a user message; the first record carries the real end time.
 */
function noticesOf(line: Line, message: Line | undefined): string[] {
  const texts: string[] = [];
  if (line.type === "queue-operation" && line.operation === "enqueue" && typeof line.content === "string") texts.push(line.content);
  const attachment = asRecord(line.attachment);
  if (line.type === "attachment" && attachment?.type === "queued_command" && typeof attachment.prompt === "string") texts.push(attachment.prompt);
  // Text blocks only: a tool result that prints a notice is output, not a notice.
  if (line.type === "user") texts.push(textOf(message?.content));
  return texts.flatMap((text) => [...text.matchAll(NOTICE)].map((match) => match[1] ?? ""));
}

function skillLoad(line: Line): { skill: string; version: string } | undefined {
  if (line.type !== "user" || line.isMeta !== true) return undefined;
  const text = textOf(asRecord(line.message)?.content);
  if (!text.startsWith(SKILL_HEADER)) return undefined;
  const newline = text.indexOf("\n");
  const skill = path.basename(text.slice(SKILL_HEADER.length, newline === -1 ? undefined : newline).trim());
  if (!skill) return undefined;
  // Claude Code appends the invocation arguments to the loaded skill text.
  const body = (newline === -1 ? "" : text.slice(newline + 1)).replace(/\n+ARGUMENTS: [\s\S]*$/, "").trimEnd();
  return { skill, version: createHash("sha256").update(body).digest("hex").slice(0, 12) };
}

/** Text the user typed, or undefined for tool results, reminders, notifications, compaction and other harness messages. */
function humanPrompt(line: Line): string | undefined {
  if (line.type !== "user" || line.isMeta === true || line.isCompactSummary === true || line.toolUseResult !== undefined) return undefined;
  const text = textOf(asRecord(line.message)?.content);
  const origin = asRecord(line.origin)?.kind ?? line.origin;
  if (origin === "human" || line.turnOrigin === "human") return text.replace(/<([a-z-]+)>[\s\S]*?<\/\1>/g, "").trim();
  if (origin !== undefined || line.turnOrigin !== undefined) return undefined;
  // Transcripts written before origin was recorded.
  if (!text || text.startsWith("<") || text.startsWith("[") || text.startsWith("This session is being continued")) return undefined;
  return text;
}

export function isCorrection(prompt: string): boolean {
  const normalized = prompt.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().slice(0, 300);
  return CORRECTION.test(normalized);
}

export function failureKind(output: string): FailureKind {
  if (output.startsWith("<tool_use_error>Blocked")) return "blocked";
  if (/^Permission for this (action|command) was denied|auto mode classifier/.test(output)) return "denied";
  if (/is isolated in the worktree/.test(output.slice(0, 200))) return "outside-worktree";
  if (output.startsWith("The user doesn't want to proceed")) return "rejected";
  if (output.startsWith("[Tool call interrupted")) return "interrupted";
  if (/command not found|: not found\b/.test(output)) return "not-found";
  if (/No such file or directory|ENOENT/.test(output)) return "missing-path";
  if (/^Command timed out|timed out after/i.test(output)) return "timeout";
  return "exit";
}

/** Separator after the step (`&&`, `||`, `|`, `|&`, `;`, newline), and whether another step follows. */
type Step = { program: string; args: string[]; next: string | undefined; last: boolean; orAfter: boolean };

/** The shell text with heredoc bodies and quoted text replaced, since they are data. */
function shellText(command: string): string {
  return command
    .split("\n")
    .reduce<{ lines: string[]; heredoc: string | undefined }>((state, line) => {
      if (state.heredoc !== undefined) return line.trim() === state.heredoc ? { ...state, heredoc: undefined } : state;
      const marker = /<<-?\s*['"]?(\w+)['"]?/.exec(line);
      return { lines: [...state.lines, line], heredoc: marker?.[1] };
    }, { lines: [], heredoc: undefined })
    .lines.join("\n")
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"|\$\([^)]*\)/g, "x");
}

/** The simple commands of a shell line; `last` is set before trivial commands are dropped, since `echo` and the like set the exit status too. */
function shellSteps(command: string): Step[] {
  const parts = shellText(command).split(/(&&|\|\||\|&|;|\||\n)/);
  const steps: Step[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const words = (parts[index] ?? "").trim().split(/\s+/).filter(Boolean);
    while (words[0] && (/^\w+=/.test(words[0]) || PREFIXES.has(words[0]))) {
      // `timeout 600 pnpm test`: the duration and the flags before it are not the program.
      if (words.shift() === "timeout") while (words[0] && (words[0].startsWith("-") || /^\d/.test(words[0]))) words.shift();
    }
    if (words[0]) steps.push({ program: path.basename(words[0]), args: words.slice(1), next: parts[index + 1], last: false, orAfter: false });
  }
  const final = steps.at(-1);
  if (final) final.last = true;
  // `check && echo ok || echo failed`: an `||` anywhere after a step decides the exit status.
  let or = false;
  for (const step of [...steps].reverse()) {
    step.orAfter = or;
    if (step.next === "||") or = true;
  }
  return steps.filter((step) => PROGRAM.test(step.program) && !TRIVIAL.has(step.program));
}

/** Program, plus subcommand for tools that have one, of each meaningful step: `pnpm test && gh pr`. */
export function commandSignature(command: string): string {
  const steps: string[] = [];
  for (const { program, args } of shellSteps(command)) {
    const sub = SUBCOMMANDS.has(program) ? subcommand(args) : undefined;
    const step = sub ? `${program} ${sub}` : program;
    if (!steps.includes(step)) steps.push(step);
  }
  return steps.slice(0, 4).join(" && ") || "(shell)";
}

/** The verification a command runs, if any, and whether the command hides that step's exit code. */
export function checkOf(command: string): { kind: CheckKind; masked: boolean; pushes: boolean } | undefined {
  const shell = shellText(command);
  const pipefail = /\bset\s+-\w*o\s+pipefail\b/.test(shell);
  const errexit = /\bset\s+-\w*e/.test(shell);
  let found: { kind: CheckKind; masked: boolean } | undefined;
  let pushes = false;
  for (const { program, args, next, last, orAfter } of shellSteps(command)) {
    // Flag values (`--filter test-kit`) name targets, not the check.
    const words = args.filter((word, index) => !word.startsWith("-") && !VALUE_FLAGS.has(args[index - 1] ?? ""));
    const text = SCRIPT_RUNNERS.has(program) ? path.basename(words[0] ?? "") : words.join(" ");
    let kind: CheckKind | undefined;
    if (program === "git" && subcommand(args) === "push") kind = "push", pushes = true;
    else if ((program === "gh" && /^(pr checks|run watch)/.test(text) && (args.includes("--watch") || text.startsWith("run watch"))) || (/\bpr-state\.mts\b/.test(text) && args.includes("--wait"))) kind = "ci-wait";
    else if (SCRIPT_RUNNERS.has(program) && args.includes("--test")) kind = "test";
    else if (NOT_CHECKS.has(subcommand(args) ?? "") || /\bplaywright (install|show-report|codegen)\b/.test(text)) kind = undefined;
    else if (RUNNERS.has(program) || /preflight/.test(program)) kind = CHECK_WORDS.find(([, pattern]) => pattern.test(`${program} ${text}`))?.[0];
    if (!kind || (found && CHECK_ORDER.indexOf(kind) >= CHECK_ORDER.indexOf(found.kind))) continue;
    const masked = next === "||" || orAfter || ((next === "|" || next === "|&") && !pipefail) || ((next === ";" || next === "\n") && !last && !errexit);
    found = { kind, masked };
  }
  return found && { ...found, pushes };
}

function subcommand(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const word = args[index] ?? "";
    if (VALUE_FLAGS.has(word)) index += 1;
    // Anything else in that position is an argument (a path, a namespace, `k=v`), which is never kept.
    else if (!word.startsWith("-")) return /^[a-z][\w:-]*$/.test(word) ? word : undefined;
  }
  return undefined;
}

/**
 * Path relative to the repository: worktree prefixes and absolute checkout paths are dropped, line numbers too.
 * Empty when the token after the severity is not a path (a title, a dash).
 */
function findingPath(raw: string, cwd: unknown): string {
  let value = raw.replace(/[),.;*]+$/, "").replace(/:[\d,-]+$/, "").replace(/:$/, "");
  if (!value.includes("/") && !/^[\w@.-]+\.[A-Za-z0-9]+$/.test(value)) return "";
  if (value.startsWith("/")) {
    const worktree = WORKTREE.exec(value);
    if (worktree) value = value.slice(worktree.index + worktree[0].length + 1);
    else if (typeof cwd === "string" && value.startsWith(cwd.replace(WORKTREE, "") + "/")) value = value.slice(cwd.replace(WORKTREE, "").length + 1);
  }
  return value;
}

function repoName(cwd: unknown): string {
  if (typeof cwd !== "string" || !cwd) return "(unknown)";
  return path.basename(cwd.replace(new RegExp(`${WORKTREE.source}.*`), ""));
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(asRecord)
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block?.text as string)
    .join("");
}

/** Every string inside a content value: text blocks, tool inputs (hand-backs, messages) and tool results. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) strings(item, out);
  else if (typeof value === "object" && value !== null) for (const item of Object.values(value)) strings(item, out);
  return out;
}

function parseLine(raw: string): Line | undefined {
  if (!raw.trim()) return undefined;
  try {
    return asRecord(JSON.parse(raw));
  } catch {
    // A transcript being written can end in a partial line.
    return undefined;
  }
}

function asRecord(value: unknown): Line | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Line) : undefined;
}

/**
 * Reads transcripts changed since the last ingest into `<storeDir>/usage.json`.
 * Entries stay in the store after Claude Code deletes old transcripts.
 */
export async function ingestUsage(storeDir: string, transcriptsRoot: string): Promise<Usage> {
  const storePath = path.join(storeDir, "usage.json");
  const store = await loadStore(storePath);
  const changed = new Map<string, Usage>();
  for (const file of await transcriptFiles(transcriptsRoot)) {
    const info = await stat(file).catch(ignoreMissing);
    if (!info || store.files[file] === info.mtimeMs) continue;
    // Claude Code may delete a transcript between listing and reading it.
    const text = await readFile(file, "utf8").catch(ignoreMissing);
    if (text === undefined) continue;
    changed.set(file, parseTranscript(file, text));
    store.files[file] = info.mtimeMs;
  }
  if (changed.size === 0) return store;
  const merge = <T extends Source>(kept: T[], pick: (usage: Usage) => T[], keepLater: (a: T, b: T) => boolean): T[] =>
    dedupe([...kept.filter((entry) => !changed.has(entry.file)), ...[...changed.values()].flatMap(pick)], keepLater);
  store.runs = merge(store.runs, (usage) => usage.runs, (a, b) => a.endedAt > b.endedAt);
  store.prompts = merge(store.prompts, (usage) => usage.prompts, () => false);
  store.findings = merge(store.findings, (usage) => usage.findings, (a, b) => a.at < b.at);
  store.failures = merge(store.failures, (usage) => usage.failures, () => false);
  store.checks = merge(store.checks, (usage) => usage.checks, () => false);
  await mkdir(storeDir, { recursive: true });
  const tmp = `${storePath}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(store));
  await rename(tmp, storePath);
  return store;
}

/** A resumed or forked session repeats records of the original in another transcript. */
function dedupe<T extends Source>(entries: T[], replaces: (candidate: T, existing: T) => boolean): T[] {
  const byId = new Map<string, T>();
  for (const entry of entries) {
    const existing = byId.get(entry.id);
    if (!existing || replaces(entry, existing)) byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));
}

async function loadStore(storePath: string): Promise<Store> {
  const empty = (): Store => ({ version: STORE_VERSION, files: {}, runs: [], prompts: [], findings: [], failures: [], checks: [] });
  const text = await readFile(storePath, "utf8").catch(ignoreMissing);
  if (text === undefined) return empty();
  const raw = JSON.parse(text) as Partial<Store>;
  if (raw.version === STORE_VERSION && raw.files) return { ...empty(), ...raw } as Store;
  // Another parser version: re-read the transcripts still on disk, keep the entries of deleted ones.
  const store = empty();
  const gone = async (entry: Source): Promise<boolean> => !(await stat(entry.file).then(() => true, () => false));
  for (const key of ["runs", "prompts", "findings", "failures", "checks"] as const) {
    const entries = Array.isArray(raw[key]) ? (raw[key] as Source[]) : [];
    const kept: Source[] = [];
    for (const entry of entries) if (typeof entry?.file === "string" && (await gone(entry))) kept.push(entry);
    (store[key] as Source[]) = kept;
  }
  return store;
}

async function transcriptFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const visit = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(ignoreMissing);
    for (const entry of entries ?? []) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(full);
    }
  };
  await visit(root);
  return files.sort();
}

function ignoreMissing(error: unknown): undefined {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
  throw error;
}

// Reports

export type SkillStats = {
  skill: string;
  inCatalog: boolean;
  runs: number;
  userRuns: number;
  sessions: number;
  repos: number;
  versions: number;
  medianSeconds: number;
  medianOutputTokens: number;
  /** Tool results flagged as errors over tool calls, in turns where the skill loaded. */
  toolErrorRate: number;
  interruptRate: number;
  /** Turns whose next human prompt reads as a correction, over turns with a next prompt. */
  correctionRate: number;
  lastUsed: string;
};

export type VersionStats = Omit<SkillStats, "skill" | "inCatalog" | "versions"> & { version: string; firstUsed: string };

export type RepoStats = {
  repo: string;
  sessions: number;
  prompts: number;
  correctionRate: number;
  interrupts: number;
  blockers: number;
  shoulds: number;
  /** Failed commands, reads with no result (`probe`) left out. */
  failures: number;
  /** Time spent in verification commands (checks, pushes, CI waits). */
  checkHours: number;
  lastActive: string;
};

export type AreaStats = { area: string; blockers: number; shoulds: number; sessions: number; last: string };
export type FailureStats = { kind: FailureKind; command: string; count: number; sessions: number; last: string };
export type CheckStats = {
  kind: CheckKind;
  runs: number;
  background: number;
  sessions: number;
  /** Time stats leave out `late` runs: longer than an hour, a stuck process or a delayed notice. */
  late: number;
  medianSeconds: number;
  p90Seconds: number;
  totalHours: number;
  failRate: number;
  /** Runs whose command hides the exit code (pipe without pipefail, `|| ...`, a command after `;`): their failures do not show. */
  unknownRate: number;
  /** Runs of this kind per session that ran it. */
  medianPerSession: number;
  p90PerSession: number;
};

export function since<T extends Source>(entries: T[], from: Date): T[] {
  const iso = from.toISOString();
  return entries.filter((entry) => entry.at >= iso);
}

export function skillReport(runs: SkillRun[], catalog: string[]): { skills: SkillStats[]; unused: string[] } {
  const bySkill = groupBy(runs, (run) => run.skill);
  const skills = [...bySkill].map(([skill, group]): SkillStats => ({
    skill,
    inCatalog: catalog.includes(skill),
    ...runMetrics(group),
    versions: new Set(group.map((run) => run.version)).size,
  }));
  skills.sort((a, b) => b.runs - a.runs || a.skill.localeCompare(b.skill));
  return { skills, unused: catalog.filter((name) => !bySkill.has(name)).sort() };
}

export function versionReport(runs: SkillRun[], skill: string): VersionStats[] {
  return [...groupBy(runs.filter((run) => run.skill === skill), (run) => run.version)]
    .map(([version, group]) => ({ version, ...runMetrics(group), firstUsed: group[0]?.at ?? "" }))
    .sort((a, b) => a.firstUsed.localeCompare(b.firstUsed));
}

function runMetrics(group: SkillRun[]) {
  const toolCalls = sum(group.map((run) => run.toolCalls));
  const reacted = group.filter((run) => run.reaction !== "none");
  return {
    runs: group.length,
    userRuns: group.filter((run) => run.trigger === "user").length,
    sessions: new Set(group.map((run) => run.sessionId)).size,
    repos: new Set(group.map((run) => run.repo)).size,
    medianSeconds: median(group.map((run) => (Date.parse(run.endedAt) - Date.parse(run.at)) / 1000)),
    medianOutputTokens: median(group.map((run) => run.outputTokens)),
    toolErrorRate: toolCalls === 0 ? 0 : sum(group.map((run) => run.toolErrors)) / toolCalls,
    interruptRate: group.filter((run) => run.interrupted).length / group.length,
    correctionRate: reacted.length === 0 ? 0 : reacted.filter((run) => run.reaction === "correction").length / reacted.length,
    lastUsed: group.reduce((last, run) => (run.at > last ? run.at : last), ""),
  };
}

export function repoReport(usage: Usage): RepoStats[] {
  const repos = new Set([...usage.prompts, ...usage.findings, ...usage.failures, ...usage.checks].map((entry) => entry.repo));
  return [...repos]
    .map((repo): RepoStats => {
      const prompts = usage.prompts.filter((entry) => entry.repo === repo);
      const typed = prompts.filter((entry) => entry.kind !== "interrupt");
      const findings = usage.findings.filter((entry) => entry.repo === repo);
      const failures = usage.failures.filter((entry) => entry.repo === repo);
      const checks = usage.checks.filter((entry) => entry.repo === repo);
      const all = [...prompts, ...findings, ...failures, ...checks];
      const realFailures = failures.filter((entry) => entry.kind !== "probe");
      return {
        repo,
        sessions: new Set(all.map((entry) => entry.sessionId)).size,
        prompts: typed.length,
        correctionRate: typed.length === 0 ? 0 : typed.filter((entry) => entry.kind === "correction").length / typed.length,
        interrupts: prompts.length - typed.length,
        blockers: findings.filter((entry) => entry.severity === "blocker").length,
        shoulds: findings.filter((entry) => entry.severity === "should").length,
        failures: realFailures.length,
        checkHours: sum(checks.map((entry) => entry.seconds).filter((value) => value <= LATE_SECONDS)) / 3600,
        lastActive: all.reduce((last, entry) => (entry.at > last ? entry.at : last), ""),
      };
    })
    .sort((a, b) => b.sessions - a.sessions || a.repo.localeCompare(b.repo));
}

/** Blocker and should findings grouped by directory, up to `depth` segments: where reviews keep finding problems. */
export function areaReport(findings: Finding[], depth = 3): AreaStats[] {
  const relevant = findings.filter((entry) => entry.severity === "blocker" || entry.severity === "should");
  const area = (entry: Finding): string => {
    if (!entry.path) return "(no path)";
    if (!entry.path.includes("/")) return entry.path;
    return path.posix.dirname(entry.path).split("/").slice(0, depth).join("/");
  };
  return [...groupBy(relevant, area)]
    .map(([area, group]) => ({
      area,
      blockers: group.filter((entry) => entry.severity === "blocker").length,
      shoulds: group.filter((entry) => entry.severity === "should").length,
      sessions: new Set(group.map((entry) => entry.sessionId)).size,
      last: group.at(-1)?.at ?? "",
    }))
    .sort((a, b) => b.sessions - a.sessions || b.blockers + b.shoulds - (a.blockers + a.shoulds));
}

export function failureReport(failures: CommandFailure[]): FailureStats[] {
  return [...groupBy(failures, (entry) => `${entry.kind}\0${entry.command}`)]
    .map(([, group]) => ({
      kind: group[0]?.kind ?? "exit",
      command: group[0]?.command ?? "",
      count: group.length,
      sessions: new Set(group.map((entry) => entry.sessionId)).size,
      last: group.at(-1)?.at ?? "",
    }))
    .sort((a, b) => b.sessions - a.sessions || b.count - a.count);
}

export type SessionChecks = { file: string; kind: CheckKind; runs: number; pushes: number; last: string };

/** Sessions that ran `kind` most, with their pushes: more runs than pushes means the gate ran again before publishing. */
export function busiestSessions(checks: CheckRun[], kind: CheckKind, limit = 10): SessionChecks[] {
  return [...groupBy(checks, (entry) => entry.sessionId).values()]
    .map((group) => ({
      file: group[0]?.file ?? "",
      kind,
      runs: group.filter((entry) => entry.kind === kind).length,
      pushes: group.filter((entry) => entry.kind === "push" || entry.pushes).length,
      last: group.at(-1)?.at ?? "",
    }))
    .filter((session) => session.runs > 0)
    .sort((a, b) => b.runs - b.pushes - (a.runs - a.pushes) || b.runs - a.runs)
    .slice(0, limit);
}

export function checkReport(checks: CheckRun[]): CheckStats[] {
  return [...groupBy(checks, (entry) => entry.kind)]
    .map(([kind, group]): CheckStats => {
      const seconds = group.map((entry) => entry.seconds).filter((value) => value <= LATE_SECONDS);
      const perSession = [...groupBy(group, (entry) => entry.sessionId).values()].map((runs) => runs.length);
      return {
        kind: kind as CheckKind,
        runs: group.length,
        background: group.filter((entry) => entry.background).length,
        sessions: perSession.length,
        late: group.length - seconds.length,
        medianSeconds: median(seconds),
        p90Seconds: percentile(seconds, 0.9),
        totalHours: sum(seconds) / 3600,
        failRate: group.filter((entry) => entry.outcome === "fail").length / group.length,
        unknownRate: group.filter((entry) => entry.outcome === "unknown").length / group.length,
        medianPerSession: median(perSession),
        p90PerSession: percentile(perSession, 0.9),
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);
}

export function parseSince(value: string | undefined, now = new Date()): Date {
  const raw = value ?? "30d";
  const match = /^(\d+)d$/.exec(raw);
  if (match) return new Date(now.getTime() - Number(match[1]) * 86_400_000);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid --since: ${raw}. Use <days>d or an ISO date`);
  return date;
}

export function table(header: string[], rows: string[][]): string[] {
  const widths = header.map((title, index) => Math.max(title.length, ...rows.map((row) => row[index]?.length ?? 0)));
  const render = (cells: string[]): string =>
    cells.map((cell, index) => (index === 0 ? cell.padEnd(widths[index] ?? 0) : cell.padStart(widths[index] ?? 0))).join("  ");
  return [render(header), ...rows.map(render)];
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;
const day = (iso: string): string => iso.slice(0, 10);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function percentile(values: number[], rank: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // Nearest rank: the smallest value with at least `rank` of the values at or below it.
  return sorted[Math.max(0, Math.ceil(rank * sorted.length) - 1)] ?? 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

async function catalogNames(dir: string): Promise<string[]> {
  const names: string[] = [];
  for (const entry of (await readdir(dir, { withFileTypes: true }).catch(ignoreMissing)) ?? []) {
    if (entry.isDirectory() && (await stat(path.join(dir, entry.name, "SKILL.md")).then(() => true, () => false))) names.push(entry.name);
  }
  return names.sort();
}

const USAGE = `Usage:
  usage.mts skills [--skill <name>] [--since 30d] [--json]
  usage.mts repos [--repo <name>] [--since 30d] [--json]
Options: --transcripts <dir> (default ~/.claude/projects), --store <dir> (default ~/.agents/usage), --catalog <skills dir>`;

export async function main(argv: string[], print: (line: string) => void = console.log): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      skill: { type: "string" },
      repo: { type: "string" },
      since: { type: "string" },
      json: { type: "boolean" },
      transcripts: { type: "string" },
      store: { type: "string" },
      catalog: { type: "string" },
    },
  });
  const [command, ...rest] = positionals;
  if ((command !== "skills" && command !== "repos") || rest.length > 0) throw new Error(USAGE);
  const all = await ingestUsage(values.store ?? DEFAULT_STORE, values.transcripts ?? DEFAULT_TRANSCRIPTS);
  const from = parseSince(values.since);
  const usage: Usage = { runs: since(all.runs, from), prompts: since(all.prompts, from), findings: since(all.findings, from), failures: since(all.failures, from), checks: since(all.checks, from) };
  const emit = (value: unknown, lines: () => string[]): number => {
    if (values.json) print(JSON.stringify(value, null, 2));
    else for (const line of lines()) print(line);
    return 0;
  };

  if (command === "skills" && values.skill) {
    const skill = values.skill;
    const versions = versionReport(usage.runs, skill);
    const recent = usage.runs.filter((run) => run.skill === skill).slice(-20).reverse();
    return emit({ skill, since: from.toISOString(), versions, recent }, () => [
      `${skill}: ${versions.length} versions since ${day(from.toISOString())}`,
      ...table(["version", "first", "last", "runs", "turn s", "turn out", "tool err", "interr", "correct"], versions.map((stats) => [
        stats.version, day(stats.firstUsed), day(stats.lastUsed), String(stats.runs), String(Math.round(stats.medianSeconds)),
        String(Math.round(stats.medianOutputTokens)), percent(stats.toolErrorRate), percent(stats.interruptRate), percent(stats.correctionRate),
      ])),
      "recent runs (repo, reaction, transcript):",
      ...recent.map((run) => `  ${run.at.slice(0, 16)}  ${run.repo}  ${run.reaction}  ${run.file}`),
    ]);
  }
  if (command === "skills") {
    const report = skillReport(usage.runs, await catalogNames(values.catalog ?? DEFAULT_CATALOG));
    return emit({ since: from.toISOString(), ...report }, () => [
      `since ${day(from.toISOString())}: ${usage.runs.length} skill runs`,
      ...table(["skill", "runs", "user", "sess", "repos", "vers", "turn s", "turn out", "tool err", "interr", "correct", "last"], report.skills.map((stats) => [
        stats.inCatalog ? stats.skill : `${stats.skill} *`, String(stats.runs), String(stats.userRuns), String(stats.sessions), String(stats.repos),
        String(stats.versions), String(Math.round(stats.medianSeconds)), String(Math.round(stats.medianOutputTokens)),
        percent(stats.toolErrorRate), percent(stats.interruptRate), percent(stats.correctionRate), day(stats.lastUsed),
      ])),
      ...(report.skills.some((stats) => !stats.inCatalog) ? ["* not in the catalog: bundled, plugin or retired skill"] : []),
      ...(report.unused.length > 0 ? [`unused catalog skills: ${report.unused.join(", ")}`] : []),
    ]);
  }
  if (values.repo) {
    const repo = values.repo;
    const only = <T extends Source>(entries: T[]): T[] => entries.filter((entry) => entry.repo === repo);
    const areas = areaReport(only(usage.findings));
    const failures = failureReport(only(usage.failures));
    const probes = failures.filter((stats) => stats.kind === "probe");
    const corrections = only(usage.prompts).filter((entry) => entry.kind === "correction").slice(-15).reverse();
    const findings = only(usage.findings).filter((entry) => entry.severity === "blocker" || entry.severity === "should").slice(-15).reverse();
    const recentFailures = only(usage.failures).filter((entry) => entry.kind !== "probe").slice(-15).reverse();
    const checks = checkReport(only(usage.checks));
    const gate = checks.find((stats) => stats.kind !== "push" && stats.kind !== "ci-wait")?.kind;
    const busiest = gate ? busiestSessions(only(usage.checks), gate) : [];
    const slowest = only(usage.checks).filter((entry) => entry.seconds <= LATE_SECONDS).sort((a, b) => b.seconds - a.seconds).slice(0, 10);
    return emit({ repo, since: from.toISOString(), checks, busiest, slowest, areas, failures, corrections, findings, recentFailures }, () => [
      `${repo} since ${day(from.toISOString())}`,
      "verification time (checks, pushes, CI waits):",
      ...table(["kind", "runs", "bg", "late", "sess", "p50 s", "p90 s", "total h", "fail", "unknown", "per sess p50", "p90"], checks.map((stats) => [
        stats.kind, String(stats.runs), String(stats.background), String(stats.late), String(stats.sessions), String(Math.round(stats.medianSeconds)), String(Math.round(stats.p90Seconds)),
        stats.totalHours.toFixed(1), percent(stats.failRate), percent(stats.unknownRate), String(stats.medianPerSession), String(stats.p90PerSession),
      ])),
      ...(checks.some((stats) => stats.unknownRate > 0) ? ["unknown: the command hides the exit code (pipe without pipefail, `|| ...`, a command after `;`), so a failure would not show"] : []),
      ...(checks.some((stats) => stats.late > 0) ? ["late: over an hour, left out of the times (stuck process or delayed notice)"] : []),
      "review findings by area (blocker and should):",
      ...table(["area", "blocker", "should", "sess", "last"], areas.slice(0, 15).map((stats) => [stats.area, String(stats.blockers), String(stats.shoulds), String(stats.sessions), day(stats.last)])),
      `failed commands (${sum(probes.map((stats) => stats.count))} failed reads left out; see --json):`,
      ...table(["kind", "command", "count", "sess", "last"], failures.filter((stats) => stats.kind !== "probe").slice(0, 15).map((stats) => [stats.kind, stats.command, String(stats.count), String(stats.sessions), day(stats.last)])),
      "recent corrections (transcript, record):",
      ...corrections.map((entry) => `  ${entry.at.slice(0, 16)}  ${entry.file}  ${entry.id}`),
      "recent blocker and should findings (transcript):",
      ...findings.map((entry) => `  ${entry.at.slice(0, 16)}  ${entry.severity}  ${entry.path}  ${entry.file}`),
      "recent failed commands (transcript, tool call):",
      ...recentFailures.map((entry) => `  ${entry.at.slice(0, 16)}  ${entry.kind}  ${entry.command}  ${entry.file}  ${entry.id}`),
      ...(gate ? [`sessions that ran ${gate} most (runs, pushes, transcript):`] : []),
      ...busiest.map((session) => `  ${session.last.slice(0, 16)}  ${session.runs}  ${session.pushes}  ${session.file}`),
      "slowest checks (transcript, tool call):",
      ...slowest.map((entry) => `  ${entry.at.slice(0, 16)}  ${entry.kind}  ${Math.round(entry.seconds)} s  ${entry.outcome}  ${entry.file}  ${entry.id}`),
    ]);
  }
  const repos = repoReport(usage);
  return emit({ since: from.toISOString(), repos }, () => [
    `since ${day(from.toISOString())}: ${repos.length} repositories`,
    ...table(["repo", "sess", "prompts", "correct", "interr", "blocker", "should", "cmd fail", "check h", "last"], repos.map((stats) => [
      stats.repo, String(stats.sessions), String(stats.prompts), percent(stats.correctionRate), String(stats.interrupts),
      String(stats.blockers), String(stats.shoulds), String(stats.failures), stats.checkHours.toFixed(1), day(stats.lastActive),
    ])),
  ]);
}

if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
