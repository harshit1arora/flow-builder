import { MOCK_GRAPH } from "./flow-mock";
import type { MockGraph, MockNode, MockEdge } from "./flow-schema";

const envBaseUrl = (import.meta.env as Record<string, string | undefined>)["VITE_API_BASE_URL"];
export const API_BASE_URL = envBaseUrl || "http://localhost:8000";

export interface PlanApiResponse {
  brief: string;
  nodes: Array<{
    id: string;
    kind: string;
    title: string;
    summary: string;
    reason?: string;
    estimated_cost?: string;
    latency_ms?: number;
    position: { x: number; y: number };
    duration: number;
    result?: { type: "image" | "text"; value: string };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
  total_cost?: string;
  total_latency_ms?: number;
  fallback?: boolean;
  fallback_reason?: string;
  model?: string;
}

export interface FetchPlanResult {
  graph: MockGraph;
  isLive: boolean;
  isFallback?: boolean;
  model?: string;
  error?: string;
}

/**
 * Calls the FastAPI backend /plan endpoint.
 * Transparently signals whether the graph was generated live by Groq or by the fallback boundary.
 */
export async function fetchPlan(
  brief: string,
  mode: "fidelity" | "speed" = "fidelity",
): Promise<FetchPlanResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(`${API_BASE_URL}/plan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ brief, mode }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Backend returned HTTP ${response.status}: ${errText || response.statusText}`);
    }

    const data: PlanApiResponse = await response.json();

    const nodes: MockNode[] = data.nodes.map((n) => ({
      id: n.id,
      kind: n.kind as MockNode["kind"],
      title: n.title,
      summary: n.summary,
      reason: n.reason,
      estimatedCost: n.estimated_cost || "$0.001",
      latencyMs: n.latency_ms || n.duration || 1500,
      position: n.position,
      duration: n.duration || 1500,
      result: n.result,
    }));

    const edges: MockEdge[] = data.edges.map((e, idx) => ({
      id: e.id || `e${idx + 1}`,
      source: e.source,
      target: e.target,
    }));

    const graph: MockGraph = {
      nodes,
      edges,
      totalCost: data.total_cost || "$0.007",
      totalLatencyMs: data.total_latency_ms || 7200,
    };

    if (data.fallback) {
      console.warn("[Flow API] Backend used emergency fallback boundary:", data.fallback_reason);
      return {
        graph,
        isLive: false,
        isFallback: true,
        model: data.model || "fallback-engine",
        error: data.fallback_reason || "Backend used fallback error boundary (check GROQ_API_KEY)",
      };
    }

    return {
      graph,
      isLive: true,
      isFallback: false,
      model: data.model || "groq/compound-mini",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Flow API] Backend request failed (${message}). Falling back to sample graph.`);
    return {
      graph: {
        ...MOCK_GRAPH,
        totalCost: "$0.007",
        totalLatencyMs: 7200,
      },
      isLive: false,
      isFallback: false,
      error: `Could not reach planner backend (${message})`,
    };
  }
}

/**
 * Generates a real image generation URL via Pollinations.ai for `image_gen`.
 */
export function getRealImageUrl(brief: string, summary?: string): string {
  const cleanPrompt = [brief, summary, "commercial advertising render", "clean studio lighting", "octane render"]
    .filter(Boolean)
    .join(", ");
  const encoded = encodeURIComponent(cleanPrompt);
  let hash = 0;
  for (let i = 0; i < cleanPrompt.length; i++) {
    hash = (hash << 5) - hash + cleanPrompt.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash) % 100000;
  return `https://image.pollinations.ai/prompt/${encoded}?width=960&height=640&nologo=true&seed=${seed}`;
}

/**
 * Generates a real stylized asset URL for `style_transfer` (second real generation node!).
 */
export function getRealStyleUrl(brief: string, summary?: string): string {
  const cleanPrompt = [
    brief,
    summary,
    "brand palette color grading",
    "emerald green aesthetic reflections",
    "duo-tone lighting",
    "high fashion editorial style",
  ]
    .filter(Boolean)
    .join(", ");
  const encoded = encodeURIComponent(cleanPrompt);
  let hash = 777;
  for (let i = 0; i < cleanPrompt.length; i++) {
    hash = (hash << 5) - hash + cleanPrompt.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash) % 100000;
  return `https://image.pollinations.ai/prompt/${encoded}?width=960&height=640&nologo=true&seed=${seed}`;
}

/**
 * Preloads real image in background with retry resilience.
 */
export function preloadImage(url: string, retries = 2): Promise<void> {
  return new Promise((resolve) => {
    const attempt = (remaining: number) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => {
        if (remaining > 0) {
          // Retry with slight delay and refreshed cachebuster
          setTimeout(() => {
            const separator = url.includes("?") ? "&" : "?";
            attempt(remaining - 1);
            img.src = `${url}${separator}retry=${remaining}`;
          }, 800);
        } else {
          // Soft-resolve so execution flow is never blocked
          resolve();
        }
      };
      img.src = url;
    };
    attempt(retries);
  });
}
