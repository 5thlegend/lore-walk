# LORE WALK — by Penta Dank · Next Realm Interactive

> Walk the world. Write its lore.

**LORE WALK** is a tiny phone app that wants you to put it away. Start a walk, pocket your phone, and only pull it out when something stops you — a crooked tree, a doorway, a mural, a rock that looks like it has a name. Snap it. An **open-weight AI model running entirely on your device** reads the place and writes a short piece of world lore about it. That's a **Lore Shard**. End the walk and you get a **Lore Codex**: your shards in order, with an optional route line, exportable as Markdown or an image.

Live: https://lore-walk-nextrealm.dankpenta.workers.dev

Built by **Penta Dank** (General Dank) of Next Realm Interactive for his friend and creative director **Bully** ([@BullyStepHarder](https://instagram.com/BullyStepHarder)), a.k.a. *The Lorekeeper*, to pull his creativity outside and into open AI. Built for the DEV Hacktoberfest Open-Source AI Challenge, Week 1: Touch Grass.

## Open stack (all in the browser)
| Job | Model | Runtime |
|---|---|---|
| Read the place (caption) | `Xenova/vit-gpt2-image-captioning` (q8) | Transformers.js v3, WASM |
| Name the thing (zero-shot tags) | `Xenova/clip-vit-base-patch32` (q8) | Transformers.js v3, WASM |
| Write the lore | `HuggingFaceTB/SmolLM2-360M-Instruct` (default), SmolLM2-135M, or `onnx-community/Qwen2.5-0.5B-Instruct` | WebGPU (q4f16) if available, else WASM (q4) |
| Never break | Seeded template lore generator | plain JS |

- **No backend.** Static files only. Photos never leave the device.
- **Offline after first load:** a service worker caches the app + library; Transformers.js caches model weights in the browser Cache API.
- **Swap model** from the ⚙ Models panel. Every shard records which models produced it.
- Shards live in `localStorage` as downscaled JPEG thumbs.
- Optional on-device geolocation draws an abstract route on the Codex.

## Run locally
```bash
cd dist && python3 -m http.server 8000
```
## Deploy
```bash
npx wrangler deploy        # Workers static assets (wrangler.jsonc)
```

## License
MIT © 2026 Penta Dank / Next Realm Interactive
