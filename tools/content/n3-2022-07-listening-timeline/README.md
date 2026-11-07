# N3-2022-07 Listening Timeline Repair (Mondai 5 Q91–Q99)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2022-07 (`e31a2a30-0259-4a71-ab6d-62f7a8ab6e22`).

## Problem
In published version 4:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q91 | 19 | 2016.00s - 2049.00s | 2016.00s - 2046.85s | 30.85s | Restores Option 3 + clean silence |
| Q92 | 20 | 2049.00s - 2085.00s | 2046.85s - 2083.35s | 36.50s | Restores Option 3 + clean silence |
| Q93 | 21 | 2085.00s - 2124.00s | 2083.35s - 2121.65s | 38.30s | Restores Option 3 + clean silence |
| Q94 | 22 | 2124.00s - 2160.00s | 2121.65s - 2157.55s | 35.90s | Restores Option 3 + clean silence |
| Q95 | 23 | 2160.00s - 2193.00s | 2157.55s - 2191.20s | 33.65s | Restores Option 3 + clean silence |
| Q96 | 24 | 2193.00s - 2218.00s | 2191.20s - 2227.35s | 36.15s | Restores Option 3 + clean silence |
| Q97 | 25 | 2218.00s - 2264.00s | 2227.35s - 2261.80s | 34.45s | Restores Option 3 + clean silence |
| Q98 | 26 | 2264.00s - 2299.00s | 2261.80s - 2297.00s | 35.20s | Restores Option 3 + clean silence |
| Q99 | 27 | 2299.00s - 2345.00s | 2297.00s - 2345.00s | 48.00s | Restores Option 3 + clean silence |

All 100 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2022_07_TIMELINE_DIR=/tmp/n3-2022-07-timeline
export N3_2022_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2022-07-listening-timeline/repair.mjs plan
node tools/content/n3-2022-07-listening-timeline/repair.mjs apply
node tools/content/n3-2022-07-listening-timeline/repair.mjs verify
```
