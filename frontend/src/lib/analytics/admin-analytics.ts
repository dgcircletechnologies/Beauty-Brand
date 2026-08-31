import type * as adminApi from "@/lib/api/admin";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

export type AnalyticsFilters = {
  orderStatus: string[];
  paymentStatus: string[];
  provider: string[];
  currency: string[];
  customer: string;
  product: string;
  country: string[];
};

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
};

export type AnalyticsPoint = {
  label: string;
  timestamp: number;
  revenue: number;
  payments: number;
  orders: number;
  aov: number;
  delivered: number;
  cancelled: number;
  pending: number;
};

export type DistributionPoint = {
  name: string;
  value: number;
  amount?: number;
  percent: number;
};

export type ProviderPoint = {
  name: string;
  count: number;
  revenue: number;
  percent: number;
  successRate: number;
};

export type AnalyticsData = {
  orders: adminApi.AdminOrder[];
  payments: adminApi.AdminPayment[];
  previousOrders: adminApi.AdminOrder[];
  previousPayments: adminApi.AdminPayment[];
  timeline: AnalyticsPoint[];
  previousTimeline: AnalyticsPoint[];
  orderStatus: DistributionPoint[];
  paymentStatus: DistributionPoint[];
  providers: ProviderPoint[];
  metrics: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    successfulPayments: number;
    failedPayments: number;
    refundedPayments: number;
    refundedAmount: number;
    paymentSuccessRate: number;
    paymentFailureRate: number;
  };
  comparisons: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
    paymentSuccessRate: number;
  };
  insights: {
    highestRevenue: AnalyticsPoint | null;
    mostOrders: AnalyticsPoint | null;
    bestSuccessRate: AnalyticsPoint | null;
  };
  options: {
    orderStatuses: string[];
    paymentStatuses: string[];
    providers: string[];
    currencies: string[];
    countries: string[];
  };
};

const dayMs = 24 * 60 * 60 * 1000;
const successPaymentStatuses = ["SUCCEEDED"];
const refundPaymentStatuses = ["REFUNDED", "PARTIALLY_REFUNDED"];
const pendingOrderStatuses = ["PENDING_PAYMENT", "PAYMENT_FAILED", "PAID"];

export const emptyFilters: AnalyticsFilters = {
  orderStatus: [],
  paymentStatus: [],
  provider: [],
  currency: [],
  customer: "",
  product: "",
  country: [],
};

export function getDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
  now = new Date(),
): DateRange {
  const today = startOfDay(now);

  if (preset === "today") {
    return { from: today, to: endOfDay(today), label: "Today" };
  }

  if (preset === "yesterday") {
    const yesterday = addDays(today, -1);
    return { from: yesterday, to: endOfDay(yesterday), label: "Yesterday" };
  }

  if (preset === "last7") {
    return { from: addDays(today, -6), to: endOfDay(today), label: "Last 7 Days" };
  }

  if (preset === "last30") {
    return {
      from: addDays(today, -29),
      to: endOfDay(today),
      label: "Last 30 Days",
    };
  }

  if (preset === "thisMonth") {
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: endOfDay(today),
      label: "This Month",
    };
  }

  if (preset === "lastMonth") {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
    return { from, to, label: "Last Month" };
  }

  if (preset === "thisYear") {
    return {
      from: new Date(today.getFullYear(), 0, 1),
      to: endOfDay(today),
      label: "This Year",
    };
  }

  const from = customFrom ? startOfDay(new Date(customFrom)) : addDays(today, -29);
  const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(today);

  return {
    from,
    to: to < from ? endOfDay(from) : to,
    label: "Custom Range",
  };
}

export function getPreviousRange(range: DateRange) {
  const span = range.to.getTime() - range.from.getTime();
  const previousTo = new Date(range.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - span);

  return {
    from: previousFrom,
    to: previousTo,
    label: "Previous Period",
  };
}

