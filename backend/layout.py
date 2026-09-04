from collections import defaultdict, deque
from typing import List, Dict, Tuple
from models import (
    RawGraph,
    ClientNode,
    ClientEdge,
    NodePosition,
    NodeResult,
    NODE_TYPE_TITLES,
    DEFAULT_NODE_DURATIONS,
    DEFAULT_NODE_COSTS,
)

DEFAULT_REASONS = {
    "input": "Ingests primary creative assets and specs from the user's brief.",
    "prompt_generator": "Expands the brief into structured, model-optimized prompts.",
    "image_gen": "Synthesizes high-fidelity visual concepts matching the generated prompts.",
    "style_transfer": "Harmonizes colors, brand palette, and lighting treatment.",
    "upscale": "Enhances resolution, surface micro-details, and crisp fidelity.",
    "output": "Packages and presents the final creative deliverables.",
}


def compute_dag_layout(
    raw_graph: RawGraph, brief: str = ""
) -> Tuple[List[ClientNode], List[ClientEdge], str, int]:
    """
    Computes visual (x, y) coordinates for @xyflow/react canvas and attaches
    frontend presentation metadata (titles, durations, rationales, costs).
    
    Layout strategy:
    - Nodes are assigned layers/columns based on longest path from input (topological rank).
    - Horizontal step is 260px.
    - Nodes sharing a column are centered vertically around y = 120px with 160px vertical step.
    """
    node_map = {n.id: n for n in raw_graph.nodes}
    adj = defaultdict(list)
    indeg = defaultdict(int)

    for n in raw_graph.nodes:
        indeg[n.id] = 0

    for e in raw_graph.edges:
        adj[e.source].append(e.target)
        indeg[e.target] += 1

    # Find longest path rank from roots
    ranks: Dict[str, int] = {}
    queue = deque()

    for n in raw_graph.nodes:
        if indeg[n.id] == 0:
            queue.append(n.id)
            ranks[n.id] = 0

    # In case of cycles or disconnected nodes, default rank
    for n in raw_graph.nodes:
        if n.id not in ranks:
            ranks[n.id] = 0

    topological_sorted = []
    in_degrees = dict(indeg)
    q = deque([n.id for n in raw_graph.nodes if in_degrees[n.id] == 0])

    while q:
        curr = q.popleft()
        topological_sorted.append(curr)
        for nxt in adj[curr]:
            in_degrees[nxt] -= 1
            if in_degrees[nxt] == 0:
                q.append(nxt)

    for n in raw_graph.nodes:
        if n.id not in topological_sorted:
            topological_sorted.append(n.id)

    # Compute ranks
    for u in topological_sorted:
        curr_rank = ranks.get(u, 0)
        for v in adj[u]:
            ranks[v] = max(ranks.get(v, 0), curr_rank + 1)

    # Force output node to be on the rightmost rank
    max_rank = max(ranks.values()) if ranks else 0
    output_node = raw_graph.nodes[-1]
    if output_node.type == "output":
        ranks[output_node.id] = max_rank + 1

    # Group nodes by rank
    columns = defaultdict(list)
    for n in raw_graph.nodes:
        r = ranks[n.id]
        columns[r].append(n)

    x_gap = 260
    base_y = 120
    y_gap = 160

    client_nodes: List[ClientNode] = []
    total_cost_cents = 0.0
    total_latency_ms = 0

    for r in sorted(columns.keys()):
        nodes_in_col = columns[r]
        col_count = len(nodes_in_col)
        x_pos = r * x_gap

        for idx, node in enumerate(nodes_in_col):
            if col_count == 1:
                y_pos = base_y
            else:
                start_y = base_y - ((col_count - 1) * y_gap) / 2
                y_pos = start_y + idx * y_gap

            title = node.label or NODE_TYPE_TITLES.get(node.type, node.type.replace("_", " ").title())
            duration = DEFAULT_NODE_DURATIONS.get(node.type, 1500)
            cost_str = DEFAULT_NODE_COSTS.get(node.type, "$0.001")
            cost_num = float(cost_str.replace("$", ""))
            total_cost_cents += cost_num
            total_latency_ms += duration

            reason = node.reason or DEFAULT_REASONS.get(node.type, f"Executes {node.type} step for the pipeline.")

            result = None
            if node.type == "output":
                result = NodeResult(
                    type="text",
                    value=f"Finished output for: {brief[:36]}" if brief else "Final pipeline output",
                )

            client_nodes.append(
                ClientNode(
                    id=node.id,
                    kind=node.type,
                    title=title,
                    summary=node.params.summary,
                    reason=reason,
                    estimated_cost=cost_str,
                    latency_ms=duration,
                    position=NodePosition(x=round(x_pos), y=round(y_pos)),
                    duration=duration,
                    result=result,
                )
            )

    client_edges: List[ClientEdge] = []
    for idx, e in enumerate(raw_graph.edges):
        edge_id = e.id or f"e{idx + 1}"
        client_edges.append(
            ClientEdge(
                id=edge_id,
                source=e.source,
                target=e.target,
            )
        )

    formatted_total_cost = f"${total_cost_cents:.4f}"
    return client_nodes, client_edges, formatted_total_cost, total_latency_ms
