# @deepseek-ai/dsh-client-ui-voice

Voice conversation loop in the composer tool row: mic dictation (browser
Speech Recognition, pt-BR), spoken digests (Speech Synthesis, pt-BR voice),
and a continuous listen-after-speak loop with bounded silence nudges.

## Protocol

The model ends every Super Autônomo response with one `Fala:` line (at most
two sentences: what was accomplished + one follow-up question). The client
reads aloud ONLY that line — never step-by-step, never reasoning. Without a
`Fala:` line the loop stays silent and opens the mic instead.

Loop: turn end → speak digest → mic opens → heard speech is sent as the
next message → next turn. First silence round speaks a nudge with options
(detail, next step, another approach) and listens again; second silence
round stands the loop down instead of spinning forever. Permission denial
speaks the reason once and stops. Everything is free and install-free
(browser-native APIs); ElevenLabs-grade voices and offline Whisper stay
deferred upgrades.

## Composition

Registers one `conversation.input.right` entry (`id: voice`) with an inject
face carrying `sendText`, closed over the client sessions service. No host
behavior (empty node-half apply); no stores; no subscriptions outside the
framework `useSession` hook.

## Model Experience

### What the model sees

Nothing voice-specific reaches model requests except the `Fala:` line it
writes itself per the Super Autônomo persona. Heard transcripts arrive as
ordinary user messages.

#### Token effect

Zero: STT/TTS run entirely in the browser; no audio or extra turns touch
the API beyond the user's own messages.

## Known Limitations and Deferred Work

- No keyless REAL-composition test yet; covered by typecheck, lint, config
  gate, build, and live boot probes.
- No barge-in: speech is cancelled when a turn starts, but talking over an
  unfinished digest restarts listening only after it ends.
- TTS voice follows the pt-BR default, not the resolved UI locale.
- Silence nudges are fixed sentences; model-generated follow-ups would cost
  an extra API turn per silence.
