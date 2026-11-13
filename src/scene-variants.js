/* Игровые варианты существующих сцен: без сетевых запросов и генерации изображений. */
const PhotoScenes = {
  images: new Map(),
  palette: [
    { hue: 3, names: ["Красный", "Красная", "Красные"] },
    { hue: 215, names: ["Синий", "Синяя", "Синие"] },
    { hue: 142, names: ["Зелёный", "Зелёная", "Зелёные"] },
    { hue: 48, names: ["Жёлтый", "Жёлтая", "Жёлтые"] },
    { hue: 278, names: ["Фиолетовый", "Фиолетовая", "Фиолетовые"] },
    { hue: 26, names: ["Оранжевый", "Оранжевая", "Оранжевые"] },
  ],
  image(key) {
    if (!this.images.has(key))
      this.images.set(
        key,
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => {
            this.images.delete(key);
            reject(new Error("image"));
          };
          image.src = DATA.mediaAssets[key] || "";
        }),
      );
    return this.images.get(key);
  },
  hsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      d = max - min;
    let hue = 0;
    if (d) {
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
    }
    return [(hue * 60 + 360) % 360, max ? d / max : 0, max];
  },
  rgb(h, s, v) {
    const c = v * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = v - c;
    const parts =
      h < 60
        ? [c, x, 0]
        : h < 120
          ? [x, c, 0]
          : h < 180
            ? [0, c, x]
            : h < 240
              ? [0, x, c]
              : h < 300
                ? [x, 0, c]
                : [c, 0, x];
    return parts.map((value) => Math.round((value + m) * 255));
  },
  matches(h, s, v, mask) {
    if (
      s < (mask === "blue" ? 0.04 : mask === "green" ? 0.06 : 0.17) ||
      v < 0.075
    )
      return false;
    return mask === "red"
      ? h < 28 || h > 332
      : mask === "yellow"
        ? h >= 28 && h < 73
        : mask === "green"
          ? h >= 55 && h < 177
          : mask === "blue"
            ? h >= 130 && h < 285
            : mask === "warm"
              ? h >= 15 && h < 68
              : false;
  },
  render(image, altered, ops, states, memory, mirrored) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    for (const op of ops.filter((o) => o.kind === "patch")) {
      if (!states[op.id]) continue;
      const [x, y, w, h] = op.rect.map(
        (n, i) => n * (i % 2 ? canvas.height : canvas.width),
      );
      ctx.drawImage(altered, x, y, w, h, x, y, w, h);
    }
    for (const op of ops.filter((o) => o.kind === "mirror")) {
      if (!states[op.id]) continue;
      const [x, y, w, h] = op.rect.map((n, i) =>
        Math.round(n * (i % 2 ? canvas.height : canvas.width)),
      );
      const copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      copy.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
      ctx.save();
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(copy, 0, 0);
      ctx.restore();
    }
    for (const op of ops.filter((o) => o.kind === "tint")) {
      const value = states[op.id];
      if (value == null || (!memory && value === 0)) continue;
      const [x, y, w, h] = op.rect.map((n, i) =>
          Math.round(n * (i % 2 ? canvas.height : canvas.width)),
        ),
        pixels = ctx.getImageData(x, y, w, h),
        data = pixels.data;
      for (let py = 0; py < h; py++)
        for (let px = 0; px < w; px++) {
          const i = (py * w + px) * 4,
            [hue, sat, val] = this.hsv(data[i], data[i + 1], data[i + 2]);
          if (!this.matches(hue, sat, val, op.mask)) continue;
          const fade = Math.min(
            1,
            Math.min(px + 1, w - px, py + 1, h - py) /
              Math.max(2, Math.min(w, h) * 0.09),
          );
          const delta = memory
            ? ((this.palette[value].hue - hue + 540) % 360) - 180
            : value;
          const rgb = this.rgb(
            (hue + delta * fade + 360) % 360,
            sat + (Math.max(memory ? 0.5 : 0.28, sat) - sat) * fade,
            val,
          );
          data[i] = rgb[0];
          data[i + 1] = rgb[1];
          data[i + 2] = rgb[2];
        }
      ctx.putImageData(pixels, x, y);
    }
    if (mirrored) {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext("2d").drawImage(canvas, 0, 0);
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(copy, 0, 0);
      ctx.restore();
    }
    return canvas.toDataURL("image/png");
  },
  flip(text) {
    return text.replace(
      /справа|слева|вправо|влево|Справа|Слева|Вправо|Влево/g,
      (word) => {
        const other = {
          справа: "слева",
          слева: "справа",
          вправо: "влево",
          влево: "вправо",
        }[word.toLowerCase()];
        return word[0] === word[0].toUpperCase()
          ? other[0].toUpperCase() + other.slice(1)
          : other;
      },
    );
  },
  questions(template, states, mirrored) {
    const list = template.questions
      .filter((q) => !template.details.some((op) => op.q === q.q))
      .map((q) => ({ ...q, choices: q.choices.slice() }));
    for (const op of template.details.filter((op) => op.q)) {
      const index = op.gender === "f" ? 1 : op.gender === "p" ? 2 : 0;
      let choices = this.palette.map((color) => color.names[index]);
      if (template.id === "harbor" && op.id === "lighthouse")
        choices = choices.map((color) => color + " и белые");
      list.push({
        q: op.q,
        a: choices[states[op.id]],
        choices,
        color: true,
        detail: !op.main,
      });
    }
    if (template.id === "kitchen") {
      const apples = list.find((q) => q.q === "Сколько яблок лежало в миске?");
      if (apples) apples.a = states.presence ? "Два" : "Три";
      const book = list.find((q) => q.q === "Что лежало справа от кружки?");
      if (book) {
        book.a = "Книга";
        book.choices[0] = "Книга";
      }
    }
    if (template.id === "study") {
      const boat = list.find((q) => q.q === "Что стояло на книжной полке?");
      if (boat) {
        boat.q = "Какая модель стояла на книжной полке?";
        boat.a = states.presence ? "Модели не было" : "Модель парусника";
        boat.choices = [
          "Модель парусника",
          "Модель поезда",
          "Модель самолёта",
          "Модели не было",
        ];
        boat.detail = true;
      }
    }
    if (template.id === "harbor") {
      const gulls = list.find((q) => q.q === "Сколько чаек было видно в небе?");
      if (gulls) gulls.a = states.presence ? "Одна" : "Две";
    }
    return list.map((q) => ({
      ...q,
      id: template.id + "-" + Pics.hash(q.q),
      q: mirrored ? this.flip(q.q) : q.q,
      a: mirrored ? this.flip(q.a) : q.a,
      choices: mirrored ? q.choices.map((text) => this.flip(text)) : q.choices,
    }));
  },
  pickQuestions(scene, count, hard) {
    const key = "scene.questions.v3." + scene.id,
      raw = store.get(key, []),
      seen = new Set(Array.isArray(raw) ? raw : []),
      chosen = [];
    const pool = hard
      ? scene.questions.filter((q) => q.detail)
      : scene.questions;
    while (chosen.length < count) {
      let eligible = pool.filter((q) => !chosen.includes(q) && !seen.has(q.id));
      if (!eligible.length) {
        pool.forEach((q) => seen.delete(q.id));
        eligible = pool.filter((q) => !chosen.includes(q));
      }
      if (!eligible.length) break;
      // После одного вопроса о цвете предпочитаем другие детали, если они ещё не показаны.
      if (hard && chosen.some((q) => q.color) && eligible.some((q) => !q.color))
        eligible = eligible.filter((q) => !q.color);
      const q = pick(eligible);
      chosen.push(q);
      seen.add(q.id);
    }
    store.set(key, [...seen]);
    return shuffle(chosen);
  },
  async build(template, opts, memory) {
    const [image, altered] = await Promise.all([
        this.image(template.image),
        this.image(template.altered),
      ]),
      ops = template.details,
      hard = opts.level !== "normal",
      states = {},
      after = {},
      mirrored = rnd(2) === 1;
    for (const op of ops) {
      if (op.kind === "tint")
        states[op.id] = memory
          ? op.q
            ? rnd(this.palette.length)
            : null
          : pick([-24, -12, 0, 12, 24]);
      else states[op.id] = rnd(2);
    }
    Object.assign(after, states);
    const selected = memory
      ? []
      : sample(
          ops.filter((op) => !hard || !op.main),
          opts.changes || 3,
        );
    selected.forEach((op) => {
      after[op.id] =
        op.kind === "tint"
          ? pick(
              [-24, -12, 0, 12, 24].filter(
                (n) => Math.abs(n - states[op.id]) >= 24,
              ),
            )
          : 1 - states[op.id];
    });
    const scene = {
      ...template,
      variantId: newRunId(),
      mirrored,
      states,
      after,
      source: this.render(image, altered, ops, states, memory, mirrored),
    };
    if (!memory)
      scene.changedSource = this.render(
        image,
        altered,
        ops,
        after,
        false,
        mirrored,
      );
    scene.changes = selected.map((op) => ({
      ...op,
      rect: mirrored
        ? [1 - op.rect[0] - op.rect[2], ...op.rect.slice(1)]
        : op.rect.slice(),
    }));
    scene.questions = memory ? this.questions(template, states, mirrored) : [];
    return scene;
  },
};
