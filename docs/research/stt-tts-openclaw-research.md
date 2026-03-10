# Research: Realtime STT/TTS Systems with OpenClaw

**Task:** #330 [RESEARCH] Realtime STT/TTS systems with OpenClaw  
**Date:** 2026-03-05  
**Status:** Complete

---

## Executive Summary

OpenClaw has a mature voice ecosystem with multiple integration paths. The key finding is that **voice in OpenClaw is three separate features** that work together:

1. **STT (Speech-to-Text)** - Inbound voice → text
2. **TTS (Text-to-Speech)** - Outbound text → voice  
3. **Talk Mode** - Live bidirectional conversation via nodes

---

## Speech-to-Text (STT) Options

### Local STT (Privacy-Focused, No API Costs)

| Option | Latency | Quality | Hardware | Notes |
|--------|---------|---------|----------|-------|
| **faster-whisper** | ~200-500ms | Excellent | CPU/GPU | OpenClaw Voice default, runs locally |
| **Whisper (OpenAI CLI)** | ~300-800ms | Excellent | CPU/GPU | Local fallback, multiple model sizes |
| **RealtimeSTT (Python)** | ~100-300ms | Good | CPU/GPU | Advanced VAD, wake word detection |
| **Kokoro STT** | ~200ms | Good | CPU | Lightweight, 82M params |

### Cloud STT (Lower Latency, Higher Quality)

| Option | Latency | Cost | Quality | Notes |
|--------|---------|------|---------|-------|
| **OpenAI Whisper API** | ~500ms | $0.006/min | Excellent | Easy integration, widely used |
| **Deepgram Nova-3** | **<300ms** | $0.0043/min | Excellent | Ultra-low latency, streaming |
| **AssemblyAI** | ~300ms | $0.0004/min | Good | Good accuracy, streaming |
| **Google Speech-to-Text** | ~300-500ms | $0.006/min | Excellent | Enterprise-grade |
| **Gladia** | ~200ms | Variable | Excellent | Optimized for real-time |

### Recommended STT Config for OpenClaw

```json
{
  "tools": {
    "media": {
      "audio": {
        "enabled": true,
        "maxBytes": 20971520,
        "models": [
          { "provider": "openai", "model": "gpt-4o-mini-transcribe" },
          {
            "type": "cli",
            "command": "whisper",
            "args": ["--model", "base", "{{MediaPath}}"],
            "timeoutSeconds": 45
          }
        ]
      }
    }
  }
}
```

**Pattern:** Cloud provider first (speed + reliability), local CLI fallback (outage protection).

---

## Text-to-Speech (TTS) Options

### Local TTS (Free, Private)

| Option | Latency | Quality | Hardware | Notes |
|--------|---------|---------|----------|-------|
| **Chatterbox-TTS** | ~200ms | Good (cloning) | GPU | Voice cloning matches ElevenLabs |
| **Kokoro-82M** | **~50ms** | Good | CPU/GPU | 96× real-time, lightweight |
| **Edge TTS** | ~300ms | Decent | Cloud (free) | Microsoft Edge voices, free |
| **Piper** | ~100ms | Decent | CPU | Fast, multiple voices |
| **Coqui TTS** | ~200ms | Good | GPU | Open source, customizable |

### Cloud TTS (Premium Quality)

| Option | TTFA* | Cost | Quality | Notes |
|--------|-------|------|---------|-------|
| **Cartesia Sonic Turbo** | **~40ms** | $0.02/min | Excellent | Fastest on market |
| **Cartesia Sonic** | ~90ms | $0.02/min | Excellent | Ultra-low latency |
| **ElevenLabs** | ~150ms | $0.18-0.30/min | **Best** | Most natural, emotional |
| **OpenAI TTS** | ~200ms | $0.015/min | Good | Reliable, affordable |
| **Deepgram Aura** | ~200ms | $0.0125/min | Good | Fast, affordable |

*TTFA = Time to First Audio (lower is better)

### Recommended TTS by Use Case

| Use Case | Recommended | Why |
|----------|-------------|-----|
| **Real-time conversation** | Cartesia Sonic | 40-90ms latency, natural |
| **Audiobook/content** | ElevenLabs | Best quality, emotional range |
| **Budget-conscious** | OpenAI TTS + Kokoro fallback | Affordable + free local |
| **Privacy-first** | Kokoro + Chatterbox | Fully local, no cloud |
| **Voice cloning** | Chatterbox-TTS | Local, matches ElevenLabs quality |

---

## OpenClaw Voice Integrations

### 1. OpenClaw Voice (Official)

**Website:** https://openclawvoice.com/

**Features:**
- Self-hosted, private, open source
- Local Whisper via faster-whisper
- ElevenLabs or Chatterbox TTS
- WebSocket streaming for real-time
- Works in any browser (desktop + mobile)
- Connects to any AI (OpenAI, Claude, custom)

**Tech Stack:** Python, FastAPI, faster-whisper, ElevenLabs, WebSockets

### 2. Jupiter Voice (Community)

**Source:** GitHub Discussion #12891

**Features:**
- Fully local (Mac optimized)
- Wake word detection
- Apple Silicon MLX optimization (10x faster Whisper)
- Modular config (swap STT/TTS/models)

### 3. OpenClaw Voice Assistant Skill

**Registry:** `openclaw-voice-assistant`

**Features:**
- Local faster-whisper transcription
- WebSocket to OpenClaw gateway
- ElevenLabs TTS streaming
- Automatic follow-up detection
- Mic suppression during playback

### 4. ElevenLabs TTS Skill

**Registry:** `elevenlabs-tts`

