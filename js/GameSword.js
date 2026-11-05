// GameSword.js — меч Obby Cut Master от первого лица: игрок ведёт его пальцем (мышью) по экрану,
// меч летит на глубину ближайшего к пальцу врага и режет всё, через что проходит лезвие.
// Плоскость разреза = линия свайпа на экране (содержит направление движения и луч взгляда):
// враг разрезается ровно там, где провёл игрок. Урон и смерть решает Game (Game.sliceMob).

/** @satisfies {Record<string, any>} */
const GameSword = {
    /** @type {LoryApp | null} */
    app: null,
    /** @type {any} */
    meta: null,
    /** @type {any} */
    def: null,                // текущий меч (GameData.SWORDS)
    /** @type {BABYLON.Mesh | null} */
    mesh: null,
    /** @type {any} */
    tip: null,
    /** @type {any} */
    mid: null,
    /** @type {any} */
    hilt: null,
    /** @type {any} */
    trail: null,
    /** @type {any} */
    aura: null,
    /** @type {any} */
    meta2: null,
    trailStyle: null,
    drag: false,
    /** @type {number | null} */
    _pid: null,
    blend: 0,                 // 0 — меч в покое у края экрана, 1 — в руке игрока
    depth: 420,
    _wantDepth: 420,
    speed: 0,
    _models: {},
    // Выносливость: секунды активных взмахов; кончилась — меч отдыхает. Пауза при взятии — по редкости.
    stamina: 3,
    staminaMax: 3,
    tired: false,
    _drawAt: 0,
    _freezeUntil: 0,
    _stunUntil: 0,
    URLS: {
        wood: 'assets/models/swords/sword_wood.glb', stone: 'assets/models/swords/sword_stone.glb', iron: 'assets/models/swords/sword_iron.glb',
        bone: 'assets/models/swords/sword_bone.glb', cactus: 'assets/models/swords/sword_cactus.glb', gold: 'assets/models/swords/sword_gold.glb',
        diamond: 'assets/models/swords/sword_diamond.glb', emerald: 'assets/models/swords/sword_emerald.glb', flame: 'assets/models/swords/sword_flame.glb',
        frost: 'assets/models/swords/sword_frost.glb', wind: 'assets/models/swords/sword_wind.glb', wave: 'assets/models/swords/sword_wave.glb',
        leaf: 'assets/models/swords/sword_leaf.glb', candy: 'assets/models/swords/sword_candy.glb', pickaxe: 'assets/models/swords/sword_pickaxe.glb',
        thunder: 'assets/models/swords/sword_thunder.glb', tnt: 'assets/models/swords/sword_tnt.glb', ender: 'assets/models/swords/sword_ender.glb',
        angel: 'assets/models/swords/sword_angel.glb', vampire: 'assets/models/swords/sword_vampire.glb', twin: 'assets/models/swords/sword_twin.glb',
        ghost: 'assets/models/swords/sword_ghost.glb', buster: 'assets/models/swords/sword_buster.glb', laser: 'assets/models/swords/sword_laser.glb',
        obsidian: 'assets/models/swords/sword_obsidian.glb', magma: 'assets/models/swords/sword_magma.glb', crystal: 'assets/models/swords/sword_crystal.glb',
        dragon: 'assets/models/swords/sword_dragon.glb', shadow: 'assets/models/swords/sword_shadow.glb', meteor: 'assets/models/swords/sword_meteor.glb',
        glitch: 'assets/models/swords/sword_glitch.glb', rainbow: 'assets/models/swords/sword_rainbow.glb', chainsaw: 'assets/models/swords/sword_chainsaw.glb',
        galaxy: 'assets/models/swords/sword_galaxy.glb', solar: 'assets/models/swords/sword_solar.glb', lunar: 'assets/models/swords/sword_lunar.glb',
        demon: 'assets/models/swords/sword_demon.glb', excalibur: 'assets/models/swords/sword_excalibur.glb', prism: 'assets/models/swords/sword_prism.glb',
        infinity: 'assets/models/swords/sword_infinity.glb',
    },
    ICONS: {
        wood: 'assets/icons/swords/wood.png', stone: 'assets/icons/swords/stone.png', iron: 'assets/icons/swords/iron.png', bone: 'assets/icons/swords/bone.png',
        cactus: 'assets/icons/swords/cactus.png', gold: 'assets/icons/swords/gold.png', diamond: 'assets/icons/swords/diamond.png', emerald: 'assets/icons/swords/emerald.png',
        flame: 'assets/icons/swords/flame.png', frost: 'assets/icons/swords/frost.png', wind: 'assets/icons/swords/wind.png', wave: 'assets/icons/swords/wave.png',
        leaf: 'assets/icons/swords/leaf.png', candy: 'assets/icons/swords/candy.png', pickaxe: 'assets/icons/swords/pickaxe.png', thunder: 'assets/icons/swords/thunder.png',
        tnt: 'assets/icons/swords/tnt.png', ender: 'assets/icons/swords/ender.png', angel: 'assets/icons/swords/angel.png', vampire: 'assets/icons/swords/vampire.png',
        twin: 'assets/icons/swords/twin.png', ghost: 'assets/icons/swords/ghost.png', buster: 'assets/icons/swords/buster.png', laser: 'assets/icons/swords/laser.png',
        obsidian: 'assets/icons/swords/obsidian.png', magma: 'assets/icons/swords/magma.png', crystal: 'assets/icons/swords/crystal.png', dragon: 'assets/icons/swords/dragon.png',
        shadow: 'assets/icons/swords/shadow.png', meteor: 'assets/icons/swords/meteor.png', glitch: 'assets/icons/swords/glitch.png', rainbow: 'assets/icons/swords/rainbow.png',
        chainsaw: 'assets/icons/swords/chainsaw.png', galaxy: 'assets/icons/swords/galaxy.png', solar: 'assets/icons/swords/solar.png', lunar: 'assets/icons/swords/lunar.png',
        demon: 'assets/icons/swords/demon.png', excalibur: 'assets/icons/swords/excalibur.png', prism: 'assets/icons/swords/prism.png', infinity: 'assets/icons/swords/infinity.png',
    },

    init(app) {
        this.app = app;
        this.pos = new BABYLON.Vector3(0, 0, 0);
        this.q = BABYLON.Quaternion.Identity();
        this.ptr = { x: 0, y: 0 };
        this._prev = null;
        this.bindInput();
        // Меч движется и в меню (покачивается в покое): кадр всегда, игровая логика — только вне паузы.
        app.onFrame(dt => this.frame(dt));
    },

    // --- Ввод: палец / мышь ведёт меч ----------------------------------------------------------

    bindInput() {
        const canvas = this.app.location.view.world.canvas;
        const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
        canvas.addEventListener('pointerdown', (e) => {
            if (e.button != null && e.button > 0) return;
            if (!this.canControl() || performance.now() < this._drawAt) {
                if (Game.state === 'play') Game.ui('onSwordState', this.tired ? 'tired' : this.frozenWait() > 0 ? 'frozen' : this.stunWait() > 0 ? 'stun' : 'draw', 0);
                return;
            }
            this.drag = true;
            this._pid = e.pointerId;
            try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* старые браузеры */ }
            const p = local(e);
            this.ptr.x = p.x; this.ptr.y = p.y;
            this._grabT = 0;
            if (typeof Tutorial !== 'undefined') Tutorial.complete('touch');
        });
        canvas.addEventListener('pointermove', (e) => {
            if (!this.drag || (this._pid != null && e.pointerId !== this._pid)) return;
            const p = local(e);
            this.ptr.x = p.x; this.ptr.y = p.y;
        });
        const up = (e) => {
            if (this._pid == null || !e || e.pointerId === this._pid) {
                if (this.drag) this._drawAt = performance.now() + this.staminaOf(this.def || GameData.sword('wood')).draw * 1000;
                this.drag = false; this._pid = null;
            }
        };
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        canvas.addEventListener('lostpointercapture', up);
        window.addEventListener('lory-release-input', () => { this.drag = false; this._pid = null; });
    },

    canControl() {
        const now = performance.now();
        return !Pause.active && (Game.state === 'play' || Game.state === 'intro') && !this.tired && now >= this._freezeUntil && now >= this._stunUntil;
    },

    // Выносливость и пауза взятия меча по редкости (и особенностям: ветер лёгкий, пила и громадина тяжёлые).
    staminaOf(def) {
        const R = { common: [3.0, 1.1, 0.45], rare: [3.6, 1.25, 0.38], epic: [4.2, 1.4, 0.32], legendary: [4.8, 1.6, 0.26], mythic: [5.6, 1.9, 0.2] }[def.rarity] || [3, 1.1, 0.45];
        let max = R[0], regen = R[1], draw = R[2], drain = 1;
        if (def.element === 'wind') max *= 1.2;
        if (def.element === 'chainsaw') { max *= 0.85; drain = 1.25; }
        if (def.element === 'giant') { max *= 0.8; draw += 0.15; }
        // Перки выживания: выносливость, восстановление, быстрые руки.
        const M = (typeof Game !== 'undefined' && Game.mods) || {};
        max *= Math.max(0.4, 1 + (M.stamina || 0)); regen *= 1 + (M.regen || 0); draw *= Math.max(0.25, 1 - (M.draw || 0));
        return { max: Math.round(max * 10) / 10, regen, draw, drain };
    },
    // Неутомимость (перк): после убийства выносливость не тратится.
    tireless() { const run = typeof GameSurvival !== 'undefined' ? GameSurvival.run : null; return !!(run && Game.mods.tireless && run.tirelessT > 0); },
    drawWait() { return Math.max(0, (this._drawAt - performance.now()) / 1000); },
    frozenWait() { return Math.max(0, (this._freezeUntil - performance.now()) / 1000); },
    stunWait() { return Math.max(0, (this._stunUntil - performance.now()) / 1000); },

    // Снежок / рёв йети: меч замёрз — управлять нельзя.
    freeze(sec) {
        this._freezeUntil = performance.now() + sec * 1000;
        this.drag = false; this._pid = null;
        if (this.mesh) GameFX.burst(this.mesh.position.clone(), '#bff4ff', 20, [60, 200], [8, 16]);
        GameFX.text(this.mesh ? this.mesh.position.clone() : new BABYLON.Vector3(0, 0, 0), Lang.t('fx.frozen'), 'small');
        Game.ui('onSwordState', 'frozen', sec);
    },
    // Топот громилы: меч выбит из руки.
    stun(sec) {
        this._stunUntil = performance.now() + sec * 1000;
        this.drag = false; this._pid = null;
        this._knock = 1;
        if (this.mesh) GameFX.text(this.mesh.position.clone(), Lang.t('fx.stun'), 'small');
        Game.ui('onSwordState', 'stun', sec);
    },

    // --- Модель ---------------------------------------------------------------------------------

    async loadMeta() {
        if (this.meta) return this.meta;
        try {
            const r = await fetch('assets/models/swords/swords_meta.json');
            this.meta = r.ok ? await r.json() : {};
        } catch (e) { this.meta = {}; }
        return this.meta;
    },

    metaOf(id) {
        const all = this.meta && (this.meta.swords || this.meta);
        const m = (Array.isArray(all) ? all.find(x => x.id === id) : all && all[id]) || {};
        const el = GameData.ELEMENTS[GameData.sword(id).element] || GameData.ELEMENTS.none;
        const len = m.length || 1.1;
        return {
            length: len,
            tipGl: m.tipGl || [0, len * 0.86, 0],
            guardGl: m.guardGl || [0, len * 0.15, 0],
            glow: m.glow || el.color,
            primary: m.primary || el.color,
            secondary: m.secondary || '#ffffff',
        };
    },

    async model(id) {
        if (this._models[id] !== undefined) return this._models[id];
        let model = null;
        try { model = await Model3D.load(this.URLS[id] || this.URLS.wood); } catch (e) { model = null; }
        this._models[id] = model;
        return model;
    },

    async build(id, name) {
        const scene = this.app.location.view.scene;
        const model = await this.model(id);
        let mesh = model ? Model3D.build(model, scene, { name: name || 'sword' }) : null;
        if (!mesh) {
            mesh = BABYLON.MeshBuilder.CreateBox(name || 'sword', { width: 6, height: 100, depth: 16 }, scene);
            mesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 45, 0));
            const mat = new BABYLON.StandardMaterial('sword-dev', scene);
            mat.diffuseColor = BABYLON.Color3.FromHexString(this.metaOf(id).primary);
            mesh.material = mat;
        }
        for (const m of [mesh].concat(mesh.getChildMeshes(false))) { m.isPickable = false; m.alwaysSelectAsActiveMesh = true; }
        return mesh;
    },

    // Надеть меч: модель, точки клинка, след и сияние (косметика).
    async equip(id) {
        this.def = GameData.sword(id);
        const st = this.staminaOf(this.def);
        this.staminaMax = st.max; this.stamina = st.max; this.tired = false;
        await this.loadMeta();
        const view = this.app.location.view;
        this._disposeMesh();
        const mesh = await this.build(id, 'sword');
        // Меч рисуется поверх мира? Нет — он в мире (режет мобов), но без теней на себя у камеры.
        World3D.addObject(view, mesh, 'actor', { ink: false, outline: false, castShadow: true });
        GameWorld.addGlow(mesh);
        const meta = this.metaOf(id);
        const scene = view.scene;
        const node = (name, v) => { const n = new BABYLON.TransformNode(name, scene); n.parent = mesh; n.position.set(v[0] * 100, v[1] * 100, v[2] * 100); return n; };
        this.tip = node('sword-tip', meta.tipGl);
        this.mid = node('sword-mid', [(meta.tipGl[0] + meta.guardGl[0]) / 2, (meta.tipGl[1] + meta.guardGl[1]) / 2, (meta.tipGl[2] + meta.guardGl[2]) / 2]);
        this.hilt = node('sword-guard', meta.guardGl);
        this.mesh = mesh;
        this.meta2 = meta;
        this._prev = null;
        this.applyCosmetics();
    },

    // Превью в арсенале: показать меч id в витрине (не надевая). null — вернуть надетый.
    async preview(id) {
        const want = id || (Game.save && Game.save.sword) || 'wood';
        if (this.def && this.def.id === want && this.mesh) return;
        this._previewing = !!id;
        await this.equip(want);
    },
    async previewEnd() { await this.preview(null); this._previewing = false; },

    // Демо-взмахи в меню (примерка косметики в магазине): меч сам режет воздух перед камерой.
    demo(on) { this.demoOn = !!on; this._demoT = 0; this._demoN = 0; },

    // Сцена витрины: точка экрана (CSS px канваса), вокруг которой меч крутится и машет в меню —
    // например, свободная часть экрана справа от панели магазина. null — центр экрана.
    stage(x, y) { this._stage = x == null ? null : { x, y }; },

    // След и сияние по косметике (GameLook): пересоздать при смене предмета.
    applyCosmetics() {
        if (!this.mesh) return;
        if (this.trail) { this.trail.dispose(); this.trail = null; }
        if (this.aura) { this.aura.dispose(); this.aura = null; }
        const look = typeof GameLook !== 'undefined' && GameLook.swordLook ? GameLook.swordLook() : null;
        const color = (look && look.trailColor) || this.meta2.glow;
        const w = ((this.def.rarity === 'common' ? 4 : this.def.rarity === 'rare' ? 5 : 6) + (look && look.trailWidth ? look.trailWidth * 0.5 : 0)) * (this.def.size || 1);
        this.trail = GameFX.trail(this.tip, color, w);
        this.trailStyle = look ? look.trail : null;
        if (look && look.aura && this.app.fx) this.aura = GameLook.makeAura(look.aura, () => this.tip.getAbsolutePosition());
    },

    _disposeMesh() {
        if (this.trail) { this.trail.dispose(); this.trail = null; }
        if (this.aura) { this.aura.dispose(); this.aura = null; }
        if (this.mesh && !this.mesh.isDisposed()) { GameWorld.removeGlow(this.mesh); World3D.removeObject(this.app.location.view, this.mesh); }
        this.mesh = null;
    },

    // --- Кадр: положение, поворот, разрезы ------------------------------------------------------

    frame(dt) {
        if (!this.mesh || this.mesh.isDisposed() || !this.app.location) return;
        const view = this.app.location.view;
        const cam = view.camera;
        const paused = Pause.active;
        const sdt = paused ? 0 : dt * (Game.timeScale || 1);
        const fwd = cam.getForwardRay(1).direction, right = cam.getDirection(BABYLON.Axis.X), upv = cam.getDirection(BABYLON.Axis.Y);
        const C = cam.globalPosition || cam.position;
        const cv = view.world.canvas;
        const W = (cv && cv.clientWidth) || 800, H = (cv && cv.clientHeight) || 600;
        const portrait = H > W;
        // Выносливость: тратится, пока меч в руке (и сильнее — когда им машут), копится в покое.
        if (!paused && this.def) {
            const st = this.staminaOf(this.def);
            if (this.drag && Game.state === 'play') {
                const fast = (this.speed || 0) > 520;
                if (!this.tireless()) this.stamina -= dt * (0.35 + (fast ? 0.95 : 0)) * st.drain;
                // Второе дыхание (перк): раз в волну усталость снимается сразу.
                const run = typeof GameSurvival !== 'undefined' ? GameSurvival.run : null;
                if (this.stamina <= 0 && Game.mods.wind && run && !run.windUsed) {
                    run.windUsed = true;
                    this.stamina = this.staminaMax;
                    if (this.mesh) GameFX.text(this.mesh.position.clone(), Lang.t('fx.wind'), 'small');
                    GameAudio.play('sparkle', { volume: 0.6 });
                }
                if (this.stamina <= 0) {
                    this.stamina = 0; this.tired = true; this.drag = false; this._pid = null;
                    if (this.mesh) GameFX.text(this.mesh.position.clone(), Lang.t('fx.tired'), 'small');
                    GameAudio.play('error', { volume: 0.5 });
                    Game.ui('onSwordState', 'tired', 0);
                }
            } else {
                this.stamina = Math.min(this.staminaMax, this.stamina + dt * st.regen * (Game.state === 'play' ? 1 : 3));
                if (this.tired && this.stamina >= this.staminaMax * 0.45) { this.tired = false; Game.ui('onSwordState', 'ready', 0); }
            }
        }
        const active = this.drag && this.canControl();
        const swinging = active || (this.demoOn && (Game.state === 'menu' || Game.state === 'boot'));
        this.blend += ((swinging ? 1 : 0) - this.blend) * (1 - Math.exp(-(dt || 0) * (swinging ? 14 : 6)));
        const s = (this.def.size || 1);
        this._t = (this._t || 0) + dt;
        const bob = Math.sin(this._t * 2.1) * 3;
        // Меню: витрина — меч крупно по центру экрана, медленно вращается. Бой: покой по центру внизу.
        const showcase = (Game.state === 'menu' || Game.state === 'boot') && !this.demoOn;
        const demo = this.demoOn && (Game.state === 'menu' || Game.state === 'boot');
        const low = (this.tired || this.frozenWait() > 0 || this.stunWait() > 0) && !showcase ? 1 : 0;
        this._low = (this._low || 0) + (low - (this._low || 0)) * Math.min(1, dt * 6);
        this._knock = Math.max(0, (this._knock || 0) - dt * 2.5);
        const shiver = this.frozenWait() > 0 ? Math.sin(this._t * 60) * 2 : 0;
        // Витрина сдвинута в свободную часть экрана (справа от магазина): точка на луче через неё.
        const stg = this._stage && (showcase || demo) ? view.scene.createPickingRay(this._stage.x, this._stage.y, BABYLON.Matrix.Identity(), cam) : null;
        const along = (d) => stg ? stg.origin.add(stg.direction.scale(d / Math.max(0.2, BABYLON.Vector3.Dot(stg.direction, fwd)))) : C.add(fwd.scale(d));
        const narrow = stg ? 0.55 : 1;
        const rest = showcase ? along(portrait ? 250 : 235).add(upv.scale(-44 + bob * 2))
            : C.add(fwd.scale(portrait ? 215 : 230)).add(upv.scale(-62 + bob - this._low * 34)).add(right.scale(shiver + this._knock * 140));
        let target = rest;
        // Трюки витрины: раз в несколько секунд — сальто, вихрь, взмах или подброс.
        let flRot = null;
        if (showcase) {
            const fl = this._fl || (this._fl = { t: 2.5, kind: '', k: 0 });
            if (!fl.kind) {
                fl.t -= dt;
                if (fl.t <= 0) { fl.kind = ['flip', 'twirl', 'swing', 'toss'][(Math.random() * 4) | 0]; fl.k = 0; fl.fx = false; }
            } else {
                const dur = fl.kind === 'toss' ? 1.1 : fl.kind === 'swing' ? 0.7 : 0.8;
                fl.k = Math.min(1, fl.k + dt / dur);
                const e = fl.k < 0.5 ? 2 * fl.k * fl.k : 1 - Math.pow(-2 * fl.k + 2, 2) / 2;   // плавно туда-обратно
                if (fl.kind === 'flip') flRot = BABYLON.Quaternion.RotationAxis(right, e * Math.PI * 2);
                if (fl.kind === 'twirl') flRot = BABYLON.Quaternion.RotationAxis(fwd, -e * Math.PI * 4);
                if (fl.kind === 'swing') {
                    const a = Math.sin(fl.k * Math.PI);
                    target = rest.add(right.scale((fl.k - 0.5) * 2 * 120 * narrow)).add(upv.scale(a * 30));
                    flRot = BABYLON.Quaternion.RotationAxis(fwd, (0.5 - fl.k) * 2.4);
                    if (!fl.fx && fl.k > 0.5) { fl.fx = true; GameFX.slash(rest.add(upv.scale(40)), -0.15, '#ffffff', 0.9, typeof GameLook !== 'undefined' ? GameLook.slashLook() : null); GameAudio.play('fly', { volume: 0.5 }); }
                }
                if (fl.kind === 'toss') {
                    target = rest.add(upv.scale(Math.sin(fl.k * Math.PI) * 120));
                    flRot = BABYLON.Quaternion.RotationAxis(right, -e * Math.PI * 2);
                    if (!fl.fx && fl.k > 0.92) { fl.fx = true; GameFX.burst(rest.add(upv.scale(30)), '#fff6a0', 18, [80, 220], [8, 16]); }
                }
                if (fl.k >= 1) { fl.kind = ''; fl.t = 3.5 + Math.random() * 2.5; }
            }
        }
        if (demo) {
            // Восьмёрка перед камерой: быстрые взмахи, на каждом проходе центра — вспышка разреза.
            this._demoT = (this._demoT || 0) + dt;
            const t = this._demoT * 2.3;
            const center = along(380).add(upv.scale(-5));
            target = center.add(right.scale(Math.sin(t) * (portrait ? 110 : 170) * narrow)).add(upv.scale(Math.sin(t * 2) * 55));
            const half = Math.floor(t / Math.PI);
            if (half !== this._demoHalf) {
                this._demoHalf = half;
                this._demoN = (this._demoN || 0) + 1;
                const look = typeof GameLook !== 'undefined' ? GameLook.slashLook() : null;
                GameFX.slash(center, (this._demoN % 2 ? 0.25 : -0.25), '#ffffff', 0.9, look);
                if (this._demoN % 2 === 0) GameFX.paint(center, ['#ff8a2a', '#5ac8ff', '#7dff4a', '#ffd84a'][this._demoN % 4], right, 0.7);
                if (this._demoN % 4 === 0 && typeof GameLook !== 'undefined') GameLook.killEffect(center, null);
            }
        } else if (active) {
            const ray = view.scene.createPickingRay(this.ptr.x, this.ptr.y, BABYLON.Matrix.Identity(), cam);
            this._wantDepth = this.pickDepth(ray, W, H);
            this.depth += (this._wantDepth - this.depth) * (1 - Math.exp(-(dt || 0) * 9));
            // Палец у низа экрана: луч уходит в пол — меч останавливается над землёй, а не проваливается.
            let depth = this.depth;
            if (ray.direction.y < -1e-3) depth = Math.min(depth, (ray.origin.y - 40) / -ray.direction.y);
            target = ray.origin.add(ray.direction.scale(Math.max(120, depth)));
            if (target.y < 40) target.y = 40;
            this._ray = ray;
        } else {
            this.depth = Math.max(260, this.depth + (420 - this.depth) * (1 - Math.exp(-(dt || 0) * 3)));
        }
        if (!paused) {
            const k = 1 - Math.exp(-(dt || 0) * (swinging || (this._fl && this._fl.kind) ? 30 : 10));
            this.pos.addInPlace(target.subtract(this.pos).scale(k));
        }
        if (!this._placed) { this.pos.copyFrom(rest); this._placed = true; }
        // Поворот: в покое — наискосок вверх; в бою — остриём вглубь сцены, ведущей кромкой вперёд.
        const vel = this._prev ? this.pos.subtract(this._prevPos || this.pos).scale(1 / Math.max(1e-3, sdt || dt || 0.016)) : BABYLON.Vector3.Zero();
        this._prevPos = this.pos.clone();
        let blade, motion;
        const restBlade = upv.scale(0.9).subtract(right.scale(0.18)).add(fwd.scale(0.38)).normalize();
        if (this.blend > 0.02) {
            const toward = this._ray ? this._ray.direction : fwd;
            const vs = vel.subtract(fwd.scale(BABYLON.Vector3.Dot(vel, fwd)));
            const sp = vs.length();
            motion = sp > 40 ? vs.scale(1 / sp) : (this._motion || right);
            this._motion = motion;
            // Клинок вглубь и чуть вверх, наклон против движения (меч «тянется» за рукой).
            const lean = Math.min(0.55, sp / 4000);
            const act = toward.scale(1).add(upv.scale(0.32)).subtract(motion.scale(lean)).normalize();
            if (act.y < 0.12) { act.y = 0.12; act.normalize(); }    // клинок не втыкается в землю
            blade = BABYLON.Vector3.Lerp(restBlade, act, this.blend).normalize();
        } else {
            blade = restBlade;
            motion = right;
        }
        let thick = BABYLON.Vector3.Cross(blade, motion);
        if (thick.lengthSquared() < 1e-4) thick = BABYLON.Vector3.Cross(blade, upv);
        thick.normalize();
        const width = BABYLON.Vector3.Cross(thick, blade).normalize();
        const want = BABYLON.Quaternion.RotationQuaternionFromAxis(thick, blade, width);
        // Витрина меню: медленный поворот вокруг вертикали, клинок вверх.
        if (showcase) {
            this._spin = (this._spin || 0) + dt * 0.9;
            const face = BABYLON.Quaternion.RotationQuaternionFromAxis(fwd.scale(-1), upv, BABYLON.Vector3.Cross(fwd.scale(-1), upv).normalize());
            const tilt = BABYLON.Quaternion.RotationAxis(fwd, -0.18);
            const spinQ = BABYLON.Quaternion.RotationAxis(upv, this._spin);
            const base = tilt.multiply(spinQ.multiply(face));
            if (flRot) this.q.copyFrom(flRot.multiply(base));
            else BABYLON.Quaternion.SlerpToRef(this.q, base, 1 - Math.exp(-dt * 8), this.q);
        } else if (Game.state === 'win') {
            this._spin = (this._spin || 0) + dt * 6;
            const spinQ = BABYLON.Quaternion.RotationAxis(fwd, this._spin);
            BABYLON.Quaternion.SlerpToRef(this.q, spinQ.multiply(want), 1 - Math.exp(-dt * 10), this.q);
        } else {
            BABYLON.Quaternion.SlerpToRef(this.q, want, 1 - Math.exp(-(dt || 0) * 20), this.q);
        }
        const m = this.mesh;
        if (this.pos.y < 30) this.pos.y = 30;          // никогда не уходить под землю
        m.position.copyFrom(this.pos);
        m.rotationQuaternion = this.q;
        const sc = s * (showcase ? 1.05 : 0.78 + 0.5 * this.blend) * (this.def.element === 'giant' ? (showcase ? 0.75 : 1.25) : 1) * (showcase ? 1 : 1 + ((Game.mods && Game.mods.width) || 0) * 0.3);
        m.scaling.setAll(sc);
        m.computeWorldMatrix(true);
        // Разрезы — только в бою, вне паузы и когда меч реально движется.
        const samples = [this.hilt.getAbsolutePosition().clone(), this.mid.getAbsolutePosition().clone(), this.tip.getAbsolutePosition().clone()];
        // Разрез — по линии пальца на экране (точно по траектории свайпа).
        if (this._ptrPrev && !paused && active && Game.running) this.sweepScreen(this._ptrPrev, this.ptr, dt);
        this._ptrPrev = active ? { x: this.ptr.x, y: this.ptr.y } : null;
        this._prev = samples;
        this.speed = vel.length();
    },

    // Глубина меча: враг (или снаряд, реквизит), ближайший к пальцу на экране.
    pickDepth(ray, W, H) {
        const view = this.app.location.view;
        const R = Math.max(W, H) * 0.3;
        let best = null, bd = R;
        const cand = [];
        for (const m of Game.mobs) if (m.alive) cand.push({ x: m.x, y: m.y, h: (m.def.fly || 0) + m.h + 95 * m.scale });
        for (const s of Game.shots) if (s.alive) cand.push({ x: s.x, y: s.y, h: s.h });
        for (const p of Game.props) if (p.alive) cand.push({ x: p.x, y: p.y, h: 50 });
        for (const c of cand) {
            const p = view.projectToScreen(c.x, c.y, c.h);
            if (p.behind) continue;
            const d = Math.hypot(p.x - this.ptr.x, (p.y - this.ptr.y) * 0.6);
            if (d < bd) { bd = d; best = c; }
        }
        if (!best) return this.depth;
        const cam = view.camera;
        const C = cam.globalPosition || cam.position;
        const v = new BABYLON.Vector3(best.x, best.h, best.y).subtract(C);
        // Глубина вдоль луча пальца до плоскости цели (перпендикулярной лучу).
        return Math.max(160, BABYLON.Vector3.Dot(v, ray.direction));
    },

    // Разрез по линии пальца на экране (как во Fruit Ninja): плоскость проходит через глаз камеры и
    // два луча — от прошлой и текущей точки касания. Её след на экране — ровно линия свайпа, поэтому
    // враг режется именно там, где провёл игрок, на любой глубине.
    sweepScreen(a, b, dt) {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len < 6 || len / Math.max(1e-3, dt) < 520) return;      // палец стоит — не режет
        const view = this.app.location.view;
        const cam = view.camera;
        const C = (cam.globalPosition || cam.position).clone();
        const r0 = view.scene.createPickingRay(a.x, a.y, BABYLON.Matrix.Identity(), cam);
        const r1 = view.scene.createPickingRay(b.x, b.y, BABYLON.Matrix.Identity(), cam);
        const n = BABYLON.Vector3.Cross(r0.direction, r1.direction);
        if (n.lengthSquared() < 1e-10) return;
        n.normalize();
        const H = view.world.canvas.clientHeight || 600;
        const k = H / (2 * Math.tan(cam.fov / 2));
        const now = performance.now();
        const wide = 1 + ((Game.mods && Game.mods.width) || 0);      // перки «широкий взмах», «громадный клинок»
        // Расстояние от точки экрана до отрезка свайпа (px).
        const segD = (px, py) => {
            const dx = b.x - a.x, dy = b.y - a.y;
            const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
            return Math.hypot(a.x + dx * t - px, a.y + dy * t - py);
        };
        // Направление удара в мире на глубине d (для разлёта кусков).
        const swipeAt = (d) => r1.direction.scale(d).subtract(r0.direction.scale(d)).normalize();
        // Попадает ли шар (центр, радиус — мир) под свайп: проекция центра близко к отрезку.
        const under = (c, r) => {
            const p = view.projectToScreen(c.x, c.z, c.y);
            if (p.behind) return null;
            const dist = BABYLON.Vector3.Distance(C, c);
            const rpx = r * k / Math.max(1, dist);
            return segD(p.x, p.y) <= rpx * 0.92 * wide + 4 ? dist : null;
        };
        // Точка разреза — ближайшая к центру части точка плоскости.
        const onPlane = (c) => c.subtract(n.scale(BABYLON.Vector3.Dot(c.subtract(C), n)));
        let any = false;
        for (const mob of Game.mobs) {
            if (!mob.alive) continue;
            for (const piece of mob.ch.pieces.slice()) {
                if (!mob.alive) break;
                if (!piece.isEnabled() || (piece._cutAt && now - piece._cutAt < 160)) continue;
                piece.computeWorldMatrix(true);
                const bs = piece.getBoundingInfo().boundingSphere;
                const dist = under(bs.centerWorld, bs.radiusWorld);
                if (dist == null) continue;
                piece._cutAt = now;
                any = true;
                Game.sliceMob(mob, piece, onPlane(bs.centerWorld), n, swipeAt(dist), this.def, { a, b });
            }
        }
        // Летящие обломки — режутся ещё раз (без урона).
        for (const rec of GameChars.debris.slice()) {
            if (!rec.mesh || rec.mesh.isDisposed() || rec.cuts >= 3 || (rec._cutAt && now - rec._cutAt < 160) || rec.life < 0.06) continue;
            const bs = rec.mesh.getBoundingInfo().boundingSphere;
            const dist = under(bs.centerWorld, bs.radiusWorld);
            if (dist == null) continue;
            rec._cutAt = now;
            if (GameChars.cutDebris(rec, onPlane(bs.centerWorld), n, swipeAt(dist))) {
                GameFX.paint(bs.centerWorld, rec.inner || '#ffe066', swipeAt(dist), 0.5);
                GameAudio.play('blockBreak', { volume: 0.35 });
            }
        }
        // Снаряды мобов: меч их разбивает.
        for (const s of Game.shots) {
            if (!s.alive) continue;
            const dist = under(new BABYLON.Vector3(s.x, s.h, s.y), 45);
            if (dist != null) Game.breakShot(s, swipeAt(dist));
        }
        // Реквизит дорожки.
        for (const p of Game.props) {
            if (!p.alive || !p.mesh) continue;
            if (!p.box) { p.mesh.computeWorldMatrix(true); p.box = p.mesh.getHierarchyBoundingVectors(true); }
            const c = p.box.min.add(p.box.max).scale(0.5);
            const r = BABYLON.Vector3.Distance(p.box.min, p.box.max) * 0.5;
            const dist = under(c, r);
            if (dist != null) Game.hitProp(p, onPlane(c), swipeAt(dist));
        }
        if (any) { this._lastCutAt = now; if (!this.tireless()) this.stamina = Math.max(0, this.stamina - 0.12 * this.staminaOf(this.def).drain); }
    },

    _segDist(a, b, p) {
        const ab = b.subtract(a), t = Math.max(0, Math.min(1, BABYLON.Vector3.Dot(p.subtract(a), ab) / Math.max(1e-6, ab.lengthSquared())));
        return BABYLON.Vector3.Distance(a.add(ab.scale(t)), p);
    },

    // Угол разреза на экране (для вспышки-серпа), рад: 0 — вправо, против часовой.
    screenAngle(a, b) {
        const view = this.app.location.view;
        const pa = view.projectToScreen(a.x, a.z, a.y), pb = view.projectToScreen(b.x, b.z, b.y);
        return Math.atan2(-(pb.y - pa.y), pb.x - pa.x);
    },

    // --- Стихии при разрезе (вызывает Game.sliceMob после урона) -------------------------------

    element(mob, el, c, dmg, def, swipe) {
        const imm = mob.def.immune || [];
        const fe = def.element;
        const solar = fe === 'solar', lunar = fe === 'lunar', cosmic = fe === 'cosmic';
        if ((el === 'fire' || solar) && !imm.includes('fire')) Game.status(mob, 'burn', 3, dmg * 0.4);
        if (el === 'poison' && !imm.includes('poison')) Game.status(mob, 'poison', 3.5, dmg * 0.35);
        if ((el === 'ice' || lunar) && !imm.includes('ice')) {
            Game.status(mob, 'slow', 2.5, 0.5);
            mob.iceStacks = (mob.iceStacks || 0) + 1;
            if (mob.iceStacks >= 3) { mob.iceStacks = 0; Game.status(mob, 'freeze', 1.2, 0); GameFX.burst(c, '#bff4ff', 26, [200, 500]); GameAudio.play('ice'); }
        }
        if (el === 'wind') { Game.knock(mob, 110); GameFX.burst(c, '#e8fff8', 14, [300, 600]); GameAudio.play('wind', { volume: 0.5 }); }
        if (el === 'water') { Game.knock(mob, 70); Game.status(mob, 'slow', 1.5, 0.75); GameFX.burst(c, '#5ab8ff', 22, [200, 520]); }
        if (el === 'nature') Game.status(mob, 'root', 1.1, 0);
        if (el === 'candy') { Game.status(mob, 'slow', 2, 0.7); mob.candy = true; GameFX.burst(c, ['#ff7ab8', '#7ad8ff', '#fff27a'][(Math.random() * 3) | 0], 16); }
        if (el === 'gold') mob.goldMark = true;
        if (el === 'lightning') {
            const near = Game.mobs.filter(m => m.alive && m !== mob && Game.distTo(m, mob) < 460).sort((a, b) => Game.distTo(a, mob) - Game.distTo(b, mob)).slice(0, 2);
            for (const n of near) {
                GameFX.lightning(c, Game.chest(n), '#fff27a');
                Game.zap(n, dmg * 0.5, def);
            }
            GameAudio.play('lightning');
        }
        if (el === 'void' || lunar || cosmic) {
            for (const m of Game.mobs) if (m.alive && m !== mob && Game.distTo(m, mob) < 480) Game.pull(m, mob, 90);
            GameFX.burst(c, '#c070ff', 18, [100, 300]);
        }
        if (el === 'laser' || fe === 'prism') {
            const others = Game.mobs.filter(m => m.alive && m !== mob);
            const t = others[(Math.random() * others.length) | 0];
            if (t) { GameFX.beam(c.clone(), Game.chest(t), 22, '#3affea', 0.22, 'beam'); Game.zap(t, dmg * 0.5, def); GameAudio.play('laser'); }
        }
        if (el === 'holy' || solar) GameFX.burst(c, '#fff6c0', 14, [100, 300]);
        if (fe === 'chainsaw') GameFX.burst(c, '#ffb02a', 10, [200, 500], [6, 12]);
    },

    // Добивание: финальные эффекты меча (взрыв, столп света, метеор, звездопад).
    onKill(mob, c, def) {
        const el = def.element;
        const dmg = def.dmg;
        const aoe = (r, mul, e) => { for (const m of Game.mobs) if (m.alive && Math.hypot(m.x - c.x, m.y - c.z) < r) Game.zap(m, dmg * mul, def, e); };
        if (el === 'explode' || def.id === 'magma') { GameFX.explosion(c, 300); GameAudio.play('explosion'); aoe(270, 0.8, 'explode'); }
        if (el === 'holy' || el === 'solar') { GameFX.pillar(new BABYLON.Vector3(c.x, 0, c.z), '#fff3a8'); GameAudio.play('holy'); aoe(200, 1, 'holy'); }
        if (el === 'meteor' || el === 'cosmic') {
            const targets = Game.mobs.filter(m => m.alive).slice(0, el === 'cosmic' ? 4 : 1);
            targets.forEach((t, k) => setTimeout(() => this.meteor(t, dmg * (el === 'cosmic' ? 0.8 : 1.5), def), 160 + k * 180));
        }
        if (el === 'infinity') { GameFX.explosion(c, 420); GameFX.pillar(new BABYLON.Vector3(c.x, 0, c.z), '#ffffff'); GameAudio.play('explosion'); aoe(380, 1.2, 'infinity'); }
    },

    // Метеорит с неба в моба.
    meteor(target, dmg, def) {
        if (!Game.running || !target || !target.alive) return;
        const p = Game.chest(target);
        const from = new BABYLON.Vector3(p.x - 500, 1800, p.z - 900);
        const scene = this.app.location.view.scene;
        const rock = BABYLON.MeshBuilder.CreateBox('meteor', { size: 70 }, scene);
        const mat = new BABYLON.StandardMaterial('meteor-mat', scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString('#3a2a2a');
        mat.emissiveColor = BABYLON.Color3.FromHexString('#ff5a1a');
        rock.material = mat;
        rock.position.copyFrom(from);
        GameWorld.addGlow(rock);
        const tr = GameFX.trail(rock, '#ff8a2a', 60);
        let t = 0;
        const obs = scene.onBeforeRenderObservable.add(() => {
            if (Pause.active) return;
            t += scene.getEngine().getDeltaTime() / 1000;
            const k = Math.min(1, t / 0.5);
            rock.position.copyFrom(BABYLON.Vector3.Lerp(from, new BABYLON.Vector3(p.x, 30, p.z), k * k));
            rock.rotation.x += 0.3; rock.rotation.z += 0.2;
            if (k >= 1) {
                scene.onBeforeRenderObservable.remove(obs);
                GameFX.explosion(new BABYLON.Vector3(p.x, 40, p.z), 320, ['#3a2a2a', '#ff6a1a', '#5a3a2a']);
                GameAudio.play('meteor');
                for (const m of Game.mobs) if (m.alive && Math.hypot(m.x - p.x, m.y - p.z) < 300) Game.zap(m, dmg, def, 'meteor');
                if (tr) tr.dispose();
                GameWorld.removeGlow(rock);
                rock.dispose(); mat.dispose();
            }
        });
    },

    // Сброс между уровнями: меч в покое.
    reset() {
        this.drag = false;
        this._pid = null;
        this._prev = null;
        this._placed = false;
        this.blend = 0;
        this.depth = 420;
        this.stamina = this.staminaMax; this.tired = false;
        this._drawAt = 0; this._freezeUntil = 0; this._stunUntil = 0;
    },
};
