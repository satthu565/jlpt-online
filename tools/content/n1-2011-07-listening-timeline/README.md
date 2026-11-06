# N1 7/2011 Listening Timeline Correction (Mondai 4 Q90–Q102)

## Problem
In the published version of JLPT N1 7/2011 (`40208963-a844-44f7-a5b9-805b245ef87b`, `n1-2011-07`), Mondai 4 (即時応答) questions Q90 through Q102 suffered from truncated audio cuts:
- Q90 ended prematurely at 2055.5s before Option 3 (*いえ、いつでもおっしゃってください*) was spoken (running 2056.0s - 2060.0s).
- Q95 (22.2s) and Q97 (21.5s) were cut prematurely before Option 3.

## Solution
Phonetic analysis with Faster-Whisper and envelope silence detection re-established exact question boundaries:
- Q90: 2030000ms -> 2060000ms (30.0s, includes Option 3)
- Q91: 2060000ms -> 2094000ms (34.0s)
- Q92: 2094000ms -> 2132500ms (38.5s)
- Q93: 2132500ms -> 2166000ms (33.5s)
- Q94: 2166000ms -> 2196000ms (30.0s)
- Q95: 2196000ms -> 2226500ms (30.5s)
- Q96: 2226500ms -> 2266000ms (39.5s)
- Q97: 2266000ms -> 2295500ms (29.5s)
- Q98: 2295500ms -> 2334000ms (38.5s)
- Q99: 2334000ms -> 2366000ms (32.0s)
- Q100: 2366000ms -> 2399000ms (33.0s)
- Q101: 2399000ms -> 2433000ms (34.0s)
- Q102: 2433000ms -> 2470000ms (37.0s)
- Q103 (M5 Q1): 2470000ms -> 2625500ms (maintains contiguous timeline)

## Usage
```bash
N1_2011_07_TIMELINE_DIR=/tmp/n1-2011-07 node repair.mjs plan
N1_2011_07_TIMELINE_DIR=/tmp/n1-2011-07 N1_2011_07_TIMELINE_BACKUP=/path/to/backup.dump node repair.mjs apply
N1_2011_07_TIMELINE_DIR=/tmp/n1-2011-07 node repair.mjs verify
```
