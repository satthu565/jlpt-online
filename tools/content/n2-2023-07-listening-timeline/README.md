# N2 July 2023 Listening Timeline Repair (Mondai 4 Q87-Q97 & Mondai 5 Q98)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 boundary cuts in `exam_sections.listening_timeline` for JLPT N2 07/2023 (`02a02b46-066b-47cb-a990-61c67a3bc822`, `n2-2023-07`).

## Problem
In published version 4:
1. Q88 (2番) was cut prematurely at 24.52s (endMs: 1696.04s), cutting off 5.05s of answering silence.
2. Q96 (10番) was cut prematurely at 21.34s (endMs: 1944.50s), cutting off Option 3 dialogue in mid-sentence.
3. Q97 (11番 - omitted from original CD recording) had a malformed 1.03s segment (`1944500 -> 1945530`) that overlapped with Q96 speech and Mondai 5 instructions.
4. Mondai 5 (idx 27) started prematurely during the silence interval.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q87 (1番) | 16 | 1640.70s - 1671.52s | 1640.70s - 1667.10s | 26.40s | Clean cut before 2番 chime |
| Q88 (2番) | 17 | 1671.52s - 1696.04s | 1667.10s - 1700.60s | 33.50s | Restores Option 3 + 5.05s thinking silence |
| Q89 (3番) | 18 | 1696.04s - 1726.26s | 1700.60s - 1730.60s | 30.00s | Clean cut before 4番 chime |
| Q90 (4番) | 19 | 1726.26s - 1758.72s | 1730.60s - 1762.70s | 32.10s | Clean cut before 5番 chime |
| Q91 (5番) | 20 | 1758.72s - 1787.32s | 1762.70s - 1791.70s | 29.00s | Clean cut before 6番 chime |
| Q92 (6番) | 21 | 1787.32s - 1817.91s | 1791.70s - 1822.20s | 30.50s | Clean cut before 7番 chime |
| Q93 (7番) | 22 | 1817.91s - 1848.40s | 1822.20s - 1853.40s | 31.20s | Clean cut before 8番 chime |
| Q94 (8番) | 23 | 1848.40s - 1881.88s | 1853.40s - 1886.10s | 32.70s | Clean cut before 9番 chime |
| Q95 (9番) | 24 | 1881.88s - 1923.16s | 1886.10s - 1918.80s | 32.70s | Clean cut before 10番 chime |
| Q96 (10番) | 25 | 1923.16s - 1944.50s | 1918.80s - 1949.50s | 30.70s | Restores Option 3 in full + 4.2s thinking silence |
| Q97 (11番) | 26 | 1944.50s - 1945.53s | 1949.50s - 1949.60s | 0.10s | Omitted question placeholder (standard format) |
| Q98 (M5 Q1) | 27 | 1945.53s - 2092.88s | 1949.60s - 2092.88s | 143.28s | Clean start 0.8s before Mondai 5 chime |

All 101 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2023_07_TIMELINE_DIR=/tmp/n2-2023-07-timeline
export N2_2023_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n2-2023-07-listening-timeline/repair.mjs plan
node tools/content/n2-2023-07-listening-timeline/repair.mjs apply
node tools/content/n2-2023-07-listening-timeline/repair.mjs verify
```
