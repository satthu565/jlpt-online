# Repair Tool: N1 July 2023 Listening Timeline Cuts

## Problem
In the July 2023 N1 exam (`n1-2023-07`), questions 82 through 92 (Mondai 4: Quick Response, 11 questions) were split prematurely, cutting off Option 3 from each question and placing it into the following question.

## Solution
Audio transcription with Faster-Whisper and RMS silence analysis identified digital silence intervals (RMS < 10) between questions. Question boundaries are adjusted to include Option 3 and silence before the next question chime. Mondai 5 start is shifted after Mondai 4 Question 11 Option 3 ends.

## Usage
```bash
export N1_2023_07_TIMELINE_DIR=/tmp/n1-2023-07-timeline
node repair.mjs plan
export N1_2023_07_TIMELINE_BACKUP=/home/jlpt/backups/<backup-file>.dump
node repair.mjs apply
node repair.mjs verify
```
