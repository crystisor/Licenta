# AI Fantasy Card Generator — Thesis Documentation

## 1. Introduction

The present work proposes a self-contained mobile application that
transforms a written prompt into a fully formed fantasy character card.
Given a short description supplied by the user, the system produces a
portrait illustration through a Stable Diffusion XL pipeline, generates an
accompanying title and short flavour text via a vision-language model that
analyses the produced image, derives four numerical attributes — Strength,
Magic, Defense and Agility — together with a creativity score, and finally
assigns a rarity tier based on these values. Optionally, the resulting
portrait may be animated into a short video clip through a Wan 2.2
image-to-video pipeline.

The generative pipeline is embedded in a single-player collectible card
game: each card is persisted in a local gallery, may be deployed against a
campaign of twelve hand-tuned bosses, and successful battles award
generation tokens that the user spends to summon further cards.

The motivation behind the project is twofold. First, from an academic
perspective, the thesis aims to demonstrate that contemporary open-weight
generative models can be deployed and orchestrated outside of commercial
cloud APIs, on locally available hardware, with full preservation of user
privacy and zero per-call cost. Second, from a product perspective, the
project addresses a recurring weakness of generative-AI demonstrations —
namely, that users typically lose interest after a handful of generations.
By framing the AI output as the raw material of a small game with a
collection-and-battle loop, the generative model becomes the engine of a
recurring user activity rather than the destination of a one-shot
interaction.

---

## 2. Core Documentation

### 2.1 Deployment environment

The backend and the entire generative stack are hosted on an **NVIDIA DGX
Spark workstation**, equipped with the **GB10 Blackwell** superchip and
**128 GB of unified CPU–GPU memory**. This unified-memory architecture is
particularly relevant to the project: the image-to-video pipeline alone
requires loading two 14-billion-parameter models, a text encoder and a
variational auto-encoder, which together exceed the VRAM budget of any
consumer-grade GPU. The unified memory pool removes the host-to-device
transfer bottleneck and allows all components of both pipelines to remain
resident simultaneously, eliminating expensive checkpoint reloading between
successive generations.

### 2.2 System architecture

The application is structured as two cooperating tiers communicating over
REST/JSON. The mobile client, implemented in Expo and React Native with
TypeScript, is responsible for user interaction, navigation and persistent
state. The backend, implemented in Python with FastAPI, orchestrates three
underlying services: the ComfyUI runtime — driven programmatically through
the `comfy_script` library — for image and video generation; a local Ollama
instance hosting Qwen2.5-VL 7B for card metadata; and the local file system,
which acts as the canonical storage for all generated artefacts.

The choice of a client–server split is motivated by the inability of any
mobile device to host the underlying models, both in memory and in thermal
budget. The choice of REST polling over WebSockets is motivated by the
asymmetry between the two pipelines: image generation completes within
ten to fifteen seconds and is therefore exposed as a synchronous endpoint,
whereas video generation requires roughly five minutes per clip and is
exposed as a job-queue pattern in which the client polls a status endpoint
identified by a job identifier.

### 2.3 Text-to-image pipeline

The image pipeline is a port of a ComfyUI workflow built around the
**JuggernautXL Ragnarok** Stable Diffusion XL fine-tune. It applies the
**DMD2 four-step LoRA adapter** twice, encodes the prompt and a default
negative prompt through the dual SDXL text encoders, runs eight LCM-scheduled
sampling steps at a low classifier-free guidance scale of 1.4, decodes the
latent through the VAE and finally upscales the result to 2048 × 2048 with
a 4xUltrasharp upscaling model. The eight-step LCM configuration brings
end-to-end image generation down to approximately three seconds, which is a
material requirement for a responsive mobile experience.

### 2.4 Image-to-video pipeline

