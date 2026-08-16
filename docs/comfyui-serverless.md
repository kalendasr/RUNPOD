# ComfyUI on RunPod Serverless (FLUX + LoRA)

> Image generation via `runpod/worker-comfyui`, a prebuilt Serverless worker.

## 1. Principle

Use RunPod's maintained worker image rather than installing ComfyUI from
source on a pod. The image ships ComfyUI with a matched torch/CUDA stack and
FLUX.1-dev-fp8 baked in — no model download, no dependency resolution, and no
idle cost between generations.

An earlier attempt built ComfyUI from source on a bare `runpod/pytorch` pod.
It failed on four successive dependency problems (deprecated `huggingface-cli`,
torch too old for `torch.library.custom_op`, container restarts wiping
`pip install`s outside `/workspace`, and finally `comfy-kitchen` requiring a
torch newer than the cu121 wheel index carries). None of that exists here.

## 2. Layout

| File | Role |
|---|---|
| [`infrastructure/dev/serverless-flux-workflow.json`](../infrastructure/dev/serverless-flux-workflow.json) | ComfyUI API-format graph: FLUX.1-dev-fp8 + `LoraLoader` |
| [`infrastructure/dev/generate_serverless.py`](../infrastructure/dev/generate_serverless.py) | Submits a job, polls `/status`, decodes the PNG. Stdlib only |

The fp8 build is an **all-in-one checkpoint**, so the graph uses
`CheckpointLoaderSimple` + `LoraLoader` (model *and* clip), not the separate
`UNETLoader`/`DualCLIPLoader`/`VAELoader` + `LoraLoaderModelOnly` wiring that
a full-precision FLUX setup needs.

## 3. Endpoint

Deploy from the [Hub listing](https://console.runpod.io/hub/runpod-workers/worker-comfyui):
**Deploy → Next → Create Endpoint**. Note the Endpoint ID.

To configure beyond what the Hub allows, deploy the image directly as a
Serverless endpoint instead — `runpod/worker-comfyui:<version>-flux1-dev`
(`5.8.6` as of writing; other variants: `-base`, `-flux1-schnell`, `-sdxl`,
`-sd3`).

```bash
export RUNPOD_API_KEY=...
export RUNPOD_ENDPOINT_ID=...

# Base model only — no network volume required. Good first smoke test.
python3 infrastructure/dev/generate_serverless.py --prompt "a red bicycle" --no-lora
```

`--no-lora` rewires the graph to read straight from the checkpoint and drops
the `LoraLoader` node. Leaving that node in with a missing file fails the job.

## 4. LoRAs via network volume

The worker auto-detects models placed in the standard directories on an
attached network volume — no path configuration.

1. **Create the volume**: console → Storage → New Network Volume. Pick a
   datacenter that supports the S3 API (EU: CZ-1, RO-1, IS-1, NO-1; US: CA-2,
   GA-2, IL-1, KS-2, MD-1, MO-1, MO-2, NC-1, NC-2, NE-1, WA-1). Note its ID.
2. **Create S3 credentials**: console → Settings → S3 API Keys. These are
   *separate* from `RUNPOD_API_KEY`; the secret is shown only once.
3. **Upload** to `models/loras/` inside the volume:
   ```bash
   export AWS_ACCESS_KEY_ID=user_...
   export AWS_SECRET_ACCESS_KEY=rps_...
   aws s3 cp your-lora.safetensors \
     --region <DATACENTER> \
     --endpoint-url https://s3api-<DATACENTER>.runpod.io/ \
     s3://<NETWORK_VOLUME_ID>/models/loras/
   ```
4. **Attach**: endpoint → Manage → Edit Endpoint → Advanced → Network Volumes.
   Works on an already-created endpoint.
5. **Generate**:
   ```bash
   python3 infrastructure/dev/generate_serverless.py \
     --prompt "..." --lora your-lora.safetensors --strength 0.8
   ```

Mount points differ by product: **`/runpod-volume`** for Serverless workers,
**`/workspace`** for Pods (where it also *replaces* the default volume disk,
and can only be attached at deploy time).

## 5. Gotchas

- **Attaching a volume pins workers to its datacenter**, which can reduce GPU
  availability. Attaching volumes from several datacenters improves failover,
  but they do not sync — copy data to each yourself.
- **Response shape is inconsistent in the docs**: the tutorial's sample shows
  the image at `output.message`, its own decode script uses
  `output.images[0].data`. `generate_serverless.py` handles both, plus the
  S3-URL form a worker returns when S3 upload is configured.
- **Results expire after 30 minutes** on the `/status` endpoint.
- **LoRA base model must match.** These are FLUX.1-dev LoRAs (Civitai base
  model `Flux.1 D`). SD1.5/SDXL/SD3 LoRAs will not load; FLUX.1-schnell LoRAs
  load but behave poorly under dev's sampler settings.
- **Cold starts** pull the image before the first job. Expect the first
  request to be much slower than subsequent ones.
