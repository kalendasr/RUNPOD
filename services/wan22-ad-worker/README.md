# wan22-ad-worker

Serverless video ad generation on [RunPod](https://runpod.io) using [Wan 2.2](https://huggingface.co/Wan-AI) (T2V-A14B / I2V-A14B via diffusers).

## Layout

- [`handler.py`](handler.py) — RunPod serverless worker. Loads a Wan 2.2 pipeline once per cold start and generates an MP4 from a text prompt (`WAN_MODE=t2v`) or a text prompt + product image (`WAN_MODE=i2v`).
- [`Dockerfile`](Dockerfile) — builds the worker image.
- [`requirements.txt`](requirements.txt) — worker Python deps (diffusers is installed from the `main` branch, required for Wan 2.2 support).
- [`test_input.json`](test_input.json) — sample job payload for local testing with `python handler.py`.
- [`scripts/generate_ad.py`](scripts/generate_ad.py) — CLI client that submits a job to a deployed endpoint, polls for completion, and saves the resulting MP4.

## Deploying the endpoint

1. Build and push the image (from this directory):
   ```bash
   docker build -t <your-registry>/wan22-ad-worker:latest .
   docker push <your-registry>/wan22-ad-worker:latest
   ```
2. In the RunPod console, create a **Serverless Endpoint** from that image.
   - GPU: T2V-A14B / I2V-A14B need ~60GB+ VRAM headroom for both MoE experts — use an A100 80GB or H100.
   - Container env vars: `WAN_MODE=t2v` (or `i2v` for a separate image-to-video endpoint).
   - Attach a **Network Volume** (100GB+) mounted at `/runpod-volume` and set `HF_HOME=/runpod-volume/huggingface` so model weights (~30GB+) persist across cold starts instead of re-downloading every time.
3. Copy the endpoint ID and your API key into `.env` (see [`.env.example`](.env.example)).

## Generating an ad

```bash
pip install -r scripts/requirements.txt
export RUNPOD_API_KEY=...
export RUNPOD_ENDPOINT_ID=...

# Text-to-video
python scripts/generate_ad.py "A sleek red sports car drifts around a neon-lit city corner at night, cinematic product ad" -o ad.mp4

# Image-to-video (endpoint deployed with WAN_MODE=i2v)
python scripts/generate_ad.py "Product spins slowly on a marble pedestal, soft studio lighting" --image-url https://example.com/product.jpg -o ad.mp4
```

Jobs typically take several minutes per 5s clip depending on GPU and step count. Tune `--num-inference-steps` down for faster/cheaper previews.
