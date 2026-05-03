import type { BillingSummaryResponse } from "../../../lib/adminFunctions";

interface BillingSummaryPanelProps {
  summary: BillingSummaryResponse | null;
  loading: boolean;
  error: string | null;
  selectedMonth: string | null;
  onRefresh: () => void | Promise<void>;
  onSelectMonth: (month: string) => void;
}

function formatMonthLabel(month: string): string {
  if (!/^\d{6}$/.test(month)) return month;
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(4, 6)) - 1;
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, monthIndex, 1))
  );
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function BillingSummaryPanel({
  summary,
  loading,
  error,
  selectedMonth,
  onRefresh,
  onSelectMonth,
}: BillingSummaryPanelProps) {
  const hasData = summary?.ok === true && summary.configured === true;
  const resolvedSummary = hasData ? summary.summary : null;
  const availableMonths = hasData ? summary.availableMonths : [];
  const activeMonth = selectedMonth || resolvedSummary?.month || "";

  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-brand p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">GCP billing по проекту</h2>
          <p className="text-sm text-muted">
            Breakdown по Service и SKU. Выбери месяц — данные подтягиваются из live billing export или архива.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableMonths.length > 0 && (
            <select
              value={activeMonth}
              onChange={(event) => onSelectMonth(event.target.value)}
              disabled={loading}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-fg transition hover:bg-card2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted transition hover:bg-card2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Обновляю…" : "Обновить"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!summary && !loading && !error ? (
        <div className="rounded-lg border border-border bg-card2 px-4 py-3 text-sm text-muted">
          Статистика ещё не загружена.
        </div>
      ) : null}

      {summary?.ok === false ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
          <p className="font-medium">{summary.error}</p>
          {summary.diagnostics?.length ? (
            <ul className="list-disc pl-5 space-y-1">
              {summary.diagnostics.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {resolvedSummary ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Месяц" value={resolvedSummary.monthLabel} />
            <MetricCard label="Расход за месяц" value={formatMoney(resolvedSummary.totalCostUsd)} />
            <MetricCard label="Последний usage" value={formatDateTime(resolvedSummary.lastUsageEnd)} />
            <MetricCard
              label="Источник"
              value={resolvedSummary.dataSource === "bigquery_archive" ? "архив (CSV)" : "live export"}
            />
          </div>

          <div className="rounded-lg border border-border bg-card2 px-4 py-3 text-sm text-muted">
            <span className="font-medium text-fg">Таблица экспорта:</span> {resolvedSummary.tableRef}
          </div>

          {resolvedSummary.recentDays.length ? (
            <div className="rounded-xl border border-border bg-card2 p-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Последние дни
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {resolvedSummary.recentDays.slice(0, 8).map((day) => (
                  <div key={day.date} className="rounded-lg border border-border bg-card px-3 py-2">
                    <p className="text-xs text-muted">{day.date}</p>
                    <p className="text-lg font-semibold text-fg">{formatMoney(day.costUsd)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {resolvedSummary.services.map((service) => (
              <div key={service.service} className="rounded-xl border border-border bg-card2 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-fg">{service.service}</h3>
                  <div className="text-lg font-semibold text-fg">{formatMoney(service.costUsd)}</div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {service.skus.map((sku) => (
                    <div
                      key={`${service.service}:${sku.sku}`}
                      className="rounded-lg border border-border bg-card px-3 py-2 flex items-start justify-between gap-3"
                    >
                      <p className="text-sm text-fg">{sku.sku}</p>
                      <p className="text-sm font-medium text-muted whitespace-nowrap">
                        {formatMoney(sku.costUsd)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card2 px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-lg font-semibold text-fg">{value}</p>
    </div>
  );
}
