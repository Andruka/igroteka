#!/bin/bash
# chk.sh <имя чанка, напр. taboo_0>: проверка codex -> work/chk/out/<имя>.json {"bad":[номера]}
cd "$(dirname "$0")/work/chk"; f=$1; t=${f%_*}
[ -s out/$f.json ] && exit 0
{ cat ../../prompts/$t.txt; echo; cat in/$f.txt; } | timeout 900 codex exec --skip-git-repo-check -c 'sandbox_mode="read-only"' -o raw/$f.txt - >/dev/null 2>&1
grep -oE '\{"bad":\[[0-9, ]*\]\}' raw/$f.txt | tail -1 > out/$f.json