export function buildAnalyticsData(
  allOrders: adminApi.AdminOrder[],
  allPayments: adminApi.AdminPayment[],
  range: DateRange,
  filters: AnalyticsFilters,
): AnalyticsData {
  const previousRange = getPreviousRange(range);
  const options = buildOptions(allOrders, allPayments);
  const orders = filterOrders(allOrders, range, filters);
  const payments = filterPayments(allPayments, range, filters, orders);
  const previousOrders = filterOrders(allOrders, previousRange, filters);
  const previousPayments = filterPayments(
    allPayments,
    previousRange,
    filters,
    previousOrders,
  );
  const timeline = buildTimeline(range, orders, payments);
  const previousTimeline = buildTimeline(previousRange, previousOrders, previousPayments);
  const metrics = buildMetrics(orders, payments);
  const previousMetrics = buildMetrics(previousOrders, previousPayments);

  return {
    orders,
    payments,
    previousOrders,
    previousPayments,
    timeline,
    previousTimeline,
    orderStatus: buildOrderDistribution(orders),
    paymentStatus: buildPaymentDistribution(payments),
    providers: buildProviderDistribution(payments),
    metrics,
    comparisons: {
      revenue: percentageChange(metrics.revenue, previousMetrics.revenue),
      orders: percentageChange(metrics.orders, previousMetrics.orders),
      averageOrderValue: percentageChange(
        metrics.averageOrderValue,
        previousMetrics.averageOrderValue,
      ),
      successfulPayments: percentageChange(
        metrics.successfulPayments,
        previousMetrics.successfulPayments,
      ),
      failedPayments: percentageChange(
        metrics.failedPayments,
        previousMetrics.failedPayments,
      ),
      refundedAmount: percentageChange(
        metrics.refundedAmount,
        previousMetrics.refundedAmount,
      ),
      paymentSuccessRate: metrics.paymentSuccessRate - previousMetrics.paymentSuccessRate,
    },
    insights: buildInsights(timeline),
    options,
  };
}

