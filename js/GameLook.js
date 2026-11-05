// GameLook.js — косметика Obby Cut Master (вид от первого лица, героя нет): что надето в магазине
// (Shop.look(): trails, slashes, kills, auras, wins) — то и видно в бою: след клинка (цвет, пульс,
// радуга, частицы), вспышка разреза, эффект разлёта врага, сияние вокруг меча, салют победы.
// Иконки карточек рисуются на холсте теми же цветами и текстурами, что эффекты в игре.

/** @satisfies {Record<string, any>} */
const GameLook = {
    /** @type {LoryApp | null} */
    app: null,
    /** @type {Record<string, any>} */
    cur: { trails: null, slashes: null, kills: null, auras: null, wins: null },
    /** @type {Record<string, string>} */
    _icons: {},
    /** @type {any} */
    _trailFx: null,
    _t: 0,

    async init(app) {
        this.app = app;
        app.onFrame(dt => this.frame(dt));
    },

    item(id) { return id ? GameShopData.ITEMS.find(i => i.id === id) || null : null; },

    // Надеть образ: look = { trails, slashes, kills, auras, wins } -> id предметов.
    apply(look) {
        const L = look || {};
        for (const k of ['trails', 'slashes', 'kills', 'auras', 'wins']) this.cur[k] = this.item(L[k]);
        if (typeof GameSword !== 'undefined' && GameSword.mesh) GameSword.applyCosmetics();
    },

    // Примерка в магазине: сразу видно на мече в меню (следы и сияние), остальное — превью-эффектом.
    preview(item) {
        if (!item) return;
        Shop.preview(item.id);
        this.apply(Shop.look());
        this.demo(item);
    },

    // --- Что берут меч и эффекты ---------------------------------------------------------------

    swordLook() {
        const t = this.cur.trails && this.cur.trails.trail;
        const a = this.cur.auras && this.cur.auras.aura;
        return {
            trail: t || null,
            trailColor: t && t.mode !== 'sword' && t.mode !== 'rainbow' ? t.color : null,
            trailWidth: t ? (t.width || 0) : 0,
            aura: a || null,
        };
    },

    slashLook() {
        const s = this.cur.slashes && this.cur.slashes.slash;
        if (!s) return null;
        return { texture: s.texture, color: s.color || null, scale: s.scale || 1, extra: s.extra || null };
    },

    makeAura(a, follow) {
        const fx = this.app.fx;
        if (!fx || !a) return null;
        const base = { follow, texture: a.texture, color: a.color, color2: a.color2, blend: /smoke|cloud/.test(a.texture) ? 'standard' : 'additive', capacity: 50 };
        let o;
        if (a.mode === 'fall') o = { rate: 14, life: [0.8, 1.4], size: [8, 16], speed: [10, 30], gravity: [0, -90, 0], box: [[-30, 10, -30], [30, 50, 30]], spin: [-2, 2] };
        else if (a.mode === 'rise') o = { rate: 14, life: [0.7, 1.3], size: [8, 18], speed: [10, 40], gravity: [0, 90, 0], box: [[-25, -20, -25], [25, 20, 25]], spin: [-1, 1] };
        else o = { rate: 18, life: [0.5, 1], size: [8, 16], speed: [20, 60], gravity: [0, 10, 0], box: [[-35, -35, -35], [35, 35, 35]], spin: [-3, 3] };
        return fx.create(Object.assign(base, o));
    },

    // Разлёт врага (поверх блоков-осколков).
    killEffect(pos, mob) {
        const k = this.cur.kills && this.cur.kills.kill;
        const fx = this.app && this.app.fx;
        if (!k || !fx || k.kind === 'blocks') return;
        const p = pos.clone();
        const n = Math.round((k.count || 20) * (IS_MOBILE ? 0.6 : 1));
        const base = { position: p, texture: k.texture, color: k.color || '#ffffff', color2: '#ffffff' };
        if (k.kind === 'burst') fx.create(Object.assign(base, { burst: n, capacity: n + 4, life: [0.5, 1.1], size: [14, 30], speed: [250, 650], gravity: [0, -500, 0], spin: [-4, 4] }));
        else if (k.kind === 'puff') fx.create(Object.assign(base, { burst: n, capacity: n + 4, life: [0.6, 1.3], size: [60, 120], speed: [60, 200], gravity: [0, 60, 0], blend: 'standard', alpha: 0.75 }));
        else if (k.kind === 'rise') fx.create(Object.assign(base, { burst: n, capacity: n + 4, life: [0.8, 1.6], size: [16, 32], speed: [60, 180], gravity: [0, 260, 0], spin: [-1, 1] }));
        else if (k.kind === 'soul') fx.create(Object.assign(base, { burst: n, capacity: n + 4, life: [1, 1.8], size: [50, 90], speed: [20, 60], gravity: [0, 380, 0], blend: 'standard', alpha: 0.7 }));
        else if (k.kind === 'fountain') fx.create(Object.assign(base, { burst: n, capacity: n + 4, life: [0.8, 1.4], size: [18, 30], speed: [400, 750], gravity: [0, -1500, 0], direction: [[-0.4, 1, -0.4], [0.4, 1, 0.4]], spin: [-6, 6] }));
        else if (k.kind === 'splat') fx.create(Object.assign(base, { burst: n, capacity: n + 4, life: [0.4, 0.9], size: [60, 120], speed: [80, 260], gravity: [0, -300, 0], blend: 'standard' }));
        else if (k.kind === 'blast') fx.create(Object.assign(base, { burst: n, capacity: n + 4, life: [0.5, 0.7], size: [180, 300], speed: [20, 140], sheet: { width: 256, height: 256, start: 0, end: 15, speed: 1.6 } }));
    },

    // Салют победы — перед камерой, в небе над дорожкой.
    winEffect() {
        const w = this.cur.wins && this.cur.wins.win;
        const fx = this.app && this.app.fx;
        if (!w || !fx) return;
        const cam = this.app.location.view.camera;
        const fwd = cam.getForwardRay(1).direction, right = cam.getDirection(BABYLON.Axis.X);
        const C = cam.globalPosition || cam.position;
        const center = C.add(fwd.scale(1100));
        const colors = w.colors || ['#ffffff'];
        if (w.kind === 'rain') {
            fx.create({ follow: () => center.add(new BABYLON.Vector3(0, 700, 0)), texture: w.texture, color: colors[0], color2: colors[colors.length - 1], rate: IS_MOBILE ? 40 : 70, duration: 3.2, capacity: 260, life: [1.8, 2.8], size: [22, 40], speed: [20, 80], gravity: [0, -420, 0], box: [[-900, 0, -300], [900, 200, 300]], spin: [-3, 3] });
            return;
        }
        if (w.kind === 'storm') {
            for (let i = 0; i < 5; i++) setTimeout(() => {
                const p = center.add(right.scale((Math.random() - 0.5) * 1400));
                GameFX.lightning(new BABYLON.Vector3(p.x, 1600, p.z), new BABYLON.Vector3(p.x + 80, 200, p.z), colors[i % colors.length]);
                GameAudio.play('lightning', { volume: 0.5 });
            }, i * 380);
            return;
        }
        // Фейерверк: ракета вверх, вспышка, шар искр.
        const shots = w.big ? 9 : 6;
        for (let i = 0; i < shots; i++) setTimeout(() => {
            if (Game.state !== 'win') return;
            const p = center.add(right.scale((Math.random() - 0.5) * 1500)).add(fwd.scale((Math.random() - 0.5) * 400));
            const top = new BABYLON.Vector3(p.x, 650 + Math.random() * 400, p.z);
            const col = colors[(Math.random() * colors.length) | 0];
            fx.create({ position: new BABYLON.Vector3(p.x, 50, p.z), texture: 'assets/fx/spark_streak.webp', burst: 12, capacity: 14, life: [0.3, 0.5], size: [10, 18], speed: [40, 90], color: '#ffe8a0', direction: [[-0.1, 1, -0.1], [0.1, 1, 0.1]] });
            setTimeout(() => {
                fx.create({ position: top, texture: w.texture || 'assets/fx/sparkle_4pt.webp', burst: w.big ? 70 : 46, capacity: 80, life: [0.9, 1.6], size: [16, 30], speed: [260, 520], color: col, color2: '#ffffff', gravity: [0, -260, 0] });
                GameFX.flash(top, 220, col, 0.25);
                GameAudio.play('boom', { volume: 0.35 });
            }, 420);
        }, i * 330);
    },

    // Превью эффекта в меню магазина: разлёт/разрез/салют — показать один раз перед камерой.
    demo(item) {
        if (!this.app || !this.app.location || !item) return;
        const cam = this.app.location.view.camera;
        const C = cam.globalPosition || cam.position;
        const p = C.add(cam.getForwardRay(1).direction.scale(520)).add(new BABYLON.Vector3(0, 20, 0));
        if (item.tab === 'kills') { GameFX.cubes(p, GameChars.palette('noob'), 14, null, 0.8, 0.8); this.killEffect(p, null); }
        if (item.tab === 'slashes') GameFX.slash(p, 0.5, (item.slash && item.slash.color) || '#ffffff', 1.1, this.slashLook());
        if (item.tab === 'wins') { const st = Game.state; Game.state = 'win'; this.winEffect(); setTimeout(() => { if (Game.state === 'win') Game.state = st; }, 3500); }
    },

    // Радужный / пульсирующий / неоновый / огненный след — цвет меняется каждый кадр.
    frame(dt) {
        this._t += dt;
        const tr = typeof GameSword !== 'undefined' ? GameSword.trail : null;
        const t = this.cur.trails && this.cur.trails.trail;
        if (!tr || !tr.material || !t) return;
        const m = /** @type {BABYLON.StandardMaterial} */ (tr.material);
        if (t.mode === 'rainbow') {
            const c = BABYLON.Color3.FromHSV((this._t * 160) % 360, 0.75, 1);
            m.emissiveColor.copyFrom(c);
        } else if (t.mode === 'pulse' || t.mode === 'neon' || t.mode === 'fire') {
            const k = 0.5 + 0.5 * Math.sin(this._t * (t.mode === 'fire' ? 14 : t.mode === 'neon' ? 9 : 5));
            const a = BABYLON.Color3.FromHexString(t.color || '#ffffff'), b = BABYLON.Color3.FromHexString(t.color2 || t.color || '#ffffff');
            m.emissiveColor.copyFrom(BABYLON.Color3.Lerp(a, b, k));
        }
        // Частицы следа — за остриём, только пока меч движется быстро.
        const fx = this.app.fx;
        const sw = GameSword;
        if (fx && t.particles && sw.tip && sw.speed > 900 && !Pause.active) {
            this._pt = (this._pt || 0) + dt;
            if (this._pt > 0.035) {
                this._pt = 0;
                fx.create({ position: sw.tip.getAbsolutePosition().clone(), texture: t.particles, burst: 2, capacity: 3, life: [0.25, 0.5], size: [8, 16], speed: [10, 60], color: t.color || '#ffffff', color2: t.color2 || '#ffffff', spin: [-3, 3] });
            }
        }
    },

    // --- Иконки карточек магазина -------------------------------------------------------------

    icon(item) {
        if (!item) return '';
        if (this._icons[item.id]) return this._icons[item.id];
        const c = document.createElement('canvas');
        c.width = c.height = 192;
        const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
        const bg = ctx.createRadialGradient(96, 96, 8, 96, 96, 96);
        bg.addColorStop(0, '#3a2f5a'); bg.addColorStop(1, '#1b1530');
        ctx.fillStyle = bg;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(8, 8, 176, 176, 28); else ctx.rect(8, 8, 176, 176); ctx.fill();
        const finish = () => { const url = c.toDataURL('image/png'); this._icons[item.id] = url; return url; };
        const col = (x) => x || '#ffffff';
        if (item.tab === 'trails') {
            const t = item.trail || {};
            const g = ctx.createLinearGradient(30, 150, 160, 40);
            if (t.mode === 'rainbow') ['#ff3a3a', '#ff9a2a', '#ffe066', '#5aff5a', '#3ab8ff', '#b45cff'].forEach((h, i) => g.addColorStop(i / 5, h));
            else if (t.mode === 'sword') { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, '#e8eef5'); }
            else { g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, col(t.color2 || t.color)); g.addColorStop(1, col(t.color)); }
            ctx.strokeStyle = g; ctx.lineCap = 'round';
            ctx.lineWidth = 16 + (t.width || 0) * 1.6;
            ctx.beginPath(); ctx.moveTo(34, 150); ctx.quadraticCurveTo(70, 50, 158, 42); ctx.stroke();
            ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.moveTo(60, 120); ctx.quadraticCurveTo(84, 66, 150, 50); ctx.stroke();
            return this._withTexture(ctx, c, t.particles, [[52, 120], [96, 74], [138, 56]], 26, item, finish);
        }
        if (item.tab === 'slashes') {
            const s = item.slash || {};
            return this._withTexture(ctx, c, s.texture, [[96, 96]], 132, item, () => (s.extra ? this._withTexture(ctx, c, s.extra, [[50, 54], [146, 140]], 34, item, finish) : finish()), col(s.color || '#ffffff'));
        }
        if (item.tab === 'kills') {
            const k = item.kill || {};
            // Блочный моб разлетается.
            const pal = ['#6fae4a', '#2f9e9e', '#5a3e8a'];
            for (let i = 0; i < 14; i++) { ctx.fillStyle = pal[i % 3]; const a = i * 0.45, r = 22 + (i % 4) * 14; ctx.fillRect(96 + Math.cos(a) * r - 7, 104 + Math.sin(a) * r - 7, 14, 14); }
            if (k.kind === 'blocks' || !k.texture) return finish();
            return this._withTexture(ctx, c, k.texture, [[60, 60], [132, 58], [96, 40], [150, 120], [42, 128]], 34, item, finish, k.color);
        }
        if (item.tab === 'auras') {
            const a = item.aura || {};
            const g = ctx.createRadialGradient(96, 96, 10, 96, 96, 80);
            g.addColorStop(0, col(a.color2)); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.45; ctx.fillStyle = g; ctx.fillRect(0, 0, 192, 192); ctx.globalAlpha = 1;
            // Меч в ореоле.
            ctx.save(); ctx.translate(96, 100); ctx.rotate(-Math.PI / 4);
            ctx.fillStyle = '#e8eef5'; ctx.fillRect(-7, -70, 14, 92); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-22, 20, 44, 8); ctx.fillRect(-5, 28, 10, 26);
            ctx.restore();
            return this._withTexture(ctx, c, a.texture, [[46, 60], [148, 70], [56, 140], [140, 142], [96, 34]], 30, item, finish, a.color);
        }
        if (item.tab === 'wins') {
            const w = item.win || {};
            const cs = w.colors || ['#ffffff'];
            if (w.kind === 'fireworks') {
                cs.slice(0, 3).forEach((h, i) => {
                    const x = 52 + i * 44, y = 62 + (i % 2) * 34;
                    ctx.strokeStyle = h; ctx.lineWidth = 4; ctx.lineCap = 'round';
                    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 26); ctx.stroke(); }
                });
                return finish();
            }
            if (w.kind === 'storm') { ctx.strokeStyle = cs[0]; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(110, 24); ctx.lineTo(80, 92); ctx.lineTo(108, 92); ctx.lineTo(78, 168); ctx.stroke(); return finish(); }
            return this._withTexture(ctx, c, w.texture, [[50, 50], [100, 70], [148, 46], [70, 120], [130, 128], [96, 166]], 30, item, finish, cs[0]);
        }
        return finish();
    },

    // Нарисовать текстуру эффекта (тонированную) в точках, затем finish(). Пока картинка грузится —
    // отдаётся иконка без неё, а готовая подменяет кэш (UI переспросит при следующей отрисовке).
    _withTexture(ctx, canvas, url, pts, size, item, finish, tint) {
        if (!url) return finish();
        const first = finish();
        const img = new Image();
        img.onload = () => {
            for (const [x, y] of pts) {
                if (tint && tint !== '#ffffff') {
                    const t = document.createElement('canvas'); t.width = t.height = size;
                    const tc = /** @type {CanvasRenderingContext2D} */ (t.getContext('2d'));
                    tc.drawImage(img, 0, 0, size, size);
                    tc.globalCompositeOperation = 'source-atop'; tc.fillStyle = tint; tc.globalAlpha = 0.65; tc.fillRect(0, 0, size, size);
                    ctx.drawImage(t, x - size / 2, y - size / 2);
                } else ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
            }
            this._icons[item.id] = canvas.toDataURL('image/png');
            window.dispatchEvent(new CustomEvent('ocm-icon', { detail: { id: item.id } }));
        };
        img.src = url;
        return first;
    },
};
