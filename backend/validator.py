from typing import Tuple, List, Optional
from models import ALLOWED_NODE_TYPES, RawGraph, RawNode, RawEdge


class GraphValidationError(Exception):
    def __init__(self, message: str, errors: List[str]):
        super().__init__(message)
        self.errors = errors


def validate_graph(graph_dict: dict) -> Tuple[bool, List[str], Optional[RawGraph]]:
    """
    Validates the raw graph structure against Flow's strict architectural rules:
    1. Valid JSON format with 'nodes' and 'edges'.
    2. Total node count between 4 and 7.
    3. Allowed node types only: input, prompt_generator, image_gen, upscale, style_transfer, output.
    4. Exactly one 'input' node, which must be the first node.
    5. Exactly one 'output' node, which must be the last node.
    6. All edge sources and targets must reference existing node IDs.
    7. params.summary must be present, non-empty, and specific (no generic placeholders).
    8. No self-loops or duplicate edges.
    """
    errors: List[str] = []

    if not isinstance(graph_dict, dict):
        return False, ["Root output must be a JSON object with 'nodes' and 'edges' arrays."], None

    nodes_raw = graph_dict.get("nodes")
    edges_raw = graph_dict.get("edges")

    if not isinstance(nodes_raw, list):
        return False, ["Missing or invalid 'nodes' list."], None
    if not isinstance(edges_raw, list):
        return False, ["Missing or invalid 'edges' list."], None

    node_count = len(nodes_raw)
    if node_count < 4 or node_count > 7:
        errors.append(f"Graph must contain between 4 and 7 nodes total; received {node_count}.")

    try:
        nodes: List[RawNode] = [RawNode(**n) for n in nodes_raw]
    except Exception as e:
        errors.append(f"Invalid node schema: {str(e)}")
        return False, errors, None

    try:
        edges: List[RawEdge] = [RawEdge(**e) for e in edges_raw]
    except Exception as e:
        errors.append(f"Invalid edge schema: {str(e)}")
        return False, errors, None

    node_ids = set()
    input_count = 0
    output_count = 0

    for i, node in enumerate(nodes):
        if not node.id:
            errors.append(f"Node at index {i} has empty ID.")
        elif node.id in node_ids:
            errors.append(f"Duplicate node ID '{node.id}'.")
        node_ids.add(node.id)

        # Node type check
        if node.type not in ALLOWED_NODE_TYPES:
            errors.append(
                f"Node '{node.id}' has invalid type '{node.type}'. Allowed types are: {', '.join(sorted(ALLOWED_NODE_TYPES))}."
            )

        if node.type == "input":
            input_count += 1
            if i != 0:
                errors.append(f"Input node '{node.id}' must be the first node (index 0).")

        if node.type == "output":
            output_count += 1
            if i != len(nodes) - 1:
                errors.append(f"Output node '{node.id}' must be the last node (index {len(nodes) - 1}).")

        summary = node.params.summary.strip()
        if not summary or len(summary) < 4:
            errors.append(f"Node '{node.id}' params.summary is empty or too short.")
        elif any(ph in summary.lower() for ph in ["placeholder", "todo", "lorem ipsum", "generic summary"]):
            errors.append(f"Node '{node.id}' params.summary contains placeholder text: '{summary}'.")

    if input_count != 1:
        errors.append(f"Graph must have exactly 1 'input' node; found {input_count}.")
    if output_count != 1:
        errors.append(f"Graph must have exactly 1 'output' node; found {output_count}.")

    # Validate edges
    seen_edges = set()
    for i, edge in enumerate(edges):
        if edge.source not in node_ids:
            errors.append(f"Edge {i} references non-existent source node '{edge.source}'.")
        if edge.target not in node_ids:
            errors.append(f"Edge {i} references non-existent target node '{edge.target}'.")
        if edge.source == edge.target:
            errors.append(f"Edge {i} has identical source and target '{edge.source}' (self-loop).")
        
        pair = (edge.source, edge.target)
        if pair in seen_edges:
            errors.append(f"Duplicate edge from '{edge.source}' to '{edge.target}'.")
        seen_edges.add(pair)

    if errors:
        return False, errors, None

    return True, [], RawGraph(nodes=nodes, edges=edges)
