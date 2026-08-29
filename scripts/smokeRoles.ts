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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SMOKE_AUTH_PROJECT, SMOKE_DEV_PORT, sandboxProjectId } from "../tests/e2e/fixtures/roles";
import { SNAPSHOT_MISSING_HINT, readManifest } from "./lib/prodSnapshot";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Роли со сценарными спеками — тот же список, что в playwright.config.ts. */
const SCENARIO_KEYS = ["author", "admin-empty", "superadmin", "student-group"];
/** Сквозной сценарий выдачи прав через Cloud Functions; только с --with-functions. */
const FUNCTIONS_KEY = "functions";
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;
const FUNCTIONS_PORT = 5001;
const EMULATOR_SERVICES = ["firestore", "auth", "storage"];
const WAIT_TIMEOUT_MS = 60_000;
const TAIL_LINES = 40;
/** tsc-выход functions: собранный index, который читает эмулятор. */
const FUNCTIONS_ENTRY = "functions/lib/functions/src/index.js";
const FUNCTIONS_SOURCES = ["functions/src", "shared"];
/**
 * Эмулятор функций требует firebase-tools ≥ 15: рантайм 14.x при старте зовёт
 * functions.config(), удалённый в firebase-functions 7, и валит ВСЕ функции
 * («Failed to load function»). Держать две версии рядом нельзя: каждая при
 * старте выкачивает свой jar Firestore, удаляя чужой.
 */
const MIN_FUNCTIONS_TOOLS_MAJOR = 15;

const USAGE = `Ролевой e2e-стенд (HP-2).

  npm run smoke:roles -- [опции]

  --roles <a,b>      роли для прогона (по умолчанию: ${SCENARIO_KEYS.join(",")})
  --project <id>     песочница Firestore: суффикс (a → demo-smoke-a) или полный id
  --with-functions   поднять эмулятор Cloud Functions и прогнать сценарий ${FUNCTIONS_KEY}
                     (только в default-песочнице ${SMOKE_AUTH_PROJECT})
  --prod-data        долить в песочницу срез контента прода (сначала снять его:
                     npx tsx scripts/fetchProdContentSnapshot.ts)
  --reset            очистить песочницу перед сидом
  --keep             не гасить эмулятор и dev-сервер после прогона
  --help             эта справка
`;

interface Options {
  roles: string[];
  project: string;
  reset: boolean;
  prodData: boolean;
  keep: boolean;
  withFunctions: boolean;
}

interface Managed {
  name: string;
  child: ChildProcess;
  alive: boolean;
  tail: string[];
  /** Иглы, которые ждёт waitForLog: отмечаются в момент прихода строки. */
  watch: Set<string>;
  seen: Set<string>;
}

const managed: Managed[] = [];
let shuttingDown = false;
let keepAlive = false;

function parseArgs(argv: string[]): Options | null {
  const opts: Options = {
    roles: [],
    project: SMOKE_AUTH_PROJECT,
    reset: false,
    keep: false,
    withFunctions: false,
    prodData: false,
  };
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
    else if (flag === "--with-functions") opts.withFunctions = true;
    else if (flag === "--prod-data") opts.prodData = true;
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
  const explicitRoles = opts.roles.length > 0;
  if (!explicitRoles) {
    opts.roles = opts.withFunctions ? [...SCENARIO_KEYS, FUNCTIONS_KEY] : [...SCENARIO_KEYS];
  }
  const known = [...SCENARIO_KEYS, FUNCTIONS_KEY];
  const unknown = opts.roles.filter((r) => !known.includes(r));
  if (unknown.length) {
    throw new Error(`Неизвестные роли: ${unknown.join(", ")}. Доступны: ${known.join(", ")}`);
  }
  if (explicitRoles && !opts.roles.length) throw new Error("--roles не должен быть пустым");
  if (opts.roles.includes(FUNCTIONS_KEY) && !opts.withFunctions) {
    throw new Error(`Сценарий ${FUNCTIONS_KEY} требует флага --with-functions`);
  }
  // Admin SDK внутри functions-эмулятора пишет в default-проект (GCLOUD_PROJECT),
  // а песочницы --project — отдельные проекты Firestore: повышенный через
  // callable пользователь просто не появился бы в песочнице.
  if (opts.prodData && !readManifest()) {
    throw new Error(SNAPSHOT_MISSING_HINT);
  }
  if (opts.withFunctions && opts.project !== SMOKE_AUTH_PROJECT) {
    throw new Error(
      `--with-functions работает только в default-песочнице ${SMOKE_AUTH_PROJECT}: ` +
        `эмулятор функций пишет в неё, а не в ${opts.project}. Убери --project.`
    );
  }
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

/** Ждёт строку в выводе процесса (порт открыт ≠ сервис прогрет). */
async function waitForLog(proc: Managed, needle: string, what: string): Promise<void> {
  // Ищем и в live-потоке (seen), и в хвосте: болтливый functions-эмулятор
  // может вымыть баннер из кольцевого буфера между тиками опроса.
  proc.watch.add(needle);
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (proc.seen.has(needle) || proc.tail.some((line) => line.includes(needle))) return;
    if (!proc.alive) {
      console.error(proc.tail.join("\n"));
      throw new Error(`${what} завершился раньше времени`);
    }
    await sleep(400);
  }
  console.error(proc.tail.join("\n"));
  throw new Error(`${what} не сообщил «${needle}» за ${WAIT_TIMEOUT_MS / 1000}с`);
}

