// GameAudio.js — Obby Cut Master: звуки и музыка игры поверх Sound.js.
//
// Другие модули зовут только этот глобал, имена звуков — ключи карты defs ниже:
//   GameAudio.play('hit');                      // эффект: случайный вариант, высота ±8%, не чаще ~40 мс на имя
//   GameAudio.play('coin', { volume: 0.5, rate: 1.2 });   // volume и rate множатся на заданные в карте
//   GameAudio.star(2);                          // звезда 1/2/3 (одна запись, три высоты)
//   GameAudio.playElement('fire');              // звук стихии меча (id стихии из docs/DESIGN.md, § 3)
//   GameAudio.music('menu' | 'boss' | id биома);  // повтор того же трека не перезапускает; смена — плавная
//   GameAudio.stopMusic();
//   const h = GameAudio.loop('chainsaw');       // цикл (фитиль, пила): h.set(громкость, скорость), h.fade(с), h.stop()
//   GameAudio.preload();                        // заранее декодировать все эффекты (звать в Game.ready)
//
// Ключи эффектов (play / loop):
//   бой:       throw (бросок меча, свист) · fly (короткий whoosh полёта) · hit (удар по мобу, 3 варианта) ·
//              hitArmor (лязг по броне) · crit (крит; уже включает hit — вместе не звать) · blockBreak (рассыпание
//              блоков, 2 варианта) · mobDie (поп смерти моба) · catch (меч пойман) · thud (глухой удар) · boom (низкий гул)
//   награды:   coin (монета) · coins (россыпь) · star1 · star2 · star3 · win (победа уровня) · lose (поражение) ·
//              lifeLost (потеря жизни)
//   интерфейс: click · buy (покупка) · equip (надеть) · error (нельзя) · gift (открыть подарок) · wheelTick (тик колеса) ·
//              wheelWin (выигрыш колеса) · unlock (новый меч, фанфары) · toast (всплывающая подсказка)
//   мир, мобы: mobSpawn (появление моба) · bossRoar (рык босса) · bossStomp (удар босса по земле) · explosion ·
//              fuse (фитиль TNT, шипение; цикл) · slime (хлюп) · ghost (у-у) · wizard (заклинание колдуна) ·
//              snowball (бросок снежка) · dice (бросок кости) · step · jump
//   стихии:    fire · ice · lightning · poison · void (пустота, телепорт) · holy · wind · vampire · laser · water ·
//              meteor · glitch · rainbow · chainsaw (бензопила, короткая; цикл) · sparkle (искры, радуга)
//   служебные: hum (магический гул, слой для holy и wizard)
// Музыка (music): menu · boss · plains · desert · birch · taiga · jungle · mushroom · badlands · nether · end · sky.
//   У каждого вида свой трек: сочинён и синтезирован программой tools/music/compose.py (лейтмотив меча звучит в
//   главной теме, в боссе — в миноре, в биомах — отзвуками), все треки одной громкости (около -17 LUFS) и зациклены.
//
// Запись карты (GameAudioDef): files — варианты (путь строкой или { f, v, r }: множитель громкости и скорости
// варианта), volume — базовая громкость (выровнена по уровню файла), rate — базовая скорость, jitter — разброс
// скорости ±доля (по умолчанию 0.08, то есть 0.92–1.08), gap — минимум мс между одинаковыми звуками (40),
// dur — играть не дольше (с), duck — [уровень, держать с] приглушение музыки под джингл, layers — другие записи,
// которые звучат вместе (volume, rate, delay в секундах). Пути — только строковыми литералами, иначе сборщик
// их не увидит; в комментариях путей в кавычках не писать.

/** @typedef {{ f: string, v?: number, r?: number }} GameAudioFile */
/** @typedef {{ name: string, volume?: number, rate?: number, delay?: number }} GameAudioLayer */
/** @typedef {{ files: (string | GameAudioFile)[], volume?: number, rate?: number, jitter?: number, gap?: number, dur?: number, duck?: number[], layers?: GameAudioLayer[] }} GameAudioDef */
/** @typedef {{ f: string, v: number }} GameAudioTrack */

