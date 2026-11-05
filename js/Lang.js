// Lang.js — тексты интерфейса игры (I18N). Все видимые строки — ключами в
// LANG_STRINGS, в коде — Lang.t('ключ', { имя: значение }) с подстановкой {имя},
// в разметке — атрибуты data-t="ключ" (текст), data-t-title, data-t-placeholder
// (Lang.apply() проставляет их после init и смены языка).
//
// Язык — GAME_LANG (Constants.js): сборка ставит ru для Яндекса и en для Playables.
// Видимого переключателя языка нет. LANG_AUTO = 1 — язык платформы (Platform.lang),
// если он есть в словаре. Нет строки в языке — английская, нет и её — сам ключ.
// Новая строка = ключ в ОБОИХ словарях.

const LANG_STRINGS = {
    ru: {
        'loading': 'Загрузка…',
        'loadingScene': 'Готовим первый кадр…',
        'loadingReady': 'Готово',
        'loadingFailed': 'Не удалось загрузить. Попробуйте ещё раз.',
        'loadingRetry': 'Повторить',
        'no3d': '3D недоступен: браузер без WebGL',
        // --- платформа (Pause.js, Platform.js) ---
        'platformPaused': 'Пауза',
        // --- Telegram: предупреждение об ориентации (PlatformTelegram.js) ---
        'orientTitle': 'Поверните устройство',
        'orientHint': 'Игра работает только в горизонтальной ориентации',
        // --- сборка test: тестовое окно рекламы (PlatformTest.js) ---
        'testAdTag': 'ТЕСТОВАЯ РЕКЛАМА',
        'testAdInter': 'Реклама между раундами',
        'testAdInterHint': 'Так игра ведёт себя после двух раундов. Закройте окно, когда будет готово.',
        'testAdRewarded': 'Реклама за награду',
        'testAdHint': 'Дождитесь конца и заберите награду. Крестик — отказ: награды не будет.',
        'testAdWait': 'Подождите: {n} с',
        'testAdClaim': 'Получить награду',
        'testAdClose': 'Закрыть',
        'testAdSkip': 'Закрыть без награды',
        // --- Obby Cut Master: интерфейс (js/GameUI.js) ---
        'levelN': 'Уровень {n}',
        'ui.play': 'Играть', 'ui.levels': 'Уровни', 'ui.arsenal': 'Арсенал', 'ui.shop': 'Магазин', 'ui.gift': 'Подарок', 'ui.wheel': 'Колесо',
        'ui.settings': 'Настройки', 'ui.sound': 'Звук', 'ui.sounds': 'Звуки', 'ui.music': 'Музыка', 'ui.back': 'Назад', 'ui.close': 'Закрыть', 'ui.peek': 'Осмотр',
        'ui.pause': 'Пауза', 'ui.pauseT': 'Пауза', 'ui.resume': 'Продолжить', 'ui.restart': 'Заново', 'ui.menu': 'Меню', 'ui.howto': 'Как играть',
        'ui.mapT': 'Путешествие', 'ui.levelsRange': 'Уровни {a}–{b}', 'ui.here': 'Ты здесь',
        'ui.time': 'Время', 'ui.timeDay': 'День', 'ui.timeSunset': 'Закат', 'ui.timeNight': 'Ночь',
        'ui.waves': 'Волны', 'ui.mobs': 'Мобы', 'ui.reward': 'Награда', 'ui.trophy': 'Трофей босса',
        'ui.locked': 'Закрыт', 'ui.needPrev': 'Сначала пройди уровень {n}',
        'ui.wave': 'Волна {i}/{n}', 'ui.lastWave': 'Последняя волна!', 'ui.boss': 'Босс!', 'ui.newMobs': 'Новые враги:',
        'ui.levelDone': 'Уровень пройден!', 'ui.youLost': 'Ты проиграл',
        'ui.baseReward': 'Награда: {n}', 'ui.collected': 'Собрано: {n}', 'ui.kills': 'Побеждено мобов: {n}', 'ui.savedCoins': 'Сохранено монет: {n}',
        'ui.x2': 'x2 монет за рекламу', 'ui.x2Sub': '+{n} монет', 'ui.x2Done': 'Удвоено!',
        'ui.next': 'Далее', 'ui.again': 'Ещё раз', 'ui.revive': 'Продолжить за рекламу', 'ui.reviveSub': '+2 сердца, бой продолжится',
        'ui.adFailed': 'Реклама не показана. Награды нет.', 'ui.adFailedGift': 'Реклама не засчитана. Подарок можно забрать без неё.', 'ui.adFailedWheel': 'Реклама не засчитана: вращения нет.',
        'ui.all': 'Все', 'ui.equipped': 'Надет', 'ui.owned': 'Есть', 'ui.equip': 'Надеть', 'ui.buyFor': 'Купить за {n}',
        'ui.needCoins': 'Не хватает монет: {n}', 'ui.boughtEquipped': 'Куплено и надето!', 'ui.lvShort': 'Ур. {n}', 'ui.opensAt': 'Откроется на уровне {n}',
        'ui.bossShort': 'Босс', 'ui.bossTrophy': 'Трофей босса', 'ui.bossHint': 'Достаётся за победу над боссом «{name}» (уровень {n}).',
        'ui.dmg': 'Урон', 'ui.hits': 'Удары', 'ui.speed': 'Скорость',
        'ui.pickItem': 'Выбери предмет, чтобы примерить его на герое.', 'ui.dailyShort': 'Подарок', 'ui.dailyHint': 'Эксклюзив: достаётся на 7-й день подарка дня.',
        'ui.unlocked': 'Открыто: {name}!', 'ui.bought': 'Куплено: {name}', 'ui.equippedToast': 'Надето: {name}',
        'ui.giftT': 'Подарок дня', 'ui.giftGot': 'Подарок получен!', 'ui.giftGotX2': 'Награда x2!', 'ui.plusItem': '+ случайный предмет',
        'ui.exclusive': 'Эксклюзив', 'ui.exclusiveSkin': 'Эксклюзивный скин', 'ui.newItem': 'Новый предмет', 'ui.dupCoins': 'Такой предмет уже есть — вот монеты', 'ui.great': 'Отлично!',
        'ui.wheelT': 'Колесо фортуны', 'ui.quality': 'Графика', 'ui.q.auto': 'Авто', 'ui.q.low': 'Низкая', 'ui.q.medium': 'Средняя', 'ui.q.high': 'Высокая',
        'ui.language': 'Язык', 'ui.newSword': 'Новый меч!',
        // --- обучение (Game.initTutorial): вид от первого лица, меч ведут пальцем ---
        'tut.touch.t': 'Возьми меч', 'tut.touch.touch': 'Коснись экрана и веди пальцем: меч следует за ним', 'tut.touch.pc': 'Зажми кнопку мыши и веди: меч следует за курсором',
        'tut.kill.t': 'Разрежь врага!', 'tut.kill.touch': 'Проведи мечом сквозь врага: он разрежется по линии свайпа', 'tut.kill.pc': 'Проведи мечом сквозь врага: он разрежется по линии движения мыши',
        'tut.hearts.t': 'Береги сердца', 'tut.hearts.h': 'Сердца — твои жизни. Враг, дошедший до тебя, отнимает сердце. Нет сердец — поражение',
        // --- реклама: усиления, супер-награда, пропуск, меч за рекламу (GameAds) ---
        'ui.super': 'Супер-награда', 'ui.superT': 'Супер-награда!', 'ui.superSub': 'Посмотри {n} реклам — награда твоя', 'ui.superWon': 'Супер-награда получена!',
        'ui.adSuper': 'За рекламу ({a}/{b})', 'ui.adProgress': 'За рекламу {a}/{b}', 'ui.adCounted': 'Засчитано: {a}/{b}',
        'ui.adWaitBtn': 'Через {n} с', 'ui.adWaitHint': 'Следующий просмотр через {n} с', 'ui.adsHint': 'Открывается за рекламу: просмотров {n}',
        'ui.forAd': 'За рекламу', 'ui.boostHearts': '+2 сердца', 'ui.boostCoins': '×2 монеты', 'ui.boostActive': 'Активно на следующий уровень', 'ui.boostOn': 'Усиление включено на следующий уровень!',
        'ui.skip': 'Пропустить уровень за рекламу', 'ui.skipSub': 'Сразу к уровню {n}',
        // --- первое уведомление ---
        'ui.collectedL': 'Собрано', 'ui.savedL': 'Сохранено монет',
        'ui.up': 'Вверх', 'ui.down': 'Вниз', 'ui.toCurrent': 'К текущему уровню',
        'ui.stamina': 'Выносливость', 'ui.draw': 'Взятие', 'ui.secShort': '{n} с', 'ui.resting': 'Отдых…', 'ui.frozen': 'Замёрз!', 'ui.knocked': 'Выбит!',
        'ui.enemies': 'Враги', 'ui.swTired': 'Меч устал, отдыхает', 'ui.swFrozen': 'Меч заморожен: {n} с', 'ui.swStun': 'Меч выбит! {n} с', 'ui.swDraw': 'Рано! Дай мечу секунду', 'ui.swReady': 'Меч готов!',
        'ui.showShop': 'Показать магазин', 'ui.showArsenal': 'Показать арсенал',
        // --- выживание ---
        'ui.survival': 'Выживание', 'ui.survBest': 'Рекорд: волна {n}', 'ui.survNew': 'Волны без конца', 'ui.waveW': 'Волна',
        'ui.perkT': 'Выбери перк', 'ui.reroll': 'Заменить ({n})', 'ui.rerollAd': 'Заменить за рекламу',
        'ui.waveCleared': 'Волна зачищена!', 'ui.newLocation': 'Новая локация', 'ui.newRecord': 'Новый рекорд!', 'ui.perksTaken': 'Перки',
        'ui.bonusWaves': 'Бонус за волны', 'ui.cont': 'Продолжить',
        'ui.noticeT': 'Без крови!', 'ui.notice': 'Все персонажи — роботы и пиньяты. Внутри у них только краска — крови в игре нет!', 'ui.gotIt': 'Понятно',
    },
    en: {
        'loading': 'Loading…',
        'loadingScene': 'Preparing the first frame…',
        'loadingReady': 'Ready',
        'loadingFailed': 'Loading failed. Please try again.',
        'loadingRetry': 'Retry',
        'no3d': '3D is unavailable: no WebGL in this browser',
        // --- platform (Pause.js, Platform.js) ---
        'platformPaused': 'Paused',
        // --- Telegram: orientation warning (PlatformTelegram.js) ---
        'orientTitle': 'Rotate your device',
        'orientHint': 'The game only works in landscape mode',
        // --- test build: test ad window (PlatformTest.js) ---
        'testAdTag': 'TEST AD',
        'testAdInter': 'Interstitial ad',
        'testAdInterHint': 'This is what the game does after two rounds. Close the window when ready.',
        'testAdRewarded': 'Rewarded ad',
        'testAdHint': 'Wait for the end and claim the reward. The cross declines: no reward.',
        'testAdWait': 'Wait: {n} s',
        'testAdClaim': 'Claim reward',
        'testAdClose': 'Close',
        'testAdSkip': 'Close without reward',
        // --- Obby Cut Master: interface (js/GameUI.js) ---
        'levelN': 'Level {n}',
        'ui.play': 'Play', 'ui.levels': 'Levels', 'ui.arsenal': 'Arsenal', 'ui.shop': 'Shop', 'ui.gift': 'Gift', 'ui.wheel': 'Wheel',
        'ui.settings': 'Settings', 'ui.sound': 'Sound', 'ui.sounds': 'Sounds', 'ui.music': 'Music', 'ui.back': 'Back', 'ui.close': 'Close', 'ui.peek': 'Look around',
        'ui.pause': 'Pause', 'ui.pauseT': 'Paused', 'ui.resume': 'Resume', 'ui.restart': 'Restart', 'ui.menu': 'Menu', 'ui.howto': 'How to play',
        'ui.mapT': 'Journey', 'ui.levelsRange': 'Levels {a}–{b}', 'ui.here': 'You are here',
        'ui.time': 'Time', 'ui.timeDay': 'Day', 'ui.timeSunset': 'Sunset', 'ui.timeNight': 'Night',
        'ui.waves': 'Waves', 'ui.mobs': 'Mobs', 'ui.reward': 'Reward', 'ui.trophy': 'Boss trophy',
        'ui.locked': 'Locked', 'ui.needPrev': 'Beat level {n} first',
        'ui.wave': 'Wave {i}/{n}', 'ui.lastWave': 'Final wave!', 'ui.boss': 'Boss!', 'ui.newMobs': 'New enemies:',
        'ui.levelDone': 'Level complete!', 'ui.youLost': 'You lost',
        'ui.baseReward': 'Reward: {n}', 'ui.collected': 'Collected: {n}', 'ui.kills': 'Mobs defeated: {n}', 'ui.savedCoins': 'Coins kept: {n}',
        'ui.x2': 'x2 coins for an ad', 'ui.x2Sub': '+{n} coins', 'ui.x2Done': 'Doubled!',
        'ui.next': 'Next', 'ui.again': 'Again', 'ui.revive': 'Continue for an ad', 'ui.reviveSub': '+2 hearts, keep fighting',
        'ui.adFailed': 'The ad did not play. No reward.', 'ui.adFailedGift': 'The ad was not completed. You can still claim the gift without it.', 'ui.adFailedWheel': 'The ad was not completed: no spin.',
        'ui.all': 'All', 'ui.equipped': 'Equipped', 'ui.owned': 'Owned', 'ui.equip': 'Equip', 'ui.buyFor': 'Buy for {n}',
        'ui.needCoins': 'Not enough coins: {n}', 'ui.boughtEquipped': 'Bought and equipped!', 'ui.lvShort': 'Lv {n}', 'ui.opensAt': 'Unlocks at level {n}',
        'ui.bossShort': 'Boss', 'ui.bossTrophy': 'Boss trophy', 'ui.bossHint': 'Won by beating the boss "{name}" (level {n}).',
        'ui.dmg': 'Damage', 'ui.hits': 'Hits', 'ui.speed': 'Speed',
        'ui.pickItem': 'Pick an item to try it on your hero.', 'ui.dailyShort': 'Daily', 'ui.dailyHint': 'Exclusive: given on day 7 of the daily gift.',
        'ui.unlocked': 'Unlocked: {name}!', 'ui.bought': 'Bought: {name}', 'ui.equippedToast': 'Equipped: {name}',
        'ui.giftT': 'Daily gift', 'ui.giftGot': 'Gift claimed!', 'ui.giftGotX2': 'Reward x2!', 'ui.plusItem': '+ random item',
        'ui.exclusive': 'Exclusive', 'ui.exclusiveSkin': 'Exclusive skin', 'ui.newItem': 'New item', 'ui.dupCoins': 'You already own it: coins instead', 'ui.great': 'Great!',
        'ui.wheelT': 'Wheel of fortune', 'ui.quality': 'Graphics', 'ui.q.auto': 'Auto', 'ui.q.low': 'Low', 'ui.q.medium': 'Medium', 'ui.q.high': 'High',
        'ui.language': 'Language', 'ui.newSword': 'New sword!',
        // --- tutorial (Game.initTutorial): first-person view, the sword follows your finger ---
        'tut.touch.t': 'Grab the sword', 'tut.touch.touch': 'Touch the screen and drag: the sword follows your finger', 'tut.touch.pc': 'Hold the mouse button and drag: the sword follows the cursor',
        'tut.kill.t': 'Slice the enemy!', 'tut.kill.touch': 'Swipe the sword through an enemy: it is cut along your swipe line', 'tut.kill.pc': 'Drag the sword through an enemy: it is cut along the mouse path',
        'tut.hearts.t': 'Protect your hearts', 'tut.hearts.h': 'Hearts are your lives. An enemy that reaches you takes a heart. No hearts left: you lose',
        // --- ads: boosts, super reward, skip, sword for ads (GameAds) ---
        'ui.super': 'Super reward', 'ui.superT': 'Super reward!', 'ui.superSub': 'Watch {n} ads to win it', 'ui.superWon': 'Super reward won!',
        'ui.adSuper': 'Watch ad ({a}/{b})', 'ui.adProgress': 'Watch ad {a}/{b}', 'ui.adCounted': 'Counted: {a}/{b}',
        'ui.adWaitBtn': 'In {n} s', 'ui.adWaitHint': 'Next ad in {n} s', 'ui.adsHint': 'Unlocked by watching {n} ads',
        'ui.forAd': 'Watch ad', 'ui.boostHearts': '+2 hearts', 'ui.boostCoins': 'x2 coins', 'ui.boostActive': 'Active for the next level', 'ui.boostOn': 'Boost is active for the next level!',
        'ui.skip': 'Skip level for an ad', 'ui.skipSub': 'Go straight to level {n}',
        // --- first-launch notice ---
        'ui.collectedL': 'Collected', 'ui.savedL': 'Coins kept',
        'ui.up': 'Up', 'ui.down': 'Down', 'ui.toCurrent': 'To current level',
        'ui.stamina': 'Stamina', 'ui.draw': 'Grab', 'ui.secShort': '{n} s', 'ui.resting': 'Resting…', 'ui.frozen': 'Frozen!', 'ui.knocked': 'Knocked out!',
        'ui.enemies': 'Enemies', 'ui.swTired': 'The sword is tired, resting', 'ui.swFrozen': 'Sword frozen: {n} s', 'ui.swStun': 'Sword knocked out! {n} s', 'ui.swDraw': 'Too early! Give it a second', 'ui.swReady': 'Sword ready!',
        'ui.showShop': 'Show shop', 'ui.showArsenal': 'Show arsenal',
        // --- survival ---
        'ui.survival': 'Survival', 'ui.survBest': 'Best: wave {n}', 'ui.survNew': 'Endless waves', 'ui.waveW': 'Wave',
        'ui.perkT': 'Choose a perk', 'ui.reroll': 'Reroll ({n})', 'ui.rerollAd': 'Reroll for an ad',
        'ui.waveCleared': 'Wave cleared!', 'ui.newLocation': 'New location', 'ui.newRecord': 'New record!', 'ui.perksTaken': 'Perks',
        'ui.bonusWaves': 'Wave bonus', 'ui.cont': 'Continue',
        'ui.noticeT': 'No blood!', 'ui.notice': "All characters are robots and piñatas. They're full of paint: there's no blood in this game!", 'ui.gotIt': 'Got it',
    },
};

