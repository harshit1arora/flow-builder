import React, { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import {
  Play,
  PanelLeftClose,
  PanelLeftOpen,
  Bookmark,
  GitCompare,
  Download,
  Copy,
  DollarSign,
  Clock,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { BriefPanel, type ChatMessage } from "./BriefPanel";
import { FlowCanvas } from "./FlowCanvas";
import { NodeInspector } from "./NodeInspector";
import { TemplateDialog, type SavedTemplate } from "./TemplateDialog";
import { ComparePlansModal } from "./ComparePlansModal";
import { FlowLogo } from "./FlowLogo";

import { MOCK_GRAPH, topoOrder } from "@/lib/flow-mock";
import type { FlowState, NodeStatus, MockGraph, MockNode, MockEdge } from "@/lib/flow-schema";
import { fetchPlan, getRealImageUrl, getRealStyleUrl, preloadImage } from "@/lib/flow-api";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const edgeBase = {
  type: "default" as const,
  style: { stroke: "var(--brand-green-pale)", strokeWidth: 2 },
};

export function Workspace() {
  const reduced = useReducedMotion();
  const [state, setState] = useState<FlowState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  // Inspector & Modal states
  const [selectedNode, setSelectedNode] = useState<MockNode | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState<boolean>(false);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeGraphRef = useRef<MockGraph>(MOCK_GRAPH);
  const currentBriefRef = useRef<string>("");
  const generatedImageUrlRef = useRef<string | null>(null);
  const generatedStyleUrlRef = useRef<string | null>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const setStatus = useCallback((id: string, status: NodeStatus, extraData?: Record<string, unknown>) => {
    setNodes((ns: Node[]) =>
      ns.map((n: Node) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                status,
                animate: false,
                ...(extraData || {}),
              },
            }
          : n,
      ),
    );
  }, []);

  // Node editing handlers
  const handleEditNode = useCallback((id: string) => {
    const mn = activeGraphRef.current.nodes.find((n) => n.id === id);
    if (mn) {
      setSelectedNode(mn);
      setInspectorOpen(true);
    }
  }, []);

  const handleSaveNode = useCallback((nodeId: string, newSummary: string) => {
    // Update ref
    activeGraphRef.current.nodes = activeGraphRef.current.nodes.map((n) =>
      n.id === nodeId ? { ...n, summary: newSummary } : n,
    );
    // Update live canvas nodes
    setNodes((ns: Node[]) =>
      ns.map((n: Node) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                summary: newSummary,
              },
            }
          : n,
      ),
    );
    toast.success("Node parameters updated");
  }, []);

  // Simulate failure for in-graph resilience demo
  const handleSimulateError = useCallback(
    (nodeId: string) => {
      setStatus(nodeId, "error");
      setMessages((m: ChatMessage[]) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `⚠️ Node '${nodeId}' failed execution. Click 'Retry' on the node to recover.`,
        },
      ]);
      toast.error(`Simulated failure on node ${nodeId}`);
    },
    [setStatus],
  );

  // Single-node retry handler
  const handleRetryNode = useCallback(
    (nodeId: string) => {
      setStatus(nodeId, "running");
      later(() => {
        const mn = activeGraphRef.current.nodes.find((n) => n.id === nodeId);
        let extraData: Record<string, unknown> | undefined;
        if (mn && (mn.kind === "image_gen" || mn.kind === "imagegen")) {
          extraData = {
            result: {
              type: "image" as const,
              value: generatedImageUrlRef.current || getRealImageUrl(currentBriefRef.current),
            },
          };
        } else if (mn && (mn.kind === "style_transfer" || mn.kind === "style")) {
          extraData = {
            result: {
              type: "image" as const,
              value: generatedStyleUrlRef.current || getRealStyleUrl(currentBriefRef.current),
            },
          };
        }
        setStatus(nodeId, "done", extraData);
        toast.success(`Node ${nodeId} recovered successfully`);
      }, 1200);
    },
    [setStatus],
  );

  // Re-run downstream subgraph forward
  const handleRerunFromNode = useCallback(
    (startNodeId: string) => {
      // Find all reachable downstream nodes via BFS
      const downstream = new Set<string>();
      const q = [startNodeId];
      while (q.length) {
        const curr = q.shift()!;
        downstream.add(curr);
        activeGraphRef.current.edges
          .filter((e) => e.source === curr)
          .forEach((e) => {
            if (!downstream.has(e.target)) q.push(e.target);
          });
      }

      setMessages((m: ChatMessage[]) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `Re-executing pipeline forward from node '${startNodeId}' (${downstream.size} steps)...`,
        },
      ]);

      // Reset downstream nodes
      setNodes((ns: Node[]) =>
        ns.map((n: Node) =>
          downstream.has(n.id)
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: "idle" as NodeStatus,
                },
              }
            : n,
        ),
      );

      // Execute downstream slice in topological order
      const fullOrder = topoOrder(activeGraphRef.current);
      const executionSlice = fullOrder.filter((id) => downstream.has(id));

      let t = 200;
      executionSlice.forEach((id: string, i: number) => {
        const mn = activeGraphRef.current.nodes.find((n) => n.id === id);
        if (!mn) return;

        later(() => {
          setStatus(id, "running");
          setEdges((es: Edge[]) =>
            es.map((e: Edge) =>
              e.source === id
                ? {
                    ...e,
                    className: "flow-edge-active",
                    style: { stroke: "var(--brand-green)", strokeWidth: 2 },
                  }
                : e,
            ),
          );
        }, t);

        t += mn.duration;

        later(() => {
          let extraData: Record<string, unknown> | undefined;
          if (mn.kind === "image_gen" || mn.kind === "imagegen") {
            const freshUrl = getRealImageUrl(currentBriefRef.current, mn.summary);
            generatedImageUrlRef.current = freshUrl;
            extraData = { result: { type: "image" as const, value: freshUrl } };
          } else if (mn.kind === "style_transfer" || mn.kind === "style") {
            const freshStyleUrl = getRealStyleUrl(currentBriefRef.current, mn.summary);
            generatedStyleUrlRef.current = freshStyleUrl;
            extraData = { result: { type: "image" as const, value: freshStyleUrl } };
          } else if (mn.kind === "output") {
            extraData = {
              result: {
                type: "image" as const,
                value: generatedImageUrlRef.current || getRealImageUrl(currentBriefRef.current),
              },
            };
          }

          setStatus(id, "done", extraData);
          setEdges((es: Edge[]) =>
            es.map((e: Edge) =>
              e.source === id
                ? {
                    ...e,
                    className: "",
                    style: { stroke: "var(--brand-green)", strokeWidth: 2 },
                  }
                : e,
            ),
          );

          if (i === executionSlice.length - 1) {
            setMessages((m: ChatMessage[]) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                text: "Partial re-run completed. Updated outputs are rendered on canvas.",
              },
            ]);
          }
        }, t);
      });
    },
    [setStatus],
  );

  const assembleGraphOnCanvas = useCallback(
    (graph: MockGraph, announcement?: string) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setNodes([]);
      setEdges([]);
      setState("planning");
      activeGraphRef.current = graph;

      if (announcement) {
        setMessages((m: ChatMessage[]) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: announcement,
          },
        ]);
      }

      const step = reduced ? 0 : 280;
      graph.nodes.forEach((mn: MockNode, i: number) => {
        later(() => {
          setNodes((ns: Node[]) => [
            ...ns,
            {
              id: mn.id,
              type: "workflow",
              position: mn.position,
              data: {
                id: mn.id,
                kind: mn.kind,
                title: mn.title,
                summary: mn.summary,
                reason: mn.reason,
                estimatedCost: mn.estimatedCost,
                latencyMs: mn.latencyMs,
                status: "idle" as NodeStatus,
                result: mn.result,
                animate: !reduced,
                onEdit: handleEditNode,
                onRetry: handleRetryNode,
              },
            },
          ]);
          setEdges((es: Edge[]) => [
            ...es,
            ...graph.edges
              .filter((e: MockEdge) => e.target === mn.id)
              .map((e: MockEdge) => ({ id: e.id, source: e.source, target: e.target, ...edgeBase })),
          ]);
          if (i === graph.nodes.length - 1) {
            setState("built");
            setMessages((m: ChatMessage[]) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                text: "Graph is ready. Hit Run to execute the pipeline with live dual image generation.",
              },
            ]);
          }
        }, (i + 1) * step);
      });
    },
    [reduced, handleEditNode, handleRetryNode],
  );

  const buildGraph = useCallback(
    async (brief: string) => {
      currentBriefRef.current = brief;
      setMessages((m: ChatMessage[]) => [...m, { id: crypto.randomUUID(), role: "user", text: brief }]);

      // Call backend /plan
      const result = await fetchPlan(brief);
      const { graph, isLive, error } = result;

      // Preload dual real generation outputs
      const imageNode = graph.nodes.find(
        (n: MockNode) => n.kind === "image_gen" || n.kind === "imagegen",
      );
      const styleNode = graph.nodes.find(
        (n: MockNode) => n.kind === "style_transfer" || n.kind === "style",
      );

      const realImageUrl = getRealImageUrl(brief, imageNode?.summary);
      const realStyleUrl = getRealStyleUrl(brief, styleNode?.summary);
      generatedImageUrlRef.current = realImageUrl;
      generatedStyleUrlRef.current = realStyleUrl;

      preloadImage(realImageUrl);
      preloadImage(realStyleUrl);

      let messageText: string;
      if (isLive) {
        const rawModel = result.model || "groq/compound-mini";
        const modelLabel = rawModel.includes("/") ? rawModel.split("/")[1] : rawModel;
        messageText = `✨ Planned a ${graph.nodes.length}-step pipeline via ${modelLabel} (${graph.totalCost || "$0.0075"}). Assembling it on the canvas now.`;
      } else if (result.isFallback) {
        messageText = `⚡ Pipeline planned & auto-arranged via backend orchestrator (${error || "Demo mode"}). Assembling on canvas now.`;
      } else {
        messageText = `⚠️ Planner backend unreachable (${error || "offline"}). Showing sample graph so you can still preview the canvas.`;
      }

      assembleGraphOnCanvas(graph, messageText);
    },
    [assembleGraphOnCanvas],
  );

  const run = useCallback(() => {
    if (state !== "built" && state !== "done") return;
    setState("running");
    setNodes((ns: Node[]) =>
      ns.map((n: Node) => ({ ...n, data: { ...n.data, status: "idle" as NodeStatus, animate: false } })),
    );
    setEdges((es: Edge[]) => es.map((e: Edge) => ({ ...e, className: "", ...edgeBase })));

    const graph = activeGraphRef.current;
    const order = topoOrder(graph);
    let t = 300;

    const realImageUrl =
      generatedImageUrlRef.current || getRealImageUrl(currentBriefRef.current);
    const realStyleUrl =
      generatedStyleUrlRef.current || getRealStyleUrl(currentBriefRef.current);

    order.forEach((id: string, i: number) => {
      const mn = graph.nodes.find((n: MockNode) => n.id === id);
      if (!mn) return;

      later(() => {
        setStatus(id, "running");
        setEdges((es: Edge[]) =>
          es.map((e: Edge) =>
            e.source === id
              ? {
                  ...e,
                  className: "flow-edge-active",
                  style: { stroke: "var(--brand-green)", strokeWidth: 2 },
                }
              : e,
          ),
        );
      }, t);

      t += mn.duration;

      later(() => {
        // Real dual generation output mapping
        let extraData: Record<string, unknown> | undefined;
        if (mn.kind === "image_gen" || mn.kind === "imagegen") {
          extraData = { result: { type: "image" as const, value: realImageUrl } };
        } else if (mn.kind === "style_transfer" || mn.kind === "style") {
          extraData = { result: { type: "image" as const, value: realStyleUrl } };
        } else if (mn.kind === "output") {
          extraData = { result: { type: "image" as const, value: realImageUrl } };
        }

        setStatus(id, "done", extraData);
        setEdges((es: Edge[]) =>
          es.map((e: Edge) =>
            e.source === id
              ? {
                  ...e,
                  className: "",
                  style: { stroke: "var(--brand-green)", strokeWidth: 2 },
                }
              : e,
          ),
        );

        if (i === order.length - 1) {
          setState("done");
          setMessages((m: ChatMessage[]) => [
            ...m,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              text: "Done! Both real generated image asset and brand styled assets are live on canvas.",
            },
          ]);
        }
      }, t);
    });
  }, [state, setStatus]);

  // Load from template
  const handleLoadTemplate = (template: SavedTemplate) => {
    currentBriefRef.current = template.brief;
    const realImageUrl = getRealImageUrl(template.brief);
    const realStyleUrl = getRealStyleUrl(template.brief);
    generatedImageUrlRef.current = realImageUrl;
    generatedStyleUrlRef.current = realStyleUrl;
    assembleGraphOnCanvas(template.graph, `Loaded template "${template.name}". Assembling on canvas now.`);
    toast.success(`Loaded template: ${template.name}`);
  };

  // Compare alternative plan
  const handleSelectAlternativePlan = async (planKey: "fidelity" | "speed") => {
    if (planKey === "speed") {
      try {
        const brief = currentBriefRef.current || "Product photo → 5-scene ad";
        setMessages((m: ChatMessage[]) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: "⚡ Planning alternative fast-path architecture (speed-optimized) via Groq...",
          },
        ]);
        const result = await fetchPlan(brief, "speed");
        assembleGraphOnCanvas(
          result.graph,
          `⚡ Applied Streamlined Fast-Path (${result.graph.nodes.length} nodes, ${result.graph.totalCost || "$0.0034"}). Assembling on canvas now.`,
        );
        toast.success("Generated and applied live Fast-Path plan");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to switch plan: ${errorMsg}`);
        setMessages((m: ChatMessage[]) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: `⚠️ Could not generate fast-path plan: ${errorMsg}`,
          },
        ]);
      }
    } else {
      toast.info("Active plan retained (Multi-Stage Parallel)");
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const graphData = activeGraphRef.current;
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flow-pipeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported pipeline JSON file");
  };

  // Copy JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activeGraphRef.current, null, 2));
    toast.success("Pipeline JSON copied to clipboard");
  };

  const runnable = state === "built" || state === "done";
  const activeGraph = activeGraphRef.current;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-card px-4">
        <button
          type="button"
          onClick={() => setPanelOpen((v: boolean) => !v)}
          aria-label="Toggle brief panel"
          className="-ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-surface md:hidden"
        >
          {panelOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </button>

        <FlowLogo size={28} />

        <div className="h-4 w-px bg-hairline hidden sm:block mx-0.5" />

        <span className="hidden text-xs text-muted-foreground sm:inline">
          {state === "idle"
            ? "Ready"
            : state === "planning"
              ? "Planning"
              : state === "built"
                ? "Graph built"
                : state === "running"
                  ? "Running pipeline"
                  : "Finished"}
        </span>

        {/* Cost & Latency Aggregate Pill */}
        {nodes.length > 0 ? (
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-hairline bg-surface px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-0.5 text-brand-green font-medium">
              <DollarSign className="h-3 w-3" />
              {activeGraph.totalCost || "$0.007"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              ~{((activeGraph.totalLatencyMs || 7200) / 1000).toFixed(1)}s
            </span>
          </div>
        ) : null}

        {/* Top bar interactive tools */}
        <div className="ml-auto flex items-center gap-2">
          {/* Templates Button */}
          <button
            type="button"
            onClick={() => setTemplateDialogOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:border-brand-green-pale transition-colors"
          >
            <Bookmark className="h-3.5 w-3.5 text-brand-green" />
            <span>Templates</span>
          </button>

          {/* Compare Alternative Plans */}
          {nodes.length > 0 ? (
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:border-brand-green-pale transition-colors"
            >
              <GitCompare className="h-3.5 w-3.5 text-brand-green" />
              <span>Compare</span>
            </button>
          ) : null}

          {/* Export JSON */}
          {nodes.length > 0 ? (
            <div className="flex items-center border border-hairline rounded-lg bg-surface overflow-hidden">
              <button
                type="button"
                onClick={handleExportJson}
                title="Download pipeline JSON"
                className="px-2 py-1.5 text-xs text-ink hover:bg-card transition-colors flex items-center gap-1"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                title="Copy pipeline JSON"
                className="border-l border-hairline px-2 py-1.5 text-xs text-muted-foreground hover:text-ink hover:bg-card transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          ) : null}

          {/* Run Button */}
          <button
            type="button"
            onClick={run}
            disabled={!runnable}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-green-deep disabled:bg-hairline disabled:text-muted-foreground"
          >
            <Play className="h-4 w-4" />
            {state === "running" ? "Running" : "Run"}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="relative flex min-h-0 flex-1">
        <aside
          className={[
            "absolute inset-y-0 left-0 z-20 w-[85%] max-w-[320px] border-r border-hairline transition-transform md:static md:w-[320px] md:translate-x-0",
            panelOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <BriefPanel
            messages={messages}
            state={state}
            onSubmit={(b: string) => {
              setPanelOpen(false);
              buildGraph(b);
            }}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <ReactFlowProvider>
            <FlowCanvas nodes={nodes} edges={edges} empty={nodes.length === 0 && state !== "planning"} />
          </ReactFlowProvider>
        </main>
      </div>

      {/* Modals & Slide-overs */}
      <NodeInspector
        node={selectedNode}
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        onSave={handleSaveNode}
        onRerunFromNode={handleRerunFromNode}
        onSimulateError={handleSimulateError}
      />

      <TemplateDialog
        isOpen={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        currentGraph={activeGraph}
        currentBrief={currentBriefRef.current}
        onLoadTemplate={handleLoadTemplate}
      />

      <ComparePlansModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        currentGraph={activeGraph}
        brief={currentBriefRef.current}
        onSelectPlan={handleSelectAlternativePlan}
      />
    </div>
  );
}
