# N2 December 2011 Listening Timeline Repair (Mondai 4 Q97, Q98, Q101 & Mondai 5 Q102)

## Overview
Corrects Mondai 4 (Quick Response) and Mondai 5 introductory boundary cuts in `exam_sections.listening_timeline` for JLPT N2 12/2011 (`5e6c7af1-1e9c-4ce3-a21c-75953ce48d74`, `n2-2011-12`).

## Problem
In published version 2:
1. Q97 was prematurely truncated at 21.11s (at 2223.91s), cutting off Option 3 speech into Q98.
2. Q101 was erroneously inflated to 80.13s (to 2418.19s), consuming the directions and instructions of Mondai 5. Mondai 5 Q1 (Q102) was deprived of its introductory directions.

## Changes Table

| Question | Timeline Index | Before | After | Duration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q97 (7番) | 22 | 2202.80s - 2223.91s | 2202.80s - 2229.00s | 26.20s | Restores Option 3 in full (+4.9s silence) |
| Q98 (8番) | 23 | 2223.91s - 2271.32s | 2229.00s - 2271.32s | 42.32s | Clean start after Q97 silence |
| Q101 (11番) | 26 | 2338.06s - 2418.19s | 2338.06s - 2365.50s | 27.44s | Ends cleanly in silence before Mondai 5 |
| Q102 (M5 Q1) | 27 | 2418.19s - 2568.72s | 2365.50s - 2568.72s | 203.22s | Restores Mondai 5 directions and instructions |

All 106 questions and answer keys remain completely untouched.

## Usage
```bash
export N2_2011_12_TIMELINE_DIR=/tmp/n2-2011-12-timeline
export N2_2011_12_TIMELINE_BACKUP=/home/jlpt/backups/...

node tools/content/n2-2011-12-listening-timeline/repair.mjs plan
node tools/content/n2-2011-12-listening-timeline/repair.mjs apply
node tools/content/n2-2011-12-listening-timeline/repair.mjs verify
```
