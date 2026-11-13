/* Личная музыка хранится только в браузере. Файлы не отправляются на сервер. */
const MelodyLibrary = {
  rows: [],
  db: null,
  pending: null,
  persisted: true,
  init() {
    if (this.pending) return this.pending;
    this.pending = new Promise((resolve) => {
      try {
        const request = indexedDB.open("igroteka.music", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("tracks", { keyPath: "id" });
        request.onerror = () => {
          this.persisted = false;
          resolve();
        };
        request.onblocked = () => {
          this.persisted = false;
          resolve();
        };
        request.onsuccess = () => {
          this.db = request.result;
          this.db.onversionchange = () => {
            this.db.close();
            this.db = null;
          };
          const read = this.db
            .transaction("tracks")
            .objectStore("tracks")
            .getAll();
          read.onsuccess = () => {
            this.rows = read.result
              .filter(
                (row) =>
                  row &&
                  typeof row.id === "string" &&
                  row.blob instanceof Blob &&
                  typeof row.name === "string" &&
                  Number.isFinite(row.duration) &&
                  row.duration > 0.5 &&
                  Number.isFinite(row.start) &&
                  row.start >= 0 &&
                  row.start < row.duration,
              )
              .slice(0, 30);
            resolve();
          };
          read.onerror = () => {
            this.persisted = false;
            resolve();
          };
        };
      } catch (e) {
        this.persisted = false;
        resolve();
      }
    });
    return this.pending;
  },
  write(row, remove = false) {
    return new Promise((resolve) => {
      if (!this.db) {
        this.persisted = false;
        resolve(false);
        return;
      }
      try {
        const transaction = this.db.transaction("tracks", "readwrite"),
          store = transaction.objectStore("tracks");
        if (remove) store.delete(row.id);
        else store.put(row);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = transaction.onabort = () => {
          this.persisted = false;
          resolve(false);
        };
      } catch (e) {
        this.persisted = false;
        resolve(false);
      }
    });
  },
  async add(file) {
    await this.init();
    if (this.rows.length >= 30)
      throw new Error("В медиатеке уже 30 записей. Удалите лишние.");
    if (file.size > 30 * 1024 * 1024)
      throw new Error("Файл больше 30 МБ. Выберите более короткую запись.");
    const context = sfx.ctx();
    if (!context) throw new Error("Браузер не поддерживает воспроизведение.");
    let buffer;
    try {
      buffer = await context.decodeAudioData(await file.arrayBuffer());
    } catch (e) {
      throw new Error(
        "Не удалось прочитать аудиофайл. Попробуйте MP3, M4A, OGG или WAV.",
      );
    }
    if (buffer.duration < 1)
      throw new Error("Запись должна быть длиннее секунды.");
    const raw = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " "),
      parts = raw.split(/\s+[-–—]\s+/);
    const row = {
      id: newRunId(),
      name:
        (parts.length > 1 ? parts.slice(1).join(" — ") : raw).slice(0, 100) ||
        "Без названия",
      author: parts.length > 1 ? parts[0].slice(0, 80) : "",
      duration: buffer.duration,
      start: 0,
      blob: file,
      version: newRunId(),
    };
    const saved = await this.write(row);
    row.sessionOnly = !saved;
    this.rows.push(row);
    return row;
  },
  async update(row, values) {
    const next = { ...row, ...values, version: newRunId(), sessionOnly: false };
    const saved = await this.write(next);
    Object.assign(row, next, { sessionOnly: !saved });
    return saved;
  },
  titleKey(value) {
    return value
      .normalize("NFC")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^а-яa-z0-9]/g, "");
  },
  async remove(row) {
    const ok = await this.write(row, true);
    if (ok || row.sessionOnly) this.rows = this.rows.filter((r) => r !== row);
    return ok || row.sessionOnly;
  },
  fingerprint(rows) {
    let hash = 14695981039346656037n;
    for (const char of rows
      .map((r) => r.id + ":" + r.version)
      .sort()
      .join("|"))
      hash = BigInt.asUintN(
        64,
        (hash ^ BigInt(char.charCodeAt(0))) * 1099511628211n,
      );
    return hash.toString(16);
  },
  async show() {
    leaveSession();
    Music.stop();
    Voice.stop();
    await this.init();
    let activeURL = null,
      preview = null;
    const message = h("p", { class: "photo-feedback", "aria-live": "polite" }),
      list = h("div", { class: "music-library-list" });
    const launch = btn(
      "Играть с моей музыкой",
      () => {
        store.set("o.melody.repertoire", "local");
        if (new Set(this.rows.map((row) => this.titleKey(row.name))).size < 4)
          store.set("o.melody.answer", "text");
        Intro(G.games.find((g) => g.id === "melody"));
      },
      "big",
      { "data-primary": true },
    );
    const cleanup = () => {
      if (preview) {
        preview.pause();
        preview.removeAttribute("src");
        preview.load();
        preview = null;
      }
      if (activeURL) URL.revokeObjectURL(activeURL);
      activeURL = null;
    };
    const paint = () => {
      launch.hidden = !this.rows.length;
      list.replaceChildren(
        ...this.rows.map((row) => {
          const title = h("input", {
            class: "input",
            value: row.name,
            maxlength: 100,
            "aria-label": "Название записи " + row.name,
          });
          const artist = h("input", {
            class: "input",
            value: row.author,
            maxlength: 80,
            placeholder: "Исполнитель",
            "aria-label": "Исполнитель записи " + row.name,
          });
          const start = h("input", {
            class: "input",
            type: "number",
            min: 0,
            max: Math.max(0, Math.floor(row.duration - 0.5)),
            step: 0.1,
            value: row.start,
            "aria-label": "Начало фрагмента " + row.name,
          });
          return h(
            "article",
            { class: "panel music-track" },
            h("label", null, "Название", title),
            h("label", null, "Исполнитель", artist),
            h("label", null, "Начало фрагмента, секунды", start),
            h(
              "small",
              null,
              "Длительность: " +
                Records.format(row.duration, "seconds") +
                (row.sessionOnly ? " · До закрытия страницы" : ""),
            ),
            h(
              "div",
              { class: "row" },
              btn(
                "Сохранить",
                async () => {
                  const value = +start.value;
                  if (
                    !title.value.trim() ||
                    !Number.isFinite(value) ||
                    value < 0 ||
                    value > row.duration - 0.5
                  ) {
                    message.textContent =
                      "Укажите название и начало фрагмента внутри записи.";
                    return;
                  }
                  const ok = await this.update(row, {
                    name: title.value.trim(),
                    author: artist.value.trim(),
                    start: value,
                  });
                  message.textContent = ok
                    ? "Изменения сохранены."
                    : "Запись доступна в этой странице, но сохранить её на устройстве не удалось.";
                  paint();
                },
                "paper small",
              ),
              btn(
                "Прослушать",
                () => {
                  cleanup();
                  activeURL = URL.createObjectURL(row.blob);
                  preview = h("audio", {
                    controls: true,
                    src: activeURL,
                    class: "library-preview",
                  });
                  const player = preview;
                  preview.addEventListener(
                    "loadedmetadata",
                    () => {
                      if (preview !== player) return;
                      player.currentTime = Math.min(
                        +start.value || 0,
                        row.duration - 0.5,
                      );
                      player.play().catch(() => {
                        message.textContent =
                          "Нажмите воспроизведение в плеере.";
                      });
                    },
                    { once: true },
                  );
                  previewBox.replaceChildren(preview);
                },
                "paper small",
              ),
              btn(
                "Удалить",
                () =>
                  confirmBox(
                    "Удалить эту запись из личной медиатеки?",
                    async () => {
                      cleanup();
                      const ok = await this.remove(row);
                      message.textContent = ok
                        ? "Запись удалена."
                        : "Не удалось удалить запись. Попробуйте ещё раз.";
                      paint();
                    },
                    "Удалить",
                  ),
                "ghost small",
              ),
            ),
          );
        }),
      );
      if (!this.rows.length)
        list.append(
          h(
            "div",
            { class: "panel" },
            "Добавьте аудиофайлы и выберите узнаваемое место — например, начало припева. Для игры с вариантами нужно не менее четырёх разных названий; с вводом ответа достаточно одной записи.",
          ),
        );
    };
    const previewBox = h("div");
    const files = h("input", {
      type: "file",
      accept: "audio/*,.mp3,.m4a,.ogg,.wav,.flac",
      multiple: true,
      "aria-label": "Добавить аудиофайлы",
      onchange: async (e) => {
        files.disabled = true;
        const selected = Array.from(e.target.files);
        let count = 0,
          failures = [];
        for (const file of selected) {
          message.textContent = "Добавляем: " + file.name;
          try {
            await this.add(file);
            count++;
          } catch (err) {
            failures.push(file.name + ": " + err.message);
          }
        }
        files.disabled = false;
        files.value = "";
        message.textContent =
          "Добавлено записей: " +
          count +
          (failures.length ? ". " + failures.join(" ") : "") +
          (this.persisted
            ? ""
            : ". Хранилище недоступно: новые записи останутся только до закрытия страницы.");
        paint();
      },
    });
    paint();
    mount(
      h(
        "div",
        { class: "wrap progress-page music-library" },
        btn(
          "В меню игры",
          () => Intro(G.games.find((g) => g.id === "melody")),
          "ghost small",
        ),
        h("h1", null, "Моя музыка"),
        h(
          "p",
          null,
          "Оригинальные записи с вашего устройства. Файлы остаются в этом браузере и не загружаются на сайт.",
        ),
        h(
          "div",
          { class: "panel" },
          h("h2", null, "Ваш репертуар"),
          h(
            "p",
            null,
            "Билан, Ёлка, Буланова, «Сектор Газа», Modern Talking, Michael Jackson — добавьте те песни, которые знает ваша компания.",
          ),
          h("label", { class: "music-upload" }, "Добавить аудиофайлы", files),
        ),
        message,
        launch,
        previewBox,
        list,
      ),
    );
    onLeave(cleanup);
  },
};
MelodyLibrary.init();

