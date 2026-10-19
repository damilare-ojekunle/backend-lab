// Shapes returned by the lab API (apps/api). The UI never sends SQL, only an id and a trial count.

export type ExperimentInfo = {
  id: string;
  title: string;
  description: string;
  conditions: { id: string; label: string }[];
};

export type Summary = {
  trials: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  pagesTouched: number[];
  scanTypes: string[];
};

export type ConditionResult = {
  id: string;
  label: string;
  sql: string;
  summary: Summary;
  samplePlan: unknown;
};

export type ExperimentResult = {
  experimentId: string;
  trials: number;
  warmupDiscarded: number;
  conditions: ConditionResult[];
};

async function readJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `request failed (${res.status})`);
  }
  return body as T;
}

export async function listExperiments(): Promise<ExperimentInfo[]> {
  return readJson(await fetch('/api/experiments'));
}

export async function runExperiment(id: string, trials: number): Promise<ExperimentResult> {
  return readJson(
    await fetch(`/api/experiments/${encodeURIComponent(id)}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trials }),
    }),
  );
}
