---
title: "LORE WALK: I built an app that wants you to put it away"
published: false
tags: devchallenge, hf26challenge, opensource, ai
cover_image: https://lore-walk-nextrealm.dankpenta.workers.dev/og.png
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)*

## What I Built

I run Next Realm Interactive. My friend and creative director, Bully ([@BullyStepHarder](https://instagram.com/BullyStepHarder)), is the guy on our team who holds the tablet. I see the blueprint; he translates it into something people can actually see. We call him the Lorekeeper, half as a joke. But most of his lore gets made indoors, under a ceiling, staring at a screen.

So I built him something that argues with that, and gets him curious about what open AI can do in his hands.

**LORE WALK** is a phone app whose main instruction is *put me away*. You tap **Start a walk**, and the screen tells you exactly one thing: *find something worth remembering.* Then you go. When something stops you, like a tree with a split trunk, a door painted a color nobody would choose, or a rock that looks like it's been waiting, you pull the phone out for about ten seconds and take one photo.

A small open-weight model running **on the phone** reads the photo. A second small model takes what it saw and writes a title and a few sentences of lore, treating the place as a location in some old world. Mythic, but tied to what's actually there. That's a **Lore Shard**. Then the phone goes back in your pocket.

When you end the walk, you get the **Lore Codex**: every shard in the order you found it, with an optional little route line if you turned on location. You can export it as Markdown or as one tall image to share.

The screen should be the shortest part of the walk. That was the whole design brief.

## Demo

**Live:** https://lore-walk-nextrealm.dankpenta.workers.dev (open it on your phone; it installs as a PWA)

[FILL IN: screenshots / short screen recording from a real walk]

## Code

{% github 5thlegend/lore-walk %}

MIT licensed. It's plain HTML, CSS, and one JS module. No build step and no backend.

## How I Built It

The whole app is static files. All the intelligence runs in the browser through **[Transformers.js v3](https://huggingface.co/docs/transformers.js)**, which uses **WebGPU** when the phone supports it and falls back to **WASM** on the CPU when it doesn't.

The pipeline for each shard:

1. **Downscale on device.** The photo goes through a canvas and comes out at 512px for the models and 480px as a JPEG thumbnail. The original never gets uploaded anywhere, because there's nowhere to upload it to.
2. **Read the place.** `Xenova/vit-gpt2-image-captioning` (8-bit quantized) gives a plain caption, something like "a large tree in a grassy field."
3. **Name the thing.** `Xenova/clip-vit-base-patch32` does zero-shot classification against a short list of things worth stopping for (tree, doorway, mural, rock, bridge, stairs, gate…). That gives the lore writer a noun to hold onto.
4. **Write the lore.** `HuggingFaceTB/SmolLM2-360M-Instruct` gets the caption and tags with a tight prompt: a 2–5 word place name, then three sentences of lore, in a fixed `TITLE:` / `LORE:` format that I parse and trim.
5. **Never break.** If a model fails to load, the phone runs out of memory, or the small model rambles past the format, a seeded template generator builds the shard from the same caption and tags. On a trail, the demo can't be the thing that breaks.

Every shard records which models actually produced it, and the Codex shows that. The ⚙ panel lets you **swap models**: SmolLM2-135M for older phones, Qwen2.5-0.5B-Instruct if you've got the headroom, or template-only for zero download.

For offline use, a service worker caches the app shell and the library, and Transformers.js keeps the model weights in the browser's Cache API. Load it once on Wi-Fi at home and the walk itself needs no signal. Shards live in `localStorage` as small thumbnails.

The look comes from our studio: violet-black, galaxy purple, burning gold, fire orange, and white used sparingly. Big condensed type, like the spine of a tome. There's a maple leaf hidden in there too.

## Why Does Open Innovation Matter?

Because of where this app is meant to be used: outside, where the signal is bad.

- **Offline on a trail.** A closed API needs a round trip to a datacenter for every photo. Here the model is a file sitting on my phone. Signal bar or no signal bar, it writes.
- **The data stays on the device.** I'm asking people to photograph their neighborhood, their walk home, the tree outside their kid's school. Those photos shouldn't be training data for anyone. With local inference, privacy isn't a promise in a policy. The photos physically never leave.
- **Swap the model.** Open weights mean the app isn't married to one vendor. When a better small vision model ships next month, changing it is one line.
- **Zero cost.** No API key, no per-request bill, no free tier that runs out. It costs nothing to run whether ten people use it or ten thousand.
- **Where open beat closed.** A giant closed model would write prettier sentences. But it would also need a connection, a key, a budget, and trust, and it would make the phone a pipe to somewhere else. The small open models are a little rougher, and honestly that roughness reads like found folklore. For an app whose job is to get you off the screen, small, local, and free beats big and remote.

## I Took It Outside

[FILL IN: the real walk (Bully's and/or yours): where you went, what you photographed, the shard that surprised you, what the models got wrong, photos of the Codex. Don't publish until this is real.]
