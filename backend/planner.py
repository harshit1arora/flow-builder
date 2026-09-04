import os
import json
import logging
from typing import Tuple, Optional
from groq import Groq
from dotenv import load_dotenv

from models import RawGraph, PlanResponse
from validator import validate_graph
from layout import compute_dag_layout

load_dotenv()
logger = logging.getLogger("flow.planner")

GROQ_MODEL = os.getenv("GROQ_MODEL", "groq/compound-mini")

# System prompt with explainability ("reason") field
SYSTEM_PROMPT = """You are a workflow-planning agent for Flow, a creative AI pipeline builder.

Given a user's one-line creative brief, output ONLY valid JSON (no markdown, no commentary) describing a node graph for the pipeline that would accomplish it.

Schema:
{
  "nodes": [
    {
      "id": "n1",
      "type": "input",
      "label": "Input",
      "reason": "Ingests primary creative source assets specified in the brief",
      "params": {"summary": "1 image · product-shot.jpg"}
    }
  ],
  "edges": [
    {"source": "n1", "target": "n2"}
  ]
}

Rules:
- Allowed types ONLY: input, prompt_generator, image_gen, upscale, style_transfer, output
- Always exactly one "input" node (first) and one "output" node (last)
- 4 to 7 nodes total
- Branching is allowed and encouraged when it reflects real parallel work (e.g. image_gen and style_transfer both feeding into upscale) — don't force a straight line if the brief implies parallel steps
- Each node MUST include a "reason" field: a concise 1-sentence architectural explanation of why this step exists in the pipeline (builds user trust and explainability)
- Each node's "params.summary" must be a short, concrete, human-readable description specific to THIS brief (not generic placeholder text) — e.g. "Style: cinematic, 16:9" or "Match brand palette", not "params here"
- The output node's summary should describe the final deliverable concretely (format, count, dimensions)
- Return nothing but the JSON object"""


