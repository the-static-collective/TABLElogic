# GENESIS 001 — Five organs, one held table

**Experimental / DRAFT / HOLD.** This is an **actual standalone Node.js read-only projector** plus an **optional native cold-verification bridge**. It is **not** a five-way native integration, booted operating system, consent engine, software scheduler, or new sovereign authority.

## Why this particular cut?

The existing experimental [CANNON STACK² 018](https://github.com/the-static-collective/CANNON/pull/25) already executes three *original* donor programs in a deliberately bounded ceremony:

1. Original planZ SENSE on two exact public PlanRecords, emitting **unselected** proposals;
2. Original GHoT local \`system.hash\` over the **exact PlanZ result**, not over a proposed effect;
3. Original reLATTE R14 P-256 signed crossing, receiver-signed RECEIVE and R3_HOLD, **without receiver ADMIT**.

CANNON owns exact Git-object verification, independent donor calls, and cold replay. TABLElogic should **consume CANNON's public-inspection artifact after CANNON verifies it**, not re-implement CANNON's Git and crypto checks or interpret the proposals as executable commands.

The *fifth* organ, STATIC OS, owns the eventual habitable runtime. GENESIS 001 provides a **portable, offline, read-only HOUSE JSON projection and browser viewer** designed as a candidate door. It is **not yet a native STATIC OS InstrumentAdapterV0**.

The table draws a circle **around independently owned parts**. The circle does not grant new authority to the parts or to itself.

## Source ancestry / exact scope

| Original owner | Source and role | Limit |
| --- | --- | --- |
| planZ | [SENSE global](https://github.com/the-static-collective/planZ), exact source commit \`e8111fdb64c5587b33aece0fed639ed3d03375ac\` | 2 source records; 2 proposals; \`selection:NONE\` |
| CANNON | [STACK² 018 native verifier](https://github.com/the-static-collective/CANNON/blob/experiment/stack-squared-018-native-floor/docs/STACK-SQUARED-018.md) | Experimental branch, not automatic CANON selection |
| GHoT | [reference_node.py](https://github.com/the-static-collective/GHoT), exact native source commit \`e35dd470384d864b7b0b629a68dad570875a7df0\` | Local \`system.hash\` only; no signed owner ACT |
| reLATTE | [R14 opaque round trip](https://github.com/the-static-collective/reLATTE), exact native source commit \`dcc8cdca84c440aa4294134f020fb7095bf87f24\` | Signed RECEIVE + R3_HOLD; receiver has not admitted any effect |
| STATIC OS | [Instrument Host 001](https://github.com/the-static-collective/static-os/pull/54), experimental \`integration/instrument-host-001\` branch | Reference interface only; TABLElogic is not an installed instrument; no ISO boot |

This implementation **does not fetch or execute donor code itself**. CANNON's own verifier runs only on exact, locally supplied checkouts. TABLElogic calls its fixed CLI in **verify** mode, not **run**, through \`execFileSync\` without shell expansion. The original CANNON source branch must itself be independently selected and exact-SHA pinned for any production-grade trust claim.

## Run the synthetic, offline TABLElogic table

Node 20+; no third-party dependencies.

\`\`\`sh
npm test
node scripts/table.mjs preview fixtures/stack2-018-synthetic-summary.json /tmp/house.json
node scripts/table.mjs verify-view /tmp/house.json
\`\`\`

Open \`public/index.html\` in a browser and select \`/tmp/house.json\` from your device (or press **Show a fictional table**). This browser page performs **no network request and no native signature verification**.

**Critical:** the committed summary fixture deliberately resembles the *shape* of CANNON's public report; its simulated IDs and \`signed_objects_cold_verified: 3\` are NOT actual signatures. TABLElogic's \`preview\` forces \`UNVERIFIED\` regardless of what the input says. The test artifact cannot legitimately serve as a native-run proof.

## If you already have an original CANNON 018 output directory

First follow CANNON's own \`docs/STACK-SQUARED-018.md\` to supply exact donor checkouts and run its source-pinned operation in an isolated environment:

\`\`\`sh
cd /path/to/CANNON
node --experimental-strip-types scripts/stack-squared-018.mjs run \
  examples/stack-squared-018.plan.json \
  examples/branch-loadout-008.plan.json \
  /path/to/roots.json \
  /tmp/cannon-native-018
\`\`\`

Then return to TABLElogic and **cold verify** the original receipts; this never performs another GHoT task or reLATTE signing:

\`\`\`sh
node scripts/table.mjs native-verify \
  /path/to/CANNON \
  /path/to/CANNON/examples/stack-squared-018.plan.json \
  /path/to/CANNON/examples/branch-loadout-008.plan.json \
  /path/to/roots.json \
  /tmp/cannon-native-018 \
  /tmp/house-native-018.json
\`\`\`

The \`roots.json\` mapping must name exact original checkout directories under:

- \`the-static-collective/planZ\`
- \`the-static-collective/CANNON\`
- \`the-static-collective/GHoT\`
- \`the-static-collective/reLATTE\`

If CANNON original verification fails, TABLElogic **fails closed** and does not write its HOUSE file. The generated view marks CANNON as \`NATIVE_COLD_VERIFIED\` **only after that successful invocation**. Re-importing the view elsewhere does not re-prove that claim; the recipient must run the native source verifier again.

## What TABLElogic really proves in Genesis 001

- Deterministic reconstruction of one read-only, five-organ *interpretation* of a redacted original report.
- Explicit separation between unselected planZ proposals, GHoT bounded hash work, reLATTE signed HOLD, and a STATIC OS-shaped display.
- Zero inferred human consent, zero external effect, zero created grants.
- A local view digest and hostile tests that refuse forged \`ADMIT\`, extra effects, source swaps, mutation of interpretation, and auto-authorized plans.
- Create-only local JSON file output. The reader is offline and powerless.

**The local view digest is not a signature.** The browser does not authenticate source evidence or signer identities. The receipt of a native cold verifier is relevant only to the exact input, source checkouts and scope it verified.

## What would make the next crossing real?

**GENESIS 002:** have the owning STATIC OS implementation register an actual \`InstrumentAdapterV0\` whose \`describe / observe / select\` methods expose this **read-only** TABLElogic HOUSE view. Let STATIC OS own session lifecycle, control history, true source-byte binding, independent local admission, and cold re-entry. Do not add \`execute\`, \`approve\`, \`broadcast\`, \`select latest\`, \`merge\`, \`KEEP\`, or \`ACT\` operations to TABLElogic.

Separately test CANNON source-pinned runs with real CI and independent review. Keep proposal-time perception separate from execution-time authority.

**The table does not invite itself. The table does not eat the feast.**
