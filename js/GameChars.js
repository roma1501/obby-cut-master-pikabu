// GameChars.js — мобы Obby Cut Master: риги R6 из Blender (Rig.js), их «живые» части и
// разрезание. Разрез делит часть плоскостью свайпа (GameSlice): кусок со стороны сустава
// остаётся на кости и дальше анимируется, отрезанный отлетает с простой физикой (и его можно
// разрезать ещё раз в воздухе). Логика боя (HP, урон, ИИ) — в Game.js.

/** @satisfies {Record<string, any>} */
const GameChars = {
    /** @type {LoryApp | null} */
    app: null,
    clips: null,
    /** @type {Record<string, any>} */
    models: {},
    /** @type {Record<string, boolean>} */
    fallback: {},      // тип без своей модели (взята запасная)
    /** @type {any[]} */
    debris: [],
    /** @type {any[]} */
    _oldMats: [],      // материалы убранных мобов: ждут, пока исчезнут их обломки
    _id: 0,

    // Пути моделей — литералы (сканер сборщика видит только так).
    URLS: {
        noob: 'assets/models/chars/mob_noob.glb',
        zombie: 'assets/models/chars/mob_zombie.glb',
        bacon: 'assets/models/chars/mob_bacon.glb',
        guest: 'assets/models/chars/mob_guest.glb',
        mummy: 'assets/models/chars/mob_mummy.glb',
        skeleton: 'assets/models/chars/mob_skeleton.glb',
        tnt: 'assets/models/chars/mob_tnt.glb',
        slime: 'assets/models/chars/mob_slime.glb',
        ninja: 'assets/models/chars/mob_ninja.glb',
        ghost: 'assets/models/chars/mob_ghost.glb',
        snowman: 'assets/models/chars/mob_snowman.glb',
        knight: 'assets/models/chars/mob_knight.glb',
        pirate: 'assets/models/chars/mob_pirate.glb',
        brute: 'assets/models/chars/mob_brute.glb',
        wizard: 'assets/models/chars/mob_wizard.glb',
        alien: 'assets/models/chars/mob_alien.glb',
        robot: 'assets/models/chars/mob_robot.glb',
        slender: 'assets/models/chars/mob_slender.glb',
        pumpkin: 'assets/models/chars/mob_pumpkin.glb',
        lava: 'assets/models/chars/mob_lava.glb',
        boss_king: 'assets/models/chars/mob_boss_king.glb',
        boss_pharaoh: 'assets/models/chars/mob_boss_pharaoh.glb',
        boss_guardian: 'assets/models/chars/mob_boss_guardian.glb',
        boss_yeti: 'assets/models/chars/mob_boss_yeti.glb',
        boss_chief: 'assets/models/chars/mob_boss_chief.glb',
        boss_shroom: 'assets/models/chars/mob_boss_shroom.glb',
        boss_outlaw: 'assets/models/chars/mob_boss_outlaw.glb',
        boss_demon: 'assets/models/chars/mob_boss_demon.glb',
        boss_voidlord: 'assets/models/chars/mob_boss_voidlord.glb',
        boss_titan: 'assets/models/chars/mob_boss_titan.glb',
    },
    CLIPS_URL: 'assets/models/chars/r6_clips.glb',

    // Цвета блоков-осколков по типу: кожа, верх, низ, акцент.
    PALETTES: {
        noob: ['#e8b98a', '#ff8a2a', '#5a4ab8', '#ffffff'],
        zombie: ['#6fae4a', '#2f9e9e', '#5a3e8a', '#3d7a2a'],
        bacon: ['#f2c49b', '#3cb043', '#3a5fa0', '#8a4a20'],
        guest: ['#f2c49b', '#2a2a2a', '#4a4a4a', '#111111'],
        mummy: ['#e8dcb8', '#cdbf96', '#b8a878', '#7a6a4a'],
        skeleton: ['#f0f0e8', '#d8d8cc', '#bcbcb0', '#5a5a5a'],
        tnt: ['#e8b98a', '#db2b1e', '#ffffff', '#3a3a3a'],
        slime: ['#6fdc4a', '#4ab82e', '#9aff7a', '#2a7a1a'],
        ninja: ['#2a2a2a', '#1a1a1a', '#c0302a', '#f2c49b'],
        ghost: ['#f4f8ff', '#dfe8f8', '#c8d4ea', '#9aaad0'],
        snowman: ['#ffffff', '#e8f2ff', '#ff8a2a', '#3a2a1a'],
        knight: ['#c8ccd4', '#9aa0aa', '#6a707a', '#c03030'],
        pirate: ['#f2c49b', '#c03030', '#ffffff', '#3a2a1a'],
        brute: ['#d8a070', '#6a4a2a', '#3a3a5a', '#8a8a8a'],
        wizard: ['#f2c49b', '#5a2a9a', '#3a1a6a', '#ffd84a'],
        alien: ['#9ad08a', '#c8ccd4', '#8a8f9a', '#101010'],
        robot: ['#a8b0bc', '#6a7280', '#4a5260', '#3affea'],
        slender: ['#f4f4f4', '#1a1a1a', '#2a2a2a', '#ffffff'],
        pumpkin: ['#ff8a1a', '#8a6a3a', '#5a4a2a', '#ffd84a'],
        lava: ['#3a2a2a', '#5a3a2a', '#ff6a1a', '#ffb02a'],
    },
    // Цвет «нутра» на срезе (пиксельная крышка): у каждого моба свой.
    INNER: {
        noob: '#ffd0a8', zombie: '#9fdc7a', bacon: '#ffe0c0', guest: '#d8d8d8', mummy: '#f4ecd4',
        skeleton: '#ffffff', tnt: '#ffd8a0', slime: '#9aff7a', ninja: '#9a9aaa', ghost: '#ffffff',
        snowman: '#ffffff', knight: '#e0e4ec', pirate: '#ffe0c0', brute: '#f0c8a0', wizard: '#e0c0ff',
        alien: '#c8f0b8', robot: '#b0bac8', slender: '#d0d0d0', pumpkin: '#ffd27a', lava: '#ffc890',
    },

    DEBRIS_MAX: IS_MOBILE ? 22 : 34,      // обломков разом (старые уходят)

    // Настоящие тени мобов — только на высоком уровне графики ПК: каждая часть моба — ещё одна отрисовка
    // в карте теней. Ниже — мягкое пятно под ногами (GameFX.blobs, одна отрисовка на всех).
    realShadows() {
        const level = typeof Quality !== 'undefined' ? Quality.level : 2;
        return level >= 2 && !IS_MOBILE;
    },

    init(app) {
        this.app = app;
        app.onUpdate(dt => this.updateDebris(dt));
    },

    // Модель по типу: GLB; нет файла — модель нуба (временная, пока нет своей).
    async model(type) {
        if (this.models[type]) return this.models[type];
        const url = this.URLS[type];
        let model = null;
        if (url) { try { model = await Rig.load(url); } catch (e) { console.warn('GameChars: нет модели ' + type + ' (' + url + ')'); } }
        if (!model) this.fallback[type] = true;
        if (!model && type !== 'noob') model = await this.model('noob');
        this.models[type] = model;
        return model;
    },

    async loadClips() {
        if (this.clips) return this.clips;
        try { this.clips = await Rig.load(this.CLIPS_URL); } catch (e) { this.clips = null; }
        return this.clips;
    },

    // Предзагрузка нужных уровню моделей (под экраном загрузки).
    async preload(types) {
        await this.loadClips();
        for (const t of [...new Set(types)]) await this.model(t);
    },

    // Риг моба: свои материалы (клоны) — вспышка и оттенок бьют только по нему; список живых частей.
    async create(type, opts) {
        const o = opts || {};
        const model = await this.model(type);
        if (!model) return null;
        const view = this.app.location.view;
        const rig = Rig.create(model, view, { name: (o.name || type) + '#' + (++this._id), clips: this.clips ? [this.clips] : [] });
        /** @type {Map<BABYLON.Material, BABYLON.StandardMaterial>} */
        const own = new Map();
        for (const m of rig._meshes) {
            const src = m.material;
            if (!src) continue;
            let c = own.get(src);
            if (!c) {
                c = /** @type {BABYLON.StandardMaterial} */ (src.clone(src.name + '#' + rig.name));
                c.metadata = Object.assign({}, src.metadata);
                own.set(src, c);
            }
            m.material = c;
        }
        const ch = {
            type, rig, mats: [...own.values()],
            scale: o.scale || 1, flash: 0, tint: null, squash: 0,
            /** @type {BABYLON.Mesh[]} */
            pieces: rig._meshes.filter(m => m.isEnabled()),
            /** @type {BABYLON.Mesh[]} */
            extra: [],           // свои меши (куски после разрезов) — удалить вместе с мобом
            cuts: 0,
        };
        rig.root.scaling.setAll(ch.scale);
        if (!this.realShadows()) view.removeShadowCaster(rig.root);
        GameSlice.warm(ch.pieces);
        return ch;
    },

    // Имя части меша (Head, Arm_L, Head_Helmet …).
    partName(mesh) { return String((mesh && mesh.metadata && mesh.metadata.part) || ''); },

    // Цвет-эмиссия: вспышка удара (белая) и оттенок состояния (огонь, лёд, яд).
    paint(ch, dt) {
        if (!ch || !ch.mats) return;
        ch.flash = Math.max(0, ch.flash - dt * 7);
        const t = ch.tint;
        const f = ch.flash;
        let r = f, g = f, b = f;
        if (t) { r += t[0]; g += t[1]; b += t[2]; }
        for (const m of ch.mats) {
            if (!m.emissiveColor) continue;
            m.emissiveColor.set(Math.min(1, r), Math.min(1, g), Math.min(1, b));
        }
        if (ch.squash > 0) {
            ch.squash = Math.max(0, ch.squash - dt * 6);
            const s = ch.scale, q = ch.squash;
            ch.rig.root.scaling.set(s * (1 + q * 0.12), s * (1 - q * 0.14), s * (1 + q * 0.12));
        }
    },

    impact(ch, power) {
        if (!ch) return;
        ch.flash = Math.min(1, 0.85 * (power || 1));
        ch.squash = Math.min(1, 0.7 * (power || 1));
    },

    // --- Разрез ---------------------------------------------------------------------------------

    // Разрезать живую часть моба плоскостью (мир): кусок у сустава остаётся, второй отлетает.
    // swipe — направление движения меча (мир). Возвращает { part, kept, fell, fellRec } или null.
    cutPiece(ch, mesh, pointW, normalW, swipe, power) {
        const geo = GameSlice.read(mesh);
        if (!geo) return null;
        const pl = GameSlice.planeToLocal(mesh, pointW, normalW);
        const sp = GameSlice.split(geo, pl.n, pl.d);
        if (sp.front.length < 3 || sp.back.length < 3) return null;
        // Сторона сустава: начало координат части — точка кости (плечо, шея, бедро).
        let keepFront = pl.d > 0;
        if (Math.abs(pl.d) < 4) keepFront = sp.front.length >= sp.back.length;
        const keepTris = keepFront ? sp.front : sp.back, fellTris = keepFront ? sp.back : sp.front;
        const cap = GameSlice.cap(sp.segs, pl.n);
        const scene = this.app.location.view.scene;
        const view = this.app.location.view;
        const part = this.partName(mesh);
        const inner = GameFX.safeColor(GameSlice.cutColor(mesh.material, sp.uvs, this.INNER[ch.type] || '#e8e2d0'));
        // Оставшийся кусок: та же кость, те же локальные координаты.
        const kept = GameSlice.build(mesh.name + '|k', keepTris, geo, scene, mesh.material, null);
        if (!kept) return null;
        kept.parent = mesh.parent;
        kept.position.copyFrom(mesh.position);
        if (mesh.rotationQuaternion) kept.rotationQuaternion = mesh.rotationQuaternion.clone(); else kept.rotation.copyFrom(mesh.rotation);
        kept.scaling.copyFrom(mesh.scaling);
        kept.metadata = { part, rig: ch.rig, cut: ((mesh.metadata && mesh.metadata.cut) || 0) + 1, orig: (mesh.metadata && mesh.metadata.orig) || mesh };
        const kcap = GameSlice.buildCap(mesh.name + '|kc', cap, pl.n, scene, inner, null, keepFront ? -1 : 1);
        if (kcap) kcap.parent = kept;
        World3D.addObject(view, kept, 'actor', { ink: false, outline: false, castShadow: this.realShadows() });
        // Отлетающий кусок: в мировых координатах, центр — в его середине.
        const fellRec = this._debrisFromTris(mesh, fellTris, geo, cap, pl.n, keepFront ? 1 : -1, inner, swipe, normalW.scale(keepFront ? -1 : 1), power, part);
        mesh.setEnabled(false);
        const i = ch.pieces.indexOf(mesh);
        if (i >= 0) ch.pieces.splice(i, 1, kept); else ch.pieces.push(kept);
        ch.extra.push(kept);
        ch.cuts++;
        return { part, kept, fell: fellRec ? fellRec.mesh : null, fellRec, inner };
    },

    // Обломок из треугольников части (локальные координаты исходного меша).
    _debrisFromTris(src, tris, geo, cap, n, capSign, inner, swipe, away, power, part) {
        const scene = this.app.location.view.scene;
        const view = this.app.location.view;
        // Центр куска (локально).
        const c = [0, 0, 0];
        for (const v of tris) { c[0] += v.p[0]; c[1] += v.p[1]; c[2] += v.p[2]; }
        c[0] /= tris.length; c[1] /= tris.length; c[2] /= tris.length;
        const m = GameSlice.build(src.name + '|f', tris, geo, scene, src.material, c);
        if (!m) return null;
        const mc = GameSlice.buildCap(src.name + '|fc', cap, n, scene, inner, c, capSign);
        if (mc) mc.parent = m;
        const W = src.computeWorldMatrix(true);
        const s = new BABYLON.Vector3(), q = new BABYLON.Quaternion(), t = new BABYLON.Vector3();
        W.decompose(s, q, t);
        m.position.copyFrom(BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(c[0], c[1], c[2]), W));
        m.rotationQuaternion = q;
        m.scaling.copyFrom(s);
        World3D.addObject(view, m, 'actor', { ink: false, outline: false, castShadow: false });
        const pw = power || 1;
        const dir = swipe ? swipe.clone().normalize() : BABYLON.Vector3.Zero();
        const up = /^Head/.test(part) ? 760 : 380;
        const vel = dir.scale(420 * pw).add(away.scale(260 * pw)).add(new BABYLON.Vector3((Math.random() - 0.5) * 120, up + Math.random() * 220, (Math.random() - 0.5) * 120));
        const spin = new BABYLON.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
        const rec = this._pushDebris(m, vel, spin, s, (src.metadata && src.metadata.cut) || 0, part);
        rec.inner = inner;
        return rec;
    },

    _pushDebris(m, vel, spin, s, cuts, part) {
        const cam = this.app.location.view.camera;
        const fwd = cam.getForwardRay(1).direction;
        const toward = -BABYLON.Vector3.Dot(vel, fwd);
        if (toward > 0) vel.addInPlace(fwd.scale(toward * 1.2));     // не лететь в камеру
        vel.addInPlace(fwd.scale(180));
        const bb = m.getBoundingInfo().boundingBox;
        const half = Math.max(3, Math.min(bb.extendSize.x * s.x, bb.extendSize.y * s.y, bb.extendSize.z * s.z));
        m.metadata = Object.assign({}, m.metadata, { part, cut: (cuts || 0) + 1, debris: true });
        const rec = { mesh: m, vel, spin, life: 0, ttl: (typeof GAME_DEBRIS_LIFE !== 'undefined' ? GAME_DEBRIS_LIFE : 2.6) + 0.8, half, s0: s.clone(), bounces: 0, cuts: (cuts || 0) + 1, part };
        this.debris.push(rec);
        while (this.debris.length > this.DEBRIS_MAX) this._killDebris(this.debris.shift());
        return rec;
    },

    // Разрезать летящий обломок ещё раз (для сочности; урона не даёт).
    cutDebris(rec, pointW, normalW, swipe) {
        if (!rec || rec.cuts >= 3 || !rec.mesh || rec.mesh.isDisposed()) return false;
        const mesh = rec.mesh;
        const geo = GameSlice.read(mesh);
        if (!geo) return false;
        const pl = GameSlice.planeToLocal(mesh, pointW, normalW);
        const sp = GameSlice.split(geo, pl.n, pl.d);
        if (sp.front.length < 3 || sp.back.length < 3) return false;
        const cap = GameSlice.cap(sp.segs, pl.n);
        const color = rec.inner || '#e8e2d0';
        for (const [tris, sign] of [[sp.front, 1], [sp.back, -1]]) {
            const r = this._debrisFromTris(mesh, tris, geo, cap, pl.n, -sign, color, swipe, normalW.scale(sign), 0.6, rec.part);
            if (r) { r.vel.addInPlace(rec.vel.scale(0.6)); r.cuts = rec.cuts + 1; }
        }
        this._killDebris(rec);
        const k = this.debris.indexOf(rec);
        if (k >= 0) this.debris.splice(k, 1);
        return true;
    },

    // Регенерация: обрубки заменяются исходными частями модели. true — что-то отросло.
    regrow(ch) {
        let any = false;
        for (let i = 0; i < ch.pieces.length; i++) {
            const p = ch.pieces[i];
            const orig = p.metadata && p.metadata.orig;
            if (!orig || orig === p || orig.isDisposed()) continue;
            orig.setEnabled(true);
            p.setEnabled(false);
            ch.pieces[i] = orig;
            any = true;
        }
        return any;
    },

    // Отделить часть целиком (смерть: всё разлетается). Голова — высоко вверх, как в референсе.
    detachWhole(ch, mesh, dir, power) {
        if (!mesh.isEnabled()) return null;
        const view = this.app.location.view;
        const part = this.partName(mesh);
        const W = mesh.computeWorldMatrix(true);
        const s = new BABYLON.Vector3(), q = new BABYLON.Quaternion(), t = new BABYLON.Vector3();
        W.decompose(s, q, t);
        if (!mesh.geometry) return null;
        // Лёгкая копия делит геометрию с частью (и крышки-дети — тоже): ни чтения, ни сборки вершин,
        // ни копирования всех свойств меша (clone() стоил ~0.8 мс на часть).
        const m = this._share(mesh, mesh.name + '|w', null);
        if (!m) return null;
        const c = mesh.getBoundingInfo().boundingBox.center;
        // Вершины сдвигаются на −центр ДО масштаба и поворота: position — центр куска (как у собранного обломка).
        m.setPivotMatrix(BABYLON.Matrix.Translation(-c.x, -c.y, -c.z), false);
        m.position.copyFrom(BABYLON.Vector3.TransformCoordinates(c, W));
        m.rotationQuaternion = q;
        m.scaling.copyFrom(s);
        m.setEnabled(true);
        m.isPickable = false;
        World3D.addObject(view, m, 'actor', { ink: false, outline: false, castShadow: false });
        mesh.setEnabled(false);
        const pw = power || 1;
        const d = dir || new BABYLON.Vector3(0, 0, -1);
        const head = /^Head/.test(part);
        const vel = new BABYLON.Vector3(d.x * 420 * pw + (Math.random() - 0.5) * 320, (head ? 1150 : 420) + Math.random() * 380 * pw, d.z * 420 * pw + (Math.random() - 0.5) * 120);
        const spin = new BABYLON.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
        const rec = this._pushDebris(m, vel, spin, s, (mesh.metadata && mesh.metadata.cut) || 0, part);
        rec.inner = this.INNER[ch.type] || '#e8e2d0';
        return rec;
    },

    // Новый меш на той же геометрии и материале (+ прямые дети-крышки), локальная поза как у источника.
    _share(src, name, parent) {
        const scene = this.app.location.view.scene;
        const m = new BABYLON.Mesh(name, scene);
        src.geometry.applyToMesh(m);
        if (src.subMeshes && src.subMeshes.length > 1) {
            m.subMeshes = [];
            for (const sm of src.subMeshes) new BABYLON.SubMesh(sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount, m);
        }
        m.material = src.material;
        m.visibility = src.visibility;
        m.isPickable = false;
        if (parent) {
            m.parent = parent;
            m.position.copyFrom(src.position);
            if (src.rotationQuaternion) m.rotationQuaternion = src.rotationQuaternion.clone(); else m.rotation.copyFrom(src.rotation);
            m.scaling.copyFrom(src.scaling);
        }
        for (const c of src.getChildMeshes(true)) {
            const cm = /** @type {BABYLON.Mesh} */ (c);
            if (cm instanceof BABYLON.LinesMesh) continue;          // шрамы-линии с обломком не летят
            if (cm.geometry && cm.isEnabled()) this._share(cm, cm.name + '|w', m);
        }
        return m;
    },

    // Смерть: все живые части — обломки.
    shatter(ch, dir, power) {
        ch.flash = 0; ch.tint = null;
        for (const m of ch.mats) if (m.emissiveColor) m.emissiveColor.set(0, 0, 0);
        for (const m of ch.pieces.slice()) this.detachWhole(ch, m, dir, power);
        ch.pieces = [];
    },

    // Мировая точка кости (шея, плечо) — для проверки «отрублено ли выше разреза».
    jointPos(ch, node) { return ch.rig.nodePosition(node); },

    _killDebris(d) {
        if (!d || !d.mesh || d.mesh.isDisposed()) return;
        World3D.removeObject(this.app.location.view, d.mesh);
    },

    updateDebris(dt) {
        const G = -2100;
        for (let i = this._oldMats.length - 1; i >= 0; i--) {
            const o = this._oldMats[i];
            o.t -= dt;
            if (o.t <= 0) { for (const m of o.mats) m.dispose(); this._oldMats.splice(i, 1); }
        }
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.life += dt;
            const m = d.mesh;
            if (!m || m.isDisposed()) { this.debris.splice(i, 1); continue; }
            d.vel.y += G * dt;
            m.position.addInPlace(d.vel.scale(dt));
            const qd = BABYLON.Quaternion.RotationYawPitchRoll(d.spin.y * dt, d.spin.x * dt, d.spin.z * dt);
            m.rotationQuaternion = qd.multiply(m.rotationQuaternion || BABYLON.Quaternion.Identity());
            if (m.position.y < d.half) {
                m.position.y = d.half;
                if (d.vel.y < 0) d.vel.y = -d.vel.y * (d.bounces < 2 ? 0.36 : 0.08);
                d.vel.x *= 0.6; d.vel.z *= 0.6;
                d.spin.scaleInPlace(0.5);
                d.bounces++;
                if (d.bounces === 1 && typeof GameFX !== 'undefined' && GameFX.dust) GameFX.dust(m.position, 0.6);
            }
            const fade = d.ttl - d.life;
            if (fade < 0.45) m.scaling.copyFrom(d.s0.scale(Math.max(0.001, fade / 0.45)));
            if (d.life >= d.ttl) { this._killDebris(d); this.debris.splice(i, 1); }
        }
    },

    clearDebris() {
        for (const d of this.debris) this._killDebris(d);
        this.debris = [];
    },

    dispose(ch) {
        if (!ch) return;
        for (const m of ch.extra || []) { if (!m.isDisposed()) World3D.removeObject(this.app.location.view, m); }
        ch.extra = [];
        if (ch.rig && !ch.rig.disposed) ch.rig.dispose();
        // Материалы ещё носят летящие обломки: удалить, когда те догорят.
        if (ch.mats && ch.mats.length) this._oldMats.push({ mats: ch.mats, t: 6 });
        ch.mats = [];
    },

    palette(type) {
        const base = String(type).replace(/^boss_.*/, 'noob');
        return this.PALETTES[type] || this.PALETTES[base] || this.PALETTES.noob;
    },
};
