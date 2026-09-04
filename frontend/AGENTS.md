# HexCoded Flow Agent Guidelines

This workspace contains **Flow**, an agentic workflow builder prototype for HexCoded.

### Conventions
- **Color System**: White & Green brand palette (`#FFFFFF`, `#1B7F4C`, `#0E5C36`, `#B8E6C9`, `#F7FAF8`). Do not switch to dark mode terminal aesthetics.
- **Backend**: FastAPI on port `8000`, using Groq compound-mini JSON mode with topological DAG layout in `backend/planner.py`.
- **Frontend**: Vite + TanStack Router + `@xyflow/react` running on port `8080`.
- **Execution**: Live generative calls via Pollinations.ai with real node outputs and in-place node editing.