def get_fallback_graph(brief: str) -> RawGraph:
    """
    Emergency error-boundary fallback graph tailored to the brief.
    ONLY triggered when Groq API is hard-down, unauthenticated, or exhausts retries.
    """
    brief_clean = brief.strip() or "Creative asset pipeline"
    lower = brief_clean.lower()

    if "carousel" in lower or "blog" in lower:
        raw_dict = {
            "nodes": [
                {
                    "id": "n1",
                    "type": "input",
                    "label": "Input",
                    "reason": "Parses article text and markdown structure to extract core talking points",
                    "params": {"summary": "Blog article markdown · 1,200 words"},
                },
                {
                    "id": "n2",
                    "type": "prompt_generator",
                    "label": "Prompt generator",
                    "reason": "Distills longform copy into high-engagement slides and hook prompts",
                    "params": {"summary": "Extract 5 hook slides & key takeaways"},
                },
                {
                    "id": "n3",
                    "type": "image_gen",
                    "label": "Image gen",
                    "reason": "Synthesizes modern visual backgrounds for the carousel cards",
                    "params": {"summary": "Minimalist editorial background textures"},
                },
                {
                    "id": "n4",
                    "type": "style_transfer",
                    "label": "Style transfer",
                    "reason": "Aligns visual slide aesthetic to brand typography and duo-tone palette",
                    "params": {"summary": "Apply brand typography & duo-tone overlay"},
                },
                {
                    "id": "n5",
                    "type": "output",
                    "label": "Output",
                    "reason": "Composites and renders final multi-slide LinkedIn carousel",
                    "params": {"summary": "5-slide LinkedIn carousel ready to post"},
                },
            ],
            "edges": [
                {"source": "n1", "target": "n2"},
                {"source": "n2", "target": "n3"},
                {"source": "n2", "target": "n4"},
                {"source": "n3", "target": "n5"},
                {"source": "n4", "target": "n5"},
            ],
        }
    elif "logo" in lower or "brand" in lower:
        raw_dict = {
            "nodes": [
                {
                    "id": "n1",
                    "type": "input",
                    "label": "Input",
                    "reason": "Ingests primary vector mark or brand identity asset",
                    "params": {"summary": "Vector logo mark · SVG master file"},
                },
                {
                    "id": "n2",
                    "type": "prompt_generator",
                    "label": "Prompt generator",
                    "reason": "Formulates design mock contexts across stationery, merchandise, and digital",
                    "params": {"summary": "Generate brand kit variations & collateral contexts"},
                },
                {
                    "id": "n3",
                    "type": "image_gen",
                    "label": "Image gen",
                    "reason": "Renders realistic 3D packaging and embossed collateral mockups",
                    "params": {"summary": "3D embossed mockup scenes on packaging"},
                },
                {
                    "id": "n4",
                    "type": "style_transfer",
                    "label": "Style transfer",
                    "reason": "Systematizes corporate colorways into dark, light, and monochrome palettes",
                    "params": {"summary": "Colorway harmonizer (monochrome, dark, pastel)"},
                },
                {
                    "id": "n5",
                    "type": "upscale",
                    "label": "Upscale",
                    "reason": "Ensures crisp high-DPI export for print and web asset bundles",
                    "params": {"summary": "Vector tracing & high-DPI export"},
                },
                {
                    "id": "n6",
                    "type": "output",
                    "label": "Output",
                    "reason": "Compiles the final brand kit guide and downloadable asset package",
                    "params": {"summary": "Comprehensive brand kit package"},
                },
            ],
            "edges": [
                {"source": "n1", "target": "n2"},
                {"source": "n2", "target": "n3"},
                {"source": "n2", "target": "n4"},
                {"source": "n3", "target": "n5"},
                {"source": "n4", "target": "n5"},
                {"source": "n5", "target": "n6"},
            ],
        }
    elif "sketch" in lower:
        raw_dict = {
            "nodes": [
                {
                    "id": "n1",
                    "type": "input",
                    "label": "Input",
                    "reason": "Captures raw concept drawing and perspective lines",
                    "params": {"summary": "Hand-drawn product concept sketch"},
                },
                {
                    "id": "n2",
                    "type": "prompt_generator",
                    "label": "Prompt generator",
                    "reason": "Translates rough visual annotations into industrial design CMF specifications",
                    "params": {"summary": "Detailed material, lighting & CMF specifications"},
                },
                {
                    "id": "n3",
                    "type": "image_gen",
                    "label": "Image gen",
                    "reason": "Transforms wireframe linework into studio-lit 3D product renders",
                    "params": {"summary": "ControlNet lineart to photoreal 3D industrial render"},
                },
                {
                    "id": "n4",
                    "type": "upscale",
                    "label": "Upscale",
                    "reason": "Sharpens textures and bevels to 4K presentation fidelity",
                    "params": {"summary": "Ultra-sharp 4K surface texture enhancement"},
                },
                {
                    "id": "n5",
                    "type": "output",
                    "label": "Output",
                    "reason": "Generates stakeholder-ready presentation deck renders",
                    "params": {"summary": "Studio-grade product presentation render"},
                },
            ],
            "edges": [
                {"source": "n1", "target": "n2"},
                {"source": "n2", "target": "n3"},
                {"source": "n3", "target": "n4"},
                {"source": "n4", "target": "n5"},
            ],
        }
    else:
        raw_dict = {
            "nodes": [
                {
                    "id": "n1",
                    "type": "input",
                    "label": "Input",
                    "reason": "Loads user-provided media asset as the pipeline root",
                    "params": {"summary": f"Source asset for: {brief_clean[:32]}"},
                },
                {
                    "id": "n2",
                    "type": "prompt_generator",
                    "label": "Prompt generator",
                    "reason": "Synthesizes creative direction and precise scene descriptors",
                    "params": {"summary": "Generate specialized prompts & direction"},
                },
                {
                    "id": "n3",
                    "type": "image_gen",
                    "label": "Image gen",
                    "reason": "Renders base creative visual concepts in parallel",
                    "params": {"summary": "High-fidelity generation model"},
                },
                {
                    "id": "n4",
                    "type": "style_transfer",
                    "label": "Style transfer",
                    "reason": "Refines lighting and color balance to match creative intent",
                    "params": {"summary": "Aesthetic style and color grade"},
                },
                {
                    "id": "n5",
                    "type": "upscale",
                    "label": "Upscale",
                    "reason": "Boosts pixel density and micro-contrast for publishing",
                    "params": {"summary": "Detail preservation & 4x enhancement"},
                },
                {
                    "id": "n6",
                    "type": "output",
                    "label": "Output",
                    "reason": "Delivers the finalized, production-ready asset package",
                    "params": {"summary": f"Completed asset pipeline for {brief_clean[:28]}"},
                },
            ],
            "edges": [
                {"source": "n1", "target": "n2"},
                {"source": "n2", "target": "n3"},
                {"source": "n2", "target": "n4"},
                {"source": "n3", "target": "n5"},
                {"source": "n4", "target": "n5"},
                {"source": "n5", "target": "n6"},
            ],
        }

    _, _, validated = validate_graph(raw_dict)
    return validated


