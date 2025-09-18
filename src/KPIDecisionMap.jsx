import React, { useMemo, useState } from "react";

// KPI Decision Map – Condensed + One‑Pager Printable
// Print styles have been updated for a more compact layout to prevent awkward page breaks.
// Color scheme updated based on user-provided color bank.

const TYPE_META = {
  Strategic: {
    color: "bg-[#41196C]/10 border-[#41196C]",
    title: "Strategic Dashboard",
    blurb: "Tracks outcomes vs. objectives for leaders; curated KPIs, trends, variance (monthly/quarterly).",
    chips: ["Exec view", "Objectives", "M/Q cadence"]
  },
  Operational: {
    color: "bg-[#CD0A85]/10 border-[#CD0A85]",
    title: "Operational Dashboard",
    blurb: "Monitors live/near‑real‑time process health; SLAs, exceptions, queues, alerts.",
    chips: ["Real‑time", "SLAs", "Exceptions"]
  },
  Tactical: {
    color: "bg-[#CAFA02]/20 border-[#CAFA02]",
    title: "Tactical Dashboard",
    blurb: "Steers initiatives/campaigns over weeks–months; owners, milestones, target progress.",
    chips: ["Programs", "Weekly", "Milestones"]
  },
  Analytical: {
    color: "bg-[#3C1765]/10 border-[#3C1765]",
    title: "Analytical Dashboard",
    blurb: "Supports diagnosis and discovery; drill‑downs, segmentation, comparisons.",
    chips: ["Exploration", "Drill‑downs", "Cohorts"]
  }
};

// Core Decision Inputs (multi‑select)
const INTENT_OPTIONS = [
  { id: "operational", label: "Monitor live process health and act quickly", votes: { Operational: 3 } },
  { id: "strategic", label: "Track strategy and outcomes versus targets", votes: { Strategic: 3 } },
  { id: "tactical", label: "Manage near‑term initiatives within a function", votes: { Tactical: 3 } },
  { id: "analytical", label: "Diagnose causes, explore patterns and cohorts", votes: { Analytical: 3 } }
];

const AUDIENCE_OPTIONS = [
  { id: "execs", label: "Executives and VPs", votes: { Strategic: 2 } },
  { id: "managers", label: "Middle managers / program owners", votes: { Tactical: 2 } },
  { id: "frontline", label: "Front‑line operators / duty managers", votes: { Operational: 2 } },
  { id: "analysts", label: "Analysts / decision support", votes: { Analytical: 2 } }
];

const LATENCY_OPTIONS = [
  { id: "rt", label: "Real‑time or hourly (alerts)", votes: { Operational: 2 } },
  { id: "daily", label: "Daily to weekly", votes: { Tactical: 1, Operational: 1 } },
  { id: "weekly", label: "Weekly to monthly", votes: { Tactical: 1, Strategic: 1 } },
  { id: "monthly", label: "Monthly or quarterly", votes: { Strategic: 2 } }
];

// Preflight / Modifiers
const DATA_MATURITY = [
  { id: "streaming", label: "Streaming/near‑real‑time" },
  { id: "daily", label: "Daily batch" },
  { id: "manual", label: "Manual / ad‑hoc" }
];

const SCOPE_OPTIONS = [
  { id: "process", label: "Single process (SLAs)" },
  { id: "function", label: "Single function / program" },
  { id: "enterprise", label: "Cross‑functional / enterprise" }
];

const INTERACTION_OPTIONS = [
  { id: "minimal", label: "Minimal first view (summary tiles)" },
  { id: "rich", label: "Rich drill‑downs in first view" }
];

const INDICATOR_MIX = [
  { id: "leading", label: "Mostly leading" },
  { id: "balanced", label: "Balanced leading/lagging" },
  { id: "lagging", label: "Mostly lagging" }
];

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#3C1765]/30 bg-white px-2 py-0.5 text-xs font-medium text-[#3C1765]">{children}</span>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-[#3C1765]/20 bg-white shadow-sm">
      <div className="border-b border-[#3C1765]/20 px-4 py-2 print:px-2 print:py-1 text-sm font-semibold text-[#150623]">{title}</div>
      <div className="p-4 print:p-2">{children}</div>
    </div>
  );
}

function Button({ onClick, children, variant = "default" }) {
  const base = "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium border transition-colors";
  const styles =
    variant === "secondary"
      ? "border-[#3C1765] bg-white text-[#3C1765] hover:bg-[#3C1765]/10"
      : "border-[#150623] bg-[#150623] text-white hover:bg-[#3C1765]";
  return (
    <button onClick={onClick} className={`${base} ${styles}`}>{children}</button>
  );
}

