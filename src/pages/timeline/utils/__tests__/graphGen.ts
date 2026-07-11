/**
 * Детерминированный генератор небольших Timeline-графов для
 * property-style тестов (см. docs/plans/timeline-invariant-audit.md).
 *
 * Без внешних зависимостей: пространство состояний маленькое, важнее
 * воспроизводимость (фиксированный seed) и читаемые контрпримеры.
 * Не является тест-файлом (нет .test. в имени) — vitest его не запускает.
 */
import { LINE_X_POSITION } from '../../constants';
import type { EdgeT, NodeT } from '../../types';

export interface FlatGraph {
  nodes: NodeT[];
  edges: EdgeT[];
}

/** mulberry32 — маленький детерминированный PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

/**
 * Билдер явных графов: main line → ветви → события → под-ветви.
 * По умолчанию x веток уникальны (2100, 2200, …); совпадения задаются
 * явно через opts.x.
 */
export class GraphBuilder {
  private nodes: NodeT[] = [];
  private edges: EdgeT[] = [];
  private nextBranchX = 2100;

  root(id: string, age: number, overrides: Partial<NodeT> = {}): this {
    this.nodes.push({
      id,
      age,
      label: id,
      isDecision: false,
      x: LINE_X_POSITION,
      parentX: undefined,
      ...overrides,
    });
    return this;
  }

  /** Ветка из события fromId. startAge по умолчанию = age события. */
  branch(
    id: string,
    fromId: string,
    overrides: Partial<Omit<EdgeT, 'id' | 'nodeId'>> = {}
  ): this {
    const origin = this.nodes.find((n) => n.id === fromId);
    if (!origin) throw new Error(`branch(${id}): origin ${fromId} не создан`);
    const x = overrides.x ?? this.claimBranchX();
    this.edges.push({
      id,
      x,
      startAge: overrides.startAge ?? origin.age,
      endAge: overrides.endAge ?? (overrides.startAge ?? origin.age) + 10,
      color: overrides.color ?? '#000',
      nodeId: fromId,
    });
    return this;
  }

  /** Событие на ветке branchId (x = x ветки + offsetX). */
  event(
    id: string,
    branchId: string,
    age: number,
    overrides: Partial<NodeT> & { offsetX?: number } = {}
  ): this {
    const branch = this.edges.find((e) => e.id === branchId);
    if (!branch) throw new Error(`event(${id}): ветка ${branchId} не создана`);
    const { offsetX = 0, ...rest } = overrides;
    this.nodes.push({
      id,
      age,
      label: id,
      isDecision: false,
      x: branch.x + offsetX,
      parentX: branch.x,
      ...rest,
    });
    return this;
  }

  /** Сырой node/edge — для повреждённых состояний. */
  rawNode(node: NodeT): this {
    this.nodes.push(node);
    return this;
  }

  rawEdge(edge: EdgeT): this {
    this.edges.push(edge);
    return this;
  }

  private claimBranchX(): number {
    const x = this.nextBranchX;
    this.nextBranchX += 100;
    return x;
  }

  build(): FlatGraph {
    return JSON.parse(JSON.stringify({ nodes: this.nodes, edges: this.edges }));
  }
}

export function g(): GraphBuilder {
  return new GraphBuilder();
}

export interface GenOptions {
  /** Доля веток, получающих x уже существующей ветки (shared-x). */
  sharedXChance?: number;
  /** Доля пустых веток (без событий). */
  emptyBranchChance?: number;
  /** Кол-во узлов с parentX, не указывающим ни на одну ветку. */
  brokenParentXCount?: number;
  maxRoots?: number;
  maxDepth?: number;
}

/**
 * Случайный (но детерминированный по seed) небольшой граф:
 * 1–maxRoots корней, у каждого 0–2 ветки, на ветке 0–3 события,
 * вложенность до maxDepth. Возрасты в [0, 100], события ветки — в её окне.
 */
