# N1 7/2025: reviewed content corrections and listening placeholder restoration

Correct confirmed content defects and restore real options for 17 listening placeholder questions from the 2026-11-03 source review:

| Question | Correction | Evidence |
|---|---|---|
| 18 | `あきれたあような` → `あきれたような` in option 2 | Typo in repeated kana; source exam PDF page 3 |
| 53 | `モチベーションへ（注2）の責任` → `モチベーションへの責任（注2）`; `「好きか、嫌いか」に判断する` → `「好きか、嫌いか」で判断する` | Particle and note placement repair; source exam PDF page 21 |
| 58 | `知識をのかなものにする` → `知識を確かなものにする` in option 4 | Restore corrupted OCR string to `確かなもの`; source exam PDF page 26 |
| 62 | `粋` (`いき`) → `秤` (`はかり`) in ruby passage | Correct OCR misrecognition of `秤にかける` (weigh/compare on the same scale); source exam PDF page 30 |
| 70 | `売り上げを伸ばした理由` → `売り上げの落ちた理由`; `なかなか出来なんじゃないかな` → `なかなかの出来なんじゃないかな` in transcript | Match audio and logical meaning at 07:51 and 07:59 |
| 71 | `前イベント` → `前のイベント`; `使ったのあるから` → `使ったのがあるから` in transcript | Restore omitted particles in dialogue at 09:27 |
| 74 | `3年生の時もやったよ` → `3年生の時にやったよ`; `盛り上がるよね` → `盛り上がるんだよね` in transcript | Match spoken audio at 16:20 |
| 78 | Restore options 1–4 from transcript: `野鳥の観察の楽しみ方` / `自然公園で育つ植物` / `自然公園を歩く時の注意点` / `野鳥の保護の必要性` | Mondai 3 Question 1 spoken options in transcript |
| 79 | Restore options 1–4 from transcript: `デザインの特徴` / `技術開発の難しさ` / `重大な事故の危険性` / `地方での活用への期待` | Mondai 3 Question 2 spoken options in transcript |
| 80 | Restore options 1–4 from transcript: `醤油の作り方` / `醤油の製造に適した地方` / `地方によって異なる醤油の味` / `醤油の上手な選び方` | Mondai 3 Question 3 spoken options in transcript |
| 81 | Restore options 1–4 from transcript: `家具職人としてのこだわり` / `家具に使用される木の種類` / `木の家具の手入れの仕方` / `家具職人の大変さ` | Mondai 3 Question 4 spoken options in transcript |
| 82 | Restore options 1–4 from transcript: `今後の公衆電話に必要な機能` / `災害時の公衆電話のかけ方` / `公衆電話を利用する時の注意点` / `公衆電話が完全に無くならない理由` | Mondai 3 Question 5 spoken options in transcript |
| 83 | Restore options 1–3 from transcript: `コミュニケーションがうまく取れてるんですね` / `二人気が合ってていいね` / `会議で言い合いになってたってよ` | Mondai 4 Question 1 spoken options in transcript |
| 84 | Restore options 1–3 from transcript: `人は足りてるから大丈夫だよ` / `じゃ、日曜日待ってるね` / `日曜日に手伝ってくれるの？` | Mondai 4 Question 2 spoken options in transcript |
| 85 | Restore options 1–3 from transcript: `お茶足りて良かったですね` / `古いものは捨てておきます` / `あ、全然ありませんか？すぐ注文します` | Mondai 4 Question 3 spoken options in transcript |
| 86 | Restore options 1–3 from transcript: `そのうち慣れますよ` / `慣れるの早いですね` / `少し慣れてきたんですね` | Mondai 4 Question 4 spoken options in transcript |
| 87 | Restore options 1–3 from transcript: `すぐに？どうしたんだろうね` / `しばらくは体育館にいたんだね` / `体育館に入って来なかったの？` | Mondai 4 Question 5 spoken options in transcript |
| 88 | Restore options 1–3 from transcript: `困りましたね。すぐに対策を考えないとね` / `全く問題ないんですね。それは安心しました` / `スケジュールにちょっと遅れが出ているんですね` | Mondai 4 Question 6 spoken options in transcript (key 2 preserved) |
| 89 | Restore options 1–3 from transcript: `残念だけど、仕方ないですね` / `山田さんがいてくれたらよかったですね` / `本当、山田さんのおかげですね` | Mondai 4 Question 7 spoken options in transcript |
| 90 | Restore options 1–3 from transcript: `やっぱりまくらを変えたくらいじゃ変わらないんだ` / `いびきが小さくなったの？` / `まくらでそんなに違うんだ` | Mondai 4 Question 8 spoken options in transcript |
| 91 | Restore options 1–3 from transcript: `仕事で役に立つものがいいね` / `資格なら何でもいいって話？` / `仕事で使えなくてもいいんだ` | Mondai 4 Question 9 spoken options in transcript |
| 92 | Restore options 1–3 from transcript: `昔とは違う方法で作ってるんだね` / `へー、昔からずっと変わらないんだ` / `最新の技術を導入してるなんてすごいね` | Mondai 4 Question 10 spoken options in transcript |
| 93 | Restore options 1–3 from transcript: `何もサポートの必要がないんですね` / `つい手伝いたくなっちゃいますよね` / `もう1人でできるようになったんですね` | Mondai 4 Question 11 spoken options in transcript |
| 94 | Restore options 1–4 from transcript: `1番コース` / `2番コース` / `3番コース` / `4番コース` | Mondai 5 Question 1 spoken options in transcript |

All 96 answer keys, question order, audio SHA-256 and timeline are preserved. Q20=2 and Q88=2 remain answer 2.

## Operation

Run only from an isolated worktree on `jlpt-vm`.

```bash
export N1_REPAIR_DIR=/tmp/n1-2025-07-repair-20261106
export N1_REPAIR_AUTH="$N1_REPAIR_DIR/auth.env"
pnpm --filter @jlpt/schema build
node tools/content/n1-2025-07/repair.mjs plan
```

Before applying, require successful CI for the exact commit, owner authorization, and a fresh custom-format PostgreSQL backup validated with `pg_restore -l`:

```bash
node tools/content/n1-2025-07/repair.mjs apply
node tools/content/n1-2025-07/repair.mjs verify
```