/* Оригинальная запись: пауза возобновляет тот же фрагмент, а не его начало. */
const RecordedMelodyAudio = {
  create(api, row, changed) {
    let context,
      buffer,
      source,
      gain,
      timer,
      started = 0,
      limit = 0,
      active = false,
      disposed = false,
      generation = 0;
    function silence() {
      if (source) {
        try {
          source.stop();
          source.disconnect();
        } catch (e) {}
        source = null;
      }
      if (gain) {
        gain.disconnect();
        gain = null;
      }
    }
    function stop() {
      generation++;
      active = false;
      clearInterval(timer);
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
      )
        return silence();
      if (gain)
        gain.gain.setTargetAtTime(
          Settings.get("vol") * 0.85,
          context.currentTime,
          0.025,
        );
      if (!source) {
        source = context.createBufferSource();
        source.buffer = buffer;
        gain = context.createGain();
        gain.gain.value = Settings.get("vol") * 0.85;
        source.connect(gain);
        gain.connect(context.destination);
        source.start(0, row.start + elapsed, limit - elapsed);
      }
    }
    document.addEventListener("visibilitychange", silence);
    return {
      async play(seconds) {
        stop();
        const token = generation;
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
          if (!buffer)
            buffer = await context.decodeAudioData(
              await row.blob.arrayBuffer(),
            );
          if (
            disposed ||
            token !== generation ||
            G.api !== api ||
            api.finished ||
            context.state !== "running"
          )
            return false;
          limit = Math.min(seconds, buffer.duration - row.start);
          if (limit <= 0.1) return false;
          started = api.now();
          active = true;
          changed(true);
          tick();
          timer = setInterval(tick, 20);
          return true;
        } catch (e) {
          stop();
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
