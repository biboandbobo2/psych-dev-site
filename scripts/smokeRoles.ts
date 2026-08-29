/**
 * HP-2, точка входа ролевого e2e-стенда: одна команда поднимает эмулятор,
 * сидит песочницу, поднимает dev-сервер и гоняет ролевые Playwright-проекты.
 *
 *   npm run smoke:roles -- [--roles author,superadmin] [--project a] [--reset] [--keep]
 *
 * Reuse-if-running: занятые порты (8080/9099 эмулятора, 4180 dev-сервера)
 * считаются чужими и не трогаются — так параллельные субагенты делят один
 * эмулятор. Гасится только то, что подняли мы сами.
 *
 * Изоляция прогонов — через --project: Firestore-эмулятор держит несколько
 * проектов, auth-пользователи всегда живут в default-проекте (см. комментарий
 * в tests/e2e/fixtures/roles.ts).
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SMOKE_AUTH_PROJECT, SMOKE_DEV_PORT, sandboxProjectId } from "../tests/e2e/fixtures/roles";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Роли со сценарными спеками — тот же список, что в playwright.config.ts. */
const SCENARIO_KEYS = ["author", "admin-empty", "superadmin", "student-group"];
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;
const WAIT_TIMEOUT_MS = 60_000;
const TAIL_LINES = 40;

const USAGE = `Ролевой e2e-стенд (HP-2).

  npm run smoke:roles -- [опции]

  --roles <a,b>    роли для прогона (по умолчанию: ${SCENARIO_KEYS.join(",")})
  --project <id>   песочница Firestore: суффикс (a → demo-smoke-a) или полный id
  --reset          очистить песочницу перед сидом
  --keep           не гасить эмулятор и dev-сервер после прогона
  --help           эта справка
`;

interface Options {
  roles: string[];
  project: string;
  reset: boolean;
  keep: boolean;
}

interface Managed {
  name: string;
  child: ChildProcess;
  alive: boolean;
  tail: string[];
}

const managed: Managed[] = [];
let shuttingDown = false;
let keepAlive = false;

function parseArgs(argv: string[]): Options | null {
  const opts: Options = { roles: [...SCENARIO_KEYS], project: SMOKE_AUTH_PROJECT, reset: false, keep: false };
  const value = (flag: string, inline: string | undefined, next: string | undefined): string => {
    const raw = inline ?? next;
    if (!raw) throw new Error(`${flag} требует значение`);
    return raw;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.startsWith("--") && arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, undefined];
    if (flag === "--help" || flag === "-h") return null;
    else if (flag === "--reset") opts.reset = true;
    else if (flag === "--keep") opts.keep = true;
    else if (flag === "--roles") {
      const raw = value(flag, inline, argv[i + 1]);
      if (inline === undefined) i += 1;
      opts.roles = raw.split(",").map((r) => r.trim()).filter(Boolean);
    } else if (flag === "--project") {
      const raw = value(flag, inline, argv[i + 1]);
      if (inline === undefined) i += 1;
      opts.project = sandboxProjectId(raw);
    } else {
      throw new Error(`Неизвестный аргумент: ${arg}`);
    }
  }
  const unknown = opts.roles.filter((r) => !SCENARIO_KEYS.includes(r));
  if (unknown.length) {
    throw new Error(`Неизвестные роли: ${unknown.join(", ")}. Доступны: ${SCENARIO_KEYS.join(", ")}`);
  }
  if (!opts.roles.length) throw new Error("--roles не должен быть пустым");
  return opts;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function isPortOpenOn(host: string, port: number): Promise<boolean> {
  return new Promise((res) => {
    const socket = createConnection({ host, port });
    const done = (open: boolean) => {
      socket.destroy();
      res(open);
    };
    socket.setTimeout(500);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

/** vite по умолчанию слушает ::1 на macOS, эмулятор — 127.0.0.1: проверяем оба. */
async function isPortOpen(port: number): Promise<boolean> {
  const [v4, v6] = await Promise.all([isPortOpenOn("127.0.0.1", port), isPortOpenOn("::1", port)]);
  return v4 || v6;
}

async function waitForPorts(ports: number[], what: string, proc: Managed): Promise<void> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!proc.alive) {
      console.error(proc.tail.join("\n"));
      throw new Error(`${what} завершился раньше времени`);
    }
    const states = await Promise.all(ports.map(isPortOpen));
    if (states.every(Boolean)) return;
    await sleep(400);
  }
  console.error(proc.tail.join("\n"));
  throw new Error(`${what} не поднялся за ${WAIT_TIMEOUT_MS / 1000}с (порты ${ports.join(", ")})`);
}

