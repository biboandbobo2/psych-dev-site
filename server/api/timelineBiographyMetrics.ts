import type {
  BiographyEvaluationMetrics,
  BiographyEventTheme,
  BiographyFactCandidate,
  BiographyTimelineData,
  BiographyTimelineEventPlan,
  BiographyTimelinePlan,
} from './timelineBiographyTypes.js';
import { isGenericBiographyLabel } from './timelineBiographyLabelQuality.js';

function isApproximateFact(fact: BiographyFactCandidate) {
  return fact.timePrecision === 'approximate' || fact.timePrecision === 'inferred';
}

function isApproximateEvent(event: BiographyTimelineEventPlan) {
  return /примерн|ориентировоч/i.test(event.notes || '');
}

function isGenericLabel(label: string | undefined) {
  return isGenericBiographyLabel(label);
}

function countThemeCoverage(facts: BiographyFactCandidate[]) {
  return facts.reduce<Partial<Record<BiographyEventTheme, number>>>((acc, fact) => {
    fact.themes?.forEach((theme) => {
      acc[theme] = (acc[theme] || 0) + 1;
    });
    return acc;
  }, {});
}

function countPlanEvents(plan: BiographyTimelinePlan) {
  return plan.branches.reduce((total, branch) => total + branch.events.length, plan.mainEvents.length);
}

function collectAllPlanEvents(plan: BiographyTimelinePlan) {
  return [...plan.mainEvents, ...plan.branches.flatMap((branch) => branch.events)];
}

export function buildBiographyEvaluationMetrics(params: {
  facts: BiographyFactCandidate[];
  plan: BiographyTimelinePlan;
  timeline?: BiographyTimelineData;
}): BiographyEvaluationMetrics {
  const allEvents = collectAllPlanEvents(params.plan);
  const branchEvents = params.plan.branches.reduce((total, branch) => total + branch.events.length, 0);

  return {
    facts: {
      total: params.facts.length,
      approximate: params.facts.filter(isApproximateFact).length,
      withPeople: params.facts.filter((fact) => (fact.people?.length || 0) > 0).length,
      withThemes: params.facts.filter((fact) => (fact.themes?.length || 0) > 0).length,
      earlyLifeFacts: params.facts.filter((fact) => Number.isFinite(fact.age) && Number(fact.age) <= 18).length,
      themeCoverage: countThemeCoverage(params.facts),
    },
    plan: {
      mainEvents: params.plan.mainEvents.length,
      branches: params.plan.branches.length,
      branchEvents,
      visibleEvents: countPlanEvents(params.plan),
      genericLabels: allEvents.filter((event) => isGenericLabel(event.label)).length,
      emptyNotes: allEvents.filter((event) => !event.notes?.trim()).length,
      approximateEvents: allEvents.filter(isApproximateEvent).length,
      earlyLifeEvents: allEvents.filter((event) => event.age <= 18).length,
      birthAnchoredBranches: params.plan.branches.filter((branch) => {
        const sourceEvent = params.plan.mainEvents[branch.sourceMainEventIndex];
        return !sourceEvent || sourceEvent.age === 0;
      }).length,
    },
    timeline: params.timeline
      ? {
          nodes: params.timeline.nodes.length,
          edges: params.timeline.edges.length,
        }
      : undefined,
  };
}
