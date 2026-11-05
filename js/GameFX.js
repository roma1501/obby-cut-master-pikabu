// GameFX.js — эффекты Obby Cut Master: блоки-осколки (thin instances), вспышки разреза,
// искры, ударные волны, молнии, столп света, метеор, лазер, взрыв, пыль, цифры урона.
// Всё — вид; на паузе стоит (обновление из app.onUpdate), при смене уровня — clear().

/** @satisfies {Record<string, any>} */
const GameFX = {
    /** @type {LoryApp | null} */
    app: null,
    /** @type {BABYLON.Mesh | null} */
    cubeMesh: null,
    /** @type {any[]} */
    _cubes: [],
    _mat: null,
    _col: null,
    /** @type {any[]} */
    sprites: [],    // плоские вспышки, кольца, лучи: { mesh, life, ttl, kind, ... }
    /** @type {any[]} */
    texts: [],      // DOM-цифры урона
    /** @type {HTMLElement | null} */
    layer: null,
    _tex: {},
    _tmpM: null,

    init(app) {
        this.app = app;
        const scene = app.location.view.scene;
        // Кубики: один меш, тысячи инстансов, свой цвет у каждого.
        const box = BABYLON.MeshBuilder.CreateBox('ocm-cubes', { size: 1 }, scene);
        const mat = new BABYLON.StandardMaterial('ocm-cubes-mat', scene);
        mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        mat.metadata = { toonGroup: 'actor' };
        box.material = mat;
        box.isPickable = false;
        box.alwaysSelectAsActiveMesh = true;
        box.thinInstanceEnablePicking = false;
        this.cubeMesh = box;
        this._max = Math.max(50, typeof GAME_DEBRIS_MAX !== 'undefined' ? GAME_DEBRIS_MAX : 420) * (IS_MOBILE ? 0.5 : 1) | 0;
        this._mats = new Float32Array(this._max * 16);
        this._cols = new Float32Array(this._max * 4);
        box.thinInstanceSetBuffer('matrix', this._mats, 16, false);
        box.thinInstanceSetBuffer('color', this._cols, 4, false);
        box.thinInstanceCount = 0;
        app.location.view.addShadowCaster(box, false);
        this._tmpM = new BABYLON.Matrix();
        // Слой цифр урона поверх канваса (мышь сквозь).
        let layer = document.getElementById('ocm-fx-layer');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'ocm-fx-layer';
            layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:20;';
            document.body.appendChild(layer);
        }
        this.layer = layer;
        this._registerRecipes();
        app.onUpdate(dt => this.update(dt));
        app.onFrame(() => this.placeTexts());
    },

    _registerRecipes() {
        const fx = this.app.fx;
        if (!fx) return;
        // Текстуры частиц — из assets/fx (ImageGen-графика проектов пользователя и Kenney CC0, см. docs/ASSETS-2D.md).
        fx.register('ocm-hit', [
            { texture: 'assets/fx/spark_streak.webp', burst: 22, capacity: 26, life: [0.15, 0.38], size: [14, 30], speed: [320, 760], color: '#ffffff', color2: '#fff0a0' },
            { texture: 'assets/fx/flash_star.webp', burst: 1, capacity: 2, life: [0.12, 0.16], size: [150, 200], speed: [0, 0], color: '#ffffff' },
            { texture: 'assets/fx/square.webp', burst: 10, capacity: 12, life: [0.3, 0.6], size: [8, 14], speed: [150, 380], color: '#ffffff', color2: '#d0d0d0', gravity: [0, -900, 0], blend: 'standard' },
        ]);
        fx.register('ocm-dust', [
            { texture: 'assets/fx/dust_puff.webp', burst: 8, capacity: 10, life: [0.4, 0.9], size: [30, 60], speed: [40, 120], color: '#d8cbb0', alpha: 0.6, blend: 'standard', gravity: [0, 40, 0], direction: [[-1, 0.1, -1], [1, 0.5, 1]] },
        ]);
        fx.register('ocm-explosion', [
            { texture: 'assets/fx/flash_burst.webp', burst: 1, capacity: 2, life: [0.16, 0.22], size: [460, 560], speed: [0, 0], color: '#fff6c0' },
            { texture: 'assets/fx/explosion_sheet_4x4.webp', sheet: { width: 256, height: 256, start: 0, end: 15, speed: 1.6 }, burst: 6, capacity: 8, life: [0.45, 0.6], size: [200, 320], speed: [20, 120], color: '#ffffff' },
            { texture: 'assets/fx/spark_streak.webp', burst: 50, capacity: 56, life: [0.3, 0.7], size: [18, 40], speed: [400, 1000], color: '#ffb040', color2: '#ff4010' },
            { texture: 'assets/fx/smoke_grey.webp', delay: 0.08, burst: 18, capacity: 22, life: [0.8, 1.8], size: [90, 170], speed: [60, 200], color: '#5a5048', alpha: 0.7, blend: 'standard', gravity: [0, 90, 0] },
        ]);
        fx.register('ocm-coin', [
            { texture: 'assets/fx/coin_sparkle.webp', burst: 12, capacity: 14, life: [0.35, 0.7], size: [14, 26], speed: [120, 320], color: '#ffffff', color2: '#fff6c0', gravity: [0, -300, 0] },
        ]);
        fx.register('ocm-poof', [
            { texture: 'assets/fx/smoke_white.webp', burst: 12, capacity: 14, life: [0.4, 0.9], size: [60, 110], speed: [60, 180], color: '#ffffff', alpha: 0.75, blend: 'standard', gravity: [0, 60, 0] },
            { texture: 'assets/fx/sparkle_4pt.webp', burst: 14, capacity: 16, life: [0.25, 0.55], size: [14, 26], speed: [200, 500], color: '#fff6c0' },
        ]);
    },

    // --- Кубики ---------------------------------------------------------------------------------

    // Россыпь блоков: pos — Vector3, colors — ['#rrggbb'], dir — Vector3 (куда летят сильнее).
    cubes(pos, colors, count, dir, power, size) {
        const n = Math.max(1, Math.round(count * (IS_MOBILE ? 0.6 : 1)));
        const pw = power || 1, sz = size || 1;
        for (let i = 0; i < n; i++) {
            if (this._cubes.length >= this._max) this._cubes.shift();
            const c = this.safeColor(colors[(Math.random() * colors.length) | 0] || '#ffffff');
            const col = BABYLON.Color3.FromHexString(c);
            const k = 0.75 + Math.random() * 0.35;   // разброс тона, как у пикселей текстуры
            const d = dir || BABYLON.Vector3.Zero();
            this._cubes.push({
                p: new BABYLON.Vector3(pos.x + (Math.random() - 0.5) * 30, pos.y + (Math.random() - 0.5) * 30, pos.z + (Math.random() - 0.5) * 30),
                v: new BABYLON.Vector3(d.x * 380 * pw + (Math.random() - 0.5) * 520 * pw, 260 + Math.random() * 560 * pw, d.z * 380 * pw + (Math.random() - 0.5) * 520 * pw),
                r: new BABYLON.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
                w: new BABYLON.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16),
                s: (8 + Math.random() * 12) * sz,
                c: [col.r * k, col.g * k, col.b * k],
                life: 0, ttl: (typeof GAME_DEBRIS_LIFE !== 'undefined' ? GAME_DEBRIS_LIFE : 2.6) * (0.7 + Math.random() * 0.5),
                glow: 0,
            });
        }
    },

    _updateCubes(dt) {
        const G = -1900, M = this._tmpM, list = this._cubes;
        let j = 0;
        const q = new BABYLON.Quaternion(), sc = new BABYLON.Vector3();
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            c.life += dt;
            if (c.life >= c.ttl) continue;
            c.v.y += G * dt;
            c.p.x += c.v.x * dt; c.p.y += c.v.y * dt; c.p.z += c.v.z * dt;
            const half = c.s * 0.5;
            if (c.p.y < half) {
                c.p.y = half;
                if (c.v.y < 0) c.v.y *= -0.32;
                c.v.x *= 0.6; c.v.z *= 0.6; c.w.scaleInPlace(0.5);
            }
            c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
            const fade = c.ttl - c.life;
            const k = fade < 0.4 ? fade / 0.4 : 1;
            BABYLON.Quaternion.RotationYawPitchRollToRef(c.r.y, c.r.x, c.r.z, q);
            sc.set(c.s * k, c.s * k, c.s * k);
            BABYLON.Matrix.ComposeToRef(sc, q, c.p, M);
            M.copyToArray(this._mats, j * 16);
            this._cols[j * 4] = c.c[0]; this._cols[j * 4 + 1] = c.c[1]; this._cols[j * 4 + 2] = c.c[2]; this._cols[j * 4 + 3] = 1;
            list[j] = c;
            j++;
        }
        list.length = j;
        const mesh = this.cubeMesh;
        mesh.thinInstanceCount = j;
        mesh.thinInstanceBufferUpdated('matrix');
        mesh.thinInstanceBufferUpdated('color');
    },

    // --- Текстуры-маски для вспышек -------------------------------------------------------------

    _texture(kind) {
        if (this._tex[kind]) return this._tex[kind];
        const scene = this.app.location.view.scene;
        // Художественные маски — из assets/fx; луч — процедурный градиент.
        const art = kind.indexOf('assets/') === 0 ? kind : kind === 'slash' ? 'assets/fx/swing_arc_01.webp' : kind === 'ring' ? 'assets/fx/shockwave_ring.webp' : kind === 'soft' ? 'assets/fx/flash_burst.webp' : null;
        if (art) {
            const tx = new BABYLON.Texture(art, scene, false, true, BABYLON.Texture.TRILINEAR_SAMPLINGMODE);
            tx.hasAlpha = true;
            this._tex[kind] = tx;
            return tx;
        }
        const S = 256;
        const t = new BABYLON.DynamicTexture('ocm-fx-' + kind, { width: S, height: S }, scene, true);
        t.hasAlpha = true;
        const ctx = /** @type {CanvasRenderingContext2D} */ (t.getContext());
        ctx.clearRect(0, 0, S, S);
        if (kind === 'slash') {
            // Серп разреза: яркая кромка, мягкий хвост.
            const g = ctx.createRadialGradient(S / 2, S * 0.95, S * 0.3, S / 2, S * 0.95, S * 0.75);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
            g.addColorStop(0.9, 'rgba(255,255,255,1)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(S / 2, S * 0.95, S * 0.48, S * 0.75, 0, Math.PI, 2 * Math.PI);
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            const h = ctx.createLinearGradient(0, 0, S, 0);
            h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.25, 'rgba(0,0,0,0)'); h.addColorStop(0.75, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
            ctx.fillStyle = h; ctx.fillRect(0, 0, S, S);
        } else if (kind === 'streak') {
            const gx = ctx.createLinearGradient(0, 0, S, 0);
            gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.2, 'rgba(255,255,255,0.9)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(0.8, 'rgba(255,255,255,0.9)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gx; ctx.fillRect(0, S * 0.4, S, S * 0.2);
            const gy = ctx.createLinearGradient(0, S * 0.3, 0, S * 0.7);
            gy.addColorStop(0, 'rgba(255,255,255,0)'); gy.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gy.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gy; ctx.fillRect(0, S * 0.3, S, S * 0.4);
        } else if (kind === 'ring') {
            const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.75, 'rgba(255,255,255,0.9)');
            g.addColorStop(0.9, 'rgba(255,255,255,0.5)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        } else if (kind === 'beam') {
            const g = ctx.createLinearGradient(0, 0, S, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
            g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(0.65, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        } else {
            const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
            g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        }
        t.update(true);
        this._tex[kind] = t;
        return t;
    },

    _flatMat(kind, color, alpha) {
        const scene = this.app.location.view.scene;
        const m = new BABYLON.StandardMaterial('ocm-fxm', scene);
        m.disableLighting = true;
        m.backFaceCulling = false;
        m.diffuseTexture = this._texture(kind);
        m.opacityTexture = m.diffuseTexture;
        m.emissiveColor = BABYLON.Color3.FromHexString(color || '#ffffff');
        m.alpha = alpha == null ? 1 : alpha;
        m.alphaMode = BABYLON.Engine.ALPHA_ADD;
        m.metadata = { toon: false };
        m.fogEnabled = false;
        return m;
    },

    _sprite(mesh, ttl, kind, extra) {
        mesh.isPickable = false;
        mesh.renderingGroupId = World3D.LAYER ? World3D.LAYER.OVERLAY : 1;
        const s = Object.assign({ mesh, life: 0, ttl, kind }, extra || {});
        this.sprites.push(s);
        return s;
    },

    // Пул спрайтов: shape — 'plane' | 'bill' (к камере) | 'ground'; меш единичного размера (размер — scaling),
    // материал — свободный той же текстуры. Без пула каждая вспышка, кольцо и луч создавали меш и материал.
    /** @type {Record<string, BABYLON.Mesh[]>} */
    _meshPool: {},
    /** @type {Record<string, BABYLON.StandardMaterial[]>} */
    _matPool: {},
    POOL_MAX: 48,
    _take(shape, tex, color, alpha) {
        const scene = this.app.location.view.scene;
        const free = this._meshPool[shape] || (this._meshPool[shape] = []);
        let mesh = free.pop();
        while (mesh && (mesh.isDisposed() || mesh.getScene() !== scene)) mesh = free.pop();
        if (!mesh) {
            mesh = shape === 'ground' ? BABYLON.MeshBuilder.CreateGround('ocm-fx-g', { width: 1, height: 1 }, scene)
                : BABYLON.MeshBuilder.CreatePlane('ocm-fx-p', { size: 1 }, scene);
            if (shape === 'bill') mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        }
        mesh.setEnabled(true);
        mesh.rotationQuaternion = null;
        mesh.rotation.set(0, 0, 0);
        mesh.scaling.set(1, 1, 1);
        const mats = this._matPool[tex] || (this._matPool[tex] = []);
        let mat = mats.pop();
        while (mat && mat.getScene() !== scene) mat = mats.pop();
        if (mat) {
            mat.emissiveColor.copyFrom(BABYLON.Color3.FromHexString(color || '#ffffff'));
            mat.alpha = alpha == null ? 1 : alpha;
        } else mat = this._flatMat(tex, color, alpha);
        mesh.material = mat;
        return mesh;
    },
    _give(s) {
        const m = s.mesh, mat = /** @type {BABYLON.StandardMaterial} */ (m.material);
        const free = this._meshPool[s.shape];
        if (!free || !s.tex || m.isDisposed() || free.length >= this.POOL_MAX) { if (mat) mat.dispose(); if (!m.isDisposed()) m.dispose(); return; }
        m.setEnabled(false);
        free.push(m);
        const mats = this._matPool[s.tex] || (this._matPool[s.tex] = []);
        if (mat && mats.length < this.POOL_MAX) mats.push(mat); else if (mat) mat.dispose();
    },

    // --- Эффекты ------------------------------------------------------------------------------

    // Вспышка разреза: серп вдоль линии удара (angle — рад, в плоскости экрана). look — косметика
    // «Разрезы» (GameLook.slashLook): своя текстура, цвет, размер и частицы-спутники.
    slash(pos, angle, color, size, look) {
        const L = look || null;
        const S = (size || 1) * 230 * (L && L.scale ? L.scale : 1);
        const tex = L && L.texture ? L.texture : 'slash';
        const p = this._take('plane', tex, (L && L.color) || color || '#ffffff', 1);
        p.position.copyFrom(pos);
        this._sprite(p, 0.2, 'slash', { angle, S, sx: S, sy: S * 0.55, shape: 'plane', tex });
        const fx = this.app.fx;
        if (fx) fx.play('ocm-hit', pos);
        if (fx && L && L.extra) fx.create({ position: pos, texture: L.extra, burst: 8, capacity: 10, life: [0.3, 0.6], size: [14, 26], speed: [150, 380], color: (L && L.color) || color || '#ffffff', color2: '#ffffff', spin: [-4, 4] });
    },

    // Никакого «кровавого» красного: насыщенный красный сдвигается в оранжевый (краска, а не кровь).
    safeColor(hex) {
        const c = BABYLON.Color3.FromHexString(hex || '#ffffff');
        const hsv = c.toHSV();
        if ((hsv.r < 22 || hsv.r > 335) && hsv.g > 0.35 && hsv.b > 0.25) {
            const o = BABYLON.Color3.FromHSV(32, Math.min(1, hsv.g), Math.max(0.8, hsv.b));
            return o.toHexString();
        }
        return hex;
    },

    // Краска вместо крови (все персонажи — роботы и пиньяты): брызги-кляксы цвета среза + пятна на земле.
    paint(pos, color, dir, power) {
        const fx = this.app.fx;
        const pw = power || 1;
        const col = this.safeColor(color || '#ffe066');
        const splats = ['assets/fx/splat_01.webp', 'assets/fx/splat_02.webp', 'assets/fx/splat_04.webp', 'assets/fx/splat_05.webp'];
        if (fx) {
            fx.create({ position: pos, texture: splats[(Math.random() * splats.length) | 0], burst: Math.round(5 * pw), capacity: 8, life: [0.35, 0.7], size: [26 * pw, 54 * pw], speed: [160, 420], gravity: [0, -1400, 0], color: col, color2: col, blend: 'standard', spin: [-3, 3] });
            fx.create({ position: pos, texture: 'assets/fx/drop_01.webp', burst: Math.round(10 * pw), capacity: 14, life: [0.4, 0.8], size: [8, 16], speed: [220, 520], gravity: [0, -1500, 0], color: col, color2: col, blend: 'standard' });
        }
        // Пятно краски на земле под точкой разреза (со смещением по направлению удара).
        const d = dir || BABYLON.Vector3.Zero();
        this.groundSplat(pos.x + d.x * 60 + (Math.random() - 0.5) * 50, pos.z + d.z * 60 + (Math.random() - 0.5) * 50, col, (50 + Math.random() * 50) * pw);
    },

    // Пятна-тени под мобами (когда настоящих теней мобов нет): один меш, thin instances.
    /** @type {BABYLON.Mesh | null} */
    _blobMesh: null,
    /** @type {Float32Array | null} */
    _blobBuf: null,
    BLOBS_MAX: 64,
    blobs(mobs, on) {
        const scene = this.app.location.view.scene;
        if (!on) { if (this._blobMesh && !this._blobMesh.isDisposed()) this._blobMesh.thinInstanceCount = 0; return; }
        if (!this._blobMesh || this._blobMesh.isDisposed() || this._blobMesh.getScene() !== scene) {
            const m = BABYLON.MeshBuilder.CreateGround('mob-blobs', { width: 1, height: 1 }, scene);
            const mat = new BABYLON.StandardMaterial('mob-blob-mat', scene);
            const tex = new BABYLON.Texture('assets/fx/soft_circle.webp', scene);
            tex.hasAlpha = true;
            mat.diffuseTexture = tex;
            mat.useAlphaFromDiffuseTexture = true;
            mat.disableLighting = true;            // текстура при выключенном свете — чёрная: то, что нужно
            mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            mat.alpha = 0.34;
            mat.zOffset = -2;
            mat.metadata = { toon: false };
            m.material = mat;
            m.isPickable = false;
            m.alwaysSelectAsActiveMesh = true;
            m.thinInstanceEnablePicking = false;
            this._blobBuf = new Float32Array(this.BLOBS_MAX * 16);
            m.thinInstanceSetBuffer('matrix', this._blobBuf, 16, false);
            m.thinInstanceCount = 0;
            this._blobMesh = m;
        }
        const M = this._tmpM, q = BABYLON.Quaternion.Identity(), sc = new BABYLON.Vector3(), p = new BABYLON.Vector3();
        let j = 0;
        for (const mob of mobs) {
            if (!mob.alive || j >= this.BLOBS_MAX) continue;
            const lift = Math.max(0, (mob.h || 0) + ((mob.def && mob.def.fly) || 0));
            const k = 150 * (mob.scale || 1) * Math.max(0.45, 1 - lift / 420);
            sc.set(k, 1, k * 0.8); p.set(mob.x, 1, mob.y);
            BABYLON.Matrix.ComposeToRef(sc, q, p, M);
            M.copyToArray(this._blobBuf, j * 16);
            j++;
        }
        this._blobMesh.thinInstanceCount = j;
        this._blobMesh.thinInstanceBufferUpdated('matrix');
    },

    /** @type {any[]} */
    _decals: [],
    /** @type {BABYLON.Mesh | null} */
    _decalMesh: null,
    _decalSeq: 0,
    DECALS_MAX: IS_MOBILE ? 24 : 48,
    /** @type {Float32Array | null} */
    _decalMats: null,
    /** @type {Float32Array | null} */
    _decalCols: null,
    groundSplat(x, z, color, size) {
        const scene = this.app.location.view.scene;
        if (!this._decalMesh || this._decalMesh.isDisposed() || this._decalMesh.getScene() !== scene) {
            const m = BABYLON.MeshBuilder.CreateGround('paint-decals', { width: 1, height: 1 }, scene);
            const mat = new BABYLON.StandardMaterial('paint-decal-mat', scene);
            const tex = new BABYLON.Texture('assets/fx/splat_03.webp', scene);
            tex.hasAlpha = true;
            mat.diffuseTexture = tex;
            mat.useAlphaFromDiffuseTexture = true;
            mat.specularColor = new BABYLON.Color3(0.25, 0.25, 0.25);
            mat.specularPower = 24;
            mat.zOffset = -4;
            mat.metadata = { toonGroup: 'prop' };
            m.material = mat;
            m.isPickable = false;
            m.receiveShadows = true;
            m.alwaysSelectAsActiveMesh = true;
            m.thinInstanceEnablePicking = false;
            this._decalMats = new Float32Array(this.DECALS_MAX * 16);
            this._decalCols = new Float32Array(this.DECALS_MAX * 4);
            m.thinInstanceSetBuffer('matrix', this._decalMats, 16, false);
            m.thinInstanceSetBuffer('color', this._decalCols, 4, false);
            m.thinInstanceCount = 0;
            this._decalMesh = m;
            this._decals = [];
        }
        const c = BABYLON.Color3.FromHexString(color);
        // Высота — по кругу из 48 уровней: соседние пятна не мерцают друг в друге.
        this._decals.push({ x, z, y: 1.2 + (this._decalSeq++ % 48) * 0.02, rot: Math.random() * Math.PI * 2, life: 0, size, c: [c.r, c.g, c.b] });
        while (this._decals.length > this.DECALS_MAX) this._decals.shift();
    },

    _updateDecals(dt) {
        const m = this._decalMesh;
        if (!m || m.isDisposed()) return;
        const M = this._tmpM, q = new BABYLON.Quaternion(), sc = new BABYLON.Vector3(), p = new BABYLON.Vector3();
        let j = 0;
        for (let i = 0; i < this._decals.length; i++) {
            const d = this._decals[i];
            d.life += dt;
            if (d.life > 9.5) continue;
            const grow = Math.min(1, d.life / 0.12);
            const fade = d.life > 8 ? Math.max(0, 1 - (d.life - 8) / 1.5) : 1;
            const k = Math.max(0.001, d.size * (0.4 + 0.6 * grow) * fade);
            BABYLON.Quaternion.RotationYawPitchRollToRef(d.rot, 0, 0, q);
            sc.set(k, 1, k); p.set(d.x, d.y, d.z);
            BABYLON.Matrix.ComposeToRef(sc, q, p, M);
            M.copyToArray(this._decalMats, j * 16);
            this._decalCols[j * 4] = d.c[0]; this._decalCols[j * 4 + 1] = d.c[1]; this._decalCols[j * 4 + 2] = d.c[2]; this._decalCols[j * 4 + 3] = 1;
            this._decals[j++] = d;
        }
        this._decals.length = j;
        m.thinInstanceCount = j;
        m.thinInstanceBufferUpdated('matrix');
        m.thinInstanceBufferUpdated('color');
    },

    // Яркая вспышка-полоса вдоль линии разреза (на экране — ровно по свайпу).
    cutFlash(pos, normal, angle, color) {
        const p = this._take('plane', 'streak', '#ffffff', 1);
        p.position.copyFrom(pos);
        this._sprite(p, 0.16, 'slash', { angle, S: 460, sx: 460, sy: 22, shape: 'plane', tex: 'streak' });
        const p2 = this._take('plane', 'streak', this.safeColor(color || '#ffffff'), 0.8);
        p2.position.copyFrom(pos);
        this._sprite(p2, 0.22, 'slash', { angle, S: 520, sx: 520, sy: 46, shape: 'plane', tex: 'streak' });
    },

    // Ударная волна по земле.
    ring(pos, radius, color, ttl) {
        const p = this._take('ground', 'ring', color || '#ffffff', 0.9);
        p.position.set(pos.x, 6, pos.z);
        this._sprite(p, ttl || 0.45, 'ring', { radius: radius || 220, shape: 'ground', tex: 'ring' });
    },

    // Свечение-шар (вспышка взрыва, заряд).
    flash(pos, radius, color, ttl) {
        const p = this._take('bill', 'soft', color || '#ffffff', 1);
        p.position.copyFrom(pos);
        this._sprite(p, ttl || 0.25, 'flash', { radius: radius || 160, shape: 'bill', tex: 'soft' });
    },

    // Луч: из a в b (лазер, молния-сегмент, столп света).
    beam(a, b, width, color, ttl, kind) {
        const len = BABYLON.Vector3.Distance(a, b);
        if (len < 1) return null;
        const p = this._take('plane', 'beam', color || '#ffffff', 1);
        const mid = a.add(b).scale(0.5);
        p.position.copyFrom(mid);
        return this._sprite(p, ttl || 0.2, kind || 'beam', { a: a.clone(), b: b.clone(), width: width || 30, len, shape: 'plane', tex: 'beam' });
    },

    // Молния: ломаная из нескольких лучей + вспышки на концах.
    lightning(a, b, color) {
        const N = 6;
        let prev = a.clone();
        for (let i = 1; i <= N; i++) {
            const t = i / N;
            const p = BABYLON.Vector3.Lerp(a, b, t);
            if (i < N) { p.x += (Math.random() - 0.5) * 70; p.y += (Math.random() - 0.5) * 70; p.z += (Math.random() - 0.5) * 40; }
            this.beam(prev, p, 26, color || '#fff27a', 0.18, 'bolt');
            this.beam(prev, p, 8, '#ffffff', 0.14, 'bolt');
            prev = p;
        }
        this.flash(b, 120, color || '#fff27a', 0.18);
    },

    // Столп света с неба.
    pillar(pos, color) {
        const top = new BABYLON.Vector3(pos.x, 2200, pos.z), bot = new BABYLON.Vector3(pos.x, 0, pos.z);
        this.beam(bot, top, 170, color || '#fff3a8', 0.6, 'pillar');
        this.beam(bot, top, 60, '#ffffff', 0.5, 'pillar');
        this.ring(pos, 260, color || '#fff3a8', 0.6);
        const fx = this.app.fx;
        if (fx) fx.create({ position: pos, burst: 40, capacity: 44, life: [0.5, 1.2], size: [6, 14], speed: [60, 240], color: '#fff6c0', color2: '#ffffff', gravity: [0, 300, 0], box: [[-60, 0, -60], [60, 200, 60]] });
    },

    // Взрыв: вспышка, огонь, дым, волна, блоки, тряска.
    explosion(pos, radius, colors) {
        const fx = this.app.fx;
        if (fx) fx.play('ocm-explosion', pos);
        this.ring(pos, radius || 300, '#ffb040', 0.5);
        this.flash(pos, (radius || 300) * 0.8, '#fff0b0', 0.22);
        this.cubes(pos, colors || ['#5a5a5a', '#7a4a2a', '#3a3a3a', '#db2b1e'], 22, null, 1.4, 1.1);
        if (this.app.camera) this.app.camera.shake(380, 0.035);
        if (typeof GameWorld !== 'undefined') GameWorld.kick(0.6);
    },

    // Пыль от удара о землю.
    dust(pos, power) {
        const fx = this.app.fx;
        if (fx) fx.play('ocm-dust', new BABYLON.Vector3(pos.x, 10, pos.z));
    },

    poof(pos) {
        const fx = this.app.fx;
        if (fx) fx.play('ocm-poof', pos);
    },

    coinBurst(pos) {
        const fx = this.app.fx;
        if (fx) fx.play('ocm-coin', pos);
    },

    // Искры стихии в точке.
    burst(pos, color, count, speed, size) {
        const fx = this.app.fx;
        if (!fx) return;
        fx.create({ texture: 'assets/fx/spark_streak.webp', position: pos, burst: count || 24, capacity: (count || 24) + 4, life: [0.25, 0.7], size: size || [12, 26], speed: speed || [150, 450], color: color || '#ffffff', color2: '#ffffff' });
    },

    // Длительная аура стихии на мобе (огонь, яд, лёд): возвращает handle со stop().
    aura(kind, follow) {
        const fx = this.app.fx;
        if (!fx) return null;
        const A = {
            fire: { texture: 'assets/fx/flame.webp', rate: 46, life: [0.3, 0.7], size: [18, 40], speed: [40, 110], color: '#ffb040', color2: '#ff3a10', gravity: [0, 260, 0], box: [[-40, 0, -40], [40, 150, 40]] },
            poison: { texture: 'assets/fx/bubble.webp', rate: 22, life: [0.4, 0.9], size: [10, 22], speed: [20, 60], color: '#9aff5a', color2: '#3ac81a', gravity: [0, 160, 0], box: [[-40, 20, -40], [40, 160, 40]] },
            ice: { texture: 'assets/fx/snowflake.webp', rate: 16, life: [0.4, 0.9], size: [8, 16], speed: [10, 40], color: '#dff8ff', color2: '#7fe3ff', gravity: [0, -40, 0], box: [[-50, 40, -50], [50, 170, 50]] },
            void: { texture: 'assets/fx/sparkle_4pt.webp', rate: 30, life: [0.4, 0.8], size: [10, 22], speed: [60, 160], color: '#c070ff', color2: '#4a10a0', gravity: [0, 0, 0], box: [[-70, 20, -70], [70, 180, 70]] },
            holy: { texture: 'assets/fx/sparkle_4pt.webp', rate: 24, life: [0.4, 0.8], size: [8, 16], speed: [30, 90], color: '#fff6c0', color2: '#ffffff', gravity: [0, 200, 0], box: [[-50, 0, -50], [50, 160, 50]] },
            root: { texture: 'assets/fx/leaf.webp', rate: 18, life: [0.4, 0.9], size: [12, 24], speed: [10, 40], color: '#6fd94a', color2: '#2f8a1a', gravity: [0, 40, 0], box: [[-50, 0, -50], [50, 60, 50]] },
            candy: { texture: 'assets/fx/confetti_color.webp', rate: 20, life: [0.4, 0.9], size: [8, 14], speed: [40, 120], color: '#ff7ab8', color2: '#7ad8ff', gravity: [0, -100, 0], box: [[-50, 60, -50], [50, 170, 50]] },
        }[kind];
        if (!A) return null;
        return fx.create(Object.assign({ follow, capacity: Math.round(A.rate * A.life[1]) + 6 }, A));
    },

    // След меча: лента за остриём (TrailMesh), цвет и толщина — от меча.
    trail(node, color, width) {
        const scene = this.app.location.view.scene;
        if (!BABYLON.TrailMesh) return null;
        const tr = new BABYLON.TrailMesh('ocm-trail', node, scene, width || 26, IS_MOBILE ? 18 : 30, true);
        const m = new BABYLON.StandardMaterial('ocm-trail-mat', scene);
        m.disableLighting = true;
        m.emissiveColor = BABYLON.Color3.FromHexString(color || '#ffffff');
        m.alpha = 0.32;
        m.alphaMode = BABYLON.Engine.ALPHA_ADD;
        m.backFaceCulling = false;
        m.metadata = { toon: false };
        m.fogEnabled = false;
        tr.material = m;
        tr.isPickable = false;
        tr.renderingGroupId = World3D.LAYER ? World3D.LAYER.OVERLAY : 1;
        return tr;
    },

    // Цифра урона / подпись над точкой мира.
    text(pos, str, kind) {
        if (!this.layer) return;
        const el = document.createElement('div');
        el.className = 'ocm-dmg ocm-dmg-' + (kind || 'hit');
        el.textContent = str;
        this.layer.appendChild(el);
        this.texts.push({ el, p: pos.clone(), life: 0, ttl: kind === 'crit' || kind === 'big' ? 1.1 : 0.8, vx: (Math.random() - 0.5) * 60 });
        while (this.texts.length > 30) { const t = this.texts.shift(); t.el.remove(); }
    },

    placeTexts() {
        if (!this.app || !this.app.location) return;
        const view = this.app.location.view;
        for (const t of this.texts) {
            const s = view.projectToScreen(t.p.x, t.p.z, t.p.y + t.life * 160);
            const k = t.life / t.ttl;
            const sc = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
            t.el.style.transform = 'translate(' + (s.x + t.vx * k).toFixed(1) + 'px,' + s.y.toFixed(1) + 'px) translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
            t.el.style.opacity = String(k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1);
            t.el.style.display = s.visible === false || s.behind ? 'none' : '';
        }
    },

    // --- Кадр ---------------------------------------------------------------------------------

    update(dt) {
        if (!this.app || !this.cubeMesh) return;
        this._updateCubes(dt);
        const cam = this.app.location.view.camera;
        const camQ = cam.absoluteRotation || BABYLON.Quaternion.Identity();
        for (let i = this.sprites.length - 1; i >= 0; i--) {
            const s = this.sprites[i];
            s.life += dt;
            const k = Math.min(1, s.life / s.ttl);
            const m = s.mesh;
            const mat = /** @type {BABYLON.StandardMaterial} */ (m.material);
            if (s.kind === 'slash') {
                // Лицом к камере, поворот по направлению удара, вспухает и тает.
                m.rotationQuaternion = camQ.multiply(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, s.angle));
                const g = 0.8 + k * 0.5;
                m.scaling.set(g * (s.sx || 1), g * (s.sy || 1), 1);
                mat.alpha = 1 - k * k;
            } else if (s.kind === 'ring') {
                const r = s.radius * (0.2 + 0.8 * Math.sqrt(k)) * 2;
                m.scaling.set(r, 1, r);
                mat.alpha = 0.9 * (1 - k);
            } else if (s.kind === 'flash') {
                const r = s.radius * (0.6 + 0.6 * k) * 2;
                m.scaling.set(r, r, r);
                mat.alpha = 1 - k;
            } else {
                // Луч: плоскость между a и b, развёрнута к камере вокруг своей оси.
                const dir = s.b.subtract(s.a);
                const len = dir.length();
                dir.scaleInPlace(1 / Math.max(1e-6, len));
                const mid = s.a.add(s.b).scale(0.5);
                m.position.copyFrom(mid);
                const toCam = cam.position.subtract(mid).normalize();
                const right = BABYLON.Vector3.Cross(dir, toCam).normalize();
                const fwd = BABYLON.Vector3.Cross(right, dir).normalize();
                m.rotationQuaternion = BABYLON.Quaternion.RotationQuaternionFromAxis(right, dir, fwd);
                const w = s.width * (s.kind === 'pillar' ? (1 - k * 0.6) : (1 - k * 0.5));
                m.scaling.set(w, len, 1);
                mat.alpha = s.kind === 'bolt' ? (Math.random() < 0.3 ? 0.3 : 1) * (1 - k) : 1 - k;
            }
            if (s.life >= s.ttl) {
                this._give(s);
                this.sprites.splice(i, 1);
            }
        }
        this._updateDecals(dt);
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.life += dt;
            if (t.life >= t.ttl) { t.el.remove(); this.texts.splice(i, 1); }
        }
    },

    clear() {
        this._cubes.length = 0;
        if (this.cubeMesh) { this.cubeMesh.thinInstanceCount = 0; }
        for (const s of this.sprites) this._give(s);
        this.sprites = [];
        for (const t of this.texts) t.el.remove();
        this.texts = [];
        this._decals = [];
        if (this._decalMesh && !this._decalMesh.isDisposed()) this._decalMesh.thinInstanceCount = 0;
    },
};
