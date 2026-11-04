#!/bin/bash
# verify.sh N : обработать чанк verify/in/N.txt -> verify/out/N.jsonl (через codex, без инструментов)
cd "$(dirname "$0")"; n=$1
[ -s verify/out/$n.jsonl ] && exit 0
{ cat verify/prompt.txt; cat verify/in/$n.txt; } | timeout 900 codex exec --skip-git-repo-check -c 'sandbox_mode="read-only"' -o verify/raw/$n.txt - >/dev/null 2>&1
grep -E '^\{.*\}$' verify/raw/$n.txt > verify/out/$n.jsonl
