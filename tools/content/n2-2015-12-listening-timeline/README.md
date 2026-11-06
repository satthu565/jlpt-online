# N2 December 2015 Listening Timeline Repair (Mondai 4 Q91-Q102 & Mondai 5 Q103)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 12/2015 (`83973774-8fe6-4322-a9c2-e6911dc4144d`, `n2-2015-12`).

## Problem
In published version 2:
1. Q92 (2番) was prematurely cut at 19.35s (endMs: 2259.68s), clipping Option 3 into Q93.
2. Q96 (6番) was prematurely cut at 24.31s (endMs: 2394.70s), clipping Option 3 into Q97.
3. Q94 swallowed 11s of silence (duration 45.27s).
4. Q102 (12番) was stretched to 86.48s, completely swallowing Mondai 5 introduction and instructions into Q102, causing Mondai 5 Q103 to start abruptly at "では始めます".

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q91 (1番) | 16 | 2201.23s - 2240.33s | 2201.23s - 2238.80s | 37.57s | Clean cut before 2番 chime |
| Q92 (2番) | 17 | 2240.33s - 2259.68s | 2238.80s - 2268.70s | 29.90s | Restores Option 3 in full (+7s silence) |
| Q93 (3番) | 18 | 2259.68s - 2290.58s | 2268.70s - 2299.70s | 31.00s | Clean cut before 4番 chime |
| Q94 (4番) | 19 | 2290.58s - 2335.85s | 2299.70s - 2333.70s | 34.00s | Retracts swallow, clean cut before 5番 chime |
| Q95 (5番) | 20 | 2335.85s - 2370.39s | 2333.70s - 2368.70s | 35.00s | Clean cut before 6番 chime |
| Q96 (6番) | 21 | 2370.39s - 2394.70s | 2368.70s - 2403.70s | 35.00s | Restores Option 3 in full (+7s silence) |
| Q97 (7番) | 22 | 2394.70s - 2428.44s | 2403.70s - 2437.80s | 34.10s | Clean cut before 8番 chime |
| Q98 (8番) | 23 | 2428.44s - 2459.60s | 2437.80s - 2468.80s | 31.00s | Clean cut before 9番 chime |
| Q99 (9番) | 24 | 2459.60s - 2492.18s | 2468.80s - 2501.80s | 33.00s | Clean cut before 10番 chime |
| Q100 (10番) | 25 | 2492.18s - 2527.24s | 2501.80s - 2535.90s | 34.10s | Clean cut before 11番 chime |
| Q101 (11番) | 26 | 2527.24s - 2556.76s | 2535.90s - 2565.90s | 30.00s | Clean cut before 12番 chime |
| Q102 (12番) | 27 | 2556.76s - 2643.24s | 2565.90s - 2600.80s | 34.90s | Restores Option 3, frees Mondai 5 instructions |
| Q103 (M5 Q1) | 28 | 2643.24s - 2797.76s | 2600.80s - 2797.76s | 196.96s | Restores full Mondai 5 chime & directions |

All 107 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2015_12_TIMELINE_DIR=/tmp/n2-2015-12-timeline
export N2_2015_12_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2015-12-listening-timeline/repair.mjs plan
node tools/content/n2-2015-12-listening-timeline/repair.mjs apply
node tools/content/n2-2015-12-listening-timeline/repair.mjs verify
```
