// GameData.js — данные Obby Cut Master: биомы, мобы, мечи, стихии, 100 уровней.
// Чистые данные и генератор уровней без Babylon (тестируются в node). Числа баланса —
// здесь, а не в Constants.js: это таблицы, а не настройки рендера.

/** @typedef {{ ru: string, en: string }} LText */

/** @satisfies {Record<string, any>} */
const GameData = {
    // Блок мира Minecraft — 80 px; дорожка — 8 блоков.
    BLOCK: 80,

    // --- Биомы --------------------------------------------------------------------------------
    // light — свет дня (ключи World3D.setLighting); weather — частицы атмосферы GameWorld.
    BIOMES: [
        { id: 'plains', name: { ru: 'Равнины', en: 'Plains' }, ground: 3, color: '#62c13b',
          light: { sky: 0x8ec8f6, fog: 0.00016, sunColor: 0xfff1d6, sunIntensity: 0.85, skyIntensity: 0.5, skyLight: 0xbfe0ff, groundLight: 0xb6c99a, shadowColor: 0x1d3f5a },
          weather: 'pollen', music: 'plains', pool: ['noob', 'zombie', 'bacon', 'guest'], boss: 'boss_king' },
        { id: 'desert', name: { ru: 'Пустыня', en: 'Desert' }, ground: 4, color: '#e8c25a',
          light: { sky: 0xa8d4f2, fog: 0.00019, sunColor: 0xffe6b0, sunIntensity: 0.95, skyIntensity: 0.45, skyLight: 0xd8e6f0, groundLight: 0xe0c78a, shadowColor: 0x5a3a1d },
          weather: 'sand', music: 'desert', pool: ['zombie', 'mummy', 'skeleton', 'guest', 'tnt'], boss: 'boss_pharaoh' },
        { id: 'birch', name: { ru: 'Берёзовый лес', en: 'Birch Forest' }, ground: 5, color: '#9bd36a',
          light: { sky: 0x9fd2ee, fog: 0.0002, sunColor: 0xfff4dc, sunIntensity: 0.8, skyIntensity: 0.52, skyLight: 0xcdeaff, groundLight: 0x9fbf7a, shadowColor: 0x1f4a3a },
          weather: 'leaves', music: 'birch', pool: ['bacon', 'slime', 'ninja', 'ghost', 'zombie', 'skeleton'], boss: 'boss_guardian' },
        { id: 'taiga', name: { ru: 'Снежная тайга', en: 'Snowy Taiga' }, ground: 6, color: '#dff3ff',
          light: { sky: 0xb9d7ea, fog: 0.00026, sunColor: 0xeaf4ff, sunIntensity: 0.75, skyIntensity: 0.6, skyLight: 0xe2f0ff, groundLight: 0xd8e6f2, shadowColor: 0x2a4c78 },
          weather: 'snow', music: 'taiga', pool: ['snowman', 'knight', 'skeleton', 'zombie', 'ninja', 'slime'], boss: 'boss_yeti' },
        { id: 'jungle', name: { ru: 'Джунгли', en: 'Jungle' }, ground: 7, color: '#2fae3a',
          light: { sky: 0x86c9d9, fog: 0.00027, sunColor: 0xfff0c2, sunIntensity: 0.8, skyIntensity: 0.5, skyLight: 0xc4f0d8, groundLight: 0x7fb069, shadowColor: 0x0f3b2a },
          weather: 'fireflies', music: 'jungle', pool: ['pirate', 'brute', 'ninja', 'slime', 'tnt', 'ghost'], boss: 'boss_chief' },
        { id: 'mushroom', name: { ru: 'Грибные поля', en: 'Mushroom Fields' }, ground: 8, color: '#b07fd8',
          light: { sky: 0xc7b2e8, fog: 0.00024, sunColor: 0xffe2f2, sunIntensity: 0.8, skyIntensity: 0.55, skyLight: 0xead8ff, groundLight: 0xb39ac8, shadowColor: 0x3d2257 },
          weather: 'spores', music: 'mushroom', pool: ['wizard', 'alien', 'slime', 'ghost', 'bacon', 'brute'], boss: 'boss_shroom' },
        { id: 'badlands', name: { ru: 'Бесплодные земли', en: 'Badlands' }, ground: 9, color: '#d9733a',
          light: { sky: 0xf1c79a, fog: 0.00022, sunColor: 0xffd29a, sunIntensity: 0.95, skyIntensity: 0.42, skyLight: 0xffe0bf, groundLight: 0xd99a6a, shadowColor: 0x5a2410 },
          weather: 'sand', music: 'badlands', pool: ['robot', 'pirate', 'guest', 'tnt', 'skeleton', 'slender', 'knight'], boss: 'boss_outlaw' },
        { id: 'nether', name: { ru: 'Незер', en: 'Nether' }, ground: 10, color: '#c2331f',
          light: { sky: 0x5a1612, fog: 0.00042, sunColor: 0xff9a5a, sunIntensity: 0.75, skyIntensity: 0.55, skyLight: 0xff8a6a, groundLight: 0x8a2a1a, shadowColor: 0x2a0806 },
          weather: 'embers', music: 'nether', pool: ['lava', 'pumpkin', 'skeleton', 'ghost', 'brute', 'wizard', 'tnt'], boss: 'boss_demon' },
        { id: 'end', name: { ru: 'Энд', en: 'The End' }, ground: 11, color: '#7a4fc9',
          light: { sky: 0x1c1430, fog: 0.00034, sunColor: 0xe6d6ff, sunIntensity: 0.7, skyIntensity: 0.6, skyLight: 0xb59aff, groundLight: 0x6a5a8a, shadowColor: 0x10082a },
          weather: 'endmotes', music: 'end', pool: ['slender', 'alien', 'ghost', 'robot', 'wizard', 'ninja', 'knight'], boss: 'boss_voidlord' },
        { id: 'sky', name: { ru: 'Небесное королевство', en: 'Sky Kingdom' }, ground: 12, color: '#ffd84a',
          light: { sky: 0x9fdcff, fog: 0.00014, sunColor: 0xfff6dc, sunIntensity: 0.95, skyIntensity: 0.6, skyLight: 0xe8f6ff, groundLight: 0xf2ead2, shadowColor: 0x3a5a8a },
          weather: 'sparkle', music: 'sky', pool: ['knight', 'robot', 'wizard', 'slender', 'brute', 'lava', 'alien', 'ninja'], boss: 'boss_titan' },
    ],

    // Время суток уровня — множители к свету биома (GameWorld смешивает).
    TIMES: {
        day: { sky: 1, sun: 1, ambient: 1, tint: null },
        sunset: { sky: 0.85, sun: 0.9, ambient: 0.85, tint: 0xff9a5a },
        night: { sky: 0.32, sun: 0.45, ambient: 0.62, tint: 0x3a4a9a },
    },

    // --- Стихии мечей -------------------------------------------------------------------------
    ELEMENTS: {
        none: { color: '#e8eef5', name: { ru: 'Сталь', en: 'Steel' }, desc: { ru: 'Надёжный клинок без особых свойств.', en: 'A trusty blade with no special power.' } },
        crit: { color: '#ffe066', name: { ru: 'Крит', en: 'Crit' }, desc: { ru: '25% шанс нанести тройной урон.', en: '25% chance to deal triple damage.' } },
        poison: { color: '#7dff4a', name: { ru: 'Яд', en: 'Poison' }, desc: { ru: 'Отравляет: урон со временем.', en: 'Poisons: damage over time.' } },
        gold: { color: '#ffcf33', name: { ru: 'Золото', en: 'Gold' }, desc: { ru: '+60% монет за врагов.', en: '+60% coins from enemies.' } },
        fire: { color: '#ff7a1a', name: { ru: 'Огонь', en: 'Fire' }, desc: { ru: 'Поджигает врагов.', en: 'Sets enemies on fire.' } },
        ice: { color: '#7fe3ff', name: { ru: 'Лёд', en: 'Ice' }, desc: { ru: 'Замедляет и замораживает.', en: 'Slows and freezes.' } },
        wind: { color: '#c8fff0', name: { ru: 'Ветер', en: 'Wind' }, desc: { ru: 'Отбрасывает врагов назад.', en: 'Knocks enemies back.' } },
        water: { color: '#3aa0ff', name: { ru: 'Вода', en: 'Water' }, desc: { ru: 'Волна отбрасывает и замедляет.', en: 'A wave pushes back and slows.' } },
        nature: { color: '#5fd94a', name: { ru: 'Природа', en: 'Nature' }, desc: { ru: 'Лозы обездвиживают врага.', en: 'Vines root the enemy.' } },
        candy: { color: '#ff7ab8', name: { ru: 'Сладость', en: 'Candy' }, desc: { ru: 'Замедляет, враги роняют больше монет.', en: 'Slows; enemies drop extra coins.' } },
        crush: { color: '#c9a27a', name: { ru: 'Дробление', en: 'Crush' }, desc: { ru: 'Двойной урон по броне.', en: 'Double damage to armor.' } },
        lightning: { color: '#ffee55', name: { ru: 'Молния', en: 'Lightning' }, desc: { ru: 'Разряд перескакивает на соседей.', en: 'Bolts chain to nearby enemies.' } },
        explode: { color: '#ff4a2a', name: { ru: 'Взрыв', en: 'Explosion' }, desc: { ru: 'Финальный удар взрывается.', en: 'The final slash explodes.' } },
        void: { color: '#b45cff', name: { ru: 'Пустота', en: 'Void' }, desc: { ru: 'Притягивает врагов к цели.', en: 'Pulls enemies to the target.' } },
        holy: { color: '#fff3a8', name: { ru: 'Свет', en: 'Holy' }, desc: { ru: 'Столп света, x1.5 по нежити.', en: 'Pillar of light, x1.5 vs undead.' } },
        vampire: { color: '#ff2a4a', name: { ru: 'Вампиризм', en: 'Vampire' }, desc: { ru: 'Убийства восстанавливают сердца.', en: 'Kills restore hearts.' } },
        split: { color: '#9fe8ff', name: { ru: 'Тройной бросок', en: 'Triple Throw' }, desc: { ru: 'Бросает сразу три меча.', en: 'Throws three swords at once.' } },
        pierce: { color: '#bfe6ff', name: { ru: 'Пронзание', en: 'Pierce' }, desc: { ru: 'Рубит всех на пути.', en: 'Cuts everyone in its path.' } },
        giant: { color: '#d0d0d0', name: { ru: 'Громадина', en: 'Giant' }, desc: { ru: 'Огромный клинок бьёт по площади.', en: 'A huge blade hits an area.' } },
        laser: { color: '#3affea', name: { ru: 'Лазер', en: 'Laser' }, desc: { ru: 'Каждый удар стреляет лучом.', en: 'Each slash fires a beam.' } },
        shadow: { color: '#8a5cff', name: { ru: 'Тень', en: 'Shadow' }, desc: { ru: '+2 удара за бросок.', en: '+2 slashes per throw.' } },
        meteor: { color: '#ff6a2a', name: { ru: 'Метеор', en: 'Meteor' }, desc: { ru: 'На цель падает метеорит.', en: 'A meteor strikes the target.' } },
        glitch: { color: '#ff3aff', name: { ru: 'Глитч', en: 'Glitch' }, desc: { ru: '15% шанс стереть врага.', en: '15% chance to erase an enemy.' } },
        rainbow: { color: '#ff5ad1', name: { ru: 'Радуга', en: 'Rainbow' }, desc: { ru: 'Случайная стихия на каждый удар.', en: 'A random element every slash.' } },
        chainsaw: { color: '#ffb02a', name: { ru: 'Пила', en: 'Chainsaw' }, desc: { ru: 'Вдвое больше ударов.', en: 'Twice as many slashes.' } },
        cosmic: { color: '#6a8cff', name: { ru: 'Космос', en: 'Cosmic' }, desc: { ru: 'Притяжение и звездопад.', en: 'Gravity pull and starfall.' } },
        solar: { color: '#ffb52a', name: { ru: 'Солнце', en: 'Solar' }, desc: { ru: 'Свет и огонь сразу.', en: 'Light and fire at once.' } },
        lunar: { color: '#cfe0ff', name: { ru: 'Луна', en: 'Lunar' }, desc: { ru: 'Лёд и пустота сразу.', en: 'Ice and void at once.' } },
        infinity: { color: '#ffffff', name: { ru: 'Бесконечность', en: 'Infinity' }, desc: { ru: 'Все стихии по очереди и мегавзрыв.', en: 'Every element in turn and a mega blast.' } },
    },

    // Простые стихии, из которых rainbow выбирает случайную.
    RAINBOW_POOL: ['fire', 'ice', 'poison', 'lightning', 'wind', 'void', 'holy', 'crit'],
    INFINITY_CYCLE: ['fire', 'ice', 'lightning', 'void', 'holy', 'poison', 'crit'],

    RARITY: {
        common: { color: '#b8c4cf', name: { ru: 'Обычный', en: 'Common' } },
        rare: { color: '#4aa8ff', name: { ru: 'Редкий', en: 'Rare' } },
        epic: { color: '#b45cff', name: { ru: 'Эпический', en: 'Epic' } },
        legendary: { color: '#ffb02a', name: { ru: 'Легендарный', en: 'Legendary' } },
        mythic: { color: '#ff3a6a', name: { ru: 'Мифический', en: 'Mythic' } },
    },

    // --- Мечи --------------------------------------------------------------------------------
    // dmg — урон удара; hits — ударов за бросок; speed — px/с полёта; size — масштаб модели;
    // level — с какого уровня продаётся; price — монет (0 — сразу); ads — открывается за N просмотров рекламы
    // (пауза SWORD_AD_COOLDOWN между просмотрами); boss — трофей босса (не продаётся).
    SWORDS: [
        { id: 'wood', name: { ru: 'Деревянный меч', en: 'Wooden Sword' }, rarity: 'common', element: 'none', dmg: 10, hits: 3, speed: 1900, size: 1, level: 1, price: 0 },
        { id: 'stone', name: { ru: 'Каменный меч', en: 'Stone Sword' }, rarity: 'common', element: 'none', dmg: 13, hits: 3, speed: 1950, size: 1, level: 2, price: 150 },
        { id: 'iron', name: { ru: 'Железный меч', en: 'Iron Sword' }, rarity: 'common', element: 'none', dmg: 16, hits: 3, speed: 2050, size: 1, level: 3, price: 0, ads: 2 },
        { id: 'bone', name: { ru: 'Костяной меч', en: 'Bone Sword' }, rarity: 'common', element: 'crit', dmg: 15, hits: 3, speed: 2050, size: 1, level: 5, price: 700 },
        { id: 'cactus', name: { ru: 'Кактусовый меч', en: 'Cactus Sword' }, rarity: 'common', element: 'poison', dmg: 15, hits: 4, speed: 2000, size: 1, level: 7, price: 0, ads: 2 },
        { id: 'gold', name: { ru: 'Золотой меч', en: 'Golden Sword' }, rarity: 'rare', element: 'gold', dmg: 20, hits: 3, speed: 2150, size: 1, level: 10, price: 0, boss: 'boss_king' },
        { id: 'diamond', name: { ru: 'Алмазный меч', en: 'Diamond Sword' }, rarity: 'rare', element: 'crit', dmg: 24, hits: 4, speed: 2150, size: 1, level: 12, price: 2200 },
        { id: 'emerald', name: { ru: 'Изумрудный меч', en: 'Emerald Sword' }, rarity: 'rare', element: 'poison', dmg: 24, hits: 4, speed: 2100, size: 1, level: 14, price: 0, ads: 3 },
        { id: 'flame', name: { ru: 'Пламенный меч', en: 'Flame Sword' }, rarity: 'rare', element: 'fire', dmg: 25, hits: 4, speed: 2150, size: 1, level: 16, price: 3200 },
        { id: 'frost', name: { ru: 'Морозный меч', en: 'Frost Sword' }, rarity: 'rare', element: 'ice', dmg: 26, hits: 4, speed: 2150, size: 1, level: 40, price: 0, boss: 'boss_yeti' },
        { id: 'wind', name: { ru: 'Меч ветра', en: 'Wind Sword' }, rarity: 'rare', element: 'wind', dmg: 25, hits: 4, speed: 2400, size: 1, level: 18, price: 0, ads: 3 },
        { id: 'wave', name: { ru: 'Клинок волны', en: 'Wave Blade' }, rarity: 'rare', element: 'water', dmg: 27, hits: 4, speed: 2200, size: 1, level: 21, price: 4500 },
        { id: 'leaf', name: { ru: 'Лиственный меч', en: 'Leaf Sword' }, rarity: 'rare', element: 'nature', dmg: 28, hits: 4, speed: 2200, size: 1, level: 30, price: 0, boss: 'boss_guardian' },
        { id: 'candy', name: { ru: 'Леденцовый меч', en: 'Candy Sword' }, rarity: 'rare', element: 'candy', dmg: 28, hits: 4, speed: 2200, size: 1, level: 24, price: 0, ads: 3 },
        { id: 'pickaxe', name: { ru: 'Кирка-меч', en: 'Pickaxe Sword' }, rarity: 'rare', element: 'crush', dmg: 30, hits: 4, speed: 2100, size: 1.05, level: 27, price: 6000 },
        { id: 'thunder', name: { ru: 'Громовой меч', en: 'Thunder Sword' }, rarity: 'epic', element: 'lightning', dmg: 34, hits: 4, speed: 2350, size: 1, level: 50, price: 0, boss: 'boss_chief' },
        { id: 'tnt', name: { ru: 'ТНТ-меч', en: 'TNT Sword' }, rarity: 'epic', element: 'explode', dmg: 32, hits: 4, speed: 2200, size: 1, level: 31, price: 8000 },
        { id: 'ender', name: { ru: 'Эндер-меч', en: 'Ender Sword' }, rarity: 'epic', element: 'void', dmg: 34, hits: 4, speed: 2300, size: 1, level: 33, price: 0, ads: 5 },
        { id: 'angel', name: { ru: 'Ангельский меч', en: 'Angel Sword' }, rarity: 'epic', element: 'holy', dmg: 35, hits: 4, speed: 2300, size: 1, level: 35, price: 10500 },
        { id: 'vampire', name: { ru: 'Вампирский меч', en: 'Vampire Sword' }, rarity: 'epic', element: 'vampire', dmg: 36, hits: 4, speed: 2300, size: 1, level: 37, price: 0, ads: 4 },
        { id: 'twin', name: { ru: 'Близнецы', en: 'Twin Blades' }, rarity: 'epic', element: 'split', dmg: 30, hits: 3, speed: 2400, size: 0.9, level: 39, price: 13500 },
        { id: 'ghost', name: { ru: 'Призрачный меч', en: 'Ghost Sword' }, rarity: 'epic', element: 'pierce', dmg: 36, hits: 4, speed: 2500, size: 1, level: 20, price: 0, boss: 'boss_pharaoh' },
        { id: 'buster', name: { ru: 'Громадный меч', en: 'Buster Sword' }, rarity: 'epic', element: 'giant', dmg: 44, hits: 3, speed: 1900, size: 1.7, level: 42, price: 0, ads: 5 },
        { id: 'laser', name: { ru: 'Лазерный меч', en: 'Laser Sword' }, rarity: 'epic', element: 'laser', dmg: 38, hits: 4, speed: 2600, size: 1, level: 44, price: 16500 },
        { id: 'obsidian', name: { ru: 'Обсидиановый меч', en: 'Obsidian Sword' }, rarity: 'epic', element: 'void', dmg: 42, hits: 4, speed: 2200, size: 1.05, level: 46, price: 0, ads: 4 },
        { id: 'magma', name: { ru: 'Магмовый тесак', en: 'Magma Cleaver' }, rarity: 'legendary', element: 'fire', dmg: 50, hits: 5, speed: 2300, size: 1.15, level: 51, price: 24000 },
        { id: 'crystal', name: { ru: 'Кристальный меч', en: 'Crystal Sword' }, rarity: 'legendary', element: 'crit', dmg: 52, hits: 5, speed: 2400, size: 1, level: 54, price: 0, ads: 6 },
        { id: 'dragon', name: { ru: 'Драконий меч', en: 'Dragon Sword' }, rarity: 'legendary', element: 'fire', dmg: 55, hits: 5, speed: 2400, size: 1.1, level: 57, price: 30000 },
        { id: 'shadow', name: { ru: 'Теневая катана', en: 'Shadow Katana' }, rarity: 'legendary', element: 'shadow', dmg: 50, hits: 5, speed: 2700, size: 1.05, level: 62, price: 0, ads: 6 },
        { id: 'meteor', name: { ru: 'Метеоритный меч', en: 'Meteor Sword' }, rarity: 'legendary', element: 'meteor', dmg: 56, hits: 4, speed: 2300, size: 1.1, level: 70, price: 0, boss: 'boss_outlaw' },
        { id: 'glitch', name: { ru: 'Глитч-меч', en: 'Glitch Sword' }, rarity: 'legendary', element: 'glitch', dmg: 54, hits: 5, speed: 2600, size: 1, level: 65, price: 38000 },
        { id: 'rainbow', name: { ru: 'Радужный меч', en: 'Rainbow Sword' }, rarity: 'legendary', element: 'rainbow', dmg: 56, hits: 5, speed: 2500, size: 1, level: 60, price: 0, boss: 'boss_shroom' },
        { id: 'chainsaw', name: { ru: 'Бензомеч', en: 'Chainsaw Sword' }, rarity: 'legendary', element: 'chainsaw', dmg: 34, hits: 5, speed: 2200, size: 1.1, level: 68, price: 0, ads: 6 },
        { id: 'galaxy', name: { ru: 'Галактический меч', en: 'Galaxy Sword' }, rarity: 'mythic', element: 'cosmic', dmg: 78, hits: 5, speed: 2600, size: 1.15, level: 90, price: 0, boss: 'boss_voidlord' },
        { id: 'solar', name: { ru: 'Солнечный клинок', en: 'Solar Blade' }, rarity: 'mythic', element: 'solar', dmg: 72, hits: 5, speed: 2600, size: 1.15, level: 72, price: 55000 },
        { id: 'lunar', name: { ru: 'Лунная грань', en: 'Lunar Edge' }, rarity: 'mythic', element: 'lunar', dmg: 74, hits: 5, speed: 2600, size: 1.15, level: 76, price: 0, ads: 7 },
        { id: 'demon', name: { ru: 'Демонический клинок', en: 'Demon Blade' }, rarity: 'mythic', element: 'vampire', dmg: 82, hits: 5, speed: 2600, size: 1.2, level: 80, price: 0, boss: 'boss_demon' },
        { id: 'excalibur', name: { ru: 'Экскалибур', en: 'Excalibur' }, rarity: 'mythic', element: 'holy', dmg: 85, hits: 5, speed: 2700, size: 1.2, level: 84, price: 72000 },
        { id: 'prism', name: { ru: 'Призма', en: 'Prism' }, rarity: 'mythic', element: 'laser', dmg: 88, hits: 5, speed: 2800, size: 1.15, level: 88, price: 0, ads: 7 },
        { id: 'infinity', name: { ru: 'Меч бесконечности', en: 'Infinity Blade' }, rarity: 'mythic', element: 'infinity', dmg: 110, hits: 6, speed: 2900, size: 1.25, level: 100, price: 0, boss: 'boss_titan' },
    ],

    // --- Мобы --------------------------------------------------------------------------------
    // hp — на 1 уровне; speed — px/с; armor — вычитается из каждого удара (crush пробивает);
    // ai: walk | run | dash | hop | teleport | float | ranged | exploder | healer;
    // immune — стихии без эффекта; undead — x1.5 от holy; coins — монет за убийство.
    MOBS: {
        noob: { name: { ru: 'Нуб', en: 'Noob' }, ab: ['panic'], desc: { ru: 'Без руки в панике бежит быстрее.', en: 'Runs faster in panic after losing an arm.' }, hp: 24, speed: 105, clip: 'walk', ai: 'walk', coins: 3 },
        zombie: { name: { ru: 'Зомби', en: 'Zombie' }, ab: ['crawl'], desc: { ru: 'Без ног ползёт дальше — режь голову!', en: 'Keeps crawling without legs — go for the head!' }, hp: 30, speed: 85, clip: 'zombie_walk', ai: 'walk', coins: 3, undead: true },
        bacon: { name: { ru: 'Бекон', en: 'Bacon' }, ab: ['rage'], desc: { ru: 'После первого разреза злится и ускоряется.', en: 'Gets angry and speeds up after the first cut.' }, hp: 30, speed: 115, clip: 'walk', ai: 'walk', coins: 4 },
        guest: { name: { ru: 'Гость', en: 'Guest' }, ab: ['sprint'], desc: { ru: 'Быстрый, бежит зигзагом.', en: 'Fast, runs in a zigzag.' }, hp: 20, speed: 190, clip: 'run', ai: 'run', coins: 4 },
        mummy: { name: { ru: 'Мумия', en: 'Mummy' }, ab: ['regen'], desc: { ru: 'Бинты отращивают отрубленное за 3 секунды.', en: 'Bandages regrow cut parts in 3 seconds.' }, hp: 48, speed: 80, clip: 'zombie_walk', ai: 'walk', coins: 5, undead: true },
        skeleton: { name: { ru: 'Скелет', en: 'Skeleton' }, ab: ['ranged'], desc: { ru: 'Кидает кости — разрубай их на лету.', en: 'Throws bones — slice them mid-air.' }, hp: 26, speed: 100, clip: 'walk', ai: 'ranged', coins: 5, undead: true, shot: 'bone' },
        tnt: { name: { ru: 'Подрывник', en: 'Bomber' }, ab: ['fuse'], desc: { ru: 'Вблизи поджигает фитиль и бежит. Разрежь — взорвётся на своих.', en: 'Lights the fuse up close. Cut it — it blows up its friends.' }, hp: 22, speed: 170, clip: 'run', ai: 'exploder', coins: 5 },
        slime: { name: { ru: 'Слайм', en: 'Slime' }, ab: ['split','hop'], desc: { ru: 'Прыгает и делится на двух малышей.', en: 'Hops and splits into two minis.' }, hp: 36, speed: 120, clip: 'hop', ai: 'hop', coins: 4 },
        ninja: { name: { ru: 'Ниндзя', en: 'Ninja' }, ab: ['dodge'], desc: { ru: 'Уворачивается от меча — обмани его.', en: 'Dodges your sword — trick him.' }, hp: 28, speed: 175, clip: 'ninja_run', ai: 'dash', coins: 6 },
        ghost: { name: { ru: 'Призрак', en: 'Ghost' }, ab: ['phase'], desc: { ru: 'То исчезает, то появляется: режь, пока видно.', en: 'Fades in and out: cut while solid.' }, hp: 30, speed: 120, clip: 'float', ai: 'float', coins: 5, undead: true, fly: 70 },
        snowman: { name: { ru: 'Снеговик', en: 'Snowman' }, ab: ['ranged','freezeShot'], desc: { ru: 'Снежок замораживает меч.', en: 'Snowballs freeze your sword.' }, hp: 38, speed: 90, clip: 'walk', ai: 'ranged', coins: 6, immune: ['ice'], shot: 'snowball' },
        knight: { name: { ru: 'Рыцарь', en: 'Knight' }, ab: ['shield'], desc: { ru: 'Щит блокирует удары — сначала сруби щит.', en: 'Shield blocks hits — chop the shield first.' }, hp: 60, speed: 90, clip: 'walk', ai: 'walk', coins: 8, armor: 5 },
        pirate: { name: { ru: 'Пират', en: 'Pirate' }, ab: ['leap'], desc: { ru: 'Прыгает вперёд рывками.', en: 'Leaps forward in bursts.' }, hp: 34, speed: 165, clip: 'run', ai: 'run', coins: 6 },
        brute: { name: { ru: 'Громила', en: 'Brute' }, ab: ['stomp'], desc: { ru: 'Топает и выбивает меч из рук.', en: 'Stomps and knocks the sword away.' }, hp: 140, speed: 70, clip: 'walk', ai: 'walk', coins: 12, scale: 1.25 },
        wizard: { name: { ru: 'Колдун', en: 'Wizard' }, ab: ['healer','bubble'], desc: { ru: 'Лечит своих и ставит пузыри-щиты.', en: 'Heals allies and casts bubble shields.' }, hp: 45, speed: 85, clip: 'walk', ai: 'healer', coins: 9 },
        alien: { name: { ru: 'Пришелец', en: 'Alien' }, ab: ['blink','ranged'], desc: { ru: 'Телепортируется и стреляет плазмой.', en: 'Teleports and shoots plasma.' }, hp: 40, speed: 110, clip: 'walk', ai: 'teleport', coins: 8 },
        robot: { name: { ru: 'Робот', en: 'Robot' }, ab: ['armor2'], desc: { ru: 'Броня: каждую часть режь дважды.', en: 'Armored: cut each part twice.' }, hp: 80, speed: 85, clip: 'walk', ai: 'walk', coins: 10, armor: 7 },
        slender: { name: { ru: 'Слендер', en: 'Slender' }, ab: ['blink','phase'], desc: { ru: 'Исчезает и появляется ближе.', en: 'Vanishes and reappears closer.' }, hp: 44, speed: 95, clip: 'walk', ai: 'teleport', coins: 9 },
        pumpkin: { name: { ru: 'Тыквоголовый', en: 'Pumpkin Head' }, ab: ['headless'], desc: { ru: 'Без головы бегает ещё пару секунд.', en: 'Runs headless for a few seconds.' }, hp: 42, speed: 110, clip: 'walk', ai: 'walk', coins: 7, immune: ['fire'] },
        lava: { name: { ru: 'Лавовый голем', en: 'Lava Golem' }, ab: ['magma','armor2'], desc: { ru: 'При разрезе плюётся огнём.', en: 'Spits fire when cut.' }, hp: 110, speed: 75, clip: 'walk', ai: 'walk', coins: 12, armor: 6, immune: ['fire'], scale: 1.15 },
        // Боссы: масштаб 2.3–3, фазы (призыв, рык, удар по земле).
        boss_king: { name: { ru: 'Король Нубов', en: 'Noob King' }, ab: ['summon','stomp'], desc: { ru: 'Зовёт стражу и топает.', en: 'Summons guards and stomps.' }, hp: 700, speed: 55, clip: 'walk', ai: 'boss', coins: 150, scale: 2.4, boss: true, minions: ['noob', 'bacon'] },
        boss_pharaoh: { name: { ru: 'Фараон', en: 'Pharaoh' }, ab: ['summon','regen'], desc: { ru: 'Отращивает части и поднимает мумий.', en: 'Regrows parts and raises mummies.' }, hp: 1100, speed: 55, clip: 'walk', ai: 'boss', coins: 220, scale: 2.4, boss: true, undead: true, minions: ['mummy', 'skeleton'] },
        boss_guardian: { name: { ru: 'Лесной страж', en: 'Forest Guardian' }, ab: ['armor2','stomp'], desc: { ru: 'Деревянная броня, удары по земле.', en: 'Wooden armor, ground slams.' }, hp: 1500, speed: 50, clip: 'walk', ai: 'boss', coins: 300, scale: 2.6, boss: true, armor: 4, minions: ['slime', 'ninja'] },
        boss_yeti: { name: { ru: 'Йети', en: 'Yeti' }, ab: ['freezeRoar','ranged'], desc: { ru: 'Рёв замораживает меч, кидает снежки.', en: 'Roar freezes your sword, throws snowballs.' }, hp: 1900, speed: 60, clip: 'walk', ai: 'boss', coins: 380, scale: 2.6, boss: true, immune: ['ice'], minions: ['snowman', 'knight'] },
        boss_chief: { name: { ru: 'Вождь джунглей', en: 'Jungle Chief' }, ab: ['leap','ranged'], desc: { ru: 'Прыгает и мечет копья.', en: 'Leaps and throws spears.' }, hp: 2400, speed: 60, clip: 'walk', ai: 'boss', coins: 460, scale: 2.5, boss: true, minions: ['pirate', 'ninja'] },
        boss_shroom: { name: { ru: 'Грибной король', en: 'Mushroom King' }, ab: ['bubble','summon'], desc: { ru: 'Прячет свиту в пузыри.', en: 'Shields his court in bubbles.' }, hp: 2900, speed: 50, clip: 'walk', ai: 'boss', coins: 540, scale: 2.6, boss: true, minions: ['slime', 'wizard'] },
        boss_outlaw: { name: { ru: 'Бандит', en: 'Outlaw' }, ab: ['dodge','ranged'], desc: { ru: 'Уворачивается и стреляет.', en: 'Dodges and shoots.' }, hp: 3500, speed: 65, clip: 'walk', ai: 'boss', coins: 640, scale: 2.5, boss: true, armor: 6, minions: ['guest', 'robot'] },
        boss_demon: { name: { ru: 'Демон', en: 'Demon' }, ab: ['magma','phase'], desc: { ru: 'Огонь при разрезе, уходит в тень.', en: 'Fire when cut, slips into shadow.' }, hp: 4300, speed: 55, clip: 'walk', ai: 'boss', coins: 760, scale: 2.8, boss: true, immune: ['fire'], minions: ['lava', 'pumpkin'] },
        boss_voidlord: { name: { ru: 'Повелитель пустоты', en: 'Void Lord' }, ab: ['blink','phase'], desc: { ru: 'Телепорт и неосязаемость.', en: 'Teleports and phases out.' }, hp: 5200, speed: 55, clip: 'walk', ai: 'boss', coins: 900, scale: 2.8, boss: true, armor: 6, minions: ['slender', 'alien'] },
        boss_titan: { name: { ru: 'Титан', en: 'Titan' }, ab: ['shield','armor2','stomp'], desc: { ru: 'Щит, броня и землетрясение.', en: 'Shield, armor and earthquake.' }, hp: 7000, speed: 50, clip: 'walk', ai: 'boss', coins: 1500, scale: 3, boss: true, armor: 9, minions: ['knight', 'robot', 'brute'] },
    },

    // Модификаторы врагов на уровне (особые волны).
    VARIANTS: {
        golden: { name: { ru: 'Золотой', en: 'Golden' }, hp: 1.8, speed: 1, coins: 4, scale: 1.05 },
        giant: { name: { ru: 'Гигант', en: 'Giant' }, hp: 3.2, speed: 0.75, coins: 3, scale: 1.7 },
        mini: { name: { ru: 'Малыш', en: 'Mini' }, hp: 0.5, speed: 1.45, coins: 0.7, scale: 0.65 },
        swift: { name: { ru: 'Шустрый', en: 'Swift' }, hp: 0.8, speed: 1.6, coins: 1.3, scale: 0.9, ab: ['sprint'] },
        bubbled: { name: { ru: 'В пузыре', en: 'Bubbled' }, hp: 1, speed: 1, coins: 1.5, scale: 1, ab: ['bubbleStart'] },
        regen: { name: { ru: 'Живучий', en: 'Regenerating' }, hp: 1.3, speed: 1, coins: 1.6, scale: 1.05, ab: ['regen'] },
        armored: { name: { ru: 'В броне', en: 'Armored' }, hp: 1.4, speed: 0.9, coins: 1.8, scale: 1.08, ab: ['armor2'] },
    },

    SWORD_AD_COOLDOWN: 12,          // с между просмотрами рекламы за меч

    LEVELS_PER_BIOME: 10,
    LEVEL_COUNT: 100,

    // Темы уровней внутри биома: номер в биоме (1..10) -> тема.
    THEMES: [
        { key: 'intro', name: { ru: 'Новые гости', en: 'New Guests' } },
        { key: 'path', name: { ru: 'Тропа', en: 'The Path' } },
        { key: 'pack', name: { ru: 'Стая', en: 'The Pack' } },
        { key: 'dusk', name: { ru: 'Закат', en: 'Dusk' } },
        { key: 'horde', name: { ru: 'Орда', en: 'Horde' } },
        { key: 'night', name: { ru: 'Ночная смена', en: 'Night Shift' } },
        { key: 'elite', name: { ru: 'Золотая лихорадка', en: 'Gold Rush' } },
        { key: 'blast', name: { ru: 'Минное поле', en: 'Minefield' } },
        { key: 'giant', name: { ru: 'Гигант', en: 'The Giant' } },
        { key: 'boss', name: { ru: 'Логово босса', en: 'Boss Lair' } },
    ],

    // Детерминированный ГСЧ (mulberry32) — у каждого уровня свой сид.
    rng(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },

    // Уровень n (1..100) -> описание: биом, время суток, волны, реквизит, награда.
    level(n) {
        const N = Math.max(1, Math.min(this.LEVEL_COUNT, Math.round(n)));
        const bi = Math.floor((N - 1) / this.LEVELS_PER_BIOME);
        const k = (N - 1) % this.LEVELS_PER_BIOME;          // 0..9 внутри биома
        const biome = this.BIOMES[bi];
        const theme = this.THEMES[k];
        const R = this.rng(N * 7919 + 13);
        const pick = (arr) => arr[Math.floor(R() * arr.length) % arr.length];
        // Сила врагов растёт по всей игре, а внутри биома — заметнее к концу.
        const hpMul = 1 + (N - 1) * 0.055 + k * 0.03;
        const spMul = 1 + Math.min(0.45, (N - 1) * 0.004);
        // Новые в биоме — первые два вида пула; на intro они и идут первыми.
        const pool = biome.pool.slice();
        const fresh = pool.slice(0, 2);
        const prev = bi > 0 ? this.BIOMES[bi - 1].pool : ['noob'];
        const time = theme.key === 'dusk' ? 'sunset' : (theme.key === 'night' || (theme.key === 'giant' && bi % 2 === 1)) ? 'night' : (theme.key === 'blast' && bi >= 5 ? 'sunset' : 'day');
        /** @type {Array<{ delay: number, groups: Array<{ type: string, count: number, gap: number, variant?: string }> }>} */
        const waves = [];
        const base = 3 + Math.floor(bi * 0.9);
        // Модификаторы-варианты: чем дальше по игре, тем чаще (шустрый, в пузыре, живучий, в броне).
        const varPool = ['swift'].concat(bi >= 1 ? ['regen'] : [], bi >= 3 ? ['armored'] : [], bi >= 4 ? ['bubbled'] : []);
        const mod = (g) => { if (!g.variant && N > 4 && R() < Math.min(0.45, 0.12 + bi * 0.04)) g.variant = varPool[Math.floor(R() * varPool.length) % varPool.length]; return g; };
        const addWave = (delay, groups) => waves.push({ delay, groups: groups.map(mod) });
        if (N === 1) {
            // Первый уровень — мягкий старт, как в референсе: один зомби, потом пара.
            addWave(0.5, [{ type: 'zombie', count: 1, gap: 0 }]);
            addWave(1.2, [{ type: 'zombie', count: 2, gap: 2.4 }]);
        } else if (theme.key === 'boss') {
            addWave(0.5, [{ type: pick(pool), count: base, gap: 1.2 }]);
            addWave(1.5, [{ type: biome.boss, count: 1, gap: 0 }]);
        } else if (theme.key === 'intro') {
            addWave(0.5, [{ type: fresh[0], count: 2 + Math.floor(bi / 3), gap: 2.2 }]);
            addWave(1.5, [{ type: fresh[1], count: 2 + Math.floor(bi / 3), gap: 2 }, { type: pick(prev), count: 1 + Math.floor(bi / 2), gap: 1.8 }]);
        } else if (theme.key === 'horde') {
            const t = pick(pool);
            addWave(0.5, [{ type: t, count: base + 4, gap: 0.55, variant: 'mini' }]);
            addWave(1.2, [{ type: pick(pool), count: base + 3, gap: 0.6, variant: 'mini' }, { type: pick(pool), count: 2, gap: 1 }]);
        } else if (theme.key === 'elite') {
            addWave(0.5, [{ type: pick(pool), count: base, gap: 1.4 }]);
            addWave(1.2, [{ type: pick(pool), count: 2 + Math.floor(bi / 3), gap: 2, variant: 'golden' }, { type: pick(pool), count: 2, gap: 1.5 }]);
        } else if (theme.key === 'giant') {
            addWave(0.5, [{ type: pick(pool), count: base, gap: 1.2 }]);
            addWave(1.5, [{ type: fresh[Math.floor(R() * 2)], count: 1, gap: 0, variant: 'giant' }, { type: pick(pool), count: base - 1, gap: 1.3 }]);
            addWave(1.2, [{ type: pick(pool), count: 1 + Math.floor(bi / 4), gap: 2, variant: 'giant' }]);
        } else {
            const nWaves = 2 + (k >= 4 ? 1 : 0) + (bi >= 6 ? 1 : 0);
            for (let w = 0; w < nWaves; w++) {
                const groups = [{ type: pick(pool), count: base + Math.floor(w * 0.8) + Math.floor(R() * 2), gap: Math.max(0.6, 1.6 - bi * 0.07 - w * 0.1) }];
                if (w > 0 || bi > 1) groups.push({ type: pick(pool), count: 1 + Math.floor(R() * (2 + bi / 3)), gap: 1.4 });
                addWave(w === 0 ? 0.5 : 1.2, groups);
            }
        }
        // Реквизит дорожки — всё можно разрубить: TNT взрывается, сундук даёт монеты, ящик-сердце —
        // жизнь, ледяной кристалл замораживает врагов, громоотвод бьёт молниями.
        const props = [];
        if (theme.key === 'blast') { for (let i = 0; i < 4 + Math.floor(bi / 3); i++) props.push('tnt'); props.push('chest'); }
        else if (k % 3 === 1) props.push('chest');
        else if (k % 3 === 2 && N > 3) props.push('tnt', 'tnt');
        if (N >= 6 && (k === 3 || k === 7)) props.push('heart');
        if (N >= 12 && (k === 4 || k === 8)) props.push(R() < 0.5 ? 'ice' : 'bolt');
        if (theme.key === 'boss') props.push('heart', N >= 20 ? 'ice' : 'tnt');
        let mobs = 0;
        for (const w of waves) for (const g of w.groups) mobs += g.count;
        return {
            n: N, biome: biome.id, biomeIndex: bi, inBiome: k + 1, theme: theme.key,
            title: { ru: biome.name.ru + ': ' + theme.name.ru, en: biome.name.en + ': ' + theme.name.en },
            time, weather: biome.weather, waves, props, mobs, hpMul, spMul,
            boss: theme.key === 'boss' ? biome.boss : null,
            fresh: theme.key === 'intro' ? fresh : [],
            reward: Math.round(30 + N * 6 + (theme.key === 'boss' ? 120 + N * 4 : 0)),
            seed: N * 7919 + 13,
        };
    },

    sword(id) {
        return this.SWORDS.find(s => s.id === id) || this.SWORDS[0];
    },

    // Монеты за моба с учётом уровня.
    mobCoins(type, n, variant) {
        const m = this.MOBS[type];
        const v = variant ? this.VARIANTS[variant] : null;
        return Math.max(1, Math.round((m ? m.coins : 2) * (1 + (n - 1) * 0.05) * (v ? v.coins : 1)));
    },
};
