# rea — ZCode plugin for REA (Reverse Engineer Anything)

Packages [morluto/rea](https://github.com/morluto/rea) (npm: `rea-agents`,
MIT) as a ZCode plugin:

- **MCP server**: starts REA's stdio MCP server on demand with
  `cmd /c npx -y rea-agents mcp` (Windows-friendly; see below for Linux/macOS).
- **Skill** (`skills/rea`): compact workflow guidance — target routing,
  summary-first evidence handling, recovery for this wiring, and honest
  reporting rules. The authoritative tool catalog is always the live
  `tools/list` from the running server (~229 tools in current releases:
  `open_binary`, `analyze_javascript_application`, `analyze_function`,
  `inspect_apk_signature`, `trace_application_feature`, …).

## Prerequisites

- Node.js 22.x (>= 22.23.4), 24.x (>= 24.22.1) or 26.12.1+ and npm on PATH.
  REA does not install Node.
- The first server start downloads the package via npx (slow first launch).
- Optional deep-native engines: an existing Ghidra 12.x + JDK, Hopper,
  IDA or Kuna installation. Not required for static JS/Electron, .NET,
  package and artifact inspection.
- Platform: REA fully supports Linux/macOS; on Windows only the experimental
  Ghidra P0 provider is supported (no Hopper). Static analysis routes work.

## Configuration

`.mcp.json` in the plugin root:

```json
{
  "mcpServers": {
    "rea": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "rea-agents", "mcp"]
    }
  }
}
```

On Linux/macOS replace the command with `"command": "npx"`,
`"args": ["-y", "rea-agents", "mcp"]`. To pin a version, use
`rea-agents@<version>` in place of `rea-agents`.

Useful environment variables (add an `env` object to the server entry):

| Variable | Purpose |
| --- | --- |
| `REA_MCP_INPUT_SCHEMA_PROFILE` | `full` for complete input schemas (default compact) |
| `REA_MCP_OUTPUT_SCHEMA_PROFILE` | `compact` / `off` to bound the tools/list frame |
| `REA_MCP_TOOL_FAMILIES` | restrict advertised tool families |
| `REA_MCP_MAX_RESPONSE_BYTES` | cap per-response size |
| `REA_GHIDRA_STARTUP_TIMEOUT_MS` | Ghidra startup deadline (default 330000) |
| `REA_HOPPER_STARTUP_TIMEOUT_MS` | Hopper startup deadline (default 120000) |
| `GHIDRA_INSTALL_DIR` / `JAVA_HOME` / `HOPPER_LAUNCHER_PATH` | engine locations |

Diagnostics: `rea doctor` (or `npx -y rea-agents doctor --json`).

## Attribution

REA is [morluto/rea](https://github.com/morluto/rea), MIT licensed. This
plugin only packages its MCP launch configuration and an adapted workflow
skill; REA's own skill and docs remain authoritative.
