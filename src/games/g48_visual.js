/* Реалистичные изображения и сцены с точечными изменениями. */
const VisualGames = {
  loading: new Map(),
  ready(keys) {
    return Promise.all(
      keys.map((key) => {
        if (!this.loading.has(key)) {
          const pending = new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = resolve;
            image.onerror = () => {
              this.loading.delete(key);
              reject(new Error("image"));
            };
            image.src = DATA.mediaAssets[key] || "";
          });
          this.loading.set(key, pending);
        }
        return this.loading.get(key);
      }),
    );
  },
  picture(scene, changes = []) {
    if (scene.source)
      return h(
        "div",
        {
          class: "scene-image",
          "data-variant": changes.length ? "after" : "before",
        },
        h("img", {
          src: changes.length ? scene.changedSource : scene.source,
          alt: scene.name,
          draggable: false,
        }),
      );
    return h(
      "div",
      { class: "scene-image" },
      h("img", {
        src: DATA.mediaAssets[scene.image],
        alt: scene.name,
        draggable: false,
      }),
      ...changes.map((change) => {
        const [x, y, w, hh] = change.rect;
        return h("img", {
          class: "scene-patch",
          src: DATA.mediaAssets[scene.altered],
          alt: "",
          draggable: false,
          style: {
            clipPath: `inset(${y * 100}% ${(1 - x - w) * 100}% ${(1 - y - hh) * 100}% ${x * 100}%)`,
          },
        });
      }),
    );
  },
  viewer(scene, options = {}) {
    let zoom = 1,
      expanded = false,
      previousFocus = null,
      cross = [0.5, 0.5],
      drag = null,
      placeholder = null;
    const marks = h("div", { class: "scene-marks", "aria-hidden": "true" }),
      surface = h(
        "div",
        {
          class: "scene-surface",
          tabindex: options.guess ? "0" : null,
          role: options.guess ? "button" : "img",
          "aria-label": options.guess
            ? "Поиск изменений. Стрелки двигают прицел, Enter отмечает место."
            : scene.name,
        },
        this.picture(scene, options.changes || []),
        marks,
      );
    const scroll = h("div", { class: "scene-scroll" }, surface),
      controls = h("div", { class: "scene-tools" }),
      wrap = h("div", { class: "scene-viewer" }, controls, scroll),
      label = h("span", { class: "scene-scale" }, "100%");
    const resize = (value) => {
      zoom = clamp(value, 1, 3);
      const maxHeight = expanded
        ? scroll.clientHeight
        : Math.min(innerHeight * 0.62, 720);
      const base = Math.min(scroll.clientWidth, (maxHeight * 4) / 3);
      surface.style.width = base * zoom + "px";
      label.textContent = Math.round(zoom * 100) + "%";
      minus.disabled = zoom === 1;
      plus.disabled = zoom === 3;
    };
    const minus = btn("−", () => resize(zoom - 0.5), "paper icon small", {
      "aria-label": "Уменьшить изображение",
      disabled: true,
    });
    const plus = btn("+", () => resize(zoom + 0.5), "paper icon small", {
      "aria-label": "Увеличить изображение",
    });
    const full = btn(
      "На весь экран",
      () => (expanded ? close() : open()),
      "paper small",
    );
    function close() {
      if (!expanded) return;
      expanded = false;
      root.inert = false;
      wrap.classList.remove("scene-fullscreen");
      wrap.removeAttribute("role");
      wrap.removeAttribute("aria-modal");
      placeholder.replaceWith(wrap);
      placeholder = null;
      full.textContent = "На весь экран";
      document.removeEventListener("keydown", key);
      if (previousFocus && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
      resize(zoom);
    }
    function key(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab") {
        const nodes = [
          ...wrap.querySelectorAll('button:not(:disabled),[tabindex="0"]'),
        ];
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0].focus();
        }
      }
    }
    function open() {
      previousFocus = document.activeElement;
      expanded = true;
      placeholder = h("span", { hidden: true });
      wrap.replaceWith(placeholder);
      document.body.append(wrap);
      wrap.classList.add("scene-fullscreen");
      wrap.setAttribute("role", "dialog");
      wrap.setAttribute("aria-modal", "true");
      wrap.setAttribute("aria-label", scene.name);
      root.inert = true;
      full.textContent = "Закрыть";
      document.addEventListener("keydown", key);
      full.focus();
      resize(zoom);
    }
    controls.append(minus, label, plus, full);
    const mark = (x, y, kind, text = "") =>
      marks.append(
        h(
          "span",
          {
            class: "scene-mark " + kind,
            style: { left: x * 100 + "%", top: y * 100 + "%" },
          },
          text,
        ),
      );
    const reticle = h("span", {
      class: "scene-reticle",
      hidden: true,
      "aria-hidden": "true",
    });
    marks.append(reticle);
    if (options.guess) {
      surface.addEventListener("pointerdown", (e) => {
        drag = [e.clientX, e.clientY];
      });
      surface.addEventListener("click", (e) => {
        if (drag && Math.hypot(e.clientX - drag[0], e.clientY - drag[1]) > 8) {
          drag = null;
          return;
        }
        drag = null;
        const rect = surface.getBoundingClientRect();
        options.guess(
          (e.clientX - rect.left) / rect.width,
          (e.clientY - rect.top) / rect.height,
        );
      });
      surface.addEventListener("keydown", (e) => {
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          e.preventDefault();
          cross[0] = clamp(
            cross[0] +
              (e.key === "ArrowLeft"
                ? -0.03
                : e.key === "ArrowRight"
                  ? 0.03
                  : 0),
            0.01,
            0.99,
          );
          cross[1] = clamp(
            cross[1] +
              (e.key === "ArrowUp" ? -0.03 : e.key === "ArrowDown" ? 0.03 : 0),
            0.01,
            0.99,
          );
          reticle.hidden = false;
          reticle.style.left = cross[0] * 100 + "%";
          reticle.style.top = cross[1] * 100 + "%";
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          options.guess(...cross);
        }
      });
    }
    const reflow = () => resize(zoom);
    const onVisibility = () => {
      if (document.hidden) close();
    };
    requestAnimationFrame(() => {
      reflow();
      if (options.focus && innerWidth < 900 && wrap.isConnected)
        wrap.scrollIntoView({ block: "center", behavior: "instant" });
    });
    window.addEventListener("resize", reflow);
    document.addEventListener("visibilitychange", onVisibility);
    onLeave(() => {
      close();
      window.removeEventListener("resize", reflow);
      document.removeEventListener("visibilitychange", onVisibility);
    });
    return { el: wrap, mark, close };
  },
  frame(api, content, ti, role, flagCards) {
    api.show(h("div", { class: "visual-game photo-game" }, content), {
      turn: ti,
      role,
      flagCards,
    });
    api.stage.classList.add("media-stage");
    api.stage.parentElement.classList.add("media-frame");
  },
  record(api, label) {
    if (api.n === 1)
      api.record({
        metric: "solo-score",
        label: "Очки",
        value: api.teams[0].score,
        settings: { ...api.opts, content: "photo-v3" },
        description:
          label +
          " · Раундов: " +
          api.opts.rounds +
          " · Ответ: " +
          api.opts.time +
          " с" +
          (api.opts.study ? " · Запоминание: " + api.opts.study + " с" : "") +
          (api.opts.changes ? " · Изменений: " + api.opts.changes : "") +
          (api.opts.questions ? " · Вопросов: " + api.opts.questions : "") +
          (api.opts.gap ? " · Переход: " + api.opts.gap + " с" : "") +
          (api.opts.level
            ? " · " + (api.opts.level === "hard" ? "Сложный" : "Обычный")
            : ""),
      });
  },
  after(api, last, next, label) {
    if (last) this.record(api, label);
    const finish = () => {
      if (!last || api.n > 1) return next();
      const max =
          api.opts.rounds *
          (api.game.id === "snapshot"
            ? api.opts.questions * 5
            : api.opts.changes * 3),
        score = api.teams[0].score,
        passed = score / max >= 0.7;
      api.end({
        custom: true,
        win: passed,
        title: passed
          ? score === max && !api.sceneMistakes
            ? "Без единой ошибки!"
            : api.game.id === "snapshot"
              ? "Отличная память!"
              : "Отличная наблюдательность!"
          : "Попробуйте ещё",
        sub: "Результат: " + score + " из " + max + " очков",
        lines: ["Цель — набрать не менее 70% очков."],
      });
    };
    return btn(last ? "Итоги" : "Дальше", finish, "big", {
      "data-primary": true,
    });
  },
  rounds: {
    key: "rounds",
    label: "Раундов у каждого участника",
    values: [3, 5, 8],
    def: 3,
  },
  time: {
    key: "time",
    label: "Время на ответ",
    values: [
      [30, "30 секунд"],
      [45, "45 секунд"],
      [60, "60 секунд"],
    ],
    def: 45,
  },
  study: {
    key: "study",
    label: "Время запоминания",
    values: [
      [6, "6 секунд"],
      [10, "10 секунд"],
      [15, "15 секунд"],
      [20, "20 секунд"],
      [30, "30 секунд"],
    ],
    def: 10,
  },
  level: {
    key: "level",
    label: "Сложность",
    values: [
      ["normal", "Обычная"],
      ["hard", "Сложная: мелкие детали"],
    ],
    def: "hard",
  },
  gap: {
    key: "gap",
    label: "Отвлекающий переход",
    values: [
      [3, "3 секунды"],
      [5, "5 секунд"],
      [8, "8 секунд"],
    ],
    def: 5,
  },
};
function photographicRound(api, deck, ti, k, total, next, last, memory) {
  const template = deck.draw(),
    found = new Set(),
    results = [];
  let scene,
    selected = [],
    questions = [],
    phase = "ready",
    alive = true,
    misses = 0,
    viewer = null,
    timer = null,
    questionIndex = 0;
  const heading = h(
    "div",
    { class: "photo-scene-title" },
    h(
      "span",
      { class: "photo-eyebrow" },
      memory ? "ПАМЯТЬ НА ДЕТАЛИ" : "ВНИМАНИЕ К ДЕТАЛЯМ",
    ),
    h("h2", null, template.name),
    h("p", null, template.subtitle),
  );
  const status = h("p", { class: "photo-feedback", "aria-live": "polite" }),
    body = h("div", { class: "scene-body" }),
    actions = h("div", { class: "row" }),
    clock = h("div", { class: "scene-clock" }),
    chips = h("div", { class: "photo-progress" });
  function finish(text) {
    if (phase !== "answer") return;
    phase = "done";
    if (timer) timer.stop();
    if (viewer) viewer.close();
    status.textContent = text;
    if (!memory) {
      selected.forEach((c, i) => {
        if (!found.has(c.id))
          viewer.mark(
            c.rect[0] + c.rect[2] / 2,
            c.rect[1] + c.rect[3] / 2,
            "reveal",
            i + 1,
          );
      });
      body.append(
        h(
          "ol",
          { class: "scene-answer-list" },
          ...selected.map((c) =>
            h("li", null, (found.has(c.id) ? "✓ " : "○ ") + c.label),
          ),
        ),
      );
      body.append(
        h(
          "details",
          { class: "scene-original" },
          h("summary", null, "Исходная сцена"),
          VisualGames.picture(scene),
        ),
      );
    } else
      body.replaceChildren(
        h(
          "ol",
          { class: "scene-answer-list" },
          ...results.map((row) =>
            h(
              "li",
              null,
              (row.ok ? "✓ " : "○ ") + row.question.q + " — " + row.question.a,
            ),
          ),
        ),
        VisualGames.viewer(scene).el,
      );
    actions.replaceChildren(
      VisualGames.after(
        api,
        last,
        next,
        memory ? "Сцены: память на детали" : "Сцены: поиск изменений",
      ),
    );
  }
  const progress = () =>
    chips.replaceChildren(
      h(
        "span",
        null,
        memory
          ? "Вопрос " + (questionIndex + 1) + " / " + questions.length
          : "Найдено " + found.size + " / " + selected.length,
      ),
      !memory ? h("span", null, "Ошибки " + misses + " / 3") : null,
    );
  function question() {
    const index = questionIndex,
      q = questions[index];
    progress();
    status.textContent = q.q;
    const choices = shuffle(q.choices),
      buttons = choices.map((value) =>
        btn(value, () => answer(value === q.a), "paper visual-answer"),
      );
    body.replaceChildren(
      h(
        "div",
        { class: "photo-memory-cover", "aria-hidden": "true" },
        h("span", null, "✦"),
        h("p", null, "Вспомните детали"),
      ),
      h("div", { class: "visual-answers" }, buttons),
    );
    function answer(ok) {
      if (
        phase !== "answer" ||
        questionIndex !== index ||
        results.length > index
      )
        return;
      timer.stop();
      results.push({ question: q, ok });
      buttons.forEach((b) => (b.disabled = true));
      if (ok) {
        api.score(ti, 5);
        sfx.ok();
      } else {
        api.sceneMistakes++;
        sfx.bad();
      }
      if (questionIndex === questions.length - 1)
        finish(
          "Верных ответов: " +
            results.filter((r) => r.ok).length +
            " из " +
            questions.length,
        );
      else {
        status.textContent = "Ответ принят. Следующий вопрос — о той же сцене.";
        actions.replaceChildren(
          btn(
            "Следующий вопрос",
            () => {
              if (questionIndex !== index || phase !== "answer") return;
              questionIndex++;
              question();
            },
            "big",
          ),
        );
      }
    }
    timer = Timer(api.opts.time, { onEnd: () => answer(false) });
    clock.replaceChildren(timer.el);
    timer.start();
    actions.replaceChildren(btn("Не помню", () => answer(false), "paper"));
  }
  function search() {
    if (phase !== "transition") return;
    phase = "answer";
    if (viewer) viewer.close();
    if (memory) return question();
    viewer = VisualGames.viewer(scene, {
      focus: true,
      changes: selected,
      guess: (x, y) => {
        if (phase !== "answer") return;
        const hit = selected.find((c) => {
          const [cx, cy, w, hh] = c.rect;
          return (
            x >= cx - 0.006 &&
            x <= cx + w + 0.006 &&
            y >= cy - 0.006 &&
            y <= cy + hh + 0.006
          );
        });
        if (hit && found.has(hit.id)) return;
        if (hit) {
          found.add(hit.id);
          api.score(ti, 3);
          sfx.ok();
          viewer.mark(
            hit.rect[0] + hit.rect[2] / 2,
            hit.rect[1] + hit.rect[3] / 2,
            "found",
            "✓",
          );
        } else {
          misses++;
          api.sceneMistakes++;
          if (api.teams[ti].score > 0) api.score(ti, -1);
          sfx.bad();
          viewer.mark(x, y, "miss", "×");
        }
        progress();
        if (found.size === selected.length) finish("Все изменения найдены!");
        else if (misses === 3)
          finish("Три ошибки. Посмотрите, что изменилось.");
      },
    });
    body.replaceChildren(viewer.el);
    status.textContent =
      "Найдите изменившиеся детали. Ошибка отнимает одно очко.";
    progress();
    timer = Timer(api.opts.time, {
      onEnd: () => finish("Время вышло. Изменения отмечены на сцене."),
    });
    clock.replaceChildren(timer.el);
    timer.start();
    actions.replaceChildren(
      btn(
        "Завершить раунд",
        () => finish("Посмотрите, что изменилось."),
        "paper",
      ),
    );
  }
  function transition() {
    if (phase !== "study") return;
    phase = "transition";
    viewer.close();
    viewer = null;
    body.replaceChildren();
    actions.replaceChildren();
    chips.replaceChildren();
    status.textContent =
      "Переключите внимание. Через несколько секунд начнётся " +
      (memory ? "проверка памяти." : "поиск изменений.");
    let tasks = 0;
    function task() {
      if (phase !== "transition") return;
      const a = rnd(8) + 2,
        b = rnd(8) + 1,
        correct = a + b,
        values = shuffle([
          correct,
          ...sample(
            range(20).filter((n) => n !== correct),
            5,
          ),
        ]);
      let answered = false;
      const feedback = h("p", {
          class: "attention-feedback",
          "aria-live": "polite",
        }),
        buttons = values.map((value) =>
          btn(
            String(value),
            () => {
              if (answered || phase !== "transition") return;
              answered = true;
              buttons.forEach((button) => (button.disabled = true));
              tasks++;
              feedback.textContent =
                value === correct
                  ? "Верно. Сменим фокус ещё раз."
                  : "Ответ: " + correct + ". Продолжим.";
              api.delay(task, 450);
            },
            "paper attention-answer",
          ),
        );
      body.replaceChildren(
        h(
          "div",
          { class: "attention-card" },
          h("span", { class: "photo-eyebrow" }, "СМЕНА ФОКУСА"),
          h("h3", null, a + " + " + b + " = ?"),
          h("p", null, "Короткая разминка. Она не влияет на очки."),
          h("div", { class: "attention-answers" }, buttons),
          feedback,
        ),
      );
    }
    task();
    timer = Timer(api.opts.gap || 5, { onEnd: search, quiet: true });
    clock.replaceChildren(timer.el);
    timer.start();
    body.querySelector("button")?.focus({ preventScroll: true });
  }
  function study() {
    if (phase !== "ready") return;
    phase = "loading";
    status.textContent = "Подготавливаем новый вариант сцены…";
    actions.replaceChildren();
    PhotoScenes.build(template, api.opts, memory)
      .then(async (prepared) => {
        await Promise.all(
          [prepared.source, prepared.changedSource].filter(Boolean).map(
            (src) =>
              new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = resolve;
                image.onerror = reject;
                image.src = src;
              }),
          ),
        );
        if (!alive || G.api !== api) return;
        scene = prepared;
        selected = scene.changes;
        questions = memory
          ? PhotoScenes.pickQuestions(
              scene,
              api.opts.questions || 3,
              api.opts.level !== "normal",
            )
          : [];
        scene.roundQuestions = questions;
        api.sceneRound = scene;
        phase = "study";
        status.textContent = memory
          ? "Запомните мелкие детали. После сцены будет отвлекающее задание."
          : "Рассмотрите детали. После отвлекающего задания найдите " +
            selected.length +
            " " +
            plural(selected.length, "изменение", "изменения", "изменений") +
            ".";
        viewer = VisualGames.viewer(scene, { focus: true });
        body.replaceChildren(viewer.el);
        timer = Timer(api.opts.study, { onEnd: transition });
        clock.replaceChildren(timer.el);
        timer.start();
      })
      .catch(() => {
        if (!alive) return;
        phase = "ready";
        status.textContent =
          "Не удалось подготовить сцену. Попробуйте ещё раз.";
        actions.replaceChildren(btn("Попробовать ещё раз", study, "paper"));
      });
  }
  VisualGames.frame(
    api,
    [
      turnHead(api, ti, "Сцена " + k + " / " + total),
      h(
        "section",
        { class: "photo-panel scene-panel" },
        heading,
        chips,
        status,
        body,
        clock,
      ),
      actions,
    ],
    ti,
    memory ? "Запоминает детали" : "Ищет изменения",
    [],
  );
  onLeave(() => {
    alive = false;
    if (viewer) viewer.close();
  });
  body.replaceChildren(
    h(
      "div",
      { class: "scene-invitation" },
      h("span", null, memory ? "◈" : "⌖"),
      h(
        "p",
        null,
        "Новый вариант сцены в каждом раунде. Рассмотрите детали, затем переключите внимание и проверьте себя.",
      ),
    ),
  );
  status.textContent =
    "Для успешного прохождения одному нужно набрать не менее 70% очков.";
  actions.append(
    btn("Рассмотреть сцену", study, "big", { "data-primary": true }),
  );
}