The video pipeline implements the **Wan 2.2 I2V** model. Wan 2.2 is
distributed as two specialised 14-billion-parameter checkpoints — a
*high-noise* and a *low-noise* model — each trained for one half of the
denoising trajectory. Both are loaded in FP8 quantisation and accelerated
with the dedicated **LightX2V four-step LoRA** adapters. A single video
clip is produced by an 81-frame, 640 × 640 latent path that is sampled in
two sequential `KSamplerAdvanced` passes, the first executed by the
high-noise stack over steps 0 → 2, the second by the low-noise stack over
steps 2 → 4. The decoded frames are encoded into an MP4 file at 16 frames
per second. The unified-memory architecture of the deployment hardware is
essential here, as the two models, the UMT5-XXL text encoder and the
Wan 2.1 VAE all remain resident throughout generation.

### 2.5 Card metadata generation

After image synthesis, the backend submits the generated portrait together
with the original user prompt to a locally hosted **Qwen2.5-VL 7B**
multimodal model, configured to return strict JSON. The model produces a
character title, a short piece of flavour lore that must reference at
least one visual element of the image, four numerical attribute values
inferred from what is visible in the portrait, and a creativity score
inferred from the prompt itself. The use of a vision-language model — as
opposed to a purely textual one — is deliberate, as it allows the card's
narrative and statistics to be grounded in the rendered image rather than
in the prompt alone. The metadata is cached in a JSON sidecar file located
beside the image, ensuring deterministic retrieval and avoiding repeated
inference.

### 2.6 Storage model

A deliberate architectural choice is the use of the backend's `output/`
directory as the canonical card database. Each generated card consists of
a PNG file, a JSON metadata sidecar and, optionally, an MP4 video file,
all sharing a common identifier prefix. The gallery endpoint reconstructs
the user's collection by enumerating the directory at request time. This
arrangement removes the need for a separate database, makes the gallery
trivially backupable through a directory copy, and avoids a class of
synchronisation errors observed in earlier prototypes that relied on the
device's local storage.

### 2.7 Mobile client

The client is built with **Expo Router** in a file-based routing
configuration. Cross-screen state is managed through a single React
context, while battle-specific state is kept locally in the relevant
screens. The card reveal employs a three-revolution flip animation
followed by a scale-in face reveal, transforming the unavoidable
generation latency into a deliberate visual ritual. All screens follow a
unified dark fantasy theme implemented through a centralised theme module.

### 2.8 Game layer

A rarity system computes the sum of the four attributes plus half of the
creativity score, mapping the result to one of five tiers — Common,
Uncommon, Rare, Epic and Legendary — visualised through coloured borders
and badges. The combat engine resolves four simultaneous-attack rounds,
where every attribute contributes every round: Strength provides base
damage, Magic determines critical-hit probability, Defense reduces incoming
damage and Agility provides a flat dodge chance. All combatants share a
fixed health pool, ensuring that rarity advantages translate into more
favourable passive effects rather than into raw numerical superiority. The
campaign mode features twelve hand-tuned boss opponents of progressively
increasing difficulty, whose portraits were pre-generated using the same
text-to-image pipeline and bundled as static assets. A daily limit of three
free generations, complemented by tokens earned through battle, closes the
loop between generation and play.

---

## 3. The contribution of AI tooling

The development of this thesis project benefited from the assistance of an
agentic AI coding tool — specifically **Claude Code**, the command-line
agent released by Anthropic — used throughout as a programming companion.
Its contribution was most significant in three areas: the translation of
the original ComfyUI node graphs into idiomatic Python through the
`comfy_script` runtime, including the dual high-noise / low-noise sampler
configuration of the Wan 2.2 pipeline; the design and refinement of the
prompt template used to elicit strict JSON output from the vision-language
metadata model; and the elaboration of the collectible-card-game balance,
particularly the rarity formula and the per-round combat resolution. The
AI also accelerated the production of supporting infrastructure — REST
client code, TypeScript type definitions, error-handling middleware and
React Native screen scaffolding — that would otherwise have consumed a
disproportionate amount of development time relative to its scientific
content.

The selection of model families, the academic framing, the decision to
embed the generative pipeline within a card game, and all design judgments
were made by the author. Every block of generated code was reviewed and,
where necessary, adapted before being incorporated into the project. The
AI tool was therefore used as an accelerator and as a sounding board for
design alternatives, not as a substitute for the engineering and modelling
decisions that constitute the substance of the thesis.
