#!/bin/bash
# Генерация недостающих файлов через codex. Использование: run_codex.sh cat level "Описание категории" "Описание уровня"
cd "$(dirname "$0")"
cat=$1; lvl=$2; desc=$3; lv=$4
[ -f raw/${cat}_${lvl}.jsonl ] && exit 0
codex exec --skip-git-repo-check --sandbox workspace-write -C "$(pwd)" \
 "Прочитай SPEC.md и строго следуй ему. Категория: $cat — $desc. Уровень: $lvl ($lv). Напиши 130 разных вопросов и запиши в файл raw/${cat}_${lvl}.jsonl (одна JSON-строка на вопрос: {\"q\",\"a\",\"w\":[3 неверных]}). Проверь python3 -c: валидный JSON, w ровно 3, нет дублей. Ответь одной строкой." \
 > /tmp/claude-1000/codex_${cat}_${lvl}.log 2>&1
