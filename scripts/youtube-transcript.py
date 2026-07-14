#!/usr/bin/env python3
"""Bounded optional adapter for youtube-transcript-api; emits JSON only."""

import argparse
import json
import sys


def normalize(items):
    rows = []
    for item in items:
        if hasattr(item, "to_raw_data"):
            item = item.to_raw_data()
        elif not isinstance(item, dict):
            item = {"text": item.text, "start": item.start, "duration": item.duration}
        start = float(item.get("start", 0))
        duration = float(item.get("duration", 0))
        rows.append({"start": start, "end": start + duration, "text": str(item.get("text", ""))})
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-id", required=True)
    args = parser.parse_args()
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except Exception as error:
        raise RuntimeError("youtube-transcript-api is unavailable") from error
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(args.video_id, languages=["en", "en-US", "zh-Hans", "zh-Hant", "zh"])
    except (AttributeError, TypeError):
        transcript = YouTubeTranscriptApi.get_transcript(args.video_id, languages=["en", "en-US", "zh-Hans", "zh-Hant", "zh"])
    json.dump({"video_id": args.video_id, "segments": normalize(transcript)}, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        sys.stderr.write(f"{type(error).__name__}: {error}\n")
        raise SystemExit(1)
