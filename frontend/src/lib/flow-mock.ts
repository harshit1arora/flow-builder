import type { NodeKind, NodeStatus, FlowState, MockNode, MockEdge, MockGraph } from "./flow-schema";
export type { NodeKind, NodeStatus, FlowState, MockNode, MockEdge, MockGraph };

export const PRESET_BRIEFS = [
  "Product photo → 5-scene ad",
  "Blog post → carousel",
  "Logo → brand kit",
  "Sketch → product render",
];

/** Emergency fallback graph when backend is unreachable. Live planning is served via Groq compound-mini. */
export const MOCK_GRAPH: MockGraph = {
  nodes: [
    {
      id: "n1",
      kind: "input",
      title: "Input",
      summary: "1 image · product-shot.jpg",
      position: { x: 0, y: 120 },
      duration: 900,
    },
    {
      id: "n2",
      kind: "prompt",
      title: "Prompt generator",
      summary: "5 scene prompts, ad tone",
      position: { x: 260, y: 120 },
      duration: 1600,
    },
    {
      id: "n3",
      kind: "imagegen",
      title: "Image gen",
      summary: "Style: cinematic, 16:9",
      position: { x: 520, y: 20 },
      duration: 2400,
    },
    {
      id: "n4",
      kind: "style",
      title: "Style transfer",
      summary: "Match brand palette",
      position: { x: 520, y: 220 },
      duration: 1800,
    },
    {
      id: "n5",
      kind: "upscale",
      title: "Upscale",
      summary: "2048px, detail preserve",
      position: { x: 780, y: 120 },
      duration: 1500,
    },
    {
      id: "n6",
      kind: "output",
      title: "Output",
      summary: "5-scene ad sequence",
      position: { x: 1040, y: 120 },
      duration: 1000,
      result: {
        type: "text",
        value: "5 scenes · 2048×1152 · cinematic",
      },
    },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
    { id: "e3", source: "n2", target: "n4" },
    { id: "e4", source: "n3", target: "n5" },
    { id: "e5", source: "n4", target: "n5" },
    { id: "e6", source: "n5", target: "n6" },
  ],
};

/** Topological order for the mocked execution pass. */
export function topoOrder(graph: MockGraph): string[] {
  const indeg = new Map(graph.nodes.map((n) => [n.id, 0]));
  graph.edges.forEach((e) => indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1));
  const queue = graph.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const out: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    graph.edges
      .filter((e) => e.source === id)
      .forEach((e) => {
        const left = (indeg.get(e.target) ?? 0) - 1;
        indeg.set(e.target, left);
        if (left === 0) queue.push(e.target);
      });
  }
  return out;
}
