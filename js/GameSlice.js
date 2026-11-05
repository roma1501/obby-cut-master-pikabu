// GameSlice.js — резка меша плоскостью (как у фруктов в Fruit Ninja, только по блочным
// частям Roblox-мобов): треугольники делятся по плоскости с интерполяцией нормалей, UV и
// цветов вершин, срез закрывается «крышкой» (пиксельная текстура нутра). Результат — две
// новые геометрии; игра решает, какая половина остаётся на мобе, а какая падает.
// Чистая математика над массивами + сборка Babylon-меша; плоскость — в локальных координатах меша.

/** @typedef {{ p: number[], n: number[], uv: number[] | null, c: number[] | null }} SliceVert */
/** @typedef {{ pos: number[], nor: number[], uv: number[], col: number[], hasUV: boolean, hasCol: boolean }} SliceGeo */

/** @satisfies {Record<string, any>} */
const GameSlice = {
    EPS: 1e-4,
    /** @type {Record<string, BABYLON.StandardMaterial>} */
    _capMats: {},

    // Разобранная геометрия по объекту Geometry Babylon: части ригов одной модели делят геометрию,
    // поэтому первая часть типа разбирается один раз (split вершины не меняет — делить безопасно).
    /** @type {WeakMap<any, any>} */
    _geo: new WeakMap(),

    // Геометрия меша (локальная): плоские массивы вершин по треугольникам.
    read(mesh) {
        const g = mesh.geometry;
        if (g && this._geo.has(g)) return this._geo.get(g);
        const geo = this._read(mesh);
        if (g && geo) this._geo.set(g, geo);
        return geo;
    },

    _read(mesh) {
        const P = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (!P) return null;
        const N = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        const U = mesh.getVerticesData(BABYLON.VertexBuffer.UVKind);
        const C = mesh.getVerticesData(BABYLON.VertexBuffer.ColorKind);
        const I = mesh.getIndices();
        const cs = C ? (C.length / (P.length / 3) >= 4 ? 4 : 3) : 0;
        const idx = I && I.length ? I : Array.from({ length: P.length / 3 }, (_, i) => i);
        /** @type {SliceVert[]} */
        const verts = [];
        const vert = (i) => ({
            p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]],
            n: N ? [N[i * 3], N[i * 3 + 1], N[i * 3 + 2]] : [0, 1, 0],
            uv: U ? [U[i * 2], U[i * 2 + 1]] : null,
            c: C ? (cs === 4 ? [C[i * 4], C[i * 4 + 1], C[i * 4 + 2], C[i * 4 + 3]] : [C[i * 3], C[i * 3 + 1], C[i * 3 + 2], 1]) : null,
        });
        for (let k = 0; k < idx.length; k++) verts.push(vert(idx[k]));
        return { tris: verts, hasUV: !!U, hasCol: !!C };
    },

    _lerp(a, b, t) {
        return {
            p: [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t, a.p[2] + (b.p[2] - a.p[2]) * t],
            n: [a.n[0] + (b.n[0] - a.n[0]) * t, a.n[1] + (b.n[1] - a.n[1]) * t, a.n[2] + (b.n[2] - a.n[2]) * t],
            uv: a.uv && b.uv ? [a.uv[0] + (b.uv[0] - a.uv[0]) * t, a.uv[1] + (b.uv[1] - a.uv[1]) * t] : null,
            c: a.c && b.c ? [a.c[0] + (b.c[0] - a.c[0]) * t, a.c[1] + (b.c[1] - a.c[1]) * t, a.c[2] + (b.c[2] - a.c[2]) * t, a.c[3] + (b.c[3] - a.c[3]) * t] : null,
        };
    },

    // Многоугольник треугольника, отсечённый плоскостью: сторона sign (+1 / −1). Возвращает вершины и
    // точки на плоскости (для крышки).
    _clip(poly, dist, sign) {
        const out = [], on = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length];
            const da = dist[i] * sign, db = dist[(i + 1) % poly.length] * sign;
            if (da >= -this.EPS) { out.push(a); if (Math.abs(da) <= this.EPS) on.push(a); }
            if ((da > this.EPS && db < -this.EPS) || (da < -this.EPS && db > this.EPS)) {
                const v = this._lerp(a, b, da / (da - db));
                out.push(v); on.push(v);
            }
        }
        return { out, on };
    },

    // Разрезать: n — нормаль (локальная, единичная), d — смещение: точка p на плоскости, если n·p + d = 0.
    // Возвращает { front, back, segs } — треугольники с n·p + d > 0 и < 0, отрезки среза.
    split(geo, n, d) {
        const front = [], back = [], segs = [], uvs = [];
        const T = geo.tris;
        for (let k = 0; k < T.length; k += 3) {
            const tri = [T[k], T[k + 1], T[k + 2]];
            const dist = tri.map(v => n[0] * v.p[0] + n[1] * v.p[1] + n[2] * v.p[2] + d);
            const pos = dist.some(x => x > this.EPS), neg = dist.some(x => x < -this.EPS);
            if (!neg) { front.push(...tri); continue; }
            if (!pos) { back.push(...tri); continue; }
            const A = this._clip(tri, dist, 1), B = this._clip(tri, dist, -1);
            for (let i = 1; i + 1 < A.out.length; i++) front.push(A.out[0], A.out[i], A.out[i + 1]);
            for (let i = 1; i + 1 < B.out.length; i++) back.push(B.out[0], B.out[i], B.out[i + 1]);
            if (A.on.length >= 2) {
                segs.push([A.on[0].p, A.on[A.on.length - 1].p]);
                for (const v of A.on) if (v.uv) uvs.push(v.uv);
            }
        }
        return { front, back, segs, uvs };
    },

    // Крышка среза: отрезки -> замкнутые контуры -> веер треугольников от центра.
    cap(segs, n) {
        if (!segs.length) return [];
        const key = (p) => Math.round(p[0] * 20) + ',' + Math.round(p[1] * 20) + ',' + Math.round(p[2] * 20);
        /** @type {Map<string, number[][]>} */
        const adj = new Map();
        for (const [a, b] of segs) {
            const ka = key(a), kb = key(b);
            if (ka === kb) continue;
            if (!adj.has(ka)) adj.set(ka, []);
            if (!adj.has(kb)) adj.set(kb, []);
            adj.get(ka).push(b); adj.get(kb).push(a);
        }
        const pts = new Map();
        for (const [a, b] of segs) { pts.set(key(a), a); pts.set(key(b), b); }
        const used = new Set(), loops = [];
        for (const [k0] of adj) {
            if (used.has(k0)) continue;
            const loop = [];
            let k = k0;
            while (k && !used.has(k)) {
                used.add(k);
                loop.push(pts.get(k));
                const next = (adj.get(k) || []).map(key).find(q => !used.has(q));
                k = next || null;
            }
            if (loop.length >= 3) loops.push(loop);
        }
        // Базис плоскости — для UV крышки.
        const ax = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
        const t1 = this._norm(this._cross(n, ax)), t2 = this._cross(n, t1);
        /** @type {number[][]} */
        const tris = [];
        for (const loop of loops) {
            const c = [0, 0, 0];
            for (const p of loop) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
            c[0] /= loop.length; c[1] /= loop.length; c[2] /= loop.length;
            for (let i = 0; i < loop.length; i++) tris.push(c, loop[i], loop[(i + 1) % loop.length]);
        }
        return { tris, t1, t2 };
    },

    _cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
    _norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },

    // Меш из треугольников (вершины SliceVert), со смещением offset (центрирование кусков).
    build(name, tris, geo, scene, material, offset) {
        if (!tris.length) return null;
        const o = offset || [0, 0, 0];
        const pos = [], nor = [], uv = [], col = [], ind = [];
        for (let i = 0; i < tris.length; i++) {
            const v = tris[i];
            pos.push(v.p[0] - o[0], v.p[1] - o[1], v.p[2] - o[2]);
            nor.push(v.n[0], v.n[1], v.n[2]);
            if (geo.hasUV) uv.push(v.uv ? v.uv[0] : 0, v.uv ? v.uv[1] : 0);
            if (geo.hasCol) col.push(...(v.c || [1, 1, 1, 1]));
            ind.push(i);
        }
        const m = new BABYLON.Mesh(name, scene);
        const vd = new BABYLON.VertexData();
        vd.positions = pos; vd.normals = nor; vd.indices = ind;
        if (geo.hasUV) vd.uvs = uv;
        if (geo.hasCol) vd.colors = col;
        vd.applyToMesh(m, false);
        m.material = material;
        m.isPickable = false;
        // Оставшийся на мобе кусок (без смещения) — следующий разрез возьмёт готовые треугольники.
        if (!offset && m.geometry) this._geo.set(m.geometry, { tris, hasUV: geo.hasUV, hasCol: geo.hasCol });
        return m;
    },

    // Крышка — отдельный меш; материал нутра ОДИН на сцену (серый пиксельный шум), цвет — в цветах вершин:
    // ни новых текстур, ни новых материалов на каждый разрез.
    buildCap(name, cap, n, scene, color, offset, sideSign) {
        if (!cap || !cap.tris || !cap.tris.length) return null;
        const o = offset || [0, 0, 0];
        const pos = [], nor = [], uv = [], col = [], ind = [];
        const nn = [n[0] * sideSign, n[1] * sideSign, n[2] * sideSign];
        const c = BABYLON.Color3.FromHexString(color);
        for (let i = 0; i < cap.tris.length; i++) {
            const p = cap.tris[i];
            pos.push(p[0] - o[0], p[1] - o[1], p[2] - o[2]);
            nor.push(nn[0], nn[1], nn[2]);
            uv.push((p[0] * cap.t1[0] + p[1] * cap.t1[1] + p[2] * cap.t1[2]) / 70, (p[0] * cap.t2[0] + p[1] * cap.t2[1] + p[2] * cap.t2[2]) / 70);
            col.push(c.r, c.g, c.b, 1);
            ind.push(i);
        }
        const m = new BABYLON.Mesh(name, scene);
        const vd = new BABYLON.VertexData();
        vd.positions = pos; vd.normals = nor; vd.uvs = uv; vd.colors = col; vd.indices = ind;
        vd.applyToMesh(m, false);
        m.material = this.capMaterial(scene);
        m.isPickable = false;
        return m;
    },

    // Материал нутра: серый пиксельный шум 16×16 (как срез блока в Minecraft) × цвет вершин крышки.
    capMaterial(scene) {
        const key = 'cap|' + scene.uid;
        const old = this._capMats[key];
        if (old && old.getScene()) return old;
        const tex = new BABYLON.DynamicTexture('cut-noise', { width: 16, height: 16 }, scene, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
        const ctx = /** @type {CanvasRenderingContext2D} */ (tex.getContext());
        let s = 7;
        const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const k = Math.round(255 * (0.74 + rnd() * 0.26));
            ctx.fillStyle = 'rgb(' + k + ',' + k + ',' + k + ')';
            ctx.fillRect(x, y, 1, 1);
        }
        tex.update(false);
        tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE; tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
        const mat = new BABYLON.StandardMaterial('cut-mat', scene);
        mat.diffuseTexture = tex;
        mat.diffuseColor = new BABYLON.Color3(1.1, 1.1, 1.1);   // шум темнит — чуть приподнять
        mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        mat.backFaceCulling = false;
        mat.metadata = { toonGroup: 'actor' };
        this._capMats[key] = mat;
        return mat;
    },

    // Пиксели текстуры материала для цвета среза — из исходной картинки (blob: URL модели), уменьшенной
    // на 2D-канвасе, асинхронно. Чтение с видеокарты (readPixels) останавливало кадр на миллисекунды
    // при каждом новом мобе. Кэш по URL картинки; пока не готово — цвет нутра по умолчанию.
    /** @type {Map<string, any>} */
    _pix: new Map(),
    PIX: 64,
    texturePixels(mat) {
        const tex = mat && /** @type {any} */ (mat).diffuseTexture;
        const url = tex && tex.url;
        if (!url) return null;
        let rec = this._pix.get(url);
        if (!rec) {
            rec = { data: null, w: 0, h: 0 };
            this._pix.set(url, rec);
            try {
                const img = new Image();
                img.onload = () => {
                    try {
                        const S = this.PIX;
                        const cv = document.createElement('canvas');
                        cv.width = S; cv.height = S;
                        const ctx = cv.getContext('2d', { willReadFrequently: true });
                        ctx.drawImage(img, 0, 0, S, S);
                        rec.data = ctx.getImageData(0, 0, S, S).data;
                        rec.w = S; rec.h = S;
                    } catch (e) { /* картинка без доступа к пикселям — цвет по умолчанию */ }
                };
                img.src = url;
            } catch (e) { /* без DOM — цвет по умолчанию */ }
        }
        return rec.data ? rec : null;
    },

    // Заранее прочитать пиксели текстур (под экраном загрузки), чтобы первый разрез был без задержки.
    warm(meshes) {
        for (const m of meshes || []) if (m && m.material) this.texturePixels(m.material);
    },

    // Цвет «нутра»: средний цвет текстуры по точкам среза, чуть светлее (цельный пластик, не кровь).
    cutColor(mat, uvs, fallback) {
        const px = this.texturePixels(mat);
        if (!px || !uvs || !uvs.length) return fallback;
        let r = 0, g = 0, b = 0, n = 0;
        const step = Math.max(1, Math.floor(uvs.length / 24));
        for (let i = 0; i < uvs.length; i += step) {
            const u = uvs[i][0] - Math.floor(uvs[i][0]), v = uvs[i][1] - Math.floor(uvs[i][1]);
            // Текстуры моделей грузятся с invertY: v = 0 — нижний край картинки, а строки канваса — сверху.
            const x = Math.min(px.w - 1, Math.max(0, Math.floor(u * px.w)));
            const y = Math.min(px.h - 1, Math.max(0, Math.floor((1 - v) * px.h)));
            const k = (y * px.w + x) * 4;
            const d = px.data;
            r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
        }
        if (!n) return fallback;
        const L = (c) => Math.min(255, Math.round(c / n * 0.82 + 255 * 0.18));
        const hx = (c) => L(c).toString(16).padStart(2, '0');
        return '#' + hx(r) + hx(g) + hx(b);
    },

    // Плоскость из мира в локальные координаты меша: точка и нормаль через обратную матрицу
    // (две касательные — устойчиво и при неравномерном масштабе «сжатия» удара).
    planeToLocal(mesh, pointW, normalW) {
        const W = mesh.computeWorldMatrix(true);
        const inv = BABYLON.Matrix.Invert(W);
        const p = BABYLON.Vector3.TransformCoordinates(pointW, inv);
        const a = Math.abs(normalW.x) < 0.9 ? BABYLON.Axis.X : BABYLON.Axis.Y;
        const t1 = BABYLON.Vector3.Cross(normalW, a).normalize();
        const t2 = BABYLON.Vector3.Cross(normalW, t1).normalize();
        const l1 = BABYLON.Vector3.TransformNormal(t1, inv), l2 = BABYLON.Vector3.TransformNormal(t2, inv);
        let n = BABYLON.Vector3.Cross(l1, l2).normalize();
        // Направление нормали — как у мировой (знак «перед/зад» сохраняем).
        const back = BABYLON.Vector3.TransformNormal(n, W);
        if (BABYLON.Vector3.Dot(back, normalW) < 0) n = n.scale(-1);
        return { n: [n.x, n.y, n.z], d: -(n.x * p.x + n.y * p.y + n.z * p.z) };
    },

    // Отрезок a->b (мир) пересекает мировой габарит (min, max) с запасом pad? { mid } или null.
    segmentHitBox(min, max, a, b, pad) {
        let t0 = 0, t1 = 1;
        const d = b.subtract(a);
        const ax = [[a.x, d.x, min.x - pad, max.x + pad], [a.y, d.y, min.y - pad, max.y + pad], [a.z, d.z, min.z - pad, max.z + pad]];
        for (const [o, dd, lo, hi] of ax) {
            if (Math.abs(dd) < 1e-9) { if (o < lo || o > hi) return null; continue; }
            let ta = (lo - o) / dd, tb = (hi - o) / dd;
            if (ta > tb) { const t = ta; ta = tb; tb = t; }
            t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
            if (t0 > t1) return null;
        }
        return { mid: BABYLON.Vector3.Lerp(a, b, (t0 + t1) / 2) };
    },

    // Отрезок a->b (мир) пересекает габарит меша (в его локальных координатах, с запасом pad)?
    // Возвращает { t0, t1, mid (мир) } или null.
    segmentHit(mesh, a, b, pad) {
        const W = mesh.computeWorldMatrix(true);
        const inv = BABYLON.Matrix.Invert(W);
        const la = BABYLON.Vector3.TransformCoordinates(a, inv), lb = BABYLON.Vector3.TransformCoordinates(b, inv);
        const bb = mesh.getBoundingInfo().boundingBox;
        const mn = bb.minimum, mx = bb.maximum;
        // Запас — в мировых px, переведённый грубо через масштаб.
        const sc = new BABYLON.Vector3(); W.decompose(sc);
        const px = pad / Math.max(1e-3, sc.x), py = pad / Math.max(1e-3, sc.y), pz = pad / Math.max(1e-3, sc.z);
        let t0 = 0, t1 = 1;
        const dir = lb.subtract(la);
        const axes = [[la.x, dir.x, mn.x - px, mx.x + px], [la.y, dir.y, mn.y - py, mx.y + py], [la.z, dir.z, mn.z - pz, mx.z + pz]];
        for (const [o, dd, lo, hi] of axes) {
            if (Math.abs(dd) < 1e-9) { if (o < lo || o > hi) return null; continue; }
            let ta = (lo - o) / dd, tb = (hi - o) / dd;
            if (ta > tb) { const t = ta; ta = tb; tb = t; }
            t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
            if (t0 > t1) return null;
        }
        const tm = (t0 + t1) / 2;
        return { t0, t1, mid: BABYLON.Vector3.Lerp(a, b, tm) };
    },
};
