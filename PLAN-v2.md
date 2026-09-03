# Plano — Evolução do DeepSeek Harness v2 (Chat ? Desktop ? Browser)

Objetivo v2: chat com upload, tela compartilhada por aba (estilo chamada de vídeo, dual-monitor) e browser autônomo que navega com credenciais, lê console e vasculha código quando segurança permitir.

## Etapas concluídas (v1)

- [x] Etapa 0–7: base autônoma completa (memory, free, skill, hooks, mcp-auto, catalog free auto, autonomous, advanced) — commits até a2c9a4de81

## Etapas v2 — próximas

- [x] Etapa 8 — Chat: Adicionar arquivos/fotos via chat (Ctrl+U) — `host/apiproxy` + `client/ui-composer`: drag-drop/upload ? `attachment` + `tool_result` imagem; respeita `ctx.attachments` e `model.inputModalities`
- [x] Etapa 9 — Tela: Compartilhar aba/tela em tempo real — `packages/screen/screen-capture` + `packages/screen/tool-screen` (`view`/`screenshot` com região, `pollIntervalMs`), picker estilo vídeo-chamada (lista abas/janelas via `chrome.desktopCapture`/`getDisplayMedia`), streaming para modelo via `tool_result` imagem; dual-monitor: usuário trabalha em uma, IA observa a outra
- [x] Etapa 10 — Desktop: Assumir teclado/mouse — `packages/desktop/tool-desktop-control` (`click`, `type`, `scroll`, `shortcut`) via `nut.js`/`win32 SendInput`; gated por `sandbox.mode=disabled` + `auto-approve` + audit `approval/asked`; precisa consentimento explícito por sessão
- [x] Etapa 11 — Browser: Navegar com credenciais em aba selecionada — `packages/browser/browser` + `packages/browser/tool-browser` (Playwright CDP attach em aba já aberta ou nova): `navigate`, `click`, `fill`, `snapshot` (AX tree), `console` (logs), `evaluate`, `source` (vasculhar código quando liberado/frágil); credenciais via `credentials` seam, sem logar senha; suporta console, network, DOM e view-source

Dependências: 8?9?10?11 (8 isola host/client, 9 isola screen, 10 isola desktop, 11 isola browser+Playwright; cada etapa max 2 arquivos por micro-tarefa, teste do pacote afetado + `tsc -b`)

## Fluxo aba selecionável (como vídeo-chamada)

1. Usuário clica `Compartilhar aba` no chat ? picker nativo lista abas/janelas ? escolhe site explorer (já logado ou para logar)
2. DSH anexa via CDP à aba (`browser-cdp` ou extensão helper) — não cria profile novo, reusa cookies/sessão
3. IA recebe `tool-screen` snapshots + `tool-browser` `snapshot`/`console` + pode `click`/`type`/`evaluate` na aba alvo; segunda tela livre para usuário
4. Se `securityPolicy` liberada/frágil, `source`/`evaluate` permite `document.documentElement.outerHTML`, `fetch` interno e inspeção de `window` — auditado em `session/event`

Segurança: credenciais nunca em `session/log`; `screen` e `desktop` exigem consentimento por sessão; browser roda em contexto isolado quando `sandbox` ativo.