export function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function formatCompactDate(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function formatMoney(
  amount: number,
  currency?: { code: string; symbol: string | null; decimalDigits: number },
) {
  const symbol = currency?.symbol ?? currency?.code ?? "";

  return `${symbol}${amount.toFixed(currency?.decimalDigits ?? 2)}`;
}

export function hasActiveFilters(filters: AnalyticsFilters) {
  return (
    filters.orderStatus.length > 0 ||
    filters.paymentStatus.length > 0 ||
    filters.provider.length > 0 ||
    filters.currency.length > 0 ||
    filters.country.length > 0 ||
    Boolean(filters.customer.trim()) ||
    Boolean(filters.product.trim())
  );
}

function buildOptions(
  orders: adminApi.AdminOrder[],
  payments: adminApi.AdminPayment[],
) {
  return {
    orderStatuses: unique(orders.map((order) => order.status)),
    paymentStatuses: unique(payments.map((payment) => payment.status)),
    providers: unique(payments.map((payment) => payment.provider)),
    currencies: unique([
      ...orders.map((order) => order.displayCurrency?.code).filter(Boolean),
      ...payments.map((payment) => payment.currencyCode),
    ]),
    countries: unique(
      orders
        .map((order) =>
          order.addresses.find((address) => address.type === "SHIPPING")
            ?.countryCode,
        )
        .filter(Boolean),
    ),
  };
}

function filterOrders(
  orders: adminApi.AdminOrder[],
  range: DateRange,
  filters: AnalyticsFilters,
) {
  const customer = filters.customer.trim().toLowerCase();
  const product = filters.product.trim().toLowerCase();

  return orders.filter((order) => {
    const date = getOrderDate(order);
    const shippingCountry = order.addresses.find(
      (address) => address.type === "SHIPPING",
    )?.countryCode;
    const productText = order.items
      .map((item) => `${item.productName} ${item.sku}`)
      .join(" ")
      .toLowerCase();

    return (
      date >= range.from &&
      date <= range.to &&
      includesOrAll(filters.orderStatus, order.status) &&
      includesOrAll(filters.currency, order.displayCurrency?.code) &&
      includesOrAll(filters.country, shippingCountry) &&
      (!customer ||
        order.customerEmail.toLowerCase().includes(customer) ||
        order.user.email.toLowerCase().includes(customer) ||
        `${order.user.firstName} ${order.user.lastName ?? ""}`
          .toLowerCase()
          .includes(customer)) &&
      (!product || productText.includes(product))
    );
  });
}

function filterPayments(
  payments: adminApi.AdminPayment[],
  range: DateRange,
  filters: AnalyticsFilters,
  filteredOrders: adminApi.AdminOrder[],
) {
  const allowedOrderIds = new Set(filteredOrders.map((order) => order.id));

  return payments.filter((payment) => {
    const date = new Date(payment.processedAt ?? payment.createdAt);

    return (
      date >= range.from &&
      date <= range.to &&
      includesOrAll(filters.paymentStatus, payment.status) &&
      includesOrAll(filters.provider, payment.provider) &&
      includesOrAll(filters.currency, payment.currencyCode) &&
      (!payment.orderId || allowedOrderIds.has(payment.orderId))
    );
  });
}

function buildTimeline(
  range: DateRange,
  orders: adminApi.AdminOrder[],
  payments: adminApi.AdminPayment[],
) {
  const group = getGrouping(range);
  const buckets = new Map<string, AnalyticsPoint>();

  for (const cursor of getBucketDates(range, group)) {
    buckets.set(bucketKey(cursor, group), {
      label: bucketLabel(cursor, group),
      timestamp: cursor.getTime(),
      revenue: 0,
      payments: 0,
      orders: 0,
      aov: 0,
      delivered: 0,
      cancelled: 0,
      pending: 0,
    });
  }

  orders.forEach((order) => {
    const key = bucketKey(getOrderDate(order), group);
    const bucket = buckets.get(key);

    if (!bucket) {
      return;
    }

    bucket.orders += 1;

    if (order.status === "DELIVERED") {
      bucket.delivered += 1;
    } else if (order.status === "CANCELLED") {
      bucket.cancelled += 1;
    } else if (pendingOrderStatuses.includes(order.status)) {
      bucket.pending += 1;
    }
  });

  payments.forEach((payment) => {
    if (!successPaymentStatuses.includes(payment.status)) {
      return;
    }

    const key = bucketKey(new Date(payment.processedAt ?? payment.createdAt), group);
    const bucket = buckets.get(key);

    if (!bucket) {
      return;
    }

    bucket.revenue += payment.amount;
    bucket.payments += 1;
  });

  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    aov: bucket.payments ? bucket.revenue / bucket.payments : 0,
  }));
}

function buildMetrics(
  orders: adminApi.AdminOrder[],
  payments: adminApi.AdminPayment[],
) {
  const successfulPayments = payments.filter((payment) =>
    successPaymentStatuses.includes(payment.status),
  );
  const failedPayments = payments.filter((payment) => payment.status === "FAILED");
  const refundedPayments = payments.filter((payment) =>
    refundPaymentStatuses.includes(payment.status),
  );
  const revenue = successfulPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const refundedAmount = refundedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const completedPaymentCount = successfulPayments.length + failedPayments.length;

  return {
    revenue,
    orders: orders.length,
    averageOrderValue: successfulPayments.length
      ? revenue / successfulPayments.length
      : 0,
    successfulPayments: successfulPayments.length,
    failedPayments: failedPayments.length,
    refundedPayments: refundedPayments.length,
    refundedAmount,
    paymentSuccessRate: completedPaymentCount
      ? (successfulPayments.length / completedPaymentCount) * 100
      : 0,
    paymentFailureRate: completedPaymentCount
      ? (failedPayments.length / completedPaymentCount) * 100
      : 0,
  };
}

function buildOrderDistribution(orders: adminApi.AdminOrder[]) {
  const counts = countBy(orders, (order) => order.status);
  return toDistribution(counts, orders.length);
}

function buildPaymentDistribution(payments: adminApi.AdminPayment[]) {
  const counts = countBy(payments, (payment) => payment.status);
  return toDistribution(counts, payments.length);
}

