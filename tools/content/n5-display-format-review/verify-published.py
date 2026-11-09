import json
import os
import sys
import hashlib
from pathlib import Path

STORAGE_ROOT = Path("/var/lib/docker/volumes/jlpt-demo_staging-storage-data/_data")
EXAMS_DIR = STORAGE_ROOT / "exams"

dir_path = os.environ.get("N5_FMT_REPAIR_DIR")
if not dir_path:
    print("N5_FMT_REPAIR_DIR required", file=sys.stderr)
    sys.exit(1)

op_dir = Path(dir_path)
manifest_path = Path(__file__).parent / "manifest.json"
with open(manifest_path, "r", encoding="utf-8") as f:
    manifest = json.load(f)

mode = sys.argv[1] if len(sys.argv) > 1 else "baseline"

def sha256_file(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

if mode == "baseline":
    baseline = {}
    for fix in manifest["fixes"] + manifest["groupFixes"]:
        slug = fix["slug"]
        eid = fix["examId"]
        ver = fix["publishedVersion"]
        snap_file = EXAMS_DIR / eid / f"v{ver}" / "snapshot.json"
        if snap_file.exists():
            baseline[slug] = {
                "examId": eid,
                "version": ver,
                "sha256": sha256_file(snap_file)
            }
    with open(op_dir / "baseline-snapshots.json", "w", encoding="utf-8") as f:
        json.dump(baseline, f, indent=2)
    print(f"Recorded baseline for {len(baseline)} exams.")

elif mode == "verify":
    journal_path = op_dir / "journal.json"
    with open(journal_path, "r", encoding="utf-8") as f:
        journal = json.load(f)
    with open(op_dir / "baseline-snapshots.json", "r", encoding="utf-8") as f:
        baseline = json.load(f)

    for slug, base_info in baseline.items():
        eid = base_info["examId"]
        new_ver = journal["exams"][eid]
        new_snap_file = EXAMS_DIR / eid / f"v{new_ver}" / "snapshot.json"
        assert new_snap_file.exists(), f"New snapshot missing for {slug} v{new_ver}"
        assert sha256_file(new_snap_file) != base_info["sha256"], f"Snapshot unchanged for {slug}"
        print(f"Verified new snapshot for {slug} (v{base_info['version']} -> v{new_ver})")
    print("All published snapshots verified successfully.")
