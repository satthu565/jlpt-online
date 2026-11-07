# N3-2011-12 Listening Timeline Repair (Mondai 5 Q93–Q100)

## Overview
Corrects Mondai 5 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT n3-2011-12 (`8b5bcc21-87eb-4959-a50e-8e8d7e47a3d8`).

## Problem
In published version 4:
- Sub-optimal cut points clipped Option 3 audio or swallowed inter-question answering silence.
- Short items truncated dialogue into subsequent questions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q93 | 19 | 1897.17s - 2020.45s | 1897.17s - 2027.52s | 130.35s | Restores Option 3 + clean silence |
| Q94 | 20 | 2020.45s - 2050.96s | 2027.52s - 2058.02s | 30.50s | Restores Option 3 + clean silence |
| Q95 | 21 | 2050.96s - 2095.86s | 2058.02s - 2091.07s | 33.05s | Restores Option 3 + clean silence |
| Q96 | 22 | 2095.86s - 2127.58s | 2091.07s - 2122.87s | 31.80s | Restores Option 3 + clean silence |
| Q97 | 23 | 2127.58s - 2149.21s | 2122.87s - 2156.52s | 33.65s | Restores Option 3 + clean silence |
| Q98 | 24 | 2149.21s - 2192.32s | 2156.52s - 2187.57s | 31.05s | Restores Option 3 + clean silence |
| Q99 | 25 | 2192.32s - 2212.91s | 2187.57s - 2220.07s | 32.50s | Restores Option 3 + clean silence |
| Q100 | 26 | 2212.91s - 2250.76s | 2220.07s - 2250.17s | 30.10s | Restores Option 3 + clean silence |

All 101 questions and answer keys remain completely untouched.

## Usage
```bash
export N3_2011_12_TIMELINE_DIR=/tmp/n3-2011-12-timeline
export N3_2011_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n3-2011-12-listening-timeline/repair.mjs plan
node tools/content/n3-2011-12-listening-timeline/repair.mjs apply
node tools/content/n3-2011-12-listening-timeline/repair.mjs verify
```
