import sys
from fastapi.testclient import TestClient

from main import app
from validator import validate_graph
from layout import compute_dag_layout
from planner import get_fallback_graph

client = TestClient(app)


def test_validator_valid():
    valid_graph = {
        "nodes": [
            {"id": "n1", "type": "input", "label": "Input", "params": {"summary": "Product photo on clean white background"}},
            {"id": "n2", "type": "prompt_generator", "label": "Prompt generator", "params": {"summary": "Generate 5 dynamic ad concept prompts"}},
            {"id": "n3", "type": "image_gen", "label": "Image gen", "params": {"summary": "Generate photorealistic product scenes"}},
            {"id": "n4", "type": "output", "label": "Output", "params": {"summary": "Final multi-scene ad render"}},
        ],
        "edges": [
            {"source": "n1", "target": "n2"},
            {"source": "n2", "target": "n3"},
            {"source": "n3", "target": "n4"},
        ],
    }
    is_valid, errors, graph = validate_graph(valid_graph)
    assert is_valid, f"Expected valid, got errors: {errors}"
    assert graph is not None
    assert len(graph.nodes) == 4
    print("[PASS] test_validator_valid passed")


def test_validator_invalid_node_type():
    invalid_graph = {
        "nodes": [
            {"id": "n1", "type": "input", "params": {"summary": "Photo input"}},
            {"id": "n2", "type": "super_fancy_magic_node", "params": {"summary": "Invalid type"}},
            {"id": "n3", "type": "output", "params": {"summary": "Done"}},
        ],
        "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}],
    }
    is_valid, errors, _ = validate_graph(invalid_graph)
    assert not is_valid
    assert any("invalid type 'super_fancy_magic_node'" in e for e in errors)
    assert any("between 4 and 7 nodes" in e for e in errors)
    print("[PASS] test_validator_invalid_node_type passed")


def test_validator_invalid_edges():
    invalid_graph = {
        "nodes": [
            {"id": "n1", "type": "input", "params": {"summary": "Valid input"}},
            {"id": "n2", "type": "prompt_generator", "params": {"summary": "Valid prompt"}},
            {"id": "n3", "type": "image_gen", "params": {"summary": "Valid image"}},
            {"id": "n4", "type": "output", "params": {"summary": "Valid output"}},
        ],
        "edges": [
            {"source": "n1", "target": "n_missing"},
        ],
    }
    is_valid, errors, _ = validate_graph(invalid_graph)
    assert not is_valid
    assert any("non-existent target node 'n_missing'" in e for e in errors)
    print("[PASS] test_validator_invalid_edges passed")


def test_layout_and_positions():
    fallback = get_fallback_graph("Product photo → 5-scene ad")
    client_nodes, client_edges, total_cost, total_latency = compute_dag_layout(fallback, "Product photo → 5-scene ad")

    assert len(client_nodes) == len(fallback.nodes)
    assert len(client_edges) == len(fallback.edges)
    assert total_cost.startswith("$")
    assert total_latency > 0

    # Verify positions are assigned
    for n in client_nodes:
        assert n.position.x >= 0
        assert n.position.y is not None
        assert n.kind in {"input", "prompt_generator", "image_gen", "upscale", "style_transfer", "output"}

    print("[PASS] test_layout_and_positions passed")


def test_api_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    print("[PASS] test_api_health passed")


def test_api_plan_endpoint():
    res = client.post("/plan", json={"brief": "Product photo → 5-scene ad"})
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert "fallback" in data
    assert len(data["nodes"]) >= 4
    assert data["nodes"][0]["kind"] == "input"
    assert data["nodes"][-1]["kind"] == "output"
    print("[PASS] test_api_plan_endpoint passed")


if __name__ == "__main__":
    test_validator_valid()
    test_validator_invalid_node_type()
    test_validator_invalid_edges()
    test_layout_and_positions()
    test_api_health()
    test_api_plan_endpoint()
    print("\nAll backend unit and integration tests passed successfully!")