export function genTimeline(seed: number, opts: GenOptions = {}): FlatGraph {
  const {
    sharedXChance = 0,
    emptyBranchChance = 0.25,
    brokenParentXCount = 0,
    maxRoots = 3,
    maxDepth = 3,
  } = opts;
  const rng = mulberry32(seed);
  const b = g();
  const usedBranchXs: number[] = [];
  let idCounter = 0;
  let autoX = 2100;
  const nextId = (prefix: string) => `${prefix}${idCounter++}`;

  const addBranches = (fromId: string, fromAge: number, depth: number) => {
    if (depth >= maxDepth) return;
    const branchCount = randInt(rng, 0, 2);
    for (let i = 0; i < branchCount; i++) {
      const branchId = nextId('e');
      const startAge = fromAge;
      const endAge = Math.min(100, startAge + randInt(rng, 2, 20));
      let x: number;
      if (usedBranchXs.length > 0 && rng() < sharedXChance) {
        x = pick(rng, usedBranchXs);
      } else {
        x = autoX;
        autoX += 100;
      }
      b.branch(branchId, fromId, { startAge, endAge, x });
      usedBranchXs.push(x);

      if (rng() >= emptyBranchChance) {
        const eventCount = randInt(rng, 1, 3);
        for (let j = 0; j < eventCount; j++) {
          const eventId = nextId('n');
          const age = randInt(rng, startAge, endAge);
          const offsetX = rng() < 0.3 ? randInt(rng, -30, 30) : 0;
          b.event(eventId, branchId, age, { offsetX });
          addBranches(eventId, age, depth + 1);
        }
      }
    }
  };

  const rootCount = randInt(rng, 1, maxRoots);
  for (let i = 0; i < rootCount; i++) {
    const rootId = nextId('r');
    // Граничные возрасты попадают в выборку намеренно.
    const age = pick(rng, [0, 100, randInt(rng, 0, 100), randInt(rng, 0, 100)]);
    b.root(rootId, age);
    addBranches(rootId, age, 0);
  }

  for (let i = 0; i < brokenParentXCount; i++) {
    b.rawNode({
      id: nextId('broken'),
      age: randInt(rng, 0, 100),
      label: 'broken',
      isDecision: false,
      x: 9000 + i * 17,
      parentX: 9000 + i * 17, // ни одна ветка такого x не имеет
    });
  }

  return b.build();
}

// ===== Проверки инвариантов =====

export function duplicateIds(items: Array<{ id: string }>): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const item of items) {
    if (seen.has(item.id)) dupes.push(item.id);
    seen.add(item.id);
  }
  return dupes;
}

/**
 * Нарушения ссылочной целостности (I13):
 * - edge.nodeId указывает на несуществующий node;
 * - node.parentX не равен ни LINE_X_POSITION/undefined, ни x живой ветки.
 */
export function referentialViolations(flat: FlatGraph): string[] {
  const nodeIds = new Set(flat.nodes.map((n) => n.id));
  const edgeXs = new Set(flat.edges.map((e) => e.x));
  const violations: string[] = [];
  for (const edge of flat.edges) {
    if (!nodeIds.has(edge.nodeId)) {
      violations.push(`edge ${edge.id}: origin ${edge.nodeId} отсутствует`);
    }
  }
  for (const node of flat.nodes) {
    const px = node.parentX;
    if (px !== undefined && px !== LINE_X_POSITION && !edgeXs.has(px)) {
      violations.push(`node ${node.id}: parentX=${px} не указывает на ветку`);
    }
  }
  return violations;
}

/** Возрастная семантика: id → age (drag и пр. не должны её менять). */
export function ageById(flat: FlatGraph): Map<string, number> {
  return new Map(flat.nodes.map((n) => [n.id, n.age]));
}

/**
 * Каноническое сравнение семантики: сортировка по id, координаты
 * включаются опционально (для проверок «данные не изменились» vs
 * «данные не изменились с точностью до презентации»).
 *
 * branchId исключается всегда: это производный указатель принадлежности
 * (RFC timeline-branch-id, фаза 1), дублирующий связь parentX→edge.x.
 * Досев производного поля не считается изменением пользовательских данных.
 */
export function canonical(flat: FlatGraph, { withCoords = true } = {}): string {
  const nodes = [...flat.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => {
      const { x, parentX, branchId: _branchId, ...semantic } = n;
      return withCoords ? { ...semantic, x, parentX } : semantic;
    });
  const edges = [...flat.edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => {
      const { x, ...semantic } = e;
      return withCoords ? { ...semantic, x } : semantic;
    });
  return JSON.stringify({ nodes, edges });
}
