FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV HF_HUB_ENABLE_HF_TRANSFER=1 \
    WAN_MODE=t2v

COPY handler.py .

CMD ["python3", "-u", "handler.py"]
