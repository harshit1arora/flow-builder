import { z } from "zod";

export const NodeKindSchema = z.enum([
  "input",
  "prompt",
  "prompt_generator",
  "imagegen",
  "image_gen",
  "upscale",
  "style",
  "style_transfer",
  "output",
]);

export function normalizeNodeKind(
  kind: string,
): "input" | "prompt" | "imagegen" | "upscale" | "style" | "output" {
  switch (kind) {
    case "prompt_generator":
    case "prompt":
      return "prompt";
    case "image_gen":
    case "imagegen":
      return "imagegen";
    case "style_transfer":
    case "style":
      return "style";
    case "upscale":
      return "upscale";
    case "output":
      return "output";
    case "input":
    default:
      return "input";
  }
}

export const NodeStatusSchema = z.enum(["idle", "running", "done", "error"]);
export const FlowStateSchema = z.enum(["idle", "planning", "built", "running", "done", "error"]);

export const MockNodeSchema = z.object({
  id: z.string(),
  kind: NodeKindSchema,
  title: z.string(),
  summary: z.string(),
  reason: z.string().optional(),
  estimatedCost: z.string().optional(),
  latencyMs: z.number().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  duration: z.number().default(1500),
  result: z
    .object({
      type: z.enum(["image", "text"]),
      value: z.string(),
    })
    .optional(),
});

export const MockEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const MockGraphSchema = z.object({
  nodes: z.array(MockNodeSchema),
  edges: z.array(MockEdgeSchema),
  totalCost: z.string().optional(),
  totalLatencyMs: z.number().optional(),
});

export type NodeKind = z.infer<typeof NodeKindSchema>;
export type NodeStatus = z.infer<typeof NodeStatusSchema>;
export type FlowState = z.infer<typeof FlowStateSchema>;
export type MockNode = z.infer<typeof MockNodeSchema>;
export type MockEdge = z.infer<typeof MockEdgeSchema>;
export type MockGraph = z.infer<typeof MockGraphSchema>;