function buildProviderDistribution(payments: adminApi.AdminPayment[]) {
  const revenueTotal = payments
    .filter((payment) => successPaymentStatuses.includes(payment.status))
    .reduce((total, payment) => total + payment.amount, 0);
  const grouped = new Map<
    string,
    { count: number; revenue: number; successes: number; total: number }
  >();

  payments.forEach((payment) => {
    const current = grouped.get(payment.provider) ?? {
      count: 0,
      revenue: 0,
      successes: 0,
      total: 0,
    };

    current.count += 1;
    current.total += 1;

    if (successPaymentStatuses.includes(payment.status)) {
      current.successes += 1;
      current.revenue += payment.amount;
    }

    grouped.set(payment.provider, current);
  });

  return [...grouped.entries()]
    .map(([name, value]) => ({
      name,
      count: value.count,
      revenue: value.revenue,
      percent: revenueTotal ? (value.revenue / revenueTotal) * 100 : 0,
      successRate: value.total ? (value.successes / value.total) * 100 : 0,
    }))
    .sort((first, second) => second.revenue - first.revenue);
}

function buildInsights(timeline: AnalyticsPoint[]) {
  const highestRevenue = maxBy(timeline, (point) => point.revenue);
  const mostOrders = maxBy(timeline, (point) => point.orders);
  const bestSuccessRate = maxBy(timeline, (point) =>
    point.payments + point.pending + point.cancelled
      ? (point.payments / (point.payments + point.pending + point.cancelled)) * 100
      : 0,
  );

  return {
    highestRevenue,
    mostOrders,
    bestSuccessRate,
  };
}

function toDistribution(counts: Map<string, number>, total: number) {
  return [...counts.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percent: total ? (value / total) * 100 : 0,
    }))
    .sort((first, second) => second.value - first.value);
}

function getOrderDate(order: adminApi.AdminOrder) {
  return new Date(order.placedAt ?? order.createdAt);
}

function getGrouping(range: DateRange) {
  const days = Math.ceil((range.to.getTime() - range.from.getTime()) / dayMs);

  if (days <= 1) {
    return "hour" as const;
  }

  if (days <= 45) {
    return "day" as const;
  }

  if (days <= 180) {
    return "week" as const;
  }

  return "month" as const;
}

function getBucketDates(
  range: DateRange,
  group: ReturnType<typeof getGrouping>,
) {
  const dates: Date[] = [];
  let cursor = floorDate(range.from, group);

  while (cursor <= range.to) {
    dates.push(new Date(cursor));
    cursor = addBucket(cursor, group);
  }

  return dates;
}

function floorDate(date: Date, group: ReturnType<typeof getGrouping>) {
  if (group === "hour") {
    const copy = new Date(date);
    copy.setMinutes(0, 0, 0);
    return copy;
  }

  if (group === "week") {
    const copy = startOfDay(date);
    copy.setDate(copy.getDate() - copy.getDay());
    return copy;
  }

  if (group === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  return startOfDay(date);
}

function addBucket(date: Date, group: ReturnType<typeof getGrouping>) {
  if (group === "hour") {
    const copy = new Date(date);
    copy.setHours(copy.getHours() + 1);
    return copy;
  }

  if (group === "week") {
    return addDays(date, 7);
  }

  if (group === "month") {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }

  return addDays(date, 1);
}

function bucketKey(date: Date, group: ReturnType<typeof getGrouping>) {
  return floorDate(date, group).toISOString();
}

function bucketLabel(date: Date, group: ReturnType<typeof getGrouping>) {
  if (group === "hour") {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
    }).format(date);
  }

  if (group === "month") {
    return new Intl.DateTimeFormat("en", {
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function percentageChange(current: number, previous: number) {
  if (!previous && !current) {
    return 0;
  }

  if (!previous) {
    return 100;
  }

  return ((current - previous) / previous) * 100;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
}

function includesOrAll(values: string[], value?: string | null) {
  return values.length === 0 || Boolean(value && values.includes(value));
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])].sort();
}

function maxBy<T>(items: T[], getValue: (item: T) => number) {
  if (!items.length) {
    return null;
  }

  return items.reduce((best, item) =>
    getValue(item) > getValue(best) ? item : best,
  );
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
