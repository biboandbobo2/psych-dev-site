import {
  TIMELINE_PERIODIZATION_IDS,
  normalizeText,
  normalizeSphere,
  pickBranchX,
  russianDateToISO,
  sanitizeTimelineEventPlan,
  LINE_X_POSITION,
  buildEventFactKey,
} from './timelineBiographyHeuristics.js';
import {
  SPHERE_META,
  type BiographyTimelineBranchPlan,
  type BiographyTimelineData,
  type BiographyTimelineEventPlan,
  type BiographyTimelinePlan,
  type OccupiedBranchLane,
  type TimelineSphere,
} from './timelineBiographyTypes.js';

const SAME_AGE_MAIN_EVENT_OFFSETS = [0, -260, 260, -460, 460, -680, 680] as const;

// F7 (verifier): обрезка по границе слова, а не посреди («…в Пет»)
function truncateBranchLabel(value: string | undefined): string | undefined {
  const label = normalizeText(value, 200);
  if (!label) return undefined;
  if (label.length <= 40) return label;
  const cut = label.slice(0, 40);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function buildTimelineDataFromBiographyPlan(plan: BiographyTimelinePlan): BiographyTimelineData {
  const mainEvents = (plan.mainEvents || [])
    .map((event) => sanitizeTimelineEventPlan(event))
    .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
    .filter((event) => event.age > 0)
    .sort((a, b) => a.age - b.age);

  const nodes: BiographyTimelineData['nodes'] = [];
  const edges: BiographyTimelineData['edges'] = [];
  const mainNodeIds: string[] = [];
  const mainAgeCounts = new Map<string, number>();
  const mainAgeSeen = new Map<string, number>();

  mainEvents.forEach((event) => {
    const key = String(event.age);
    mainAgeCounts.set(key, (mainAgeCounts.get(key) ?? 0) + 1);
  });

  mainEvents.forEach((event) => {
    const ageKey = String(event.age);
    const ageIndex = mainAgeSeen.get(ageKey) ?? 0;
    const ageCount = mainAgeCounts.get(ageKey) ?? 1;
    const offset = ageCount > 1 ? SAME_AGE_MAIN_EVENT_OFFSETS[ageIndex] ?? 0 : 0;
    const nodeId = crypto.randomUUID();
    mainAgeSeen.set(ageKey, ageIndex + 1);
    mainNodeIds.push(nodeId);
    nodes.push({
      id: nodeId,
      age: event.age,
      x: offset === 0 ? undefined : LINE_X_POSITION + offset,
      parentX: offset === 0 ? undefined : LINE_X_POSITION,
      label: event.label,
      notes: event.notes,
      sphere: event.sphere,
      isDecision: event.isDecision,
      iconId: event.iconId,
    });
  });

  const occupiedLanes: OccupiedBranchLane[] = [];
  (plan.branches || []).forEach((branch) => {
    const sphere = normalizeSphere(branch.sphere) ?? 'other';
    const sourceNodeId = mainNodeIds[branch.sourceMainEventIndex];
    const sourceNode = nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode) return;

    const branchEvents = (branch.events || [])
      .map((event) => sanitizeTimelineEventPlan(event, sphere))
      .filter((event): event is BiographyTimelineEventPlan => Boolean(event))
      .sort((a, b) => a.age - b.age);

    if (branchEvents.length === 0) return;

    const lowestAge = branchEvents[0]?.age ?? sourceNode.age;
    const highestAge = branchEvents[branchEvents.length - 1]?.age ?? sourceNode.age;
    // Branch line starts from earliest event or anchor — whichever is earlier
    const startAge = Math.min(lowestAge, sourceNode.age);
    const endAge = highestAge;
    const x = pickBranchX(sphere, startAge, endAge, occupiedLanes);

    // Д-B10: имя ветки из composition (branch.label плана) — иначе UI
    // показывает имя origin-события вместо осмысленного названия арки.
    const branchLabel = truncateBranchLabel(branch.label);
    const branchEdgeId = crypto.randomUUID();
    edges.push({
      id: branchEdgeId,
      x,
      startAge,
      endAge,
      color: SPHERE_META[sphere].color,
      nodeId: sourceNode.id,
      label: branchLabel,
    });

    // Group events by age to detect same-age collisions
    const eventsByAge = new Map<number, BiographyTimelineEventPlan[]>();
    for (const event of branchEvents) {
      const group = eventsByAge.get(event.age) ?? [];
      group.push(event);
      eventsByAge.set(event.age, group);
    }

    // Sub-branch offsets: alternating left/right from parent branch
    const SUB_BRANCH_OFFSETS = [400, -400, 700, -700, 1000, -1000];

    for (const [age, eventsAtAge] of eventsByAge) {
      // First event goes on the main branch line
      const first = eventsAtAge[0];
      const anchorNodeId = crypto.randomUUID();
      nodes.push({
        id: anchorNodeId,
        age: first.age,
        x,
        parentX: x,
        branchId: branchEdgeId, // ссылочная принадлежность параллельно с parentX
        label: first.label,
        notes: first.notes,
        sphere: first.sphere ?? sphere,
        isDecision: first.isDecision,
        iconId: first.iconId,
      });

      // Additional events at the same age become sub-branches (spurs)
      // growing out of the anchor node. Referential integrity (I13):
      // spur edge originates from an existing node, spur event belongs
      // to the spur edge (parentX === spur x).
      for (let i = 1; i < eventsAtAge.length; i++) {
        const event = eventsAtAge[i];
        const subOffset = SUB_BRANCH_OFFSETS[i - 1] ?? ((i % 2 === 0 ? -1 : 1) * Math.ceil(i / 2) * 400);
        let subX = x + subOffset;
        // С фазы 2 branchId коллизия x не «переезжает» события (членство —
        // ссылка), walk сохранён визуально: spur на занятой линии нечитаем.
        const takenXs = new Set<number>([LINE_X_POSITION, ...edges.map((e) => e.x)]);
        while (takenXs.has(subX)) {
          subX += 40;
        }
        // Д-B4: регистрируем lane спура, чтобы pickBranchX следующих веток
        // не выбрал этот же x при пересекающемся окне.
        occupiedLanes.push({ x: subX, startAge: age, endAge: age });

        const spurEdgeId = crypto.randomUUID();
        edges.push({
          id: spurEdgeId,
          x: subX,
          startAge: age,
          endAge: age,
          color: SPHERE_META[sphere].color,
          nodeId: anchorNodeId,
        });

        nodes.push({
          id: crypto.randomUUID(),
          age: event.age,
          x: subX,
          parentX: subX,
          branchId: spurEdgeId, // спур-событие принадлежит спур-ветке по ссылке
          label: event.label,
          notes: event.notes,
          sphere: event.sphere ?? sphere,
          isDecision: event.isDecision,
          iconId: event.iconId,
        });
      }
    }
  });

  const maxNodeAge = nodes.reduce((max, node) => Math.max(max, node.age), 0);
  const maxEdgeAge = edges.reduce((max, edge) => Math.max(max, edge.endAge), 0);
  const computedCurrentAge = Math.max(0, Math.min(120, Number(plan.currentAge) || maxNodeAge || 25));
  const ageMax = Math.min(
    120,
    Math.max(Math.ceil((Math.max(computedCurrentAge, maxNodeAge, maxEdgeAge) + 3) / 5) * 5, 25)
  );

  return {
    currentAge: computedCurrentAge,
    ageMax,
    nodes,
    edges,
    birthDetails: {
      date: russianDateToISO(normalizeText(plan.birthDetails?.date, 100)),
      place: normalizeText(plan.birthDetails?.place, 150),
      notes: normalizeText(plan.birthDetails?.notes, 400),
    },
    selectedPeriodization:
      typeof plan.selectedPeriodization === 'string' &&
      TIMELINE_PERIODIZATION_IDS.includes(plan.selectedPeriodization)
        ? plan.selectedPeriodization
        : null,
  };
}
