// GameAds.js — награды за рекламу Obby Cut Master (rewarded): кулдауны, усиления перед уровнем,
// пропуск уровня, «супер-награда» (5 просмотров с паузой → очень крутая награда).
// Награда — только по подтверждению SDK (Platform.rewarded(id) === true), один запрос за раз,
// id награды стабильные и без данных игрока. Это не раунды: Platform.ads.roundEnded не зовётся.
// Время последнего просмотра по месту — в сохранении игры (save.adAt), чтобы перезагрузка не
// сбрасывала паузу.

/** @satisfies {Record<string, any>} */
const GameAds = {
    // Пауза между просмотрами (с) по месту показа.
    COOLDOWN: {
        'super': 75,           // супер-награда: 5 просмотров, между ними 60–90 с
        'boost-hearts': 60,    // +2 сердца на следующий уровень
        'boost-coins': 60,     // ×2 монет за следующий уровень
        'skip-level': 90,      // пропуск уровня после двух поражений подряд
        'sword-unlock': 12,    // меч за N просмотров
        'shop-unlock': 12,     // косметика за N просмотров
        'win-x2': 0,           // ×2 монет за победу — один раз на результат
        'continue': 0,         // продолжить бой — один раз на уровень
        'perk-reroll': 25,     // выживание: другие три перка
    },
    SUPER_NEED: 5,
    busy: false,

    save() { return Game.save; },

    // Секунд до следующего просмотра по месту id.
    wait(id) {
        const at = (this.save().adAt || {})[id] || 0;
        const cd = (this.COOLDOWN[id] || 0) * 1000;
        return Math.max(0, Math.ceil((at + cd - Date.now()) / 1000));
    },

    available() { return Platform.rewardedSupported(); },
    can(id) { return this.available() && !this.busy && this.wait(id) === 0; },

    // Показать рекламу по месту id: true — награда подтверждена.
    async watch(id) {
        if (!this.can(id)) return false;
        this.busy = true;
        let ok = false;
        try { ok = await Platform.rewarded(id); } catch (e) { ok = false; } finally { this.busy = false; }
        const s = this.save();
        if (!s.adAt) s.adAt = {};
        s.adAt[id] = Date.now();     // пауза и после отказа — не дёргать SDK повторно
        Game.persist();
        return ok === true;
    },

    // --- Усиления перед уровнем ------------------------------------------------------------------

    // Купленные усиления действуют на ближайший начатый уровень.
    boosts: { hearts: 0, coins: 1 },
    async buyBoost(kind) {
        const id = kind === 'hearts' ? 'boost-hearts' : 'boost-coins';
        if (!(await this.watch(id))) return false;
        if (kind === 'hearts') this.boosts.hearts = 2; else this.boosts.coins = 2;
        GameAudio.play('unlock');
        return true;
    },
    // Забрать усиления на старте уровня (Game.beginRound).
    takeBoosts() {
        const b = { hearts: this.boosts.hearts, coins: this.boosts.coins };
        this.boosts = { hearts: 0, coins: 1 };
        return b;
    },

    // --- Пропуск уровня -------------------------------------------------------------------------

    // Предлагать после двух поражений подряд на одном уровне.
    canOfferSkip(n) {
        const f = (this.save().fails || {})[n] || 0;
        return f >= 2 && n < GameData.LEVEL_COUNT && this.available();
    },
    async skipLevel(n) {
        if (!this.canOfferSkip(n) || !(await this.watch('skip-level'))) return false;
        const s = this.save();
        s.level = Math.max(s.level, Math.min(GameData.LEVEL_COUNT, n + 1));
        if (!s.stars[n]) s.stars[n] = 1;
        if (s.fails) delete s.fails[n];
        Game.persist();
        return true;
    },

    // --- Супер-награда: 5 просмотров с паузой → легендарный/мифический меч или эксклюзив ---------

    // Текущая цель: меч (не трофей босса, ещё не открыт) старшей редкости, иначе — гора монет.
    superReward() {
        const s = this.save();
        if (!s.super) s.super = { have: 0, reward: null };
        const owned = new Set(s.swords);
        let r = s.super.reward;
        if (r && r.type === 'sword' && owned.has(r.id)) r = null;
        if (!r) {
            const pool = GameData.SWORDS.filter(w => !w.boss && !owned.has(w.id) && (w.rarity === 'legendary' || w.rarity === 'mythic' || w.rarity === 'epic'));
            pool.sort((a, b) => (a.rarity === 'mythic' ? 0 : a.rarity === 'legendary' ? 1 : 2) - (b.rarity === 'mythic' ? 0 : b.rarity === 'legendary' ? 1 : 2) || a.level - b.level);
            const pick = pool[0];
            r = pick ? { type: 'sword', id: pick.id } : { type: 'coins', amount: 6000 };
            s.super.reward = r;
        }
        return r;
    },

    // Для интерфейса: { have, need, wait, available, reward: { type, id?, amount?, name, icon, rarity } }.
    superInfo() {
        const s = this.save();
        const r = this.superReward();
        const out = { have: (s.super && s.super.have) || 0, need: this.SUPER_NEED, wait: this.wait('super'), available: this.available(), reward: /** @type {any} */ (null) };
        if (r.type === 'sword') {
            const w = GameData.sword(r.id);
            out.reward = { type: 'sword', id: w.id, name: w.name, icon: GameSword.ICONS[w.id], rarity: w.rarity };
        } else out.reward = { type: 'coins', amount: r.amount, name: { ru: r.amount + ' монет', en: r.amount + ' coins' }, icon: 'assets/ui/icon_coins_pile.png', rarity: 'legendary' };
        return out;
    },

    // Просмотр за супер-награду. { ok, done, granted?, have, need, wait }.
    async superWatch() {
        const s = this.save();
        const r = this.superReward();
        if (!(await this.watch('super'))) return { ok: false, have: s.super.have, need: this.SUPER_NEED, wait: this.wait('super') };
        s.super.have = (s.super.have || 0) + 1;
        let granted = null;
        if (s.super.have >= this.SUPER_NEED) {
            if (r.type === 'sword') { if (!s.swords.includes(r.id)) s.swords.push(r.id); granted = { type: 'sword', id: r.id }; }
            else { Shop.addCoins(r.amount, { reason: 'super', save: false }); granted = { type: 'coins', amount: r.amount }; }
            s.super = { have: 0, reward: null };
            GameAudio.play('unlock');
        }
        Game.persist();
        return { ok: true, done: !!granted, granted, have: s.super.have, need: this.SUPER_NEED, wait: this.wait('super') };
    },
};
