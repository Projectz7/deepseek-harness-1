# Plano — Evolução do DeepSeek Harness (Básico ? Avançado)

Objetivo: transformar o harness instalado + source em um agente autônomo com catalog de modelos gratuito marcado, skills/hooks/MCP auto e loop sem autorizações, mantendo compatibilidade.

## Etapas

- [x] Etapa 0 — Baixo concluído: plugin `/memory` (`packages/interaction/command-memory`) + `MEMORY.md` auto-lido (`agent-instructions` DEFAULT_INSTRUCTION_FILE_CANDIDATES) + wiring web + fix `tsconfig.host.json`/`Context` — commit 5faa8d77d6 no fork Projectz7/deepseek-harness-1
- [x] Etapa 1 — Baixo pendente: finalizar PR para `deepseek-ai` (renomear/deletar `Projectz7/deepseek-harness` standalone via web) + badge “GRÁTIS” manual (`model-free-overrides` em `settings.yaml` e `LlmModelInfo.free`)
- [x] Etapa 2 — Médio: SKILL.md recursivo (`packages/skill/skill-filesystem` — descobrir `**/SKILL.md`)
- [x] Etapa 3 — Médio: hooks per-session (`packages/hooks/hooks-claude-code` — ler `.claude/settings.json` por sessão, não só global)
- [x] Etapa 4 — Médio: MCP auto-descoberta (`packages/mcp/mcp-auto` — auto-registrar `mcp.json`/`mcp.jsonc` do projeto) — commit d3e5367359 push main
- [x] Etapa 5 — Médio: catálogo free automático (`packages/llm/llm-pi-ai` + `llm-deepseek` — fetch `GET /v1/models` com `ctx.credentials` para Nvidia/DeepSeek/OpenAI, inferir `free` por `pricing==0`, cache + fallback estático + override manual) — commit 92be1f91fc push main
- [x] Etapa 6 — Avançado: loop autônomo real (`packages/core/agent-loop` + `agent-presets` — modo `autonomous` que usa ferramentas/MCP automaticamente, investiga erros passo a passo e continua sem `approval`) — commit 98998966b9 push main
- [x] Etapa 7 — Avançado: LSP/terminal/compaction/observabilidade (melhorias em `tool-str-replace-editor`, `terminal-bash`, `compaction-basic`, `session-telemetry-otel`) — commit a2c9a4de81 push main

Dependências: 1?2?3?4?5?6?7 (cada etapa isola 1-2 arquivos; teste só do pacote afetado).