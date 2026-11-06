# N1 12/2011 Listening Timeline Correction (Mondai 4 Q90–Q102)

## Problem
In the published version of JLPT N1 12/2011 (`5f6ed013-eaef-4863-a4dc-5a089b0487a1`, `n1-2011-12`), Mondai 4 suffered from two severe defects:
1. Q97 ended prematurely after only 21.1s (at 2781.1s) before Option 3 (*確かに満足げだったね*) was spoken (running 2781.3s - 2784.3s). Option 3 was spilled into Q98.
2. Q102 was erroneously extended to 3004.3s, eating 37 seconds into Mondai 5 instructions. Consequently, Mondai 5 Q1 was missing its introductory directions.

## Solution
Phonetic analysis with Faster-Whisper and envelope silence detection re-established exact question boundaries:
- Q90: 2525100ms -> 2556600ms (31.5s)
- Q91: 2556600ms -> 2589800ms (33.2s)
- Q92: 2589800ms -> 2622800ms (33.0s)
- Q93: 2622800ms -> 2654100ms (31.3s)
- Q94: 2654100ms -> 2689800ms (35.7s)
- Q95: 2689800ms -> 2725800ms (36.0s)
- Q96: 2725800ms -> 2748800ms (23.0s)
- Q97: 2748800ms -> 2787800ms (39.0s, includes Option 3)
- Q98: 2787800ms -> 2823800ms (36.0s)
- Q99: 2823800ms -> 2847000ms (23.2s)
- Q100: 2847000ms -> 2891800ms (44.8s)
- Q101: 2891800ms -> 2927800ms (36.0s)
- Q102: 2927800ms -> 2962800ms (35.0s, cleanly ends before Mondai 5)
- Q103 (M5 Q1): 2962800ms -> 3174900ms (restores Mondai 5 directions and instructions)

## Usage
```bash
N1_2011_12_TIMELINE_DIR=/tmp/n1-2011-12 node repair.mjs plan
N1_2011_12_TIMELINE_DIR=/tmp/n1-2011-12 N1_2011_12_TIMELINE_BACKUP=/path/to/backup.dump node repair.mjs apply
N1_2011_12_TIMELINE_DIR=/tmp/n1-2011-12 node repair.mjs verify
```
