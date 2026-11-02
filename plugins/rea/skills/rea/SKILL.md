---
name: rea
description: >
  Reverse engineer native binaries, JavaScript/Electron apps, .NET assemblies,
  packaged apps (APK/IPA/MSIX/PyInstaller), firmware, model files, captures and
  more with the REA MCP server wired in by this plugin. Use when a claim depends
  on a shipped binary or package, decompilation, requested runtime evidence, or
  comparison with behavior not established by available source. Skip REA for
  ordinary analysis of a complete source repository.
---

# REA — Reverse Engineer Anything

This plugin starts REA's MCP server (`npx rea-agents mcp`, npm package
`rea-agents` from [morluto/rea](https://github.com/morluto/rea)). REA exposes
its reverse-engineering tools directly over MCP; the authoritative catalog is
the connected server's own `tools/list` — it can list tools this skill does not
name, and a tool named here can be absent from an older or newer release.
Always use the live tool list and input schemas.

## Prerequisites and first launch

- REA requires Node.js 22.x (>= 22.23.4), 24.x (>= 24.22.1) or 26.12.1+, plus
  npm, on the machine where ZCode runs. REA setup never installs Node itself.
- The MCP server is launched on demand via `npx`. The **first** launch
  downloads the package and can take a while — if the first tool call stalls,
  it is usually the download, not a hang. Wait for it; do not repeat the call.
- On Windows the server is started through `cmd /c npx …` (see `.mcp.json`).
  On Linux/macOS, change the command to `npx` with args
  `["-y", "rea-agents", "mcp"]`.
- Platform scope: REA fully supports Linux and macOS. On Windows, native deep
  analysis via Ghidra is experimental (P0); Hopper is unavailable. Static
  JavaScript/Electron, .NET, package, and artifact inspection need no engine
  and are the safest routes on Windows.

## Route the target first

Choose the first tool from the target the user supplied. Use `open_binary` for
active-target native or archive workflows; target-free tools take their own
explicit path.

- ASAR or extracted JavaScript/Electron tree: `analyze_javascript_application`.
- Archive/package inventory (ZIP/APK/IPA/MSIX/AppX, DMG, PyInstaller):
  `open_binary`, optionally `inspect_artifact`. Start with
  `detail: "summary"` for large inventories.
- Android APK: `inspect_android_package`; signing details via
  `inspect_apk_signature`.
- Managed PE/CLI assembly: `inspect_managed_artifact`.
- Native binary behavior and decompilation: `open_binary`, then
  `list_procedures` / `search_procedures` / `list_strings` /
  `analyze_function` / `get_call_graph` / `trace_call_path` /
  `batch_decompile`. Deep native analysis needs an installed Ghidra, Hopper,
  IDA or Kuna; set `GHIDRA_INSTALL_DIR` / `JAVA_HOME` /
  `HOPPER_LAUNCHER_PATH` where REA starts. Startup deadlines:
  `REA_GHIDRA_STARTUP_TIMEOUT_MS` (default 330000),
  `REA_HOPPER_STARTUP_TIMEOUT_MS` (default 120000).
- Feature question across a big app: `trace_application_feature` once a seed
  is known.
- Model files (GGUF/safetensors): `inspect_model_artifact`. EVM bytecode:
  `inspect_evm_interface`. Go/Rust metadata: `inspect_go_binary` /
  `inspect_rust_binary`. PE certificates/imports/load config:
  `inspect_pe_certificates` / `inspect_pe_imports` / `inspect_pe_load_config`.
  WASM: `inspect_wasm_artifact`. Recorded HAR/SAZ/qlog traffic:
  `inspect_web_network_capture`.

If the user says only "my app" without a name, path, or already-selected
target, ask which target before searching for artifacts. Never choose an
example app on the user's behalf.

## Work summary-first

- Start with the default result and its inline Evidence and graph context.
  For large unknown targets, request `detail: "summary"` first, then page the
  retained evidence with `inspect_analysis_view` using the returned
  `parent_evidence_id`.
- `analyze_function` returns a summary by default; the complete dossier stays
  retained for facet paging.
- If MCP reports `resource_constraint` with `details.resource: "transport"`,
  do not repeat the producer call. Use `inspect_analysis_view` on the
  reported same-session Evidence reference for a smaller view, or write the
  session out with `export_evidence_bundle`.
- A client can truncate a successful result without a REA transport error:
  treat that preview as incomplete, and do not parse it as canonical JSON.
- Do not repeat an identical analysis or rejected call without a changed
  input or a resolved blocker.

## Connection and recovery (this plugin's wiring)

- Tools absent from the session usually mean the MCP server did not start.
  Ask the user to restart ZCode (or reload the MCP connection) once, then
  re-check. If REA still cannot start, run `rea doctor` (or
  `npx -y rea-agents doctor --json`) in a terminal and read its report.
- Most common cause here: Node.js missing or too old. Check `node --version`
  against the requirement above; REA does not install Node.
- Schema overhead knobs (set in the plugin's `.mcp.json` `env` if needed):
  `REA_MCP_INPUT_SCHEMA_PROFILE=full` (complete input schemas instead of
  compact), `REA_MCP_OUTPUT_SCHEMA_PROFILE=off` (omit output schemas if the
  client caps the tools/list frame), `REA_MCP_TOOL_FAMILIES` (restrict
  advertised families), `REA_MCP_MAX_RESPONSE_BYTES`.
- CLI fallback that needs no MCP registration: `npx -y rea-agents
  analyze-javascript-application /absolute/path/to/app --json`. It returns
  the Evidence record directly; read it with the same care as an MCP result.

## Report evidence honestly

Every conclusion must distinguish observations, inferences, and unknowns.
Cite Evidence IDs, preserve returned limitations and incomplete coverage, and
never imply that static analysis observed execution. Runtime requests execute
the declared target and lifecycle — do not broaden the target or action
beyond what the user asked for.

## Lawful use

Use REA only for research, education, interoperability, and analysis of
software you own or are authorized to examine.
