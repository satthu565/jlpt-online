# N1 12/2010 Listening Timeline Correction (Mondai 4 Q90–Q103)

## Problem
In the initial import of JLPT N1 12/2010 (`7151479f-8ae1-4bcf-a637-fe752a314aee`, `n1-2010-12`), Mondai 4 (即時応答) questions Q90 through Q103 suffered from truncated audio cuts:
- Questions ended before Option 3 was spoken or before the confirmation chime, cutting off Option 3 and spilling it into the subsequent question.
- Questions Q94 (21.0s), Q97 (19.5s), and Q102 (21.5s) were severely cut short.
- Q103 cut off at 2509.3s while Option 3 ran until 2511.0s.

## Solution
Phonetic analysis with Faster-Whisper and envelope silence detection re-established exact question boundaries:
- Q90: 2001200ms -> 2110700ms (109.5s, includes Mondai 4 intro + sample + Option 3)
- Q91: 2110700ms -> 2139800ms (29.1s)
- Q92: 2139800ms -> 2172250ms (32.5s)
- Q93: 2172250ms -> 2202950ms (30.7s)
- Q94: 2202950ms -> 2234200ms (31.2s)
- Q95: 2234200ms -> 2264700ms (30.5s)
- Q96: 2264700ms -> 2292000ms (27.3s)
- Q97: 2292000ms -> 2320700ms (28.7s)
- Q98: 2320700ms -> 2353400ms (32.7s)
- Q99: 2353400ms -> 2390000ms (36.6s)
- Q100: 2390000ms -> 2420000ms (30.0s)
- Q101: 2420000ms -> 2450000ms (30.0s)
- Q102: 2450000ms -> 2480000ms (30.0s)
- Q103: 2480000ms -> 2514000ms (34.0s)
- Q104 (Mondai 5 Q1): 2514000ms -> 2682500ms (maintains contiguous audio timeline)

## Usage
```bash
N1_2010_12_TIMELINE_DIR=/tmp/n1-2010-12 node repair.mjs plan
N1_2010_12_TIMELINE_DIR=/tmp/n1-2010-12 N1_2010_12_TIMELINE_BACKUP=/path/to/backup.dump node repair.mjs apply
N1_2010_12_TIMELINE_DIR=/tmp/n1-2010-12 node repair.mjs verify
```
