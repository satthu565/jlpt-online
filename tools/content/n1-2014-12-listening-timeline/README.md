# N1 12/2014 Listening Timeline Correction (Mondai 4 Q90–Q103)

## Problem
In the published version of JLPT N1 12/2014 (`fd195a55-7d6d-4129-ac4d-ab767e4c7b99`, `n1-2014-12`), Mondai 4 questions suffered from severe alternating truncation defects where 4 questions were cut short and their Option 3 was spilled into the next question:
- Q92 cut after 23.6s (spilling Option 3 into Q93 which was 45.6s)
- Q96 cut after 22.0s (spilling Option 3 into Q97 which was 44.8s)
- Q98 cut after 22.7s (spilling Option 3 into Q99 which was 46.5s)
- Q100 cut after 20.4s (spilling Option 3 into Q101 which was 44.7s)

## Solution
Phonetic analysis with Faster-Whisper and envelope silence detection re-established exact question boundaries:
- Q90: 1981100ms -> 2022500ms (41.4s)
- Q91: 2022500ms -> 2053500ms (31.0s)
- Q92: 2053500ms -> 2090000ms (36.5s, restored Option 3)
- Q93: 2090000ms -> 2123000ms (33.0s)
- Q94: 2123000ms -> 2155000ms (32.0s)
- Q95: 2155000ms -> 2191000ms (36.0s)
- Q96: 2191000ms -> 2225000ms (34.0s, restored Option 3)
- Q97: 2225000ms -> 2255000ms (30.0s)
- Q98: 2255000ms -> 2286000ms (31.0s, restored Option 3)
- Q99: 2286000ms -> 2326000ms (40.0s)
- Q100: 2326000ms -> 2360000ms (34.0s, restored Option 3)
- Q101: 2360000ms -> 2391000ms (31.0s)
- Q102: 2391000ms -> 2424000ms (33.0s)
- Q103: 2424000ms -> 2460500ms (36.5s)
- Q104 (M5 Q1): 2460500ms -> 2603700ms (maintains seamless contiguous timeline)

## Usage
```bash
N1_2014_12_TIMELINE_DIR=/tmp/n1-2014-12 node repair.mjs plan
N1_2014_12_TIMELINE_DIR=/tmp/n1-2014-12 N1_2014_12_TIMELINE_BACKUP=/path/to/backup.dump node repair.mjs apply
N1_2014_12_TIMELINE_DIR=/tmp/n1-2014-12 node repair.mjs verify
```
