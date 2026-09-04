from typing import Any, Optional
from pydantic import BaseModel, Field


ALLOWED_NODE_TYPES = {
    "input",
    "prompt_generator",
    "image_gen",
    "upscale",
    "style_transfer",
    "output",
}

# Mapping canonical names to human-friendly titles
NODE_TYPE_TITLES = {
    "input": "Input",
    "prompt_generator": "Prompt generator",
    "image_gen": "Image gen",
    "upscale": "Upscale",
    "style_transfer": "Style transfer",
    "output": "Output",
}

# Standard execution durations in ms for simulation
DEFAULT_NODE_DURATIONS = {
    "input": 800,
    "prompt_generator": 1500,
    "image_gen": 2400,
    "upscale": 1600,
    "style_transfer": 1800,
    "output": 1000,
}

# Estimated API / Model cost per node
DEFAULT_NODE_COSTS = {
    "input": "$0.00",
    "prompt_generator": "$0.0005",
    "image_gen": "$0.0030",
    "upscale": "$0.0020",
    "style_transfer": "$0.0020",
    "output": "$0.00",
}


class NodeParams(BaseModel):
    summary: str = Field(..., description="Concrete, specific one-line summary of node configuration")


class RawNode(BaseModel):
    id: str
    type: str
    label: Optional[str] = None
    reason: Optional[str] = Field(None, description="One-line architectural rationale for why this step was selected")
    params: NodeParams


class RawEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str


class RawGraph(BaseModel):
    nodes: list[RawNode]
    edges: list[RawEdge]


class PlanRequest(BaseModel):
    brief: str = Field(..., min_length=1, description="One-line creative brief")
    mode: Optional[str] = Field("fidelity", description="Architecture mode: 'fidelity' (multi-stage branch) or 'speed' (linear fast-path)")


class NodePosition(BaseModel):
    x: float
    y: float


class NodeResult(BaseModel):
    type: str  # "image" | "text"
    value: str


class ClientNode(BaseModel):
    id: str
    kind: str
    title: str
    summary: str
    reason: Optional[str] = None
    estimated_cost: str = "$0.00"
    latency_ms: int = 1500
    position: NodePosition
    duration: int = 1500
    result: Optional[NodeResult] = None


class ClientEdge(BaseModel):
    id: str
    source: str
    target: str


class PlanResponse(BaseModel):
    brief: str
    nodes: list[ClientNode]
    edges: list[ClientEdge]
    raw_graph: Optional[RawGraph] = None
    total_cost: str = "$0.00"
    total_latency_ms: int = 0
    fallback: bool = False
    fallback_reason: Optional[str] = None
    model: Optional[str] = "groq/compound-mini"
