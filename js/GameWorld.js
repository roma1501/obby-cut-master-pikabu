// GameWorld.js — окружение уровня Obby Cut Master: свет биома и времени суток, небо-купол
// (градиент, звёзды ночью), облака, атмосферные частицы, свечение и камера за спиной игрока.
// Это ВИД: игровые решения тут не принимаются (инвариант 4).

/** @satisfies {Record<string, any>} */
const GameWorld = {
    /** @type {LoryApp | null} */
    app: null,
    /** @type {BABYLON.Mesh | null} */
    dome: null,
    /** @type {BABYLON.DynamicTexture | null} */
    domeTex: null,
    /** @type {BABYLON.GlowLayer | null} */
    glow: null,
    /** @type {any[]} */
    clouds: [],
    /** @type {any[]} */
    cloudMeshes: [],      // по мешу на модель облака, облака — thin instances (3 отрисовки вместо 12)
    /** @type {any} */
    weather: null,
    biome: null,
    time: 'day',
    // Камера: точка игрока, тряска-толчок, плавный «удар» зума.
    cam: { x: 2400, y: 5800, kick: 0, sway: 0, menu: 0, mode: 'menu', modeT: 0 },
    _lookH: 0,
    /** @type {any} */
    _cur: null,
    _snap: true,
    _sky: 0x8ec8f6,

    init(app) {
        this.app = app;
        const cam = app.camera;
        // Своя камера: ввод камеры игре не нужен (тап — бросок меча), свободный режим без пределов края.
        cam.detach();
        cam.setFree(true);
        // Высота точки взгляда — своя (в свободном режиме камера смотрит в землю под целью).
        const ctl = /** @type {any} */ (cam);
        ctl._targetHeight = () => this._lookH || 0;
        ctl._clampPitch = (p) => Math.max(-0.6, Math.min(1.4, p));   // взгляд вдоль дорожки почти горизонтально
        const scene = app.location.view.scene;
        if (this._cfg('GAME_GLOW', 1) > 0 && BABYLON.GlowLayer) {
            this.glow = new BABYLON.GlowLayer('ocm-glow', scene, { mainTextureRatio: IS_MOBILE ? 0.35 : 0.5, blurKernelSize: IS_MOBILE ? 24 : 40 });
            this.glow.intensity = 0.85;
            // Светятся только явно добавленные меши (мечи, эффекты), а не весь мир.
            this.glow.addIncludedOnlyMesh(new BABYLON.Mesh('ocm-glow-seed', scene));
        }
        app.onFrame(dt => this.frame(dt));
    },

    _cfg(name, def) {
        const v = /** @type {any} */ (globalThis)[name];
        // Константы — лексические const: читаем через typeof по имени.
        switch (name) {
            case 'GAME_GLOW': return typeof GAME_GLOW !== 'undefined' ? GAME_GLOW : def;
            case 'GAME_CAM_BACK': return typeof GAME_CAM_BACK !== 'undefined' ? GAME_CAM_BACK : def;
            case 'GAME_CAM_HEIGHT': return typeof GAME_CAM_HEIGHT !== 'undefined' ? GAME_CAM_HEIGHT : def;
            case 'GAME_CAM_LOOK': return typeof GAME_CAM_LOOK !== 'undefined' ? GAME_CAM_LOOK : def;
            case 'GAME_CAM_LOOK_H': return typeof GAME_CAM_LOOK_H !== 'undefined' ? GAME_CAM_LOOK_H : def;
            case 'GAME_CAM_PORTRAIT_BACK': return typeof GAME_CAM_PORTRAIT_BACK !== 'undefined' ? GAME_CAM_PORTRAIT_BACK : def;
            case 'GAME_CAM_PORTRAIT_HEIGHT': return typeof GAME_CAM_PORTRAIT_HEIGHT !== 'undefined' ? GAME_CAM_PORTRAIT_HEIGHT : def;
            default: return v !== undefined ? v : def;
        }
    },

    // Меш светится (GlowLayer). Без свечения — ничего.
    addGlow(mesh) {
        if (!this.glow || !mesh) return;
        for (const m of [mesh].concat(mesh.getChildMeshes ? mesh.getChildMeshes(false) : [])) this.glow.addIncludedOnlyMesh(/** @type {BABYLON.Mesh} */ (m));
    },
    removeGlow(mesh) {
        if (!this.glow || !mesh) return;
        for (const m of [mesh].concat(mesh.getChildMeshes ? mesh.getChildMeshes(false) : [])) this.glow.removeIncludedOnlyMesh(/** @type {BABYLON.Mesh} */ (m));
    },

    // --- Уровень ------------------------------------------------------------------------------

    // Под экраном загрузки: свет, небо, облака, погода нового биома. Повторяемо.
    async setup(level) {
        const app = this.app;
        const biome = GameData.BIOMES.find(b => b.id === level.biome) || GameData.BIOMES[0];
        this.biome = biome;
        this.time = level.time || 'day';
        const p = app.location.marker('player');
        this.cam.x = p ? p.x : 2400;
        this.cam.y = p ? p.y : 5800;
        this.applyLight(biome, this.time);
        this.buildDome(biome, this.time);
        await this.buildClouds(biome);
        this.startWeather(biome, this.time);
    },

    // Свет биома × время суток -> World3D.setLighting.
    applyLight(biome, time) {
        const L = biome.light, T = GameData.TIMES[time] || GameData.TIMES.day;
        const mix = (a, b, t) => {
            const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
            const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
            return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
        };
        const scale = (c, k) => mix(0, c, k);
        const tint = T.tint != null ? T.tint : null;
        const tk = time === 'night' ? 0.55 : time === 'sunset' ? 0.45 : 0;
        let sky = scale(L.sky, T.sky);
        if (tint != null) sky = mix(sky, tint, tk * 0.5);
        this._sky = sky;
        World3D.setLighting({
            sky,
            fog: L.fog * (time === 'night' ? 1.35 : 1),
            sunColor: tint != null ? mix(L.sunColor, tint, tk) : L.sunColor,
            sunIntensity: L.sunIntensity * T.sun,
            skyIntensity: L.skyIntensity * T.ambient,
            skyLight: tint != null ? mix(L.skyLight, tint, tk * 0.6) : L.skyLight,
            groundLight: L.groundLight,
            shadowColor: L.shadowColor,
        }, app_view(this.app));
    },

    // Небо: сфера на бесконечности с градиентом от горизонта (= цвет тумана) к зениту.
    buildDome(biome, time) {
        const scene = this.app.location.view.scene;
        if (!this.dome) {
            const dome = BABYLON.MeshBuilder.CreateSphere('ocm-sky', { diameter: 14000, segments: 24, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
            dome.infiniteDistance = true;
            dome.isPickable = false;
            dome.applyFog = false;
            const mat = new BABYLON.StandardMaterial('ocm-sky-mat', scene);
            mat.disableLighting = true;
            mat.backFaceCulling = false;
            mat.fogEnabled = false;
            mat.metadata = { toon: false };
            const tex = new BABYLON.DynamicTexture('ocm-sky-tex', { width: 512, height: 512 }, scene, false);
            tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
            mat.emissiveTexture = tex;
            mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
            mat.emissiveColor = new BABYLON.Color3(0, 0, 0);
            dome.material = mat;
            dome.renderingGroupId = 0;
            this.dome = dome;
            this.domeTex = tex;
        }
        const tex = this.domeTex, ctx = /** @type {CanvasRenderingContext2D} */ (tex.getContext());
        const W = 512, H = 512;
        const hex = (c) => '#' + c.toString(16).padStart(6, '0');
        const horizon = hex(this._sky);
        const zenith = this._zenith(biome, time);
        // UV сферы: v=0 вверху (зенит), 0.5 — горизонт, ниже — то же, что горизонт (под землёй).
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, zenith);
        g.addColorStop(0.32, zenith);
        g.addColorStop(0.5, horizon);
        g.addColorStop(1, horizon);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const R = GameData.rng(biome.id.length * 977 + (time === 'night' ? 5 : 1));
        if (time === 'night' || biome.id === 'end') {
            // Квадратные звёзды в духе Minecraft.
            for (let i = 0; i < 260; i++) {
                const x = R() * W, y = R() * H * 0.44, s = R() < 0.15 ? 3 : 2;
                ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + R() * 0.55).toFixed(2) + ')';
                ctx.fillRect(Math.round(x), Math.round(y), s, s);
            }
        }
        if (biome.id === 'nether') {
            // Красная дымка и пепел в небе незера.
            for (let i = 0; i < 90; i++) {
                ctx.fillStyle = 'rgba(255,' + Math.round(80 + R() * 80) + ',40,' + (0.08 + R() * 0.15).toFixed(2) + ')';
                ctx.fillRect(R() * W, H * 0.2 + R() * H * 0.3, 2 + R() * 6, 2 + R() * 6);
            }
        }
        tex.update(false);
    },

    _zenith(biome, time) {
        const z = {
            plains: 0x3f7fe0, desert: 0x5a9ee8, birch: 0x4a8fd8, taiga: 0x6d97c8, jungle: 0x3d8fb8,
            mushroom: 0x8a5ad0, badlands: 0x4a7ad0, nether: 0x2a0606, end: 0x07040f, sky: 0x2f8ff0,
        }[biome.id] || 0x3f7fe0;
        const c = time === 'night' ? 0x050a1e : time === 'sunset' ? 0x3a3a8a : z;
        return '#' + c.toString(16).padStart(6, '0');
    },

    // Облака: модели Blender (assets/models/world/cloud_N.glb), медленно плывут по небу.
    async buildClouds(biome) {
        for (const g of this.cloudMeshes) Model3D.dispose(this.app.location.view, g.root);
        this.cloudMeshes = [];
        this.clouds = [];
        if (biome.id === 'nether') return;            // в незере неба с облаками нет
        const urls = ['assets/models/world/cloud_1.glb', 'assets/models/world/cloud_2.glb', 'assets/models/world/cloud_3.glb'];
        const models = [];
        for (const u of urls) { try { models.push(await Model3D.load(u)); } catch (e) { /* нет модели — без облаков */ } }
        if (!models.length) return;
        const view = this.app.location.view;
        const R = GameData.rng(biome.id.length * 31 + 7);
        const n = IS_MOBILE ? 7 : 12;
        /** @type {any[][]} */
        const groups = models.map(() => []);
        for (let i = 0; i < n; i++) {
            const k = i % models.length;
            const s = 1.1 + R() * 1.1;
            const x = this.cam.x - 5200 + R() * 10400, y = this.cam.y - 7600 + R() * 3200;
            const h = 1500 + R() * 700;
            const c = { x, y, h, s, rot: Math.floor(R() * 4) * Math.PI / 2, speed: 14 + R() * 18 };
            groups[k].push(c);
            this.clouds.push(c);
        }
        // Модель облака — один меш, облака — его thin instances (части модели запечены в её координатах).
        models.forEach((model, k) => {
            if (!groups[k].length) return;
            const root = Model3D.build(model, view.scene, { name: 'cloud' });
            if (!root) return;
            const parts = /** @type {BABYLON.Mesh[]} */ (root.getChildMeshes(false));
            const buf = new Float32Array(groups[k].length * 16);
            for (const m of parts) {
                m.isPickable = false; m.applyFog = false;
                m.alwaysSelectAsActiveMesh = true;
                m.thinInstanceEnablePicking = false;
                m.thinInstanceSetBuffer('matrix', buf, 16, false);
                // Облака светлые и снизу (не серые плиты): самосвечение.
                const mt = /** @type {any} */ (m.material);
                if (mt && mt.emissiveColor && !mt.metadata?.cloudLit) { mt.emissiveColor = new BABYLON.Color3(0.55, 0.55, 0.58); mt.metadata = Object.assign({}, mt.metadata, { cloudLit: true }); }
            }
            World3D.addObject(view, root, 'prop', { castShadow: false, receiveShadows: false, ink: false, outline: false });
            this.cloudMeshes.push({ root, parts, buf, list: groups[k] });
        });
        this._placeClouds();
    },

    _placeClouds() {
        const M = new BABYLON.Matrix(), q = new BABYLON.Quaternion(), sc = new BABYLON.Vector3(), p = new BABYLON.Vector3();
        for (const g of this.cloudMeshes) {
            g.list.forEach((c, i) => {
                BABYLON.Quaternion.RotationYawPitchRollToRef(c.rot, 0, 0, q);
                sc.set(c.s, c.s * 0.5, c.s); p.set(c.x, c.h, c.y);
                BABYLON.Matrix.ComposeToRef(sc, q, p, M);
                M.copyToArray(g.buf, i * 16);
            });
            for (const m of g.parts) if (!m.isDisposed()) m.thinInstanceBufferUpdated('matrix');
        }
    },

    // Атмосферные частицы биома вокруг точки взгляда.
    startWeather(biome, time) {
        if (this.weather) { this.weather.dispose(); this.weather = null; }
        const fx = this.app.fx;
        if (!fx) return;
        const W = {
            pollen: { texture: 'assets/fx/circle_soft.webp', rate: 18, life: [4, 7], size: [3, 6], speed: [6, 18], color: '#fff6a0', color2: '#ffffff', alpha: 0.75, gravity: [0, 2, 0], blend: 'additive' },
            sand: { texture: 'assets/fx/dust_puff.webp', rate: 40, life: [2, 4], size: [3, 7], speed: [80, 160], color: '#f1d79a', color2: '#e0b870', alpha: 0.55, gravity: [0, -4, 0], direction: [[0.8, -0.1, -0.2], [1, 0.1, 0.2]], blend: 'standard' },
            leaves: { texture: 'assets/fx/leaf.webp', rate: 14, life: [5, 8], size: [8, 14], speed: [10, 30], color: '#b8e070', color2: '#f0c040', alpha: 0.9, gravity: [0, -25, 0], spin: [-2, 2], blend: 'standard' },
            snow: { texture: 'assets/fx/snowflake.webp', rate: 90, life: [5, 9], size: [5, 10], speed: [10, 30], color: '#ffffff', color2: '#dff2ff', alpha: 0.95, gravity: [0, -60, 0], blend: 'standard' },
            fireflies: { texture: 'assets/fx/soft_circle.webp', rate: 16, life: [3, 6], size: [6, 10], speed: [8, 20], color: '#e8ff70', color2: '#90ff60', alpha: 1, gravity: [0, 3, 0], blend: 'additive' },
            spores: { texture: 'assets/fx/sparkle_4pt.webp', rate: 26, life: [5, 9], size: [4, 8], speed: [5, 14], color: '#e0b0ff', color2: '#ffd0f0', alpha: 0.8, gravity: [0, 8, 0], blend: 'additive' },
            embers: { texture: 'assets/fx/spark_streak.webp', rate: 40, life: [3, 6], size: [4, 9], speed: [20, 60], color: '#ffb040', color2: '#ff4a10', alpha: 1, gravity: [0, 40, 0], blend: 'additive' },
            endmotes: { texture: 'assets/fx/square.webp', rate: 30, life: [4, 8], size: [4, 9], speed: [6, 18], color: '#c080ff', color2: '#6040ff', alpha: 0.9, gravity: [0, 12, 0], blend: 'additive' },
            sparkle: { texture: 'assets/fx/sparkle_4pt.webp', rate: 26, life: [2, 4], size: [4, 9], speed: [4, 12], color: '#fff2a0', color2: '#ffffff', alpha: 1, gravity: [0, 2, 0], blend: 'additive' },
        }[biome.weather];
        if (!W) return;
        const scale = IS_MOBILE ? 0.6 : 1;
        const self = this;
        this.weather = fx.create(Object.assign({
            follow: () => ({ x: self.cam.x, y: 700, z: self.cam.y - 1300 }),
            box: [[-1600, -500, -1700], [1600, 900, 1500]],
            capacity: Math.round(W.rate * W.life[1] * scale) + 10,
        }, W, { rate: W.rate * scale * (time === 'night' && biome.weather === 'fireflies' ? 1.6 : 1) }));
    },

    // --- Кадр ---------------------------------------------------------------------------------

    frame(dt) {
        if (!this.app || !this.app.location) return;
        const paused = Pause.active;
        if (!paused) {
            for (const c of this.clouds) {
                c.x += c.speed * dt;
                if (c.x > this.cam.x + 5200) c.x -= 10400;
            }
            if (this.clouds.length) this._placeClouds();
            this.cam.kick *= Math.pow(0.02, dt);
            this.cam.sway += dt;
        }
        this.placeCamera(Math.min(0.1, dt));
    },

    // Толчок камеры вперёд (удар, взрыв): 0..1.
    kick(amount) { this.cam.kick = Math.min(1, this.cam.kick + amount); },

    // Режим камеры: 'menu' (герой спереди-сбоку) | 'intro' (заход сверху к бою) | 'play' (за спиной) |
    // 'win' (облёт героя) | 'lose' (отъезд). snap — без перехода (под экраном загрузки).
    mode(name, snap) {
        this.cam.mode = name;
        this.cam.modeT = 0;
        if (snap) this._snap = true;
    },

    // Точки камеры для режима (вид от первого лица, героя нет): глаз и цель (x, y — карта, h — высота).
    _shot(mode, t) {
        const eyeH = this._cfg('GAME_CAM_HEIGHT', 165), back = this._cfg('GAME_CAM_BACK', 0);
        const look = this._cfg('GAME_CAM_LOOK', 1200), lookH = this._cfg('GAME_CAM_LOOK_H', 110);
        const x = this.cam.x, y = this.cam.y;
        const play = { ex: x, ey: y + back, eh: eyeH, tx: x, ty: y - look, th: lookH };
        if (mode === 'play') return play;
        if (mode === 'intro') {
            // Наезд: от входа на дорожку — к позиции боя.
            const k = Math.min(1, t / 1.2), e = 1 - Math.pow(1 - k, 3);
            return this._mix({ ex: x, ey: y + 620, eh: eyeH + 260, tx: x, ty: y - look * 0.8, th: 40 }, play, e);
        }
        if (mode === 'win') {
            // Победа: медленный наезд и взгляд чуть вверх — к салюту.
            const k = Math.min(1, t / 2.5);
            return { ex: x, ey: y - 160 * k, eh: eyeH + 30 * k, tx: x, ty: y - look, th: lookH + 260 * k };
        }
        if (mode === 'lose') {
            const k = Math.min(1, t / 1.2);
            return { ex: x + 30 * k, ey: y + 80 * k, eh: eyeH - 90 * k, tx: x + 120 * k, ty: y - look, th: lookH - 60 * k };
        }
        // Меню: та же дорожка, лёгкое покачивание.
        const sw = Math.sin(this.cam.sway * 0.35) * 18;
        return { ex: x + sw, ey: y + 120, eh: eyeH + 40, tx: x + sw * 0.4, ty: y - look, th: lookH + 30 };
    },

    _mix(p, q, k) {
        return { ex: p.ex + (q.ex - p.ex) * k, ey: p.ey + (q.ey - p.ey) * k, eh: p.eh + (q.eh - p.eh) * k, tx: p.tx + (q.tx - p.tx) * k, ty: p.ty + (q.ty - p.ty) * k, th: p.th + (q.th - p.th) * k };
    },

    // Камера: к кадру режима — плавно (или сразу после смены уровня), плюс толчок удара.
    placeCamera(dt) {
        const app = this.app, cam = app.camera;
        const cv = app.location.view.world.canvas;
        const H = (cv && cv.clientHeight) || 600;
        const c = this.cam;
        c.modeT = (c.modeT || 0) + (dt || 0);
        const want = this._shot(c.mode || 'menu', c.modeT);
        if (!this._cur || this._snap) { this._cur = Object.assign({}, want); this._snap = false; }
        const k = c.mode === 'intro' ? 1 : 1 - Math.exp(-(dt || 0) * 3.2);
        this._cur = this._mix(this._cur, want, k);
        const s = this._cur, kick = c.kick;
        const ex = s.ex, ey = s.ey + kick * 40, eh = s.eh - kick * 10;
        const dh = Math.hypot(s.tx - ex, s.ty - ey), dv = eh - s.th;
        const dist = Math.max(60, Math.hypot(dh, dv));
        cam.target.x = s.tx; cam.target.y = s.ty;
        this._lookH = s.th;
        cam.azimuth = Math.atan2(s.ty - ey, s.tx - ex);
        cam.pitch = Math.atan2(dv, dh);
        // Портрет: шире угол обзора, чтобы дорожка влезала по ширине.
        const W = (cv && cv.clientWidth) || 800;
        const a = W / Math.max(1, H);
        const fovDeg = a >= 1.2 ? 55 : a <= 0.6 ? 74 : 74 - (a - 0.6) / 0.6 * 19;
        cam.cam.fov = fovDeg * Math.PI / 180;
        const z = H / (2 * Math.tan(cam.cam.fov / 2) * dist);
        cam.zoom = cam.zoomTarget = z;
    },

    dispose() {
        if (this.weather) { this.weather.dispose(); this.weather = null; }
    },
};

// Вид текущей локации (setLighting без вида берёт World3D.view — он тот же; явно — для читаемости).
function app_view(app) { return app && app.location ? app.location.view : undefined; }
