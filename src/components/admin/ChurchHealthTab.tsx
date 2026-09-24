"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { METRICS, type Metric } from "@/lib/people";
import { GAUGES } from "@/lib/rpms";
import { linePoints, METRIC_LABELS, type ChurchHealth } from "@/lib/churchHealth";
import { monthLabel } from "@/lib/melbourneDate";

// Spec 2: the read-only Church Health tab on /leaders/admin. The gauge
// colours appear only in the Leader health section.
const LINE_COLOURS: Record<Metric, string> = {
  pathways: "var(--accent)",
  intersections: "var(--lamp)",
  streetlights: "var(--ink-2)",
};
const CHART_W = 600;
const CHART_H = 160;

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lamp)]";
const card = "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6";
const heading = "font-serif text-2xl text-white";
const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]";
const td = "px-3 py-2 text-sm text-white";
const button = `inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm text-white hover:bg-[var(--surface-hover)] ${focus}`;

export default function ChurchHealthTab({ adminKey }: { adminKey: string }) {
  const [data, setData] = useState<ChurchHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/church-health", { headers: { authorization: `Bearer ${adminKey}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Could not load church health (${res.status})`);
        return body as ChurchHealth;
      })
      .then((body) => {
        if (cancelled) return;
        setData(body);
        setError(null);
      })
      .catch((e: Error) => {
        console.error("ChurchHealthTab: load failed", e);
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  if (error) {
    return (
      <div className={card}>
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
        <button type="button" onClick={refresh} className={`${button} mt-4`}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }
  if (!data) return <p className="text-gray-400">Loading church health...</p>;

  const max = Math.max(1, ...data.monthly.flatMap((m) => METRICS.map((k) => m.counts[k])));
  const first = data.monthly[0];
  const last = data.monthly[data.monthly.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">As of {data.asOf}, Melbourne time</p>
        <button type="button" onClick={refresh} className={button}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className={card} aria-labelledby="ch-totals">
        <h2 id="ch-totals" className={heading}>
          Church totals over time
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METRICS.map((m) => (
            <div key={m} className="rounded-lg border border-[var(--border)] p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted)]">
                <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: LINE_COLOURS[m] }} />
                {METRIC_LABELS[m]}
              </p>
              <p className="mt-1 font-serif text-4xl text-white">{data.totals[m]}</p>
            </div>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          preserveAspectRatio="none"
          className="mt-6 h-40 w-full"
          role="img"
          aria-label="People named per metric over the last 12 months"
        >
          <line x1={0} y1={CHART_H} x2={CHART_W} y2={CHART_H} stroke="var(--border-strong)" />
          {METRICS.map((m) => (
            <polyline
              key={m}
              fill="none"
              stroke={LINE_COLOURS[m]}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              points={linePoints(
                data.monthly.map((x) => x.counts[m]),
                CHART_W,
                CHART_H,
                max
              )}
            />
          ))}
        </svg>
        <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
          <span>{monthLabel(first.month)}</span>
          <span>{monthLabel(last.month)}</span>
        </div>
        <details className="mt-4">
          <summary className={`flex min-h-[44px] cursor-pointer items-center text-sm text-[var(--muted)] hover:text-white ${focus}`}>
            Month by month numbers
          </summary>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className={th}>Month</th>
                  {METRICS.map((m) => (
                    <th key={m} className={th}>
                      {METRIC_LABELS[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((row) => (
                  <tr key={row.month} className="border-t border-[var(--border)]">
                    <td className={td}>{monthLabel(row.month)}</td>
                    {METRICS.map((m) => (
                      <td key={m} className={td}>
                        {row.counts[m]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        {/* Henry to check wording */}
        <p className="mt-4 text-xs text-[var(--muted)]">
          History is rebuilt from record dates: a person counts from the month they were first added, and someone
          removed from a list is no longer counted in any month.
        </p>
      </section>

      <section className={card} aria-labelledby="ch-groups">
        <h2 id="ch-groups" className={heading}>
          By pathway group
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={th}>Group</th>
                <th className={th}>Leaders</th>
                {METRICS.map((m) => (
                  <th key={m} className={th}>
                    {METRIC_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.groups.map((g) => (
                <tr key={g.group} className="border-t border-[var(--border)]">
                  <td className={td}>{g.group}</td>
                  <td className={td}>{g.leaders}</td>
                  {METRICS.map((m) => (
                    <td key={m} className={td}>
                      {g.counts[m]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card} aria-labelledby="ch-leaders">
        <h2 id="ch-leaders" className={heading}>
          By leader
        </h2>
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {data.leaders.map((l) => (
            <li key={l.email}>
              <details>
                <summary
                  className={`flex min-h-[44px] cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm text-white ${focus}`}
                >
                  <span className="font-medium">{l.name}</span>
                  <span className="text-[var(--muted)]">{l.group}</span>
                  <span className="text-[var(--muted)]">
                    {METRICS.map((m) => `${METRIC_LABELS[m]} ${l.counts[m]}`).join(" · ")}
                  </span>
                </summary>
                <div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-3">
                  {METRICS.map((m) => (
                    <div key={m}>
                      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{METRIC_LABELS[m]}</p>
                      {l.names[m].length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">None yet</p>
                      ) : (
                        <ul className="text-sm text-white">
                          {l.names[m].map((n, i) => (
                            <li key={`${n}-${i}`}>{n}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} aria-labelledby="ch-health">
        <h2 id="ch-health" className={heading}>
          Leader health
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Averages of the last four weekly check-ins, out of 10.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={th}>Leader</th>
                <th className={th}>Last check-in</th>
                {GAUGES.map((g) => (
                  <th key={g.key} className={th} style={{ color: g.colour }} title={g.label}>
                    {g.letter}
                  </th>
                ))}
                <th className={th}>Flag</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[var(--border)]">
                <td className={`${td} font-medium`}>Whole church</td>
                <td className={td} />
                {GAUGES.map((g) => (
                  <td key={g.key} className={td} style={{ color: g.colour }}>
                    {data.churchAverages ? data.churchAverages[g.key] : "-"}
                  </td>
                ))}
                <td className={td} />
              </tr>
              {data.health.map((l) => (
                <tr key={l.email} className="border-t border-[var(--border)]">
                  <td className={td}>{l.name}</td>
                  <td className={td}>{l.lastCheckin ?? "Never"}</td>
                  {GAUGES.map((g) => (
                    <td key={g.key} className={td} style={{ color: g.colour }}>
                      {l.averages ? l.averages[g.key] : "-"}
                    </td>
                  ))}
                  {/* Henry to check wording */}
                  <td className={`${td} text-amber-400`}>{l.stale ? "No check-in for 3+ weeks" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