{
  const deck = makeDeck("photo_changes_v3", DATA.visual.scenes);
  registerGame({
    id: "changes",
    title: "Что изменилось?",
    icon: "🪄",
    color: "#69bca2",
    familySafe: true,
    cats: ["Музыка и картинки", "Для компании", "Для двоих"],
    teams: { min: 1, max: 8 },
    mins: 12,
    tagline:
      "Рассмотрите реалистичную сцену: мастерскую, кухню или кабинет. Найдите изменившиеся детали.",
    rules:
      "<ul><li>Нажмите «Рассмотреть сцену» и запомните детали. Затем будет отвлекающее задание и изменённое изображение.</li><li>Нажимайте прямо на изменившиеся предметы. Каждая найденная деталь приносит 3 очка, повторные нажатия не учитываются.</li><li>Можно увеличить сцену до 300%, двигать её и открыть на весь экран. Отсчёт при увеличении продолжается.</li><li>Ошибка отнимает 1 очко, три ошибки или конец времени завершают раунд. В конце показаны все изменения и исходная сцена.</li></ul>",
    opts: [
      VisualGames.rounds,
      VisualGames.study,
      VisualGames.time,
      VisualGames.level,
      VisualGames.gap,
      { key: "changes", label: "Изменений в сцене", values: [1, 3, 5], def: 3 },
    ],
    cards: () => DATA.visual.scenes.length,
    start(api) {
      api.sceneMistakes = 0;
      rotate(api, api.opts.rounds, (ti, k, total, next, last) =>
        photographicRound(api, deck, ti, k, total, next, last, false),
      );
    },
  });
}
{
  const deck = makeDeck("photo_snapshot_v3", DATA.visual.scenes);
  registerGame({
    id: "snapshot",
    title: "Запомни картинку",
    icon: "🖼️",
    color: "#aa8bd6",
    familySafe: true,
    cats: ["Музыка и картинки", "Викторины", "Для компании", "Для двоих"],
    teams: { min: 1, max: 8 },
    mins: 12,
    tagline:
      "Погрузитесь в детальную сцену и ответьте на несколько вопросов о том, что запомнили.",
    rules:
      "<ul><li>Рассмотрите сцену до конца отсчёта. Можно увеличить её и изучить детали.</li><li>Затем изображение исчезнет и появится отвлекающее задание. Ответьте на один, три или пять вопросов о мелких деталях.</li><li>Верный ответ — 5 очков. На каждый вопрос отводится своё время. Все ответы и исходная сцена открываются после последнего вопроса.</li><li>В компании участники отвечают по очереди. Одиночное прохождение успешно, если набрано не менее 70% очков.</li></ul>",
    opts: [
      VisualGames.rounds,
      VisualGames.study,
      VisualGames.time,
      VisualGames.level,
      VisualGames.gap,
      {
        key: "questions",
        label: "Вопросов к сцене",
        values: [1, 3, 5],
        def: 3,
      },
    ],
    cards: () =>
      DATA.visual.scenes.reduce(
        (sum, s) =>
          sum +
          s.questions.length +
          s.details.filter(
            (op) => op.q && !s.questions.some((q) => q.q === op.q),
          ).length,
        0,
      ),
    start(api) {
      api.sceneMistakes = 0;
      rotate(api, api.opts.rounds, (ti, k, total, next, last) =>
        photographicRound(api, deck, ti, k, total, next, last, true),
      );
    },
  });
}