/** detached: своя process group, чтобы гасить всё дерево через kill(-pid). */
function start(name: string, command: string, args: string[], env: NodeJS.ProcessEnv = {}): Managed {
  const child = spawn(command, args, {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  const proc: Managed = { name, child, alive: true, tail: [], watch: new Set(), seen: new Set() };
  const collect = (buf: Buffer) => {
    for (const line of buf.toString().split("\n")) {
      if (!line.trim()) continue;
      proc.tail.push(line);
      for (const needle of proc.watch) {
        if (line.includes(needle)) proc.seen.add(needle);
      }
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

/** Падаем понятной ошибкой, если репозиторий откатили на firebase-tools 14.x. */
function assertFunctionsToolsSupported(): void {
  let version = "не найден";
  try {
    const raw = readFileSync(resolve(ROOT, "node_modules/firebase-tools/package.json"), "utf8");
    version = JSON.parse(raw).version as string;
  } catch {
    /* пакета нет — сообщим ниже */
  }
  if ((Number.parseInt(version, 10) || 0) >= MIN_FUNCTIONS_TOOLS_MAJOR) return;
  throw new Error(
    `--with-functions требует firebase-tools ≥ ${MIN_FUNCTIONS_TOOLS_MAJOR} (сейчас ${version}): ` +
      "рантайм 14.x зовёт удалённый functions.config() и не поднимает ни одной функции."
  );
}

/** Самый свежий mtime среди .ts исходников functions/shared. */
function newestSourceMtime(): number {
  let newest = 0;
  for (const dir of FUNCTIONS_SOURCES) {
    const base = resolve(ROOT, dir);
    for (const entry of readdirSync(base, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const mtime = statSync(join(entry.parentPath, entry.name)).mtimeMs;
      if (mtime > newest) newest = mtime;
    }
  }
  return newest;
}

/** Эмулятор функций читает functions/lib — пересобираем только при устаревании. */
function ensureFunctionsBuilt(): void {
  const built = statSync(resolve(ROOT, FUNCTIONS_ENTRY), { throwIfNoEntry: false })?.mtimeMs ?? 0;
  if (built > newestSourceMtime()) {
    console.log("▶ functions/lib свежее исходников — сборка не нужна");
    return;
  }
  console.log("▶ собираю functions (tsc)…");
  const res = spawnSync("npm", ["--prefix", "functions", "run", "build"], { cwd: ROOT, stdio: "inherit" });
  if (res.status !== 0) throw new Error(`Сборка functions упала (exit ${res.status ?? res.signal})`);
}

async function ensureEmulator(opts: Options): Promise<void> {
  const [firestoreUp, authUp] = await Promise.all([isPortOpen(FIRESTORE_PORT), isPortOpen(AUTH_PORT)]);
  if (firestoreUp && authUp) {
    if (opts.withFunctions && !(await isPortOpen(FUNCTIONS_PORT))) {
      throw new Error(
        `Эмулятор уже поднят без функций (порт ${FUNCTIONS_PORT} свободен). ` +
          "Погаси его и запусти стенд заново с --with-functions."
      );
    }
    console.log(`▶ эмулятор уже слушает ${FIRESTORE_PORT}/${AUTH_PORT} — переиспользую (гасить не буду)`);
    return;
  }
  if (firestoreUp || authUp) {
    throw new Error(`Порт ${firestoreUp ? AUTH_PORT : FIRESTORE_PORT} свободен, а соседний занят — почини эмулятор вручную`);
  }
  const services = opts.withFunctions ? [...EMULATOR_SERVICES, "functions"] : EMULATOR_SERVICES;
  if (opts.withFunctions) {
    assertFunctionsToolsSupported();
    ensureFunctionsBuilt();
  }
  console.log(`▶ поднимаю firebase emulators (${services.join(", ")})…`);
  const proc = start("firebase emulators", "npx", [
    "firebase", "emulators:start",
    "--config", "firebase.smoke.json",
    "--project", SMOKE_AUTH_PROJECT,
    "--only", services.join(","),
  ]);
  const ports = opts.withFunctions ? [FIRESTORE_PORT, AUTH_PORT, FUNCTIONS_PORT] : [FIRESTORE_PORT, AUTH_PORT];
  await waitForPorts(ports, "Эмулятор", proc);
  // 5001 открывается до загрузки триггеров, поэтому в режиме функций ждём
  // баннер готовности — иначе сид создаст пользователей мимо onUserCreate.
  if (opts.withFunctions) await waitForLog(proc, "All emulators ready", "Эмулятор");
  console.log("  эмулятор готов");
}

function seed(opts: Options): void {
  console.log(`▶ сид песочницы ${opts.project}${opts.reset ? " (--reset)" : ""}…`);
  const args = ["tsx", "scripts/seedEmulatorRoles.ts", "--project", opts.project];
  if (opts.reset) args.push("--reset");
  if (opts.prodData) args.push("--prod-data");
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
    env: {
      ...process.env,
      SMOKE_PROJECT: opts.project,
      SMOKE_BASE_URL: baseURL,
      ...(opts.withFunctions ? { SMOKE_WITH_FUNCTIONS: "1" } : {}),
    },
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
    await ensureEmulator(opts);
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