/** detached: своя process group, чтобы гасить всё дерево через kill(-pid). */
function start(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}): Managed {
  const child = spawn(command, args, {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  const proc: Managed = { name, child, alive: true, tail: [] };
  const collect = (buf: Buffer) => {
    for (const line of buf.toString().split("\n")) {
      if (line.trim()) proc.tail.push(line);
    }
    if (proc.tail.length > TAIL_LINES) proc.tail.splice(0, proc.tail.length - TAIL_LINES);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);
  child.once("error", (err) => {
    proc.alive = false;
    proc.tail.push(String(err));
  });
  child.once("exit", () => {
    proc.alive = false;
  });
  managed.push(proc);
  return proc;
}

function signalGroup(proc: Managed, signal: NodeJS.Signals): void {
  if (!proc.alive || !proc.child.pid) return;
  try {
    process.kill(-proc.child.pid, signal);
  } catch {
    /* группа уже мертва */
  }
}

async function shutdown(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  if (keepAlive) {
    const names = managed.filter((p) => p.alive).map((p) => p.name);
    if (names.length) console.log(`\n--keep: оставляю запущенными ${names.join(", ")} (гасить вручную)`);
    return;
  }
  for (const proc of managed) signalGroup(proc, "SIGTERM");
  for (let i = 0; i < 20 && managed.some((p) => p.alive); i += 1) await sleep(100);
  for (const proc of managed) signalGroup(proc, "SIGKILL");
}

async function ensureEmulator(): Promise<void> {
  const [firestoreUp, authUp] = await Promise.all([isPortOpen(FIRESTORE_PORT), isPortOpen(AUTH_PORT)]);
  if (firestoreUp && authUp) {
    console.log(`▶ эмулятор уже слушает ${FIRESTORE_PORT}/${AUTH_PORT} — переиспользую (гасить не буду)`);
    return;
  }
  if (firestoreUp || authUp) {
    throw new Error(`Порт ${firestoreUp ? AUTH_PORT : FIRESTORE_PORT} свободен, а соседний занят — почини эмулятор вручную`);
  }
  console.log("▶ поднимаю firebase emulators (firestore, auth, storage)…");
  const proc = start("firebase emulators", "npx", [
    "firebase", "emulators:start",
    "--config", "firebase.smoke.json",
    "--project", SMOKE_AUTH_PROJECT,
    "--only", "firestore,auth,storage",
  ]);
  await waitForPorts([FIRESTORE_PORT, AUTH_PORT], "Эмулятор", proc);
  console.log("  эмулятор готов");
}

function seed(opts: Options): void {
  console.log(`▶ сид песочницы ${opts.project}${opts.reset ? " (--reset)" : ""}…`);
  const args = ["tsx", "scripts/seedEmulatorRoles.ts", "--project", opts.project];
  if (opts.reset) args.push("--reset");
  const res = spawnSync("npx", args, { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) throw new Error(`Сид упал (exit ${res.status ?? res.signal})`);
}

async function ensureDevServer(): Promise<void> {
  if (await isPortOpen(SMOKE_DEV_PORT)) {
    console.log(`▶ dev-сервер уже на ${SMOKE_DEV_PORT} — переиспользую (гасить не буду)`);
    return;
  }
  console.log(`▶ поднимаю vite на ${SMOKE_DEV_PORT} с VITE_USE_FIREBASE_EMULATORS=true…`);
  const proc = start("vite", "npx", ["vite", "--port", String(SMOKE_DEV_PORT), "--strictPort"], {
    VITE_USE_FIREBASE_EMULATORS: "true",
    VITE_FIREBASE_PROJECT_ID: SMOKE_AUTH_PROJECT,
  });
  await waitForPorts([SMOKE_DEV_PORT], "Dev-сервер", proc);
  console.log("  dev-сервер готов");
}

function runPlaywright(opts: Options): Promise<number> {
  const baseURL = `http://localhost:${SMOKE_DEV_PORT}`;
  const args = ["playwright", "test", ...opts.roles.map((r) => `--project=smoke:${r}`)];
  console.log(`▶ playwright: ${opts.roles.join(", ")} (песочница ${opts.project})`);
  const child = spawn("npx", args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, SMOKE_PROJECT: opts.project, SMOKE_BASE_URL: baseURL },
  });
  return new Promise((res) => {
    child.once("error", () => res(1));
    child.once("close", (code) => res(code ?? 1));
  });
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts) {
    console.log(USAGE);
    return;
  }
  keepAlive = opts.keep;

  for (const signal of ["SIGINT", "SIGTERM"] as NodeJS.Signals[]) {
    process.on(signal, () => {
      keepAlive = false;
      void shutdown().then(() => process.exit(130));
    });
  }
  process.on("uncaughtException", (err) => {
    console.error(err);
    keepAlive = false;
    void shutdown().then(() => process.exit(1));
  });
  // Последний рубеж: если процесс уходит мимо shutdown, дерево не переживёт нас.
  process.on("exit", () => {
    if (keepAlive) return;
    for (const proc of managed) signalGroup(proc, "SIGKILL");
  });

  let code = 1;
  try {
    await ensureEmulator();
    seed(opts);
    await ensureDevServer();
    code = await runPlaywright(opts);
  } finally {
    await shutdown();
  }
  process.exit(code);
}

main().catch(async (err) => {
  console.error(`✖ ${err instanceof Error ? err.message : String(err)}`);
  keepAlive = false;
  await shutdown();
  process.exit(1);
});
