/* Встроенные инструментальные версии: мягкая атака, обертоны и басовая опора. */
const MelodyAudio = {
  create(api, melody, changed) {
    let interval = null,
      oscillator = null,
      gain = null,
      support = null,
      supportGain = null,
      wave = null,
      current = -1,
      started = 0,
      limit = 0,
      context = null,
      active = false,
      disposed = false,
      generation = 0;
    let offset = 0;
    const notes = melody.notes.map(([pitch, beats]) => {
      const note = { pitch, from: offset, duration: (beats * 60) / melody.bpm };
      offset += note.duration;
      return note;
    });
    function silence() {
      if (oscillator) {
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch (e) {}
        oscillator = null;
      }
      if (gain) {
        try {
          gain.disconnect();
        } catch (e) {}
        gain = null;
      }
      if (support) {
        try {
          support.stop();
          support.disconnect();
        } catch (e) {}
        support = null;
      }
      if (supportGain) {
        supportGain.disconnect();
        supportGain = null;
      }
      current = -1;
    }
    function stop() {
      generation++;
      active = false;
      clearInterval(interval);
      interval = null;
      silence();
      changed(false);
    }
    function tick() {
      if (!active) return;
      if (disposed || G.api !== api || api.finished) return stop();
      const elapsed = (api.now() - started) / 1000;
      if (elapsed >= limit) return stop();
      if (
        GameClock.paused ||
        document.hidden ||
        sfx.muted ||
        Settings.get("vol") <= 0
      ) {
        silence();
        return;
      }
      const index = notes.findIndex(
        (note) => elapsed >= note.from && elapsed < note.from + note.duration,
      );
      if (index < 0 || index === current) return;
      silence();
      current = index;
      const note = notes[index],
        duration = Math.max(
          0.01,
          Math.min(note.from + note.duration - elapsed, limit - elapsed),
        );
      try {
        oscillator = context.createOscillator();
        gain = context.createGain();
        if (!wave)
          wave = context.createPeriodicWave(
            new Float32Array(9),
            new Float32Array([
              0, 1, 0.38, 0.18, 0.09, 0.05, 0.025, 0.012, 0.006,
            ]),
          );
        oscillator.setPeriodicWave(wave);
        oscillator.frequency.value = 440 * Math.pow(2, (note.pitch - 69) / 12);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.linearRampToValueAtTime(
          0.23 * Settings.get("vol"),
          context.currentTime + 0.006,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.025 * Settings.get("vol") + 0.0001,
          context.currentTime + Math.max(0.015, duration * 0.65),
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + Math.max(0.02, duration * 0.98),
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
        const chords = melody.chords ||
          {
            joy: [48, 55, 48, 55],
            elise: [45, 52, 45, 52],
            bells: [48, 53, 55, 48],
          }[melody.id] || [48, 55, 53, 55];
        const root =
          chords[Math.floor((note.from * melody.bpm) / 60 / 4) % chords.length];
        support = context.createOscillator();
        support.type = "sine";
        support.frequency.value = 440 * Math.pow(2, (root - 69) / 12);
        supportGain = context.createGain();
        supportGain.gain.setValueAtTime(
          0.045 * Settings.get("vol"),
          context.currentTime,
        );
        supportGain.gain.exponentialRampToValueAtTime(
          0.0001,
          context.currentTime + Math.max(0.02, duration),
        );
        support.connect(supportGain);
        supportGain.connect(context.destination);
        support.start();
        support.stop(context.currentTime + duration);
      } catch (e) {
        stop();
      }
    }
    document.addEventListener("visibilitychange", silence);
    return {
      async play(seconds) {
        stop();
        const attempt = generation;
        if (
          disposed ||
          sfx.muted ||
          Settings.get("vol") <= 0 ||
          GameClock.paused
        )
          return false;
        try {
          context = sfx.ctx();
          if (!context) return false;
          if (context.state === "suspended") await context.resume();
          if (
            context.state !== "running" ||
            disposed ||
            attempt !== generation ||
            G.api !== api ||
            api.finished
          )
            return false;
          limit = Math.min(seconds, offset);
          started = api.now();
          active = true;
          changed(true);
          tick();
          if (!active) return false;
          interval = setInterval(tick, 20);
          return true;
        } catch (e) {
          return false;
        }
      },
      stop,
      dispose() {
        disposed = true;
        document.removeEventListener("visibilitychange", silence);
        stop();
      },
      get playing() {
        return active;
      },
    };
  },
};

{
  const deck = makeDeck("melodies", DATA.melodies);
  registerGame({
    id: "melody",
    hidden: true,
    title: "Угадай мелодию",
    icon: "🎵",
    color: "#df83aa",
    familySafe: true,
    noMusic: true,
    cats: ["Музыка и картинки", "Викторины", "Для компании", "Для двоих"],
    teams: { min: 1, max: 8 },
    mins: 12,
    tagline:
      "Узнайте знакомый мотив за 3 секунды. Более длинный фрагмент стоит очков.",
    rules:
      "<ul><li>Нажмите «Слушать». Во встроенном наборе звучат инструментальные версии знакомых мелодий. В «Моей музыке» используются исходные записи с устройства, включая вокал.</li><li>Фрагмент на 3 секунды даёт 5 очков, на 6 секунд — 3 очка, на 12 секунд — 1 очко. Повтор того же фрагмента бесплатный.</li><li>Выберите название или введите его, если выбран режим без вариантов. Неверный ответ и конец времени завершают раунд без очков.</li><li>Таймер ответа начинается после первого воспроизведения. Пауза и окна останавливают мелодию и время; после закрытия звучание продолжается.</li><li>Звук мелодии зависит от общей громкости, но не от настройки звуковых эффектов и фоновой музыки. Для игры нужен включённый звук.</li></ul>",
    opts: [
      VisualGames.rounds,
      VisualGames.time,
      {
        key: "answer",
        label: "Как отвечать",
        values: [
          ["choice", "Четыре варианта"],
          ["text", "Ввести название"],
        ],
        def: "choice",
      },
      {
        key: "repertoire",
        label: "Репертуар",
        values: [
          ["familiar", "Знакомые мелодии"],
          ["all", "Весь встроенный набор"],
          ["local", "Моя музыка — оригинальные записи"],
        ],
        def: "familiar",
      },
    ],
    setupExtra: () =>
      h(
        "div",
        { class: "music-library-entry" },
        btn(
          "Моя музыка — оригинальные записи",
          () => MelodyLibrary.show(),
          "paper",
        ),
        h(
          "small",
          null,
          "Добавьте песни с устройства и выберите узнаваемый фрагмент.",
        ),
      ),
    cards: () => DATA.melodies.length,
    start(api) {
      const begin = (pool) => {
        const local = api.opts.repertoire === "local",
          fingerprint = local ? MelodyLibrary.fingerprint(pool) : "builtin-v2";
        const sourceDeck = local
          ? makeDeck("music.local." + fingerprint, pool, false)
          : deck;
        rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
          const melody = sourceDeck.draw((m) =>
              pool.some((p) => p.id === m.id),
            ),
            choices = shuffle([
              melody,
              ...sample(
                [
                  ...new Map(
                    pool.map((m) => [MelodyLibrary.titleKey(m.name), m]),
                  ).values(),
                ].filter(
                  (m) =>
                    MelodyLibrary.titleKey(m.name) !==
                    MelodyLibrary.titleKey(melody.name),
                ),
                3,
              ),
            ]);
          const lengths = [3, 6, 12]
            .map((seconds) =>
              local
                ? Math.min(seconds, melody.duration - melody.start)
                : seconds,
            )
            .filter(
              (seconds, i, values) => i === 0 || seconds > values[i - 1] + 0.01,
            );
          const clipLabel = (index) => Math.round(lengths[index] * 10) / 10;
          let level = 0,
            done = false,
            heard = false,
            busy = false,
            roundAlive = true;
          const note = h("p", { class: "mid-t", "aria-live": "polite" }),
            status = h("p", { class: "melody-status" }),
            worth = h("p", { class: "kicker" }),
            controls = h("div", { class: "row melody-controls" }),
            after = h("div", { class: "row" });
          const disc = h(
            "div",
            { class: "melody-disc", "aria-hidden": "true" },
            h("span", null, "♪"),
          );
          const audio = (local ? RecordedMelodyAudio : MelodyAudio).create(
            api,
            melody,
            (playing) => {
              disc.classList.toggle("playing", playing);
              status.textContent = playing
                ? "Слушайте…"
                : heard
                  ? "Можно повторить фрагмент"
                  : "Нажмите «Слушать»";
            },
          );
          const points = () => [5, 3, 1][level];
          const timer = Timer(api.opts.time, {
            onEnd: () => finish(false, "Время вышло."),
          });
          const buttons = choices.map((item) =>
            btn(
              item.name,
              () =>
                finish(
                  item.id === melody.id,
                  item.id === melody.id ? "Верно!" : "Не угадали.",
                ),
              "paper visual-answer",
              { disabled: true },
            ),
          );
          const input = h("input", {
            class: "input",
            "aria-label": "Название мелодии",
            placeholder: "Введите название",
            maxlength: 100,
            autocomplete: "off",
            disabled: true,
          });
          const check = h(
            "button",
            { type: "submit", class: "btn good", disabled: true },
            "Проверить",
          );
          const normalize = (text) =>
            text
              .normalize("NFC")
              .toLowerCase()
              .replace(/ё/g, "е")
              .replace(/[^a-zа-я0-9]/g, "");
          const aliases = () => [
            melody.name,
            ...(melody.aliases || []),
            ...({
              joy: ["Ode to Joy"],
              elise: ["Für Elise", "Fur Elise", "Элизе"],
              star: ["Twinkle Twinkle Little Star", "Ah vous dirai je maman"],
              bells: ["Джингл беллс", "Джингл беллз"],
              jacques: ["Frere Jacques", "Frère Jacques"],
              bridge: ["London Bridge"],
              syne: ["Auld Lang Syne"],
              greensleeves: ["Greensleeves"],
            }[melody.id] || []),
          ];
          const form = h(
            "form",
            {
              class: "an-answer",
              onsubmit: (e) => {
                e.preventDefault();
                if (!input.value.trim() || !heard || done) return;
                const ok = aliases().some(
                  (name) => normalize(name) === normalize(input.value),
                );
                finish(ok, ok ? "Верно!" : "Не угадали.");
              },
            },
            input,
            check,
          );
          const listen = btn("Слушать · 3 с", () => play(level), "big", {
            "data-primary": true,
          });
          const longer = btn(
            "Больше мелодии · 6 с",
            () => play(level + 1),
            "paper",
          );
          function paint() {
            worth.textContent =
              "Фрагмент: " +
              clipLabel(level) +
              " с · За ответ: " +
              pts(points());
            listen.textContent =
              (heard ? "Повторить" : "Слушать") +
              " · " +
              clipLabel(level) +
              " с";
            longer.textContent =
              level < lengths.length - 1
                ? "Больше мелодии · " + clipLabel(level + 1) + " с"
                : "Весь фрагмент открыт";
            longer.disabled = done || busy || level === lengths.length - 1;
            listen.disabled = done || busy;
          }
          async function play(targetLevel) {
            if (done || busy || targetLevel >= lengths.length) return;
            busy = true;
            paint();
            const ok = await audio.play(lengths[targetLevel]);
            busy = false;
            if (!roundAlive || done || G.api !== api) return;
            if (ok) {
              level = targetLevel;
              if (!heard) {
                heard = true;
                timer.start();
                buttons.forEach((b) => (b.disabled = false));
                input.disabled = false;
                check.disabled = false;
              }
              note.replaceChildren();
            } else {
              note.replaceChildren(
                "Звук не запустился. Проверьте общую громкость и звук браузера. ",
                sfx.muted
                  ? btn(
                      "Включить звук",
                      () => {
                        document.querySelector('[aria-label="Звук"]').click();
                        note.textContent = "Теперь нажмите «Слушать».";
                      },
                      "paper small",
                    )
                  : null,
              );
            }
            paint();
          }
          function finish(ok, text) {
            if (done || !heard) return;
            const earned = ok ? points() : 0;
            done = true;
            timer.stop();
            audio.stop();
            buttons.forEach((button, i) => {
              button.disabled = true;
              button.classList.toggle("good", choices[i].id === melody.id);
            });
            input.disabled = true;
            check.disabled = true;
            if (ok) {
              api.score(ti, earned);
              sfx.ok();
            } else sfx.bad();
            note.textContent =
              text +
              " " +
              melody.name +
              " · " +
              melody.author +
              (ok ? " · +" + pts(earned) : "");
            controls.replaceChildren();
            if (last && api.n === 1)
              api.record({
                metric: "solo-score",
                label: "Очки",
                value: api.teams[0].score,
                settings: { ...api.opts, library: fingerprint },
                description:
                  (local
                    ? "Оригинальные записи из моей музыки"
                    : "Знакомые мелодии · Инструментальные версии") +
                  " · Раундов: " +
                  api.opts.rounds +
                  " · Ответ: " +
                  api.opts.time +
                  " с · " +
                  (api.opts.answer === "text"
                    ? "Ввод названия"
                    : "Четыре варианта"),
              });
            after.replaceChildren(
              btn(last ? "Итоги" : "Дальше", next, "big", {
                "data-primary": true,
              }),
            );
          }
          controls.append(listen, longer);
          api.show(
            h(
              "div",
              { class: "visual-game" },
              turnHead(api, ti, "Мелодия " + k + " из " + total),
              h(
                "div",
                { class: "card visual-card melody-card" },
                worth,
                disc,
                status,
                timer.el,
              ),
              controls,
              api.opts.answer === "text"
                ? form
                : h("div", { class: "visual-answers" }, buttons),
              note,
              after,
            ),
            { turn: ti, role: "Узнаёт мелодию" },
          );
          api.stage.classList.add("media-stage");
          api.stage.parentElement.classList.add("media-frame");
          onLeave(() => {
            roundAlive = false;
            audio.dispose();
          });
          paint();
          status.textContent = "Нажмите «Слушать»";
        });
      };
      if (api.opts.repertoire === "local") {
        api.show(h("div", { class: "card" }, "Открываем личную медиатеку…"), {
          turn: 0,
          role: "Выбирает музыку",
          flagCards: [],
        });
        MelodyLibrary.init().then(() => {
          if (G.api !== api || api.finished) return;
          const pool = MelodyLibrary.rows.slice();
          if (
            !pool.length ||
            (api.opts.answer === "choice" &&
              new Set(pool.map((r) => MelodyLibrary.titleKey(r.name))).size < 4)
          ) {
            api.show(
              h(
                "div",
                { class: "card" },
                h("h2", null, "Добавьте музыку"),
                h(
                  "p",
                  null,
                  !pool.length
                    ? "Личная медиатека пока пуста."
                    : "Для вариантов ответа нужны четыре разных названия. Можно выбрать ввод названия в меню игры.",
                ),
                btn("Моя музыка", () => MelodyLibrary.show(), "big"),
                btn("В меню игры", () => Intro(api.game), "paper"),
              ),
              { turn: 0, role: "Настраивает музыку", flagCards: [] },
            );
          } else begin(pool);
        });
      } else
        begin(
          DATA.melodies.filter(
            (m) => api.opts.repertoire === "all" || m.familiar,
          ),
        );
    },
  });
}
