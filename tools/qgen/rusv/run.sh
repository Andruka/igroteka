#!/bin/bash
cd "$(dirname "$0")"; n=$1
[ -s out/$n.jsonl ] && exit 0
{ cat prompt.txt; cat in/$n.txt; } | timeout 900 codex exec --skip-git-repo-check -c 'sandbox_mode="read-only"' -o raw/$n.txt - >/dev/null 2>&1
grep -E '^\{.*\}$' raw/$n.txt > out/$n.jsonl
