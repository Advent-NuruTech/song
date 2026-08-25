"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import styles from "./donations.module.css";

const PAGE_SIZE = 50;
const STATUSES = ["all", "successful", "pending", "failed", "cancelled"] as const;
type StatusFilter = (typeof STATUSES)[number];

type DonationRow = {
  donation_id: string;
  user_id: string | null;
  donor_name: string | null;
  donor_email: string | null;
  paystack_reference: string;
  amount: number;
  currency: string;
  status: Exclude<StatusFilter, "all">;
  payment_channel: string | null;
  created_at: string;
  verified_at: string | null;
  result_count: number;
};

type DonationSummary = {
  attempt_count: number;
  successful_count: number;
  successful_amount: number;
  pending_count: number;
  failed_count: number;
  cancelled_count: number;
};

const EMPTY_SUMMARY: DonationSummary = {
  attempt_count: 0,
  successful_count: 0,
  successful_amount: 0,
  pending_count: 0,
  failed_count: 0,
  cancelled_count: 0,
};

const kes = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function statusCount(summary: DonationSummary, status: StatusFilter) {
  if (status === "all") return summary.attempt_count;
  return summary[`${status}_count` as keyof DonationSummary] as number;
}

export default function DonationsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<DonationRow[]>([]);
  const [summary, setSummary] = useState<DonationSummary>(EMPTY_SUMMARY);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    let active = true;
    void getSupabase().rpc("has_permission", { requested: "donations.read" }).then(({ data, error: permissionError }) => {
      if (!active) return;
      if (permissionError) setError(permissionError.message);
      setAllowed(Boolean(data));
    });
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    if (!allowed) return;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    const supabase = getSupabase();
    const params = { p_from: fromDate || null, p_to: toDate || null };
    const [reportResult, summaryResult] = await Promise.all([
      supabase.rpc("get_donation_report", {
        ...params,
        p_status: status === "all" ? null : status,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      }),
      supabase.rpc("get_donation_summary", params),
    ]);
    if (sequence !== requestSequence.current) return;
    const requestError = reportResult.error || summaryResult.error;
    if (requestError) {
      setError(requestError.message);
      setRows([]);
    } else {
      setRows((reportResult.data ?? []) as DonationRow[]);
      setSummary(((summaryResult.data ?? [])[0] as DonationSummary | undefined) ?? EMPTY_SUMMARY);
    }
    setLoading(false);
  }, [allowed, fromDate, page, status, toDate]);

  useEffect(() => { void load(); }, [load]);

  const applyDates = (event: FormEvent) => {
    event.preventDefault();
    if (fromDraft && toDraft && fromDraft > toDraft) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setPage(0);
    setFromDate(fromDraft);
    setToDate(toDraft);
  };

  const resetDates = () => {
    setFromDraft("");
    setToDraft("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  if (allowed === null) return <div className="center-screen">Checking senior administrator access…</div>;
  if (!allowed) return <div><h1>Donations</h1><div className="card"><p>This financial report is restricted to senior administrators.</p></div></div>;

  const totalRows = rows[0]?.result_count ?? statusCount(summary, status);
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Voluntary donations</h1>
          <p className="sub">Senior administrator report for Support the Work. Donations never change user access or entitlements.</p>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <div className={styles.summaryGrid}>
        <div className="card stat"><div className="num">{kes.format(summary.successful_amount)}</div><div className="label">Verified support</div></div>
        <div className="card stat"><div className="num">{summary.successful_count.toLocaleString()}</div><div className="label">Successful</div></div>
        <div className="card stat"><div className="num">{summary.pending_count.toLocaleString()}</div><div className="label">Pending</div></div>
        <div className="card stat"><div className="num">{summary.failed_count.toLocaleString()}</div><div className="label">Failed</div></div>
        <div className="card stat"><div className="num">{summary.attempt_count.toLocaleString()}</div><div className="label">All attempts</div></div>
      </div>

      <form className={`card ${styles.filters}`} onSubmit={applyDates}>
        <div className={styles.dateField}><label htmlFor="donations-from">From</label><input id="donations-from" type="date" value={fromDraft} onChange={(event) => setFromDraft(event.target.value)} /></div>
        <div className={styles.dateField}><label htmlFor="donations-to">To</label><input id="donations-to" type="date" value={toDraft} onChange={(event) => setToDraft(event.target.value)} /></div>
        <button className="btn primary" type="submit">Apply dates</button>
        <button className="btn" type="button" onClick={resetDates}>Reset</button>
      </form>

      <div className={styles.statusTabs} aria-label="Donation status filter">
        {STATUSES.map((item) => (
          <button
            type="button"
            key={item}
            className={`${styles.statusTab} ${status === item ? styles.activeTab : ""}`}
            aria-pressed={status === item}
            onClick={() => { setStatus(item); setPage(0); }}
          >
            <span>{item === "all" ? "All" : item[0].toUpperCase() + item.slice(1)}</span>
            <strong>{statusCount(summary, item).toLocaleString()}</strong>
          </button>
        ))}
      </div>

      <div className={`card ${styles.tableCard}`} aria-busy={loading}>
        <div className={styles.tableHeader}>
          <strong>{status === "all" ? "All donation attempts" : `${status[0].toUpperCase() + status.slice(1)} donations`}</strong>
          <span>{loading ? "Loading…" : `${totalRows.toLocaleString()} record${totalRows === 1 ? "" : "s"}`}</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>Supporter</th><th>Amount</th><th>Status</th><th>Channel</th><th>Reference</th><th>Created</th><th>Verified</th></tr></thead>
            <tbody>
              {!loading && rows.length === 0 ? <tr><td colSpan={7} className={styles.empty}>No donation records match these filters.</td></tr> : rows.map((row) => (
                <tr key={row.donation_id}>
                  <td><strong>{row.donor_name || (row.user_id ? "Advent Pro user" : "Anonymous supporter")}</strong><span className={styles.secondary}>{row.donor_email || "Email not recorded"}</span></td>
                  <td className={styles.amount}>{kes.format(row.amount)}</td>
                  <td><span className={`${styles.status} ${styles[row.status]}`}>{row.status}</span></td>
                  <td>{row.payment_channel || "—"}</td>
                  <td><code className={styles.reference}>{row.paystack_reference}</code></td>
                  <td>{dateTime.format(new Date(row.created_at))}</td>
                  <td>{row.verified_at ? dateTime.format(new Date(row.verified_at)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <button className="btn" type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button className="btn" type="button" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
