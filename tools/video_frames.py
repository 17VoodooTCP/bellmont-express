#!/usr/bin/env python3
"""Turn a screen recording into frames Claude can actually read.

Claude cannot watch video playback — it reads still images. This pulls the
frames that matter out of an .mp4 so a recording can be reviewed properly.

Two sampling modes, used together by default:

  scene   ffmpeg scene-change detection. Catches every distinct state (a new
          section scrolling in, a hover firing, a tab switching) instead of
          whatever happens to land on a fixed interval.
  every   A frame every N seconds, as a safety net for slow continuous
          scrolls, where no single frame differs enough to trip the detector.

It also writes a contact sheet — one image showing every frame as a grid —
which is the cheapest way to see the whole video at a glance.

Usage
-----
    python tools/video_frames.py RECORDING.mp4
    python tools/video_frames.py RECORDING.mp4 --out frames/run2
    python tools/video_frames.py RECORDING.mp4 --mode scene --threshold 0.18
    python tools/video_frames.py RECORDING.mp4 --mode every --interval 1.5
    python tools/video_frames.py RECORDING.mp4 --crop 1870:520:140:180
    python tools/video_frames.py RECORDING.mp4 --at 16.5 --at 23 --at 25.5

Needs ffmpeg and ffprobe on PATH.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

DEFAULT_WIDTH = 1040
DEFAULT_INTERVAL = 2.0
# Film-oriented guides suggest 0.3-0.4, which finds nothing in a screen
# recording: a page scrolling smoothly barely differs frame to frame.
# Measured on a 32s capture: 0.22 -> 0 frames, 0.12 -> 2, 0.08 -> ~20,
# 0.06 -> 46, 0.03 -> 97. 0.08 is the useful middle.
DEFAULT_THRESHOLD = 0.08


def need(tool: str) -> str:
    path = shutil.which(tool)
    if not path:
        sys.exit(
            f"error: {tool} not found on PATH.\n"
            "Install it (winget install Gyan.FFmpeg) and reopen the shell."
        )
    return path


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(video: Path) -> dict:
    out = run([
        need("ffprobe"), "-v", "error",
        "-show_entries", "format=duration",
        "-show_entries", "stream=width,height,codec_type,r_frame_rate",
        "-of", "json", str(video),
    ])
    if out.returncode != 0:
        sys.exit(f"error: ffprobe failed:\n{out.stderr.strip()}")
    data = json.loads(out.stdout or "{}")
    video_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "video"), {}
    )
    return {
        "duration": float(data.get("format", {}).get("duration", 0) or 0),
        "width": video_stream.get("width"),
        "height": video_stream.get("height"),
        "fps": video_stream.get("r_frame_rate"),
    }


def build_filter(extra: str, crop: str | None, width: int) -> str:
    parts = [p for p in (extra, f"crop={crop}" if crop else None) if p]
    parts.append(f"scale={width}:-2")
    return ",".join(parts)


def extract(video: Path, out_dir: Path, vf: str, prefix: str, quality: int) -> list[Path]:
    """Run one ffmpeg pass. -vsync vfr keeps timestamps honest for select=."""
    pattern = str(out_dir / f"{prefix}%03d.jpg")
    cmd = [
        need("ffmpeg"), "-v", "error", "-i", str(video),
        "-vf", vf, "-vsync", "vfr", "-q:v", str(quality),
        # Screen captures are usually full-range YUV, which the mjpeg encoder
        # refuses outright. yuvj420p is the JPEG full-range format it expects.
        "-pix_fmt", "yuvj420p",
        pattern,
    ]
    result = run(cmd)
    if result.returncode != 0:
        sys.exit(f"error: ffmpeg failed:\n{result.stderr.strip()}")
    return sorted(out_dir.glob(f"{prefix}*.jpg"))


def contact_sheet(frames: list[Path], out_dir: Path, columns: int = 4) -> Path | None:
    """Tile every frame into one grid image."""
    if not frames:
        return None
    listing = out_dir / "_sheet_input.txt"
    # Absolute paths: the concat demuxer resolves relative entries against the
    # listing file's own directory, which silently breaks when the output
    # folder was given as a relative path.
    listing.write_text(
        "".join(f"file '{f.resolve().as_posix()}'\nduration 1\n" for f in frames),
        encoding="utf-8",
    )
    rows = max(1, -(-len(frames) // columns))
    sheet = out_dir / "contact-sheet.jpg"
    result = run([
        need("ffmpeg"), "-v", "error", "-y",
        "-f", "concat", "-safe", "0", "-i", str(listing),
        "-vf", f"scale=420:-2,tile={columns}x{rows}:margin=8:padding=6:color=white",
        "-frames:v", "1", "-q:v", "3", "-pix_fmt", "yuvj420p", str(sheet),
    ])
    listing.unlink(missing_ok=True)
    if result.returncode != 0 or not sheet.exists():
        print("  note: contact sheet skipped:", result.stderr.strip().splitlines()[-1:] or "unknown")
        return None
    return sheet


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract readable frames from a screen recording.")
    ap.add_argument("video", type=Path)
    ap.add_argument("--out", type=Path, default=None, help="output folder (default: frames/<video name>)")
    ap.add_argument("--mode", choices=["both", "scene", "every"], default="both")
    ap.add_argument("--interval", type=float, default=DEFAULT_INTERVAL, help="seconds between frames in 'every' mode")
    ap.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD, help="scene sensitivity 0-1, lower = more frames")
    ap.add_argument("--width", type=int, default=DEFAULT_WIDTH, help="output width in px")
    ap.add_argument("--crop", default=None, help="ffmpeg crop as W:H:X:Y, applied before scaling")
    ap.add_argument("--at", type=float, action="append", default=[], help="also grab this exact timestamp (repeatable)")
    ap.add_argument("--quality", type=int, default=4, help="JPEG quality, 2 = best, 8 = small")
    ap.add_argument("--no-sheet", action="store_true")
    args = ap.parse_args()

    video = args.video.expanduser()
    if not video.is_file():
        sys.exit(f"error: no such file: {video}")

    meta = probe(video)
    out_dir = args.out or Path("frames") / video.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.jpg"):
        stale.unlink()

    print(f"{video.name}  -  {meta['width']}x{meta['height']}, "
          f"{meta['duration']:.1f}s @ {meta['fps']}")
    print(f"output: {out_dir}")

    produced: list[Path] = []

    if args.mode in ("both", "scene"):
        vf = build_filter(f"select='gt(scene,{args.threshold})'", args.crop, args.width)
        frames = extract(video, out_dir, vf, "scene-", args.quality)
        produced += frames
        print(f"  scene changes (threshold {args.threshold}): {len(frames)} frames")
        if not frames:
            print("    none tripped the detector - lower --threshold, or rely on 'every'")

    if args.mode in ("both", "every"):
        vf = build_filter(f"fps=1/{args.interval}", args.crop, args.width)
        frames = extract(video, out_dir, vf, "every-", args.quality)
        produced += frames
        print(f"  every {args.interval}s: {len(frames)} frames")

    for i, stamp in enumerate(args.at, start=1):
        target = out_dir / f"at-{stamp:g}s.jpg".replace("at-", f"at{i:02d}-")
        vf = build_filter("", args.crop, args.width)
        result = run([
            need("ffmpeg"), "-v", "error", "-y", "-ss", str(stamp), "-i", str(video),
            "-frames:v", "1", "-vf", vf, "-q:v", "2", "-pix_fmt", "yuvj420p", str(target),
        ])
        if result.returncode == 0 and target.exists():
            produced.append(target)
            print(f"  exact {stamp:g}s -> {target.name}")

    if not produced:
        sys.exit("error: no frames produced.")

    if not args.no_sheet:
        sheet = contact_sheet(sorted(set(produced)), out_dir)
        if sheet:
            print(f"  contact sheet: {sheet}")

    total_kb = sum(f.stat().st_size for f in out_dir.glob('*.jpg')) / 1024
    print(f"\n{len(set(produced))} frames, {total_kb:.0f} KB total.")
    print("Point Claude at the folder, or at contact-sheet.jpg for the overview.")


if __name__ == "__main__":
    main()