**Features:**
- Best ElevenLabs integration for OpenClaw
- Voice selection, streaming
- Multiple output formats

### 5. Speak Skill

**Registry:** `speak`

**Features:**
- Adapts TTS to user preferences
- Learns from spoken feedback
- Persona-based voice settings

---

## OpenClaw Skills Registry: Speech & Transcription

The awesome-openclaw-skills repo lists **45 skills** in the Speech & Transcription category:

| Skill | Purpose |
|-------|---------|
| `elevenlabs-tts` | ElevenLabs TTS integration |
| `elevenlabs-transcribe` | ElevenLabs STT |
| `elevenlabs-agents` | Voice agent deployment |
| `eachlabs-voice-audio` | TTS, STT, voice conversion |
| `duby` | Duby.so TTS API |
| `openclaw-voice-assistant` | Full voice pipeline |
| `speak` | User preference TTS |

---

## Latency Comparison: Full Pipeline

| Setup | STT Latency | LLM Latency | TTS Latency | **Total** |
|-------|-------------|-------------|-------------|-----------|
| **Cloud Optimized** | Deepgram 200ms | Claude 500ms | Cartesia 90ms | **~790ms** |
| **Balanced** | OpenAI Whisper 500ms | GPT-4 800ms | ElevenLabs 150ms | **~1450ms** |
| **Fully Local** | faster-whisper 400ms | Local LLM 300ms | Kokoro 100ms | **~800ms** |
| **Budget** | OpenAI Whisper 500ms | GPT-4o-mini 400ms | OpenAI TTS 200ms | **~1100ms** |

**Target for conversational:** <1000ms end-to-end

---

## Recommended Configurations

### 1. Premium Real-Time (Best Experience)

```json
{
  "tools": { "media": { "audio": {
    "models": [{ "provider": "deepgram", "model": "nova-3" }]
  }}},
  "messages": { "tts": {
    "mode": "inbound",
    "provider": "cartesia",
    "model": "sonic-turbo",
    "voice": "default"
  }}
}
```

**Cost:** ~$0.025/min combined  
**Latency:** ~700-900ms total

### 2. Privacy-First (Fully Local)

```json
{
  "tools": { "media": { "audio": {
    "models": [{ "type": "cli", "command": "whisper", "args": ["--model", "small", "{{MediaPath}}"] }]
  }}},
  "messages": { "tts": {
    "mode": "inbound",
    "provider": "kokoro",
    "local": true
  }}
}
```

**Cost:** $0 (hardware only)  
**Latency:** ~800-1000ms total

### 3. Balanced (Good + Affordable)

```json
{
  "tools": { "media": { "audio": {
    "models": [
      { "provider": "openai", "model": "gpt-4o-mini-transcribe" },
      { "type": "cli", "command": "whisper", "args": ["--model", "base", "{{MediaPath}}"] }
    ]
  }}},
  "messages": { "tts": {
    "mode": "inbound",
    "provider": "openai",
    "model": "tts-1"
  }}
}
```

**Cost:** ~$0.02/min combined  
**Latency:** ~1100ms total

---

## Community Recommendations

From OpenClaw Discord and GitHub discussions:

### Most Recommended STT
1. **faster-whisper (local)** - "Fast, accurate, private"
2. **Deepgram Nova-3 (cloud)** - "Sub-300ms, incredible for real-time"
3. **OpenAI Whisper API** - "Reliable fallback, easy setup"

### Most Recommended TTS
1. **ElevenLabs** - "Best quality, worth the cost for content"
2. **Cartesia Sonic** - "Fastest for real-time conversation"
3. **Kokoro (local)** - "Best free option, surprisingly good"

### Common Patterns
- **Hybrid approach:** Cloud STT + local TTS (or vice versa)
- **Fallback chains:** Provider first, CLI backup
- **Scope limiting:** Only allow voice in DMs to control costs
- **Wake word:** Jupiter Voice pattern for hands-free

---

## Key Insights

1. **Separate the three features** - TTS, STT, and Talk Mode are different config areas
2. **Latency matters most for conversation** - Target <1s total pipeline
3. **Cartesia is fastest for TTS** - 40-90ms TTFA vs 150ms for ElevenLabs
4. **Deepgram is fastest for STT** - Sub-300ms streaming
5. **Local Whisper is viable** - faster-whisper on GPU is ~200-400ms
6. **Kokoro is the best free TTS** - 82M params, 96× real-time
7. **OpenClaw Voice is production-ready** - Self-hosted, WebSocket streaming

---

## Next Steps

1. **Try OpenClaw Voice** - Self-hosted solution at openclawvoice.com
2. **Install skills:** `npx clawhub@latest install elevenlabs-tts`
3. **Configure TTS mode** - Start with `inbound` (only speaks when you send voice)
4. **Add fallback chain** - Provider + CLI for reliability
5. **Scope to DMs** - Prevent cost overruns from group chats

---

## Resources

- **OpenClaw Voice:** https://openclawvoice.com/
- **OpenClaw TTS Docs:** https://docs.openclaw.ai/tts
- **OpenClaw Audio Docs:** https://docs.openclaw.ai/tools/media/audio
- **Awesome OpenClaw Skills:** https://github.com/VoltAgent/awesome-openclaw-skills
- **LumaDock Voice Tutorial:** https://lumadock.com/tutorials/openclaw-voice-tts-stt-talk-mode
- **RealtimeSTT:** https://github.com/KoljaB/RealtimeSTT
- **Cartesia:** https://cartesia.ai/
- **Deepgram:** https://deepgram.com/
- **Kokoro:** https://github.com/hexgrad/kokoro
