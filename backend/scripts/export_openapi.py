"""Deterministic OpenAPI export for the FastAPI application.

Usage (from backend/, so `app` and `scripts` resolve as top-level packages):
    uv run python -m scripts.export_openapi             # write backend/openapi.json
    uv run python -m scripts.export_openapi --write      # same, explicit
    uv run python -m scripts.export_openapi --check      # verify the committed file is current

`--write` and `--check` are mutually exclusive; passing both fails with a
clear argparse error rather than silently choosing one. Writing is the
default when neither flag is given.

Or via the root package scripts: `pnpm openapi:export` / `pnpm openapi:check`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# The application validates DATABASE_URL while importing app.main (pulled in
# transitively through app.database.engine). OpenAPI schema generation needs
# no database connection at all, so seed a deliberately unreachable
# placeholder — only for this process, only if a real value isn't already
# configured — mirroring the same pattern tests/conftest.py uses for the
# same reason. This never touches how the running application itself
# validates settings: Settings.database_url remains a required field with
# no default there, so `uv run fastapi dev` and the production entrypoint
# still fail immediately on a genuinely missing DATABASE_URL.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://invalid:invalid@127.0.0.1:1/invalid",
)

from app.main import create_app  # noqa: E402

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "openapi.json"


def build_openapi_json() -> str:
    """Builds the OpenAPI document as deterministic, formatted JSON text.

    A fresh application is created on every call — never the shared
    module-level `app` singleton — so the exported schema never depends on
    state any other code path may have mutated. `sort_keys=True` removes
    any dependence on dict insertion order from route registration or
    Pydantic schema generation, so the output is byte-identical across
    machines and repeated executions whenever the API itself hasn't
    changed. Nothing in FastAPI's default OpenAPI generation includes a
    timestamp, hostname, or other machine-specific value.
    """
    app = create_app()
    schema = app.openapi()
    return json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def is_up_to_date(output_path: Path, generated: str) -> bool:
    """True when `output_path` already contains exactly `generated`.

    Takes both as explicit parameters (rather than reading the module-level
    `OUTPUT_PATH` and regenerating internally) so tests can exercise this
    comparison against an isolated temporary path, never the real committed
    `backend/openapi.json`.
    """
    return output_path.exists() and output_path.read_text(encoding="utf-8") == generated


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--write",
        action="store_true",
        help="Write backend/openapi.json (default when no mode is given).",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        help="Verify the committed file matches a fresh export instead of writing it.",
    )
    args = parser.parse_args()

    generated = build_openapi_json()

    if args.check:
        if not is_up_to_date(OUTPUT_PATH, generated):
            print(
                "OpenAPI specification is out of date. "
                f"Run `pnpm openapi:export` and commit the updated {OUTPUT_PATH}."
            )
            return 1
        print(f"OpenAPI specification is up to date: {OUTPUT_PATH}")
        return 0

    OUTPUT_PATH.write_text(generated, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
