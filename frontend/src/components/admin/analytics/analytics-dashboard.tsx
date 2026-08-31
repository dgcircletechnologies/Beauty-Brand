"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";
import {
  buildAnalyticsData,
  emptyFilters,
  formatCompactDate,
  formatMoney,
  formatStatus,
  getDateRange,
  hasActiveFilters,
  type AnalyticsData,
  type AnalyticsFilters,
  type DateRangePreset,
} from "@/lib/analytics/admin-analytics";

const dateRangeOptions: { label: string; value: DateRangePreset }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Custom Range", value: "custom" },
];

const chartColors = [
  "#1868db",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
  "#22c55e",
];

export function AnalyticsDashboard() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<adminApi.AdminOrder[]>([]);
  const [payments, setPayments] = useState<adminApi.AdminPayment[]>([]);
  const [preset, setPreset] = useState<DateRangePreset>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState<AnalyticsFilters>(emptyFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [nextOrders, nextPayments] = await Promise.all([
        adminApi.getAdminOrders(accessToken),
        adminApi.getAdminPayments(accessToken),
      ]);

      setOrders(nextOrders);
      setPayments(nextPayments);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load analytics.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const range = useMemo(
    () => getDateRange(preset, customFrom, customTo),
    [customFrom, customTo, preset],
  );
  const analytics = useMemo(
    () => buildAnalyticsData(orders, payments, range, filters),
    [filters, orders, payments, range],
  );
  const currency = analytics.payments[0]?.currency ?? analytics.orders[0]?.displayCurrency;
  const hasData = analytics.orders.length > 0 || analytics.payments.length > 0;

  function clearFilters() {
    setFilters(emptyFilters);
    setPreset("last30");
    setCustomFrom("");
    setCustomTo("");
  }

  function exportCsv() {
    const rows = [
      ["Metric", "Value"],
      ["Revenue", analytics.metrics.revenue],
      ["Orders", analytics.metrics.orders],
      ["Average Order Value", analytics.metrics.averageOrderValue],
      ["Successful Payments", analytics.metrics.successfulPayments],
      ["Failed Payments", analytics.metrics.failedPayments],
      ["Refunded Amount", analytics.metrics.refundedAmount],
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics-${range.label.toLowerCase().replaceAll(" ", "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <main className="admin-page analytics-page">
      <AnalyticsHeader
        customFrom={customFrom}
        customTo={customTo}
        isFiltersOpen={isFiltersOpen}
        preset={preset}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onExport={exportCsv}
        onPresetChange={setPreset}
        onRefresh={() => void loadAnalytics()}
        onToggleFilters={() => setIsFiltersOpen((current) => !current)}
      />

      {error ? (
        <section className="analytics-error">
          <p>{error}</p>
          <button className="secondary-button compact-button" onClick={() => void loadAnalytics()}>
            Retry
          </button>
        </section>
      ) : null}

      <AnalyticsFiltersPanel
        analytics={analytics}
        filters={filters}
        isOpen={isFiltersOpen}
        rangeLabel={range.label}
        onClear={clearFilters}
        onFiltersChange={setFilters}
      />

      {!hasData ? (
        <section className="empty-surface">
          <h2>No analytics data found for this period.</h2>
          <button className="secondary-button compact-button" onClick={clearFilters}>
            Clear Filters
          </button>
        </section>
      ) : (
        <>
          <KpiGrid analytics={analytics} currency={currency} />

          <section className="analytics-grid large">
            <ChartCard title="Revenue Over Time">
              <RevenueChart analytics={analytics} currency={currency} />
            </ChartCard>
            <ChartCard title="Orders Over Time">
              <OrdersChart analytics={analytics} />
            </ChartCard>
          </section>

          <section className="analytics-grid">
            <ChartCard title="Order Status Distribution">
              <DistributionChart data={analytics.orderStatus} />
            </ChartCard>
            <ChartCard title="Payment Status Analytics">
              <PaymentStatusPanel analytics={analytics} />
            </ChartCard>
          </section>

          <section className="analytics-grid">
            <ChartCard title="Revenue vs Orders">
              <RevenueOrdersChart analytics={analytics} currency={currency} />
            </ChartCard>
            <ChartCard title="Revenue by Payment Method">
              <ProviderChart analytics={analytics} currency={currency} />
            </ChartCard>
          </section>

          <AnalyticsInsights analytics={analytics} currency={currency} />

          <section className="analytics-grid">
            <RecentPayments payments={analytics.payments} currency={currency} />
            <RecentOrders orders={analytics.orders} currency={currency} />
          </section>
        </>
      )}
    </main>
  );
}

function AnalyticsHeader({
  customFrom,
  customTo,
  isFiltersOpen,
  preset,
  onCustomFromChange,
  onCustomToChange,
  onExport,
  onPresetChange,
  onRefresh,
  onToggleFilters,
}: {
  customFrom: string;
  customTo: string;
  isFiltersOpen: boolean;
  preset: DateRangePreset;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onExport: () => void;
  onPresetChange: (value: DateRangePreset) => void;
  onRefresh: () => void;
  onToggleFilters: () => void;
}) {
  return (
    <section className="dashboard-header analytics-header">
      <div>
        <p className="eyebrow">Admin</p>
        <h1>Analytics</h1>
        <p>Track orders, revenue, payments and business performance.</p>
      </div>
      <div className="analytics-actions">
        <select
          aria-label="Select date range"
          value={preset}
          onChange={(event) => onPresetChange(event.target.value as DateRangePreset)}
        >
          {dateRangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {preset === "custom" ? (
          <>
            <input
              aria-label="Start date"
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
            />
            <input
              aria-label="End date"
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
            />
          </>
        ) : null}
        <button className="secondary-button compact-button" type="button" onClick={onToggleFilters}>
          {isFiltersOpen ? "Hide Filters" : "Filters"}
        </button>
        <button className="secondary-button compact-button" type="button" onClick={onRefresh}>
          Refresh
        </button>
        <button className="primary-button compact-button" type="button" onClick={onExport}>
          Export
        </button>
      </div>
    </section>
  );
}

function AnalyticsFiltersPanel({
  analytics,
  filters,
  isOpen,
  rangeLabel,
  onClear,
  onFiltersChange,
}: {
  analytics: AnalyticsData;
  filters: AnalyticsFilters;
  isOpen: boolean;
  rangeLabel: string;
  onClear: () => void;
  onFiltersChange: (filters: AnalyticsFilters) => void;
}) {
  const chips = getFilterChips(filters, rangeLabel);

  return (
    <section className="analytics-filter-shell">
      <div className="analytics-filter-chips">
        {chips.map((chip) => (
          <button
            className="filter-chip"
            key={`${chip.group}-${chip.value}`}
            type="button"
            onClick={() => {
              if (chip.group === "range") {
                onClear();
                return;
              }

              onFiltersChange(removeFilter(filters, chip.group, chip.value));
            }}
          >
            {chip.label} x
          </button>
        ))}
        {hasActiveFilters(filters) ? (
          <button className="clear-filter-button" type="button" onClick={onClear}>
            Clear All Filters
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="analytics-filter-panel">
          <FilterGroup
            label="Order Status"
            options={analytics.options.orderStatuses}
            values={filters.orderStatus}
            onChange={(values) =>
              onFiltersChange({ ...filters, orderStatus: values })
            }
          />
          <FilterGroup
            label="Payment Status"
            options={analytics.options.paymentStatuses}
            values={filters.paymentStatus}
            onChange={(values) =>
              onFiltersChange({ ...filters, paymentStatus: values })
            }
          />
          <FilterGroup
            label="Payment Provider"
            options={analytics.options.providers}
            values={filters.provider}
            onChange={(values) => onFiltersChange({ ...filters, provider: values })}
          />
          <FilterGroup
            label="Currency"
            options={analytics.options.currencies}
            values={filters.currency}
            onChange={(values) => onFiltersChange({ ...filters, currency: values })}
          />
          <FilterGroup
            label="Country"
            options={analytics.options.countries}
            values={filters.country}
            onChange={(values) => onFiltersChange({ ...filters, country: values })}
          />
          <label>
            <span>Customer</span>
            <input
              placeholder="Search email or name"
              value={filters.customer}
              onChange={(event) =>
                onFiltersChange({ ...filters, customer: event.target.value })
              }
            />
          </label>
          <label>
            <span>Product</span>
            <input
              placeholder="Search product or SKU"
              value={filters.product}
              onChange={(event) =>
                onFiltersChange({ ...filters, product: event.target.value })
              }
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

function FilterGroup({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="analytics-check-list">
        {options.map((option) => (
          <label key={option}>
            <input
              checked={values.includes(option)}
              type="checkbox"
              onChange={(event) => {
                onChange(
                  event.target.checked
                    ? [...values, option]
                    : values.filter((value) => value !== option),
                );
              }}
            />
            <span>{formatStatus(option)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function KpiGrid({
  analytics,
  currency,
}: {
  analytics: AnalyticsData;
  currency?: adminApi.AdminCurrency;
}) {
  const metrics = analytics.metrics;

  return (
    <section className="analytics-kpi-grid">
      <MetricCard
        change={analytics.comparisons.revenue}
        label="Total Revenue"
        tone="blue"
        value={formatMoney(metrics.revenue, currency)}
      />
      <MetricCard
        change={analytics.comparisons.orders}
        label="Total Orders"
        tone="teal"
        value={`${metrics.orders} Orders`}
      />
      <MetricCard
        change={analytics.comparisons.averageOrderValue}
        label="Average Order Value"
        tone="amber"
        value={formatMoney(metrics.averageOrderValue, currency)}
      />
      <MetricCard
        change={analytics.comparisons.successfulPayments}
        label="Successful Payments"
        meta={`${metrics.paymentSuccessRate.toFixed(1)}% success rate`}
        tone="green"
        value={`${metrics.successfulPayments}`}
      />
      <MetricCard
        change={analytics.comparisons.failedPayments}
        inverse
        label="Failed Payments"
        meta={`${metrics.paymentFailureRate.toFixed(1)}% failure rate`}
        tone="red"
        value={`${metrics.failedPayments}`}
      />
      <MetricCard
        change={analytics.comparisons.refundedAmount}
        label="Refunds"
        meta={`${metrics.refundedPayments} refund records`}
        tone="slate"
        value={formatMoney(metrics.refundedAmount, currency)}
      />
    </section>
  );
}

function MetricCard({
  change,
  inverse = false,
  label,
  meta,
  tone,
  value,
}: {
  change: number;
  inverse?: boolean;
  label: string;
  meta?: string;
  tone: string;
  value: string;
}) {
  const isPositive = inverse ? change <= 0 : change >= 0;

  return (
    <article className={`analytics-card metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={isPositive ? "trend-up" : "trend-down"}>
        {change >= 0 ? "Up" : "Down"} {Math.abs(change).toFixed(1)}% vs previous period
      </small>
      {meta ? <em>{meta}</em> : null}
    </article>
  );
}

function ChartCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="analytics-card chart-card">
      <div className="section-title">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function RevenueChart({
  analytics,
  currency,
}: {
  analytics: AnalyticsData;
  currency?: adminApi.AdminCurrency;
}) {
  return (
    <div className="chart-frame">
      <LineAreaSvg
        color="#1868db"
        currency={currency}
        data={analytics.timeline}
        previousData={analytics.previousTimeline}
        valueKey="revenue"
      />
    </div>
  );
}

function OrdersChart({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="chart-frame">
      <GroupedBarsSvg
        data={analytics.timeline}
        series={[
          { color: "#1868db", key: "orders", label: "Total Orders" },
          { color: "#14b8a6", key: "delivered", label: "Delivered" },
          { color: "#ef4444", key: "cancelled", label: "Cancelled" },
          { color: "#f59e0b", key: "pending", label: "Pending" },
        ]}
      />
    </div>
  );
}

function DistributionChart({
  data,
}: {
  data: { name: string; value: number; percent: number }[];
}) {
  if (!data.length) {
    return <EmptyChart />;
  }

  return (
    <div className="distribution-layout">
      <DonutSvg data={data} />
      <div className="chart-legend-list">
        {data.map((entry, index) => (
          <span key={entry.name}>
            <i style={{ background: chartColors[index % chartColors.length] }} />
            <strong>{formatStatus(entry.name)}</strong>
            <small>
              {entry.value} · {entry.percent.toFixed(1)}%
            </small>
          </span>
        ))}
      </div>
    </div>
  );
}

function PaymentStatusPanel({ analytics }: { analytics: AnalyticsData }) {
  return (
    <div className="payment-status-layout">
      <DistributionChart data={analytics.paymentStatus} />
      <div className="success-rate-panel">
        <span>Payment Success Rate</span>
        <strong>{analytics.metrics.paymentSuccessRate.toFixed(1)}%</strong>
        <small>
          {analytics.comparisons.paymentSuccessRate >= 0 ? "Up" : "Down"}{" "}
          {Math.abs(analytics.comparisons.paymentSuccessRate).toFixed(1)} pts vs previous period
        </small>
      </div>
    </div>
  );
}

function RevenueOrdersChart({
  analytics,
  currency,
}: {
  analytics: AnalyticsData;
  currency?: adminApi.AdminCurrency;
}) {
  return (
    <div className="chart-frame">
      <RevenueOrdersSvg analytics={analytics} currency={currency} />
    </div>
  );
}

type ChartSeriesKey =
  | "revenue"
  | "payments"
  | "orders"
  | "aov"
  | "delivered"
  | "cancelled"
  | "pending";

function LineAreaSvg({
  color,
  currency,
  data,
  previousData,
  valueKey,
}: {
  color: string;
  currency?: adminApi.AdminCurrency;
  data: AnalyticsData["timeline"];
  previousData?: AnalyticsData["timeline"];
  valueKey: ChartSeriesKey;
}) {
  const width = 720;
  const height = 300;
  const padding = { bottom: 42, left: 52, right: 18, top: 18 };
  const maxValue = Math.max(
    1,
    ...data.map((point) => Number(point[valueKey])),
    ...(previousData ?? []).map((point) => Number(point[valueKey])),
  );
  const points = toChartPoints(data, valueKey, width, height, padding, maxValue);
  const previousPoints = toChartPoints(
    previousData ?? [],
    valueKey,
    width,
    height,
    padding,
    maxValue,
  );
  const line = pointsToPath(points);
  const previousLine = pointsToPath(previousPoints);
  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : "";

  return (
    <svg aria-label="Revenue chart" className="analytics-svg" viewBox={`0 0 ${width} ${height}`}>
      <ChartGrid height={height} padding={padding} width={width} />
      <text className="chart-axis-label" x="8" y="24">
        {shortNumber(maxValue)}
      </text>
      {area ? <path className="analytics-area" d={area} fill={color} /> : null}
      {previousLine ? (
        <path className="analytics-line previous" d={previousLine} fill="none" />
      ) : null}
      {line ? (
        <path d={line} fill="none" stroke={color} strokeLinecap="round" strokeWidth="4" />
      ) : null}
      {points.map((point) => (
        <g className="chart-point" key={`${point.label}-${point.x}`}>
          <circle cx={point.x} cy={point.y} fill={color} r="4" />
          <title>
            {point.label}:{" "}
            {valueKey === "revenue"
              ? formatMoney(point.value, currency)
              : point.value.toFixed(0)}
          </title>
        </g>
      ))}
      <ChartXAxis data={data} height={height} padding={padding} width={width} />
    </svg>
  );
}

function GroupedBarsSvg({
  data,
  series,
}: {
  data: AnalyticsData["timeline"];
  series: { color: string; key: ChartSeriesKey; label: string }[];
}) {
  const width = 720;
  const height = 300;
  const padding = { bottom: 52, left: 42, right: 18, top: 18 };
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => series.map((item) => Number(point[item.key]))),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const bucketWidth = chartWidth / Math.max(1, data.length);
  const barWidth = Math.max(3, (bucketWidth - 8) / series.length);

  return (
    <svg aria-label="Orders chart" className="analytics-svg" viewBox={`0 0 ${width} ${height}`}>
      <ChartGrid height={height} padding={padding} width={width} />
      {data.map((point, pointIndex) =>
        series.map((item, seriesIndex) => {
          const value = Number(point[item.key]);
          const barHeight = (value / maxValue) * chartHeight;
          const x = padding.left + pointIndex * bucketWidth + 4 + seriesIndex * barWidth;
          const y = padding.top + chartHeight - barHeight;

          return (
            <rect
              fill={item.color}
              height={barHeight}
              key={`${point.label}-${item.key}`}
              rx="4"
              width={barWidth - 2}
              x={x}
              y={y}
            >
              <title>
                {point.label} {item.label}: {value}
              </title>
            </rect>
          );
        }),
      )}
      <ChartXAxis data={data} height={height} padding={padding} width={width} />
      <ChartLegend items={series} x={padding.left} y={height - 16} />
    </svg>
  );
}

function DonutSvg({
  data,
}: {
  data: { name: string; value: number; percent: number }[];
}) {
  const size = 250;
  const center = size / 2;
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg aria-label="Distribution chart" className="donut-svg" viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        fill="none"
        r={radius}
        stroke="#e2e8f0"
        strokeWidth="30"
      />
      {data.map((entry, index) => {
        const dash = (entry.percent / 100) * circumference;
        const segment = (
          <circle
            cx={center}
            cy={center}
            fill="none"
            key={entry.name}
            r={radius}
            stroke={chartColors[index % chartColors.length]}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            strokeWidth="30"
            transform={`rotate(-90 ${center} ${center})`}
          >
            <title>
              {formatStatus(entry.name)}: {entry.value} records
            </title>
          </circle>
        );
        offset += dash;
        return segment;
      })}
      <text className="donut-total" textAnchor="middle" x={center} y={center - 4}>
        {data.reduce((total, entry) => total + entry.value, 0)}
      </text>
      <text className="donut-label" textAnchor="middle" x={center} y={center + 18}>
        records
      </text>
    </svg>
  );
}

function RevenueOrdersSvg({
  analytics,
  currency,
}: {
  analytics: AnalyticsData;
  currency?: adminApi.AdminCurrency;
}) {
  const width = 720;
  const height = 300;
  const padding = { bottom: 46, left: 52, right: 42, top: 18 };
  const maxRevenue = Math.max(1, ...analytics.timeline.map((point) => point.revenue));
  const maxOrders = Math.max(1, ...analytics.timeline.map((point) => point.orders));
  const revenuePoints = toChartPoints(
    analytics.timeline,
    "revenue",
    width,
    height,
    padding,
    maxRevenue,
  );
  const orderPoints = toChartPoints(
    analytics.timeline,
    "orders",
    width,
    height,
    padding,
    maxOrders,
  );

  return (
    <svg aria-label="Revenue and orders chart" className="analytics-svg" viewBox={`0 0 ${width} ${height}`}>
      <ChartGrid height={height} padding={padding} width={width} />
      <text className="chart-axis-label" x="8" y="24">
        {shortNumber(maxRevenue)}
      </text>
      <text className="chart-axis-label" textAnchor="end" x={width - 4} y="24">
        {shortNumber(maxOrders)}
      </text>
      <path
        d={pointsToPath(revenuePoints)}
        fill="none"
        stroke="#1868db"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d={pointsToPath(orderPoints)}
        fill="none"
        stroke="#14b8a6"
        strokeLinecap="round"
        strokeWidth="4"
      />
      {revenuePoints.map((point) => (
        <circle cx={point.x} cy={point.y} fill="#1868db" key={`r-${point.label}`} r="4">
          <title>
            {point.label} Revenue: {formatMoney(point.value, currency)}
          </title>
        </circle>
      ))}
      {orderPoints.map((point) => (
        <circle cx={point.x} cy={point.y} fill="#14b8a6" key={`o-${point.label}`} r="4">
          <title>
            {point.label} Orders: {point.value}
          </title>
        </circle>
      ))}
      <ChartXAxis data={analytics.timeline} height={height} padding={padding} width={width} />
      <ChartLegend
        items={[
          { color: "#1868db", key: "revenue", label: "Revenue" },
          { color: "#14b8a6", key: "orders", label: "Orders" },
        ]}
        x={padding.left}
        y={height - 16}
      />
    </svg>
  );
}

function ProviderChart({
  analytics,
  currency,
}: {
  analytics: AnalyticsData;
  currency?: adminApi.AdminCurrency;
}) {
  if (!analytics.providers.length) {
    return <EmptyChart />;
  }

  return (
    <div className="provider-list">
      {analytics.providers.map((provider, index) => (
        <article key={provider.name}>
          <div>
            <strong>{formatStatus(provider.name)}</strong>
            <small>
              {provider.count} payments · {provider.successRate.toFixed(1)}% success
            </small>
          </div>
          <span>{formatMoney(provider.revenue, currency)}</span>
          <div className="provider-bar">
            <i
              style={{
                background: chartColors[index % chartColors.length],
                width: `${Math.max(4, provider.percent)}%`,
              }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function AnalyticsInsights({
  analytics,
  currency,
}: {
  analytics: AnalyticsData;
  currency?: adminApi.AdminCurrency;
}) {
  const bestSuccess = analytics.insights.bestSuccessRate;
  const bestSuccessRate = bestSuccess?.orders
    ? (bestSuccess.payments / Math.max(1, bestSuccess.orders)) * 100
    : 0;

  return (
    <section className="analytics-card insights-panel">
      <div className="section-title">
        <h2>Performance Insights</h2>
      </div>
      <div className="insight-grid">
        <InsightCard
          label="Highest Revenue Period"
          value={analytics.insights.highestRevenue?.label ?? "-"}
          meta={formatMoney(analytics.insights.highestRevenue?.revenue ?? 0, currency)}
        />
        <InsightCard
          label="Most Orders"
          value={analytics.insights.mostOrders?.label ?? "-"}
          meta={`${analytics.insights.mostOrders?.orders ?? 0} orders`}
        />
        <InsightCard
          label="Best Payment Success"
          value={bestSuccess?.label ?? "-"}
          meta={`${bestSuccessRate.toFixed(1)}%`}
        />
      </div>
    </section>
  );
}

function InsightCard({
  label,
  meta,
  value,
}: {
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </article>
  );
}

function RecentPayments({
  currency,
  payments,
}: {
  currency?: adminApi.AdminCurrency;
  payments: adminApi.AdminPayment[];
}) {
  const [search, setSearch] = useState("");
  const filteredPayments = payments
    .filter((payment) =>
      [
        payment.providerTransactionId,
        payment.providerIntentId,
        payment.order?.orderNumber,
        payment.order?.customerEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice(0, 8);

  return (
    <section className="analytics-card table-card">
      <div className="section-title">
        <h2>Recent Payments</h2>
        <input
          aria-label="Search recent payments"
          placeholder="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Provider</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.providerTransactionId ?? payment.providerIntentId ?? payment.id}</td>
                <td>{payment.order?.orderNumber ?? "-"}</td>
                <td>{payment.order?.customerEmail ?? "-"}</td>
                <td>{formatCompactDate(payment.processedAt ?? payment.createdAt)}</td>
                <td>{formatMoney(payment.amount, payment.currency ?? currency)}</td>
                <td>{formatStatus(payment.provider)}</td>
                <td>
                  <StatusBadge status={payment.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentOrders({
  currency,
  orders,
}: {
  currency?: adminApi.AdminCurrency;
  orders: adminApi.AdminOrder[];
}) {
  const recentOrders = [...orders]
    .sort(
      (first, second) =>
        new Date(second.placedAt ?? second.createdAt).getTime() -
        new Date(first.placedAt ?? first.createdAt).getTime(),
    )
    .slice(0, 8);

  return (
    <section className="analytics-card table-card">
      <div className="section-title">
        <h2>Recent Orders</h2>
        <a href="/admin/orders">View All Orders</a>
      </div>
      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>{order.customerEmail}</td>
                <td>{formatCompactDate(order.placedAt ?? order.createdAt)}</td>
                <td>{order.items.length}</td>
                <td>{formatMoney(order.displayTotalAmount, order.displayCurrency ?? currency)}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{formatStatus(status)}</span>;
}

function EmptyChart() {
  return (
    <div className="empty-chart">
      <p>No chart data for these filters.</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <main className="admin-page analytics-page">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Analytics</h1>
          <p>Track orders, revenue, payments and business performance.</p>
        </div>
      </section>
      <section className="analytics-kpi-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <article className="analytics-card metric-card skeleton-card" key={index}>
            <span />
            <strong />
            <small />
          </article>
        ))}
      </section>
      <section className="analytics-grid large">
        <div className="analytics-card skeleton-chart" />
        <div className="analytics-card skeleton-chart" />
      </section>
    </main>
  );
}

function getFilterChips(filters: AnalyticsFilters, rangeLabel: string) {
  return [
    { group: "range", label: rangeLabel, value: rangeLabel },
    ...filters.orderStatus.map((value) => ({
      group: "orderStatus",
      label: formatStatus(value),
      value,
    })),
    ...filters.paymentStatus.map((value) => ({
      group: "paymentStatus",
      label: formatStatus(value),
      value,
    })),
    ...filters.provider.map((value) => ({
      group: "provider",
      label: formatStatus(value),
      value,
    })),
    ...filters.currency.map((value) => ({ group: "currency", label: value, value })),
    ...filters.country.map((value) => ({ group: "country", label: value, value })),
  ];
}

function removeFilter(
  filters: AnalyticsFilters,
  group: string,
  value: string,
): AnalyticsFilters {
  if (!Array.isArray(filters[group as keyof AnalyticsFilters])) {
    return filters;
  }

  return {
    ...filters,
    [group]: (filters[group as keyof AnalyticsFilters] as string[]).filter(
      (item) => item !== value,
    ),
  };
}

function ChartGrid({
  height,
  padding,
  width,
}: {
  height: number;
  padding: ChartPadding;
  width: number;
}) {
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <g className="chart-grid">
      {Array.from({ length: 5 }, (_, index) => {
        const y = padding.top + (chartHeight / 4) * index;

        return (
          <line
            key={index}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
          />
        );
      })}
    </g>
  );
}

function ChartXAxis({
  data,
  height,
  padding,
  width,
}: {
  data: AnalyticsData["timeline"];
  height: number;
  padding: ChartPadding;
  width: number;
}) {
  const points = toChartPoints(data, "orders", width, height, padding, 1);
  const step = Math.max(1, Math.ceil(points.length / 6));

  return (
    <g className="chart-x-axis">
      {points
        .filter((_, index) => index % step === 0 || index === points.length - 1)
        .map((point) => (
          <text key={`${point.label}-${point.x}`} textAnchor="middle" x={point.x} y={height - 28}>
            {point.label}
          </text>
        ))}
    </g>
  );
}

function ChartLegend({
  items,
  x,
  y,
}: {
  items: { color: string; key: string; label: string }[];
  x: number;
  y: number;
}) {
  let offset = 0;

  return (
    <g className="svg-chart-legend">
      {items.map((item) => {
        const currentX = x + offset;
        offset += item.label.length * 7 + 34;

        return (
          <g key={item.key} transform={`translate(${currentX} ${y})`}>
            <circle cx="0" cy="-4" fill={item.color} r="5" />
            <text x="11" y="0">
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

type ChartPadding = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

function toChartPoints(
  data: AnalyticsData["timeline"],
  key: ChartSeriesKey,
  width: number,
  height: number,
  padding: ChartPadding,
  maxValue: number,
) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const denominator = Math.max(1, data.length - 1);

  return data.map((point, index) => {
    const value = Number(point[key]);
    return {
      label: point.label,
      value,
      x: padding.left + (chartWidth / denominator) * index,
      y: padding.top + chartHeight - (value / maxValue) * chartHeight,
    };
  });
}

function pointsToPath(points: { x: number; y: number }[]) {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ");
}

function shortNumber(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}