/** @satisfies {Record<string, any>} */
const GameAudio = {
    /** @type {Record<string, GameAudioDef>} */
    defs: {
        // --- бой ---
        throw: { files: ['assets/sounds/throw-1.ogg', 'assets/sounds/throw-2.ogg'], volume: 0.6, gap: 60 },
        fly: { files: ['assets/sounds/fly-1.ogg', 'assets/sounds/fly-2.ogg'], volume: 0.4, jitter: 0.12, gap: 80 },
        hit: {
            files: ['assets/sounds/hit-1.ogg', 'assets/sounds/hit-2.ogg', 'assets/sounds/hit-3.ogg'],
            volume: 0.55,
            layers: [{ name: 'thud', volume: 0.5 }],
        },
        hitArmor: {
            files: ['assets/sounds/armor-1.ogg', 'assets/sounds/armor-2.ogg', 'assets/sounds/armor-3.ogg'],
            volume: 0.6, jitter: 0.1,
        },
        crit: {
            files: [{ f: 'assets/sounds/crit-1.ogg' }, { f: 'assets/sounds/crit-2.ogg', v: 0.7 }],
            volume: 0.85,
            layers: [{ name: 'hit', volume: 0.8 }, { name: 'sparkle', volume: 0.35, delay: 0.04 }],
        },
        blockBreak: {
            files: [{ f: 'assets/sounds/block-1.ogg', v: 0.6 }, { f: 'assets/sounds/block-2.ogg', r: 1.5 }],
            volume: 0.7, jitter: 0.1, gap: 50,
        },
        mobDie: { files: ['assets/sounds/pop-1.ogg', 'assets/sounds/pop-2.ogg'], volume: 0.45, jitter: 0.12, gap: 30 },
        catch: { files: ['assets/sounds/catch.ogg'], volume: 0.45 },
        thud: { files: ['assets/sounds/thud.ogg'], volume: 0.5 },
        boom: { files: ['assets/sounds/boom-1.ogg'], volume: 0.5 },

        // --- награды и итоги ---
        coin: {
            files: [{ f: 'assets/sounds/coin-1.ogg' }, { f: 'assets/sounds/coin-2.ogg', v: 0.85 }],
            volume: 0.6, jitter: 0.06, gap: 30,
        },
        coins: {
            files: [{ f: 'assets/sounds/coins-1.ogg' }, { f: 'assets/sounds/coins-2.ogg', v: 0.75 }, { f: 'assets/sounds/coins-3.ogg', v: 0.9 }],
            volume: 0.85, jitter: 0.04, gap: 100,
        },
        star1: { files: ['assets/sounds/star.ogg'], volume: 0.9, rate: 1, jitter: 0, gap: 0 },
        star2: { files: ['assets/sounds/star.ogg'], volume: 0.9, rate: 1.26, jitter: 0, gap: 0 },
        star3: {
            files: ['assets/sounds/star.ogg'], volume: 0.9, rate: 1.5, jitter: 0, gap: 0,
            layers: [{ name: 'sparkle', volume: 0.5, delay: 0.06 }],
        },
        win: {
            files: ['assets/sounds/win.ogg'], volume: 0.8, jitter: 0, gap: 300, duck: [0.3, 1.4],
            layers: [{ name: 'sparkle', volume: 0.4, delay: 0.4 }],
        },
        lose: { files: ['assets/sounds/lose.ogg'], volume: 1, jitter: 0, gap: 300, duck: [0.3, 1.6] },
        lifeLost: {
            files: [{ f: 'assets/sounds/life-1.ogg' }, { f: 'assets/sounds/life-2.ogg', v: 0.9 }],
            volume: 1, jitter: 0.06, gap: 120,
            layers: [{ name: 'thud', volume: 0.8 }],
        },

        // --- интерфейс ---
        click: { files: ['assets/sounds/click-1.ogg', 'assets/sounds/click-2.ogg'], volume: 0.45, jitter: 0.05, gap: 25 },
        buy: { files: ['assets/sounds/buy.ogg'], volume: 0.63, jitter: 0, layers: [{ name: 'coin', volume: 0.8, delay: 0.06 }] },
        equip: { files: ['assets/sounds/equip.ogg'], volume: 0.9, layers: [{ name: 'click', volume: 0.6 }] },
        error: { files: ['assets/sounds/error.ogg'], volume: 0.6, jitter: 0.03, gap: 120 },
        gift: { files: ['assets/sounds/gift.ogg'], volume: 1, jitter: 0, gap: 200, layers: [{ name: 'sparkle', volume: 0.7, delay: 0.22 }] },
        wheelTick: { files: ['assets/sounds/tick-1.ogg', 'assets/sounds/tick-2.ogg'], volume: 0.6, jitter: 0.05, gap: 25 },
        wheelWin: {
            files: ['assets/sounds/wheelwin.ogg'], volume: 0.75, jitter: 0, gap: 300, duck: [0.4, 0.9],
            layers: [{ name: 'coins', volume: 0.7, delay: 0.3 }],
        },
        unlock: {
            files: ['assets/sounds/unlock.ogg'], volume: 1, jitter: 0, gap: 300, duck: [0.3, 1.3],
            layers: [{ name: 'sparkle', volume: 0.7, delay: 0.45 }],
        },
        toast: { files: ['assets/sounds/toast.ogg'], volume: 0.56, jitter: 0.03, gap: 100 },

        // --- мир и мобы ---
        mobSpawn: { files: ['assets/sounds/spawn-1.ogg', 'assets/sounds/spawn-2.ogg'], volume: 0.5 },
        bossRoar: {
            files: [{ f: 'assets/sounds/roar-1.ogg', r: 0.65 }, { f: 'assets/sounds/roar-2.ogg', r: 0.6 }],
            volume: 1, jitter: 0.04, gap: 300, duck: [0.35, 1.8],
            layers: [{ name: 'boom', volume: 0.45, delay: 0.05 }],
        },
        bossStomp: {
            files: ['assets/sounds/boom-1.ogg'], volume: 0.9, jitter: 0.05, gap: 200,
            layers: [{ name: 'thud', volume: 0.9 }, { name: 'blockBreak', volume: 0.5, delay: 0.05 }],
        },
        explosion: {
            files: ['assets/sounds/explosion-1.ogg', 'assets/sounds/explosion-2.ogg'], volume: 1, jitter: 0.06, gap: 60,
            layers: [{ name: 'boom', volume: 0.6 }],
        },
        fuse: { files: ['assets/sounds/fuse.ogg'], volume: 0.75, rate: 1.1 },
        slime: { files: [{ f: 'assets/sounds/slime.ogg', r: 0.8 }], volume: 0.7, dur: 1.1 },
        ghost: { files: [{ f: 'assets/sounds/ghost.ogg', r: 0.75 }], volume: 0.6 },
        wizard: {
            files: [{ f: 'assets/sounds/hum.ogg', r: 1.1 }], volume: 0.45,
            layers: [{ name: 'sparkle', volume: 0.7, delay: 0.12 }],
        },
        snowball: { files: ['assets/sounds/snow-1.ogg', 'assets/sounds/snow-2.ogg'], volume: 1, jitter: 0.1 },
        dice: { files: ['assets/sounds/dice-1.ogg', 'assets/sounds/dice-2.ogg', 'assets/sounds/dice-3.ogg'], volume: 0.85, gap: 150 },
        step: { files: ['assets/sounds/step-1.ogg', 'assets/sounds/step-2.ogg', 'assets/sounds/step-3.ogg'], volume: 0.35, jitter: 0.1, gap: 100 },
        jump: { files: ['assets/sounds/jump.ogg'], volume: 0.45, gap: 100 },

        // --- стихии мечей ---
        fire: { files: ['assets/sounds/fire.ogg'], volume: 0.95, layers: [{ name: 'boom', volume: 0.25 }] },
        ice: {
            files: [{ f: 'assets/sounds/ice-1.ogg' }, { f: 'assets/sounds/ice-2.ogg', v: 0.65 }], volume: 0.58,
            layers: [{ name: 'star1', volume: 0.4, rate: 1.8, delay: 0.02 }],
        },
        lightning: {
            files: ['assets/sounds/zap-1.ogg', 'assets/sounds/zap-2.ogg'], volume: 0.6,
            layers: [{ name: 'explosion', volume: 0.3, delay: 0.04 }],
        },
        poison: { files: ['assets/sounds/poison.ogg'], volume: 0.7, rate: 1.15 },
        void: { files: [{ f: 'assets/sounds/warp-1.ogg', v: 0.7 }, { f: 'assets/sounds/warp-2.ogg', v: 0.85 }], volume: 1 },
        holy: { files: ['assets/sounds/holy.ogg'], volume: 0.63, layers: [{ name: 'hum', volume: 0.6 }] },
        wind: { files: ['assets/sounds/wind.ogg'], volume: 1, rate: 1.1, jitter: 0.1 },
        vampire: { files: ['assets/sounds/drain.ogg'], volume: 0.8, rate: 1.25, jitter: 0.06 },
        laser: { files: [{ f: 'assets/sounds/laser-1.ogg', v: 0.45 }, { f: 'assets/sounds/laser-2.ogg', v: 0.9 }], volume: 1 },
        water: { files: ['assets/sounds/water.ogg'], volume: 0.7 },
        meteor: { files: ['assets/sounds/boom-2.ogg'], volume: 0.7, layers: [{ name: 'explosion', volume: 0.6, delay: 0.1 }] },
        glitch: { files: [{ f: 'assets/sounds/glitch-1.ogg' }, { f: 'assets/sounds/glitch-2.ogg', v: 0.75 }], volume: 0.8 },
        rainbow: { files: ['assets/sounds/rainbow.ogg'], volume: 0.67, jitter: 0, layers: [{ name: 'sparkle', volume: 0.6, delay: 0.2 }] },
        chainsaw: { files: ['assets/sounds/saw.ogg'], volume: 0.55, rate: 1.7, jitter: 0.05, dur: 0.7 },
        sparkle: { files: ['assets/sounds/sparkle.ogg'], volume: 0.73 },
        hum: { files: ['assets/sounds/hum.ogg'], volume: 0.4 },
    },

    /**
     * Дорожки музыки: главная тема, босс и по треку на каждый из 10 биомов (ключ = id биома из GameData).
     * v — громкость, выровненная по уровню файла (× MUSIC_VOLUME из Constants.js); все файлы одной громкости.
     * @type {Record<string, GameAudioTrack>}
     */
    tracks: {
        menu: { f: 'assets/sounds/music-menu.ogg', v: 1 },
        boss: { f: 'assets/sounds/music-boss.ogg', v: 1 },
        plains: { f: 'assets/sounds/music-plains.ogg', v: 1 },
        desert: { f: 'assets/sounds/music-desert.ogg', v: 1 },
        birch: { f: 'assets/sounds/music-birch.ogg', v: 1 },
        taiga: { f: 'assets/sounds/music-taiga.ogg', v: 1 },
        jungle: { f: 'assets/sounds/music-jungle.ogg', v: 1 },
        mushroom: { f: 'assets/sounds/music-mushroom.ogg', v: 1 },
        badlands: { f: 'assets/sounds/music-badlands.ogg', v: 1 },
        nether: { f: 'assets/sounds/music-nether.ogg', v: 1 },
        end: { f: 'assets/sounds/music-end.ogg', v: 1 },
        sky: { f: 'assets/sounds/music-sky.ogg', v: 1 },
    },

    /**
     * Стихия меча (docs/DESIGN.md, § 3) -> ключ звука.
     * @type {Record<string, string>}
     */
    elementSound: {
        fire: 'fire', ice: 'ice', wind: 'wind', water: 'water', nature: 'wind', candy: 'sparkle', crush: 'thud',
        lightning: 'lightning', explode: 'explosion', void: 'void', holy: 'holy', vampire: 'vampire', split: 'throw',
        pierce: 'ghost', giant: 'thud', laser: 'laser', shadow: 'void', meteor: 'meteor', glitch: 'glitch',
        rainbow: 'rainbow', chainsaw: 'chainsaw', cosmic: 'void', solar: 'fire', lunar: 'holy', infinity: 'rainbow',
        poison: 'poison', crit: 'crit', gold: 'coin',
    },

    /**
     * Что играет сейчас: запрошенный вид (menu, boss, id биома) и id дорожки (совпадает с видом).
     * @type {string | null}
     */
    musicKind: null,
    /** @type {string | null} */
    musicTrack: null,

    /** @type {Record<string, number>} */
    _last: {},          // имя -> время последнего запуска (мс), для ограничения частоты
    /** @type {Record<string, number>} */
    _lastVariant: {},   // имя -> индекс последнего варианта (подряд не повторяем)
    /** @type {Record<string, boolean>} */
    _warned: {},

    /** Эффект. opts: { volume, rate } множатся на значения записи. Возвращает { stop(), fade(с) } или null. */
    play(name, opts) {
        return this._play(name, opts || {}, false);
    },

    /** Звезда итогов уровня: 1, 2 или 3 (одна запись, чем больше, тем выше). */
    star(n) {
        const i = Math.max(1, Math.min(3, Math.round(Number(n)) || 1));
        return this.play('star' + i);
    },

    /** Звук стихии меча по её id (fire, ice, lightning, …); неизвестная стихия молчит. */
    playElement(element, opts) {
        const name = this.elementSound[element];
        return name ? this.play(name, opts) : null;
    },

    _warn(what) {
        if (this._warned[what]) return;
        this._warned[what] = true;
        console.warn('GameAudio: нет звука или музыки «' + what + '»');
    },

    _play(name, o, layer) {
        const def = this.defs[name];
        if (!def) { this._warn(name); return null; }
        if (o.delay > 0) {
            const later = Object.assign({}, o, { delay: 0 });
            setTimeout(() => this._play(name, later, layer), o.delay * 1000);
            return null;
        }
        const now = Date.now();
        const gap = def.gap == null ? 40 : def.gap;
        if (!layer && gap > 0 && now - (this._last[name] || 0) < gap) return null;
        this._last[name] = now;

        // Вариант: случайный, но не тот же самый подряд.
        const n = def.files.length;
        const last = this._lastVariant[name];
        const i = n < 2 ? 0 : last == null ? Math.floor(Math.random() * n) : (last + 1 + Math.floor(Math.random() * (n - 1))) % n;
        this._lastVariant[name] = i;
        const file = def.files[i];
        const url = typeof file === 'string' ? file : file.f;
        const fileVolume = typeof file === 'string' || file.v == null ? 1 : file.v;
        const fileRate = typeof file === 'string' || file.r == null ? 1 : file.r;

        const jitter = def.jitter == null ? 0.08 : def.jitter;
        const rate = (def.rate || 1) * fileRate * (o.rate || 1) * (jitter ? 1 + (Math.random() * 2 - 1) * jitter : 1);
        const volume = (def.volume == null ? 1 : def.volume) * fileVolume * (o.volume == null ? 1 : o.volume);

        if (def.duck) Sound.duck(def.duck[0], 0.08, def.duck[1], 0.7);
        const handle = Sound.play(url, { volume, rate });
        if (handle && def.dur > 0) setTimeout(() => handle.fade(0.06), def.dur * 1000);

        if (!layer && def.layers) {
            for (const l of def.layers) {
                this._play(l.name, {
                    volume: (l.volume == null ? 1 : l.volume) * (o.volume == null ? 1 : o.volume),
                    rate: l.rate, delay: l.delay,
                }, true);
            }
        }
        return handle;
    },

    /**
     * Цикл (фитиль, пила): { set(громкость, скорость), fade(с), stop() }. Громкость и скорость в set — множители
     * записи (set(1, 1.3) — как в карте, но быстрее). Берётся первый вариант. Неизвестное имя — пустой handle.
     */
    loop(name, opts) {
        const def = this.defs[name];
        if (!def) {
            this._warn(name);
            return { set() {}, fade() {}, stop() {} };
        }
        const o = opts || {};
        const file = def.files[0];
        const url = typeof file === 'string' ? file : file.f;
        const baseVolume = (def.volume == null ? 1 : def.volume) * (typeof file === 'string' || file.v == null ? 1 : file.v);
        const baseRate = (def.rate || 1) * (typeof file === 'string' || file.r == null ? 1 : file.r);
        const h = Sound.loop(url, { volume: baseVolume * (o.volume == null ? 1 : o.volume), rate: baseRate * (o.rate || 1) });
        return {
            set(volume, rate) { h.set(volume == null ? null : baseVolume * volume, rate == null ? null : baseRate * rate); },
            fade(seconds) { h.fade(seconds); },
            stop() { h.stop(); },
        };
    },

    /** Заранее загрузить и декодировать эффекты (по умолчанию все): первый удар не опаздывает. Промис. */
    preload(names) {
        /** @type {string[]} */
        const urls = [];
        for (const key of names || Object.keys(this.defs)) {
            const def = this.defs[key];
            if (!def) continue;
            for (const file of def.files) {
                const url = typeof file === 'string' ? file : file.f;
                if (!urls.includes(url)) urls.push(url);
            }
        }
        return Sound.preload(urls);
    },

    /**
     * Музыка: 'menu' | 'boss' | id биома (plains, desert, birch, taiga, jungle, mushroom, badlands, nether, end, sky).
     * Тот же трек повторно не перезапускается (повторный вызов с тем же видом ничего не меняет).
     * opts: { fade } — секунды плавной смены (по умолчанию 0.6). Неизвестный вид — предупреждение, музыка не меняется.
     */
    music(kind, opts) {
        const id = this.tracks[kind] ? kind : null;
        const track = id ? this.tracks[id] : null;
        if (!track) { this._warn('music:' + kind); return; }
        this.musicKind = kind;
        this.musicTrack = id;
        Sound.music(track.f, { volume: track.v, fade: opts && opts.fade });
    },

    stopMusic() {
        this.musicKind = null;
        this.musicTrack = null;
        Sound.stopMusic();
    },
};
