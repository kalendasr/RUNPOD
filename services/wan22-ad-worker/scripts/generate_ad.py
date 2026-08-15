#!/usr/bin/env python3
"""CLI client for generating video ads via a deployed Wan 2.2 RunPod endpoint.

Usage:
    export RUNPOD_API_KEY=...
    export RUNPOD_ENDPOINT_ID=...
    python scripts/generate_ad.py "A sleek red sports car drifts around a neon city corner" -o ad.mp4
    python scripts/generate_ad.py "Product spins on a marble pedestal" --image-url https://.../product.jpg -o ad.mp4
"""

import argparse
import base64
import os
import sys
import time

import requests

BASE_URL = "https://api.runpod.ai/v2/{endpoint_id}"


def main():
    parser = argparse.ArgumentParser(description="Generate a video ad with a deployed Wan 2.2 RunPod endpoint")
    parser.add_argument("prompt", help="Text prompt describing the ad")
    parser.add_argument("--negative-prompt", default=None)
    parser.add_argument("--image-url", default=None, help="Product image URL (I2V endpoints only)")
    parser.add_argument("--num-frames", type=int, default=81)
    parser.add_argument("--num-inference-steps", type=int, default=40)
    parser.add_argument("--guidance-scale", type=float, default=None)
    parser.add_argument("--fps", type=int, default=16)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("-o", "--output", default="ad_output.mp4")
    parser.add_argument("--poll-interval", type=float, default=5.0)
    parser.add_argument("--timeout", type=float, default=1800.0)
    args = parser.parse_args()

    api_key = os.environ.get("RUNPOD_API_KEY")
    endpoint_id = os.environ.get("RUNPOD_ENDPOINT_ID")
    if not api_key or not endpoint_id:
        sys.exit("Set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID environment variables first.")

    payload_input = {
        "prompt": args.prompt,
        "num_frames": args.num_frames,
        "num_inference_steps": args.num_inference_steps,
        "fps": args.fps,
    }
    if args.negative_prompt:
        payload_input["negative_prompt"] = args.negative_prompt
    if args.image_url:
        payload_input["image_url"] = args.image_url
    if args.guidance_scale is not None:
        payload_input["guidance_scale"] = args.guidance_scale
    if args.seed is not None:
        payload_input["seed"] = args.seed

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    base = BASE_URL.format(endpoint_id=endpoint_id)

    resp = requests.post(f"{base}/run", json={"input": payload_input}, headers=headers)
    resp.raise_for_status()
    job_id = resp.json()["id"]
    print(f"Submitted job {job_id}, waiting for completion...")

    deadline = time.time() + args.timeout
    while time.time() < deadline:
        status_resp = requests.get(f"{base}/status/{job_id}", headers=headers)
        status_resp.raise_for_status()
        data = status_resp.json()
        status = data.get("status")

        if status == "COMPLETED":
            output = data["output"]
            if "error" in output:
                sys.exit(f"Generation failed: {output['error']}")
            video_bytes = base64.b64decode(output["video_base64"])
            with open(args.output, "wb") as f:
                f.write(video_bytes)
            print(f"Saved video ad to {args.output}")
            return

        if status in ("FAILED", "CANCELLED", "TIMED_OUT"):
            sys.exit(f"Job {status}: {data}")

        print(f"  status: {status}")
        time.sleep(args.poll_interval)

    sys.exit("Timed out waiting for job to complete.")


if __name__ == "__main__":
    main()
