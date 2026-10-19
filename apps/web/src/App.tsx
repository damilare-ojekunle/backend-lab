import { useEffect, useState } from 'react';
import {
  listExperiments,
  runExperiment,
  type ConditionResult,
  type ExperimentInfo,
  type ExperimentResult,
} from './api';

function formatMs(ms: number): string {
  return `${ms < 1 ? ms.toFixed(3) : ms.toFixed(1)} ms`;
}

// Per-viewer convenience only: drafts survive a reload. Storage can be unavailable, so never rely on it.
function loadDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function saveDraft(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore: the page works without storage
  }
}

function Draft({ label, storageKey, rows }: { label: string; storageKey: string; rows: number }) {
  const [value, setValue] = useState(() => loadDraft(storageKey));
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          saveDraft(storageKey, e.target.value);
        }}
      />
    </label>
  );
}

function ResultsTable({ conditions }: { conditions: ConditionResult[] }) {
  const rows: [string, (c: ConditionResult) => string][] = [
    ['Plan type', (c) => c.summary.scanTypes.join(', ')],
    ['Median time', (c) => formatMs(c.summary.medianMs)],
    ['Fastest to slowest', (c) => `${formatMs(c.summary.minMs)} to ${formatMs(c.summary.maxMs)}`],
    ['Pages touched', (c) => c.summary.pagesTouched.map((n) => n.toLocaleString()).join(', ')],
  ];
  return (
    <table>
      <thead>
        <tr>
          <th />
          {conditions.map((c) => (
            <th key={c.id}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, read]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            {conditions.map((c) => (
              <td key={c.id}>{read(c)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function App() {
  const [experiments, setExperiments] = useState<ExperimentInfo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [trials, setTrials] = useState(20);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listExperiments()
      .then((list) => {
        setExperiments(list);
        setSelectedId(list[0]?.id ?? '');
      })
      .catch((e: Error) => setError(`Could not reach the lab API: ${e.message}`));
  }, []);

  const selected = experiments.find((e) => e.id === selectedId);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setResult(await runExperiment(selectedId, trials));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main>
      <h1>Index Lab</h1>
      <p className="lede">
        Every number below is measured on your local PostgreSQL with{' '}
        <code>EXPLAIN (ANALYZE, BUFFERS)</code>. Nothing is simulated.
      </p>

      <section>
        <label className="field">
          <span>Experiment</span>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setResult(null);
            }}
          >
            {experiments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </label>
        {selected && <p className="hint">{selected.description}</p>}

        <label className="field narrow">
          <span>Trials per condition</span>
          <input
            type="number"
            min={1}
            max={100}
            value={trials}
            onChange={(e) => setTrials(Number(e.target.value))}
          />
        </label>
      </section>

      {selected && (
        <section>
          <Draft
            key={`prediction-${selected.id}`}
            label="Your prediction (write it before you run)"
            storageKey={`prediction:${selected.id}`}
            rows={2}
          />
          <button onClick={run} disabled={running || !selected}>
            {running ? 'Running…' : 'Run experiment'}
          </button>
        </section>
      )}

      {error && <p role="alert" className="error">{error}</p>}

      {result && (
        <section>
          <h2>Results</h2>
          <ResultsTable conditions={result.conditions} />
          <p className="hint">
            {result.trials} trials per condition after {result.warmupDiscarded} discarded warm-up
            runs, alternating between conditions. Warm cache, one machine: compare page counts
            first, because milliseconds vary between runs.
          </p>
          {result.conditions.map((c) => (
            <details key={c.id}>
              <summary>Raw plan: {c.label}</summary>
              <p className="hint">
                <code>{c.sql}</code>
              </p>
              <pre>{JSON.stringify(c.samplePlan, null, 2)}</pre>
            </details>
          ))}
        </section>
      )}

      {result && selected && (
        <section>
          <h2>Reflect</h2>
          <Draft
            key={`notes-${selected.id}`}
            label="What did you expect? What happened? Why? What evidence supports it?"
            storageKey={`notes:${selected.id}`}
            rows={6}
          />
        </section>
      )}
    </main>
  );
}
