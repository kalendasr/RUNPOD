#!/usr/bin/env python3
"""Generate an image via a RunPod Serverless ComfyUI endpoint (worker-comfyui).

Submits serverless-flux-workflow.json to the endpoint, polls until the job
completes, then decodes the returned base64 PNG to a file.

Setup (see docs/comfyui-serverless.md):
  export RUNPOD_API_KEY=...
  export RUNPOD_ENDPOINT_ID=...

Smoke-test the endpoint with the bundled FLUX.1-dev-fp8 model, no LoRA:
  python3 infrastructure/dev/generate_serverless.py --prompt "a red bicycle" --no-lora

Once a LoRA is on the endpoint's network volume (models/loras/):
  python3 infrastructure/dev/generate_serverless.py \
    --prompt "..." --lora my-lora.safetensors --out ./out.png

Stdlib only — no pip install needed.
"""
import argparse
import base64
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

WORKFLOW_PATH = pathlib.Path(__file__).parent / "serverless-flux-workflow.json"
API_BASE = "https://api.runpod.ai/v2"

# Node ids in serverless-flux-workflow.json
CKPT, LORA, POS, NEG, LATENT, SAMPLER = "30", "50", "6", "33", "27", "31"


def post(url, api_key, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def get(url, api_key):
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {api_key}"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def extract_image(output):
    """Pull base64 image data out of the worker's response.

    The docs are inconsistent about the shape: the tutorial's sample response
    shows `output.message`, while its own decode script (and the worker's
    README) use `output.images[0].data`. Handle both rather than bet on one.
    """
    if isinstance(output, dict):
        images = output.get("images")
        if images:
            first = images[0]
            if isinstance(first, dict):
                # S3-configured workers return a URL instead of base64.
                if first.get("type") == "s3_url" or str(first.get("data", "")).startswith("http"):
                    return None, first.get("data")
                return first.get("data"), None
            if isinstance(first, str):
                return first, None
        if output.get("message"):
            return output["message"], None
    raise SystemExit(f"Could not find image data in output: {json.dumps(output)[:500]}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", required=True)
    p.add_argument("--negative", default="")
    p.add_argument("--endpoint", default=os.environ.get("RUNPOD_ENDPOINT_ID"))
    p.add_argument("--api-key", default=os.environ.get("RUNPOD_API_KEY"))
    p.add_argument("--lora", help="filename as it appears in models/loras on the network volume")
    p.add_argument("--no-lora", action="store_true", help="bypass the LoRA node entirely")
    p.add_argument("--strength", type=float, default=1.0)
    p.add_argument("--width", type=int, default=1024)
    p.add_argument("--height", type=int, default=1024)
    p.add_argument("--steps", type=int, default=20)
    p.add_argument("--guidance", type=float, default=3.5)
    p.add_argument("--seed", type=int, default=0, help="0 = random")
    p.add_argument("--out", default="./output.png")
    p.add_argument("--timeout", type=int, default=900, help="seconds to wait (cold starts are slow)")
    args = p.parse_args()

    if not args.endpoint:
        raise SystemExit("Set RUNPOD_ENDPOINT_ID or pass --endpoint")
    if not args.api_key:
        raise SystemExit("Set RUNPOD_API_KEY or pass --api-key")
    if not args.lora and not args.no_lora:
        raise SystemExit("Pass --lora <filename>, or --no-lora to run the base model alone")

    wf = json.loads(WORKFLOW_PATH.read_text())

    wf[POS]["inputs"]["text"] = args.prompt
    wf[NEG]["inputs"]["text"] = args.negative
    wf["35"]["inputs"]["guidance"] = args.guidance
    wf[LATENT]["inputs"]["width"] = args.width
    wf[LATENT]["inputs"]["height"] = args.height
    wf[SAMPLER]["inputs"]["steps"] = args.steps
    wf[SAMPLER]["inputs"]["seed"] = args.seed or int(time.time())

    if args.no_lora:
        # Rewire the graph to read straight from the checkpoint, then drop the
        # LoRA node — leaving it in place with a missing file fails the job.
        wf[POS]["inputs"]["clip"] = [CKPT, 1]
        wf[NEG]["inputs"]["clip"] = [CKPT, 1]
        wf[SAMPLER]["inputs"]["model"] = [CKPT, 0]
        del wf[LORA]
    else:
        wf[LORA]["inputs"]["lora_name"] = args.lora
        wf[LORA]["inputs"]["strength_model"] = args.strength
        wf[LORA]["inputs"]["strength_clip"] = args.strength

    base = f"{API_BASE}/{args.endpoint}"
    try:
        job = post(f"{base}/run", args.api_key, {"input": {"workflow": wf}})
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Submit failed ({e.code}): {e.read().decode()[:500]}")

    job_id = job.get("id")
    if not job_id:
        raise SystemExit(f"No job id in response: {job}")
    print(f"Queued job {job_id} (status: {job.get('status')})")

    deadline = time.time() + args.timeout
    last_status = None
    while time.time() < deadline:
        time.sleep(3)
        res = get(f"{base}/status/{job_id}", args.api_key)
        status = res.get("status")
        if status != last_status:
            print(f"  {status}")
            last_status = status
        if status == "COMPLETED":
            break
        if status in ("FAILED", "CANCELLED", "TIMED_OUT"):
            raise SystemExit(f"Job {status}: {json.dumps(res.get('output'))[:1000]}")
    else:
        raise SystemExit(f"Timed out after {args.timeout}s. Job {job_id} may still finish; "
                         f"check {base}/status/{job_id}")

    b64, url = extract_image(res.get("output"))
    if url:
        print(f"Worker returned an S3 URL rather than base64:\n{url}")
        return

    if "," in b64:
        b64 = b64.split(",", 1)[1]
    pathlib.Path(args.out).write_bytes(base64.b64decode(b64))

    delay, exec_ms = res.get("delayTime"), res.get("executionTime")
    print(f"Saved {args.out}  (queue {delay}ms, generate {exec_ms}ms)")


if __name__ == "__main__":
    sys.exit(main())
