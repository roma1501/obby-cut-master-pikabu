// GameSurvival.js — режим «Выживание» Obby Cut Master (рогалик): бесконечные волны, каждые 3–5 волн —
// выбор 1 из 3 перков и переход на новую случайную локацию (биом), сложность растёт плавно: сначала
// простые мобы, новые виды открываются постепенно, с 6-й волны — варианты, каждые 10 волн — босс.
// 50 перков от обычных до легендарных; их сумма — модификаторы Game.mods (кампания их не трогает).
// Данные и логика без DOM: интерфейс (выбор перка, HUD забега, итог) — GameUI по хукам Game.ui(...).

/** @typedef {{ id: string, rarity: string, icon: string, max: number, name: { ru: string, en: string }, desc: { ru: string, en: string }, fx: Record<string, number> }} Perk */

/** @satisfies {Record<string, any>} */
const GameSurvival = {
    // Иконки перков — готовые иконки интерфейса и частиц (литералы путей).
    /** @type {Perk[]} */
    PERKS: [
        // --- Обычные (18) ---
        { id: 'sharp', rarity: 'common', icon: 'assets/ui/icon_sword.png', max: 5, name: { ru: 'Острый клинок', en: 'Sharp Blade' }, desc: { ru: '+15% урона', en: '+15% damage' }, fx: { dmg: 0.15 } },
        { id: 'stamina', rarity: 'common', icon: 'assets/ui/icon_lightning.png', max: 5, name: { ru: 'Выносливость', en: 'Endurance' }, desc: { ru: '+20% выносливости меча', en: '+20% sword stamina' }, fx: { stamina: 0.2 } },
        { id: 'breath', rarity: 'common', icon: 'assets/fx/cloud_puff.webp', max: 4, name: { ru: 'Второе дыхание', en: 'Second Breath' }, desc: { ru: '+25% восстановления выносливости', en: '+25% stamina regen' }, fx: { regen: 0.25 } },
        { id: 'quickdraw', rarity: 'common', icon: 'assets/ui/icon_skip.png', max: 3, name: { ru: 'Быстрые руки', en: 'Quick Hands' }, desc: { ru: '−20% паузы взятия меча', en: '−20% sword draw delay' }, fx: { draw: 0.2 } },
        { id: 'heart', rarity: 'common', icon: 'assets/ui/icon_heart.png', max: 3, name: { ru: 'Лишнее сердце', en: 'Extra Heart' }, desc: { ru: '+1 сердце и лечение', en: '+1 heart and heal' }, fx: { hearts: 1 } },
        { id: 'greed', rarity: 'common', icon: 'assets/ui/icon_coin.png', max: 5, name: { ru: 'Жадность', en: 'Greed' }, desc: { ru: '+25% монет', en: '+25% coins' }, fx: { coins: 0.25 } },
        { id: 'wide', rarity: 'common', icon: 'assets/fx/swing_arc_02.webp', max: 3, name: { ru: 'Широкий взмах', en: 'Wide Swing' }, desc: { ru: '+30% ширины разреза', en: '+30% cut width' }, fx: { width: 0.3 } },
        { id: 'aim', rarity: 'common', icon: 'assets/fx/flash_star.webp', max: 4, name: { ru: 'Меткость', en: 'Precision' }, desc: { ru: '+8% шанс крита (×3)', en: '+8% crit chance (×3)' }, fx: { crit: 0.08 } },
        { id: 'heavyair', rarity: 'common', icon: 'assets/fx/smoke_white.webp', max: 3, name: { ru: 'Тяжёлый воздух', en: 'Heavy Air' }, desc: { ru: 'Враги на 8% медленнее', en: 'Enemies 8% slower' }, fx: { slow: 0.08 } },
        { id: 'medkit', rarity: 'common', icon: 'assets/fx/heal_plus.webp', max: 1, name: { ru: 'Аптечка', en: 'Med Kit' }, desc: { ru: '+1 сердце после каждой волны', en: '+1 heart after every wave' }, fx: { medkit: 1 } },
        { id: 'firstblow', rarity: 'common', icon: 'assets/fx/spark_streak.webp', max: 1, name: { ru: 'Первый удар', en: 'First Strike' }, desc: { ru: 'Первый разрез по врагу — ×2 урона', en: 'First cut on an enemy deals ×2' }, fx: { first: 1 } },
        { id: 'needles', rarity: 'common', icon: 'assets/fx/bubble.webp', max: 1, name: { ru: 'Иглы', en: 'Needles' }, desc: { ru: 'Пузыри-щиты не спасают врагов', en: 'Bubble shields don\'t protect enemies' }, fx: { bubble: 1 } },
        { id: 'ram', rarity: 'common', icon: 'assets/ui/icon_shield.png', max: 1, name: { ru: 'Таран', en: 'Battering Ram' }, desc: { ru: 'Щит рыцаря ломается с одного удара', en: 'Knight shields break in one hit' }, fx: { shieldBreak: 1 } },
        { id: 'catcher', rarity: 'common', icon: 'assets/fx/drop_01.webp', max: 2, name: { ru: 'Ловец', en: 'Catcher' }, desc: { ru: 'Снаряды врагов на 25% медленнее', en: 'Enemy projectiles 25% slower' }, fx: { shotSlow: 0.25 } },
        { id: 'luck', rarity: 'common', icon: 'assets/fx/rainbow_star.webp', max: 3, name: { ru: 'Удача', en: 'Luck' }, desc: { ru: 'Чаще редкие перки', en: 'Rarer perks show up more' }, fx: { luck: 1 } },
        { id: 'headhunter', rarity: 'common', icon: 'assets/ui/icon_skull.png', max: 2, name: { ru: 'Охотник за головами', en: 'Headhunter' }, desc: { ru: 'Отсечённая голова: +5 монет и выносливость', en: 'Beheading: +5 coins and stamina' }, fx: { head: 1 } },
        { id: 'piercer', rarity: 'common', icon: 'assets/fx/crack.webp', max: 1, name: { ru: 'Бронебой', en: 'Armor Piercer' }, desc: { ru: 'Броню робота режет с первого раза', en: 'Cuts robot armor on the first try' }, fx: { armor: 1 } },
        { id: 'splash', rarity: 'common', icon: 'assets/fx/splat_01.webp', max: 1, name: { ru: 'Брызги краски', en: 'Paint Splash' }, desc: { ru: 'Убийство замедляет соседей', en: 'Kills slow nearby enemies' }, fx: { splash: 1 } },
        // --- Редкие (14) ---
        { id: 'fireedge', rarity: 'rare', icon: 'assets/fx/flame.webp', max: 1, name: { ru: 'Огненная кромка', en: 'Fire Edge' }, desc: { ru: 'Разрезы поджигают', en: 'Cuts set enemies on fire' }, fx: { fire: 1 } },
        { id: 'iceedge', rarity: 'rare', icon: 'assets/fx/snowflake.webp', max: 1, name: { ru: 'Ледяная кромка', en: 'Ice Edge' }, desc: { ru: 'Разрезы замедляют и замораживают', en: 'Cuts slow and freeze' }, fx: { ice: 1 } },
        { id: 'poisonedge', rarity: 'rare', icon: 'assets/fx/slime_splat.webp', max: 1, name: { ru: 'Ядовитая кромка', en: 'Toxic Edge' }, desc: { ru: 'Разрезы отравляют', en: 'Cuts poison enemies' }, fx: { poison: 1 } },
        { id: 'spark', rarity: 'rare', icon: 'assets/fx/lightning.webp', max: 2, name: { ru: 'Искра', en: 'Spark' }, desc: { ru: '20% шанс молнии в соседа', en: '20% chance to zap a neighbor' }, fx: { spark: 0.2 } },
        { id: 'vamp', rarity: 'rare', icon: 'assets/fx/heart_red.webp', max: 1, name: { ru: 'Вампир', en: 'Vampire' }, desc: { ru: 'Каждые 8 убийств — сердце', en: 'A heart every 8 kills' }, fx: { vamp: 8 } },
        { id: 'barrier', rarity: 'rare', icon: 'assets/fx/ring_glow.webp', max: 2, name: { ru: 'Барьер', en: 'Barrier' }, desc: { ru: 'Блокирует 1 удар, заряжается раз в 3 волны', en: 'Blocks 1 hit, recharges every 3 waves' }, fx: { barrier: 1 } },
        { id: 'frenzy', rarity: 'rare', icon: 'assets/fx/fire_burst.webp', max: 1, name: { ru: 'Безумие', en: 'Frenzy' }, desc: { ru: 'Убийство: +8% урона на 3 с (до ×5)', en: 'Kill: +8% damage for 3 s (×5)' }, fx: { frenzy: 1 } },
        { id: 'executioner', rarity: 'rare', icon: 'assets/ui/icon_boss.png', max: 1, name: { ru: 'Палач', en: 'Executioner' }, desc: { ru: 'Враги с ≤20% здоровья гибнут от разреза', en: 'Enemies at ≤20% HP die to any cut' }, fx: { execute: 0.2 } },
        { id: 'foresight', rarity: 'rare', icon: 'assets/ui/icon_question.png', max: 1, name: { ru: 'Предвидение', en: 'Foresight' }, desc: { ru: 'Ниндзя не уворачиваются, телепорты медленнее', en: 'Ninjas can\'t dodge, teleports slower' }, fx: { foresight: 1 } },
        { id: 'ghostcut', rarity: 'rare', icon: 'assets/fx/smoke_puff.webp', max: 1, name: { ru: 'Призрачный клинок', en: 'Ghost Blade' }, desc: { ru: 'Режет неосязаемых', en: 'Cuts intangible enemies' }, fx: { ghost: 1 } },
        { id: 'echo', rarity: 'rare', icon: 'assets/fx/swing_arc_03.webp', max: 2, name: { ru: 'Эхо', en: 'Echo' }, desc: { ru: 'Разрез повторяется с 40% урона', en: 'Cuts echo for 40% damage' }, fx: { echo: 0.4 } },
        { id: 'magnet', rarity: 'rare', icon: 'assets/ui/icon_coins_pile.png', max: 1, name: { ru: 'Магнит', en: 'Magnet' }, desc: { ru: '+40% монет, чаще сундуки', en: '+40% coins, more chests' }, fx: { coins: 0.4, chests: 1 } },
        { id: 'knock', rarity: 'rare', icon: 'assets/fx/shockwave_ring.webp', max: 1, name: { ru: 'Отбрасывание', en: 'Knockback' }, desc: { ru: 'Разрезы отталкивают врагов', en: 'Cuts push enemies back' }, fx: { knock: 1 } },
        { id: 'secondwind', rarity: 'rare', icon: 'assets/fx/sparkle_big.webp', max: 1, name: { ru: 'Открытое дыхание', en: 'Second Wind' }, desc: { ru: 'Раз в волну усталость сразу снимается', en: 'Once per wave, tiredness clears instantly' }, fx: { wind: 1 } },
        // --- Эпические (10) ---
        { id: 'blast', rarity: 'epic', icon: 'assets/fx/fireball.webp', max: 1, name: { ru: 'Взрывная резня', en: 'Explosive Carnage' }, desc: { ru: '30% шанс взрыва при убийстве', en: '30% chance to explode on kill' }, fx: { boom: 0.3 } },
        { id: 'chain', rarity: 'epic', icon: 'assets/fx/lightning_bolt.webp', max: 1, name: { ru: 'Цепная молния', en: 'Chain Lightning' }, desc: { ru: 'Каждый разрез бьёт молнией двоих', en: 'Every cut zaps two enemies' }, fx: { chain: 1 } },
        { id: 'slowmo', rarity: 'epic', icon: 'assets/fx/flash_burst.webp', max: 1, name: { ru: 'Слоу-мо', en: 'Slow-Mo' }, desc: { ru: 'Убийство замедляет время', en: 'Kills slow down time' }, fx: { slowmo: 1 } },
        { id: 'colossus', rarity: 'epic', icon: 'assets/ui/icon_trophy.png', max: 1, name: { ru: 'Громадный клинок', en: 'Colossal Blade' }, desc: { ru: '+60% ширины, +25% урона, −15% выносливости', en: '+60% width, +25% damage, −15% stamina' }, fx: { width: 0.6, dmg: 0.25, stamina: -0.15 } },
        { id: 'smite', rarity: 'epic', icon: 'assets/fx/flare_gold.webp', max: 1, name: { ru: 'Святая кара', en: 'Holy Smite' }, desc: { ru: 'Каждые 10 убийств — свет по всем', en: 'Every 10 kills — light strikes all' }, fx: { smite: 10 } },
        { id: 'noregen', rarity: 'epic', icon: 'assets/fx/scorch.webp', max: 1, name: { ru: 'Без шансов', en: 'No Mercy' }, desc: { ru: 'Никто не отращивает части, +20% по нежити', en: 'No one regrows parts, +20% vs undead' }, fx: { noregen: 1 } },
        { id: 'double', rarity: 'epic', icon: 'assets/fx/slash_02.webp', max: 1, name: { ru: 'Двойной разрез', en: 'Double Cut' }, desc: { ru: 'Каждый разрез режет дважды', en: 'Every cut slices twice' }, fx: { double: 1 } },
        { id: 'phoenix', rarity: 'epic', icon: 'assets/fx/fireball.webp', max: 1, name: { ru: 'Феникс', en: 'Phoenix' }, desc: { ru: 'Один раз воскрешает с 2 сердцами', en: 'Revive once with 2 hearts' }, fx: { revive: 1 } },
        { id: 'giantslayer', rarity: 'epic', icon: 'assets/ui/icon_boss.png', max: 1, name: { ru: 'Убийца гигантов', en: 'Giant Slayer' }, desc: { ru: '+50% урона по боссам и гигантам', en: '+50% damage vs bosses and giants' }, fx: { bossDmg: 0.5 } },
        { id: 'blackhole', rarity: 'epic', icon: 'assets/fx/plasma_orb.webp', max: 1, name: { ru: 'Чёрная дыра', en: 'Black Hole' }, desc: { ru: 'Убийство стягивает соседей', en: 'Kills pull nearby enemies in' }, fx: { hole: 1 } },
        // --- Легендарные (8) ---
        { id: 'tireless', rarity: 'legendary', icon: 'assets/fx/sparkle_4pt.webp', max: 1, name: { ru: 'Неутомимый', en: 'Tireless' }, desc: { ru: 'После убийства 5 с выносливость не тратится', en: 'Kills: no stamina use for 5 s' }, fx: { tireless: 5 } },
        { id: 'meteors', rarity: 'legendary', icon: 'assets/fx/fireball.webp', max: 1, name: { ru: 'Метеоритный дождь', en: 'Meteor Shower' }, desc: { ru: 'Каждые 6 убийств — метеорит', en: 'A meteor every 6 kills' }, fx: { meteor: 6 } },
        { id: 'prism', rarity: 'legendary', icon: 'assets/fx/rainbow_star.webp', max: 1, name: { ru: 'Призма', en: 'Prism' }, desc: { ru: 'Каждый разрез — случайная стихия', en: 'Every cut — a random element' }, fx: { rainbow: 1 } },
        { id: 'midas', rarity: 'legendary', icon: 'assets/fx/coin.webp', max: 1, name: { ru: 'Мидас', en: 'Midas' }, desc: { ru: '×2 монет и сундук каждую волну', en: '×2 coins and a chest every wave' }, fx: { coins: 1, chests: 2 } },
        { id: 'godslayer', rarity: 'legendary', icon: 'assets/fx/electric_burst.webp', max: 1, name: { ru: 'Богоубийца', en: 'Godslayer' }, desc: { ru: '+100% урона, но −1 сердце', en: '+100% damage, but −1 heart' }, fx: { dmg: 1, hearts: -1 } },
        { id: 'twin', rarity: 'legendary', icon: 'assets/ui/icon_sword.png', max: 1, name: { ru: 'Меч-близнец', en: 'Twin Sword' }, desc: { ru: 'Призрачный меч сам режет врагов', en: 'A ghost sword cuts enemies by itself' }, fx: { clone: 1.2 } },
        { id: 'angel', rarity: 'legendary', icon: 'assets/fx/heal_plus.webp', max: 1, name: { ru: 'Ангел-хранитель', en: 'Guardian Angel' }, desc: { ru: 'Первые 2 удара каждой волны блокируются', en: 'First 2 hits each wave are blocked' }, fx: { angel: 2 } },
        { id: 'apocalypse', rarity: 'legendary', icon: 'assets/fx/explosion_sheet_4x4.webp', max: 1, name: { ru: 'Апокалипсис', en: 'Apocalypse' }, desc: { ru: 'Каждую 3-ю волну — взрыв по всем обычным врагам', en: 'Every 3rd wave — a blast hits all regular foes' }, fx: { apocalypse: 3 } },
    ],

    RARITY_WEIGHT: { common: 60, rare: 28, epic: 10, legendary: 2.5 },

    // Открытие видов врагов по волнам (сначала просто, потом сложнее).
    TIERS: [
        [1, ['noob', 'zombie', 'bacon']],
        [3, ['guest', 'skeleton', 'slime']],
        [5, ['mummy', 'tnt', 'ninja', 'pirate']],
        [8, ['ghost', 'snowman', 'knight', 'pumpkin']],
        [11, ['wizard', 'alien', 'robot', 'brute']],
        [14, ['slender', 'lava']],
    ],
    BOSSES: ['boss_king', 'boss_pharaoh', 'boss_guardian', 'boss_yeti', 'boss_chief', 'boss_shroom', 'boss_outlaw', 'boss_demon', 'boss_voidlord', 'boss_titan'],

    /** @type {any} */
    run: null,

    perk(id) { return this.PERKS.find(p => p.id === id) || null; },

    // Новый забег: сид, первая локация, пустые перки.
    newRun() {
        const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
        const R = GameData.rng(seed);
        this.run = {
            seed, R, wave: 0, perks: /** @type {Record<string, number>} */ ({}),
            biome: GameData.BIOMES[Math.floor(R() * 3) % 3].id,     // начало — в одном из первых трёх биомов
            time: 'day', apocT: 0, perkKills: 0,
            nextOffer: 3, segment: 0, rerolls: 1, offer: /** @type {Perk[] | null} */ (null),
            barrier: 0, angel: 0, revived: false, windUsed: false, frenzy: 0, frenzyT: 0, tirelessT: 0, cloneT: 0,
            startedAt: Date.now(),
        };
        this.applyMods();
        return this.run;
    },

    // Сумма перков -> Game.mods (нейтральные значения у кампании).
    applyMods() {
        const m = this.neutral();
        if (this.run) for (const id in this.run.perks) {
            const p = this.perk(id), n = this.run.perks[id];
            if (!p) continue;
            for (const k in p.fx) m[k] = (m[k] || 0) + p.fx[k] * n;
        }
        Game.mods = m;
        return m;
    },
    neutral() { return { dmg: 0, stamina: 0, regen: 0, draw: 0, hearts: 0, coins: 0, width: 0, crit: 0, slow: 0 }; },

    // Синтетический «уровень» волны: биом, сила, состав.
    waveLevel(w) {
        const run = this.run, R = run.R;
        const bi = Math.max(0, GameData.BIOMES.findIndex(b => b.id === run.biome));
        const hpMul = 1 + (w - 1) * 0.075 + Math.max(0, w - 20) * 0.05;
        const spMul = 1 + Math.min(0.5, w * 0.012);
        const open = [];
        for (const [from, list] of this.TIERS) if (w >= from) open.push(...list);
        // Вкус биома: его мобы (если уже открыты) чаще.
        const flavor = GameData.BIOMES[bi].pool.filter(t => open.includes(t));
        const pick = () => { const src = flavor.length && R() < 0.5 ? flavor : open; return src[Math.floor(R() * src.length)] || 'noob'; };
        const count = Math.min(24, Math.round(2 + w * 0.75 + R() * 2));
        const groups = [];
        let left = count;
        while (left > 0) {
            const c = Math.min(left, 1 + Math.floor(R() * 4));
            const g = { type: pick(), count: c, gap: Math.max(0.5, 1.6 - w * 0.03), variant: /** @type {string | undefined} */ (undefined) };
            if (w >= 6 && R() < Math.min(0.4, 0.06 + w * 0.012)) g.variant = ['swift', 'regen', 'armored', 'bubbled', 'golden', 'mini'][Math.floor(R() * (w >= 12 ? 6 : 3))];
            groups.push(g);
            left -= c;
        }
        // Каждые 10 волн — босс (послабее кампании) с охраной.
        let boss = null;
        if (w % 10 === 0) {
            boss = this.BOSSES[Math.min(this.BOSSES.length - 1, Math.floor(w / 10) - 1 + Math.floor(R() * 2))];
            groups.unshift({ type: boss, count: 1, gap: 0, variant: undefined });
        }
        const props = [];
        const mods = Game.mods || {};
        if (R() < 0.35 + (mods.chests || 0) * 0.3) props.push('chest');
        if (w >= 4 && R() < 0.3) props.push('tnt');
        if (w >= 6 && R() < 0.18) props.push('heart');
        if (w >= 8 && R() < 0.15) props.push(R() < 0.5 ? 'ice' : 'bolt');
        if ((mods.chests || 0) >= 2) props.push('chest');
        return {
            n: w, survival: true, biome: run.biome, biomeIndex: bi, inBiome: 1, theme: boss ? 'boss' : 'survival',
            title: { ru: 'Выживание: волна ' + w, en: 'Survival: wave ' + w },
            time: run.time, weather: GameData.BIOMES[bi].weather,
            waves: [{ delay: 1.2, groups }], props, mobs: count + (boss ? 1 : 0), hpMul: boss ? hpMul * 0.55 : hpMul, spMul, boss,
            fresh: this.freshAt(w), reward: 0, seed: run.seed + w * 31,
        };
    },

    // Новые виды, открывшиеся на этой волне (баннер знакомства).
    freshAt(w) { const t = this.TIERS.find(x => x[0] === w); return t ? t[1].slice() : []; },

    // Волна зачищена: награды, барьер, аптечка; пора ли выбирать перк.
    onWaveCleared() {
        const run = this.run, m = Game.mods;
        run.windUsed = false;
        run.angel = m.angel || 0;
        if (m.medkit) Game.heal(1);
        if (m.barrier && run.wave % 3 === 0) run.barrier = Math.max(run.barrier, m.barrier);
        const bonus = 5 + run.wave * 2;
        Game.runCoins += bonus;
        run.lastBonus = bonus;
        if (run.wave >= run.nextOffer) {
            run.nextOffer = run.wave + 3 + Math.floor(run.R() * 3);     // следующий выбор — через 3–5 волн
            run.segment++;
            return true;
        }
        return false;
    },

    // Три перка на выбор: вес редкости растёт с волной и удачей; без повторов, с учётом лимитов.
    rollOffer() {
        const run = this.run, R = run.R;
        const luck = (Game.mods.luck || 0) + run.wave / 12;
        const W = { common: Math.max(20, 60 - luck * 6), rare: 28 + luck * 2, epic: 10 + luck * 2.5, legendary: 2.5 + luck * 1.2 };
        const can = this.PERKS.filter(p => (run.perks[p.id] || 0) < p.max);
        const out = [];
        for (let k = 0; k < 3 && can.length; k++) {
            let tot = 0;
            for (const p of can) tot += W[p.rarity] / Math.max(1, can.filter(q => q.rarity === p.rarity).length);
            let r = R() * tot, chosen = can[0];
            for (const p of can) { r -= W[p.rarity] / Math.max(1, can.filter(q => q.rarity === p.rarity).length); if (r <= 0) { chosen = p; break; } }
            out.push(chosen);
            can.splice(can.indexOf(chosen), 1);
        }
        run.offer = out;
        return out;
    },

    reroll() {
        if (!this.run || this.run.rerolls <= 0) return null;
        this.run.rerolls--;
        return this.rollOffer();
    },

    // Взять перк: стопки, пересчёт модификаторов, мгновенные эффекты (сердца).
    take(id) {
        const run = this.run;
        const p = this.perk(id);
        if (!run || !p || (run.perks[id] || 0) >= p.max) return false;
        run.perks[id] = (run.perks[id] || 0) + 1;
        this.applyMods();
        if (p.fx.hearts) {
            Game.heartsMax = Math.max(1, Math.min(Game.heartsCap(), Game.heartsMax + p.fx.hearts));
            if (p.fx.hearts > 0) Game.heal(p.fx.hearts); else Game.hearts = Math.min(Game.hearts, Game.heartsMax);
        }
        if (p.fx.barrier) run.barrier += p.fx.barrier;
        if (p.fx.angel) run.angel = Game.mods.angel;
        if (typeof GameSword !== 'undefined' && GameSword.def) { const st = GameSword.staminaOf(GameSword.def); GameSword.staminaMax = st.max; GameSword.stamina = Math.min(GameSword.stamina + st.max * 0.5, st.max); }
        run.offer = null;
        GameAudio.play('unlock');
        return true;
    },

    // Следующая локация забега: другой биом (случайный, не текущий).
    nextBiome() {
        const run = this.run;
        const list = GameData.BIOMES.map(b => b.id).filter(id => id !== run.biome);
        run.biome = list[Math.floor(run.R() * list.length) % list.length];
        // Время суток локации: чем дальше, тем чаще закат и ночь.
        const r = run.R();
        run.time = r < Math.min(0.3, run.wave * 0.012) ? 'night' : r < Math.min(0.55, 0.15 + run.wave * 0.015) ? 'sunset' : 'day';
        return run.biome;
    },

    // Кадр забега: таймеры легендарных перков (меч-близнец, безумие, неутомимость).
    update(dt) {
        const run = this.run, m = Game.mods;
        if (!run || !Game.running || Game.state !== 'play') return;
        if (run.frenzyT > 0) { run.frenzyT -= dt; if (run.frenzyT <= 0) run.frenzy = 0; }
        if (run.tirelessT > 0) run.tirelessT -= dt;
        if (m.clone) {
            run.cloneT -= dt;
            if (run.cloneT <= 0) { run.cloneT = m.clone; Game.cloneCut(); }
        }
    },

    // Итог забега: лучшая волна, монеты. Возвращает данные для экрана результата.
    finish() {
        const run = this.run, s = Game.save;
        const best = s.survivalBest || 0;
        const record = run.wave > best;
        if (record) s.survivalBest = run.wave;
        const bonus = run.wave * 10;
        return { survival: true, wave: run.wave, kills: Game.kills, coins: Game.runCoins + bonus, runCoins: Game.runCoins, bonus, best: Math.max(best, run.wave), record, biome: run.biome,
            perks: Object.keys(run.perks).map(id => ({ perk: this.perk(id), n: run.perks[id] })) };
    },
};
