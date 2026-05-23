import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Entry, Person } from "./types";
import { PEOPLE } from "./types";
import { beersForEntry } from "./beerCount";
import {
  COMPARATIVE_ACHIEVEMENTS,
  GROUP_ACHIEVEMENTS,
  PERSONAL_ACHIEVEMENTS,
} from "./achievements";
import {
  biggestDay,
  countByKind,
  dailyHistory,
  drinkingDays,
  longestStreak,
  photoFraction,
  topDrinkNames,
  totalUnits,
} from "./stats";

interface Props {
  entries: Entry[];
  onClose: () => void;
}

const PERSON_COLOR: Record<Person, string> = {
  Naman: "#3b82f6",
  Ross: "#e5484d",
  Duncan: "#f5a524",
  Chaz: "#10b981",
  Kash: "#f97316",
  Jess: "#a78bfa",
  Tess: "#ec4899",
  Emma: "#06b6d4",
  Niamh: "#84cc16",
};

type Filter = "Everyone" | Person;

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

function lastNDays(rows: ReturnType<typeof dailyHistory>, n: number) {
  return rows.slice(-n);
}

export function StatsPage({ entries, onClose }: Props) {
  const [filter, setFilter] = useState<Filter>("Everyone");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "Everyone" ? entries : entries.filter((e) => e.person === filter)),
    [entries, filter],
  );

  const headline = useMemo(() => {
    const total = filtered.length;
    const units = totalUnits(filtered);
    const days = drinkingDays(filtered);
    return { total, units, days };
  }, [filtered]);

  const leaderboard = useMemo(() => {
    return PEOPLE.map((p) => ({
      person: p,
      total: entries.filter((e) => e.person === p).length,
      beers: entries
        .filter((e) => e.person === p)
        .reduce((s, e) => s + beersForEntry(e), 0),
    })).sort(
      (a, b) => b.total - a.total || a.person.localeCompare(b.person),
    );
  }, [entries]);

  const kindCounts = useMemo(() => countByKind(filtered), [filtered]);
  const kindTotal =
    kindCounts.beer + kindCounts.wine + kindCounts.spirit + kindCounts.other;

  const daily = useMemo(() => lastNDays(dailyHistory(entries), 30), [entries]);

  const dailyData = useMemo(() => {
    return daily.map((row) => {
      const point: Record<string, number | string> = {
        key: row.key,
        label: formatDayLabel(row.key),
      };
      if (filter === "Everyone") {
        for (const p of PEOPLE) point[p] = row.byPerson[p];
      } else {
        point[filter] = row.byPerson[filter];
      }
      return point;
    });
  }, [daily, filter]);

  const topDrinks = useMemo(() => topDrinkNames(filtered, 5), [filtered]);

  const biggest = useMemo(
    () => biggestDay(entries, filter === "Everyone" ? undefined : filter),
    [entries, filter],
  );
  const streak = useMemo(() => longestStreak(filtered), [filtered]);
  const photos = useMemo(() => photoFraction(filtered), [filtered]);

  return (
    <div
      className="modal-backdrop stats-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Stats and achievements"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="stats-page">
        <div className="stats-page-header">
          <h2>📊 Stats & Achievements</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="person-filter" role="tablist">
          {(["Everyone", ...PEOPLE] as Filter[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={filter === p}
              className={`person-pill ${filter === p ? "selected" : ""}`}
              onClick={() => setFilter(p)}
              style={
                filter === p && p !== "Everyone"
                  ? {
                      background: PERSON_COLOR[p],
                      borderColor: PERSON_COLOR[p],
                      color: "#0a0a0a",
                    }
                  : undefined
              }
            >
              {p}
            </button>
          ))}
        </div>

        <div className="headline-grid">
          <HeadlineCard label="Drinks" value={String(headline.total)} />
          <HeadlineCard
            label="Units"
            value={headline.units.toFixed(1)}
            hint="UK alcohol units"
          />
          <HeadlineCard label="Drink days" value={String(headline.days)} />
        </div>

        <section className="stats-card">
          <h3 className="stats-card-title">Leaderboard</h3>
          {leaderboard[0]?.total === 0 ? (
            <p className="empty">No drinks logged yet.</p>
          ) : (
            <div className="leaderboard">
              {leaderboard.map((row, idx) => {
                const width = leaderboard[0].total
                  ? (row.total / leaderboard[0].total) * 100
                  : 0;
                return (
                  <div key={row.person} className="leaderboard-row">
                    <span className="leaderboard-rank">{idx + 1}</span>
                    <span className="leaderboard-name">{row.person}</span>
                    <div className="leaderboard-bar">
                      <div
                        className="leaderboard-fill"
                        style={{
                          width: `${width}%`,
                          background: PERSON_COLOR[row.person],
                        }}
                      />
                    </div>
                    <span className="leaderboard-value">
                      {row.total}
                      <span className="leaderboard-sub">
                        {" "}
                        · {row.beers}🍺
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {kindTotal > 0 && (
          <section className="stats-card">
            <h3 className="stats-card-title">By kind</h3>
            <div className="kind-bar">
              {(
                [
                  ["beer", "🍺", "#f5a524"],
                  ["wine", "🍷", "#e5484d"],
                  ["spirit", "🥃", "#a78bfa"],
                  ["other", "🍹", "#22d3ee"],
                ] as const
              ).map(([kind, emoji, color]) => {
                const count = kindCounts[kind];
                const p = pct(count, kindTotal);
                return (
                  <div key={kind} className="kind-row">
                    <span className="kind-label">
                      {emoji} {kind}
                    </span>
                    <div className="kind-bar-track">
                      <div
                        className="kind-bar-fill"
                        style={{ width: `${p}%`, background: color }}
                      />
                    </div>
                    <span className="kind-value">
                      {count} <span className="kind-sub">({p}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {dailyData.length > 0 && (
          <section className="stats-card">
            <h3 className="stats-card-title">Daily history</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                    interval="preserveStartEnd"
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)", fontSize: 10 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e1e1e",
                      border: "1px solid #333",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  {(filter === "Everyone" ? PEOPLE : [filter]).map((p) => (
                    <Bar
                      key={p}
                      dataKey={p}
                      stackId="a"
                      fill={PERSON_COLOR[p as Person]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {topDrinks.length > 0 && (
          <section className="stats-card">
            <h3 className="stats-card-title">Top drinks</h3>
            <ul className="stats-list">
              {topDrinks.map((d) => (
                <li key={d.name} className="stats-row">
                  <span>{d.name}</span>
                  <strong>{d.count}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="stats-card">
          <h3 className="stats-card-title">Fun facts</h3>
          <ul className="fun-facts">
            <li>
              Biggest day:{" "}
              <strong>
                {biggest
                  ? `${biggest.count} drinks on ${formatDayLabel(biggest.key)}`
                  : "—"}
              </strong>
            </li>
            <li>
              Longest streak: <strong>{streak} day{streak === 1 ? "" : "s"}</strong>
            </li>
            <li>
              Photos:{" "}
              <strong>
                {photos.withPhoto} / {photos.total}
                {photos.total
                  ? ` (${pct(photos.withPhoto, photos.total)}%)`
                  : ""}
              </strong>
            </li>
          </ul>
        </section>

        <section className="stats-card">
          <h3 className="stats-card-title">🏆 Hall of Fame</h3>
          <p className="stats-card-sub">Who beat the rest</p>
          <div className="hall-of-fame">
            {COMPARATIVE_ACHIEVEMENTS.map((ach) => {
              const result = ach.evaluate(entries);
              const hasWinner = result.winners.length > 0 && result.value > 0;
              return (
                <div
                  key={ach.id}
                  className={`hall-card ${hasWinner ? "" : "locked"}`}
                >
                  <div className="hall-emoji">{ach.emoji}</div>
                  <div className="hall-body">
                    <div className="hall-label">{ach.label}</div>
                    <div className="hall-winner">
                      {hasWinner ? (
                        <>
                          <strong>
                            {result.winners.join(" & ")}
                          </strong>{" "}
                          <span className="hall-value">
                            · {result.formatValue(result.value)}
                          </span>
                        </>
                      ) : (
                        <span className="empty">unclaimed</span>
                      )}
                    </div>
                    <div className="hall-desc">{ach.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="stats-card">
          <h3 className="stats-card-title">🎊 Group achievements</h3>
          <div className="group-achievements">
            {GROUP_ACHIEVEMENTS.map((ach) => {
              const result = ach.evaluate(entries);
              return (
                <div
                  key={ach.id}
                  className={`achievement ${result.unlocked ? "unlocked" : "locked"}`}
                >
                  <div className="achievement-emoji">{ach.emoji}</div>
                  <div className="achievement-body">
                    <div className="achievement-label">{ach.label}</div>
                    <div className="achievement-desc">{ach.description}</div>
                    {result.detail && (
                      <div className="achievement-detail">{result.detail}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="stats-card">
          <h3 className="stats-card-title">
            🎖️ {filter === "Everyone" ? "Personal achievements" : `${filter}'s achievements`}
          </h3>
          {filter === "Everyone" ? (
            <p className="stats-card-sub">
              Aggregate unlocks. Tap a name above to see one person.
            </p>
          ) : null}
          <div className="personal-achievements">
            {PERSONAL_ACHIEVEMENTS.map((ach) => {
              if (filter === "Everyone") {
                const unlockedBy = PEOPLE.filter(
                  (p) => ach.evaluate(entries, p).unlocked,
                );
                return (
                  <div
                    key={ach.id}
                    className={`achievement ${unlockedBy.length > 0 ? "unlocked" : "locked"}`}
                  >
                    <div className="achievement-emoji">{ach.emoji}</div>
                    <div className="achievement-body">
                      <div className="achievement-label">{ach.label}</div>
                      <div className="achievement-desc">{ach.description}</div>
                      <div className="achievement-detail">
                        {unlockedBy.length}/{PEOPLE.length}
                        {unlockedBy.length
                          ? ` · ${unlockedBy.join(", ")}`
                          : ""}
                      </div>
                    </div>
                  </div>
                );
              }
              const result = ach.evaluate(entries, filter);
              const showProgress =
                !result.unlocked &&
                result.total != null &&
                result.total > 1 &&
                result.progress != null;
              return (
                <div
                  key={ach.id}
                  className={`achievement ${result.unlocked ? "unlocked" : "locked"}`}
                >
                  <div className="achievement-emoji">{ach.emoji}</div>
                  <div className="achievement-body">
                    <div className="achievement-label">{ach.label}</div>
                    <div className="achievement-desc">{ach.description}</div>
                    {showProgress && (
                      <>
                        <div className="achievement-progress">
                          <div
                            className="achievement-progress-fill"
                            style={{
                              width: `${Math.min(100, (result.progress! / result.total!) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="achievement-detail">
                          {result.progress}/{result.total}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function HeadlineCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="headline-card">
      <div className="headline-value">{value}</div>
      <div className="headline-label">{label}</div>
      {hint && <div className="headline-hint">{hint}</div>}
    </div>
  );
}
