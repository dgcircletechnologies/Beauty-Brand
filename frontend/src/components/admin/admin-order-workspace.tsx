"use client";

import {
  FormEvent,
  memo,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import * as adminApi from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const activeOrderStatuses = [
  "PENDING_PAYMENT",
  "PAYMENT_FAILED",
  "PAID",
  "PROCESSING",
  "CANCELLATION_REQUESTED",
  "SHIPPED",
];

export const completedOrderStatuses = ["DELIVERED"];
export const closedOrderStatuses = ["DELIVERED", "CANCELLED"];

type OrderModalActionContext = {
  close: () => void;
};

type AdminOrderWorkspaceProps = {
  analytics?: boolean;
  emptyText: string;
  emptyTitle: string;
  isLoading: boolean;
  orders: adminApi.AdminOrder[];
  renderActions?: (
    order: adminApi.AdminOrder,
    context: OrderModalActionContext,
  ) => ReactNode;
  showFilters?: boolean;
  showStatusHistory?: boolean;
  title: string;
};

const pageSize = 8;

export const AdminOrderWorkspace = memo(function AdminOrderWorkspace({
  analytics = false,
  emptyText,
  emptyTitle,
  isLoading,
  orders,
  renderActions,
  showFilters = true,
  showStatusHistory = false,
  title,
}: AdminOrderWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] =
    useState<adminApi.AdminOrder | null>(null);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);

  const statusOptions = useMemo(
    () => [...new Set(orders.map((order) => order.status))].sort(),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const productNames = getProductNames(order).toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.customerEmail.toLowerCase().includes(normalizedSearch) ||
        productNames.includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [debouncedSearchTerm, orders, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredOrders]);

  const metrics = useMemo(() => getOrderMetrics(orders), [orders]);
  const openOrder = useCallback((order: adminApi.AdminOrder) => {
    setSelectedOrder(order);
  }, []);
  const closeOrder = useCallback(() => {
    setSelectedOrder(null);
  }, []);
  const goToNextPage = useCallback(() => {
    setPage((current) => current + 1);
  }, []);
  const goToPreviousPage = useCallback(() => {
    setPage((current) => Math.max(current - 1, 1));
  }, []);

  if (isLoading) {
    return (
      <section className="empty-surface">
        <h2>Loading orders...</h2>
      </section>
    );
  }

  if (!orders.length) {
    return (
      <section className="empty-surface">
        <h2>{emptyTitle}</h2>
        <p>{emptyText}</p>
      </section>
    );
  }

  return (
    <>
      {analytics ? <OrderAnalytics metrics={metrics} /> : null}
      <section className="catalog-section">
        <div className="section-title">
          <h2>{title}</h2>
          <span>{filteredOrders.length}</span>
        </div>
        {showFilters ? (
          <div className="all-products-filters">
            <input
              aria-label="Search orders"
              placeholder="Search order, customer, product"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Filter order status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="admin-order-list">
          {visibleOrders.map((order) => (
            <OrderRow key={order.id} order={order} onOpen={openOrder} />
          ))}
        </div>
        {filteredOrders.length === 0 ? (
          <p className="muted-text">No orders match these filters.</p>
        ) : null}
        <PaginationControls
          currentPage={currentPage}
          hasNextPage={currentPage < totalPages}
          hasPreviousPage={currentPage > 1}
          totalPages={totalPages}
          onNext={goToNextPage}
          onPrevious={goToPreviousPage}
        />
      </section>
      {selectedOrder ? (
        <OrderDetailModal
          order={selectedOrder}
          showStatusHistory={showStatusHistory}
          onClose={closeOrder}
        >
          {renderActions?.(selectedOrder, {
            close: closeOrder,
          })}
        </OrderDetailModal>
      ) : null}
    </>
  );
});

type OrderRowProps = {
  order: adminApi.AdminOrder;
  onOpen: (order: adminApi.AdminOrder) => void;
};

const OrderRow = memo(function OrderRow({ order, onOpen }: OrderRowProps) {
  const isComplete = completedOrderStatuses.includes(order.status);
  const productNames = useMemo(() => getProductNames(order), [order]);

  return (
    <button
      className="admin-order-row rich"
      type="button"
      onClick={() => onOpen(order)}
    >
      <span>
        <strong>
          #{order.orderNumber}{" "}
          {isComplete ? <span className="order-complete-check">✓</span> : null}
        </strong>
        <small>{order.customerEmail}</small>
      </span>
      <span className="order-product-summary">{productNames}</span>
      <span>{formatStatus(order.status)}</span>
      <strong>{formatMoney(order.displayTotalAmount, order.displayCurrency)}</strong>
    </button>
  );
});

type OrderDetailModalProps = {
  children?: ReactNode;
  order: adminApi.AdminOrder;
  showStatusHistory: boolean;
  onClose: () => void;
};

export const OrderDetailModal = memo(function OrderDetailModal({
  children,
  order,
  showStatusHistory,
  onClose,
}: OrderDetailModalProps) {
  const shippingAddress = order.addresses.find(
    (address) => address.type === "SHIPPING",
  );
  const latestShipment = order.shipments[0] ?? null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel order-modal-panel" role="dialog">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Order</p>
            <h2>#{order.orderNumber}</h2>
          </div>
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="order-detail-grid">
          <div>
            <h3>Customer</h3>
            <p>{order.customerEmail}</p>
            <p>{order.customerPhone ?? "No phone"}</p>
          </div>
          <div>
            <h3>Status</h3>
            <p>{formatStatus(order.status)}</p>
            <p>
              {latestShipment
                ? `Shipment ${formatStatus(latestShipment.status)}`
                : "No shipment yet"}
            </p>
          </div>
          <div>
            <h3>Total</h3>
            <p>{formatMoney(order.displayTotalAmount, order.displayCurrency)}</p>
            <p>{order.items.length} item lines</p>
          </div>
        </div>

        {shippingAddress ? (
          <section className="order-detail-section">
            <h3>Shipping Address</h3>
            <p>
              {shippingAddress.firstName} {shippingAddress.lastName},{" "}
              {shippingAddress.line1}
              {shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""},{" "}
              {shippingAddress.city}, {shippingAddress.countryCode}
            </p>
          </section>
        ) : null}

        <section className="order-detail-section">
          <h3>Products</h3>
          <div className="admin-data-list">
            {order.items.map((item) => (
              <div className="admin-data-row" key={item.id}>
                <div>
                  <h3>{item.productName}</h3>
                  <p>
                    {item.variantLabel ?? item.sku} x {item.quantity}
                  </p>
                </div>
                <span>
                  {formatMoney(item.displayLineTotal, order.displayCurrency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {showStatusHistory ? (
          <section className="order-detail-section">
            <h3>Status History</h3>
            <div className="status-history-list">
              {order.statusHistory.map((history) => (
                <article className="status-history-row" key={history.id}>
                  <strong>
                    {history.fromStatus
                      ? formatStatus(history.fromStatus)
                      : "created"}{" "}
                    to {formatStatus(history.toStatus)}
                  </strong>
                  <small>{formatDate(history.createdAt)}</small>
                  {history.reason ? <p>{history.reason}</p> : null}
                </article>
              ))}
              {order.statusHistory.length === 0 ? (
                <p className="muted-text">No status history yet.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {children ? <section className="order-detail-section">{children}</section> : null}
      </section>
    </div>
  );
});

type OrderAnalyticsProps = {
  metrics: {
    status: string;
    count: number;
    percent: number;
  }[];
};

const OrderAnalytics = memo(function OrderAnalytics({
  metrics,
}: OrderAnalyticsProps) {
  return (
    <section className="catalog-section order-analytics">
      <div className="section-title">
        <h2>Analytics</h2>
        <span>{metrics.reduce((total, metric) => total + metric.count, 0)}</span>
      </div>
      <div className="order-analytics-bars">
        {metrics.map((metric) => (
          <div className="order-analytics-row" key={metric.status}>
            <span>{formatStatus(metric.status)}</span>
            <div>
              <i style={{ width: `${metric.percent}%` }} />
            </div>
            <strong>{metric.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
});

type PaginationControlsProps = {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
  totalPages: number;
};

const PaginationControls = memo(function PaginationControls({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
  totalPages,
}: PaginationControlsProps) {
  return (
    <div className="pagination-actions">
      <button
        className="secondary-button compact-button"
        disabled={!hasPreviousPage}
        type="button"
        onClick={onPrevious}
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        className="secondary-button compact-button"
        disabled={!hasNextPage}
        type="button"
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
});

export function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export function formatMoney(
  amount: number | string,
  currency: { code: string; symbol: string | null; decimalDigits: number },
) {
  return `${currency.symbol ?? currency.code}${Number(amount).toFixed(
    currency.decimalDigits,
  )}`;
}

export function getProductNames(order: adminApi.AdminOrder) {
  return order.items.map((item) => item.productName).join(", ") || "No products";
}

export function getLatestShipment(order: adminApi.AdminOrder) {
  return order.shipments[0] ?? null;
}

export function handleOrderFormSubmit(
  event: FormEvent<HTMLFormElement>,
  handler: (formData: FormData) => void,
) {
  event.preventDefault();
  handler(new FormData(event.currentTarget));
}

function getOrderMetrics(orders: adminApi.AdminOrder[]) {
  const counts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(counts));

  return Object.entries(counts)
    .sort(([firstStatus], [secondStatus]) =>
      firstStatus.localeCompare(secondStatus),
    )
    .map(([status, count]) => ({
      status,
      count,
      percent: Math.max(8, Math.round((count / maxCount) * 100)),
    }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
