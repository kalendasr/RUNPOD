#!/usr/bin/env python3
"""Generate images via a RunPod Serverless ComfyUI endpoint (worker-comfyui).

Submits serverless-flux-workflow.json to the endpoint, polls until each job
completes, then decodes the returned base64 PNG to a file.

Setup (see docs/comfyui-serverless.md):
  export RUNPOD_API_KEY=...
  export RUNPOD_ENDPOINT_ID=...

Smoke-test the endpoint with the bundled FLUX.1-dev-fp8 model, no LoRA:
  python3 infrastructure/dev/generate_serverless.py --prompt "a red bicycle" --no-lora

Once a LoRA is on the endpoint's network volume (models/loras/):
  python3 infrastructure/dev/generate_serverless.py \
    --prompt "..." --lora my-lora.safetensors --out ./out.png

Batch — one prompt per line, blanks and #-comments ignored:
  python3 infrastructure/dev/generate_serverless.py \
    --prompts-file prompts.txt --outdir ./renders --concurrency 3 --no-lora

Stdlib only — no pip install needed.
"""
import argparse
import base64
import json
import os
import pathlib
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

WORKFLOW_PATH = pathlib.Path(__file__).parent / "serverless-flux-workflow.json"
API_BASE = "https://api.runpod.ai/v2"

# Node ids in serverless-flux-workflow.json
CKPT, LORA, POS, NEG, GUIDE, LATENT, SAMPLER = "30", "50", "6", "33", "35", "27", "31"

_print_lock = threading.Lock()


def log(msg):
    with _print_lock:
        print(msg, flush=True)


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
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def build_workflow(args, prompt, seed):
    """Fill the workflow template for one prompt."""
    wf = json.loads(WORKFLOW_PATH.read_text())

    wf[POS]["inputs"]["text"] = prompt
    wf[NEG]["inputs"]["text"] = args.negative
    wf[GUIDE]["inputs"]["guidance"] = args.guidance
    wf[LATENT]["inputs"]["width"] = args.width
    wf[LATENT]["inputs"]["height"] = args.height
    wf[SAMPLER]["inputs"]["steps"] = args.steps
    wf[SAMPLER]["inputs"]["seed"] = seed

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

    return wf


def extract_image(output):
    """Pull base64 image data out of the worker's response.

    The docs are inconsistent about the shape: the tutorial's sample response
    shows `output.message`, while its own decode script (and the worker's
    README) use `output.images[0].data`. Handle both rather than bet on one.
    Returns (base64_or_None, url_or_None).
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
    raise RuntimeError(f"No image data in output: {json.dumps(output)[:300]}")


def generate(args, prompt, seed, out_path):
    """Run one prompt end to end. Returns (out_path, execution_ms)."""
    base = f"{API_BASE}/{args.endpoint}"
    wf = build_workflow(args, prompt, seed)

    try:
        job = post(f"{base}/run", args.api_key, {"input": {"workflow": wf}})
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"submit failed ({e.code}): {e.read().decode()[:300]}")

    job_id = job.get("id")
    if not job_id:
        raise RuntimeError(f"no job id in response: {job}")

    deadline = time.time() + args.timeout
    while time.time() < deadline:
        time.sleep(3)
        res = get(f"{base}/status/{job_id}", args.api_key)
        status = res.get("status")
        if status == "COMPLETED":
            break
        if status in ("FAILED", "CANCELLED", "TIMED_OUT"):
            raise RuntimeError(f"job {status}: {json.dumps(res.get('output'))[:300]}")
    else:
        raise RuntimeError(f"timed out after {args.timeout}s (job {job_id} may still finish)")

    b64, url = extract_image(res.get("output"))
    if url:
        raise RuntimeError(f"worker returned an S3 URL, not base64: {url}")
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    out_path.write_bytes(base64.b64decode(b64))
    return out_path, res.get("executionTime")


def slugify(text, limit=48):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:limit] or "prompt"


def read_prompts(path):
    prompts = []
    for line in pathlib.Path(path).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            prompts.append(line)
    return prompts


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", help="single prompt (or use --prompts-file)")
    p.add_argument("--prompts-file", help="file with one prompt per line; # comments ignored")
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
    p.add_argument("--seed", type=int, default=0, help="0 = random per prompt")
    p.add_argument("--out", default="./output.png", help="output file (single prompt)")
    p.add_argument("--outdir", default="./renders", help="output directory (batch)")
    p.add_argument("--concurrency", type=int, default=3, help="parallel jobs in batch mode")
    p.add_argument("--overwrite", action="store_true", help="regenerate even if the file exists")
    p.add_argument("--timeout", type=int, default=900, help="seconds per job (cold starts are slow)")
    args = p.parse_args()

    if bool(args.prompt) == bool(args.prompts_file):
        raise SystemExit("Pass exactly one of --prompt or --prompts-file")
    if not args.endpoint:
        raise SystemExit("Set RUNPOD_ENDPOINT_ID or pass --endpoint")
    if not args.api_key:
        raise SystemExit("Set RUNPOD_API_KEY or pass --api-key")
    if not args.lora and not args.no_lora:
        raise SystemExit("Pass --lora <filename>, or --no-lora to run the base model alone")

    if args.prompt:
        seed = args.seed or random.randint(1, 2**31 - 1)
        out, ms = generate(args, args.prompt, seed, pathlib.Path(args.out))
        log(f"Saved {out}  (seed {seed}, generate {ms}ms)")
        return 0

    prompts = read_prompts(args.prompts_file)
    if not prompts:
        raise SystemExit(f"No prompts found in {args.prompts_file}")

    outdir = pathlib.Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    jobs = []
    for i, prompt in enumerate(prompts, 1):
        out_path = outdir / f"{i:03d}-{slugify(prompt)}.png"
        if out_path.exists() and not args.overwrite:
            log(f"[{i}/{len(prompts)}] skip (exists): {out_path.name}")
            continue
        # Each prompt gets its own seed unless one was pinned explicitly.
        seed = args.seed or random.randint(1, 2**31 - 1)
        jobs.append((i, prompt, seed, out_path))

    if not jobs:
        log("Nothing to do — every output already exists (use --overwrite to force).")
        return 0

    log(f"Generating {len(jobs)} image(s), {args.concurrency} at a time -> {outdir}/")
    failures = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {
            pool.submit(generate, args, prompt, seed, out_path): (i, prompt)
            for i, prompt, seed, out_path in jobs
        }
        done = 0
        for fut in as_completed(futures):
            i, prompt = futures[fut]
            done += 1
            try:
                out, ms = fut.result()
                log(f"[{done}/{len(jobs)}] ok    {out.name}  ({ms}ms)")
            except Exception as e:  # one bad prompt shouldn't kill the batch
                failures.append((i, prompt, str(e)))
                log(f"[{done}/{len(jobs)}] FAIL  #{i}: {e}")

    if failures:
        log(f"\n{len(failures)} failed:")
        for i, prompt, err in failures:
            log(f"  #{i} {prompt[:60]!r}: {err}")
        return 1
    log(f"\nAll {len(jobs)} done -> {outdir}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
