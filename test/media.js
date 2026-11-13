const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const file = "file://" + path.resolve(__dirname, "../index.html");
const wav = (frequency = 440) => {
  const rate = 8000,
    n = rate * 16,
    out = Buffer.alloc(44 + n * 2);
  out.write("RIFF");
  out.writeUInt32LE(out.length - 8, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    out.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * frequency * i) / rate) * 7000),
      44 + i * 2,
    );
  return out;
};
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const errors = [];
  const page = async () => {
    const p = await browser.newPage({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(file);
    await p.clock.install();
    return p;
  };
  const start = async (p, id, opts = {}, n = 1) => {
    await p.evaluate(
      ([id, opts, n]) => {
        store.set("n." + id, n);
        for (const [k, v] of Object.entries(opts))
          store.set("o." + id + "." + k, v);
        Intro(G.games.find((g) => g.id === id));
      },
      [id, opts, n],
    );
    await p.getByRole("button", { name: "Играть", exact: true }).click();
  };
  const next = (p) =>
    p.getByRole("button", { name: /^(Дальше|Итоги)$/, exact: true }).click();
  const score = (p) => p.locator(".tchip .sc").first().innerText();
  const study = async (p) => {
    await p
      .getByRole("button", { name: "Рассмотреть сцену", exact: true })
      .click();
    await p.locator(".scene-surface").waitFor();
  };
  const clickPoint = async (p, x, y) => {
    const r = await p.locator(".scene-surface").first().boundingBox();
    await p
      .locator(".scene-surface")
      .first()
      .dispatchEvent("click", {
        clientX: r.x + r.width * x,
        clientY: r.y + r.height * y,
      });
  };
  try {
    {
      const p = await page();
      assert.equal(
        await p.evaluate(() => G.games.find((g) => g.id === "melody").hidden),
        true,
      );
      assert.equal(await p.locator(".gcard").count(), 49);
      await p.getByRole("searchbox").fill("Угадай мелодию");
      assert.equal(await p.locator(".gcard").count(), 0);
      assert.equal(
        await p
          .getByRole("button", { name: "Случайная игра", exact: true })
          .isDisabled(),
        true,
      );
      await p.evaluate(() => {
        store.set("cat", "★ Любимые");
        store.set("fav", ["melody"]);
        Home();
      });
      assert.equal(await p.locator(".gcard").count(), 0);
      assert.equal(
        await p.evaluate(() => {
          for (let n = 1; n <= 8; n++)
            for (const pack of ["all", "kids"])
              for (const recipe of Evening.collections) {
                if (
                  Evening.generate(n, 20, pack, recipe.id).some(
                    (s) => s.game === "melody",
                  )
                )
                  return false;
              }
          return true;
        }),
        true,
      );
      await start(p, "melody", { rounds: 3, time: 30 });
      await p.evaluate(() => {
        G.api.record({
          metric: "hidden-test",
          label: "Очки",
          value: 7,
          settings: {},
          description: "Тест сохранности",
        });
        G.api.end();
        Records.show();
      });
      assert.equal(
        await p
          .getByRole("heading", { name: "Угадай мелодию", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await p.evaluate(() =>
          Object.values(Records.read()).some(
            (r) => r.game === "melody" && r.best === 7,
          ),
        ),
        true,
      );
      assert.equal(
        await p.evaluate(() => {
          const stages = Evening.generate(2, 20, "all");
          stages[0] = {
            game: "melody",
            opts: {},
            status: "playing",
            result: null,
          };
          const run = {
            version: 1,
            id: "hidden-music-test",
            minutes: 20,
            pack: "all",
            people: [
              { name: "A", color: TEAM_COLORS[0] },
              { name: "B", color: TEAM_COLORS[1] },
            ],
            stages,
          };
          localStorage.setItem("igroteka.evening.v1", JSON.stringify(run));
          Evening.live = null;
          const migrated = Evening.read();
          return (
            !!migrated &&
            Evening.valid(migrated) &&
            migrated.stages.every((s) => s.game !== "melody")
          );
        }),
        true,
      );
      assert.equal(
        await p.evaluate(() => {
          const run = Evening.read();
          run.stages[0] = {
            game: "melody",
            opts: {},
            status: "done",
            result: { raw: [7, 0], points: [1, 0], session: "old" },
          };
          localStorage.setItem("igroteka.evening.v1", JSON.stringify(run));
          Evening.live = null;
          const migrated = Evening.read();
          Evening.show();
          return (
            !!migrated &&
            Evening.valid(migrated) &&
            migrated.stages[0].result.raw[0] === 7
          );
        }),
        true,
      );
      assert.match(
        await p.locator(".evening-page").innerText(),
        /Угадай мелодию · архив/,
      );
      console.log(
        "ok скрытая музыка: каталог, поиск, избранное, подборки и результаты; код, рекорды и завершённые этапы сохранены",
      );
      await p.close();
    }

    {
      const p = await page();
      const audit = await p.evaluate(async () => {
        const original = Math.random,
          variants = [],
          targets = new Set();
        try {
          for (let seed = 1; seed <= 4; seed++) {
            let n = seed * 1001;
            Math.random = () => {
              n = (1664525 * n + 1013904223) >>> 0;
              return n / 4294967296;
            };
            const scene = await PhotoScenes.build(
              DATA.visual.scenes[0],
              { level: "hard", changes: 3 },
              false,
            );
            variants.push(JSON.stringify([scene.mirrored, scene.states]));
            scene.changes.forEach((c) => targets.add(c.id));
          }
        } finally {
          Math.random = original;
        }
        const scene = await PhotoScenes.build(
          DATA.visual.scenes[1],
          { level: "hard" },
          true,
        );
        const asks = PhotoScenes.pickQuestions(scene, 3, true),
          next = PhotoScenes.pickQuestions(scene, 3, true);
        const decode = (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
          });
        const before = await decode(scene.source),
          base = await PhotoScenes.image(scene.image),
          a = document.createElement("canvas"),
          b = document.createElement("canvas");
        a.width = b.width = base.width;
        a.height = b.height = base.height;
        const ac = a.getContext("2d", { willReadFrequently: true }),
          bc = b.getContext("2d", { willReadFrequently: true });
        ac.drawImage(base, 0, 0);
        bc.drawImage(before, 0, 0);
        const originalPixels = ac.getImageData(0, 0, a.width, a.height).data,
          rendered = bc.getImageData(0, 0, b.width, b.height).data;
        let checked = 0;
        for (const op of scene.details.filter((op) => op.q)) {
          const [x, y, w, h] = op.rect;
          let point = null;
          for (
            let py = Math.round((y + h * 0.25) * a.height);
            py < (y + h * 0.75) * a.height && !point;
            py++
          )
            for (
              let px = Math.round((x + w * 0.25) * a.width);
              px < (x + w * 0.75) * a.width;
              px++
            ) {
              const i = (py * a.width + px) * 4,
                hsv = PhotoScenes.hsv(
                  originalPixels[i],
                  originalPixels[i + 1],
                  originalPixels[i + 2],
                );
              if (
                hsv[1] > 0.12 &&
                hsv[2] > 0.25 &&
                PhotoScenes.matches(...hsv, op.mask)
              ) {
                point = [px, py];
                break;
              }
            }
          if (!point) continue;
          const px = scene.mirrored ? a.width - 1 - point[0] : point[0],
            i = (point[1] * a.width + px) * 4,
            actual = PhotoScenes.hsv(
              rendered[i],
              rendered[i + 1],
              rendered[i + 2],
            )[0],
            expected = PhotoScenes.palette[scene.states[op.id]].hue;
          if (Math.abs(((actual - expected + 540) % 360) - 180) < 8) checked++;
        }
        return {
          variants: new Set(variants).size,
          targets: targets.size,
          noRepeat: asks.every((q) => !next.some((n) => q.id === n.id)),
          pixelColors: checked,
          count: G.games.find((g) => g.id === "snapshot").cards(),
        };
      });
      assert.equal(audit.variants, 4);
      assert.ok(audit.targets >= 5);
      assert.equal(audit.noRepeat, true);
      assert.ok(
        audit.pixelColors >= 3,
        "ответы о цветах соответствуют пикселям новой сцены",
      );
      assert.equal(audit.count, 55);
      console.log(
        "ok варианты реально различаются, цели меняются, вопросы не повторяются преждевременно, ответы о цветах совпадают с изображением",
      );
      await p.close();
    }

    {
      const p = await page();
      assert.equal(await p.evaluate(() => G.games.length), 50);
      assert.equal(
        await p.evaluate(() => G.games.some((g) => g.id === "crop")),
        false,
      );
      assert.equal(
        await p.evaluate(() => Evening.pool.includes("crop")),
        false,
      );
      assert.equal(
        await p.evaluate(() =>
          ["changes", "snapshot", "melody"].every(
            (id) => DATA.art[id] && !DATA.art[id].includes("<image"),
          ),
        ),
        true,
        "обложки — SVG Icons8, не фотографии",
      );
      await p.evaluate(() => {
        store.set("n.changes", 1);
        Intro(G.games.find((g) => g.id === "changes"));
      });
      await p.getByRole("button", { name: "Играть", exact: true }).click();
      await study(p);
      await p.getByRole("button", { name: "Пауза", exact: true }).click();
      assert.equal(
        await p
          .locator(".scene-image")
          .first()
          .evaluate((el) => getComputedStyle(el).visibility),
        "hidden",
        "пауза скрывает сцену",
      );
      await p.clock.fastForward(14000);
      assert.equal(await p.locator(".attention-card").count(), 0);
      await p
        .getByRole("button", { name: "Продолжить игру", exact: true })
        .click();
      await p.clock.fastForward(10100);
      assert.equal(await p.locator(".scene-surface").count(), 0);
      assert.equal(await p.locator(".attention-card").count(), 1);
      await p.getByRole("button", { name: "Пауза", exact: true }).click();
      await p.clock.fastForward(8000);
      assert.equal(await p.locator(".attention-card").count(), 1);
      await p
        .getByRole("button", { name: "Продолжить игру", exact: true })
        .click();
      await p.clock.fastForward(5100);
      assert.equal(await p.locator(".scene-surface").count(), 1);
      assert.equal(
        await p.locator(".scene-image").first().getAttribute("data-variant"),
        "after",
      );
      const scene = await p.evaluate(() => ({
        id: G.api.sceneRound.id,
        changes: G.api.sceneRound.changes,
        variantId: G.api.sceneRound.variantId,
      }));
      assert.equal(scene.changes.length, 3);
      assert.ok(scene.changes.every((c) => !c.main));
      await p
        .getByRole("button", { name: "Увеличить изображение", exact: true })
        .click();
      assert.equal(await p.locator(".scene-scale").innerText(), "150%");
      await p
        .locator(".scene-tools")
        .getByRole("button", { name: "На весь экран", exact: true })
        .click();
      const before = await p.evaluate(() => G.api.now());
      await p.clock.fastForward(1100);
      assert.ok((await p.evaluate(() => G.api.now())) - before >= 1100);
      await p.keyboard.press("Escape");
      assert.equal(await p.evaluate(() => root.inert), false);
      for (const c of scene.changes) {
        await clickPoint(
          p,
          c.rect[0] + c.rect[2] / 2,
          c.rect[1] + c.rect[3] / 2,
        );
        await clickPoint(
          p,
          c.rect[0] + c.rect[2] / 2,
          c.rect[1] + c.rect[3] / 2,
        );
      }
      assert.equal(await score(p), "9");
      await next(p);
      await study(p);
      await p.clock.fastForward(10100);
      await p.clock.fastForward(5100);
      await clickPoint(p, 0.01, 0.99);
      assert.equal(await score(p), "8", "ошибка отнимает очко");
      await p
        .getByRole("button", { name: "Завершить раунд", exact: true })
        .click();
      await next(p);
      await study(p);
      await p.clock.fastForward(10100);
      await p.clock.fastForward(5100);
      await p
        .getByRole("button", { name: "Завершить раунд", exact: true })
        .click();
      await next(p);
      assert.match(await p.locator(".stage").innerText(), /Попробуйте ещё/);
      assert.equal(
        await p.evaluate(
          () =>
            Object.values(Records.read()).find((r) => r.game === "changes")
              .best,
        ),
        8,
      );
      console.log(
        "ok снятие игры, SVG-обложки, пауза при изучении и переходе, отвлекающее задание, поиск мелких деталей, штраф, цель 70%, масштаб и рекорд",
      );
      await p.close();
    }
    {
      const p = await page();
      await start(p, "snapshot", {
        questions: 3,
        study: 10,
        gap: 5,
        time: 30,
        level: "hard",
        rounds: 3,
      });
      const ids = [];
      for (let round = 0; round < 3; round++) {
        await study(p);
        ids.push(await p.evaluate(() => G.api.sceneRound.variantId));
        await p.clock.fastForward(10100);
        assert.equal(await p.locator(".scene-surface").count(), 0);
        assert.equal(await p.locator(".attention-card").count(), 1);
        await p.clock.fastForward(5000);
        for (let i = 0; i < 3; i++) {
          const q = await p.locator(".photo-panel>.photo-feedback").innerText();
          const answer = await p.evaluate(
            (q) =>
              G.api.sceneRound.roundQuestions.find((item) => item.q === q).a,
            q,
          );
          await p.getByRole("button", { name: answer, exact: true }).click();
          if (i < 2) {
            assert.equal(await p.locator(".scene-surface").count(), 0);
            await p
              .getByRole("button", { name: "Следующий вопрос", exact: true })
              .click();
          }
        }
        assert.equal(await p.locator(".scene-surface").count(), 1);
        await next(p);
      }
      assert.equal(new Set(ids).size, 3);
      assert.match(await p.locator(".stage").innerText(), /Без единой ошибки/);
      assert.equal(
        await p.evaluate(
          () =>
            Object.values(Records.read()).find((r) => r.game === "snapshot")
              .best,
        ),
        45,
      );
      await start(p, "snapshot", {
        questions: 1,
        study: 6,
        gap: 3,
        rounds: 3,
        level: "normal",
      });
      for (let i = 0; i < 3; i++) {
        await study(p);
        await p.clock.fastForward(6100);
        await p.clock.fastForward(3100);
        await p.getByRole("button", { name: "Не помню", exact: true }).click();
        await next(p);
      }
      assert.match(await p.locator(".stage").innerText(), /Попробуйте ещё/);
      console.log(
        "ok память: случайные варианты и ответы, маска-переход, 3 вопроса, скрытие до конца, успешное и неуспешное прохождение",
      );
      await p.close();
    }
    {
      const p = await page();
      await start(p, "melody", {
        rounds: 3,
        time: 30,
        repertoire: "familiar",
        answer: "choice",
      });
      await p.evaluate(() => {
        window.audioEvents = [];
        const context = sfx.ctx(),
          original = context.createOscillator.bind(context);
        context.createOscillator = () => {
          const o = original(),
            start = o.start.bind(o),
            stop = o.stop.bind(o);
          o.start = (t) => {
            audioEvents.push(["start", o.frequency.value]);
            return start(t);
          };
          o.stop = (t) => {
            audioEvents.push(["stop", t == null]);
            return stop(t);
          };
          return o;
        };
      });
      assert.equal(await p.evaluate(() => Music.playing), false);
      await p.clock.fastForward(40000);
      assert.equal(await p.locator(".visual-answer:enabled").count(), 0);
      await p
        .getByRole("button", { name: "Слушать · 3 с", exact: true })
        .click();
      await p.waitForFunction(
        () => !document.querySelector(".visual-answer").disabled,
      );
      assert.equal(await p.evaluate(() => LAST.item.familiar), true);
      assert.equal(
        await p.evaluate(() =>
          audioEvents.some(
            ([type, freq]) =>
              type === "start" &&
              Math.abs(freq - 440 * 2 ** ((LAST.item.notes[0][0] - 69) / 12)) <
                0.01,
          ),
        ),
        true,
      );
      await p.getByRole("button", { name: "Пауза", exact: true }).click();
      await p.clock.fastForward(100);
      let count = await p.evaluate(() => audioEvents.length);
      await p.clock.fastForward(10000);
      assert.equal(await p.evaluate(() => audioEvents.length), count);
      await p
        .getByRole("button", { name: "Продолжить игру", exact: true })
        .click();
      await p.clock.fastForward(100);
      assert.ok((await p.evaluate(() => audioEvents.length)) > count);
      await p.evaluate(() => sfx.toggle());
      await p.clock.fastForward(100);
      count = await p.evaluate(() => audioEvents.length);
      await p.clock.fastForward(100);
      assert.equal(await p.evaluate(() => audioEvents.length), count);
      await p.evaluate(() => {
        sfx.toggle();
        Settings.set("sfx", false);
      });
      await p.clock.fastForward(100);
      assert.ok((await p.evaluate(() => audioEvents.length)) > count);
      assert.equal(await p.evaluate(() => Music.playing), false);
      await p
        .getByRole("button", { name: "Больше мелодии · 6 с", exact: true })
        .click();
      await p.waitForFunction(() =>
        document.querySelector(".kicker").textContent.includes("6 с"),
      );
      await p
        .getByRole("button", { name: "Повторить · 6 с", exact: true })
        .click();
      await p
        .getByRole("button", {
          name: await p.evaluate(() => LAST.item.name),
          exact: true,
        })
        .click();
      assert.equal(await score(p), "3");
      await next(p);
      for (let i = 0; i < 2; i++) {
        await p
          .getByRole("button", { name: "Слушать · 3 с", exact: true })
          .click();
        await p.waitForFunction(
          () => !document.querySelector(".visual-answer").disabled,
        );
        await p
          .getByRole("button", {
            name: await p.evaluate(() => LAST.item.name),
            exact: true,
          })
          .click();
        await next(p);
      }
      assert.equal(
        await p.evaluate(
          () =>
            Object.values(Records.read()).find((r) => r.game === "melody").best,
        ),
        13,
      );
      await start(p, "melody", {
        repertoire: "all",
        answer: "text",
        rounds: 3,
        time: 30,
      });
      await p.evaluate(() => {
        window.realAudio = sfx.ctx;
        sfx.ctx = () => null;
      });
      await p
        .getByRole("button", { name: "Слушать · 3 с", exact: true })
        .click();
      assert.match(
        await p.locator(".visual-game").innerText(),
        /Звук не запустился/,
      );
      await p.evaluate(() => {
        sfx.ctx = realAudio;
      });
      await p
        .getByRole("button", { name: "Слушать · 3 с", exact: true })
        .click();
      await p.waitForFunction(
        () => !document.querySelector(".an-answer input").disabled,
      );
      await p
        .getByRole("textbox", { name: "Название мелодии" })
        .fill(await p.evaluate(() => LAST.item.name));
      await p.getByRole("textbox", { name: "Название мелодии" }).press("Enter");
      assert.equal(await score(p), "5");
      await next(p);
      await p
        .getByRole("button", { name: "Слушать · 3 с", exact: true })
        .click();
      await p.clock.fastForward(100);
      await p.evaluate(() => Home());
      count = await p.evaluate(() => audioEvents.length);
      await p.clock.fastForward(10000);
      assert.equal(await p.evaluate(() => audioEvents.length), count);
      console.log(
        "ok музыка: знакомый репертуар, тембр/бас, ноты, пауза, громкость, повтор, цена, ввод и очистка",
      );
      await p.close();
    }
    {
      const p = await page();
      const requests = [];
      p.on("request", (r) => {
        if (/^https?:/.test(r.url())) requests.push(r.url());
      });
      await p.evaluate(() => MelodyLibrary.show());
      await p
        .getByRole("heading", { name: "Моя музыка", exact: true })
        .waitFor();
      await p.getByRole("button", { name: "В меню игры", exact: true }).click();
      await start(p, "melody", { repertoire: "local", answer: "choice" });
      await p
        .getByRole("heading", { name: "Добавьте музыку", exact: true })
        .waitFor();
      await p.getByRole("button", { name: "Моя музыка", exact: true }).click();
      await p.getByLabel("Добавить аудиофайлы", { exact: true }).setInputFiles(
        [0, 1, 2, 3].map((i) => ({
          name: "Исполнитель — Тест " + (i + 1) + ".wav",
          mimeType: "audio/wav",
          buffer: wav(330 + i * 110),
        })),
      );
      await p.waitForFunction(() => MelodyLibrary.rows.length === 4);
      assert.equal(await p.locator(".music-track").count(), 4);
      const row = p.locator(".music-track").first();
      await row.getByRole("spinbutton").fill("1.5");
      await row.getByRole("button", { name: "Сохранить", exact: true }).click();
      await p.waitForFunction(() => MelodyLibrary.rows[0].start === 1.5);
      const old = await p.evaluate(() =>
        MelodyLibrary.rows.map((r) => ({ id: r.id, start: r.start })),
      );
      await p.reload();
      await p.evaluate(() => MelodyLibrary.init());
      assert.deepEqual(
        await p.evaluate(() =>
          MelodyLibrary.rows.map((r) => ({ id: r.id, start: r.start })),
        ),
        old,
      );
      // Все записи получают одно начало, чтобы проверить воспроизведение и возобновление фрагмента.
      await p.evaluate(async () => {
        for (const row of MelodyLibrary.rows)
          await MelodyLibrary.update(row, { start: 1.5 });
        const ctx = sfx.ctx(),
          original = ctx.createBufferSource.bind(ctx);
        window.recordEvents = [];
        ctx.createBufferSource = () => {
          const source = original(),
            start = source.start.bind(source),
            stop = source.stop.bind(source);
          source.start = (...args) => {
            recordEvents.push(["start", ...args]);
            return start(...args);
          };
          source.stop = (...args) => {
            recordEvents.push(["stop"]);
            return stop(...args);
          };
          return source;
        };
      });
      await start(p, "melody", {
        repertoire: "local",
        answer: "choice",
        rounds: 3,
        time: 30,
      });
      await p
        .getByRole("button", { name: "Слушать · 3 с", exact: true })
        .click();
      await p.waitForFunction(
        () => !!document.querySelector(".visual-answer:not(:disabled)"),
      );
      assert.ok(
        Math.abs(
          (await p.evaluate(
            () => recordEvents.find((r) => r[0] === "start")[2],
          )) - 1.5,
        ) < 0.02,
      );
      await p.clock.fastForward(500);
      await p.getByRole("button", { name: "Пауза", exact: true }).click();
      await p.clock.fastForward(100);
      const events = await p.evaluate(() => recordEvents.length);
      await p.clock.fastForward(5000);
      assert.equal(await p.evaluate(() => recordEvents.length), events);
      await p
        .getByRole("button", { name: "Продолжить игру", exact: true })
        .click();
      await p.clock.fastForward(100);
      assert.ok(
        (await p.evaluate(
          () => recordEvents.filter((r) => r[0] === "start").at(-1)[2],
        )) >= 2,
      );
      await p
        .getByRole("button", {
          name: await p.evaluate(() => LAST.item.name),
          exact: true,
        })
        .click();
      await next(p);
      for (let i = 0; i < 2; i++) {
        await p
          .getByRole("button", { name: "Слушать · 3 с", exact: true })
          .click();
        await p.waitForFunction(
          () => !!document.querySelector(".visual-answer:not(:disabled)"),
        );
        await p
          .getByRole("button", {
            name: await p.evaluate(() => LAST.item.name),
            exact: true,
          })
          .click();
        await next(p);
      }
      assert.match(
        await p.evaluate(
          () =>
            Object.values(Records.read()).find((r) => r.game === "melody")
              .description,
        ),
        /Оригинальные записи/,
      );
      assert.deepEqual(requests, [], "личные записи не отправляются в сеть");
      await p.evaluate(() => MelodyLibrary.show());
      await p.getByLabel("Добавить аудиофайлы", { exact: true }).setInputFiles({
        name: "bad.wav",
        mimeType: "audio/wav",
        buffer: Buffer.from("broken"),
      });
      await p.waitForFunction(
        () => !document.querySelector("input[type=file]").disabled,
      );
      assert.match(
        await p.locator(".music-library>.photo-feedback").innerText(),
        /Не удалось прочитать/,
      );
      assert.equal(await p.evaluate(() => MelodyLibrary.rows.length), 4);
      await p.evaluate(async () => {
        for (const row of MelodyLibrary.rows)
          await MelodyLibrary.update(row, { start: 15 });
      });
      await start(p, "melody", { repertoire: "local", answer: "text" });
      assert.equal(
        await p
          .getByRole("button", { name: "Слушать · 1 с", exact: true })
          .count(),
        1,
      );
      assert.equal(
        await p
          .getByRole("button", { name: "Весь фрагмент открыт", exact: true })
          .isDisabled(),
        true,
      );
      console.log(
        "ok оригинальные записи: импорт, названия, начало фрагмента, IndexedDB после перезагрузки, пауза с той же позиции, рекорд, ошибки и отсутствие отправки в сеть",
      );
      await p.close();
    }
    {
      const p = await page();
      await p.evaluate(() => {
        store.set("pack", "kids");
        store.set("cat", "Музыка и картинки");
        Home();
      });
      assert.equal(await p.locator(".gcard").count(), 2);
      const valid = await p.evaluate(() => {
        for (let n = 1; n <= 8; n++) {
          const stages = Evening.generate(n, 40, "kids", "media");
          if (
            !Evening.valid({
              version: 1,
              id: "media-test",
              minutes: 40,
              pack: "kids",
              people: range(n).map((i) => ({
                name: "Игрок " + (i + 1),
                color: TEAM_COLORS[i],
              })),
              stages,
            })
          )
            return false;
        }
        return true;
      });
      assert.equal(valid, true);
      assert.equal(
        await p.evaluate(() => {
          const stages = Evening.generate(2, 40, "kids", "media");
          stages.forEach((stage) => {
            delete stage.opts.answer;
            delete stage.opts.repertoire;
            delete stage.opts.questions;
            if ("study" in stage.opts) stage.opts.study = 6;
          });
          const run = {
            version: 1,
            id: "older-media-evening",
            minutes: 40,
            pack: "kids",
            people: [
              { name: "Аня", color: TEAM_COLORS[0] },
              { name: "Борис", color: TEAM_COLORS[1] },
            ],
            stages,
          };
          run.stages[0].status = "done";
          run.stages[0].result = {
            raw: [2, 0],
            points: [1, 0],
            session: "old-session",
          };
          localStorage.setItem("igroteka.evening.v1", JSON.stringify(run));
          Evening.live = null;
          const restored = Evening.read();
          return (
            !!restored &&
            Evening.valid(restored) &&
            restored.stages[0].result.raw[0] === 2
          );
        }),
        true,
        "прежняя программа получает новые настройки и сохраняет результаты",
      );
      assert.equal(
        await p.evaluate(() => {
          const stages = Evening.generate(2, 40, "all", "media");
          stages[0] = {
            game: "crop",
            opts: {},
            status: "done",
            result: { raw: [3, 0], points: [1, 0], session: "old" },
          };
          const run = {
            version: 1,
            id: "retired-evening",
            minutes: 40,
            pack: "all",
            people: [
              { name: "A", color: TEAM_COLORS[0] },
              { name: "B", color: TEAM_COLORS[1] },
            ],
            stages,
          };
          localStorage.setItem("igroteka.evening.v1", JSON.stringify(run));
          Evening.live = null;
          const read = Evening.read();
          return (
            !!read &&
            Evening.valid(read) &&
            read.stages[0].game === "crop" &&
            read.stages[0].result.raw[0] === 3
          );
        }),
        true,
        "завершённый снятый этап сохраняется",
      );
      assert.equal(
        await p.evaluate(() => {
          const run = Evening.read();
          run.stages[0].status = "pending";
          run.stages[0].result = null;
          localStorage.setItem("igroteka.evening.v1", JSON.stringify(run));
          Evening.live = null;
          const read = Evening.read();
          return (
            !!read &&
            Evening.valid(read) &&
            read.stages.every((s) => s.game !== "crop")
          );
        }),
        true,
        "незавершённый снятый этап заменяется",
      );
      for (const size of [
        { width: 360, height: 640 },
        { width: 667, height: 375 },
        { width: 1280, height: 800 },
      ]) {
        await p.setViewportSize(size);
        for (const id of ["changes", "snapshot", "melody"]) {
          await start(p, id, { repertoire: "familiar", study: 10, gap: 5 });
          if (["changes", "snapshot"].includes(id)) await study(p);
          assert.ok(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            id + " " + size.width,
          );
        }
      }
      console.log(
        "ok детский каталог, программа вечера и ширина на телефоне, в альбомной ориентации и на компьютере",
      );
      await p.close();
    }
    assert.deepEqual(errors, []);
    console.log("ALL OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
