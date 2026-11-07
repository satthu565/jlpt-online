# N3-2020-12 Listening Timeline Repair (Mondai 5 Q92–Q100)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2020-12 (`6f36d646-3a9f-46a6-a168-ae51832303f6`).

## Problem
In published version 1:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q92 | 19 | 1918.00s - 1978.00s | 1918.00s - 1985.35s | 67.35s | Restores Option 3 + clean silence |
| Q93 | 20 | 1978.00s - 2008.00s | 1985.35s - 2015.30s | 29.95s | Restores Option 3 + clean silence |
| Q94 | 21 | 2008.00s - 2042.20s | 2015.30s - 2049.40s | 34.10s | Restores Option 3 + clean silence |
| Q95 | 22 | 2042.20s - 2073.90s | 2049.40s - 2081.15s | 31.75s | Restores Option 3 + clean silence |
| Q96 | 23 | 2073.90s - 2107.00s | 2081.15s - 2113.95s | 32.80s | Restores Option 3 + clean silence |
| Q97 | 24 | 2107.00s - 2150.00s | 2113.95s - 2145.95s | 32.00s | Restores Option 3 + clean silence |
| Q98 | 25 | 2150.00s - 2169.90s | 2145.95s - 2177.35s | 31.40s | Restores Option 3 + clean silence |
| Q99 | 26 | 2169.90s - 2216.00s | 2177.35s - 2212.15s | 34.80s | Restores Option 3 + clean silence |
| Q100 | 27 | 2216.00s - 2254.94s | 2212.15s - 2254.94s | 42.79s | Restores Option 3 + clean silence |

All 101 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2020_12_TIMELINE_DIR=/tmp/n3-2020-12-timeline
export N3_2020_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2020-12-listening-timeline/repair.mjs plan
node tools/content/n3-2020-12-listening-timeline/repair.mjs apply
node tools/content/n3-2020-12-listening-timeline/repair.mjs verify
```
