type PlanNode = {
  'Node Type': string;
  'Shared Hit Blocks': number;
  'Shared Read Blocks': number;
  Plans?: PlanNode[];
};

type PlanJson = {
  Plan: PlanNode;
  'Execution Time': number;
};

export type ParsedPlan = {
  scanType: string;
  executionMs: number;
  pagesTouched: number;
};

export function parsePlan(raw: unknown): ParsedPlan {
  const root = (raw as PlanJson[])[0]!;

  // A parallel plan has Gather (or Gather Merge) on top; the scan that actually reads the
  // table is its child. Only step through Gather nodes, so a Bitmap Heap Scan is not
  // reported as its Bitmap Index Scan child.
  let node = root.Plan;
  while (node['Node Type'].startsWith('Gather') && node.Plans?.[0]) {
    node = node.Plans[0];
  }

  return {
    scanType: node['Node Type'],
    executionMs: root['Execution Time'],
    // Buffer counts on the top node already include its children.
    pagesTouched: root.Plan['Shared Hit Blocks'] + root.Plan['Shared Read Blocks'],
  };
}