function ChoiceGroup({ values, onChange, options, name }) {
  const toggle = (id) => (values.includes(id) ? onChange(values.filter((v) => v !== id)) : onChange([...values, id]));
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-[#41196C]/5 ${values.includes(opt.id) ? "border-[#CAFA02] bg-[#CAFA02]/20" : "border-[#3C1765]/30"}`}>
          <input type="checkbox" name={`${name}-${opt.id}`} className="mt-1 accent-[#150623]" checked={values.includes(opt.id)} onChange={() => toggle(opt.id)} />
          <span className="text-sm text-[#150623]">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function SingleChoice({ value, onChange, options, name }) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-[#41196C]/5 ${value === opt.id ? "border-[#CAFA02] bg-[#CAFA02]/20" : "border-[#3C1765]/30"}`}>
          <input type="radio" name={name} className="mt-1 accent-[#150623]" checked={value === opt.id} onChange={() => onChange(opt.id)} />
          <span className="text-sm text-[#150623]">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function computeRecommendation({ intents, audiences, latencies, maturity, scope, interaction, indicators }) {
  const score = { Strategic: 0, Operational: 0, Tactical: 0, Analytical: 0 };
  const notes = [];
  const addVotes = (votes, w = 1) => votes && Object.entries(votes).forEach(([k, v]) => (score[k] += v * w));
  const pickVotes = (arr, dict) => arr.map((id) => dict.find((o) => o.id === id)?.votes).filter(Boolean);

  // Base scoring
  pickVotes(intents, INTENT_OPTIONS).forEach((v) => addVotes(v, 2));
  pickVotes(audiences, AUDIENCE_OPTIONS).forEach((v) => addVotes(v, 1));
  pickVotes(latencies, LATENCY_OPTIONS).forEach((v) => addVotes(v, 1));

  // Gates & nudges
  const wantsRT = latencies.includes("rt");
  if (wantsRT && maturity !== "streaming") {
    score.Operational -= 3; score.Tactical -= 1;
    notes.push("Data maturity cannot meet real‑time: −3 Operational, −1 Tactical. Consider phased approach.");
  }
  if (maturity === "manual") {
    score.Operational -= 4; score.Tactical -= 2;
    notes.push("Manual data: penalized Operational/Tactical.");
  }
  if (scope === "enterprise") { score.Strategic += 2; notes.push("Enterprise scope → +2 Strategic."); }
  else if (scope === "process") { score.Operational += 2; notes.push("Single process (SLAs) → +2 Operational."); }
  if (interaction === "rich") { score.Analytical += 2; notes.push("Rich first view → +2 Analytical."); }
  if (intents.includes("operational") && indicators === "lagging") { notes.push("Operational with lagging indicators → add leading signals."); }

  const ordered = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [p1, p2] = ordered; const primary = p1 ? { type: p1[0], score: p1[1] } : null; const secondary = p2 ? { type: p2[0], score: p2[1] } : null;
  const margin = primary && secondary ? primary.score - secondary.score : 99; const confidence = margin >= 3 ? "High" : margin === 2 ? "Medium" : "Low";

  let hybrid = null;
  if (margin <= 1 && primary && secondary) {
    const a = primary.type, b = secondary.type; const pair = [a, b].sort().join("+");
    const suggestions = {
      "Analytical+Tactical": "Analytical for diagnosis + Tactical for delivery.",
      "Operational+Tactical": "Operational wallboard + Tactical weekly steering.",
      "Strategic+Analytical": "Strategic overview + Analytical deep dives.",
      "Strategic+Tactical": "Strategic overview + Tactical initiatives (default hybrid)."
    };
    hybrid = { pair: `${a} + ${b}`, note: suggestions[pair] || "Combine strengths of top two." };
  }

  return { score, notes, primary, secondary, margin, confidence, hybrid };
}

function Arrow({ className = "" }) {
  return (
    <svg className={`h-6 w-6 text-[#3C1765]/70 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
    </svg>
  );
}

function PrintableOnePager({ state, rec }) {
  const intents = state.intents.map((id) => INTENT_OPTIONS.find((o) => o.id === id)?.label).filter(Boolean);
  const audiences = state.audiences.map((id) => AUDIENCE_OPTIONS.find((o) => o.id === id)?.label).filter(Boolean);
  const latencies = state.latencies.map((id) => LATENCY_OPTIONS.find((o) => o.id === id)?.label).filter(Boolean);

  return (
    <div className="print-surface bg-white text-[#150623]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">KPI Decision Map — One‑Pager</h1>
          <p className="text-xs text-[#3C1765]">Inputs → Preflight → Recommendation (with confidence & hybrid fallback)</p>
        </div>
        <div className="text-xs text-[#3C1765]/80">Generated: {new Date().toLocaleDateString()}</div>
      </div>

      <div className="mt-3 grid grid-cols-12 gap-3">
        <div className="col-span-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#3C1765]">Inputs</div>
          <ul className="mt-1 text-sm leading-snug">
            <li><span className="font-medium">Core Questions:</span> {intents.join(", ") || "—"}</li>
            <li><span className="font-medium">Audience:</span> {audiences.join(", ") || "—"}</li>
            <li><span className="font-medium">Latency:</span> {latencies.join(", ") || "—"}</li>
          </ul>
        </div>
        <div className="col-span-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#3C1765]">Preflight snapshot</div>
          <ul className="mt-1 text-sm leading-snug">
            <li><span className="font-medium">Data maturity:</span> {DATA_MATURITY.find((o) => o.id === state.maturity)?.label || "Not selected"}</li>
            <li><span className="font-medium">Scope:</span> {SCOPE_OPTIONS.find((o) => o.id === state.scope)?.label || "Not selected"}</li>
            <li><span className="font-medium">Interaction:</span> {INTERACTION_OPTIONS.find((o) => o.id === state.interaction)?.label || "Not selected"}</li>
            <li><span className="font-medium">Indicator mix:</span> {INDICATOR_MIX.find((o) => o.id === state.indicators)?.label || "Not selected"}</li>
          </ul>
        </div>

        <div className="col-span-12 rounded-xl border border-[#3C1765]/30 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#3C1765]">Recommendation</div>
          <div className="mt-1 text-lg font-semibold">{TYPE_META[rec.primary?.type || "Strategic"].title}</div>
          <div className="text-sm text-[#3C1765]">{TYPE_META[rec.primary?.type || "Strategic"].blurb}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPE_META[rec.primary?.type || "Strategic"].chips.map((c) => (
              <span key={c} className="rounded border border-[#3C1765]/30 px-2 py-0.5 text-xs">{c}</span>
            ))}
          </div>
          <div className="mt-2 text-xs text-[#3C1765]">Confidence: <span className="font-medium">{rec.confidence}</span> (margin {rec.margin})</div>
          {rec.hybrid && (
            <div className="mt-1 text-xs text-[#3C1765]"><span className="font-medium">Hybrid:</span> {rec.hybrid.pair} — {rec.hybrid.note}</div>
          )}
        </div>

        {rec.notes.length > 0 && (
          <div className="col-span-12">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#3C1765]">Notes & cautions</div>
            <ul className="mt-1 list-disc pl-5 text-sm leading-snug">
              {rec.notes.slice(0, 4).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const defaultInputs = {
  intents: ["strategic"],
  audiences: ["execs"],
  latencies: ["monthly"],
  maturity: "daily",
  scope: "function",
  interaction: "minimal",
  indicators: "balanced",
};

const clearedInputs = {
  intents: [],
  audiences: [],
  latencies: [],
  maturity: null,
  scope: null,
  interaction: null,
  indicators: null,
};


export default function KPIDecisionMap() {
  // Inputs
  const [intents, setIntents] = useState(defaultInputs.intents);
  const [audiences, setAudiences] = useState(defaultInputs.audiences);
  const [latencies, setLatencies] = useState(defaultInputs.latencies);
  // Preflight
  const [maturity, setMaturity] = useState(defaultInputs.maturity);
  const [scope, setScope] = useState(defaultInputs.scope);
  const [interaction, setInteraction] = useState(defaultInputs.interaction);
  const [indicators, setIndicators] = useState(defaultInputs.indicators);
  const [showOnePager, setShowOnePager] = useState(false);

  const handleClearAll = () => {
    setIntents(clearedInputs.intents);
    setAudiences(clearedInputs.audiences);
    setLatencies(clearedInputs.latencies);
    setMaturity(clearedInputs.maturity);
    setScope(clearedInputs.scope);
    setInteraction(clearedInputs.interaction);
    setIndicators(clearedInputs.indicators);
  };

  const rec = useMemo(() => computeRecommendation({ intents, audiences, latencies, maturity, scope, interaction, indicators }), [intents, audiences, latencies, maturity, scope, interaction, indicators]);
  const primaryMeta = TYPE_META[rec.primary?.type || "Strategic"];

  // State bag to pass to one‑pager
  const state = { intents, audiences, latencies, maturity, scope, interaction, indicators };

  return (
    <div className="mx-auto max-w-6xl space-y-6 bg-[#F7F7F8] p-4 font-sans">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#150623]">KPI Decision Map</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#3C1765]">Answer three inputs → run preflight → get the recommended dashboard type with confidence, hybrid suggestion, and notes.</p>
        </div>
        <div className="print-hide flex flex-shrink-0 items-center gap-2">
          <Button variant="secondary" onClick={handleClearAll}>Clear All</Button>
          <Button variant="secondary" onClick={() => setShowOnePager((v) => !v)}>{showOnePager ? "Hide one‑pager" : "One‑pager preview"}</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </header>

      {/* Flow: Inputs → Preflight → Recommendation */}
      <section className="rounded-2xl border border-[#3C1765]/20 bg-white p-4 print:text-[11px]">
        <h2 className="mb-3 text-sm font-semibold text-[#150623]">Decision Flow</h2>
        <div className="grid grid-cols-1 gap-4 print:gap-2 md:grid-cols-12">
          {/* Inputs */}
          <div className="md:col-span-3 print-avoid-break">
            <Card title="1. Core Questions (multi)">
              <ChoiceGroup name="intent" values={intents} onChange={setIntents} options={INTENT_OPTIONS} />
            </Card>
          </div>
          <div className="hidden items-center justify-center md:col-span-1 md:flex print-hide"><Arrow /></div>
          <div className="md:col-span-3 print-avoid-break">
            <Card title="2. Audience (multi)">
              <ChoiceGroup name="audience" values={audiences} onChange={setAudiences} options={AUDIENCE_OPTIONS} />
            </Card>
          </div>
          <div className="hidden items-center justify-center md:col-span-1 md:flex print-hide"><Arrow /></div>
          <div className="md:col-span-3 print-avoid-break">
            <Card title="3. Latency (multi)">
              <ChoiceGroup name="latency" values={latencies} onChange={setLatencies} options={LATENCY_OPTIONS} />
            </Card>
          </div>

          {/* Preflight – condensed */}
          <div className="md:col-span-12 print-avoid-break">
            <Card title="4. Preflight & Guardrails">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <div className="mb-1 text-xs font-medium text-[#3C1765]">Data maturity</div>
                  <SingleChoice name="maturity" value={maturity} onChange={setMaturity} options={DATA_MATURITY} />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-[#3C1765]">Scope</div>
                  <SingleChoice name="scope" value={scope} onChange={setScope} options={SCOPE_OPTIONS} />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-[#3C1765]">Interaction</div>
                  <SingleChoice name="interaction" value={interaction} onChange={setInteraction} options={INTERACTION_OPTIONS} />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-[#3C1765]">Indicator mix</div>
                  <SingleChoice name="indicators" value={indicators} onChange={setIndicators} options={INDICATOR_MIX} />
                </div>
              </div>
              <p className="mt-2 text-xs text-[#3C1765]">Checks feasibility, scope fit, and discovery needs. Warns on lagging‑only Ops.</p>
            </Card>
          </div>

          {/* Output */}
          <div className="md:col-span-12 print-avoid-break">
            <div className={`mt-2 rounded-2xl border ${primaryMeta.color} p-4`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm uppercase tracking-wide text-[#3C1765]">Recommendation</div>
                  <div className="text-xl font-semibold text-[#150623]">{primaryMeta.title}</div>
                  <p className="mt-1 max-w-3xl text-sm text-[#3C1765]">{primaryMeta.blurb}</p>
                  <div className="mt-2 flex flex-wrap gap-2">{primaryMeta.chips.map((c) => <Chip key={c}>{c}</Chip>)}</div>
                </div>
                <div className="mt-3 text-sm md:mt-0">
                  <div className="text-xs font-medium text-[#3C1765]">Confidence</div>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-lg border border-[#3C1765]/20 bg-white px-2 py-1">
                    <span className="font-semibold">{rec.confidence}</span>
                    <span className="text-[#3C1765]/80">(margin {rec.margin})</span>
                  </div>
                  <div className="mt-3 text-xs font-medium text-[#3C1765]">Score by type</div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-[#3C1765] sm:grid-cols-4">
                    {Object.entries(rec.score).map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-[#3C1765]/20 bg-white px-2 py-1 text-center">
                        <div className="font-semibold text-[#150623]">{k}</div>
                        <div className="tabular-nums">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {rec.hybrid && (
                <div className="mt-4 rounded-xl border border-[#3C1765]/20 bg-white/70 p-3 backdrop-blur-sm">
                  <div className="text-sm font-semibold text-[#150623]">Hybrid: {rec.hybrid.pair}</div>
                  <p className="mt-1 text-sm text-[#3C1765]">{rec.hybrid.note}</p>
                </div>
              )}

              {rec.notes.length > 0 && (
                <div className="mt-4 border-t border-[#3C1765]/20 pt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#3C1765]">Preflight notes</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#3C1765]">
                    {rec.notes.map((n, i) => (<li key={i}>{n}</li>))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* One‑pager preview (conditionally hidden on screen, but always prints) */}
      <section className={`${showOnePager ? '' : 'hidden'} rounded-2xl border border-[#3C1765]/20 bg-white p-4`}>
        <div className="print-page-break"></div>
        <PrintableOnePager state={state} rec={rec} />
      </section>
      
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: Letter; margin: 0.5in; }
          .print-hide { display: none !important; }
          .print-page-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid; }
          .print-surface { page-break-inside: avoid; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}