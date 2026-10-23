#!/usr/bin/env python3
"""Read-only TABLElogic HOUSE as a genuine STATIC OS InstrumentAdapterV0.

This is a native donor-host integration *probe* in an isolated session. It does not
install an OS image or use a local owner ADMIT gate. The source file's assertion
that native CANNON verification occurred is not independently verified here.
Run TABLElogic's original CANNON verifier immediately before this probe.
"""
from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys

EXPECTED_ORGANS = ["planZ", "CANNON", "GHoT", "reLATTE", "STATIC OS"]
MAX_VIEW_BYTES = 512 * 1024


def canonical(value):
    """Canonical JSON for this ASCII-only bounded TABLElogic source contract."""
    if value is None or isinstance(value, (str, bool)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if type(value) is int:
        return str(value)
    if isinstance(value, list):
        return "[" + ",".join(canonical(v) for v in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(canonical(k) + ":" + canonical(value[k])
                               for k in sorted(value)) + "}"
    raise ValueError("UNSUPPORTED_VIEW_VALUE")


def view_digest(value):
    return sha256(canonical(value).encode("utf-8")).hexdigest()


def read_view(path: Path):
    raw = path.read_bytes()
    if not (0 < len(raw) <= MAX_VIEW_BYTES):
        raise ValueError("SOURCE_BYTE_BUDGET_EXCEEDED")
    view = json.loads(raw)
    if not isinstance(view, dict):
        raise ValueError("INVALID_VIEW")
    digest = view.get("projection_sha256")
    body = {k: v for k, v in view.items() if k != "projection_sha256"}
    if not isinstance(digest, str) or view_digest(body) != digest:
        raise ValueError("PROJECTION_DIGEST_CHANGED")
    if (view.get("schema") != "tablelogic.house-presence/v0" or
        view.get("disposition") != "HOLD" or
        view.get("projection_authority") != "none"):
        raise ValueError("UNSAFE_HOUSE_VIEW")
    roles = view.get("roles")
    if not isinstance(roles, list) or [x.get("organ") for x in roles] != EXPECTED_ORGANS:
        raise ValueError("ORGAN_IDENTITY_CHANGED")
    table = view.get("table")
    if (not isinstance(table, dict) or
        table.get("human_consent") != "NOT_OBSERVED" or
        table.get("owner_effect") != "NONE" or
        table.get("possible_next_crossing") != "HUMAN_REVIEW_REQUIRED" or
        not isinstance(table.get("invitations"), list) or
        any(x.get("authorized") is not False or x.get("executed") is not False
            for x in table["invitations"])):
        raise ValueError("SOURCE_CLAIMS_AUTHORITY")
    if roles[4].get("state") != "PROJECTION_ONLY_NOT_INSTALLED_OR_BOOTED":
        raise ValueError("STATIC_OS_BOOT_LAUNDERING")
    return view, sha256(raw).hexdigest()


def make_adapter(path: Path):
    # These are imports from the ORIGINAL pinned STATIC OS implementation,
    # not replacement classes or a TABLElogic-invented host.
    from instruments.contract import InstrumentDescriptorV0, controls, observation, require
    from vendor.eleven_heap_001.infinite_radio import Address

    class TableHouseAdapter:
        instrument_id = "tablelogic-held-house"

        def describe(self):
            view, source_hash = read_view(path)
            return InstrumentDescriptorV0(
                self.instrument_id,
                "tablelogic-house-readonly/v0",
                "TABLElogic / THE HOUSE TAKES ATTENDANCE / READ ONLY",
                {
                    "kind": "bounded-local-house-view",
                    "reference": path.as_uri(),
                    "history": [
                        "tablelogic.house-presence/v0",
                        "file-claimed-cannon-cold-verification:" + view["verification"],
                        "no independently granted owner consent or command capability",
                    ],
                    "sha256": source_hash,
                },
                {
                    "revision": "tablelogic-static-os-adapter-probe/v0",
                    "view_sha256": view["projection_sha256"],
                },
                controls("HOUSE organ", "organ index", [1, 5])
            )

        def observe(self):
            descriptor = self.describe()
            view, _ = read_view(path)
            items = [
                {"organ": item["organ"], "surface": item["surface"],
                 "state": item["state"], "source_item": n, "authority": "none"}
                for n, item in enumerate(view["roles"])
            ]
            return observation(
                descriptor.source, items,
                classification="local read-only TABLElogic file; no boot, ACT, ADMIT or native re-verification"
            )

        def select(self, observed: dict, mode: str, address: Address,
                   region: tuple[int, int] | None = None,
                   focus: int | None = None):
            require(mode in ("field", "attention"), "unsupported table map")
            low, high = region or (0, len(observed["items"]))
            require(0 <= low < high <= len(observed["items"]), "invalid table region")
            idx = min(high - 1, low + int(address.center * (high - low)))
            return {
                "type": "TableOrganSelection",
                "source_item": idx,
                "organ": observed["items"][idx]["organ"],
                "state": observed["items"][idx]["state"],
                "authority": "none",
                "owner_effect": "NONE",
                "executable": False,
            }

    return TableHouseAdapter()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--house", type=Path, required=True)
    parser.add_argument("--static-os-root", type=Path, required=True)
    parser.add_argument("--session", type=Path, required=True)
    args = parser.parse_args()
    original = args.static_os_root.resolve()
    root = Path(__file__).resolve().parent.parent
    source = args.house.resolve()
    if not source.is_file():
        raise ValueError("MISSING_HOUSE_FILE")
    view, source_hash = read_view(source)
    if original == root or not (original / "instruments" / "host.py").is_file():
        raise ValueError("MISSING_ORIGINAL_STATIC_OS")
    sys.path.insert(0, str(original))
    from instruments.contract import Refuse
    from instruments.host import InstrumentHost
    adapter = make_adapter(source)
    host = InstrumentHost(args.session.resolve())
    try:
        descriptor = host.install(adapter)
        observed = host.observe(adapter.instrument_id)
        host.set_positions(adapter.instrument_id, [1])
        first = host.select(adapter.instrument_id)
        host.set_positions(adapter.instrument_id, [11])
        last = host.select(adapter.instrument_id)
        if first["organ"] != "planZ" or last["organ"] != "STATIC OS":
            raise ValueError("RADIX_11_TABLE_SELECTION_CHANGED")
        # The host's real read-only functions succeed, but its native admission
        # service is unavailable. This instrument does not request owner ACT.
        result = {
            "schema": "tablelogic.original-static-os-probe/v0",
            "original_host_module": "instruments.host.InstrumentHost",
            "original_adapter_protocol": descriptor["schema"],
            "source_sha256": source_hash,
            "host_observation_sha256": observed["observation_sha256"],
            "first_organ": first["organ"], "last_organ": last["organ"],
            "host_discoverable": len(host.discover()["instruments"]) == 1,
            "owner_admitted": False,
            "native_operations_run": ["install", "observe", "set_positions", "select"],
            "effect": "NONE", "rf_emitted": False,
            "booted_os": False,
            "source_file_cryptographic_authenticity_verified_here": False,
        }
    finally:
        host.close()
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, ImportError) as error:
        print("HOLD: " + str(error)[:400], file=sys.stderr)
        raise SystemExit(1)