/** @satisfies {Record<string, any>} */
const Lang = {
    code: 'ru',

    // platformLang — язык платформы (Platform.lang) или null.
    init(platformLang) {
        const def = typeof GAME_LANG !== 'undefined' ? GAME_LANG : 'ru';
        const auto = typeof LANG_AUTO !== 'undefined' ? LANG_AUTO : 0;
        const p = String(platformLang || '').toLowerCase().split(/[-_]/)[0];
        this.code = auto > 0 && p && LANG_STRINGS[p] ? p : (LANG_STRINGS[def] ? def : 'en');
        document.documentElement.lang = this.code;
    },

    has(key) {
        return !!((LANG_STRINGS[this.code] || {})[key] || LANG_STRINGS.en[key]);
    },

    t(key, params) {
        const s = (LANG_STRINGS[this.code] || {})[key] || LANG_STRINGS.en[key] || key;
        return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;
    },

    // Разметка: data-t, data-t-title, data-t-placeholder внутри root.
    apply(root) {
        const r = root || document;
        for (const el of /** @type {NodeListOf<HTMLElement>} */ (r.querySelectorAll('[data-t]'))) el.textContent = this.t(el.dataset.t);
        for (const el of /** @type {NodeListOf<HTMLElement>} */ (r.querySelectorAll('[data-t-title]'))) el.title = this.t(el.dataset.tTitle);
        for (const el of /** @type {NodeListOf<HTMLInputElement>} */ (r.querySelectorAll('[data-t-placeholder]'))) el.placeholder = this.t(el.dataset.tPlaceholder);
    },
};
