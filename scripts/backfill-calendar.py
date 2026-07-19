#!/usr/bin/env python3
"""
One-time backfill: reconstruct past calendar events from git history.

data/calendar.json is rewritten daily and pruned of anything before today, so
the live file has no history. Every past event is still recoverable from the
file's git revisions. This walks them newest-first and keeps the LAST version
of each event (the most refined label before it was pruned).

Dedup: the generating routine rewords labels between runs — "TSMC Q2 2026
earnings (2:00 PM ET)", "TSMC Q2 earnings pre-market" and "TSMC Q2 results
known" are one event. Key on (date, kind, first two significant words).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve()
OUT = Path("data/calendar-archive.json")
STOP = {"the", "a", "an", "of", "for", "and"}


def sig(label: str) -> str:
    words = [w for w in re.findall(r"[A-Za-z0-9]+", label.lower()) if w not in STOP]
    return " ".join(words[:2])


def key(ev: dict) -> tuple:
    return (ev["date"], ev.get("kind", "").upper(), sig(ev.get("label", "")))


def main() -> int:
    revs = subprocess.run(
        ["git", "log", "--format=%H", "--", "data/calendar.json"],
        capture_output=True, text=True, check=True,
    ).stdout.split()
    if not revs:
        print("no revisions of data/calendar.json found", file=sys.stderr)
        return 1

    # Newest-first, so the first sighting of a key is its final wording.
    seen: dict[tuple, dict] = {}
    for rev in revs:
        blob = subprocess.run(
            ["git", "show", f"{rev}:data/calendar.json"],
            capture_output=True, text=True,
        ).stdout
        try:
            events = json.loads(blob)["events"]
        except Exception:
            continue
        for ev in events:
            seen.setdefault(key(ev), ev)

    today = subprocess.run(
        ["date", "+%Y-%m-%d"], capture_output=True, text=True, check=True
    ).stdout.strip()

    past = sorted(
        (ev for k, ev in seen.items() if ev["date"] < today),
        key=lambda e: (e["date"], e.get("label", "")),
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"events": past}, indent=2, ensure_ascii=False) + "\n")

    print(f"revisions scanned : {len(revs)}")
    print(f"unique events     : {len(seen)}")
    print(f"past events written: {len(past)} -> {OUT}")
    if past:
        print(f"range             : {past[0]['date']} .. {past[-1]['date']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
