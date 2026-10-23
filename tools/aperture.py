#!/usr/bin/env python3
"""Invoke ORIGINAL source-pinned Static Workbench APERTURE: never a model."""
from dataclasses import asdict
import json
import sys
from static_workbench.aperture import analyze_aperture

if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Expected original question and optional human context.")
    raw = sys.argv[1]
    context = sys.argv[2] if len(sys.argv) > 2 else None
    result = asdict(analyze_aperture(raw, context))
    if result["raw_text"] != raw or result["status"] not in ("unresolved", "narrowed"):
        raise SystemExit("Original Workbench did not preserve its source.")
    print(json.dumps(result, sort_keys=True))
