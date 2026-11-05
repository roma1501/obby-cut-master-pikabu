// Game.js — Obby Cut Master: ход игры. Вид от первого лица, героя нет: игрок ведёт меч пальцем
// (GameSword) и режет мобов по линии свайпа (GameChars + GameSlice). Меню на фоне мира биома,
// уровень под экраном загрузки (app.loadMap биома + prepare), волны мобов, ИИ, статусы стихий,
// снаряды, боссы, реквизит дорожки, победа/поражение, сохранение. Интерфейс — GameUI (docs/UI-CONTRACT.md).
// Логика держит позиции сама (px карты: x, y; h — высота), Babylon — только вид (инвариант 4).

/** @satisfies {Record<string, any>} */
const Game = {
    /** @type {LoryApp | null} */
    app: null,
    /** @type {any} */
    save: null,
    /** @type {any} */
    level: null,          // GameData.level(n) текущего уровня
    /** @type {any[]} */
    mobs: [],
    /** @type {any[]} */
    shots: [],            // снаряды мобов (кости, снежки, магия)
    /** @type {any[]} */
    props: [],            // TNT и сундуки на дорожке
    running: false,       // идёт бой
    state: 'boot',        // boot | menu | intro | play | win | lose
    timeScale: 1,
    _stop: 0,             // остаток стоп-кадра
    hearts: 3,
    heartsMax: 3,
    runCoins: 0,
    kills: 0,
    vampKills: 0,
    waveIndex: 0,
    _spawnQ: [],          // очередь появления: { t, type, variant }
    _waveT: 0,
    _t: 0,
    _loading: false,
    _pending: 0,          // мобы, которые ещё создаются (модель грузится)
    lane: { x0: 2090, x1: 2710, y0: 900, y1: 6300, px: 2400, py: 5800 },
    /** @type {any} */
    boss: null,
    _menuLevel: 1,
    // Повторы моделей мира на карте (плитки дорожки, бортики, холмы, облака) — одной пачкой на модель.
    BATCH_REPEATED: ['assets/' + 'models/world/'],
    mode: 'campaign',     // campaign | survival
    /** @type {Record<string, number>} */
    mods: {},             // модификаторы перков выживания (в кампании пусто)

    // --- Запуск ------------------------------------------------------------------------------

    // Тексты всплывающих подписей боя (ru/en) — добавляются в LANG_STRINGS при старте.
    TEXT: {
        ru: { 'fx.miss': 'МИМО', 'fx.block': 'БЛОК', 'fx.shieldBroken': 'ЩИТ СЛОМАН!', 'fx.rage': 'ЗЛЮСЬ!', 'fx.headless': 'БЕЗ ГОЛОВЫ!', 'fx.pop': 'ПУФ!', 'fx.dodge': 'УКЛОН!', 'fx.regen': 'ОТРОСЛО!', 'fx.heal': '+ЛЕЧЕНИЕ', 'fx.tired': 'МЕЧ УСТАЛ', 'fx.frozen': 'МЕЧ ЗАМЁРЗ', 'fx.stun': 'ВЫБИТ!', 'fx.sever': 'ОТРУБЛЕНО! КРИТ', 'fx.execute': 'КАЗНЬ!', 'fx.barrier': 'ЗАЩИТА!', 'fx.phoenix': 'ФЕНИКС!', 'fx.wind': 'ВТОРОЕ ДЫХАНИЕ', 'fx.smite': 'КАРА!', 'fx.apocalypse': 'АПОКАЛИПСИС!', 'surv.title': 'Выживание', 'surv.wave': 'Волна {n}' },
        en: { 'fx.miss': 'MISS', 'fx.block': 'BLOCK', 'fx.shieldBroken': 'SHIELD BROKEN!', 'fx.rage': 'ANGRY!', 'fx.headless': 'HEADLESS!', 'fx.pop': 'POP!', 'fx.dodge': 'DODGE!', 'fx.regen': 'REGROWN!', 'fx.heal': '+HEAL', 'fx.tired': 'SWORD TIRED', 'fx.frozen': 'SWORD FROZEN', 'fx.stun': 'KNOCKED!', 'fx.sever': 'SEVERED! CRIT', 'fx.execute': 'EXECUTE!', 'fx.barrier': 'BLOCKED!', 'fx.phoenix': 'PHOENIX!', 'fx.wind': 'SECOND WIND', 'fx.smite': 'SMITE!', 'fx.apocalypse': 'APOCALYPSE!', 'surv.title': 'Survival', 'surv.wave': 'Wave {n}' },
    },

    async init(app) {
        this.app = app;
        for (const lang of ['ru', 'en']) { const d = /** @type {any} */ (LANG_STRINGS)[lang]; if (d) for (const k in this.TEXT[lang]) if (!(k in d)) d[k] = this.TEXT[lang][k]; }
        this.save = this.defaultSave();
        try {
            const s = await Platform.load();
            if (s && typeof s === 'object') this.save = Object.assign(this.defaultSave(), s);
        } catch (e) { this._loadFailed = true; console.warn('Game: сохранение не прочиталось', e); }
        this.sanitizeSave();
        this.initSystems();
        GameWorld.init(app);
        GameFX.init(app);
        GameChars.init(app);
        GameSword.init(app);
        await GameLook.init(app);
        app.onUpdate(dt => { Rig.updateAll(dt * this.timeScale); });
        await this.ui('init', app, this);
        this.initTutorial();
        // Меню — на фоне мира биома последнего открытого уровня.
        this._menuLevel = Math.min(GameData.LEVEL_COUNT, this.save.level);
        await this.prepareMenuScene(app);
    },

    async ready() {
        this.state = 'menu';
        this.ui('showMenu');
        GameAudio.music('menu');
        Platform.gameplay(false);
    },

    defaultSave() {
        return {
            v: 1, level: 1, stars: {}, swords: ['wood'], sword: 'wood', swordAds: {}, kills: 0, best: 0, noticeSeen: false, survivalBest: 0,
            tutorialDone: false, settings: { music: 1, sfx: 1, quality: 'auto' },
            shop: null, daily: null, wheel: null,
        };
    },

    // Магазин косметики, подарок дня и колесо: их состояние — поля единого сохранения.
    // Валюта одна на всю игру — Shop.coins (мечи покупаются за неё же).
    initSystems() {
        const s = this.save;
        const persist = () => this.persist();
        // Реклама за косметику — через GameAds: пауза 12 с между просмотрами многопросмотровых предметов.
        Shop.init({ tabs: GameShopData.TABS, items: GameShopData.ITEMS, state: s.shop, persist,
            rewarded: () => GameAds.watch('shop-unlock'), adsAvailable: () => GameAds.available() });
        s.shop = Shop.state;
        if (s.coins > 0) { Shop.addCoins(s.coins, { save: false }); }   // старая валюта сохранения — в магазин
        delete s.coins;
        DailyGift.init({ rewards: GameShopData.DAILY, exclusive: GameShopData.DAILY_EXCLUSIVE, rewardsSink: Shop, state: s.daily, persist });
        s.daily = DailyGift.state;
        Wheel.init({ sectors: GameShopData.WHEEL, rewardsSink: Shop, state: s.wheel, persist });
        s.wheel = Wheel.state;
        Shop.on((e) => {
            if (e.type === 'equip' || e.type === 'unequip' || e.type === 'preview' || e.type === 'grant') GameLook.apply(Shop.look());
            if (e.type === 'coins') this.ui('onCoinsChanged', Shop.coins);
        });
    },

    get coins() { return Shop.coins; },

    sanitizeSave() {
        const s = this.save;
        s.level = Math.max(1, Math.min(GameData.LEVEL_COUNT, Math.floor(Number(s.level) || 1)));
        if (!Array.isArray(s.swords) || !s.swords.length) s.swords = ['wood'];
        if (!s.swords.includes('wood')) s.swords.unshift('wood');
        if (!s.swords.includes(s.sword)) s.sword = 'wood';
        if (!s.stars || typeof s.stars !== 'object') s.stars = {};
        if (!s.settings) s.settings = { music: 1, sfx: 1, quality: 'auto' };
    },

    persist() {
        if (this._loadFailed) return;   // сохранение не прочиталось — не затирать облако
        Platform.save(this.save);
    },

    // --- Сцена меню и уровня ------------------------------------------------------------------

    // Биом уровня n уже загружен? Меню: мир биома, игрок в позе ожидания, без мобов.
    async prepareMenuScene(app) {
        const lvl = GameData.level(this._menuLevel);
        if (app.map && app.map.id !== lvl.biome) {
            await app.loadMap(lvl.biome, { prepare: a => this._setupScene(a, lvl, true), label: Lang.t('loading') });
        } else {
            await this._setupScene(app, lvl, true);
        }
    },

    // Общая подготовка сцены (под экраном загрузки): мир биома, игрок, меч, реквизит.
    async _setupScene(app, lvl, menu) {
        this.cleanup();
        this.level = lvl;
        const pm = app.location.marker('player');
        const ln = app.location.marker('lane');
        this.lane.px = pm ? pm.x : 2400;
        this.lane.py = pm ? pm.y : 5800;
        if (ln) {
            const hw = (ln.scale ? ln.scale[0] : 3.1) * 100, hl = (ln.scale ? ln.scale[2] : 28) * 100;
            this.lane.x0 = ln.x - hw; this.lane.x1 = ln.x + hw; this.lane.y0 = ln.y - hl; this.lane.y1 = ln.y + hl;
        }
        await GameWorld.setup(lvl);
        GameWorld.mode(menu ? 'menu' : 'intro', true);
        const types = [];
        if (!menu) for (const w of lvl.waves) for (const g of w.groups) { types.push(g.type); const md = GameData.MOBS[g.type]; if (md && md.minions) types.push(...md.minions); }
        await GameChars.preload(types);
        GameSword.reset();
        await GameSword.equip(this.save.sword);
        GameLook.apply(Shop.look());
        if (!menu) await this.spawnProps(lvl);
    },

    // Реквизит дорожки по маркерам prop, prop-2…: TNT взрывается от меча, сундук даёт монеты.
    async spawnProps(lvl) {
        const marks = this.app.location.markers('prop');
        const R = GameData.rng(lvl.seed + 3);
        const free = marks.slice().sort(() => R() - 0.5);
        for (const kind of lvl.props) {
            const m = free.shift();
            if (!m) break;
            const url = kind === 'tnt' ? 'assets/models/world/tnt.glb' : kind === 'heart' ? 'assets/models/world/prop_heart.glb' : kind === 'ice' ? 'assets/models/world/prop_ice.glb' : kind === 'bolt' ? 'assets/models/world/prop_bolt.glb' : 'assets/models/world/chest.glb';
            let mesh = null;
            try { const model = await Model3D.load(url); mesh = Model3D.build(model, this.app.location.view.scene, { name: kind }); } catch (e) { mesh = null; }
            if (!mesh) {
                mesh = BABYLON.MeshBuilder.CreateBox(kind, { size: 80 }, this.app.location.view.scene);
                const mat = new BABYLON.StandardMaterial(kind + '-m', this.app.location.view.scene);
                mat.diffuseColor = BABYLON.Color3.FromHexString(kind === 'tnt' ? '#db2b1e' : kind === 'heart' ? '#ff5a9a' : kind === 'ice' ? '#9fe8ff' : kind === 'bolt' ? '#ffd84a' : '#a0672a');
                mesh.material = mat;
                mesh.position.y = 40;
            }
            mesh.position.x = m.x; mesh.position.z = m.y;
            mesh.rotation.y = -((m.rot ? m.rot[1] : 0) * Math.PI / 180) + Math.PI / 2;
            World3D.addObject(this.app.location.view, mesh, 'prop');
            // Подсказка «это можно разрубить»: мерцающие искры над предметом.
            const col = { tnt: '#ffb040', chest: '#ffe066', heart: '#ff7ab8', ice: '#bff4ff', bolt: '#fff27a' }[kind] || '#ffffff';
            const hint = this.app.fx ? this.app.fx.create({ follow: () => new BABYLON.Vector3(m.x, 95, m.y), texture: 'assets/fx/sparkle_4pt.webp', rate: 7, capacity: 12, life: [0.5, 1], size: [10, 18], speed: [10, 40], color: col, color2: '#ffffff', box: [[-40, -10, -40], [40, 30, 40]] }) : null;
            this.props.push({ kind, mesh, x: m.x, y: m.y, alive: true, hint });
        }
    },

    // Убрать всё уровня (мобы, снаряды, реквизит, обломки, мечи, игрок).
    cleanup() {
        this.running = false;
        for (const m of this.mobs) this._disposeMob(m);
        this.mobs = [];
        for (const s of this.shots) { if (s.mesh && !s.mesh.isDisposed()) s.mesh.dispose(); }
        this.shots = [];
        for (const p of this.props) { if (p.hint) p.hint.dispose(); if (p.mesh && !p.mesh.isDisposed()) World3D.removeObject(this.app.location.view, p.mesh); }
        this.props = [];
        GameSword.reset();
        GameChars.clearDebris();
        GameFX.clear();
        GameFX.blobs([], false);
        this.boss = null;
        this._spawnQ = [];
        this.timeScale = 1; this._stop = 0;
    },

    // --- Уровень -----------------------------------------------------------------------------

    // Начать уровень n (кнопка «Играть», «Далее», «Заново»).
    async startLevel(n) {
        if (this._loading) return;
        this._loading = true;
        this.mode = 'campaign';
        this.mods = {};
        GameSurvival.run = null;
        const lvl = GameData.level(n);
        try {
            await this.app.loadMap(lvl.biome, {
                label: Lang.t('levelN', { n: lvl.n }),
                gameplay: true,
                prepare: async (app) => {
                    await this._setupScene(app, lvl, false);
                    this.beginRound(lvl);
                    this.ui('showHUD', lvl);
                },
            });
        } finally { this._loading = false; }
        GameAudio.music(lvl.boss ? 'boss' : lvl.biome);
        this.ui('onLevelStart', lvl);
        if (typeof Tutorial !== 'undefined') Tutorial.autoStart();
    },

    beginRound(lvl) {
        const boost = GameAds.takeBoosts();
        this.coinMul = boost.coins;
        this.heartsMax = Math.max(1, typeof GAME_HEARTS !== 'undefined' ? GAME_HEARTS : 3) + boost.hearts;
        this.hearts = this.heartsMax;
        this.runCoins = 0;
        this.kills = 0;
        this.vampKills = 0;
        this.waveIndex = -1;
        this._waveT = 0;
        this._t = 0;
        this._spawnQ = [];
        this.state = 'intro';
        this.running = true;
        this._introT = 1.2;
        Telemetry.progress && Telemetry.progress('started', lvl.survival ? 'survival' : 'level_' + lvl.n, { step_index: lvl.n });
    },

    // Следующая волна в очередь появления.
    _nextWave() {
        const lvl = this.level;
        this.waveIndex++;
        const w = lvl.waves[this.waveIndex];
        if (!w) return false;
        let t = this._t + (w.delay || 0.5);
        const q = [];
        for (const g of w.groups) {
            let tt = t;
            for (let i = 0; i < g.count; i++) { q.push({ t: tt, type: g.type, variant: g.variant || null }); tt += g.gap || 1; }
        }
        q.sort((a, b) => a.t - b.t);
        this._spawnQ.push(...q);
        // Выживание: волна бесконечного забега (всего — 0, то есть «без конца»).
        if (lvl.survival) this.ui('onWave', GameSurvival.run.wave, 0); else this.ui('onWave', this.waveIndex + 1, lvl.waves.length);
        return true;
    },

    // --- Мобы --------------------------------------------------------------------------------

    async spawnMob(type, variant, at) {
        const def = GameData.MOBS[type];
        if (!def) return null;
        const v = variant ? GameData.VARIANTS[variant] : null;
        const scale = (def.scale || 1) * (v ? v.scale : 1);
        this._pending++;
        let ch = null;
        try { ch = await GameChars.create(type, { scale }); } finally { this._pending--; }
        if (!ch || !this.running) { if (ch) GameChars.dispose(ch); return null; }
        const spawns = this.app.location.markers(def.boss ? 'boss' : 'spawn');
        const sp = at || spawns[(Math.random() * spawns.length) | 0] || { x: this.lane.px, y: this.lane.py - 2400 };
        const lvl = this.level;
        const hp = def.hp * lvl.hpMul * (v ? v.hp : 1);
        const mob = {
            type, def, variant, ch, rig: ch.rig, scale, alive: true,
            x: Math.max(this.lane.x0 + 40, Math.min(this.lane.x1 - 40, sp.x + (Math.random() - 0.5) * 80)), y: sp.y + (Math.random() - 0.5) * 60, h: 0,
            hp, maxHp: hp, speed: def.speed * 0.42 * lvl.spMul * (v ? v.speed : 1) * (0.92 + Math.random() * 0.16),
            armor: (def.armor || 0) * (1 + (lvl.n - 1) * 0.02),
            goalX: this.lane.px + (Math.random() - 0.5) * 260,
            st: { burn: 0, burnDps: 0, poison: 0, poisonDps: 0, slow: 0, slowK: 1, freeze: 0, root: 0 },
            kx: 0, ky: 0, act: 'walk', actT: 0, timer: 1 + Math.random() * 2, phase: Math.random() * 6,
            auras: {}, hitCd: 0, attacking: false, shieldHits: def.armor ? 2 : 0, bossPhase: 0,
        };
        // Способности: свои у типа + от варианта (шустрый, в пузыре, живучий, в броне).
        mob.ab = new Set([].concat(def.ab || [], (v && v.ab) || []));
        if (mob.ab.has('shield')) mob.shieldHp = 2;
        const M = this.mods;
        if (M.slow) mob.speed *= Math.max(0.5, 1 - M.slow);
        if (M.foresight) mob.ab.delete('dodge');
        if (M.noregen) mob.ab.delete('regen');
        mob.cd = { dodge: 0, leap: 2 + Math.random() * 2, stomp: 3 + Math.random() * 2, shoot: 2 + Math.random() * 2, blink: 2.5 + Math.random() * 2, bubble: 1.5 };
        if (def.ai === 'ranged') mob.stopY = this.lane.py - 560 - Math.random() * 120;
        if (def.ai === 'healer') mob.stopY = this.lane.py - 640 - Math.random() * 100;
        mob.rig.root.position.set(mob.x, 0, mob.y);
        mob.rig.root.rotation.y = -Math.PI / 2;     // лицом к +Y карты — к игроку
        this._playMove(mob);
        if (variant === 'golden') { ch.tint = [0.28, 0.2, 0.02]; mob.auras.gold = GameFX.aura('holy', () => this._auraPos(mob)); }
        if (mob.ab.has('bubbleStart')) setTimeout(() => this.giveBubble(mob), 50);
        this.mobs.push(mob);
        GameFX.poof(new BABYLON.Vector3(mob.x, 60, mob.y));
        if (def.boss) {
            this.boss = mob;
            GameAudio.play('bossRoar');
            if (mob.rig.has('roar')) mob.rig.play('roar', { loop: false, onEnd: () => this._playMove(mob) });
            this.app.camera.shake(600, 0.03);
            this.ui('showBoss', mob);
        } else GameAudio.play('mobSpawn', { volume: 0.4 });
        return mob;
    },

    _auraPos(mob) { return new BABYLON.Vector3(mob.x, mob.h + 10, mob.y); },

    _playMove(mob) {
        const clip = mob.def.clip;
        const r = mob.rig;
        if (r.has(clip)) r.play(clip, { at: Math.random() }); else if (r.has('walk')) r.play('walk', { at: Math.random() });
        r.speed = Math.max(0.6, Math.min(1.8, mob.speed / (mob.def.speed || 100)));
    },

    distTo(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },

    nearestMob(x, y, maxD) {
        let best = null, bd = maxD || 1e9;
        for (const m of this.mobs) { if (!m.alive) continue; const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } }
        return best;
    },

    // Самый опасный: ближе всех к игроку (по оси дорожки).
    dangerMob() {
        let best = null, by = -1e9;
        for (const m of this.mobs) if (m.alive && m.y > by) { by = m.y; best = m; }
        return best;
    },

    status(mob, kind, t, v) {
        const s = mob.st;
        if (kind === 'burn') { s.burn = Math.max(s.burn, t); s.burnDps = Math.max(s.burnDps, v); if (!mob.auras.fire) mob.auras.fire = GameFX.aura('fire', () => this._auraPos(mob)); }
        if (kind === 'poison') { s.poison = Math.max(s.poison, t); s.poisonDps = Math.max(s.poisonDps, v); if (!mob.auras.poison) mob.auras.poison = GameFX.aura('poison', () => this._auraPos(mob)); }
        if (kind === 'slow') { s.slow = Math.max(s.slow, t); s.slowK = Math.min(s.slowK, v); if (!mob.auras.ice && v <= 0.6) mob.auras.ice = GameFX.aura('ice', () => this._auraPos(mob)); }
        if (kind === 'freeze' && !mob.def.boss) { s.freeze = Math.max(s.freeze, t); }
        if (kind === 'root' && !mob.def.boss) { s.root = Math.max(s.root, t); if (!mob.auras.root) mob.auras.root = GameFX.aura('root', () => this._auraPos(mob)); }
    },

    knock(mob, px) { if (!mob.def.boss) mob.ky -= px * 6; else mob.ky -= px; },

    pull(mob, to, px) {
        if (mob.def.boss) return;
        const d = Math.max(1, this.distTo(mob, to));
        mob.kx += (to.x - mob.x) / d * px * 4;
        mob.ky += (to.y - mob.y) / d * px * 4;
    },

    // Центр «груди» моба (вид): цель эффектов и цифр урона.
    chest(mob) {
        return new BABYLON.Vector3(mob.x, (mob.def.fly || 0) + mob.h + 95 * mob.scale, mob.y);
    },

    // Урон: броня, крит, глитч; цифра, вспышка, звук. Возвращает нанесённое.
    damage(mob, dmg, info) {
        if (!mob || !mob.alive) return 0;
        const i = info || {};
        let d = dmg;
        if (mob.armor > 0 && !i.pierceArmor) d = Math.max(d * 0.25, d - mob.armor);
        if (i.crush && mob.armor > 0) d *= 2;
        if (mob.def.boss && i.glitch) d *= 2;
        if (i.glitch && !mob.def.boss) d = mob.hp + 1;
        d = Math.max(1, Math.round(d));
        mob.hp -= d;
        GameChars.impact(mob.ch, i.main === false ? 0.5 : 1);
        const c = i.at || this.chest(mob);
        GameFX.text(c, String(d), i.glitch ? 'glitch' : i.crit ? 'crit' : (i.main === false ? 'small' : 'hit'));
        GameAudio.play(mob.armor > 0 && !i.pierceArmor ? 'hitArmor' : (i.crit ? 'crit' : 'hit'), { volume: i.main === false ? 0.5 : 1 });
        if (mob.def.boss && mob.hp > 0) this._bossPhase(mob);
        this.ui('onMobHit', mob);
        return d;
    },

    // Крепкий враг: жизненно важные части (голова, торс) отделяются только смертельным ударом,
    // до этого на них остаётся шрам-разрез. Обычные враги режутся сразу — как фрукты.
    isTough(mob) {
        const v = mob.variant;
        return !!(mob.def.boss || mob.def.armor || mob.def.hp >= 60 || v === 'giant' || v === 'golden' || v === 'armored' || v === 'regen');
    },

    // Разрез мечом: часть piece моба рассечена плоскостью (точка, нормаль — мир) по линии свайпа.
    // scr — точки свайпа на экране { a, b } (для вспышки ровно вдоль линии).
    sliceMob(mob, piece, point, normal, swipe, def, scr) {
        if (!mob.alive) return;
        const now = performance.now();
        const ab = mob.ab || new Set();
        const angle = scr ? Math.atan2(-(scr.b.y - scr.a.y), scr.b.x - scr.a.x) : GameSword.screenAngle(point.subtract(swipe.scale(60)), point.add(swipe.scale(60)));
        // Неосязаемый (призрак, слендер после телепорта): меч проходит насквозь.
        const M = this.mods;
        if (mob.intangible && !M.ghost) {
            if (!mob._missAt || now - mob._missAt > 400) { mob._missAt = now; GameFX.text(point, Lang.t('fx.miss'), 'small'); GameAudio.play('ghost', { volume: 0.4 }); }
            return;
        }
        // Магический пузырь (колдун) гасит первый разрез.
        if (mob.bubble) { this.popBubble(mob, point); if (!M.bubble) return; }
        let el = def.element;
        // Призма: каждый разрез — случайная стихия.
        if (M.rainbow) el = GameData.RAINBOW_POOL[(Math.random() * GameData.RAINBOW_POOL.length) | 0];
        if (el === 'rainbow') el = GameData.RAINBOW_POOL[(Math.random() * GameData.RAINBOW_POOL.length) | 0];
        if (el === 'infinity') el = GameData.INFINITY_CYCLE[(this._inf = (this._inf || 0) + 1) % GameData.INFINITY_CYCLE.length];
        const part = GameChars.partName(piece);
        const vital = part === 'Head' || part === 'Torso';
        const look = typeof GameLook !== 'undefined' ? GameLook.slashLook() : null;
        const elColor = (GameData.ELEMENTS[el] || GameData.ELEMENTS.none).color;
        // Щит рыцаря: удар по щиту ломает его (2 удара), остальные удары, пока щит цел, — блок.
        let blockMul = 1;
        if (ab.has('shield') && mob.shieldHp > 0) {
            if (/Shield/i.test(part)) {
                mob.shieldHp -= M.shieldBreak ? 99 : 1;
                GameFX.burst(point, '#fff6c0', 18, [200, 520], [6, 12]);
                GameAudio.play('hitArmor');
                GameFX.slash(point, angle, '#ffffff', 0.8, look);
                if (mob.shieldHp <= 0) {
                    GameChars.cutPiece(mob.ch, piece, point, normal, swipe, 1);
                    GameFX.text(point, Lang.t('fx.shieldBroken'), 'big');
                }
                return;
            }
            blockMul = 0.3;
            if (!mob._blockAt || now - mob._blockAt > 300) { mob._blockAt = now; GameFX.text(point, Lang.t('fx.block'), 'small'); GameAudio.play('hitArmor', { volume: 0.6 }); }
        }
        // Урон — не чаще раза за проход меча сквозь моба (рука и торс одним свайпом = один удар).
        let crit = false;
        if (!mob._dmgAt || now - mob._dmgAt > 140) {
            mob._dmgAt = now;
            let dmg = def.dmg * blockMul * this.dmgMul(mob);
            if (def.element === 'chainsaw') dmg *= 0.6;
            if ((el === 'crit' && Math.random() < 0.25) || (def.element === 'infinity' && Math.random() < 0.15) || (M.crit && Math.random() < M.crit)) { dmg *= 3; crit = true; }
            if ((el === 'holy' || def.element === 'solar') && mob.def.undead) dmg *= 1.5;
            if (vital) dmg *= 1.35;
            if (M.first && !mob._struck) dmg *= 2;
            if (M.double) dmg *= 1.6;
            mob._struck = true;
            const glitch = el === 'glitch' && Math.random() < 0.15;
            this.damage(mob, dmg, { crit, el, sword: def, pierceArmor: el === 'crush' || !!M.armor, crush: el === 'crush', glitch, at: point.clone() });
            this._perkHit(mob, dmg, point, swipe, angle, def);
            GameSword.element(mob, el, point, dmg, def, swipe);
            this._stop = Math.max(this._stop, typeof GAME_HITSTOP !== 'undefined' ? GAME_HITSTOP : 0.045);
            this.app.camera.shake(100, mob.def.boss ? 0.009 : 0.005);
            mob.lastCutAt = now;
            // Ярость (бекон): после первого разреза злится и ускоряется.
            if (ab.has('rage') && !mob.raged) { mob.raged = true; mob.speed *= 1.6; mob.ch.tint = [0.32, 0.16, 0]; GameFX.text(this.chest(mob), Lang.t('fx.rage'), 'small'); }
            // Лава: разрез выплёскивает огненный шар в игрока — разруби его.
            if (ab.has('magma') && Math.random() < 0.7) this.shoot(mob, 'fire');
        }
        const tough = this.isTough(mob);
        const lethal = mob.hp <= 0;
        GameFX.slash(point, angle, crit ? '#ffe066' : ((look && look.color) || elColor), 0.95 * Math.max(0.85, mob.scale), look);
        GameFX.cubes(point, GameChars.palette(mob.type), 8, swipe, 0.8, mob.scale * 0.8);
        // Броня робота: первый разрез части только трескает её (искры), второй — режет.
        const armor2 = ab.has('armor2') && !piece._cracked && !lethal && !M.armor;
        if (armor2) {
            piece._cracked = true;
            GameFX.burst(point, '#3affea', 16, [180, 480], [6, 12]);
            this.scar(mob, piece, point, normal, '#3affea');
            GameAudio.play('hitArmor');
            if (mob.alive && mob.hp <= 0) this.killMob(mob, { dir: swipe, sword: def, at: point });
            return;
        }
        // Геометрия: обычные — режутся всегда; у крепких голова и торс — только смертельным ударом.
        const headless = ab.has('headless') && part === 'Head';
        const canCut = !vital || !tough || lethal || headless;
        const maxCuts = (piece.metadata && piece.metadata.cut) || 0;
        let severedHead = false, severedLimb = false;
        if (canCut && maxCuts < 4) {
            const neck = part === 'Torso' ? GameChars.jointPos(mob.ch, 'Head').clone() : null;
            const res = GameChars.cutPiece(mob.ch, piece, point, normal, swipe, lethal ? 1.25 : 1);
            if (res) {
                GameAudio.play('blockBreak', { volume: 0.75 });
                GameFX.paint(point, res.inner, swipe, lethal || vital ? 1.25 : 0.95);
                GameFX.cutFlash(point, normal, angle, res.inner);
                if (part === 'Head') severedHead = true;
                if (neck && res.fell) {
                    // Торс рассечён: шея на отлетевшей половине — голова уходит вместе с ней.
                    res.kept.computeWorldMatrix(true);
                    res.kept.refreshBoundingInfo();
                    const kc = res.kept.getBoundingInfo().boundingSphere.centerWorld;
                    const side = BABYLON.Vector3.Dot(neck.subtract(point), normal) * BABYLON.Vector3.Dot(kc.subtract(point), normal);
                    if (side < 0) severedHead = true;
                }
                if (/^Leg/.test(part)) {
                    mob.speed *= 0.72; mob.legCut = (mob.legCut || 0) + 1;
                    // Зомби без ног ползёт.
                    if (ab.has('crawl') && mob.legCut >= 2 && !mob.crawl) { mob.crawl = true; mob.speed *= 0.6; }
                }
                if (/^Arm/.test(part) && ab.has('panic') && !mob.panic) { mob.panic = true; mob.speed *= 1.35; }
                // Отрубленная рука или нога (у любого врага) — большой критический урон, один раз на конечность.
                if (/^(Arm|Leg)/.test(part) && res.fell) {
                    const limbs = mob._limbs || (mob._limbs = new Set());
                    if (!limbs.has(part)) { limbs.add(part); severedLimb = true; }
                }
            } else if (vital) this.scar(mob, piece, point, normal, null);
        } else if (vital) {
            // Крепкий враг держит удар: светящийся шрам по линии разреза.
            this.scar(mob, piece, point, normal, null);
        }
        if (severedLimb && mob.alive) {
            const big = def.dmg * 1.21 * this.dmgMul(mob) * (mob.def.boss ? 0.7 : 1);
            this.damage(mob, big, { crit: true, el, sword: def, pierceArmor: true, at: point.clone() });
            GameFX.text(this.chest(mob), Lang.t('fx.sever'), 'big');
            GameFX.flash(point, 120 * mob.scale, '#fff2a0', 0.16);
            GameFX.burst(point, '#ffe066', 22, [160, 460], [8, 16]);
            this.app.camera.shake(160, 0.009);
            this._stop = Math.max(this._stop, 0.07);
        }
        // Охотник за головами: отсечённая голова — монеты и выносливость.
        if (severedHead && M.head && mob.alive) {
            const c = 5 * M.head;
            this.runCoins += c;
            GameFX.text(this.chest(mob), '+' + c, 'coin');
            GameSword.stamina = Math.min(GameSword.staminaMax, GameSword.stamina + 0.6 * M.head);
        }
        // Палач: недобитый враг (≤20% здоровья) гибнет от любого разреза.
        if (M.execute && mob.alive && mob.hp > 0 && !mob.def.boss && mob.hp <= mob.maxHp * M.execute) {
            mob.hp = 0;
            GameFX.text(this.chest(mob), Lang.t('fx.execute'), 'big');
        }
        const dead = lethal || mob.hp <= 0;
        // Тыквоголовый без головы бегает ещё пару секунд.
        if (severedHead && headless && !dead) { mob.headless = 2.4; mob.speed *= 1.8; GameFX.text(this.chest(mob), Lang.t('fx.headless'), 'big'); return; }
        if (dead || severedHead) this.killMob(mob, { dir: swipe, glitch: false, sword: def, headOff: severedHead, at: point });
    },

    // Множитель урона перков (кампания — 1): сила, безумие, по боссам и гигантам, по нежити.
    dmgMul(mob) {
        const M = this.mods, run = GameSurvival.run;
        let k = 1 + (M.dmg || 0);
        if (run && run.frenzy) k *= 1 + run.frenzy * 0.08;
        if (M.bossDmg && (mob.def.boss || mob.variant === 'giant')) k *= 1 + M.bossDmg;
        if (M.noregen && mob.def.undead) k *= 1.2;
        return k;
    },

    // Перки при попадании: кромки стихий, искра, цепная молния, отбрасывание, эхо, двойной разрез.
    _perkHit(mob, dmg, point, swipe, angle, def) {
        const M = this.mods;
        if (this.mode !== 'survival') return;
        if (M.fire) this.status(mob, 'burn', 3, Math.max(2, dmg * 0.25));
        if (M.ice) { this.status(mob, 'slow', 2, 0.6); if (Math.random() < 0.15) this.status(mob, 'freeze', 1.2, 0); }
        if (M.poison) this.status(mob, 'poison', 4, Math.max(2, dmg * 0.2));
        if (M.knock) this.knock(mob, 70);
        const others = (n) => this.mobs.filter(o => o.alive && o !== mob).sort((a, b) => this.distTo(a, mob) - this.distTo(b, mob)).slice(0, n);
        if (M.spark && Math.random() < M.spark) for (const o of others(1)) { GameFX.lightning(this.chest(mob), this.chest(o), '#9fe8ff'); this.zap(o, dmg * 0.5, def, 'lightning'); }
        if (M.chain) for (const o of others(2)) { GameFX.lightning(this.chest(mob), this.chest(o), '#fff27a'); this.zap(o, dmg * 0.4, def, 'lightning'); }
        if (M.double) GameFX.slash(point, angle + Math.PI / 2, '#ffffff', 0.85, typeof GameLook !== 'undefined' ? GameLook.slashLook() : null);
        if (M.echo) {
            const at = point.clone();
            setTimeout(() => {
                if (!mob.alive || !this.running) return;
                GameFX.slash(at, angle + 0.5, '#bfe8ff', 0.8, typeof GameLook !== 'undefined' ? GameLook.slashLook() : null);
                this.damage(mob, dmg * M.echo, { main: false, at });
                if (mob.hp <= 0) this.killMob(mob, { dir: swipe, sword: def, at });
            }, 170);
        }
    },

    // Шрам-разрез: светящаяся линия по месту разреза на части (остаётся на мобе).
    scar(mob, piece, point, normal, color) {
        const geo = GameSlice.read(piece);
        if (!geo) return;
        const pl = GameSlice.planeToLocal(piece, point, normal);
        const sp = GameSlice.split(geo, pl.n, pl.d);
        if (!sp.segs.length) return;
        const scene = this.app.location.view.scene;
        const lines = sp.segs.map(([p, q]) => [new BABYLON.Vector3(p[0], p[1], p[2]), new BABYLON.Vector3(q[0], q[1], q[2])]);
        const ls = BABYLON.MeshBuilder.CreateLineSystem('scar', { lines }, scene);
        ls.color = BABYLON.Color3.FromHexString(GameFX.safeColor(color || GameSlice.cutColor(piece.material, sp.uvs, '#ffffff')));
        ls.parent = piece;
        ls.isPickable = false;
        ls.renderingGroupId = World3D.LAYER ? World3D.LAYER.OVERLAY : 1;
        GameWorld.addGlow(ls);
        mob.ch.extra.push(ls);
    },

    // Пузырь-щит колдуна.
    giveBubble(mob) {
        if (mob.bubble || !mob.alive) return;
        const scene = this.app.location.view.scene;
        const s = BABYLON.MeshBuilder.CreateSphere('bubble', { diameter: 260, segments: 12 }, scene);
        const mat = new BABYLON.StandardMaterial('bubble-mat', scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString('#7fe3ff');
        mat.emissiveColor = BABYLON.Color3.FromHexString('#3a8aff');
        mat.alpha = 0.28;
        mat.specularColor = new BABYLON.Color3(1, 1, 1);
        mat.specularPower = 64;
        mat.metadata = { toon: false };
        s.material = mat;
        s.parent = mob.rig.root;
        s.position.y = 95;
        s.isPickable = false;
        mob.bubble = s;
        mob.ch.extra.push(s);
        GameFX.burst(this.chest(mob), '#7fe3ff', 14, [60, 160]);
    },

    popBubble(mob, point) {
        const s = mob.bubble;
        mob.bubble = null;
        if (s && !s.isDisposed()) { if (s.material) s.material.dispose(); s.dispose(); }
        GameFX.ring(new BABYLON.Vector3(mob.x, 60, mob.y), 260, '#7fe3ff', 0.35);
        GameFX.burst(point, '#bff4ff', 22, [200, 480], [8, 16]);
        GameFX.text(point, Lang.t('fx.pop'), 'small');
        GameAudio.play('blockBreak', { volume: 0.6 });
    },

    // Урон без разреза (молния, лазер, взрыв, метеор, огонь): по смерти моб рассыпается.
    zap(mob, dmg, def, el) {
        if (!mob || !mob.alive) return;
        this.damage(mob, dmg, { el: el || 'zap', sword: def, main: false });
        GameFX.cubes(this.chest(mob), GameChars.palette(mob.type), 4, null, 0.6, mob.scale * 0.8);
        if (mob.hp <= 0) this.killMob(mob, { dir: new BABYLON.Vector3(0, 0, -1), sword: def });
    },

    killMob(mob, info) {
        if (!mob.alive) return;
        const i = info || {};
        mob.alive = false;
        const dir = i.dir && i.dir.length() > 0 ? i.dir : new BABYLON.Vector3(0, 0, -1);
        const c = this.chest(mob);
        GameChars.shatter(mob.ch, dir, mob.def.boss ? 1.6 : 1.1);
        GameFX.cubes(c, GameChars.palette(mob.type), mob.def.boss ? 60 : 22, dir, 1.3, mob.scale);
        GameFX.flash(c, 140 * mob.scale, '#ffffff', 0.18);
        const pal = GameChars.palette(mob.type);
        for (let k = 0; k < 3; k++) GameFX.paint(c.add(new BABYLON.Vector3((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0)), pal[k % pal.length], dir, 1.3);
        if (typeof GameLook !== 'undefined') GameLook.killEffect(c, mob);
        if (i.sword || GameSword.def) GameSword.onKill(mob, c, i.sword || GameSword.def);
        GameAudio.play('blockBreak');
        GameAudio.play('mobDie');
        this.app.camera.shake(mob.def.boss ? 700 : 160, mob.def.boss ? 0.04 : 0.008);
        GameWorld.kick(mob.def.boss ? 1 : 0.18);
        if (i.glitch) { GameFX.text(c, 'ERASED', 'glitch'); GameAudio.play('glitch'); }
        // Монеты.
        let coins = Math.round(GameData.mobCoins(mob.type, this.level.n, mob.variant) * (this.coinMul || 1) * (1 + (this.mods.coins || 0)));
        if (mob.goldMark) coins = Math.round(coins * 1.6);
        if (mob.candy) coins += 2;
        this.runCoins += coins;
        this.kills++;
        GameFX.coinBurst(c);
        GameAudio.play('coin', { volume: 0.6 });
        this.ui('onCoins', coins, this.app.location.view.projectToScreen(c.x, c.z, c.y));
        // Вампиризм: каждые 6 убийств — сердце.
        if (GameSword.def && GameSword.def.element === 'vampire') {
            this.vampKills++;
            if (this.vampKills % 6 === 0 && this.hearts < (typeof GAME_HEARTS_MAX !== 'undefined' ? GAME_HEARTS_MAX : 5)) {
                this.hearts++;
                GameAudio.play('vampire');
                this.ui('onHearts', this.hearts, this.heartsMax, +1);
            }
        }
        // Подрывник взрывается и при смерти — задевает соседей.
        if (mob.def.ai === 'exploder') setTimeout(() => this._explodeAt(mob.x, mob.y, 260, 40 * this.level.hpMul, mob), 60);
        // Слайм делится на двух малышей.
        if (mob.def.ai === 'hop' && mob.variant !== 'mini' && this.running) {
            for (const dx of [-70, 70]) this.spawnMob(mob.type, 'mini', { x: mob.x + dx, y: mob.y - 40 });
        }
        if (mob === this.boss) { this.boss = null; this.ui('hideBoss'); this.app.camera.shake(900, 0.05); }
        for (const k in mob.auras) { if (mob.auras[k]) mob.auras[k].stop(); }
        mob.auras = {};
        mob.deadT = 0;
        if (this.mode === 'survival') this._perkKill(mob, c, dir);
        if (typeof Tutorial !== 'undefined') Tutorial.complete('kill');
    },

    // Перки при убийстве (выживание).
    _perkKill(mob, c, dir) {
        const M = this.mods, run = GameSurvival.run;
        if (!run) return;
        run.perkKills++;
        const n = run.perkKills;
        const near = (r) => this.mobs.filter(o => o.alive && o !== mob && Math.hypot(o.x - mob.x, o.y - mob.y) < r);
        if (M.frenzy) { run.frenzy = Math.min(5, run.frenzy + 1); run.frenzyT = 3; }
        if (M.tireless) run.tirelessT = M.tireless;
        if (M.slowmo) this._slowmo = 0.55;
        if (M.splash) for (const o of near(380)) this.status(o, 'slow', 2.5, 0.55);
        if (M.hole) { for (const o of near(600)) this.pull(o, mob, 160); GameFX.ring(new BABYLON.Vector3(mob.x, 30, mob.y), 600, '#b45cff', 0.5); }
        if (M.boom && Math.random() < M.boom) setTimeout(() => this._explodeAt(mob.x, mob.y, 300, (GameSword.def ? GameSword.def.dmg : 20) * 1.4, mob), 80);
        if (M.vamp && n % M.vamp === 0) this.heal(1);
        if (M.smite && n % M.smite === 0) {
            GameFX.text(c, Lang.t('fx.smite'), 'big');
            GameAudio.play('lightning');
            for (const o of this.mobs) if (o.alive) { GameFX.pillar ? GameFX.pillar(new BABYLON.Vector3(o.x, 0, o.y), '#fff2a0') : null; this.zap(o, (GameSword.def ? GameSword.def.dmg : 20) * 1.5, GameSword.def, 'holy'); }
        }
        if (M.meteor && n % M.meteor === 0) {
            const t = this.dangerMob();
            if (t) GameSword.meteor(t, (GameSword.def ? GameSword.def.dmg : 20) * 3, GameSword.def);
        }
    },

    // Меч-близнец: призрачный меч сам режет случайного врага.
    cloneCut() {
        const list = this.mobs.filter(m => m.alive && !m.intangible && m.y > this.lane.py - 2600);
        if (!list.length || !GameSword.def) return;
        const mob = list[(Math.random() * list.length) | 0];
        const pieces = mob.ch.pieces.filter(p => p.isEnabled());
        const piece = pieces[(Math.random() * pieces.length) | 0];
        if (!piece) return;
        piece.computeWorldMatrix(true);
        const c = piece.getBoundingInfo().boundingSphere.centerWorld.clone();
        const cam = this.app.location.view.camera;
        const fwd = cam.getForwardRay(1).direction;
        const a = Math.random() * Math.PI;
        const swipe = cam.getDirection(BABYLON.Axis.X).scale(Math.cos(a)).add(cam.getDirection(BABYLON.Axis.Y).scale(Math.sin(a))).normalize();
        const normal = BABYLON.Vector3.Cross(swipe, fwd).normalize();
        GameFX.beam ? GameFX.beam(c.add(swipe.scale(-160)), c.add(swipe.scale(160)), '#9fe8ff') : null;
        GameAudio.play('fly', { volume: 0.5 });
        this.sliceMob(mob, piece, c, normal, swipe, Object.assign({}, GameSword.def, { dmg: GameSword.def.dmg * 0.7 }), null);
    },

    _explodeAt(x, y, r, dmg, src) {
        GameFX.explosion(new BABYLON.Vector3(x, 60, y), r);
        GameAudio.play('explosion');
        if (!this.running) return;
        for (const m of this.mobs) if (m.alive && m !== src && Math.hypot(m.x - x, m.y - y) < r) this.zap(m, dmg, GameSword.def, 'explode');
    },

    _disposeMob(m) {
        for (const k in m.auras) { if (m.auras[k]) m.auras[k].dispose(); }
        m.auras = {};
        GameChars.dispose(m.ch);
    },

    // Фазы босса: на 66% и 33% — рык, удар по земле, подкрепление.
    _bossPhase(mob) {
        const f = mob.hp / mob.maxHp;
        const want = f < 0.34 ? 2 : f < 0.67 ? 1 : 0;
        if (want <= mob.bossPhase) return;
        mob.bossPhase = want;
        mob.act = 'roar'; mob.actT = 1.4;
        GameAudio.play('bossRoar');
        const r = mob.rig;
        const clip = r.has('stomp') ? 'stomp' : r.has('roar') ? 'roar' : null;
        if (clip) r.play(clip, { loop: false, events: [{ frac: 0.55, fn: () => { GameFX.ring(new BABYLON.Vector3(mob.x, 0, mob.y), 520, '#ffffff', 0.6); GameFX.dust(new BABYLON.Vector3(mob.x, 0, mob.y)); GameAudio.play('bossStomp'); this.app.camera.shake(500, 0.04); } }], onEnd: () => this._playMove(mob) });
        const list = mob.def.minions || ['noob'];
        for (let k = 0; k < 2 + want; k++) this.spawnMob(list[k % list.length], null, { x: mob.x + (k - 1) * 160, y: mob.y + 120 });
    },

    // --- Снаряды мобов -----------------------------------------------------------------------

    async shoot(mob, kindOverride) {
        const kind = kindOverride || mob.def.shot || (mob.ab && mob.ab.has('ranged') ? 'magic' : 'bone');
        const url = kind === 'snowball' ? 'assets/models/world/proj_snowball.glb' : kind === 'magic' ? 'assets/models/world/proj_magic.glb' : kind === 'fire' ? '' : 'assets/models/world/proj_bone.glb';
        const scene = this.app.location.view.scene;
        let mesh = null;
        try { if (url) { const model = await Model3D.load(url); mesh = Model3D.build(model, scene, { name: 'shot' }); } } catch (e) { mesh = null; }
        if (!mesh) {
            mesh = kind === 'snowball' || kind === 'fire' ? BABYLON.MeshBuilder.CreateSphere('shot', { diameter: 40, segments: 6 }, scene) : BABYLON.MeshBuilder.CreateBox('shot', { width: 60, height: 14, depth: 14 }, scene);
            const mat = new BABYLON.StandardMaterial('shot-m', scene);
            mat.diffuseColor = BABYLON.Color3.FromHexString(kind === 'magic' ? '#b45cff' : kind === 'fire' ? '#ff8a2a' : '#f4f4ec');
            if (kind === 'fire') { mat.emissiveColor = BABYLON.Color3.FromHexString('#ff6a1a'); GameWorld.addGlow(mesh); }
            mesh.material = mat;
        }
        if (!this.running) { mesh.dispose(); return; }
        World3D.addObject(this.app.location.view, mesh, 'actor', { ink: false });
        const sx = mob.x, sy = mob.y + 30, sh = 150 * mob.scale;
        const tx = this.lane.px + (Math.random() - 0.5) * 120, ty = this.lane.py - 60;
        const d = Math.hypot(tx - sx, ty - sy);
        this.shots.push({ isShot: true, alive: true, mesh, kind, sx, sy, sh, tx, ty, x: sx, y: sy, h: sh, k: 0, dur: Math.max(1.8, d / 480) * (1 + (this.mods.shotSlow || 0)), arc: 160 + d * 0.08, def: { fly: 0, undead: false }, scale: 0.4 });
        GameAudio.play(kind === 'snowball' ? 'snowball' : 'throw', { volume: 0.6 });
    },

    // Меч разбил снаряд.
    breakShot(s, swipe) {
        if (!s.alive) return;
        s.alive = false;
        const p = new BABYLON.Vector3(s.x, s.h, s.y);
        GameFX.cubes(p, s.kind === 'snowball' ? ['#ffffff', '#e8f4ff'] : s.kind === 'magic' ? ['#c070ff', '#ff7ad8'] : ['#f4f4ec', '#d8d8cc'], 12, swipe, 0.9, 0.7);
        GameFX.slash(p, GameSword.screenAngle(p.subtract(swipe.scale(50)), p.add(swipe.scale(50))), '#ffffff', 0.6);
        GameAudio.play('blockBreak', { volume: 0.6 });
    },

    _updateShots(dt) {
        for (let i = this.shots.length - 1; i >= 0; i--) {
            const s = this.shots[i];
            if (!s.alive) { if (!s.mesh.isDisposed()) World3D.removeObject(this.app.location.view, s.mesh); this.shots.splice(i, 1); continue; }
            s.k += dt / s.dur;
            const k = Math.min(1, s.k);
            s.x = s.sx + (s.tx - s.sx) * k;
            s.y = s.sy + (s.ty - s.sy) * k;
            s.h = s.sh + (60 - s.sh) * k + Math.sin(k * Math.PI) * s.arc;
            s.mesh.position.set(s.x, s.h, s.y);
            s.mesh.rotation.x += dt * 10; s.mesh.rotation.z += dt * 7;
            if (s.alive && s.k >= 1) {
                s.alive = false;
                if (s.kind === 'snowball') { GameSword.freeze(1.5); GameFX.burst(new BABYLON.Vector3(s.x, s.h, s.y), '#ffffff', 20, [100, 300]); GameAudio.play('ice'); }
                else this.damagePlayer(1, new BABYLON.Vector3(s.x, s.h, s.y));
            }
        }
    },

    // --- Игрок получает урон --------------------------------------------------------------

    damagePlayer(n, at) {
        if (this.state !== 'play') return;
        const run = this.mode === 'survival' ? GameSurvival.run : null;
        if (run && (run.angel > 0 || run.barrier > 0)) {
            if (run.angel > 0) run.angel--; else run.barrier--;
            const p = at || new BABYLON.Vector3(this.lane.px, 120, this.lane.py - 200);
            GameFX.ring(new BABYLON.Vector3(this.lane.px, 40, this.lane.py - 160), 420, '#9fe8ff', 0.5);
            GameFX.text(p, Lang.t('fx.barrier'), 'big');
            GameAudio.play('hitArmor');
            this.ui('onSurvivalHud', run);
            return;
        }
        this.hearts = Math.max(0, this.hearts - n);
        GameAudio.play('lifeLost');
        this.app.camera.shake(380, 0.03);
        GameWorld.kick(0.8);
        if (at) GameFX.flash(at, 160, '#ffffff', 0.2);
        this.ui('onHearts', this.hearts, this.heartsMax, -n);
        if (this.hearts <= 0) {
            // Феникс: один раз за забег встаёт с 2 сердцами, ближние враги отброшены.
            if (run && this.mods.revive && !run.revived) {
                run.revived = true;
                this.hearts = Math.min(2, this.heartsMax);
                for (const m of this.mobs) if (m.alive) { m.y = Math.min(m.y, this.lane.py - 900); m.attacking = false; this._playMove(m); this.status(m, 'burn', 3, 6); }
                GameFX.pillar ? GameFX.pillar(new BABYLON.Vector3(this.lane.px, 0, this.lane.py - 300), '#ffb040') : null;
                GameFX.text(new BABYLON.Vector3(this.lane.px, 160, this.lane.py - 400), Lang.t('fx.phoenix'), 'big');
                GameAudio.play('unlock');
                this.ui('onHearts', this.hearts, this.heartsMax, +this.hearts);
                return;
            }
            this.lose();
        }
    },

    // Предел сердец: в выживании выше (перки).
    heartsCap() { return this.mode === 'survival' ? 8 : (typeof GAME_HEARTS_MAX !== 'undefined' ? GAME_HEARTS_MAX : 5); },

    // Лечение до максимума сердец.
    heal(n) {
        const before = this.hearts;
        this.hearts = Math.min(this.heartsMax, this.hearts + n);
        if (this.hearts > before) { GameAudio.play('vampire'); this.ui('onHearts', this.hearts, this.heartsMax, this.hearts - before); }
    },

    // --- Кадр --------------------------------------------------------------------------------

    update(dt) {
        if (!this.app || !this.app.location) return;
        dt = Math.max(0, Math.min(0.1, dt || 0));
        // Стоп-кадр удара: мир почти стоит.
        if (this._stop > 0) { this._stop -= dt; this.timeScale = 0.06; } else this.timeScale = Math.min(1, this.timeScale + dt * 12);
        if (this._slowmo > 0 && this._stop <= 0) { this._slowmo -= dt; this.timeScale = Math.min(this.timeScale, 0.4); }
        if (!this.running) {
            for (const m of this.mobs) if (!m.alive) this._reapMob(m, dt);
            return;
        }
        const sdt = dt * this.timeScale;
        this._t += sdt;
        if (this.state === 'intro') {
            this._introT -= dt;
            if (this._introT <= 0) { this.state = 'play'; GameWorld.mode('play'); this._nextWave(); }
        }
        if (this.state === 'play') {
            // Появление по очереди.
            while (this._spawnQ.length && this._spawnQ[0].t <= this._t) {
                const s = this._spawnQ.shift();
                this.spawnMob(s.type, s.variant);
            }
            const alive = this.mobs.some(m => m.alive);
            if (!this._spawnQ.length && !alive && !this._pendingSpawns()) {
                if (!this._nextWave()) { if (this.mode === 'survival') this._survivalWaveDone(); else this.win(); }
            }
            if (this.mode === 'survival') {
                GameSurvival.update(sdt);
                // Апокалипсис: каждую 3-ю волну через 5 с — взрыв по всем обычным врагам.
                const run = GameSurvival.run;
                if (run && run.apocT > 0) {
                    run.apocT -= sdt;
                    if (run.apocT <= 0) {
                        GameFX.text(new BABYLON.Vector3(this.lane.px, 220, this.lane.py - 1200), Lang.t('fx.apocalypse'), 'big');
                        this.app.camera.shake(700, 0.05);
                        for (const m of this.mobs) if (m.alive && !m.def.boss) { GameFX.explosion(this.chest(m), 160); this.zap(m, m.hp + 1, GameSword.def, 'explode'); }
                        GameAudio.play('explosion');
                    }
                }
            }
        }
        for (const m of this.mobs) {
            if (m.alive) this._updateMob(m, sdt); else this._reapMob(m, dt);
            GameChars.paint(m.ch, dt);
        }
        this.mobs = this.mobs.filter(m => m.alive || !m.reaped);
        this._separate();
        this._updateShots(sdt);
        GameFX.blobs(this.mobs, !GameChars.realShadows());
        this.ui('update', dt);
    },

    _pendingSpawns() { return this._pending > 0; },

    _reapMob(m, dt) {
        m.deadT = (m.deadT || 0) + dt;
        if (m.deadT > 0.1 && !m.reaped) { m.reaped = true; this._disposeMob(m); }
    },

    _updateMob(m, dt) {
        const st = m.st, def = m.def;
        // Статусы.
        if (st.burn > 0) { st.burn -= dt; m._dot = (m._dot || 0) + st.burnDps * dt; }
        else if (m.auras.fire) { m.auras.fire.stop(); m.auras.fire = null; }
        if (st.poison > 0) { st.poison -= dt; m._dot = (m._dot || 0) + st.poisonDps * dt; }
        else if (m.auras.poison) { m.auras.poison.stop(); m.auras.poison = null; }
        if (st.slow > 0) st.slow -= dt; else { st.slowK = 1; if (m.auras.ice) { m.auras.ice.stop(); m.auras.ice = null; } }
        if (st.root > 0) st.root -= dt; else if (m.auras.root) { m.auras.root.stop(); m.auras.root = null; }
        if (st.freeze > 0) st.freeze -= dt;
        if (m._dot >= 1) {
            const d = Math.floor(m._dot); m._dot -= d;
            m.hp -= d;
            GameFX.text(this.chest(m), String(d), st.burn > 0 ? 'burn' : 'poison');
            if (m.hp <= 0) { this.killMob(m, { dir: new BABYLON.Vector3(0, 0, -1) }); return; }
        }
        this._abilities(m, dt);
        if (!m.alive) return;
        const frozen = st.freeze > 0;
        m.ch.tint = frozen ? [0.15, 0.35, 0.55] : st.burn > 0 ? [0.35 + 0.15 * Math.sin(this._t * 20), 0.12, 0] : st.poison > 0 ? [0.05, 0.25, 0.02] : (m.variant === 'golden' ? [0.28, 0.2, 0.02] : m.raged ? [0.3, 0.15, 0] : m.fuse && Math.sin(this._t * 18) > 0.2 ? [0.6, 0.6, 0.6] : null);
        m.rig.speed = frozen ? 0 : Math.max(0.5, st.slowK);
        // Отброс и притяжение (затухают).
        m.x += m.kx * dt; m.y += m.ky * dt;
        m.kx *= Math.pow(0.02, dt); m.ky *= Math.pow(0.02, dt);
        if (frozen || st.root > 0) { this._place(m); return; }
        if (m.act === 'roar') { m.actT -= dt; if (m.actT <= 0) m.act = 'walk'; this._place(m); return; }
        const spd = m.speed * st.slowK;
        const toY = this.lane.py - (typeof GAME_REACH !== 'undefined' ? GAME_REACH : 120) * (def.boss ? 1.6 : 1);
        m.timer -= dt;
        switch (def.ai) {
            case 'ranged':
            case 'healer':
                if (m.y < m.stopY) m.y += spd * dt;
                else if (m.timer <= 0) {
                    m.timer = def.ai === 'healer' ? 4.2 : 2.8 + Math.random();
                    if (def.ai === 'healer') this._heal(m); else {
                        const clip = m.rig.has('shoot') ? 'shoot' : null;
                        if (clip) m.rig.play(clip, { layer: 'upper', loop: false, events: [{ frac: 0.5, fn: () => this.shoot(m) }] }); else this.shoot(m);
                    }
                    // Постепенно подходит ближе.
                    m.stopY += 70;
                }
                break;
            case 'dash':
                m.y += spd * dt;
                if (m.timer <= 0) { m.timer = 2.2 + Math.random() * 1.5; m.kx += (Math.random() < 0.5 ? -1 : 1) * 420; m.ky += 160; GameFX.poof(new BABYLON.Vector3(m.x, 40, m.y)); }
                break;
            case 'teleport':
                m.y += spd * dt;
                if (m.timer <= 0 && m.y < toY - 260) {
                    m.timer = 3 + Math.random() * 1.5;
                    GameFX.burst(this.chest(m), '#c070ff', 22, [80, 260]);
                    m.y += 90 + Math.random() * 60; m.x = this.lane.x0 + 60 + Math.random() * (this.lane.x1 - this.lane.x0 - 120);
                    GameFX.burst(this.chest(m), '#c070ff', 22, [80, 260]);
                    GameAudio.play('void');
                    this._ghost(m, true); m.intangibleT = 0.6;
                }
                break;
            case 'hop': {
                m.phase += dt * 3.2 * (m.variant === 'mini' ? 1.4 : 1);
                const s = Math.sin(m.phase);
                m.h = Math.max(0, s) * 70 * m.scale;
                if (s > 0) m.y += spd * 1.6 * dt;
                break;
            }
            case 'float':
                m.phase += dt * 2;
                m.h = 20 + Math.sin(m.phase) * 22;
                m.y += spd * dt;
                m.x += Math.sin(m.phase * 0.6) * 90 * dt;
                break;
            default:
                m.y += spd * dt;
        }
        // К игроку по ширине: плавно к своей цели внутри дорожки.
        if (def.ai !== 'float') m.x += Math.sign(m.goalX - m.x) * Math.min(Math.abs(m.goalX - m.x), spd * 0.25 * dt);
        m.x = Math.max(this.lane.x0 + 40, Math.min(this.lane.x1 - 40, m.x));
        // Дошёл — бьёт.
        if (m.y >= toY && !m.attacking) {
            m.attacking = true;
            m.y = toY;
            const hit = () => {
                if (!m.alive) return;
                if (def.ai === 'exploder') { this._explodeAt(m.x, m.y, 200, 0, m); this.damagePlayer(2, this.chest(m)); }
                else this.damagePlayer(def.boss ? this.hearts : 1, this.chest(m));
                // Ударивший моб исчезает облачком (без монет).
                m.alive = false; m.reaped = false; m.deadT = 0;
                GameChars.shatter(m.ch, new BABYLON.Vector3(0, 0, -1), 0.6);
                GameFX.poof(this.chest(m));
                for (const k in m.auras) { if (m.auras[k]) m.auras[k].stop(); }
                if (m === this.boss) { this.boss = null; this.ui('hideBoss'); }
            };
            if (m.rig.has('attack') && def.ai !== 'exploder') m.rig.play('attack', { loop: false, events: [{ frac: 0.5, fn: hit }] });
            else hit();
        }
        this._place(m);
    },

    _place(m) {
        const r = m.rig.root;
        r.position.set(m.x, m.h + (m.def.fly || 0) + (m.crawl ? -58 * m.scale : 0), m.y);
    },

    // --- Способности врагов ---------------------------------------------------------------------
    _abilities(m, dt) {
        const ab = m.ab;
        if (!ab || !ab.size) return;
        const cd = m.cd;
        for (const k in cd) cd[k] -= dt;
        // Безголовый бег (тыква): ещё пару секунд, потом падает.
        if (m.headless > 0) { m.headless -= dt; if (m.headless <= 0) { this.killMob(m, { dir: new BABYLON.Vector3(0, 0, -1) }); return; } }
        // Призрак: то осязаемый, то нет (видно по прозрачности).
        if (ab.has('phase')) {
            m.phaseT = (m.phaseT || Math.random() * 3) + dt;
            const ghost = (m.phaseT % 3.4) > 2.1;
            if (ghost !== !!m.intangible) this._ghost(m, ghost);
        } else if (m.intangibleT > 0) { m.intangibleT -= dt; if (m.intangibleT <= 0) this._ghost(m, false); }
        // Ниндзя: уклоняется от меча, если тот рядом.
        if (ab.has('dodge') && cd.dodge <= 0 && GameSword.drag && GameSword.mesh) {
            const sp = GameSword.mesh.position, c = this.chest(m);
            if (BABYLON.Vector3.Distance(sp, c) < 230 * m.scale) {
                m.kx += (sp.x < c.x ? 1 : -1) * 1500;
                cd.dodge = m.def.boss ? 3.6 : 2.4;
                GameFX.poof(c);
                GameAudio.play('wind', { volume: 0.5 });
                GameFX.text(c, Lang.t('fx.dodge'), 'small');
            }
        }
        // Подрывник: вблизи поджигает фитиль и бежит быстрее.
        if (ab.has('fuse') && !m.fuse && m.y > this.lane.py - 640) { m.fuse = true; m.speed *= 1.7; GameAudio.play('fuse', { volume: 0.5 }); }
        // Шустрый: зигзаг.
        if (ab.has('sprint')) m.x += Math.sin(this._t * 3.2 + m.phase) * 170 * dt;
        // Прыжки вперёд (пират, вождь).
        if (ab.has('leap') && cd.leap <= 0 && !m.leapT) { m.leapT = 0.0001; cd.leap = 2.8 + Math.random() * 1.5; }
        if (m.leapT) {
            m.leapT += dt;
            const k = m.leapT / 0.6;
            m.h = Math.sin(Math.min(1, k) * Math.PI) * 120 * m.scale;
            m.y += 280 * dt;
            if (k >= 1) { m.leapT = 0; m.h = 0; GameFX.dust(new BABYLON.Vector3(m.x, 0, m.y)); }
        }
        // Топот (громила, боссы): выбивает меч из руки; рёв йети — замораживает меч.
        if ((ab.has('stomp') || ab.has('freezeRoar')) && cd.stomp <= 0 && m.y > this.lane.py - 1100) {
            cd.stomp = (m.def.boss ? 5.5 : 4.5) + Math.random() * 1.5;
            const freeze = ab.has('freezeRoar');
            const clip = freeze ? (m.rig.has('roar') ? 'roar' : null) : (m.rig.has('stomp') ? 'stomp' : null);
            const hit = () => {
                if (!m.alive || !this.running) return;
                GameFX.ring(new BABYLON.Vector3(m.x, 0, m.y), 700, freeze ? '#bff4ff' : '#ffffff', 0.6);
                GameFX.dust(new BABYLON.Vector3(m.x, 0, m.y));
                this.app.camera.shake(450, 0.035);
                GameAudio.play(freeze ? 'ice' : 'bossStomp');
                if (freeze) GameSword.freeze(1.6); else GameSword.stun(0.8);
            };
            if (clip) m.rig.play(clip, { layer: 'upper', loop: false, events: [{ frac: 0.55, fn: hit }] }); else hit();
        }
        // Регенерация (мумия, фараон, «живучий»): отрубленное отрастает через 3 с.
        if (ab.has('regen') && m.lastCutAt && performance.now() - m.lastCutAt > 3000 && m.ch.cuts > (m.regenCuts || 0)) {
            m.regenCuts = m.ch.cuts;
            if (GameChars.regrow(m.ch)) { GameFX.poof(this.chest(m)); GameFX.text(this.chest(m), Lang.t('fx.regen'), 'small'); GameAudio.play('sparkle', { volume: 0.5 }); m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.15); }
        }
        // Стрельба на ходу (пришелец, вождь, бандит, йети).
        if (ab.has('ranged') && m.def.ai !== 'ranged' && cd.shoot <= 0 && m.y < this.lane.py - 420) {
            cd.shoot = (m.def.boss ? 2.6 : 3.6) + Math.random();
            const clip = m.rig.has('shoot') ? 'shoot' : null;
            if (clip) m.rig.play(clip, { layer: 'upper', loop: false, events: [{ frac: 0.5, fn: () => this.shoot(m) }] }); else this.shoot(m);
        }
        // Телепорт с неосязаемостью (повелитель пустоты): мелькнул ближе.
        if (ab.has('blink') && m.def.ai !== 'teleport' && cd.blink <= 0 && m.y < this.lane.py - 420) {
            cd.blink = (3.5 + Math.random() * 1.5) * (this.mods.foresight ? 1.8 : 1);
            GameFX.burst(this.chest(m), '#c070ff', 22, [80, 260]);
            m.y += 120; m.x = Math.max(this.lane.x0 + 60, Math.min(this.lane.x1 - 60, m.x + (Math.random() - 0.5) * 260));
            this._ghost(m, true); m.intangibleT = 0.6;
            GameAudio.play('void');
        }
        // Колдун и грибной король: пузырь-щит на ближайшего союзника.
        if (ab.has('bubble') && cd.bubble <= 0) {
            cd.bubble = m.def.boss ? 4 : 6;
            const ally = this.mobs.filter(o => o.alive && o !== m && !o.bubble).sort((p, q) => this.distTo(p, m) - this.distTo(q, m))[0];
            if (ally) { this.giveBubble(ally); GameFX.lightning(this.chest(m), this.chest(ally), '#7fe3ff'); }
        }
    },

    // Призрачность: части полупрозрачны и меч проходит насквозь.
    _ghost(m, on) {
        m.intangible = !!on;
        for (const p of m.ch.pieces) p.visibility = on ? 0.32 : 1;
    },

    _heal(m) {
        const r = m.rig;
        if (r.has('cast')) r.play('cast', { layer: 'upper', loop: false });
        GameFX.ring(new BABYLON.Vector3(m.x, 0, m.y), 450, '#7dff4a', 0.7);
        GameAudio.play('wizard');
        for (const o of this.mobs) if (o.alive && o !== m && this.distTo(o, m) < 450) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.25); GameFX.burst(this.chest(o), '#7dff4a', 10, [60, 160]); }
        GameFX.text(this.chest(m), Lang.t('fx.heal'), 'small');
    },

    // Мобы не стоят друг в друге.
    _separate() {
        const L = this.mobs;
        for (let i = 0; i < L.length; i++) {
            const a = L[i]; if (!a.alive) continue;
            for (let j = i + 1; j < L.length; j++) {
                const b = L[j]; if (!b.alive) continue;
                const min = 55 * (a.scale + b.scale);
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
                if (d > 0 && d < min) {
                    const push = (min - d) * 0.5;
                    const wa = b.def.boss ? 1 : a.def.boss ? 0 : 0.5;
                    a.x -= dx / d * push * wa; a.y -= dy / d * push * wa * 0.3;
                    b.x += dx / d * push * (1 - wa); b.y += dy / d * push * (1 - wa) * 0.3;
                }
            }
        }
    },

    // Ящик-сердце (+1 жизнь), ледяной кристалл (заморозка всех), громоотвод (молнии по всем).
    _propPower(p, point) {
        const view = this.app.location.view;
        if (!p.mesh.isDisposed()) World3D.removeObject(view, p.mesh);
        GameFX.cubes(point, p.kind === 'heart' ? ['#ff7ab8', '#ffd0e0', '#a0672a'] : p.kind === 'ice' ? ['#bff4ff', '#7fe3ff', '#ffffff'] : ['#ffd84a', '#c8963a', '#8a8a8a'], 18, null, 1, 0.9);
        if (p.kind === 'heart') {
            const max = typeof GAME_HEARTS_MAX !== 'undefined' ? GAME_HEARTS_MAX : 5;
            if (this.hearts < max) { this.hearts++; this.heartsMax = Math.max(this.heartsMax, this.hearts); }
            GameFX.burst(point, '#ff7ab8', 26, [120, 320], [12, 24]);
            GameAudio.play('vampire');
            this.ui('onHearts', this.hearts, this.heartsMax, +1);
        } else if (p.kind === 'ice') {
            for (const m of this.mobs) if (m.alive) { this.status(m, 'freeze', 2.6, 0); GameFX.burst(this.chest(m), '#bff4ff', 14, [80, 220]); }
            GameFX.ring(new BABYLON.Vector3(p.x, 0, p.y), 900, '#bff4ff', 0.8);
            GameAudio.play('ice');
        } else {
            for (const m of this.mobs) if (m.alive) { GameFX.lightning(new BABYLON.Vector3(m.x, 1400, m.y), this.chest(m), '#fff27a'); this.zap(m, 30 * this.level.hpMul, GameSword.def, 'lightning'); }
            GameAudio.play('lightning');
            this.app.camera.shake(400, 0.03);
        }
    },

    // Меч разрубил TNT (взрыв) или сундук (монеты).
    hitProp(p, point, swipe) {
        if (!p.alive) return;
        p.alive = false;
        if (p.hint) { p.hint.stop(); p.hint = null; }
        GameFX.slash(point, GameSword.screenAngle(point.subtract(swipe.scale(60)), point.add(swipe.scale(60))), '#ffffff', 0.9);
        if (p.kind === 'heart' || p.kind === 'ice' || p.kind === 'bolt') { this._propPower(p, point); return; }
        if (p.kind === 'tnt') {
            GameAudio.play('fuse', { volume: 0.5 });
            setTimeout(() => {
                if (!this.running) return;
                if (!p.mesh.isDisposed()) World3D.removeObject(this.app.location.view, p.mesh);
                this._explodeAt(p.x, p.y, 340, 70 * this.level.hpMul, null);
            }, 220);
        } else {
            GameAudio.play('coins');
            const lid = p.mesh.getChildMeshes(false).find(m => /Lid/i.test(m.name));
            if (lid) { lid.rotationQuaternion = null; lid.rotation.x = -1.1; }
            const coins = 15 + this.level.n * 2;
            this.runCoins += coins;
            const c = new BABYLON.Vector3(p.x, 80, p.y);
            GameFX.coinBurst(c); GameFX.coinBurst(c);
            GameFX.text(c, '+' + coins, 'coin');
            this.ui('onCoins', coins, this.app.location.view.projectToScreen(p.x, p.y, 80));
        }
    },

    // --- Итог --------------------------------------------------------------------------------

    win() {
        if (this.state !== 'play') return;
        this.state = 'win';
        this.running = false;
        const lvl = this.level;
        const stars = this.hearts >= this.heartsMax ? 3 : this.hearts >= Math.ceil(this.heartsMax / 2) ? 2 : 1;
        const reward = lvl.reward + this.runCoins;
        const s = this.save;
        const prevStars = s.stars[lvl.n] || 0;
        s.stars[lvl.n] = Math.max(prevStars, stars);
        const firstClear = s.level <= lvl.n;
        if (s.fails) delete s.fails[lvl.n];
        if (firstClear) s.level = Math.min(GameData.LEVEL_COUNT, lvl.n + 1);
        Shop.addCoins(reward, { reason: 'win', save: false });
        s.kills = (s.kills || 0) + this.kills;
        // Трофей босса.
        let trophy = null;
        if (lvl.boss) {
            const sw = GameData.SWORDS.find(w => w.boss === lvl.boss);
            if (sw && !s.swords.includes(sw.id)) { s.swords.push(sw.id); trophy = sw; }
        }
        this.persist();
        GameSword.drag = false;
        GameWorld.mode('win');
        if (typeof GameLook !== 'undefined') GameLook.winEffect();
        GameAudio.play('win');
        Platform.gameplay(false);
        if (Tutorial.roundCounts()) Platform.ads.roundEnded(true);
        Telemetry.progress && Telemetry.progress('completed', 'level_' + lvl.n, { step_index: lvl.n, stars });
        Platform.submitScore && Platform.submitScore(Object.keys(s.stars).length);
        const result = { level: lvl, stars, coins: reward, runCoins: this.runCoins, base: lvl.reward, kills: this.kills, trophy, firstClear, hearts: this.hearts };
        setTimeout(() => { this.ui('showWin', result); }, 900);
    },

    lose() {
        if (this.state !== 'play') return;
        this.state = 'lose';
        this.running = false;
        GameSword.drag = false;
        GameWorld.mode('lose');
        GameAudio.play('lose');
        if (this.mode === 'survival') { this._survivalEnd(); return; }
        // Собранные монеты — половина при поражении.
        const coins = Math.floor(this.runCoins / 2);
        if (!this.save.fails) this.save.fails = {};
        this.save.fails[this.level.n] = (this.save.fails[this.level.n] || 0) + 1;
        if (coins > 0) Shop.addCoins(coins, { reason: 'lose', save: false });
        this._loseCoins = coins;
        this.persist();
        Platform.gameplay(false);
        if (Tutorial.roundCounts()) Platform.ads.roundEnded(false);
        Telemetry.progress && Telemetry.progress('failed', 'level_' + this.level.n, { step_index: this.level.n });
        const result = { level: this.level, coins, kills: this.kills, canRevive: !this._revived && Platform.rewardedSupported(), canSkip: GameAds.canOfferSkip(this.level.n) };
        setTimeout(() => { this.ui('showLose', result); }, 1100);
    },

    // «Продолжить за рекламу»: +2 сердца, ближние мобы отброшены.
    async revive() {
        if (this.state !== 'lose' || this._revived || (this._survRes && this._survRes.doubled)) return false;
        const ok = await GameAds.watch('continue');
        if (!ok) return false;
        this._revived = true;
        // Монеты поражения уже начислены: возвращаем их в забег, чтобы не удвоить.
        const back = this._loseCoins || 0;
        if (back > 0) Shop.spend(Math.min(back, Shop.coins), { reason: 'revive', save: false });
        this._loseCoins = 0;
        this._survRes = null;
        this.hearts = 2;
        this.state = 'play';
        this.running = true;
        GameWorld.mode('play');
        for (const m of this.mobs) if (m.alive) { m.y = Math.min(m.y, this.lane.py - 900); m.attacking = false; this._playMove(m); }
        Platform.gameplay(true);
        this.ui('onHearts', this.hearts, this.heartsMax, +2);
        this.ui('showHUD', this.level);
        if (this.mode === 'survival') this.ui('onSurvivalHud', GameSurvival.run);
        return true;
    },

    // --- Выживание (рогалик): волны, смена локаций, перки ----------------------------------------

    // Начать забег: случайный стартовый биом, волна 1 — совсем простая.
    async startSurvival() {
        if (this._loading) return;
        this._loading = true;
        this.mode = 'survival';
        this._revived = false;
        this._survRes = null;
        const run = GameSurvival.newRun();
        run.wave = 1;
        const lvl = GameSurvival.waveLevel(1);
        try {
            await this.app.loadMap(lvl.biome, {
                label: Lang.t('surv.title'),
                gameplay: true,
                prepare: async (app) => {
                    await this._setupScene(app, lvl, false);
                    this.beginRound(lvl);
                    this._waveIntro(lvl);
                    this.ui('showHUD', lvl);
                },
            });
        } finally { this._loading = false; }
        GameAudio.music(lvl.boss ? 'boss' : lvl.biome);
        this.ui('onSurvivalStart', run);
        this.ui('onSurvivalWave', run, lvl);
    },

    // Волна выживания готова к началу: короткое вступление, апокалипсис по таймеру.
    _waveIntro(lvl) {
        const run = GameSurvival.run;
        this.level = lvl;
        this.waveIndex = -1;
        this._spawnQ = [];
        this.state = 'intro';
        this.running = true;
        this._introT = 1.6;
        if (this.mods.apocalypse && run.wave % this.mods.apocalypse === 0) run.apocT = 5;
    },

    // Волна зачищена: награда; пора ли выбирать перк — или сразу следующая волна.
    _survivalWaveDone() {
        const run = GameSurvival.run;
        if (!run || this.state !== 'play') return;
        this.state = 'wave';
        const offer = GameSurvival.onWaveCleared();
        GameAudio.play('coins', { volume: 0.7 });
        this.ui('onSurvivalWaveCleared', run, run.lastBonus || 0);
        this.ui('onSurvivalHud', run);
        Telemetry.progress && Telemetry.progress('completed', 'survival_wave', { step_index: run.wave });
        if (offer) {
            setTimeout(() => {
                if (this.state !== 'wave' || this.mode !== 'survival') return;
                this.state = 'perk';
                this.ui('showPerkChoice', GameSurvival.rollOffer(), run);
            }, 900);
        } else {
            setTimeout(() => { if (this.state === 'wave' && this.mode === 'survival') this._survivalNextWave(); }, 1500);
        }
    },

    // Следующая волна на той же локации: догрузить новых мобов, обновить реквизит.
    async _survivalNextWave() {
        const run = GameSurvival.run;
        run.wave++;
        const lvl = GameSurvival.waveLevel(run.wave);
        this.state = 'wave';
        const types = [];
        for (const w of lvl.waves) for (const g of w.groups) { types.push(g.type); const md = GameData.MOBS[g.type]; if (md && md.minions) types.push(...md.minions); }
        await GameChars.preload(types);
        if (this.mode !== 'survival' || this.state !== 'wave') return;
        for (const p of this.props) { if (p.hint) p.hint.dispose(); if (p.mesh && !p.mesh.isDisposed()) { if (p.alive) GameFX.poof(new BABYLON.Vector3(p.x, 60, p.y)); World3D.removeObject(this.app.location.view, p.mesh); } }
        this.props = [];
        await this.spawnProps(lvl);
        this._waveIntro(lvl);
        GameAudio.music(lvl.boss ? 'boss' : lvl.biome);
        this.ui('onSurvivalWave', run, lvl);
    },

    // Выбор перка (из showPerkChoice) — и переход на новую случайную локацию.
    async survivalPick(id) {
        if (this.state !== 'perk' || this.mode !== 'survival') return false;
        if (!GameSurvival.take(id)) return false;
        this.state = 'travel';
        this.ui('hidePerkChoice');
        this.ui('onSurvivalHud', GameSurvival.run);
        await this._survivalTravel();
        return true;
    },

    // Бесплатная замена трёх перков (1 за забег).
    survivalReroll() {
        if (this.state !== 'perk') return null;
        const o = GameSurvival.reroll();
        if (o) this.ui('showPerkChoice', o, GameSurvival.run);
        return o;
    },

    // Замена перков за рекламу (пауза между просмотрами — GameAds.COOLDOWN['perk-reroll']).
    async survivalRerollAd() {
        if (this.state !== 'perk' || !GameAds.can('perk-reroll')) return null;
        const ok = await GameAds.watch('perk-reroll');
        if (!ok || this.state !== 'perk') return null;
        const o = GameSurvival.rollOffer();
        this.ui('showPerkChoice', o, GameSurvival.run);
        return o;
    },

    // Новая локация: другой биом и время суток, сердца/монеты/убийства забега сохраняются.
    async _survivalTravel() {
        const run = GameSurvival.run;
        GameSurvival.nextBiome();
        run.wave++;
        const lvl = GameSurvival.waveLevel(run.wave);
        const keep = { hearts: this.hearts, heartsMax: this.heartsMax, runCoins: this.runCoins, kills: this.kills, coinMul: this.coinMul, vampKills: this.vampKills };
        this._loading = true;
        try {
            await this.app.loadMap(lvl.biome, {
                label: Lang.t('surv.wave', { n: run.wave }),
                gameplay: true,
                prepare: async (app) => {
                    await this._setupScene(app, lvl, false);
                    Object.assign(this, keep);
                    this._t = 0;
                    this._waveIntro(lvl);
                    this.ui('showHUD', lvl);
                },
            });
        } finally { this._loading = false; }
        GameAudio.music(lvl.boss ? 'boss' : lvl.biome);
        this.ui('onHearts', this.hearts, this.heartsMax, 0);
        this.ui('onSurvivalLocation', GameData.BIOMES.find(b => b.id === lvl.biome), run);
        this.ui('onSurvivalWave', run, lvl);
        this.ui('onSurvivalHud', run);
    },

    // Конец забега: монеты (собранные + бонус за волны), рекорд, экран итога.
    _survivalEnd() {
        const res = GameSurvival.finish();
        const s = this.save;
        s.kills = (s.kills || 0) + this.kills;
        if (res.coins > 0) Shop.addCoins(res.coins, { reason: 'survival', save: false });
        this._loseCoins = res.coins;
        this.persist();
        Platform.gameplay(false);
        if (Tutorial.roundCounts()) Platform.ads.roundEnded(false);
        Telemetry.progress && Telemetry.progress('failed', 'survival', { step_index: res.wave });
        res.canRevive = !this._revived && Platform.rewardedSupported();
        res.canDouble = Platform.rewardedSupported();
        this._survRes = res;
        setTimeout(() => { this.ui('showSurvivalEnd', res); }, 1100);
    },

    // ×2 монет забега за рекламу (один раз; после этого «продолжить» недоступно).
    async survivalDouble() {
        const r = this._survRes;
        if (!r || r.doubled || this.state !== 'lose') return false;
        const ok = await GameAds.watch('win-x2');
        if (!ok) return false;
        r.doubled = true;
        Shop.addCoins(r.coins, { reason: 'survival-x2', save: false });
        this.persist();
        this.ui('onCoinsChanged', Shop.coins);
        return true;
    },

    // Выйти в меню (мир текущего биома остаётся фоном).
    async toMenu() {
        this.running = false;
        this.state = 'menu';
        this._revived = false;
        this.mode = 'campaign';
        this.mods = {};
        this._survRes = null;
        GameSurvival.run = null;
        this._menuLevel = Math.min(GameData.LEVEL_COUNT, this.save.level);
        const lvl = GameData.level(this._menuLevel);
        if (this.app.map.id !== lvl.biome) await this.app.loadMap(lvl.biome, { prepare: a => this._setupScene(a, lvl, true), label: Lang.t('loading') });
        else await LoadingScreen.run(async () => { await this._setupScene(this.app, lvl, true); }, { scene: this.app.location.view.scene, title: Lang.t('loading') });
        GameAudio.music('menu');
        Platform.gameplay(false);
        this.ui('showMenu');
    },

    // --- Арсенал -----------------------------------------------------------------------------

    // Состояние меча для арсенала: equipped | owned | boss | locked | ads (за рекламу) | buy | expensive.
    swordState(id) {
        const sw = GameData.sword(id);
        const s = this.save;
        if (s.swords.includes(id)) return s.sword === id ? 'equipped' : 'owned';
        if (sw.boss) return 'boss';
        if (s.level < sw.level) return 'locked';
        if (sw.ads) return 'ads';
        return Shop.coins >= sw.price ? 'buy' : 'expensive';
    },

    // Прогресс «за рекламу»: { have, need, wait (с до следующего просмотра), available }.
    swordAdProgress(id) {
        const sw = GameData.sword(id);
        const have = (this.save.swordAds && this.save.swordAds[id]) || 0;
        return { have, need: sw.ads || 0, wait: GameAds.wait('sword-unlock'), available: GameAds.available() };
    },

    // Просмотр рекламы за меч: засчитывается только подтверждённая награда; пауза 12 с между просмотрами.
    async watchSwordAd(id) {
        const sw = GameData.sword(id);
        if (this.swordState(id) !== 'ads' || this._swordAdBusy) return { ok: false, reason: 'state' };
        const pr = this.swordAdProgress(id);
        if (pr.wait > 0) return { ok: false, reason: 'cooldown', wait: pr.wait };
        if (!pr.available) return { ok: false, reason: 'unavailable' };
        this._swordAdBusy = true;
        let ok = false;
        try { ok = await GameAds.watch('sword-unlock'); } finally { this._swordAdBusy = false; }
        if (!ok) return { ok: false, reason: 'declined', wait: GameAds.wait('sword-unlock') };
        const s = this.save;
        if (!s.swordAds) s.swordAds = {};
        s.swordAds[id] = (s.swordAds[id] || 0) + 1;
        let unlocked = false;
        if (s.swordAds[id] >= sw.ads) { s.swords.push(id); delete s.swordAds[id]; unlocked = true; GameAudio.play('unlock'); }
        this.persist();
        return { ok: true, unlocked, have: unlocked ? sw.ads : s.swordAds[id], need: sw.ads, wait: GameData.SWORD_AD_COOLDOWN };
    },

    buySword(id) {
        const sw = GameData.sword(id);
        if (this.swordState(id) !== 'buy') return false;
        if (!Shop.spend(sw.price, { reason: 'sword', save: false })) return false;
        this.save.swords.push(id);
        this.persist();
        GameAudio.play('unlock');
        return true;
    },

    async equipSword(id) {
        if (!this.save.swords.includes(id)) return false;
        this.save.sword = id;
        this.persist();
        await GameSword.equip(id);
        GameAudio.play('equip');
        return true;
    },

    addCoins(n) {
        if (n > 0) Shop.addCoins(Math.round(n), { reason: 'bonus', save: false }); else if (n < 0) Shop.spend(Math.round(-n), { save: false });
        this.persist();
        this.ui('onCoinsChanged', Shop.coins);
    },

    // Хук интерфейса GameUI (контракт docs/UI-CONTRACT.md): нет функции — ничего.
    ui(name, ...args) {
        const u = /** @type {any} */ (typeof GameUI !== 'undefined' ? GameUI : null);
        return u && typeof u[name] === 'function' ? u[name](...args) : undefined;
    },

    // --- Обучение ----------------------------------------------------------------------------

    initTutorial() {
        if (typeof Tutorial === 'undefined') return;
        Tutorial.init({
            app: this.app,
            steps: [
                // 1) Коснись экрана — меч в руке.  2) Проведи сквозь врага — разрежь.  3) Сердца — жизни.
                { id: 'touch', title: 'tut.touch.t', hint: { touch: 'tut.touch.touch', keyboard: 'tut.touch.pc', any: 'tut.touch.touch' }, icons: { touch: ['swipe'], keyboard: ['mouse'] },
                  world: () => { const m = this.dangerMob(); return m ? { x: m.x, y: m.y, h: 200 * m.scale } : null; } },
                { id: 'kill', title: 'tut.kill.t', hint: { touch: 'tut.kill.touch', keyboard: 'tut.kill.pc', any: 'tut.kill.touch' }, icons: { touch: ['swipe'], keyboard: ['mouse'] },
                  world: () => { const m = this.dangerMob(); return m ? { x: m.x, y: m.y, h: 200 * m.scale } : null; } },
                { id: 'hearts', title: 'tut.hearts.t', hint: 'tut.hearts.h', target: '#ocm-hearts', check: (ctx) => ctx.time > 3.5 },
            ],
            state: () => this.save, field: 'tutorialDone',
            persist: () => this.persist(),
            onFinish: () => { /* обучение ничего не замораживает — игра уже в обычном состоянии */ },
        });
    },
};
