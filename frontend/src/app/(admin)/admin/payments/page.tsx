"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import * as adminApi from "@/lib/api/admin";

function formatMoney(
  amount: number | string,
  currency?: { code: string; symbol: string | null; decimalDigits: number },
) {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return `${currency?.symbol ?? ""}0`;
  }

  return `${currency?.symbol ?? currency?.code ?? ""}${value.toFixed(
    currency?.decimalDigits ?? 2,
  )}`;
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default function AdminPaymentsPage() {
  const { accessToken } = useAuth();
  const [payments, setPayments] = useState<adminApi.AdminPayment[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;
    const token = accessToken;

    async function loadPayments() {
      setIsLoading(true);
      setError(null);

      try {
        const nextPayments = await adminApi.getAdminPayments(token);

        if (!isMounted) {
          return;
        }

        setPayments(nextPayments);
        setSelectedPaymentId(nextPayments[0]?.id ?? null);
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load payments",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesStatus =
        statusFilter === "all" || payment.status === statusFilter;
      const searchableText = [
        payment.providerTransactionId,
        payment.providerIntentId,
        payment.order?.orderNumber,
        payment.order?.customerEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        (!normalizedSearch || searchableText.includes(normalizedSearch))
      );
    });
  }, [payments, searchTerm, statusFilter]);

  const selectedPayment =
    filteredPayments.find((payment) => payment.id === selectedPaymentId) ??
    filteredPayments[0] ??
    null;
  const succeededTotal = payments
    .filter((payment) => payment.status === "SUCCEEDED")
    .reduce((total, payment) => total + payment.amount, 0);
  const failedCount = payments.filter(
    (payment) => payment.status === "FAILED",
  ).length;

  return (
    <main className="admin-page analytics-page payments-admin-page">
      <section className="dashboard-header analytics-header">
        <div>
          <p className="eyebrow">Payments</p>
          <h1>Razorpay payment details</h1>
          <p>Track payment attempts, Razorpay ids, and linked orders.</p>
        </div>
        <div className="analytics-actions">
          <Link className="secondary-link-button compact-button" href="/admin/payments/settings">
            Razorpay Variables
          </Link>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {isLoading ? (
        <section className="empty-surface">
          <h2>Loading payments...</h2>
        </section>
      ) : (
        <>
          <section className="analytics-kpi-grid payment-kpi-grid">
            <article className="analytics-card metric-card tone-blue">
              <span>Total payments</span>
              <strong>{payments.length}</strong>
              <small>All recorded attempts</small>
            </article>
            <article className="analytics-card metric-card tone-green">
              <span>Successful amount</span>
              <strong>{formatMoney(succeededTotal, payments[0]?.currency)}</strong>
              <small>Captured payments</small>
            </article>
            <article className="analytics-card metric-card tone-red">
              <span>Failed attempts</span>
              <strong>{failedCount}</strong>
              <small>Needs review or retry</small>
            </article>
          </section>

          <section className="admin-toolbar analytics-toolbar">
            <input
              aria-label="Search payments"
              placeholder="Search order, email, Razorpay id"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              aria-label="Filter payment status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </section>

          {filteredPayments.length ? (
            <section className="admin-detail-layout payment-detail-layout">
              <div className="admin-list-panel analytics-card payment-list-panel">
                <div className="section-title">
                  <h2>Transactions</h2>
                  <span>{filteredPayments.length}</span>
                </div>
                {filteredPayments.map((payment) => (
                  <button
                    className={
                      selectedPayment?.id === payment.id
                        ? "list-row active"
                        : "list-row"
                    }
                    key={payment.id}
                    type="button"
                    onClick={() => setSelectedPaymentId(payment.id)}
                  >
                    <span>
                      <strong>{payment.order?.orderNumber ?? payment.id}</strong>
                      <small>{payment.order?.customerEmail ?? "No customer"}</small>
                    </span>
                    <span>
                      <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                      <small>
                        <StatusBadge status={payment.status} />
                      </small>
                    </span>
                  </button>
                ))}
              </div>

              {selectedPayment ? (
                <aside className="product-detail-panel analytics-card payment-detail-panel">
                  <div className="section-title">
                    <h2>{formatStatus(selectedPayment.status)}</h2>
                    <span>{formatStatus(selectedPayment.provider)}</span>
                  </div>
                  <div className="detail-table">
                    <div className="detail-table-row">
                      <span>Amount</span>
                      <strong>
                        {formatMoney(
                          selectedPayment.amount,
                          selectedPayment.currency,
                        )}
                      </strong>
                    </div>
                    <div className="detail-table-row">
                      <span>Order</span>
                      <strong>
                        {selectedPayment.order?.orderNumber ?? "Not linked"}
                      </strong>
                    </div>
                    <div className="detail-table-row">
                      <span>Customer</span>
                      <strong>
                        {selectedPayment.order?.customerEmail ?? "Unknown"}
                      </strong>
                    </div>
                    <div className="detail-table-row">
                      <span>Razorpay order id</span>
                      <strong>{selectedPayment.providerIntentId ?? "-"}</strong>
                    </div>
                    <div className="detail-table-row">
                      <span>Razorpay payment id</span>
                      <strong>
                        {selectedPayment.providerTransactionId ?? "-"}
                      </strong>
                    </div>
                    <div className="detail-table-row">
                      <span>Failure</span>
                      <strong>{selectedPayment.failureReason ?? "-"}</strong>
                    </div>
                    <div className="detail-table-row">
                      <span>Created</span>
                      <strong>
                        {new Date(selectedPayment.createdAt).toLocaleString()}
                      </strong>
                    </div>
                    <div className="detail-table-row">
                      <span>Processed</span>
                      <strong>
                        {selectedPayment.processedAt
                          ? new Date(
                              selectedPayment.processedAt,
                            ).toLocaleString()
                          : "-"}
                      </strong>
                    </div>
                  </div>
                </aside>
              ) : null}
            </section>
          ) : (
            <section className="empty-surface">
              <h2>No payments found</h2>
              <p>Razorpay payment attempts will appear here.</p>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {formatStatus(status)}
    </span>
  );
}
