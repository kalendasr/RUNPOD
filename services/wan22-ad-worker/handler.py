"""RunPod serverless handler for generating video ads with Wan 2.2.

Deploy two separate endpoints if you need both modes:
  WAN_MODE=t2v  -> Wan-AI/Wan2.2-T2V-A14B-Diffusers (prompt only)
  WAN_MODE=i2v  -> Wan-AI/Wan2.2-I2V-A14B-Diffusers (prompt + product image)
"""

import base64
import io
import os
import tempfile

import runpod
import torch
from diffusers.utils import export_to_video, load_image
from PIL import Image

MODE = os.environ.get("WAN_MODE", "t2v").lower()
MODEL_ID = os.environ.get(
    "MODEL_ID",
    "Wan-AI/Wan2.2-I2V-A14B-Diffusers" if MODE == "i2v" else "Wan-AI/Wan2.2-T2V-A14B-Diffusers",
)
DTYPE = torch.bfloat16

NEGATIVE_PROMPT_DEFAULT = (
    "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，"
    "最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，"
    "画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，"
    "杂乱的背景，三条腿，背景人很多，倒着走"
)

_pipe = None


def load_pipeline():
    global _pipe
    if _pipe is not None:
        return _pipe

    if MODE == "i2v":
        from diffusers import WanImageToVideoPipeline

        _pipe = WanImageToVideoPipeline.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
    else:
        from diffusers import AutoencoderKLWan, WanPipeline

        vae = AutoencoderKLWan.from_pretrained(MODEL_ID, subfolder="vae", torch_dtype=torch.float32)
        _pipe = WanPipeline.from_pretrained(MODEL_ID, vae=vae, torch_dtype=DTYPE)

    _pipe.to("cuda")
    return _pipe


def handler(job):
    job_input = job["input"]
    prompt = job_input.get("prompt")
    if not prompt:
        return {"error": "'prompt' is required"}

    negative_prompt = job_input.get("negative_prompt", NEGATIVE_PROMPT_DEFAULT)
    num_frames = job_input.get("num_frames", 81)
    num_inference_steps = job_input.get("num_inference_steps", 40)
    guidance_scale = job_input.get("guidance_scale", 3.5 if MODE == "i2v" else 4.0)
    fps = job_input.get("fps", 16)
    seed = job_input.get("seed")

    pipe = load_pipeline()
    generator = torch.Generator(device="cuda").manual_seed(seed) if seed is not None else None

    call_kwargs = dict(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
        generator=generator,
    )

    if MODE == "i2v":
        image_url = job_input.get("image_url")
        image_b64 = job_input.get("image_base64")
        if not image_url and not image_b64:
            return {"error": "i2v mode requires 'image_url' or 'image_base64' in input"}

        image = (
            load_image(image_url)
            if image_url
            else Image.open(io.BytesIO(base64.b64decode(image_b64))).convert("RGB")
        )

        max_area = job_input.get("max_area", 480 * 832)
        aspect_ratio = image.height / image.width
        mod_value = pipe.vae_scale_factor_spatial * pipe.transformer.config.patch_size[1]
        height = round((max_area * aspect_ratio) ** 0.5) // mod_value * mod_value
        width = round((max_area / aspect_ratio) ** 0.5) // mod_value * mod_value
        image = image.resize((width, height))

        call_kwargs["image"] = image
        call_kwargs["height"] = height
        call_kwargs["width"] = width
    else:
        call_kwargs["height"] = job_input.get("height", 720)
        call_kwargs["width"] = job_input.get("width", 1280)
        call_kwargs["guidance_scale_2"] = job_input.get("guidance_scale_2", 3.0)

    frames = pipe(**call_kwargs).frames[0]

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        export_to_video(frames, f.name, fps=fps)
        video_path = f.name

    with open(video_path, "rb") as video_file:
        video_b64 = base64.b64encode(video_file.read()).decode("utf-8")
    os.unlink(video_path)

    return {"video_base64": video_b64, "fps": fps, "num_frames": num_frames, "mode": MODE}


runpod.serverless.start({"handler": handler})
