export function getBillingPeriodKey(now = new Date()) {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function getBillingThresholdKey(threshold) {
    if (!Number.isFinite(threshold)) {
        return "unknown";
    }
    return threshold.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
export function evaluateBillingAlertDelivery({ previousState, periodKey, thresholdKey, costCents, maxMessagesPerThreshold, }) {
    const normalizedMaxMessages = Math.max(1, Math.floor(maxMessagesPerThreshold || 1));
    const normalizedCostCents = Math.max(0, Math.floor(costCents));
    if (!previousState ||
        previousState.periodKey !== periodKey ||
        previousState.thresholdKey !== thresholdKey) {
        return {
            shouldSend: true,
            nextState: {
                periodKey,
                thresholdKey,
                lastCostCents: normalizedCostCents,
                sentCount: 1,
            },
        };
    }
    if (normalizedCostCents <= previousState.lastCostCents) {
        return {
            shouldSend: false,
            nextState: previousState,
        };
    }
    if (previousState.sentCount >= normalizedMaxMessages) {
        return {
            shouldSend: false,
            nextState: {
                ...previousState,
                lastCostCents: normalizedCostCents,
            },
        };
    }
    return {
        shouldSend: true,
        nextState: {
            ...previousState,
            lastCostCents: normalizedCostCents,
            sentCount: previousState.sentCount + 1,
        },
    };
}
