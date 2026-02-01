import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleBudgetAlert,
  normalizeBudgetPayload,
  parseBudgetMessage,
  type BillingConfig,
} from "./billingBudgetAlert.js";

const baseConfig: BillingConfig = {
  projectId: "test-project",
  billingAccountId: "billing-123",
  alertUsd: 1,
  hardStopUsd: 5,
  alertThreshold: 0.2,
  hardStopThreshold: 1,
};

describe("billingBudgetAlert helpers", () => {
  it("parses message.json payload", () => {
    const payload = parseBudgetMessage({ json: { costAmount: "1.5" } });
    expect(payload).toEqual({ costAmount: "1.5" });
  });

  it("parses base64 data payload", () => {
    const data = Buffer.from(JSON.stringify({ budgetDisplayName: "Test" })).toString("base64");
    const payload = parseBudgetMessage({ data });
    expect(payload).toEqual({ budgetDisplayName: "Test" });
  });

  it("normalizes numeric fields", () => {
    const normalized = normalizeBudgetPayload({
      costAmount: "2.5",
      budgetAmount: "5",
      currencyCode: "USD",
      alertThresholdExceeded: "0.2",
      budgetDisplayName: "Guardrail",
    });
    expect(normalized.costAmount).toBe(2.5);
    expect(normalized.budgetAmount).toBe(5);
    expect(normalized.threshold).toBe(0.2);
  });
});

describe("handleBudgetAlert", () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
  });

  it("sends alert when spend exceeds alert threshold", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const disableBilling = vi.fn().mockResolvedValue({ alreadyDisabled: false });

    await handleBudgetAlert(
      {
        costAmount: 1.23,
        budgetAmount: 5,
        currencyCode: "USD",
        alertThresholdExceeded: 0.2,
        budgetDisplayName: "Test Budget",
      },
      { logger, sendMessage, disableBilling, config: baseConfig }
    );

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(disableBilling).not.toHaveBeenCalled();
  });

  it("triggers hard stop when spend exceeds hard stop threshold", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const disableBilling = vi.fn().mockResolvedValue({ alreadyDisabled: false });

    await handleBudgetAlert(
      {
        costAmount: 5.5,
        budgetAmount: 5,
        currencyCode: "USD",
        alertThresholdExceeded: 1,
        budgetDisplayName: "Test Budget",
      },
      { logger, sendMessage, disableBilling, config: baseConfig }
    );

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(disableBilling).toHaveBeenCalledTimes(1);
  });

  it("uses threshold fallback when currency is not USD", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const disableBilling = vi.fn().mockResolvedValue({ alreadyDisabled: true });

    await handleBudgetAlert(
      {
        costAmount: 0.5,
        budgetAmount: 5,
        currencyCode: "EUR",
        alertThresholdExceeded: 1,
        budgetDisplayName: "Test Budget",
      },
      { logger, sendMessage, disableBilling, config: baseConfig }
    );

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(disableBilling).toHaveBeenCalledTimes(1);
  });
});
