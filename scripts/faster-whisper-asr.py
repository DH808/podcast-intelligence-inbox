#!/usr/bin/env python3
"""One-file faster-whisper runner used only inside bounded Node subprocesses."""

import argparse
import json
from pathlib import Path


def stamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remainder = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{remainder:04.1f}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--json", required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--model", default="small")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--offset", type=float, default=0)
    args = parser.parse_args()

    from faster_whisper import WhisperModel

    device = args.device
    compute_type = "int8" if device in ("auto", "cpu") else "float16"
    model = WhisperModel(args.model, device=device, compute_type=compute_type)
    stream, info = model.transcribe(args.audio, vad_filter=True, beam_size=5, condition_on_previous_text=True)
    segments = []
    for segment in stream:
        start = float(segment.start) + args.offset
        end = float(segment.end) + args.offset
        text = segment.text.strip()
        if text:
            segments.append({"start": start, "end": end, "text": text})
    payload = {
        "format": "podcast-transcript-asr-v1",
        "model": args.model,
        "language": getattr(info, "language", None),
        "language_probability": getattr(info, "language_probability", None),
        "segments": segments,
    }
    Path(args.json).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(args.text).write_text("\n".join(f"[{stamp(row['start'])}] {row['text']}" for row in segments) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
