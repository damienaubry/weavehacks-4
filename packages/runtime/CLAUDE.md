# packages/runtime — inference

OpenAI-compatible client(s) for **OpenAI** and **W&B Inference**, one client, two base URLs.

- **RESOLVED: default is W&B Inference** (`RUNTIME_PROVIDER=wandb`), OpenAI a switchable
  fallback. The one W&B key powers Weave AND inference, so W&B credits fund the agents.
- `providerForRole()` is the **single place** role-based routing goes if we ever split (e.g. a
  stronger model for Critic/Chef, W&B for high-frequency Prep/Reviews). Only split if it maps to
  ROLES — and ask the team first.
- Two paths: `generate()`/`reason()` (raw chat completions, lighter) and `runAgent()`/
  `reasonAgent()` (OpenAI Agents SDK, its own tracing disabled — we trace with Weave).
- **Credits = runtime agents, not tooling.** Never call the LLM in health checks or scaffolding.
  `describeRuntime()` reports config without spending a cent.