def call_groq_planner(brief: str, mode: str = "fidelity") -> Tuple[RawGraph, bool, Optional[str]]:
    """
    Calls Groq Llama 3.3 70B in JSON mode.
    Returns: (graph, is_fallback, fallback_reason)
    Supports both 'fidelity' (multi-stage branch) and 'speed' (linear fast-path) modes.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        msg = "GROQ_API_KEY not found in backend/.env — triggering emergency fallback."
        logger.error(f"[ERROR BOUNDARY TRIGGERED] {msg}")
        return get_fallback_graph(brief), True, "GROQ_API_KEY is not configured in backend/.env"

    client = Groq(api_key=api_key)
    if mode == "speed":
        user_prompt = (
            f"Plan a streamlined, speed-optimized direct workflow graph for this brief: \"{brief}\". "
            f"Architecture: exactly 4 nodes (input -> prompt_generator -> image_gen -> output), strict linear pipeline with zero branching to minimize latency and compute."
        )
    else:
        user_prompt = (
            f"Plan a multi-stage, high-fidelity creative workflow graph for this brief: \"{brief}\". "
            f"Architecture: 5-7 nodes with parallel branching (e.g. prompt_generator fanning into image_gen and style_transfer before merging)."
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        logger.info(f"[PLANNER] Sending request ({mode} mode) to Groq {GROQ_MODEL} for brief: '{brief}'")
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.3 if mode == "fidelity" else 0.1,
            max_completion_tokens=1024,
        )

        content = completion.choices[0].message.content
        raw_json = json.loads(content)
        valid, errors, validated_graph = validate_graph(raw_json)

        if valid and validated_graph:
            logger.info("[PLANNER] Pass 1 succeeded. Graph validated according to all rules.")
            return validated_graph, False, None

        logger.warning(
            f"[PLANNER VALIDATION FAILED - PASS 1] Violations: {errors}. Retrying with strict feedback."
        )

        retry_prompt = (
            f"Your previous JSON graph violated these strict architectural rules:\n"
            + "\n".join(f"- {err}" for err in errors)
            + "\n\nPlease fix these issues and output ONLY the corrected JSON graph conforming strictly to the rules."
        )

        messages.append({"role": "assistant", "content": content})
        messages.append({"role": "user", "content": retry_prompt})

        retry_completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_completion_tokens=1024,
        )

        retry_content = retry_completion.choices[0].message.content
        retry_json = json.loads(retry_content)
        valid_retry, retry_errors, validated_retry_graph = validate_graph(retry_json)

        if valid_retry and validated_retry_graph:
            logger.info("[PLANNER] Pass 2 (Retry) succeeded! Model self-corrected the graph successfully.")
            return validated_retry_graph, False, None

        fail_msg = f"Graph validation failed after retry: {'; '.join(retry_errors)}"
        logger.error(f"[ERROR BOUNDARY TRIGGERED] {fail_msg}")
        return get_fallback_graph(brief), True, fail_msg

    except Exception as e:
        err_msg = f"Groq API connection or execution error: {str(e)}"
        logger.error(f"[ERROR BOUNDARY TRIGGERED] {err_msg}", exc_info=True)
        return get_fallback_graph(brief), True, err_msg


def plan_workflow(brief: str, mode: str = "fidelity") -> PlanResponse:
    """
    Main planning entrypoint. Generates graph, validates, computes layout,
    and returns full PlanResponse with live/fallback telemetry, metrics, and rationales.
    """
    raw_graph, is_fallback, fallback_reason = call_groq_planner(brief, mode=mode)
    client_nodes, client_edges, total_cost, total_latency = compute_dag_layout(raw_graph, brief)

    return PlanResponse(
        brief=brief,
        nodes=client_nodes,
        edges=client_edges,
        raw_graph=raw_graph,
        total_cost=total_cost,
        total_latency_ms=total_latency,
        fallback=is_fallback,
        fallback_reason=fallback_reason,
        model=GROQ_MODEL if not is_fallback else "fallback-engine",
    )
