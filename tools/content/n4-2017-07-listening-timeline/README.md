# N4 July 2017 Listening Timeline Repair (Mondai 3 Q85-Q89 & Mondai 4 Q90-Q97)

## Overview
Corrects Mondai 3 (Utterance Expression) and Mondai 4 (Quick Response) boundary cuts in `exam_sections.listening_timeline` for JLPT N4 07/2017 (`877e044f-ee4c-4454-aeb3-b67523ce7582`, `n4-2017-07`).

## Problem
In published version 1:
1. Q85 (Mondai 3 Item 1) was prematurely cut at 1648.20s (duration 24.7s), bisecting Option 3 ("三 お土産を買っておきます" ends at 1650.36s).
2. Q86 (Mondai 3 Item 2) swallowed the second half of Option 3 from Q85 and delayed into Q87 (duration 52.3s).
3. Q90 (Mondai 4 Item 1) was prematurely cut at 1919.90s (duration 23.9s), completely cutting Option 3 ("三 気をつけてください" 1919.24s - 1925.24s).
4. Q93 (Mondai 4 Item 4) was prematurely cut at 2014.30s (duration 19.7s), bisecting Option 3 ("三 来月にします" ends at 2016.68s).
5. Q96 (Mondai 4 Item 7) was prematurely cut at 2106.00s, clipping Option 3 speech which ends at 2108.20s.
6. Q97 (Mondai 4 Item 8) extended to 2192.52s (duration 86.5s), swallowing the exam closing announcement ("これで聴解試験を終わります...").

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q85 (M3 1番) | 15 | 1623.50s - 1648.20s | 1623.50s - 1653.50s | 30.00s | Option 3 fully restored + 3.1s silence |
| Q86 (M3 2番) | 16 | 1648.20s - 1700.50s | 1653.50s - 1694.50s | 41.00s | Clean cut before 3番 chime |
| Q87 (M3 3番) | 17 | 1700.50s - 1740.90s | 1694.50s - 1732.50s | 38.00s | Clean cut before 4番 chime |
| Q88 (M3 4番) | 18 | 1740.90s - 1777.80s | 1732.50s - 1773.50s | 41.00s | Clean cut before 5番 chime |
| Q89 (M3 5番) | 19 | 1777.80s - 1896.00s | 1773.50s - 1902.50s | 129.00s | Includes full M4 directions up to silence |
| Q90 (M4 1番) | 20 | 1896.00s - 1919.90s | 1902.50s - 1928.00s | 25.50s | Option 3 fully restored + 2.7s silence |
| Q91 (M4 2番) | 21 | 1919.90s - 1950.80s | 1928.00s - 1957.00s | 29.00s | Clean cut before 3番 chime |
| Q92 (M4 3番) | 22 | 1950.80s - 1994.60s | 1957.00s - 1988.00s | 31.00s | Clean cut before 4番 chime |
| Q93 (M4 4番) | 23 | 1994.60s - 2014.30s | 1988.00s - 2020.00s | 32.00s | Option 3 fully restored + 3.3s silence |
| Q94 (M4 5番) | 24 | 2014.30s - 2046.10s | 2020.00s - 2051.00s | 31.00s | Clean cut before 6番 chime |
| Q95 (M4 6番) | 25 | 2046.10s - 2075.80s | 2051.00s - 2081.00s | 30.00s | Clean cut before 7番 chime |
| Q96 (M4 7番) | 26 | 2075.80s - 2106.00s | 2081.00s - 2111.00s | 30.00s | Option 3 fully restored + 2.8s silence |
| Q97 (M4 8番) | 27 | 2106.00s - 2192.52s | 2111.00s - 2145.00s | 34.00s | Clean cut before exam closing statement |

All cut boundaries align with digital silence (RMS = 0.000000). All 97 questions and answer keys remain untouched.

## Usage
```bash
export N4_2017_07_TIMELINE_DIR=/tmp/n4-2017-07-timeline
export N4_2017_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node tools/content/n4-2017-07-listening-timeline/repair.mjs plan
node tools/content/n4-2017-07-listening-timeline/repair.mjs apply
node tools/content/n4-2017-07-listening-timeline/repair.mjs verify
```
