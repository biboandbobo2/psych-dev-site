import { describe, expect, it } from "vitest";

import {
  evaluateBillingAlertDelivery,
  getBillingPeriodKey,
  getBillingThresholdKey,
} from "./billingAlertState.js";

describe("billingAlertState", () => {
  it("builds stable period keys in UTC", () => {
    expect(getBillingPeriodKey(new Date("2026-03-17T10:00:00Z"))).toBe("2026-03");
  });

  it("normalizes threshold keys", () => {
    expect(getBillingThresholdKey(0.2)).toBe("0.2");
    expect(getBillingThresholdKey(1)).toBe("1");
  });

  it("sends first notification for a new threshold bucket", () => {
    const result = evaluateBillingAlertDelivery({
      previousState: null,
      periodKey: "2026-03",
      thresholdKey: "0.2",
      costCents: 123,
      maxMessagesPerThreshold: 2,
    });

    expect(result.shouldSend).toBe(true);
    expect(result.nextState.sentCount).toBe(1);
  });

  it("skips duplicate notifications when spend does not grow", () => {
    const result = evaluateBillingAlertDelivery({
      previousState: {
        periodKey: "2026-03",
        thresholdKey: "0.2",
        lastCostCents: 500,
        sentCount: 1,
      },
      periodKey: "2026-03",
      thresholdKey: "0.2",
      costCents: 500,
      maxMessagesPerThreshold: 2,
    });

    expect(result.shouldSend).toBe(false);
    expect(result.nextState.sentCount).toBe(1);
  });

  it("allows one more notification when spend grows inside the same threshold bucket", () => {
    const result = evaluateBillingAlertDelivery({
      previousState: {
        periodKey: "2026-03",
        thresholdKey: "0.2",
        lastCostCents: 500,
        sentCount: 1,
      },
      periodKey: "2026-03",
      thresholdKey: "0.2",
      costCents: 575,
      maxMessagesPerThreshold: 2,
    });

    expect(result.shouldSend).toBe(true);
    expect(result.nextState.sentCount).toBe(2);
    expect(result.nextState.lastCostCents).toBe(575);
  });

  it("stops sending after max messages for the same threshold bucket", () => {
    const result = evaluateBillingAlertDelivery({
      previousState: {
        periodKey: "2026-03",
        thresholdKey: "0.2",
        lastCostCents: 575,
        sentCount: 2,
      },
      periodKey: "2026-03",
      thresholdKey: "0.2",
      costCents: 640,
      maxMessagesPerThreshold: 2,
    });

    expect(result.shouldSend).toBe(false);
    expect(result.nextState.sentCount).toBe(2);
    expect(result.nextState.lastCostCents).toBe(640);
  });

  it("resets when threshold bucket changes", () => {
    const result = evaluateBillingAlertDelivery({
      previousState: {
        periodKey: "2026-03",
        thresholdKey: "0.2",
        lastCostCents: 640,
        sentCount: 2,
      },
      periodKey: "2026-03",
      thresholdKey: "0.5",
      costCents: 900,
      maxMessagesPerThreshold: 2,
    });

    expect(result.shouldSend).toBe(true);
    expect(result.nextState.sentCount).toBe(1);
    expect(result.nextState.thresholdKey).toBe("0.5");
  });
});
