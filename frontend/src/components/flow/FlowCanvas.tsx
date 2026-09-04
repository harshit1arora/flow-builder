import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode } from "./WorkflowNode";

const nodeTypes = { workflow: WorkflowNode };

interface Props {
  nodes: Node[];
  edges: Edge[];
  empty: boolean;
}

export function FlowCanvas({ nodes, edges, empty }: Props) {
  const types = useMemo(() => nodeTypes, []);
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length === 0) return;
    const t = setTimeout(() => void fitView({ padding: 0.2, duration: 300 }), 30);
    return () => clearTimeout(t);
  }, [nodes.length, fitView]);

  return (
    <div className="relative h-full w-full bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={types}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.6}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.6}
          color="var(--brand-green-pale)"
        />
        <Controls showInteractive={false} className="!border-hairline !shadow-none" />
      </ReactFlow>

      {empty ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="font-display text-xl text-muted-foreground">
            Describe what you want to make
          </p>
        </div>
      ) : null}
    </div>
  );
}
