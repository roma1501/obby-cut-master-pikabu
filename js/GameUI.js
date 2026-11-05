// GameUI.js — Obby Cut Master: интерфейс «блочный Roblox-крафт» (контракт — docs/UI-CONTRACT.md).
// Главное меню, карта уровней, HUD боя, пауза, победа/поражение, арсенал, магазин, подарок дня, колесо,
// настройки, цифры урона. Всё — DOM поверх канваса #world3d; стили — в этом файле (вставка <style>),
// шрифт Montserrat — @font-face в index.html. Размеры задаёт единица `u` (1u ≈ 1px на 400 px экрана,
// масштаб — переменная --u на #ocm-ui), HUD — единица `h` (масштаб HudLayout, --hl-k).
// Иконки — assets/ui/icon_*.png (пути литералами: сканер сборщика), стихии — цветные «самоцветы».

/** @typedef {{ n: number, biome: string, biomeIndex: number, inBiome: number, theme: string, title: any, time: string, waves: any[], mobs: number, boss: string | null, fresh: string[], reward: number }} GameUILevel */

const GAMEUI_ICON = {
    ad: 'assets/ui/icon_ad_video.png', back: 'assets/ui/icon_arrow_left.png', next: 'assets/ui/icon_arrow_right.png',
    boss: 'assets/ui/icon_boss.png', check: 'assets/ui/icon_check.png', chest: 'assets/ui/icon_chest.png',
    close: 'assets/ui/icon_close.png', coin: 'assets/ui/icon_coin.png', pile: 'assets/ui/icon_coins_pile.png',
    gift: 'assets/ui/icon_gift.png', heart: 'assets/ui/icon_heart.png', home: 'assets/ui/icon_home.png',
    bolt: 'assets/ui/icon_lightning.png', lock: 'assets/ui/icon_lock.png', map: 'assets/ui/icon_map.png',
    musicOff: 'assets/ui/icon_music_off.png', musicOn: 'assets/ui/icon_music_on.png', pause: 'assets/ui/icon_pause.png',
    play: 'assets/ui/icon_play.png', question: 'assets/ui/icon_question.png', restart: 'assets/ui/icon_restart.png',
    settings: 'assets/ui/icon_settings.png', shield: 'assets/ui/icon_shield.png', shop: 'assets/ui/icon_shop.png',
    skip: 'assets/ui/icon_skip.png', skull: 'assets/ui/icon_skull.png', soundOff: 'assets/ui/icon_sound_off.png',
    soundOn: 'assets/ui/icon_sound_on.png', star: 'assets/ui/icon_star.png', starEmpty: 'assets/ui/icon_star_empty.png',
    sword: 'assets/ui/icon_sword.png', trophy: 'assets/ui/icon_trophy.png', wheel: 'assets/ui/icon_wheel.png',
};

/** Цвета редкости магазина косметики (мечи берут цвета из GameData.RARITY). */
const GAMEUI_RARITY = { common: '#b8c4cf', uncommon: '#5fd94a', rare: '#4aa8ff', epic: '#b45cff', legendary: '#ffb02a', mythic: '#ff3a6a' };

/** Кольцо обводки текста из теней: r — радиус, drop — свес вниз (единица unit подставляется в CSS). */
function gameUiRing(r, drop, unit) {
    const p = [];
    for (let a = 0; a < 360; a += 30) {
        const x = +(Math.cos(a * Math.PI / 180) * r).toFixed(2), y = +(Math.sin(a * Math.PI / 180) * r).toFixed(2);
        p.push(x + unit + ' ' + y + unit + ' 0 var(--ink)');
    }
    p.push('0 ' + drop + unit + ' 0 var(--ink)');
    return p.join(',');
}

// --- CSS, часть 1: корень, текст, кнопки, панели, мелкие детали ------------------------------------
const GAMEUI_CSS_BASE = `
#ocm-ui{position:fixed;inset:0;z-index:30;pointer-events:none;overflow:hidden;font-family:'Montserrat','Arial Black','Segoe UI',system-ui,sans-serif;font-weight:800;color:#fff;line-height:1.15;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;
--ink:#1b1530;--panel:#372b69;--panel-d:#241a4d;--gold:#ffcf33;--gold-d:#c98708;--green:#52d63c;--green-d:#2b931c;--orange:#ff8a1f;--orange-d:#c4520a;--blue:#2f9bff;--blue-d:#1565c6;--purple:#9a5cff;--purple-d:#5a2dc2;--pink:#ff3d7f;--pink-d:#b51a52;--red:#ff3d7f;--red-d:#b51a52;--teal:#1fd1bf;--teal-d:#0e8a7e;--gray:#9a95b5;--gray-d:#5e5a7c;--wood:#d8964a;--wood-d:#a8692a;
--sat:env(safe-area-inset-top,0px);--sar:env(safe-area-inset-right,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px)}
#ocm-ui,#ocm-ui *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
/* сброс с нулевой специфичностью (:where), чтобы классы кнопок его перекрывали */
:where(#ocm-ui) button{font:inherit;color:inherit;border:0;padding:0;margin:0;background:none;cursor:pointer;touch-action:manipulation;outline:none}
:where(#ocm-ui) img{display:block;-webkit-user-drag:none;user-select:none}
#ocm-ui [hidden]{display:none!important}
.o-layer{position:absolute;inset:0;pointer-events:none;isolation:isolate}
.o-ic{width:1.3em;height:1.3em;flex:none;object-fit:contain;pointer-events:none}
.o-t1{text-shadow:@O1}.o-t2{text-shadow:@O2}.o-t3{text-shadow:@O3}.o-t4{text-shadow:@O4}
.o-gold{color:var(--gold)}

/* кнопка: яркая заливка, тёмная обводка, нижняя грань, нажатие проседает */
.o-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8u;min-height:50u;padding:0 20u;margin:0 0 9u;border:3u solid var(--ink);border-radius:12u;background:var(--c,var(--blue));color:#fff;font-size:19u;font-weight:900;line-height:1;letter-spacing:.02em;text-transform:uppercase;text-shadow:@O2;white-space:nowrap;pointer-events:auto;cursor:pointer;
box-shadow:inset 0 4u 0 rgba(255,255,255,.42),inset 0 -5u 0 rgba(0,0,0,.2),0 6u 0 0 var(--cd,var(--blue-d)),0 6u 0 3u var(--ink);transition:transform .07s,box-shadow .07s,filter .12s}
.o-btn:active{transform:translateY(5u);box-shadow:inset 0 4u 0 rgba(255,255,255,.42),inset 0 -5u 0 rgba(0,0,0,.2),0 1u 0 0 var(--cd,var(--blue-d)),0 1u 0 3u var(--ink)}
@media (hover:hover){.o-btn:hover{filter:brightness(1.1)}}
.o-btn.lg{min-height:68u;font-size:30u;padding:0 34u;border-radius:16u;gap:12u}
.o-btn.sm{min-height:40u;font-size:15u;padding:0 14u;border-radius:10u;gap:6u}
.o-btn.xs{min-height:32u;font-size:12u;padding:0 10u;border-radius:8u;border-width:2.5u}
.o-btn.is-off{--c:var(--gray);--cd:var(--gray-d);filter:saturate(.5)}
.o-btn.is-busy{pointer-events:none;filter:saturate(.6) brightness(.9)}
.o-btn.c-green{--c:var(--green);--cd:var(--green-d)}.o-btn.c-orange{--c:var(--orange);--cd:var(--orange-d)}
.o-btn.c-blue{--c:var(--blue);--cd:var(--blue-d)}.o-btn.c-purple{--c:var(--purple);--cd:var(--purple-d)}
.o-btn.c-pink{--c:var(--pink);--cd:var(--pink-d)}.o-btn.c-gold{--c:var(--gold);--cd:var(--gold-d)}
.o-btn.c-red{--c:var(--red);--cd:var(--red-d)}.o-btn.c-teal{--c:var(--teal);--cd:var(--teal-d)}
.o-btn.c-dark{--c:#4a3f86;--cd:#2a2058}
.o-btn.c-gold{color:#fff}
.o-btn.o-ibtn{width:46u;height:46u;min-height:0;padding:0;border-radius:50%;--c:var(--purple);--cd:var(--purple-d)}
.o-ibtn .o-ic{width:27u;height:27u}
.o-btn.o-ibtn.sm{width:38u;height:38u;min-height:0;padding:0;border-radius:50%}.o-ibtn.sm .o-ic{width:22u;height:22u}
.o-dot{position:absolute;top:-7u;right:-7u;min-width:21u;height:21u;padding:0 4u;border-radius:99u;background:var(--red);border:3u solid var(--ink);font-size:12u;font-weight:900;line-height:15u;text-align:center;text-shadow:none;box-shadow:inset 0 3u 0 rgba(255,255,255,.35);animation:o-pulse 1s ease-in-out infinite;pointer-events:none}
.o-tag{position:absolute;left:50%;bottom:-10u;transform:translateX(-50%) rotate(-3deg);padding:2u 7u;border:2.5u solid var(--ink);border-radius:6u;background:var(--green);font-size:10u;font-weight:900;text-shadow:@O1;white-space:nowrap;pointer-events:none;text-transform:uppercase}

/* плашка монет */
.o-pill{display:inline-flex;align-items:center;gap:6u;height:40u;padding:0 14u 0 6u;margin:0 0 4u;border:3u solid var(--ink);border-radius:99u;background:#2a1f55;box-shadow:inset 0 3u 0 rgba(255,255,255,.14),inset 0 -3u 0 rgba(0,0,0,.28),0 4u 0 0 var(--ink);font-size:19u;font-weight:900;color:var(--gold);text-shadow:@O2;pointer-events:auto}
.o-pill .o-ic{width:30u;height:30u;margin-left:1u}
.o-pill.bump{animation:o-bump .28s ease-out}

/* блок: ровная заливка, пиксельная рамка со срезанными углами, нижняя грань */
.o-blk{position:relative;margin:0 0 9u;background-color:var(--bg,var(--panel));box-shadow:inset 3u 3u 0 rgba(255,255,255,.28),inset -3u -3u 0 rgba(0,0,0,.22),0 -3u 0 0 var(--ink),-3u 0 0 0 var(--ink),3u 0 0 0 var(--ink),0 6u 0 0 var(--bgd,var(--panel-d)),-3u 6u 0 0 var(--ink),3u 6u 0 0 var(--ink),0 9u 0 0 var(--ink)}
.o-panel{position:relative;margin:0 0 12u;pointer-events:auto;background-color:var(--panel);background-image:linear-gradient(rgba(255,255,255,.04) 2u,transparent 2u),linear-gradient(90deg,rgba(255,255,255,.04) 2u,transparent 2u);background-size:32u 32u;
box-shadow:inset 4u 4u 0 rgba(255,255,255,.13),inset -4u -4u 0 rgba(0,0,0,.3),0 -4u 0 0 var(--ink),-4u 0 0 0 var(--ink),4u 0 0 0 var(--ink),0 8u 0 0 var(--panel-d),-4u 8u 0 0 var(--ink),4u 8u 0 0 var(--ink),0 12u 0 0 var(--ink)}
.o-plank{--bg:var(--wood);--bgd:var(--wood-d);display:flex;align-items:center;justify-content:center;gap:8u;padding:7u 22u;font-size:22u;font-weight:900;text-align:center;text-transform:uppercase;text-shadow:@O2;
background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.07) 0 3u,transparent 3u 24u),linear-gradient(rgba(255,255,255,.2) 0 4u,transparent 4u)}
.o-well{background:var(--panel-d);border-radius:3u;box-shadow:inset 3u 3u 0 rgba(0,0,0,.38),inset -3u -3u 0 rgba(255,255,255,.07),0 0 0 3u var(--ink)}
.o-chip{display:inline-flex;align-items:center;gap:5u;height:24u;padding:0 10u;border:2.5u solid var(--ink);border-radius:99u;background:var(--cc,#555);font-size:12u;font-weight:900;text-shadow:@O1;white-space:nowrap;box-shadow:inset 0 2u 0 rgba(255,255,255,.3)}
.o-gem{flex:none;width:13u;height:13u;margin:0 2u;transform:rotate(45deg);background:var(--gc,#fff);border:2.5u solid var(--ink);box-shadow:inset 2u 2u 0 rgba(255,255,255,.6)}
.o-bar{display:flex;gap:2u;height:12u;flex:1;min-width:0}
.o-bar i{flex:1;background:rgba(0,0,0,.45);border:1.5u solid var(--ink)}
.o-bar i.on{background:var(--bc,var(--green));box-shadow:inset 0 2.5u 0 rgba(255,255,255,.45)}
.o-sep{height:3u;background:rgba(0,0,0,.25);border-radius:2u;margin:4u 0}
.o-muted{color:#cfc8f0;font-weight:700}
.ph{position:absolute;inset:8%;display:flex;align-items:center;justify-content:center;border-radius:8u;font-size:26u;font-weight:900;text-shadow:@O2;background:rgba(255,255,255,.12)}
.o-chip .o-ic{width:16u;height:16u}
`;
// --- CSS, часть 2: главное меню, логотип, HUD, баннеры, окна и страницы -----------------------------
const GAMEUI_CSS_MENU = `
/* логотип: крупные объёмные буквы с толстой обводкой и длинной тенью, слово CUT разрезано, меч наискось */
.o-logo{position:relative;display:flex;flex-direction:column;align-items:center;gap:.05em;font-size:clamp(26px,min(11.5vw,6.4vh),66px);line-height:1;transform:rotate(-4deg);pointer-events:none;animation:o-logo-in 1.1s cubic-bezier(.2,1.25,.4,1) both}
.o-lrow{display:flex;align-items:flex-end;justify-content:center;gap:.3em}
.o-lrow.big{font-size:1.14em}
.o-lg{position:relative;display:inline-block;isolation:isolate;font-weight:900;line-height:.98;letter-spacing:.015em;white-space:nowrap}
.o-lg::before,.o-lg::after{content:attr(data-t);position:absolute;left:0;top:0;white-space:nowrap}
.o-lg::before{z-index:0;color:var(--ink);-webkit-text-stroke:.2em var(--ink);text-shadow:0 .05em 0 var(--ink),0 .1em 0 var(--ink),0 .15em 0 var(--ink),0 .2em 0 var(--ink),0 .25em 0 var(--ink),0 .3em 0 var(--ink),0 .34em 0 var(--ink)}
.o-lg::after{z-index:1;color:var(--side);-webkit-text-stroke:.05em var(--side);text-shadow:0 .04em 0 var(--side),0 .08em 0 var(--side),0 .12em 0 var(--side),0 .16em 0 var(--side),0 .2em 0 var(--side),0 .24em 0 var(--side)}
.o-lg i{position:relative;z-index:2;display:inline-block;font-style:normal;color:transparent;-webkit-background-clip:text;background-clip:text;background-repeat:no-repeat;
background-image:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.95) 50%,transparent 62%),var(--f);background-size:300% 100%,100% 100%;background-position:170% 0,0 0;animation:o-gloss 5.5s ease-in-out 1.8s infinite}
.o-lg.gold{--f:linear-gradient(#fffbd0 0 12%,#ffe45c 12% 38%,#ffbe2e 38% 66%,#ff8a1f 66% 100%);--side:#b84a08}
.o-lg.steel{--f:linear-gradient(#ffffff 0 12%,#e4f3ff 12% 38%,#98d4ff 38% 66%,#3d9bff 66% 100%);--side:#1459b8}
.o-cut{position:relative;display:inline-block}
.o-half{display:inline-block;position:relative;z-index:1}
.o-half.r{position:absolute;left:0;top:0;z-index:2}
.o-half.l{clip-path:polygon(-30% -60%,63% -60%,37% 160%,-30% 160%);animation:o-halfl-c 8s linear 1s infinite both}
.o-half.r{clip-path:polygon(63% -60%,140% -60%,140% 160%,37% 160%);animation:o-halfr-c 8s linear 1s infinite both}
.o-csw{position:absolute;left:50%;top:50%;z-index:6;width:2.2em;height:2.2em;margin:-1.1em 0 0 -1.1em;object-fit:contain;opacity:0;transform:translate(.9em,-2.6em) rotate(154deg);filter:drop-shadow(0 .05em 0 rgba(0,0,0,.35));pointer-events:none;will-change:transform,opacity,filter;animation:o-sword-c 8s linear 1s infinite both}
.o-trail{position:absolute;left:50%;top:50%;z-index:5;width:.15em;height:3.9em;margin:-1.95em 0 0 -.075em;opacity:0;pointer-events:none;border-radius:.08em;background:linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,.95) 55%,rgba(255,236,160,.9));transform:translate(.28em,-.8em) rotate(19deg);animation:o-trail-c 8s linear 1s infinite both}
.o-sp{position:absolute;left:50%;top:50%;z-index:7;width:var(--z,.16em);height:var(--z,.16em);margin:calc(var(--z,.16em) / -2);pointer-events:none;opacity:0;background:var(--c,#fff);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);animation:o-sp-c 8s linear var(--t,1s) infinite both}
.o-sp.v{animation-name:o-spv-c}.o-slash{position:absolute;left:50%;top:-65%;width:.06em;height:230%;margin-left:-.03em;z-index:5;background:#fff;border-radius:.03em;transform-origin:50% 0;transform:skewX(-19deg) scaleY(0);opacity:0;box-shadow:0 0 .22em .05em rgba(255,255,255,.95),0 0 .6em .18em rgba(255,236,150,.75);animation:o-slash-c 8s linear 1s infinite both}
.is-land .o-logo{margin-top:.8em;flex-direction:row;align-items:flex-end;gap:.32em;font-size:clamp(22px,min(5.1vw,10.2vh),60px)}
.is-land .o-lrow.big{font-size:1em}
.is-land .o-csw{width:1.6em;height:1.6em;margin:-.8em 0 0 -.8em}
.o-logo.o-logo-img{display:block;width:7.4em;aspect-ratio:1080/450;transform:rotate(-3deg)}
.is-land .o-logo.o-logo-img{width:5em;margin-top:.3em}
.o-limg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
.o-limg.base{clip-path:polygon(0 0,56% 0,56% 35%,100% 16.8%,100% 100%,0 100%)}
.o-limg.top{clip-path:polygon(56% 0,100% 0,100% 16.8%,56% 35%);transform-origin:74% 25%;animation:o-ltop 8s linear 1s infinite both}
.o-lcut{position:absolute;left:56.9%;top:11%;width:35.1%;height:34%;pointer-events:none}
.o-lsw{position:absolute;left:50%;top:50%;width:1.9em;height:1.9em;margin:-.95em 0 0 -.95em;object-fit:contain;opacity:0;pointer-events:none;will-change:transform,opacity,filter;filter:drop-shadow(0 .05em 0 rgba(0,0,0,.35));animation:o-lsw 8s linear 1s infinite both}
.o-lflash{position:absolute;left:-6%;top:50%;width:118%;height:.07em;margin-top:-.035em;background:#fff;border-radius:.05em;transform-origin:0 50%;transform:rotate(-9.7deg) scaleX(0);opacity:0;pointer-events:none;box-shadow:0 0 .2em .05em rgba(255,255,255,.95),0 0 .55em .16em rgba(140,210,255,.8);animation:o-lflash 8s linear 1s infinite both}

/* меню */
.o-menu{position:absolute;inset:0;display:grid;pointer-events:none;padding:calc(var(--sat) + 10u) calc(var(--sar) + 12u) calc(var(--sab) + 4u) calc(var(--sal) + 12u);gap:2u 10u}
.o-menu>*{pointer-events:auto;z-index:1}
.o-menu>.o-m-logo{z-index:0}
.o-m-coin{grid-area:coin;justify-self:start;align-self:start}
.o-m-btns{grid-area:btns;justify-self:end;align-self:start;display:flex;gap:10u}
.o-m-logo{grid-area:logo;justify-self:center;align-self:center;pointer-events:none}
.o-m-left,.o-m-right{display:contents}
.o-playrow{grid-area:play;justify-self:center;display:flex;align-items:flex-start;gap:12u}
.o-play{flex-direction:column;gap:2u;min-width:min(62vw,250u);padding:6u 28u 8u}
.o-play small{font-size:13u;letter-spacing:.04em;opacity:.95;text-shadow:@O1}
.o-mapbtn{flex-direction:column;gap:2u;width:70u;min-height:68u;padding:4u 2u 5u;font-size:11u;border-radius:14u}
.o-mapbtn .o-ic{width:34u;height:34u}
.o-tile{flex-direction:column;gap:3u;min-width:0;width:100%;min-height:80u;padding:6u 4u 6u;font-size:12u;border-radius:14u}
.o-tile .o-ic{width:40u;height:40u}
.o-tile[data-k=arsenal]{grid-area:t1}.o-tile[data-k=shop]{grid-area:t2}.o-tile[data-k=gift]{grid-area:t3}.o-tile[data-k=wheel]{grid-area:t4}
.is-tall .o-menu{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:auto auto auto minmax(0,1fr) auto auto auto;grid-template-areas:"coin coin btns btns" "logo logo logo logo" "super super super super" "hero hero hero hero" "play play play play" "surv surv surv surv" "t1 t2 t3 t4";gap:2u 8u}
.is-tall .o-m-logo{margin:30u 0 10u}
.is-land .o-menu{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;grid-template-areas:"coin logo btns" "left hero right" "play play play"}
.is-land .o-m-left,.is-land .o-m-right{display:flex;flex-direction:column;justify-content:center;gap:4u;width:84u}
.is-land .o-m-left{grid-area:left;justify-self:start}.is-land .o-m-right{grid-area:right;justify-self:end}
.is-land .o-tile{grid-area:auto!important}
.is-low .o-tile{min-height:66u;font-size:11u}.is-low .o-tile .o-ic{width:32u;height:32u}.is-low .o-play{padding:4u 26u 6u}
.is-low .o-m-left,.is-low .o-m-right{width:76u}
.is-low .o-btn.lg{min-height:58u;font-size:26u}.is-low .o-mapbtn{min-height:58u;width:62u}

/* HUD боя (положение блоков — HudLayout, размеры — единица h) */
.o-hud{position:absolute;inset:0;pointer-events:none;--hu:calc(var(--hl-k,1)*1px)}
.o-hud>*{position:fixed}
.o-h-pause{pointer-events:auto;min-height:0;margin:0;padding:0;border-width:3h;border-radius:50%;--c:var(--purple);--cd:var(--purple-d);box-shadow:inset 0 3h 0 rgba(255,255,255,.42),inset 0 -4h 0 rgba(0,0,0,.2),0 4h 0 0 var(--purple-d),0 4h 0 3h var(--ink)}
.o-h-pause .o-ic{width:60%;height:60%}
.o-h-pause:active{transform:translateY(3h)}
.o-h-level{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4h;padding:3h 12h 4h;border:3h solid var(--ink);border-radius:10h;background:rgba(27,21,48,.8);box-shadow:inset 0 3h 0 rgba(255,255,255,.14),0 3h 0 0 rgba(0,0,0,.4);overflow:hidden}
.o-h-lvl{display:flex;align-items:center;gap:6h;font-size:17h;font-weight:900;text-transform:uppercase;text-shadow:@H1;white-space:nowrap;line-height:1}
.o-h-lvl small{font-size:11h;color:var(--gold);font-weight:900}
.o-pips{display:flex;gap:3h;width:100%;height:9h}
.o-pip{flex:1;border:2h solid var(--ink);border-radius:2h;background:rgba(255,255,255,.2)}
.o-pip.done{background:var(--gold);box-shadow:inset 0 2h 0 rgba(255,255,255,.5)}
.o-pip.cur{background:var(--orange);animation:o-blink .6s ease-in-out infinite alternate}
.o-h-coins{display:flex;align-items:center;justify-content:flex-end;gap:5h;height:100%;padding:0 12h 0 5h;border:3h solid var(--ink);border-radius:99h;background:#2a1f55;box-shadow:inset 0 3h 0 rgba(255,255,255,.14),inset 0 -3h 0 rgba(0,0,0,.28),0 3h 0 0 var(--ink);font-size:19h;font-weight:900;color:var(--gold);text-shadow:@H2;white-space:nowrap}
.o-h-coins .o-ic{width:27h;height:27h;margin-right:auto}
.o-h-coins.bump{animation:o-bump .25s ease-out}
.o-hearts{display:flex;align-items:center;justify-content:center;gap:2h;height:100%}
.o-heart{position:relative;flex:none;width:31h;height:31h}
.o-heart img{width:100%;height:100%;transition:filter .3s,opacity .3s,transform .3s}
.o-heart.lost img{filter:grayscale(1) brightness(.45);opacity:.55;transform:scale(.86)}
.o-heart.pop img{animation:o-heart-pop .5s ease-out both}
.o-heart.heal img{animation:o-heart-heal .6s ease-out both}
.o-hp{position:absolute;left:50%;top:50%;width:7h;height:7h;margin:-3.5h 0 0 -3.5h;background:var(--pc,#ffd23d);border:2h solid var(--ink);pointer-events:none}
.o-hearts.shake{animation:o-shake .4s ease-in-out}
.o-h-boss{display:flex;align-items:center;gap:8h;padding:4h 10h 4h 6h;border:3h solid var(--ink);border-radius:12h;background:rgba(50,26,96,.92);box-shadow:inset 0 3h 0 rgba(255,255,255,.14),0 3h 0 0 rgba(0,0,0,.4)}
.o-boss-ic{width:34h;height:34h;flex:none}
.o-boss-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3h}
.o-boss-name{font-size:14h;font-weight:900;text-shadow:@H1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;line-height:1.05}
.o-boss-bar{position:relative;height:13h;border:3h solid var(--ink);border-radius:4h;background:#3a1218;overflow:hidden}
.o-boss-trail,.o-boss-fill{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left center}
.o-boss-trail{background:#ffd23d}
.o-boss-fill{background:linear-gradient(#ffd23d 0 45%,#ff8a1f 45% 100%);box-shadow:inset 0 3h 0 rgba(255,255,255,.4)}
.o-h-stam{display:flex;align-items:center;gap:6h;padding:3h 8h 3h 4h;border:3h solid var(--ink);border-radius:99h;background:rgba(27,21,48,.86);box-shadow:inset 0 3h 0 rgba(255,255,255,.14),0 3h 0 0 var(--ink)}
.o-st-ic{width:26h;height:26h;flex:none}
.o-st-bar{position:relative;flex:1;align-self:stretch;min-height:12h;border:3h solid var(--ink);border-radius:99h;background:#2a2150;overflow:hidden}
.o-st-fill{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left center;background:var(--sc,#52d63c);box-shadow:inset 0 3h 0 rgba(255,255,255,.42);transition:background .2s}
.o-st-txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12h;font-weight:900;text-transform:uppercase;text-shadow:@H1;white-space:nowrap;line-height:1}
.o-h-stam.rest{--sc:#9a95b5}.o-h-stam.frozen{--sc:#5ad0ff}.o-h-stam.stun{--sc:#ffb02a}
.o-h-stam.deny{animation:o-shake .38s ease-in-out}
.o-st-tip{position:absolute;left:50%;bottom:calc(100% + 8h);transform:translateX(-50%);padding:4h 12h 5h;border:3h solid var(--ink);border-radius:9h;background:#4a3a96;font-size:13h;font-weight:900;white-space:nowrap;text-shadow:@H1;opacity:0;pointer-events:none;box-shadow:0 3h 0 0 var(--ink)}
.o-st-tip.good{background:#2b931c}.o-st-tip.ice{background:#1b7fb8}.o-st-tip.bad{background:#a35a0a}
.o-st-tip.on{animation:o-tip 1.7s ease both}
.o-h-sword{display:flex;align-items:center;justify-content:center;border:3h solid var(--rc,var(--ink));border-radius:10h;background:rgba(27,21,48,.8);box-shadow:0 0 0 3h var(--ink),0 3h 0 3h var(--ink);overflow:visible}
.o-h-sword img.sw{width:84%;height:84%;object-fit:contain}
.o-h-sword .o-gem{position:absolute;right:-4h;top:-4h;width:12h;height:12h}

/* баннеры, монетки, вспышка, подсказка */
.o-banner{position:absolute;left:0;right:0;top:16%;display:flex;justify-content:center;pointer-events:none}
.o-bn{--bg:var(--blue);--bgd:var(--blue-d);min-width:min(88%,430u);max-width:94%;padding:9u 28u 11u;text-align:center;transform:skewX(-6deg)}
.o-bn>*{transform:skewX(6deg)}
.o-bn.in{animation:o-bn-in .55s cubic-bezier(.2,1.25,.4,1) both}
.o-bn.out{animation:o-bn-out .3s ease-in both}
.o-bn.boss{--bg:#8a4cf0;--bgd:#5224b0}
.o-bn.boss.in{animation:o-bn-in .55s cubic-bezier(.2,1.25,.4,1) both,o-shake .5s .55s}
.o-bn.lv{--bg:var(--gold);--bgd:var(--gold-d)}
.o-bn.mob{--bg:#5a3fb0;--bgd:#3a2680}
.o-bn-t{font-size:30u;font-weight:900;text-transform:uppercase;text-shadow:@O3;display:flex;align-items:center;justify-content:center;gap:10u;line-height:1.05}
.o-bn-t .o-ic{width:40u;height:40u}
.o-bn-s{font-size:15u;font-weight:800;text-shadow:@O1;margin-top:3u}
.o-bn-mobs{display:flex;flex-direction:column;align-items:center;gap:5u;margin-top:6u}
.o-bn-mob{display:flex;flex-direction:column;align-items:center;gap:2u}
.o-bn-mob .d{font-size:12u;font-weight:700;line-height:1.2;text-shadow:@O1;max-width:92%}
.o-bn-mobs:has(> :nth-child(3)),.is-low .o-bn-mobs{flex-direction:row;flex-wrap:wrap;justify-content:center;gap:5u 6u}
.o-bn-mobs:has(> :nth-child(3)) .d,.is-low .o-bn-mob .d{display:none}
.o-fly{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
.o-fly .c{position:absolute;left:-13u;top:-13u;width:26u;height:26u}
.o-fly img{width:100%;height:100%}
.o-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(255,244,190,0) 40%,rgba(255,240,160,.75) 100%)}
.o-flash.on{animation:o-flash .55s ease-out}
.o-toast{position:absolute;left:50%;bottom:calc(var(--sab) + 80u);transform:translateX(-50%);max-width:min(92%,460u);padding:9u 18u 10u;border:3u solid var(--ink);border-radius:12u;background:#2a1f55;box-shadow:inset 0 3u 0 rgba(255,255,255,.16),0 5u 0 0 var(--ink);font-size:14u;font-weight:800;text-align:center;text-shadow:@O1;pointer-events:none;opacity:0}
.o-toast.on{animation:o-toast 2.6s ease both}
.o-toast.err{background:#5a2a9a}

/* окна и страницы */
.o-modal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:calc(var(--sat) + 12u) calc(var(--sar) + 12u) calc(var(--sab) + 12u) calc(var(--sal) + 12u);background:rgba(14,8,38,.66);pointer-events:auto;animation:o-fade .2s ease both}
.o-modal.clear{background:transparent}
.o-pop{animation:o-pop .45s cubic-bezier(.2,1.45,.4,1) both}
.o-page{position:absolute;inset:0;display:flex;flex-direction:column;gap:6u;padding:calc(var(--sat) + 8u) calc(var(--sar) + 10u) calc(var(--sab) + 4u) calc(var(--sal) + 10u);pointer-events:none}
.o-page.full{pointer-events:auto;background-color:#241a52;background-image:linear-gradient(rgba(255,255,255,.035) 2u,transparent 2u),linear-gradient(90deg,rgba(255,255,255,.035) 2u,transparent 2u),radial-gradient(ellipse at 50% 0,#43338c 0,#241a52 70%);background-size:40u 40u,40u 40u,100% 100%}
.o-head{display:flex;align-items:flex-start;gap:10u;pointer-events:none;flex:none}
.o-head>*{pointer-events:auto}
.o-head .o-plank{flex:1;min-width:0;font-size:21u;padding:6u 14u;margin-top:2u}
.o-head .o-plank span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.o-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:8u;pointer-events:none}
.o-body>*{pointer-events:auto}
.is-low .o-page{gap:3u;padding-top:calc(var(--sat) + 6u)}
.is-low .o-head .o-plank{font-size:17u;padding:4u 10u}
.is-narrow .o-head .o-plank{font-size:15u;padding:6u 8u}
.is-low .o-btn.o-ibtn{width:40u;height:40u}.is-low .o-pill{height:34u;font-size:16u}.is-low .o-pill .o-ic{width:25u;height:25u}
`;
// --- CSS, часть 3: карта, арсенал и магазин, подарок, колесо, настройки, итоги, анимации ------------
const GAMEUI_CSS_PAGES = `
/* карта-путешествие */
.o-mapwrap{position:relative;flex:1;min-height:0;border-radius:6u;box-shadow:0 0 0 4u var(--ink);overflow:hidden;background:#1c1446}
.o-map{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none;touch-action:pan-y;cursor:grab}
.o-map.drag{cursor:grabbing}.o-map.drag .o-node{cursor:grabbing}
.o-mapnav{position:absolute;right:8u;bottom:10u;z-index:6;display:flex;flex-direction:column;gap:4u;pointer-events:none}
.o-mapnav .o-btn{margin-bottom:6u}
.o-mapnav svg{width:60%;height:60%}
.o-map::-webkit-scrollbar{display:none}
.o-world{position:relative;width:100%}
.o-band{position:absolute;left:0;right:0;background-color:var(--bc);background-image:conic-gradient(rgba(255,255,255,.11) 25%,rgba(0,0,0,.09) 0 50%,rgba(255,255,255,.11) 0 75%,rgba(0,0,0,.09) 0);background-size:56u 56u;box-shadow:inset 0 5u 0 rgba(0,0,0,.28)}
.o-band.locked{filter:saturate(.35) brightness(.7)}
.o-path{position:absolute;left:0;top:0;z-index:1;pointer-events:none;overflow:visible}
.o-bband{position:absolute;left:0;right:0;z-index:3;height:0;display:flex;justify-content:center;align-items:center;pointer-events:none}
.o-bband .gate{position:absolute;left:0;right:0;top:-6u;height:12u;background:repeating-linear-gradient(90deg,#f4f0ff 0 14u,#1b1530 14u 28u);box-shadow:0 0 0 3u var(--ink),0 4u 0 3u var(--ink)}
.o-bband .o-plank{position:relative;margin:0}
.o-bband .o-plank{--bg:var(--bc);--bgd:var(--bcd);flex-direction:column;gap:1u;min-width:min(70%,300u);padding:6u 22u 8u;font-size:21u;line-height:1.05}
.o-bband .o-plank small{font-size:12u;text-shadow:@O1;opacity:.95}
.o-node{position:absolute;z-index:2;display:flex;align-items:center;justify-content:center;width:54u;height:54u;margin:0;padding:0;transform:translate(-50%,-50%);border:3u solid var(--ink);border-radius:10u;background:var(--nc);font-size:21u;font-weight:900;text-shadow:@O2;cursor:pointer;pointer-events:auto;
box-shadow:inset 0 4u 0 rgba(255,255,255,.4),inset 0 -4u 0 rgba(0,0,0,.22),0 5u 0 0 var(--ncd),0 5u 0 3u var(--ink);transition:filter .1s}
.o-node:active{filter:brightness(1.15)}
.o-node.boss{width:68u;height:68u;border-radius:14u;font-size:15u}
.o-node.boss .o-ic{width:42u;height:42u}
.o-node.boss .num{position:absolute;left:-5u;top:-8u;min-width:24u;height:22u;padding:0 4u;border:2.5u solid var(--ink);border-radius:7u;background:var(--ncd);font-size:13u;line-height:17u;text-align:center}
.o-node.lock{--nc:#6a668a;--ncd:#443f66;color:#cfcbe6}
.o-node.lock .o-ic{width:26u;height:26u}
.o-node.cur{--nc:var(--orange);--ncd:var(--orange-d);animation:o-node-pulse 1s ease-in-out infinite;z-index:2}
.o-node .st{position:absolute;left:50%;bottom:-19u;transform:translateX(-50%);display:flex;gap:0;pointer-events:none}
.o-node .st img{width:17u;height:17u;margin:0 -1u}
.o-node.boss .st{bottom:-21u}.o-node.boss .st img{width:19u;height:19u}
.o-pin{position:absolute;right:-10u;top:-12u;z-index:4;width:25u;height:25u;border:3u solid var(--ink);border-radius:50%;background:var(--gold);box-shadow:inset 0 3u 0 rgba(255,255,255,.55),0 3u 0 0 var(--ink);display:flex;align-items:center;justify-content:center;pointer-events:none;animation:o-bob .7s ease-in-out infinite alternate}
.o-pin svg{width:68%;height:68%}
.o-bchips{display:flex;gap:4u;flex:none;justify-content:center}
.o-bchip{flex:1;max-width:44u;height:26u;border:3u solid var(--ink);border-radius:6u;background:var(--bc);font-size:11u;font-weight:900;text-shadow:@O1;box-shadow:inset 0 3u 0 rgba(255,255,255,.4),inset 0 -3u 0 rgba(0,0,0,.2),0 3u 0 0 var(--ink);pointer-events:auto;cursor:pointer;margin-bottom:3u}
.o-bchip.off{filter:saturate(.3) brightness(.65)}
.o-bchip.on{transform:translateY(-3u) scale(1.12);box-shadow:inset 0 3u 0 rgba(255,255,255,.4),inset 0 -3u 0 rgba(0,0,0,.2),0 0 0 3u #fff,0 6u 0 3u var(--ink);z-index:1}
.o-bname{flex:none;text-align:center;font-size:13u;text-shadow:@O1;margin-top:-1u}
.o-lvcard{display:flex;flex-direction:column;width:min(92vw,420u);max-height:calc(100% - 38u);padding:0;overflow:visible}
.o-lvhead{display:flex;align-items:center;gap:10u;padding:12u 40u 12u 14u;background:var(--bc);border-bottom:4u solid var(--ink);box-shadow:inset 0 4u 0 rgba(255,255,255,.3)}
.o-lvhead .o-ic{width:44u;height:44u}
.o-lvhead h2{margin:0;font-size:23u;font-weight:900;text-shadow:@O2;line-height:1.05;text-transform:uppercase}
.o-lvhead small{display:block;font-size:13u;text-shadow:@O1;margin-top:2u}
.o-lvbody{flex:1 1 auto;min-height:0;padding:12u 14u 8u;display:flex;flex-direction:column;gap:9u;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#7a6bd0 transparent}
.o-lvhead{flex:none}
.o-lvhead .num{min-width:44u;font-size:28u;text-align:center}
.o-lvfoot{flex:none;display:flex;flex-direction:column;gap:6u;padding:8u 14u 2u;border-top:3u solid rgba(0,0,0,.3)}
.o-lvplay{display:flex;justify-content:center}
.o-timeic{width:28u;height:28u}.o-timeic svg{width:100%;height:100%}
.o-mobs{display:flex;flex-direction:column;gap:6u;padding:8u 10u}
.o-mobs .k{font-size:11u;color:#ffd7a0;text-transform:uppercase}
.o-mobrow{display:flex;align-items:flex-start;gap:8u}
.o-mobrow .o-ic{width:26u;height:26u;margin-top:1u}
.o-mobrow .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1u}
.o-mobrow b{font-size:14u;font-weight:900;text-shadow:@O1;line-height:1.1}
.o-mobrow i{font-style:normal;font-size:11u;font-weight:900;color:#ffd23d}
.o-mobrow span{font-size:11.5u;font-weight:700;color:#e6e0ff;line-height:1.25}
.o-info{display:grid;grid-template-columns:repeat(4,1fr);gap:7u}
.o-i{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3u;padding:7u 2u 6u;font-size:11u;text-align:center;text-shadow:@O1}
.o-i b{font-size:17u;font-weight:900;text-shadow:@O2;line-height:1}
.o-i .o-ic{width:28u;height:28u}
.o-lvstars{display:flex;justify-content:center;gap:4u}.o-lvstars img{width:30u;height:30u}
.o-close{position:absolute;right:-10u;top:-14u;z-index:3}
.o-trow{display:flex;align-items:center;gap:12u;min-height:76u;padding:8u 12u}
.o-tbox{position:relative;flex:none;width:64u;height:64u;border:3u solid var(--rc);border-radius:10u;background:linear-gradient(to top,var(--rc2),rgba(0,0,0,0) 80%),#2c2260;box-shadow:0 0 0 3u var(--ink)}
.o-tbox .pic{position:absolute;inset:5%;width:90%;height:90%;object-fit:contain;filter:drop-shadow(0 3u 0 rgba(0,0,0,.3))}
.o-trow .tx{flex:1;min-width:0}
.o-trow .k{font-size:11u;color:#ffd7a0;text-transform:uppercase}
.o-trow .nm{font-size:16u;line-height:1.1;overflow-wrap:anywhere}

/* боковые панели: арсенал и магазин (герой виден рядом) */
.o-dock{position:absolute;display:flex;flex-direction:column;gap:8u;padding:10u 10u 8u;pointer-events:auto;transition:translate .38s cubic-bezier(.3,1.25,.45,1)}
.is-land .o-dock{top:calc(var(--sat) + 62u);bottom:calc(var(--sab) + 14u);left:calc(var(--sal) + 14u);width:min(57%,600u)}
.is-tall .o-dock{left:calc(var(--sal) + 12u);right:calc(var(--sar) + 12u);bottom:calc(var(--sab) + 14u);height:min(58%,570u)}
.is-land .o-page.peek .o-dock{translate:-130% 0}.is-tall .o-page.peek .o-dock{translate:0 130%}
.o-showwrap{position:absolute;left:0;right:0;bottom:calc(var(--sab) + 12u);display:none;justify-content:center;pointer-events:none;z-index:3}
.o-page.peek .o-showwrap{display:flex}
.o-showwrap .o-btn{pointer-events:auto}
.is-low .o-dock{top:calc(var(--sat) + 52u);padding:7u 8u 5u;gap:5u}
.o-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:4u 6u;flex:none;padding:2u 2u 4u}
.o-tabs .o-btn{flex:0 0 auto;min-height:34u;margin-bottom:6u;padding:0 10u;font-size:13u}
.o-tabs .o-btn small{font-size:10u;opacity:.9;margin-left:2u}
.is-low .o-tabs .o-btn{min-height:28u;padding:0 8u;font-size:11u;gap:4u}.is-low .o-tabs .o-btn small{display:none}.is-low .o-tabs .o-btn .o-ic{width:15u;height:15u}.is-low .o-tabs .o-btn:not(.c-orange):not(.keep) span,.is-narrow .o-tabs .o-btn:not(.c-orange):not(.keep) span{display:none}.is-low .o-tabs .o-btn:not(.c-orange):not(.keep),.is-narrow .o-tabs .o-btn:not(.c-orange):not(.keep){padding:0 9u}.is-low .o-tabs .o-gem,.is-narrow .o-tabs .o-gem{margin:0 1u;width:12u;height:12u}.is-narrow .o-tabs .o-btn small{display:none}.is-narrow .o-tabs .o-btn{min-height:30u;font-size:12u;padding:0 8u}
/* вкладки компактные везде: у неактивной — только значок (редкость/иконка), подпись и счётчик остаются у выбранной; так ряд не разваливается на 3 строки и сетка не теряет высоту */
.o-tabs .o-btn:not(.c-orange):not(.keep) span{display:none}.o-tabs .o-btn:not(.c-orange):not(.keep){padding:0 10u}.o-tabs .o-gem{margin:0 1u;width:14u;height:14u}.o-tabs .o-btn:not(.c-orange) small{display:none}.o-tabs .o-btn{min-height:32u;font-size:12.5u}
.o-split{flex:1;min-height:0;display:flex;gap:10u}
.is-tall.is-narrow .o-split{flex-direction:column}
.o-gridwrap{flex:1;min-height:0;min-width:0;overflow-y:auto;overflow-x:hidden;padding:8u 6u 10u;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#7a6bd0 transparent}
.o-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(68u,1fr));gap:9u;align-content:start}
.is-low .o-grid{grid-template-columns:repeat(auto-fill,minmax(58u,1fr));gap:7u}
.o-sc{position:relative;display:block;aspect-ratio:1;margin:0;padding:0;border:3u solid var(--rc);border-radius:9u;background:linear-gradient(to top,var(--rc2),rgba(0,0,0,0) 72%),#2c2260;box-shadow:0 0 0 3u var(--ink),0 5u 0 3u var(--ink);cursor:pointer;pointer-events:auto;transition:transform .1s}
.o-sc:active{transform:translateY(3u)}
.o-sc.sel{box-shadow:0 0 0 3u var(--ink),0 0 0 6u #fff,0 5u 0 6u var(--ink);z-index:1;transform:translateY(-2u)}
.o-sc .pic{position:absolute;left:7%;top:5%;width:86%;height:70%;object-fit:contain;filter:drop-shadow(0 3u 0 rgba(0,0,0,.3))}
.o-sc .ph{position:absolute;left:12%;top:8%;width:76%;height:62%;display:flex;align-items:center;justify-content:center;font-size:26u;font-weight:900;text-shadow:@O2;border-radius:8u;background:rgba(255,255,255,.12)}
.o-sc .sub{position:absolute;left:0;right:0;bottom:0;height:20u;display:flex;align-items:center;justify-content:center;gap:2u;border-top:2.5u solid var(--ink);border-radius:0 0 5u 5u;background:rgba(27,21,48,.92);font-size:10.5u;font-weight:900;text-shadow:@O1;white-space:nowrap;overflow:hidden}
.o-sc .sub .o-ic{width:14u;height:14u}
.o-sc .sub.eq{background:var(--green-d)}.o-sc .sub.exp{color:#ffc27a}.o-sc .sub.boss{background:#52308f}
.o-sc .o-gem{position:absolute;top:7u;right:6u;margin:0}
.o-sc.locked .pic{filter:brightness(.2) saturate(0)}
.o-sc .lk{position:absolute;left:50%;top:36%;width:40%;height:auto;transform:translate(-50%,-50%)}
.o-sc .ok{position:absolute;left:3u;top:3u;width:20u;height:20u}
.o-detail{flex:none;display:flex;flex-direction:column;gap:7u;padding:10u;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
.is-land .o-detail,.is-tall:not(.is-narrow) .o-detail{width:min(46%,250u)}
.o-detail{overflow-x:hidden}
.is-low .o-detail{padding:6u;gap:4u}
.o-d-top{display:flex;gap:10u;align-items:center}
.o-detail{container-type:inline-size}
.o-d-nm{flex:1 1 0;min-width:0}
.o-d-pic{position:relative;flex:none;width:min(78u,34cqw);height:auto;aspect-ratio:1;border:3u solid var(--rc,#888);border-radius:10u;background:linear-gradient(to top,var(--rc2,rgba(255,255,255,.2)),rgba(0,0,0,0) 80%),#2c2260;box-shadow:0 0 0 3u var(--ink)}
.o-d-pic img{position:absolute;inset:6%;width:88%;height:88%;object-fit:contain;animation:o-sway 3.2s ease-in-out infinite}
.o-d-pic .ph{position:absolute;inset:10%;display:flex;align-items:center;justify-content:center;font-size:30u;text-shadow:@O2}
.o-d-name{font-size:18u;font-weight:900;text-shadow:@O2;line-height:1.05;overflow-wrap:anywhere}
.is-low .o-d-name{font-size:14.5u}.is-low .o-d-pic{width:56u;height:56u}
.o-d-chips{display:flex;flex-wrap:wrap;gap:5u;margin-top:5u}
.o-d-desc{font-size:12u;font-weight:700;color:#e6e0ff;line-height:1.25}
.o-d-stats{display:flex;flex-direction:column;gap:5u}
.o-stat{display:flex;flex-wrap:wrap;align-items:center;gap:1u 6u;font-size:12u;min-width:0}
.o-stat b{flex:1 1 auto;min-width:0;font-size:10u;font-weight:900;text-transform:uppercase;text-shadow:@O1;white-space:nowrap}
.o-stat span{order:2;flex:none;text-align:right;font-weight:900;font-size:11u;text-shadow:@O1;white-space:nowrap}
.o-stat .o-bar{order:3;flex:1 1 100%;min-width:0;height:9u}
.is-low .o-stat b{font-size:9.5u}.is-low .o-stat span{font-size:10.5u}
.is-narrow .o-d-stats{display:grid;grid-template-columns:1fr 1fr;gap:5u 14u}
.is-narrow .o-detail{padding:7u;gap:5u}.is-narrow .o-d-pic{width:56u;height:56u}.is-narrow .o-d-name{font-size:15u}.is-narrow .o-d-desc{font-size:11u;line-height:1.2}.is-narrow .o-d-act .o-btn{min-height:42u}.is-narrow .o-d-act{gap:3u}
.o-d-act{display:flex;flex-direction:column;align-items:stretch;gap:6u;margin-top:auto;position:sticky;bottom:-7u;padding-top:4u;background:var(--panel-d)}
.o-d-act .o-btn{width:100%;margin-bottom:6u}
.o-hint{font-size:11.5u;font-weight:700;color:#ffe9a8;text-align:center;line-height:1.25}
.o-adprog{display:flex;gap:4u;align-items:center;font-size:12u}
.o-adprog i{flex:1;height:12u;border:2u solid var(--ink);border-radius:3u;background:rgba(0,0,0,.4)}
.o-adprog i.on{background:var(--blue);box-shadow:inset 0 2.5u 0 rgba(255,255,255,.45)}
.o-peekbtn{--c:var(--blue);--cd:var(--blue-d)}
.o-eye{width:60%;height:60%}

/* подарок дня */
.o-gift{width:min(96vw,760u);padding:16u 14u 6u;display:flex;flex-direction:column;gap:10u;max-height:100%}
.o-days{display:grid;grid-template-columns:repeat(4,1fr);gap:8u;min-height:0}
.is-land .o-days{grid-template-columns:repeat(6,1fr) 1.45fr}
.o-day{--bg:var(--dc);--bgd:#241a4d;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3u;padding:8u 3u 8u;text-align:center;font-size:11u;font-weight:800;line-height:1.15;--dc:#3f3380}
.o-day b{font-size:13u;font-weight:900;text-shadow:@O1;text-transform:uppercase}
.o-day .o-ic{width:40u;height:40u}
.o-day .pic{width:44u;height:44u;object-fit:contain}
.o-day .ds{font-size:10.5u;color:#d9d2ff}
.o-day.today{--dc:#6a4bd8;animation:o-glow 1s ease-in-out infinite alternate}
.o-day.claimed{--dc:#2e5a3a}
.o-day.d7{--dc:#8a5a10;grid-column:span 2}
.is-land .o-day.d7{grid-column:auto}
.o-day .tag2{position:absolute;top:-9u;left:50%;transform:translateX(-50%);padding:1u 7u;border:2.5u solid var(--ink);border-radius:6u;background:var(--gold);font-size:9.5u;font-weight:900;white-space:nowrap;text-shadow:@O1}
.o-day .done{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(20,60,30,.55);border-radius:5u}
.o-day .done img{width:38u;height:38u}
.o-gact{display:flex;flex-wrap:wrap;justify-content:center;gap:12u}
.o-gnote{text-align:center;font-size:12.5u;font-weight:700;color:#d9d2ff}

/* колесо фортуны */
.o-wh{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;gap:22u;pointer-events:none}
.is-tall .o-wh{flex-direction:column;gap:14u}
.o-wheel{position:relative;flex:none;width:var(--wd);height:var(--wd);pointer-events:none}
.o-rim{position:absolute;inset:-3.5%;border-radius:50%;background:var(--gold);border:4u solid var(--ink);box-shadow:inset 0 0 0 5u rgba(255,255,255,.3),inset 0 -8u 0 rgba(0,0,0,.16),0 8u 0 0 var(--gold-d),0 8u 0 4u var(--ink)}
.o-peg{position:absolute;left:50%;top:50%;width:4.4%;height:4.4%;margin:-2.2%;border-radius:50%;background:#fff6b0;border:2u solid var(--ink)}
.o-disc{position:absolute;inset:0;border-radius:50%;border:calc(var(--wd)*.02) solid var(--ink);overflow:hidden;will-change:transform}
.o-sec{position:absolute;left:50%;top:50%;width:0;height:0}
.o-sec .in{position:absolute;left:calc(var(--wd)*-.11);top:calc(var(--wd)*-.45);width:calc(var(--wd)*.22);height:calc(var(--wd)*.3);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:calc(var(--wd)*.005);text-align:center;font-size:calc(var(--wd)*.052);font-weight:900;line-height:1.05;text-shadow:@O2}
.o-sec .in img{width:calc(var(--wd)*.115);height:calc(var(--wd)*.115);object-fit:contain}
.o-sec .in span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:calc(var(--wd)*.04)}
.o-hub{position:absolute;left:50%;top:50%;width:19%;height:19%;transform:translate(-50%,-50%);border-radius:50%;background:var(--red);border:4u solid var(--ink);box-shadow:inset 0 4u 0 rgba(255,255,255,.45),0 4u 0 0 var(--ink);display:flex;align-items:center;justify-content:center}
.o-hub img{width:62%;height:62%}
.o-ptr{position:absolute;left:50%;top:-8%;width:13%;height:15%;transform:translateX(-50%);transform-origin:50% 20%;background:var(--ink);clip-path:polygon(50% 100%,0 6%,100% 6%);filter:drop-shadow(0 3u 0 rgba(0,0,0,.35));z-index:3}
.o-ptr::after{content:'';position:absolute;inset:13% 18% 26%;background:var(--red);clip-path:polygon(50% 100%,0 0,100% 0)}
.o-ptr.tick{animation:o-tick .16s ease-out}
.o-wctl{display:flex;flex-direction:column;align-items:stretch;gap:6u;width:min(92vw,300u);pointer-events:auto}
.o-wctl .o-btn{width:100%;white-space:normal;text-align:center;line-height:1.1;padding:6u 14u;margin-bottom:9u}
.o-wnote{text-align:center;font-size:12.5u;font-weight:700;color:#e6e0ff;min-height:16u}
.o-wwin{width:min(90vw,380u);padding:26u 16u 8u;display:flex;flex-direction:column;align-items:center;gap:8u;text-align:center}

/* настройки */
.o-set{width:min(94vw,460u);padding:16u 14u 6u;display:flex;flex-direction:column;gap:8u;max-height:100%;overflow:visible}
.o-row{display:flex;align-items:center;gap:12u;padding:8u 12u;min-height:50u}
.o-row .lbl{flex:1 1 auto;font-size:17u;text-shadow:@O1;min-width:0}
.o-row.wrap{flex-wrap:wrap}.o-row.wrap .lbl{flex:1 1 100%}.o-row.wrap .o-seg{flex:1 1 100%;justify-content:flex-start}
.o-row .o-ic{width:30u;height:30u}
.o-switch{position:relative;flex:none;width:68u;height:36u;border:3u solid var(--ink);border-radius:99u;background:#5d5683;box-shadow:inset 0 3u 0 rgba(0,0,0,.3);cursor:pointer;pointer-events:auto;transition:background .2s}
.o-switch::after{content:'';position:absolute;top:2u;left:2u;width:26u;height:26u;border-radius:50%;background:#fff;border:3u solid var(--ink);transition:transform .22s cubic-bezier(.3,1.5,.5,1)}
.o-switch.on{background:var(--green)}.o-switch.on::after{transform:translateX(32u)}
.o-seg{display:flex;gap:5u;flex-wrap:wrap;justify-content:flex-end}
.o-seg .o-btn{margin-bottom:7u}
.o-ver{text-align:center;font-size:11u;color:#a79fd6;font-weight:700}

/* итоги и пауза */
.o-end{position:relative;width:min(94vw,440u);display:flex;flex-direction:column;align-items:center;gap:6u;padding:34u 14u 8u}
.o-ribbon{position:absolute;left:50%;top:0;transform:translate(-50%,-52%);--bg:var(--green);--bgd:var(--green-d);padding:8u 26u 10u;font-size:26u;font-weight:900;text-transform:uppercase;text-shadow:@O3;white-space:nowrap;margin:0;z-index:2;max-width:106%}
.o-ribbon.lose{--bg:#8a4cf0;--bgd:#5224b0}.o-ribbon.pause{--bg:var(--blue);--bgd:var(--blue-d)}.o-ribbon.gold{--bg:var(--gold);--bgd:var(--gold-d)}
.o-stars{display:flex;justify-content:center;align-items:flex-end;gap:4u;margin:6u 0 2u}
.o-st{position:relative;width:72u;height:72u}
.o-st.mid{width:92u;height:92u;margin-bottom:12u}
.o-st img{position:absolute;inset:0;width:100%;height:100%}
.o-st .f{opacity:0}
.o-st.on .f{animation:o-star-fall .85s cubic-bezier(.3,0,.4,1) 0s forwards}
.o-st.on::after{content:'';position:absolute;left:50%;top:50%;width:100%;height:100%;margin:-50% 0 0 -50%;border-radius:50%;border:4u solid #fff;opacity:0;animation:o-ring .55s ease-out .42s backwards}
.o-reward{display:flex;align-items:center;justify-content:center;gap:12u;padding:8u 16u;width:100%}
.o-reward .o-ic{width:52u;height:52u}
.o-reward .big{font-size:34u;font-weight:900;color:var(--gold);text-shadow:@O3;line-height:1}
.o-reward .sm{font-size:12u;font-weight:700;color:#d9d2ff;line-height:1.3;text-align:left}
.o-total{display:flex;align-items:center;justify-content:center;gap:12u;width:100%;padding:8u 16u}
.o-total .o-ic{width:50u;height:50u}
.o-total .big{display:flex;align-items:baseline;font-size:38u;font-weight:900;color:var(--gold);text-shadow:@O3;line-height:1;font-variant-numeric:tabular-nums;min-width:3ch}
.o-lines{display:grid;grid-template-columns:1fr auto;gap:3u 14u;width:100%;padding:7u 14u;font-size:13u;line-height:1.2}
.o-lines span{color:#d9d2ff;font-weight:700;text-align:left}
.o-lines b{font-weight:900;text-align:right;text-shadow:@O1;white-space:nowrap}
.o-acts{display:flex;flex-direction:column;align-items:stretch;gap:5u;width:100%}
.o-acts>.o-btn{width:100%}
.o-btnrow3{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:8u;width:100%;align-items:stretch}
.o-btnrow3.two{grid-template-columns:1fr 1fr}
.o-btnrow3 .o-btn{width:100%;min-width:0;min-height:60u;padding:4u 4u 6u;flex-direction:column;gap:3u;font-size:12.5u;line-height:1;white-space:normal;text-align:center;border-radius:12u}
.o-btnrow3 .o-btn .o-ic{width:26u;height:26u}
.o-btnrow3 .o-next{flex-direction:row;gap:6u;font-size:21u}
.o-btnrow3 .o-next .o-ic{width:28u;height:28u}
.o-btnrow{display:flex;align-items:flex-start;gap:10u;width:100%}
.o-btnrow .o-btn:not(.o-ibtn){flex:1;min-width:0}
.o-x2{white-space:normal;line-height:1.05;padding:6u 14u}
.o-btn.lg.o-x2{font-size:22u}
.o-x2 small{display:block;font-size:11.5u;opacity:.95;text-transform:none;text-shadow:@O1}
.is-land .o-end.win,.is-land .o-end.lose{width:min(94vw,720u);display:grid;grid-template-columns:1fr 1fr;grid-template-areas:"stars acts" "total acts" "lines acts";column-gap:18u;row-gap:6u;align-items:center;align-content:center}
.is-land .o-end.win .o-stars,.is-land .o-end.lose .o-stars{grid-area:stars}
.is-land .o-end.win .o-total{grid-area:total}
.is-land .o-end.win .o-lines,.is-land .o-end.lose .o-lines{grid-area:lines}
.is-land .o-end.lose .o-lines{grid-row:total / lines;grid-column:1}
.is-land .o-end.win .o-acts,.is-land .o-end.lose .o-acts{grid-area:acts}
.is-low .o-end{padding-top:28u;gap:4u}.is-low .o-ribbon{font-size:21u;padding:5u 20u 7u}.is-low .o-st{width:56u;height:56u}.is-low .o-st.mid{width:72u;height:72u;margin-bottom:8u}
.is-low .o-total{padding:5u 12u}.is-low .o-total .o-ic{width:36u;height:36u}.is-low .o-total .big{font-size:30u}.is-low .o-lines{padding:5u 12u;font-size:12u}
.is-low .o-btnrow3 .o-btn{min-height:50u}.is-low .o-btnrow3 .o-btn .o-ic{width:22u;height:22u}.is-low .o-btnrow3 .o-next{font-size:18u}
.is-low .o-skull{width:70u;height:70u}
.o-skull{width:96u;height:96u;margin:4u 0;animation:o-sway 2.6s ease-in-out infinite}
.o-pause{width:min(90vw,380u);padding:30u 16u 8u;display:flex;flex-direction:column;align-items:stretch;gap:6u}
.o-pause .o-btn:not(.o-ibtn){width:100%}
.o-pause .o-btnrow .o-btn:not(.o-ibtn){flex:1}
.o-trophy{position:relative;width:min(92vw,400u);display:flex;flex-direction:column;align-items:center;gap:7u;padding:30u 14u 8u;text-align:center}
.o-rays{position:fixed;left:50%;top:46%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;background:repeating-conic-gradient(rgba(255,226,120,.26) 0 7deg,rgba(255,226,120,0) 7deg 22.5deg);animation:o-spin 16s linear infinite;pointer-events:none;-webkit-mask-image:radial-gradient(circle,#000 0,rgba(0,0,0,.6) 18%,transparent 40%);mask-image:radial-gradient(circle,#000 0,rgba(0,0,0,.6) 18%,transparent 40%)}
.o-tpic{position:relative;width:150u;height:150u;border:4u solid var(--rc);border-radius:18u;background:radial-gradient(circle,var(--rc2),rgba(0,0,0,0) 75%),#2c2260;box-shadow:0 0 0 4u var(--ink),0 0 36u var(--rc2)}
.o-tpic img{position:absolute;inset:5%;width:90%;height:90%;object-fit:contain;animation:o-trophy-in .9s cubic-bezier(.2,1.5,.4,1) both,o-sway 3s 1s ease-in-out infinite}
.o-conf{position:absolute;left:0;top:0;pointer-events:none}
.o-conf i{position:absolute;display:block;width:9u;height:9u;border:2u solid var(--ink)}
.o-notice{width:min(92vw,420u);display:flex;flex-direction:column;align-items:center;gap:8u;padding:36u 18u 8u;text-align:center}
.o-notice .txt{font-size:17u;font-weight:800;line-height:1.3;text-shadow:@O1}
.o-notice-art{position:relative;width:100%;height:112u;display:flex;align-items:center;justify-content:center}
.o-paint{position:relative;width:112u;height:94u;filter:drop-shadow(0 4u 0 rgba(0,0,0,.3));animation:o-sway 3s ease-in-out infinite}
.o-paint svg{width:100%;height:100%;display:block}
.o-splat{position:absolute;background:var(--c);opacity:.95;-webkit-mask:url('assets/fx/splat_03.webp') center/contain no-repeat;mask:url('assets/fx/splat_03.webp') center/contain no-repeat}
.o-splat.a{left:4%;top:-4u;width:104u;height:104u;--c:#ff5ad1;transform:rotate(-14deg)}
.o-splat.b{right:4%;top:2u;width:96u;height:96u;--c:#2f9bff;transform:rotate(22deg);-webkit-mask-image:url('assets/fx/splat_05.webp');mask-image:url('assets/fx/splat_05.webp')}
.o-splat.c{left:38%;top:14u;width:84u;height:84u;--c:#ffd23d;transform:rotate(60deg);-webkit-mask-image:url('assets/fx/splat_01.webp');mask-image:url('assets/fx/splat_01.webp')}
.o-superw{position:relative;width:min(94vw,420u);display:flex;flex-direction:column;align-items:center;gap:8u;padding:34u 16u 8u;text-align:center;--rc:#ffcf33;--rc2:rgba(255,207,51,.5)}
.o-superw .o-tpic img{animation:o-sway 3s ease-in-out infinite}
.is-low .o-superw{padding-top:30u;gap:4u}.is-low .o-superw .o-tpic{width:84u;height:84u}.is-low .o-superw .o-supbig i{height:20u}.is-low .o-superw .o-t3{font-size:17u!important}
.o-supbig{display:flex;gap:6u;width:100%}
.o-supbig i{flex:1;height:26u;border:3u solid var(--ink);border-radius:6u;background:rgba(0,0,0,.4)}
.o-supbig i.on{background:linear-gradient(#fff3a8 0 40%,#ffcf33 40% 100%);box-shadow:inset 0 3u 0 rgba(255,255,255,.5)}
.o-superw>.o-btn:not(.o-ibtn){width:100%}
.o-btn.c-fire{--c:#ff6a1f;--cd:#a83a08}
.o-surv{grid-area:surv;justify-self:center;width:min(100%,380u);min-height:54u;gap:10u;padding:4u 16u 6u 10u;justify-content:flex-start}
.o-surv .o-ic{width:38u;height:38u}
.o-surv .tx{display:flex;flex-direction:column;align-items:flex-start;gap:3u;text-align:left}
.o-surv b{font-size:18u;font-weight:900;line-height:1}
.o-surv small{font-size:11.5u;font-weight:800;text-shadow:@O1;text-transform:none}
.is-land .o-surv{grid-area:auto;flex-direction:column;width:100%;min-height:68u;padding:4u 3u 6u;font-size:11u;gap:2u;justify-content:center}
.is-land .o-surv .tx{align-items:center;text-align:center;gap:2u;max-width:100%}.is-land .o-surv small{white-space:normal;line-height:1.1;display:block}.is-land .o-surv b{font-size:9.8u;text-transform:none;letter-spacing:0;max-width:100%}.is-land .o-surv small{font-size:9.5u}.is-land .o-surv .o-ic{width:30u;height:30u}
.is-low .o-surv{min-height:58u}
.o-super{grid-area:super;justify-self:center;min-height:52u;padding:0 18u 0 10u;gap:10u}
.o-super .o-ic{width:38u;height:38u}
.o-sup-t{display:flex;flex-direction:column;align-items:flex-start;gap:5u}
.o-sup-t b{font-size:15u;font-weight:900;line-height:1}
.o-sup-t .row{display:flex;align-items:center;gap:6u}
.o-sup-t small{font-size:11u;font-weight:900;text-shadow:@O1}
.o-supcells{display:flex;gap:3u}
.o-supcells i{width:16u;height:9u;border:2u solid var(--ink);border-radius:2u;background:rgba(27,21,48,.55)}
.o-supcells i.on{background:#fff;box-shadow:inset 0 2u 0 rgba(255,255,255,.8)}
.o-super.pulse{animation:o-super 1.1s ease-in-out infinite}
.is-land .o-super{grid-area:auto;flex-direction:column;width:100%;min-height:68u;padding:4u 3u 6u;font-size:11u;gap:2u;text-align:center;white-space:normal}
.is-land .o-super .o-ic{width:30u;height:30u}.is-land .o-sup-t{align-items:center;gap:3u}.is-land .o-sup-t b{font-size:10.5u}.is-land .o-supcells i{width:6.5u}.is-land .o-sup-t .row{gap:4u}
.is-low .o-super{min-height:58u}
.o-boosts{display:grid;grid-template-columns:1fr 1fr;gap:8u}
.o-boosts .o-btn{min-height:52u;padding:4u 6u;white-space:normal;text-align:center;margin-bottom:9u;text-transform:none;line-height:1.05}
.o-boost{display:flex;flex-direction:column;align-items:center;gap:2u}
.o-boost small{display:flex;align-items:center;gap:4u;font-size:10u;font-weight:900;text-transform:uppercase;text-shadow:@O1}
.o-boost small .o-ic{width:14u;height:14u}
.o-boost b{font-size:14u;font-weight:900;text-shadow:@O2}
.o-h-perks{display:flex;flex-flow:column wrap;align-content:flex-start;gap:3h;max-height:58vh;padding:3h;border-radius:10h;background:rgba(27,21,48,.55)}
.o-pcell{position:relative;flex:none;width:30h;height:30h;border:2.5h solid var(--rc,#888);border-radius:8h;background:linear-gradient(to top,var(--rc2,rgba(255,255,255,.2)),rgba(0,0,0,0) 80%),#2c2260;box-shadow:0 0 0 2h var(--ink)}
.o-pcell img{position:absolute;inset:12%;width:76%;height:76%;object-fit:contain}
.o-pcell b{position:absolute;right:-3h;bottom:-4h;padding:0 3h;border:2h solid var(--ink);border-radius:5h;background:#ffd23d;color:var(--ink);font-size:10h;font-weight:900;line-height:12h;text-shadow:none}
.o-shield{display:inline-flex;align-items:center;gap:2h;margin-left:6h;padding:0 6h 0 2h;height:26h;border:2.5h solid var(--ink);border-radius:99h;background:#1b7fb8;font-size:13h;font-weight:900;text-shadow:@H1}
.o-shield .o-ic{width:20h;height:20h}
.o-bn.ok{--bg:var(--green);--bgd:var(--green-d)}
.o-bn.loc{--bg:var(--teal);--bgd:var(--teal-d)}
.o-bn-s .o-ic{display:inline-block;width:16u;height:16u;vertical-align:-3u;margin-right:2u}
.o-perkm{width:min(96vw,780u);display:flex;flex-direction:column;align-items:center;gap:10u;padding:34u 14u 8u}
.o-perks{display:flex;gap:12u;width:100%;justify-content:center;align-items:stretch}
.o-perks.busy{pointer-events:none;filter:saturate(.7)}
.o-perk{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8u;padding:12u 9u 12u;border:4u solid var(--rc);border-radius:12u;background:linear-gradient(to bottom,var(--rc2),rgba(0,0,0,0) 60%),#2c2260;box-shadow:0 0 0 3u var(--ink),0 7u 0 3u var(--ink);text-align:center;cursor:pointer;pointer-events:auto;animation:o-perk-in .55s cubic-bezier(.2,1.4,.4,1) var(--dl,0s) backwards;transition:transform .12s}
@media (hover:hover){.o-perk:hover{transform:translateY(-5u) scale(1.03)}}
.o-perk:active{transform:scale(.97)}
.o-perk .pic{flex:none;display:flex;align-items:center;justify-content:center;width:78u;height:78u;border:3u solid var(--ink);border-radius:12u;background:radial-gradient(circle,var(--rc2),rgba(0,0,0,.35) 90%),#201848}
.o-perk .pic img{width:82%;height:82%;object-fit:contain;filter:drop-shadow(0 3u 0 rgba(0,0,0,.35))}
.o-perk .tx{display:flex;flex-direction:column;align-items:center;gap:5u;min-width:0}
.o-perk .rar{padding:2u 9u 3u;border:2.5u solid var(--ink);border-radius:99u;background:var(--rc);font-size:10.5u;font-weight:900;text-transform:uppercase;text-shadow:@O1;color:#fff}
.o-perk .nm{font-size:17u;font-weight:900;line-height:1.08;text-shadow:@O2;overflow-wrap:anywhere}
.o-perk .ds{font-size:12.5u;font-weight:700;line-height:1.25;color:#efeaff}
.o-perk .dots{display:flex;gap:3u;margin-top:1u}
.o-perk .dots i{width:11u;height:11u;border:2u solid var(--ink);border-radius:2.5u;background:rgba(0,0,0,.4)}
.o-perk .dots i.on{background:var(--rc)}.o-perk .dots i.nx{background:#fff;animation:o-blink .7s ease-in-out infinite alternate}
.o-perk.legendary{animation:o-perk-in .55s cubic-bezier(.2,1.4,.4,1) var(--dl,0s) backwards,o-lglow 1.8s ease-in-out infinite;overflow:hidden}
.o-perk.legendary::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.55) 50%,transparent 62%);background-size:260% 100%;animation:o-shimmer 2.6s linear infinite}
.o-perk.epic{box-shadow:0 0 0 3u var(--ink),0 7u 0 3u var(--ink),0 0 18u rgba(180,92,255,.45)}
.o-perkacts{display:flex;flex-wrap:wrap;justify-content:center;gap:10u}
.is-tall .o-perks{flex-direction:column;gap:9u}
.is-tall .o-perk{flex:0 0 auto;flex-direction:row;text-align:left;align-items:center;gap:10u;padding:9u 10u}
.is-tall .o-perk .tx{align-items:flex-start;flex:1}
.is-tall .o-perk .pic{width:64u;height:64u}
.is-low .o-perkm{padding-top:30u;gap:6u}.is-low .o-perk{gap:4u;padding:7u 6u}.is-low .o-perk .pic{width:48u;height:48u}.is-low .o-perk .nm{font-size:14u}.is-low .o-perk .ds{font-size:11u}
.o-wv{display:flex;flex-direction:column;align-items:center;gap:2u;line-height:1}
.o-wv small{font-size:14u;text-transform:uppercase;text-shadow:@O1;color:#d9d2ff}
.o-wv b{font-size:62u;font-weight:900;color:var(--gold);text-shadow:@O4;line-height:.95}
.o-rec{margin-top:4u;padding:3u 12u 4u;border:3u solid var(--ink);border-radius:8u;background:var(--gold);font-size:14u;font-weight:900;text-transform:uppercase;text-shadow:@O1;animation:o-bump 1s ease-in-out infinite}
.o-recl{margin-top:3u;font-size:13u;font-weight:800;color:#d9d2ff;text-shadow:@O1}
.o-perkwrap{width:100%;display:flex;flex-direction:column;gap:4u}
.o-perkwrap .k{font-size:11u;color:#ffd7a0;text-transform:uppercase}
.o-perkgrid{display:flex;flex-wrap:wrap;gap:8u;padding:8u 10u;max-height:96u;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
.o-perkgrid .o-pcell{width:34u;height:34u;border-width:2.5u;border-radius:8u;box-shadow:0 0 0 2u var(--ink)}
.o-perkgrid .o-pcell b{font-size:10u;right:-4u;bottom:-5u;line-height:12u}
.is-land .o-end.surv{width:min(94vw,740u);display:grid;grid-template-columns:1fr 1fr;grid-template-areas:"wv acts" "total acts" "lines acts" "perks acts";column-gap:18u;row-gap:6u;align-items:center;align-content:center}
.is-land .o-end.surv .o-wv{grid-area:wv}.is-land .o-end.surv .o-total{grid-area:total}.is-land .o-end.surv .o-lines{grid-area:lines}.is-land .o-end.surv .o-perkwrap{grid-area:perks}.is-land .o-end.surv .o-acts{grid-area:acts}
.is-low .o-wv b{font-size:44u}.is-low .o-perkgrid{max-height:64u}.is-low .o-perkgrid .o-pcell{width:28u;height:28u}
.o-help{font-size:12.5u;font-weight:700;color:#e6e0ff;text-align:center;line-height:1.3}

/* цифры урона и боевые подписи (их создаёт GameFX в #ocm-fx-layer, позицию, всплеск масштаба и прозрачность ставит он).
   Размер — от короткой стороны экрана (vmin), с ограничением и по ширине (vw), чтобы подпись вроде «ОТРУБЛЕНО! КРИТ» не занимала пол-экрана;
   обводка в em (чёткая на любом размере). */
.ocm-dmg{--ow:max(1.25px,.075em);position:absolute;left:0;top:0;width:max-content;max-width:60vw;font-family:'Montserrat','Arial Black',system-ui,sans-serif;font-weight:900;font-size:clamp(12px,3.1vmin,24px);line-height:1;color:#fff;white-space:nowrap;pointer-events:none;will-change:transform,opacity;
text-shadow:var(--ow) 0 #1b1530,calc(var(--ow) * -1) 0 #1b1530,0 var(--ow) #1b1530,0 calc(var(--ow) * -1) #1b1530,var(--ow) var(--ow) #1b1530,calc(var(--ow) * -1) calc(var(--ow) * -1) #1b1530,var(--ow) calc(var(--ow) * -1) #1b1530,calc(var(--ow) * -1) var(--ow) #1b1530,0 calc(var(--ow) * 2) 0 #1b1530}
.ocm-dmg-hit{color:#fff}
.ocm-dmg-small{font-size:min(clamp(10px,2.3vmin,17px),3.4vw);color:#e8eef5}
.ocm-dmg-crit{color:#ffe14a;font-size:min(clamp(14px,3.8vmin,27px),4vw);letter-spacing:.02em;text-shadow:var(--ow) 0 #1b1530,calc(var(--ow) * -1) 0 #1b1530,0 var(--ow) #1b1530,0 calc(var(--ow) * -1) #1b1530,var(--ow) var(--ow) #1b1530,calc(var(--ow) * -1) calc(var(--ow) * -1) #1b1530,var(--ow) calc(var(--ow) * -1) #1b1530,calc(var(--ow) * -1) var(--ow) #1b1530,0 calc(var(--ow) * 2) 0 #7a3b00}
.ocm-dmg-big{color:#ffe14a;font-size:min(clamp(14px,4.2vmin,30px),4.3vw);letter-spacing:.01em}
.ocm-dmg-burn{color:#ff8a1f;font-size:min(clamp(11px,2.7vmin,20px),3.6vw)}
.ocm-dmg-poison{color:#7dff4a;font-size:min(clamp(11px,2.7vmin,20px),3.6vw)}
.ocm-dmg-glitch{color:#ff3aff;font-size:min(clamp(13px,3.6vmin,27px),4vw);text-shadow:var(--ow) 0 #00f0ff,calc(var(--ow) * -1) 0 #ff2a2a,0 var(--ow) #1b1530,0 calc(var(--ow) * -1) #1b1530,0 calc(var(--ow) * 2) 0 #1b1530;letter-spacing:.08em}
.ocm-dmg-coin{color:#ffcf33;font-size:min(clamp(12px,2.9vmin,22px),3.8vw)}

/* анимации */
@keyframes o-super{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes o-sword-c{
0%{opacity:0;transform:translate(.9em,-2.6em) rotate(154deg) scale(.9);filter:brightness(1) blur(0) drop-shadow(0 .05em 0 rgba(0,0,0,.35));animation-timing-function:cubic-bezier(.5,0,.95,.5)}
.6%{opacity:1}
5%{opacity:1;transform:translate(-.26em,.78em) rotate(154deg) scale(1);filter:brightness(1.3) blur(0) drop-shadow(0 .05em 0 rgba(0,0,0,.35));animation-timing-function:ease-out}
7%{opacity:1;transform:translate(-.3em,.86em) rotate(154deg) scale(1.04);filter:brightness(2.4) blur(.02em) drop-shadow(0 0 .1em #fff);animation-timing-function:ease-in}
15%{opacity:0;transform:translate(-.24em,-.1em) rotate(154deg) scale(1.45);filter:brightness(4) blur(.15em) drop-shadow(0 0 .2em #fff)}
100%{opacity:0;transform:translate(.9em,-2.6em) rotate(154deg) scale(.9)}
}
@keyframes o-trail-c{
0%{opacity:0;clip-path:inset(0 0 100% 0)}
.7%{opacity:.95}
5%{opacity:.95;clip-path:inset(0 0 0 0)}
10%{opacity:0;clip-path:inset(0 0 0 0)}
100%{opacity:0;clip-path:inset(0 0 100% 0)}
}
@keyframes o-slash-c{
0%{opacity:0;transform:skewX(-19deg) scaleY(0)}
.8%{opacity:1}
5%{opacity:1;transform:skewX(-19deg) scaleY(1);filter:brightness(2.2)}
11%{opacity:.95;transform:skewX(-19deg) scaleY(1);filter:brightness(1)}
30%{opacity:.7}
52%{opacity:.95}
74%{opacity:.7}
92%{opacity:.9;transform:skewX(-19deg) scaleY(1)}
99%{opacity:0;transform:skewX(-19deg) scaleY(1)}
100%{opacity:0;transform:skewX(-19deg) scaleY(0)}
}
@keyframes o-halfl-c{
0%,4.8%{transform:translate(0,0)}
6.2%{transform:translate(-.085em,.105em)}
8.5%{transform:translate(-.03em,.04em)}
10.5%{transform:translate(-.055em,.07em)}
93%{transform:translate(-.055em,.07em)}
99%,100%{transform:translate(0,0)}
}
@keyframes o-halfr-c{
0%,4.8%{transform:translate(0,0)}
6.2%{transform:translate(.085em,-.105em)}
8.5%{transform:translate(.03em,-.04em)}
10.5%{transform:translate(.055em,-.07em)}
93%{transform:translate(.055em,-.07em)}
99%,100%{transform:translate(0,0)}
}
@keyframes o-sp-c{
0%,4.6%{opacity:0;transform:translate(var(--sx,0),var(--sy,0)) scale(.3)}
5.4%{opacity:1;transform:translate(var(--sx,0),var(--sy,0)) scale(1.1)}
12%{opacity:0;transform:translate(calc(var(--sx,0) + var(--dx,0)),calc(var(--sy,0) + var(--dy,0))) scale(.25) rotate(90deg)}
100%{opacity:0}
}
@keyframes o-spv-c{
0%,6.5%{opacity:0;transform:translate(var(--sx,0),var(--sy,0)) scale(.4)}
8%{opacity:1;transform:translate(var(--sx,0),var(--sy,0)) scale(1.1)}
19%{opacity:0;transform:translate(calc(var(--sx,0) + var(--dx,0)),calc(var(--sy,0) + var(--dy,0))) scale(.2) rotate(120deg)}
100%{opacity:0}
}
@keyframes o-logo-in{0%{opacity:0;transform:translateY(-190%) rotate(-14deg) scale(.7)}55%{opacity:1;transform:translateY(7%) rotate(-2deg) scale(1.05)}75%{transform:translateY(-3%) rotate(-5deg) scale(.99)}100%{opacity:1;transform:rotate(-4deg)}}
@keyframes o-lsw{
0%,3.5%{opacity:0;transform:translate(-2.3em,.4em) rotate(5deg) scale(.9);filter:brightness(1)}
4.2%{opacity:1;transform:translate(-1.8em,.31em) rotate(18deg) scale(1)}
6%{opacity:1;transform:translate(1.75em,-.3em) rotate(40deg) scale(1.05);filter:brightness(1)}
8%{opacity:1;transform:translate(2.05em,-.42em) rotate(46deg) scale(1.05);filter:brightness(1.7)}
13%{opacity:0;transform:translate(2.15em,-1.15em) rotate(50deg) scale(1.35);filter:brightness(3) blur(.08em)}
100%{opacity:0;transform:translate(2.15em,-1.15em) rotate(50deg) scale(1.35)}
}
@keyframes o-lflash{
0%,4.2%{opacity:0;transform:rotate(-9.7deg) scaleX(0)}
6%{opacity:1;transform:rotate(-9.7deg) scaleX(1)}
9%{opacity:.85;transform:rotate(-9.7deg) scaleX(1)}
16%,100%{opacity:0;transform:rotate(-9.7deg) scaleX(1)}
}
@keyframes o-ltop{
0%,5.6%{transform:translate(0,0)}
6.8%{transform:translate(.06em,-.1em) rotate(-1.2deg)}
9%{transform:translate(.02em,-.035em)}
11%{transform:translate(.04em,-.06em)}
88%{transform:translate(.04em,-.06em)}
94%,100%{transform:translate(0,0)}
}
@keyframes o-gloss{0%,62%{background-position:170% 0,0 0}100%{background-position:-70% 0,0 0}}
@keyframes o-tip{0%{opacity:0;transform:translate(-50%,8h)}10%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-4h)}}
@keyframes o-perk-in{0%{opacity:0;transform:translateY(70u) scale(.7) rotate(-4deg)}100%{opacity:1;transform:none}}
@keyframes o-lglow{0%,100%{box-shadow:0 0 0 3u var(--ink),0 7u 0 3u var(--ink),0 0 14u rgba(255,176,42,.5)}50%{box-shadow:0 0 0 3u var(--ink),0 7u 0 3u var(--ink),0 0 34u rgba(255,200,60,.95)}}
@keyframes o-shimmer{0%{background-position:170% 0}100%{background-position:-70% 0}}
@keyframes o-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
@keyframes o-bump{0%{transform:scale(1)}40%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes o-blink{from{opacity:1}to{opacity:.4}}
@keyframes o-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes o-sway2{0%,100%{transform:rotate(12deg)}50%{transform:rotate(24deg)}}
@keyframes o-shake{0%,100%{translate:0 0}18%{translate:-7u 0}36%{translate:7u 0}54%{translate:-5u 0}72%{translate:4u 0}}
@keyframes o-pop{0%{opacity:0;transform:scale(.5) translateY(26u)}55%{opacity:1;transform:scale(1.07)}100%{opacity:1;transform:none}}
@keyframes o-fade{from{opacity:0}to{opacity:1}}
@keyframes o-rise{from{opacity:0;transform:translateY(34u) scale(.85)}to{opacity:1;transform:none}}
@keyframes o-bn-in{0%{opacity:0;transform:skewX(-6deg) translateX(-130%)}60%{opacity:1;transform:skewX(-6deg) translateX(4%)}100%{opacity:1;transform:skewX(-6deg)}}
@keyframes o-bn-out{to{opacity:0;transform:skewX(-6deg) translateX(130%)}}
@keyframes o-flash{0%{opacity:1}100%{opacity:0}}
@keyframes o-toast{0%{opacity:0;transform:translate(-50%,20u)}10%{opacity:1;transform:translate(-50%,0)}86%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,8u)}}
@keyframes o-heart-pop{0%{transform:scale(1)}28%{transform:scale(1.6);filter:brightness(1.8)}100%{transform:scale(.86)}}
@keyframes o-heart-heal{0%{transform:scale(.3);opacity:0}60%{transform:scale(1.45);opacity:1}100%{transform:scale(1)}}
@keyframes o-star-fall{0%{opacity:0;transform:translateY(-240%) scale(2.5) rotate(-60deg)}16%{opacity:1}52%{transform:translateY(0) scale(1) rotate(10deg)}66%{transform:translateY(-24%) scale(1.06) rotate(-5deg)}80%{transform:translateY(0) scale(1) rotate(3deg)}90%{transform:translateY(-6%) scale(1)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}
@keyframes o-ring{0%{opacity:.95;transform:scale(.4)}100%{opacity:0;transform:scale(2)}}
@keyframes o-spin{to{transform:rotate(360deg)}}
@keyframes o-glow{from{filter:brightness(1)}to{filter:brightness(1.3)}}
@keyframes o-bob{from{translate:0 0}to{translate:0 -6u}}
@keyframes o-node-pulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}
@keyframes o-tick{0%{transform:translateX(-50%) rotate(0)}35%{transform:translateX(-50%) rotate(-20deg)}100%{transform:translateX(-50%) rotate(0)}}
@keyframes o-trophy-in{0%{opacity:0;transform:scale(.1) rotate(-200deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes o-slide-in{from{opacity:0;transform:translateY(40u)}to{opacity:1;transform:none}}
.o-menu .o-btn,.o-menu .o-pill{animation:o-rise .5s cubic-bezier(.2,1.4,.4,1) var(--dl,0s) backwards}
@media (prefers-reduced-motion:reduce){#ocm-ui *,#ocm-ui *::before,#ocm-ui *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;animation-delay:0s!important}
.o-csw,.o-trail,.o-sp,.o-lsw,.o-lflash{display:none!important}
.o-limg.top{animation:none!important}
.o-half.l{animation:none!important;transform:translate(-.055em,.07em)}.o-half.r{animation:none!important;transform:translate(.055em,-.07em)}
.o-slash{animation:none!important;opacity:.9;transform:skewX(-19deg) scaleY(1)}}
`;
/** CSS с подстановкой: @O1..@O4 / @H1..@H2 — обводка текста, Nu — единицы интерфейса (--u), Nh — единицы HUD (--hu). */
function gameUiCss() {
    const css = GAMEUI_CSS_BASE + GAMEUI_CSS_MENU + GAMEUI_CSS_PAGES;
    return css
        .replace(/@O1/g, gameUiRing(1.2, 1.8, 'u')).replace(/@O2/g, gameUiRing(2, 3, 'u'))
        .replace(/@O3/g, gameUiRing(3, 4.5, 'u')).replace(/@O4/g, gameUiRing(4, 6, 'u'))
        .replace(/@H1/g, gameUiRing(1.2, 1.8, 'h')).replace(/@H2/g, gameUiRing(2, 3, 'h'))
        .replace(/(?<![\w.#-])(-?\d*\.?\d+)u(?![\w-])/g, (m, n) => 'calc(var(--u) * ' + n + ')')
        .replace(/(?<![\w.#-])(-?\d*\.?\d+)h(?![\w-])/g, (m, n) => 'calc(var(--hu) * ' + n + ')');
}

/**
 * Мини-гиперскрипт: элемент с атрибутами и детьми. props: class, text, html, style (строка или объект
 * с переменными), data, on<событие>: функция; остальное — атрибуты.
 * @param {string} tag @param {Record<string, any> | null} [props] @param {...any} kids @returns {HTMLElement}
 */
function ocmH(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
        for (const k of Object.keys(props)) {
            const v = props[k];
            if (v == null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'text') el.textContent = v;
            else if (k === 'html') el.innerHTML = v;
            else if (k === 'style') { if (typeof v === 'string') el.style.cssText = v; else for (const s of Object.keys(v)) el.style.setProperty(s, String(v[s])); }
            else if (k === 'data') { for (const d of Object.keys(v)) el.dataset[d] = String(v[d]); }
            else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
            else if (k === 'hidden') el.hidden = true;
            else el.setAttribute(k, v === true ? '' : String(v));
        }
    }
    for (const kid of kids.flat(3)) {
        if (kid == null || kid === false) continue;
        el.append(typeof kid === 'object' && kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
}

/** Светлее (k > 0) или темнее (k < 0) цвета #rrggbb. */
function gameUiShade(hex, k) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    const v = m ? parseInt(m[1], 16) : 0x888888;
    const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
    return '#' + ((1 << 24) | (f(v >> 16) << 16) | (f((v >> 8) & 255) << 8) | f(v & 255)).toString(16).slice(1);
}

/** #rrggbb -> rgba(...). */
function gameUiRgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    const v = m ? parseInt(m[1], 16) : 0x888888;
    return 'rgba(' + (v >> 16) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
}

/** 12345 -> «12 345». */
function gameUiFmt(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** GameLook / GameShopData пишет основная сессия: до их появления интерфейс не падает. */
function gameUiLook() {
    // @ts-ignore — модуль может быть не подключён
    return /** @type {any} */ (typeof GameLook !== 'undefined' ? GameLook : null);
}
function gameUiShopData() {
    // @ts-ignore — модуль может быть не подключён
    return /** @type {any} */ (typeof GameShopData !== 'undefined' ? GameShopData : null);
}

/** @satisfies {Record<string, any>} */
const GameUI = {
    /** @type {LoryApp | null} */
    app: null,
    /** @type {HTMLElement | null} */
    root: null,
    /** @type {Record<string, HTMLElement>} */
    L: {},
    /** Единица интерфейса, px на 1u. */
    u: 1,
    /** 'tall' (портрет) | 'land' (альбом). */
    mode: 'land',
    low: false,
    _inited: false,
    _busy: false,
    /** Открытая страница на весь экран (карта, арсенал, магазин, подарок, колесо, настройки). @type {{ name: string, el: HTMLElement, onClose?: () => void, onFit?: () => void, tick?: () => void, keys?: (e: KeyboardEvent) => boolean } | null} */
    page: null,
    /** Окна поверх всего: card, pause, win, lose, trophy, prize, super, notice. @type {Record<string, HTMLElement>} */
    modals: {},
    /** Тикеры открытых окон (раз в секунду). @type {Record<string, () => void>} */
    _mtick: {},
    /** @type {HTMLElement | null} */
    menuEl: null,
    /** @type {HTMLElement | null} */
    hudEl: null,
    _hudOn: false,
    /** @type {Record<string, any>} */
    h: {},
    /** @type {Array<{ el: HTMLElement, v: number, t: number, keep?: boolean }>} */
    _counters: [],
    /** @type {Array<{ el: HTMLElement, c: any }>} */
    _pills: [],
    /** @type {any} */
    _banner: null,
    /** @type {any[]} */
    _bannerQ: [],
    /** @type {number[]} */
    _timers: [],
    _toastT: 0,
    _clock: 0,
    _audioHooked: false,
    _musicKind: '',
    /** @type {any} */
    _lvl: null,
    _wavesTotal: 0,
    /** @type {any} */
    _boss: null,
    _bossT: 1,
    _bossShown: 1,
    _bossTrail: 1,
    _runTarget: 0,
    _runPending: 0,
    _heartsMax: 0,
    /** @type {HTMLElement[]} */
    _hearts: [],
    _x2Done: false,
    _spinning: false,
    _wheelAngle: 0,
    _shopTab: '',
    _shopSel: '',
    _arsSel: '',
    _arsFilter: 'all',
    _mapSel: 0,

    // =============================================================================================
    // Запуск
    // =============================================================================================

    async init(app, game) {
        this.app = app;
        const st = ocmH('style', { id: 'ocm-ui-css' });
        st.textContent = gameUiCss();
        document.head.appendChild(st);
        this._build();
        this._fit();
        window.addEventListener('resize', () => this._fit());
        window.addEventListener('orientationchange', () => { setTimeout(() => this._fit(), 250); });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this._fit());
        app.onFrame(dt => this._frame(dt));
        this._hookAudio();
        this._applySettings();
        window.addEventListener('keydown', e => this._key(e));
        window.addEventListener('lory-language', () => this._relang());
        window.addEventListener('pointerdown', () => this._denyCheck(), true);
        window.addEventListener('ocm-icon', (e) => this._iconUpdate(e));
        window.addEventListener('lory-release-input', () => { /* ввод игры живёт в Game; интерфейсу сбрасывать нечего */ });
        if (typeof Platform !== 'undefined') Platform.backHandler = () => this._back();
        this._inited = true;
    },

    /** GameLook дорисовал иконку предмета (догрузилась текстура): обновить все картинки с этим id. */
    _iconUpdate(e) {
        const ev = /** @type {any} */ (e);
        const id = (ev && ev.detail && ev.detail.id) || (ev && ev.id);
        const L = gameUiLook();
        const it = id && typeof Shop !== 'undefined' ? Shop.item(id) : null;
        if (!it || !L || !this.root) return;
        const url = L.icon(it);
        for (const img of /** @type {NodeListOf<HTMLImageElement>} */ (this.root.querySelectorAll('img[data-iid="' + id + '"]'))) {
            img.src = url;
            img.hidden = false;
            const ph = /** @type {HTMLElement} */ (img.nextElementSibling);
            if (ph && ph.classList.contains('ph')) ph.hidden = true;
        }
    },

    /** Тексты: ключ Lang; название из данных игры { ru, en } — через nm(). */
    t(key, params) { return Lang.t(key, params); },
    nm(obj) { return obj ? String(obj[Lang.code] || obj.en || obj.ru || '') : ''; },

    sfx(name, opts) {
        if (typeof GameAudio !== 'undefined') GameAudio.play(name, opts);
    },

    /** Баланс: валюта одна на всю игру — Shop.coins. */
    coins() { return typeof Shop !== 'undefined' ? Shop.coins : 0; },

    icon(name, cls) {
        return ocmH('img', { class: 'o-ic' + (cls ? ' ' + cls : ''), src: GAMEUI_ICON[name], alt: '', draggable: 'false' });
    },

    /** Кнопка с звуком и защитой: .is-off — нажатие объясняется (onOff), .is-busy — игнорируется. */
    btn(o) {
        const b = ocmH('button', { class: 'o-btn ' + (o.cls || ''), type: 'button', style: o.style, 'aria-label': o.label },
            o.icon ? this.icon(o.icon) : null, o.text != null ? ocmH('span', { text: o.text }) : null, o.kids);
        b.addEventListener('click', (e) => {
            if (b.classList.contains('is-busy')) return;
            if (b.classList.contains('is-off')) { this.sfx('error'); if (o.onOff) o.onOff(); return; }
            this.sfx(o.sound || 'click');
            if (o.onTap) o.onTap(e);
        });
        return b;
    },

    ibtn(icon, onTap, cls, label) {
        return this.btn({ cls: 'o-ibtn ' + (cls || ''), icon, onTap, label });
    },

    /** Плашка с монетами: число катится к балансу. */
    pill() {
        const num = ocmH('b', { text: gameUiFmt(this.coins()) });
        const el = ocmH('div', { class: 'o-pill', title: '' }, this.icon('coin'), num);
        const c = { el: num, v: this.coins(), t: this.coins() };
        this._counters.push(c);
        this._pills.push({ el, c });
        return el;
    },

    refreshCoins(animate) {
        const total = this.coins();
        this._pills = this._pills.filter(p => p.el.isConnected);
        for (const p of this._pills) {
            const up = total > p.c.t;
            p.c.t = total;
            if (!animate) p.c.v = total;
            if (up && animate) { p.el.classList.remove('bump'); void p.el.offsetWidth; p.el.classList.add('bump'); }
            if (!animate) p.c.el.textContent = gameUiFmt(total);
        }
    },

    onCoinsChanged(total) { this.refreshCoins(true); },

    // =============================================================================================
    // Корень, масштаб, кадр
    // =============================================================================================

    _build() {
        const root = ocmH('div', { id: 'ocm-ui' });
        this.root = root;
        for (const name of ['hud', 'flash', 'banner', 'menu', 'page', 'modal', 'fly', 'toast']) {
            const l = ocmH('div', { class: 'o-layer', data: { l: name } });
            this.L[name] = l;
            root.append(l);
        }
        document.body.appendChild(root);
        this.L.flash.append(ocmH('div', { class: 'o-flash' }));
        this.L.banner.append(ocmH('div', { class: 'o-banner' }));
        this.L.toast.append(ocmH('div', { class: 'o-toast' }));
        this._buildMenu();
        this._buildHud();
    },

    _fit() {
        const r = this.root;
        if (!r) return;
        const W = r.clientWidth || window.innerWidth, H = r.clientHeight || window.innerHeight;
        const s = Math.min(W, H), l = Math.max(W, H);
        // потолок масштаба: 1.5 до 768 px по короткой стороне, плавно до 1.85 на Full HD (иначе на большом мониторе интерфейс выглядит крошечным)
        const cap = 1.5 + 0.35 * Math.max(0, Math.min(1, (s - 768) / 312));
        const u = Math.max(0.68, Math.min(cap, Math.min(s / 400, l / 720)));
        this.u = u;
        const tall = H > W;
        this.mode = tall ? 'tall' : 'land';
        this.low = H < 420;
        r.style.setProperty('--u', u.toFixed(3) + 'px');
        r.classList.toggle('is-tall', tall);
        r.classList.toggle('is-land', !tall);
        r.classList.toggle('is-low', this.low);
        r.classList.toggle('is-narrow', W < 480);
        const wd = tall ? Math.min(W * 0.8, H * 0.4, 400) : Math.min(H * (this.low ? 0.6 : 0.64), W * 0.44, 380);
        r.style.setProperty('--wd', Math.round(wd) + 'px');
        if (this.page && this.page.onFit) this.page.onFit();
        if (typeof HudLayout !== 'undefined' && HudLayout._inited) HudLayout.schedule();
    },

    _frame(dt) {
        // Катящиеся числа.
        for (let i = this._counters.length - 1; i >= 0; i--) {
            const c = this._counters[i];
            if (!c.el.isConnected && !c.keep) { this._counters.splice(i, 1); continue; }
            if (c.v === c.t) continue;
            const d = c.t - c.v;
            c.v = Math.abs(d) < 0.6 ? c.t : c.v + d * Math.min(1, dt * 7) + Math.sign(d) * Math.min(Math.abs(d), dt * 30);
            if (Math.abs(c.t - c.v) < 0.6) c.v = c.t;
            c.el.textContent = gameUiFmt(c.v);
        }
        // Полоска босса: быстрая красная и медленный жёлтый «след» урона.
        if (this._boss && this.h.bossFill) {
            this._bossShown += (this._bossT - this._bossShown) * Math.min(1, dt * 14);
            if (this._bossTrail > this._bossShown) this._bossTrail = Math.max(this._bossShown, this._bossTrail - dt * 0.35);
            else this._bossTrail = this._bossShown;
            this.h.bossFill.style.transform = 'scaleX(' + Math.max(0, this._bossShown).toFixed(4) + ')';
            this.h.bossTrail.style.transform = 'scaleX(' + Math.max(0, this._bossTrail).toFixed(4) + ')';
        }
        // Монеты забега: число догоняет прилетевшие монетки.
        if (this._hudOn && this.h.runC) {
            if (this._runPending <= 0 && this.h.runC.t !== (Game.runCoins || 0)) this.h.runC.t = Game.runCoins || 0;
        }
        // Раз в секунду: таймеры подарка и колеса.
        this._clock += dt;
        if (this._clock >= 1) { this._clock = 0; this._tick1s(); }
    },

    /** Каждый кадр боя: выносливость меча (плавные полоски боя ведёт _frame — он работает и на паузе). */
    update(dt) { this._stamina(); },

    /** Полоска выносливости внизу по центру: зелёная → жёлтая → оранжевая; отдых, заморозка, выбивание — свои подписи. */
    _stamina() {
        const h = this.h, S = /** @type {any} */ (GameSword);
        if (!h.stam) return;
        const have = this._hudOn && typeof S.stamina === 'number' && S.staminaMax > 0;
        if (h.stam.hidden === have) { h.stam.hidden = !have; if (typeof HudLayout !== 'undefined' && HudLayout._inited) HudLayout.schedule(); }
        if (!have) return;
        const f = Math.max(0, Math.min(1, S.stamina / S.staminaMax));
        const stun = typeof S.stunWait === 'function' && S.stunWait() > 0;
        const frozen = typeof S.frozenWait === 'function' && S.frozenWait() > 0;
        const tired = !!S.tired;
        const mode = stun ? 'stun' : frozen ? 'frozen' : tired ? 'rest' : '';
        if (mode !== h.stamMode) {
            h.stamMode = mode;
            h.stam.classList.remove('rest', 'frozen', 'stun');
            if (mode) h.stam.classList.add(mode);
            h.stamTxt.textContent = stun ? this.t('ui.knocked') : frozen ? this.t('ui.frozen') : tired ? this.t('ui.resting') : '';
        }
        h.stamFill.style.transform = 'scaleX(' + (stun || frozen ? 1 : f).toFixed(3) + ')';
        if (mode) h.stam.style.removeProperty('--sc');
        else h.stam.style.setProperty('--sc', f > 0.5 ? '#52d63c' : f > 0.25 ? '#ffd23d' : '#ff8a1f');
    },

    /** Хук Game: состояние меча — tired | frozen | stun | draw | ready; sec — сколько ещё ждать. Короткая подсказка над полоской. */
    onSwordState(state, sec) {
        const tip = this.h.stamTip;
        if (!this._hudOn || !tip || this.h.stam.hidden) return;
        const n = Math.max(1, Math.ceil(sec || 0));
        const text = { tired: this.t('ui.swTired'), frozen: this.t('ui.swFrozen', { n }), stun: this.t('ui.swStun', { n }), draw: this.t('ui.swDraw'), ready: this.t('ui.swReady') }[state];
        if (!text) return;
        tip.textContent = text;
        tip.className = 'o-st-tip ' + (state === 'ready' ? 'good' : state === 'frozen' ? 'ice' : 'bad');
        void tip.offsetWidth;
        tip.classList.add('on');
    },

    /** Попытка взять меч, пока он отдыхает или заморожен: полоска трясётся («нельзя»). */
    _denyCheck() {
        const S = /** @type {any} */ (GameSword);
        if (!this._hudOn || Game.state !== 'play' || Pause.active || typeof S.stamina !== 'number') return;
        const blocked = S.tired || (typeof S.drawWait === 'function' && S.drawWait() > 0) || (typeof S.frozenWait === 'function' && S.frozenWait() > 0) || (typeof S.stunWait === 'function' && S.stunWait() > 0);
        if (!blocked || this.h.stam.hidden) return;
        const el = this.h.stam;
        el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny');
        this.sfx('error', { volume: 0.5 });
    },

    _tick1s() {
        if (this.menuEl && !this.menuEl.hidden) this._refreshMenuTimers();
        if (this.page && this.page.tick) this.page.tick();
        for (const k of Object.keys(this._mtick)) { try { this._mtick[k](); } catch (e) { console.error('GameUI:', e); } }
    },

    _later(ms, fn) {
        const id = window.setTimeout(() => { const i = this._timers.indexOf(id); if (i >= 0) this._timers.splice(i, 1); fn(); }, ms);
        this._timers.push(id);
        return id;
    },
    _clearTimers() { for (const id of this._timers) clearTimeout(id); this._timers = []; },

    /** Уведомление снизу. kind: 'err' — красное. */
    toast(text, kind) {
        const el = /** @type {HTMLElement} */ (this.L.toast.firstElementChild);
        el.textContent = text;
        el.className = 'o-toast' + (kind === 'err' ? ' err' : '');
        void el.offsetWidth;
        el.classList.add('on');
        clearTimeout(this._toastT);
        this._toastT = window.setTimeout(() => el.classList.remove('on'), 2700);
    },

    // =============================================================================================
    // Звук и настройки
    // =============================================================================================

    /** Музыка и звуки включаются раздельно: перехватываем GameAudio.play / music (сам модуль — не трогаем). */
    _hookAudio() {
        if (typeof GameAudio === 'undefined' || this._audioHooked) return;
        this._audioHooked = true;
        const A = /** @type {any} */ (GameAudio);
        const play = A.play.bind(A), music = A.music.bind(A);
        A.play = (name, opts) => (this.sfxOn() ? play(name, opts) : null);
        A.music = (kind, opts) => { this._musicKind = kind; if (this.musicOn()) music(kind, opts); };
    },
    sfxOn() { const s = Game.save && Game.save.settings; return !s || s.sfx !== 0; },
    musicOn() { const s = Game.save && Game.save.settings; return !s || s.music !== 0; },
    setSetting(key, value) {
        if (!Game.save.settings) Game.save.settings = { music: 1, sfx: 1, quality: 'auto' };
        Game.save.settings[key] = value;
        Game.persist();
        if (key === 'music') {
            if (value === 0) { if (typeof GameAudio !== 'undefined') GameAudio.stopMusic(); }
            else if (this._musicKind) GameAudio.music(this._musicKind);
        }
    },
    _applySettings() {
        const s = Game.save && Game.save.settings;
        if (s && s.quality && typeof Quality !== 'undefined' && Quality.choice !== s.quality) { try { Quality.set(s.quality); } catch (e) { /* уровень графики не применился */ } }
        if (!this.musicOn() && typeof GameAudio !== 'undefined') this._musicKind = GameAudio.musicKind || '';
    },

    // =============================================================================================
    // Главное меню
    // =============================================================================================

    /** Логотип «OBBY CUT MASTER» — картинка (промо-логотип игры). Поверх — анимация: меч проносится по линии
     *  разреза на слове CUT, верхняя половина слова отскакивает по разрезу, искры, меч испаряется. */
    _logo() {
        if (String(GAME_PLATFORM) === 'pikabu') {   // Пикабу: название только по-русски — текстовый логотип в стиле игры
            const word = (t, cls) => ocmH('span', { class: 'o-lg ' + cls, 'data-t': t }, ocmH('i', null, t));
            return ocmH('div', { class: 'o-logo', role: 'img', 'aria-label': GAME_TITLE },
                ocmH('div', { class: 'o-lrow' }, word('МАСТЕР', 'steel')), ocmH('div', { class: 'o-lrow big' }, word('МЕЧА', 'gold')));
        }
        const img = (cls) => ocmH('img', { class: 'o-limg ' + cls, src: 'assets/ui/logo.webp', alt: '', draggable: 'false' });
        const sword = ocmH('img', { class: 'o-lsw', src: GAMEUI_ICON.sword, alt: '', draggable: 'false' });
        const spark = (cls, sx, sy, dx, dy, z, col, t) => ocmH('i', { class: 'o-sp ' + cls, style: { '--sx': sx + 'em', '--sy': sy + 'em', '--dx': dx + 'em', '--dy': dy + 'em', '--z': z + 'em', '--c': col, '--t': (1 + t) + 's' } });
        // искры удара — из середины разреза; испарение — там, где меч растаял (справа, у конца разреза)
        const sparks = [
            spark('', 0, 0, -0.9, 0.5, 0.2, '#ffffff', 0), spark('', 0, 0, 0.9, -0.6, 0.17, '#ffe066', 0.02), spark('', -0.4, 0.07, -0.4, 0.9, 0.15, '#bfe8ff', 0.04),
            spark('', 0.4, -0.07, 0.6, -0.9, 0.18, '#ffd23d', 0.01), spark('', 0, 0, -0.2, -0.9, 0.13, '#ffffff', 0.05),
            spark('v', 2.0, -0.4, -0.3, -1.5, 0.16, '#ffffff', 0), spark('v', 2.2, -0.5, 0.3, -1.3, 0.13, '#ffe066', 0.03), spark('v', 1.9, -0.3, 0.1, -1.8, 0.17, '#ffffff', 0.05),
            spark('v', 2.3, -0.35, 0.6, -1.4, 0.12, '#bfe8ff', 0.02), spark('v', 2.1, -0.6, -0.5, -1.6, 0.14, '#ffffff', 0.06),
        ];
        const cut = ocmH('span', { class: 'o-lcut' }, ocmH('i', { class: 'o-lflash' }), sword, sparks);
        return ocmH('div', { class: 'o-logo o-logo-img', role: 'img', 'aria-label': 'Obby Cut Master' }, img('base'), img('top'), cut);
    },

    _buildMenu() {
        const t = (k) => this.t(k);
        /** @type {any} */
        const m = this.h.menu = {};
        const menu = ocmH('div', { class: 'o-menu' });
        this.menuEl = menu;
        const coin = ocmH('div', { class: 'o-m-coin' }, this.pill());
        m.sound = this.ibtn('soundOn', () => { Sound.toggleMuted(); this._syncSoundBtn(); }, '', t('ui.sound'));
        const set = this.ibtn('settings', () => this.openSettings(), '', t('ui.settings'));
        const btns = ocmH('div', { class: 'o-m-btns' }, m.sound, set);
        m.playLvl = ocmH('small', { text: '' });
        m.playTxt = ocmH('span', { text: t('ui.play') });
        m.play = this.btn({ cls: 'lg c-green o-play', onTap: () => this._playTap(), kids: [ocmH('span', { style: 'display:flex;align-items:center;gap:10px' }, this.icon('play'), m.playTxt), m.playLvl] });
        const mapBtn = this.btn({ cls: 'c-teal o-mapbtn', icon: 'map', text: t('ui.levels'), onTap: () => this.openMap() });
        const tile = (k, icon, color, label, onTap) => {
            const dot = ocmH('i', { class: 'o-dot', text: '!', hidden: true });
            const tag = ocmH('i', { class: 'o-tag', hidden: true });
            const b = this.btn({ cls: 'o-tile ' + color, icon, text: label, onTap, kids: [dot, tag] });
            b.dataset.k = k;
            m[k] = { el: b, dot, tag };
            return b;
        };
        m.supCells = ocmH('div', { class: 'o-supcells' });
        for (let i = 0; i < 5; i++) m.supCells.append(ocmH('i'));
        m.supN = ocmH('small', { text: '' });
        m.super = this.btn({ cls: 'c-gold o-super', onTap: () => this.openSuper(), kids: [this.icon('chest'), ocmH('span', { class: 'o-sup-t' }, ocmH('b', { text: t('ui.super') }), ocmH('span', { class: 'row' }, m.supCells, m.supN))] });
        m.survBest = ocmH('small', { text: '' });
        m.surv = this.btn({ cls: 'c-fire o-surv', onTap: () => this._goSurvival(), kids: [this.icon('skull'), ocmH('span', { class: 'tx' }, ocmH('b', { text: t('ui.survival') }), m.survBest)] });
        const ars = tile('arsenal', 'sword', 'c-blue', t('ui.arsenal'), () => this.openArsenal());
        const shop = tile('shop', 'shop', 'c-gold', t('ui.shop'), () => this.openShop());
        const gift = tile('gift', 'gift', 'c-pink', t('ui.gift'), () => this.openGift());
        const wheel = tile('wheel', 'wheel', 'c-purple', t('ui.wheel'), () => this.openWheel());
        menu.append(coin, btns, ocmH('div', { class: 'o-m-logo' }, this._logo()),
            ocmH('div', { class: 'o-m-left' }, m.super, ars, shop), ocmH('div', { class: 'o-m-right' }, m.surv, gift, wheel),
            ocmH('div', { class: 'o-playrow' }, m.play, mapBtn));
        this.L.menu.append(menu);
        menu.hidden = true;
    },

    _syncSoundBtn() {
        const m = this.h.menu;
        if (!m || !m.sound) return;
        const img = m.sound.querySelector('img');
        if (img) img.src = Sound.muted ? GAMEUI_ICON.soundOff : GAMEUI_ICON.soundOn;
    },

    _refreshMenu() {
        const m = this.h.menu;
        if (!m) return;
        const n = Math.min(GameData.LEVEL_COUNT, Math.max(1, Game.save.level));
        m.playLvl.textContent = this.t('levelN', { n });
        const best = Game.save.survivalBest || 0;
        if (m.survBest) m.survBest.textContent = best > 0 ? this.t('ui.survBest', { n: best }) : this.t('ui.survNew');
        this._syncSoundBtn();
        this._refreshMenuTimers();
        this.refreshCoins(false);
    },

    /** Точки-уведомления и таймер колеса (раз в секунду, пока меню открыто). */
    _refreshMenuTimers() {
        const m = this.h.menu;
        if (!m || !m.gift) return;
        if (typeof GameAds !== 'undefined' && m.super) {
            const info = GameAds.superInfo();
            m.supN.textContent = info.have + '/' + info.need;
            for (let i = 0; i < m.supCells.children.length; i++) m.supCells.children[i].classList.toggle('on', i < info.have);
            m.super.classList.toggle('pulse', info.available && info.wait <= 0);
        } else if (m.super) m.super.hidden = true;
        const canGift = typeof DailyGift !== 'undefined' && DailyGift.canClaim();
        m.gift.dot.hidden = !canGift;
        if (typeof Wheel !== 'undefined') {
            const st = Wheel.status();
            const free = st.freeAvailable && !st.pending;
            m.wheel.dot.hidden = !free;
            m.wheel.tag.hidden = free || !st.nextFreeLabel;
            m.wheel.tag.textContent = st.nextFreeLabel || '';
            m.wheel.tag.style.background = 'var(--gray-d)';
        }
    },

    showMenu() {
        this._resetOverlays();
        this._setHud(false);
        const menu = this.menuEl;
        menu.hidden = false;
        this._refreshMenu();
        let i = 0;
        for (const el of /** @type {NodeListOf<HTMLElement>} */ (menu.querySelectorAll('.o-btn,.o-pill'))) {
            el.style.setProperty('--dl', (i++ * 0.055).toFixed(2) + 's');
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = '';
        }
        if (!Game.save.noticeSeen) this._later(300, () => this._notice());
        else this._later(900, () => this._offerGift());
    },

    /** Подарок дня сам открывается в меню — но не во время и не до первого обучения. */
    _offerGift() {
        if (this._busy || this.page || Object.keys(this.modals).length || !this.menuEl || this.menuEl.hidden) return;
        if (typeof DailyGift === 'undefined') return;
        if (typeof Tutorial !== 'undefined' && (Tutorial.active || !Tutorial.isDone())) return;
        if (!DailyGift.shouldOffer()) return;
        DailyGift.markOffered();
        this.openGift();
    },

    /** Один раз при первом запуске: «все персонажи — роботы и пиньяты, внутри только краска». */
    _notice() {
        if (this.modals.notice || Game.save.noticeSeen) return;
        const svg = '<svg viewBox="0 0 120 100" aria-hidden="true">' +
            '<g transform="rotate(26 96 46)"><rect x="90" y="4" width="12" height="42" rx="5" fill="#d8964a" stroke="#1b1530" stroke-width="4"/><rect x="88" y="43" width="16" height="12" fill="#cfd3e2" stroke="#1b1530" stroke-width="4"/><path d="M88 55h16l-1 17q-7 8-14 0z" fill="#ff5ad1" stroke="#1b1530" stroke-width="4" stroke-linejoin="round"/></g>' +
            '<path d="M16 40 26 90q20 8 40 0L76 40z" fill="#4aa8ff" stroke="#1b1530" stroke-width="4.5" stroke-linejoin="round"/>' +
            '<path d="M30 56l2 22M44 52l1 30" stroke="rgba(255,255,255,.45)" stroke-width="4" stroke-linecap="round"/>' +
            '<path d="M20 42q-2 18 6 19 6-2 3-18zM60 44q0 22 7 20 5-3 2-20z" fill="#ffd23d" stroke="#1b1530" stroke-width="4" stroke-linejoin="round"/>' +
            '<ellipse cx="46" cy="40" rx="30" ry="10" fill="#ffd23d" stroke="#1b1530" stroke-width="4.5"/>' +
            '<ellipse cx="46" cy="39" rx="19" ry="5" fill="#ff5ad1" opacity=".9"/>' +
            '<path d="M18 42Q46 -2 74 42" fill="none" stroke="#1b1530" stroke-width="5" stroke-linecap="round"/></svg>';
        const art = ocmH('div', { class: 'o-notice-art' },
            ocmH('i', { class: 'o-splat a' }), ocmH('i', { class: 'o-splat b' }), ocmH('i', { class: 'o-splat c' }), ocmH('div', { class: 'o-paint', html: svg }));
        const ok = this.btn({
            cls: 'lg c-green', icon: 'check', text: this.t('ui.gotIt'),
            onTap: () => {
                Game.save.noticeSeen = true;
                Game.persist();
                this._closeModal('notice');
                this._later(700, () => this._offerGift());
            },
        });
        const el = ocmH('div', { class: 'o-panel o-notice o-pop' }, ocmH('div', { class: 'o-blk o-ribbon gold', text: this.t('ui.noticeT') }), art,
            ocmH('div', { class: 'txt', text: this.t('ui.notice') }), ok);
        this._modal('notice', el, { sticky: true });
        this._confetti(34);
    },

    /** Супер-награда: 5 просмотров рекламы с паузой — крупная награда (меч или гора монет). */
    openSuper() {
        if (typeof GameAds === 'undefined') return;
        const panel = ocmH('div', { class: 'o-panel o-superw o-pop' });
        const draw = () => {
            const info = GameAds.superInfo(), r = info.reward;
            const col = (GameData.RARITY[r.rarity] || {}).color || '#ffcf33';
            panel.style.setProperty('--rc', col);
            panel.style.setProperty('--rc2', gameUiRgba(col, 0.5));
            panel.textContent = '';
            const can = info.available && info.wait <= 0 && !GameAds.busy;
            const why = !info.available ? this.t('shop.adUnavailable') : info.wait > 0 ? this.t('ui.adWaitHint', { n: info.wait }) : '';
            const cells = ocmH('div', { class: 'o-supbig' });
            for (let i = 0; i < info.need; i++) cells.append(ocmH('i', { class: i < info.have ? 'on' : '' }));
            const pic = r.type === 'sword'
                ? ocmH('div', { class: 'o-tpic' }, this._pic(r.icon, '', this.nm(r.name), col))
                : ocmH('div', { class: 'o-tpic' }, ocmH('img', { src: r.icon, alt: '' }));
            panel.append(...[ocmH('div', { class: 'o-blk o-ribbon gold', text: this.t('ui.superT') }), pic,
                ocmH('div', { class: 'o-t3', style: { fontSize: 'calc(var(--u) * 22)', color: col }, text: this.nm(r.name) }),
                r.type === 'sword' ? ocmH('span', { class: 'o-chip', style: { '--cc': gameUiShade(col, -0.25) }, text: this.nm((GameData.RARITY[r.rarity] || { name: {} }).name) }) : null,
                ocmH('div', { class: 'o-help', text: this.t('ui.superSub', { n: info.need }) }), cells,
                this.btn({
                    cls: can ? 'lg c-purple o-x2' : 'lg is-off o-x2', icon: 'ad', text: info.wait > 0 && info.available ? this.t('ui.adWaitBtn', { n: info.wait }) : this.t('ui.adSuper', { a: info.have, b: info.need }),
                    onOff: () => this.toast(why, 'err'),
                    onTap: async () => {
                        const res = await GameAds.superWatch();
                        if (!res.ok) { this.sfx('error'); this.toast(this.t(GameAds.available() ? 'ui.adFailed' : 'shop.adUnavailable'), 'err'); draw(); return; }
                        this._refreshMenuTimers();
                        if (res.done && res.granted) {
                            this._closeModal('super');
                            this.refreshCoins(true);
                            if (res.granted.type === 'sword') this._trophy(GameData.sword(res.granted.id));
                            else this._prize(this.t('ui.superWon'), [{ type: 'coins', amount: res.granted.amount }]);
                        } else { this.sfx('click'); this.toast(this.t('ui.adCounted', { a: res.have, b: res.need })); draw(); }
                    },
                }),
                why ? ocmH('div', { class: 'o-hint', style: info.available ? 'color:#d9d2ff' : '', text: why }) : null,
                this.ibtn('close', () => this._closeModal('super'), 'c-pink sm o-close', this.t('ui.close'))].filter(Boolean));
        };
        draw();
        this._modal('super', panel, { onBackdrop: () => this._closeModal('super'), tick: draw });
    },

    async _goSurvival() {
        await this._go(() => Game.startSurvival());
    },

    async _playTap() {
        const n = Math.min(GameData.LEVEL_COUNT, Math.max(1, Game.save.level));
        await this._go(() => Game.startLevel(n));
    },

    /** Переход с защитой от двойного нажатия. */
    async _go(fn) {
        if (this._busy) return false;
        this._busy = true;
        try { await fn(); return true; } catch (e) { console.error('GameUI:', e); return false; } finally { this._busy = false; }
    },

    // =============================================================================================
    // Страницы и окна
    // =============================================================================================

    /** Новая страница на весь экран; главное меню прячется, а не рисуется под ней. */
    _page(name, cls) {
        this._closePage(true);
        const el = ocmH('div', { class: 'o-page ' + (cls || '') });
        this.L.page.append(el);
        this.page = { name, el };
        this.menuEl.hidden = true;
        return el;
    },

    _closePage(keepMenuHidden) {
        const p = this.page;
        if (!p) return;
        this.page = null;
        if (p.onClose) { try { p.onClose(); } catch (e) { console.error('GameUI:', e); } }
        p.el.remove();
        if (!keepMenuHidden && !this._hudOn && !Object.keys(this.modals).length) { this.menuEl.hidden = false; this._refreshMenu(); }
        else if (!keepMenuHidden && !this._hudOn) this._refreshMenu();
    },

    /** Окно поверх: name уникально (повторное открытие заменяет); o.tick — раз в секунду (таймеры пауз рекламы). */
    _modal(name, el, o) {
        this._closeModal(name);
        if (o && o.tick) this._mtick[name] = o.tick;
        const wrap = ocmH('div', { class: 'o-modal' + (o && o.clear ? ' clear' : ''), data: { m: name } }, el);
        if (o && o.onBackdrop) wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) o.onBackdrop(); });
        this.L.modal.append(wrap);
        this.modals[name] = wrap;
        return wrap;
    },
    _closeModal(name) {
        const w = this.modals[name];
        if (!w) return;
        delete this.modals[name];
        delete this._mtick[name];
        w.remove();
    },

    /** Закрыть всё лишнее: страницы, окна, баннеры, летящие монетки. */
    _resetOverlays() {
        this._closePage(true);
        for (const k of Object.keys(this.modals)) this._closeModal(k);
        this._clearTimers();
        this._hideBanner(true);
        this._bannerQ = [];
        this.L.fly.textContent = '';
        this._endTryOn();
        this._spinning = false;
    },

    /** Аппаратная «Назад» и Esc: true — закрыли своё окно. */
    _back() {
        if (this.modals.trophy) { this._closeTrophy(); return true; }
        if (this.modals.card) { this._closeModal('card'); return true; }
        if (this.modals.pause) { this._resume(); return true; }
        if (this.modals.prize) { this._closeModal('prize'); return true; }
        if (this.modals.win || this.modals.lose) return true;
        if (this.page) { if (this._spinning) return true; this._closePage(); return true; }
        if (this._hudOn && (Game.state === 'play' || Game.state === 'intro')) { this.pause(); return true; }
        return false;
    },

    _key(e) {
        if (e.repeat) return;
        if (this.page && this.page.keys && !Object.keys(this.modals).length && this.page.keys(e)) { e.preventDefault(); return; }
        if (e.code === 'Escape' || e.code === 'KeyP') {
            if (this._back()) e.preventDefault();
        }
    },

    /** Смена языка на лету (Telegram, test): перерисовать меню и открытую страницу. */
    _relang() {
        if (!this._inited) return;
        const open = this.page ? this.page.name : '';
        const hidden = this.menuEl.hidden;
        this.menuEl.remove();
        this.h.menu = {};
        this._buildMenu();
        this.menuEl.hidden = hidden;
        this._refreshMenu();
        if (open === 'settings') this.openSettings();
    },

    // =============================================================================================
    // HUD боя
    // =============================================================================================

    _buildHud() {
        const h = this.h;
        const hud = ocmH('div', { class: 'o-hud', hidden: true });
        this.hudEl = hud;
        h.pause = this.btn({ cls: 'o-h-pause', icon: 'pause', label: this.t('ui.pause'), onTap: () => this.pause() });
        h.pause.id = 'ocm-hud-pause';
        h.lvlTxt = ocmH('span');
        h.lvlSub = ocmH('small');
        h.pips = ocmH('div', { class: 'o-pips' });
        h.level = ocmH('div', { class: 'o-h-level', id: 'ocm-hud-level' }, ocmH('div', { class: 'o-h-lvl' }, h.lvlTxt, h.lvlSub), h.pips);
        h.runNum = ocmH('b', { text: '0' });
        h.coins = ocmH('div', { class: 'o-h-coins', id: 'ocm-hud-coins' }, this.icon('coin'), h.runNum);
        h.runC = { el: h.runNum, v: 0, t: 0, keep: true };
        this._counters.push(h.runC);
        h.hearts = ocmH('div', { class: 'o-hearts', id: 'ocm-hearts' });
        h.bossName = ocmH('div', { class: 'o-boss-name' });
        h.bossFill = ocmH('i', { class: 'o-boss-fill' });
        h.bossTrail = ocmH('i', { class: 'o-boss-trail' });
        h.boss = ocmH('div', { class: 'o-h-boss', id: 'ocm-hud-boss', hidden: true }, this.icon('boss', 'o-boss-ic'),
            ocmH('div', { class: 'o-boss-main' }, h.bossName, ocmH('div', { class: 'o-boss-bar' }, h.bossTrail, h.bossFill)));
        h.swordImg = ocmH('img', { class: 'sw', alt: '', draggable: 'false' });
        h.swordGem = ocmH('i', { class: 'o-gem' });
        h.sword = ocmH('div', { class: 'o-h-sword', id: 'ocm-hud-sword' }, h.swordImg, h.swordGem);
        h.stamFill = ocmH('i', { class: 'o-st-fill' });
        h.stamTxt = ocmH('span', { class: 'o-st-txt' });
        h.perks = ocmH('div', { class: 'o-h-perks', id: 'ocm-hud-perks', hidden: true });
        h.shield = ocmH('span', { class: 'o-shield', hidden: true }, this.icon('shield'), ocmH('b'));
        h.stamTip = ocmH('div', { class: 'o-st-tip' });
        h.stam = ocmH('div', { class: 'o-h-stam', id: 'ocm-hud-stamina', hidden: true }, this.icon('sword', 'o-st-ic'), ocmH('div', { class: 'o-st-bar' }, h.stamFill, h.stamTxt), h.stamTip);
        h.swordImg.addEventListener('error', () => { h.swordImg.src = GAMEUI_ICON.sword; }, { once: true });
        hud.append(h.pause, h.level, h.coins, h.hearts, h.boss, h.sword, h.stam, h.perks);
        this.L.hud.append(hud);
        this._regHud();
    },

    /** Блоки HUD для HudLayout: раскладка без наложений (и обучение знает, где свободно). */
    _regHud() {
        if (typeof HudLayout === 'undefined') return;
        if (!HudLayout._inited) HudLayout.init({ app: this.app });
        const h = this.h;
        HudLayout.block('hud-pause', { dock: 'tl', w: 46, h: 46, min: 40, el: h.pause });
        HudLayout.block('hud-coins', { dock: 'tr', w: 116, h: 38, min: 30, el: h.coins });
        HudLayout.block('hud-level', { dock: 'tc', w: 230, h: 46, fill: true, maxW: 280, minW: 120, el: h.level });
        HudLayout.block('hud-hearts', { dock: 'tc', w: 230, h: 34, minW: 110, order: 1, el: h.hearts });
        HudLayout.block('hud-perks', { dock: 'ml', w: 'auto', h: 'auto', scale: false, el: h.perks });
        HudLayout.block('hud-boss', { dock: 'tc', w: 340, h: 46, fill: true, maxW: 420, minW: 200, order: 2, el: h.boss });
        HudLayout.block('hud-sword', { dock: 'bl', w: 54, h: 54, min: 36, el: h.sword });
        HudLayout.block('hud-stamina', { dock: 'bc', w: 300, h: 32, fill: true, maxW: 360, minW: 170, min: 24, el: h.stam });
    },

    _setHud(on) {
        this._hudOn = on;
        this.hudEl.hidden = !on;
        if (typeof HudLayout !== 'undefined' && HudLayout._inited) HudLayout.schedule();
    },

    /** Начался уровень (под экраном загрузки): показать HUD, сбросить счётчики. */
    showHUD(level) {
        const fresh = Game.state !== 'play';   // после «продолжить за рекламу» состояние уже 'play' — HUD не сбрасываем
        this._resetOverlays();
        this.menuEl.hidden = true;
        this._lvl = level;
        this._setHud(true);
        const h = this.h;
        const survWave = level.survival && typeof GameSurvival !== 'undefined' && GameSurvival.run ? GameSurvival.run.wave : 1;
        h.lvlTxt.textContent = level.survival ? this.t('surv.wave', { n: survWave }) : this.t('levelN', { n: level.n });
        this._wavesTotal = level.survival ? 0 : level.waves.length;
        if (fresh) {
            h.pips.textContent = '';
            for (let i = 0; i < this._wavesTotal; i++) h.pips.append(ocmH('i', { class: 'o-pip' }));
            h.lvlSub.textContent = '';
            const rc = level.survival ? (Game.runCoins || 0) : 0;
            h.runC.v = h.runC.t = rc;
            h.runNum.textContent = gameUiFmt(rc);
            this._runPending = 0;
            this._boss = null;
            h.boss.hidden = true;
        }
        this._buildHearts(Game.heartsMax, Game.hearts);
        this._hudSword();
        if (!fresh && Game.boss) this.showBoss(Game.boss, true);
        if (level.survival && typeof GameSurvival !== 'undefined') this._survHud(GameSurvival.run);
        else { h.perks.hidden = true; h.shield.hidden = true; }
        if (typeof HudLayout !== 'undefined' && HudLayout._inited) HudLayout.schedule();
    },

    _hudSword() {
        const id = Game.save.sword;
        const sw = GameData.sword(id);
        const h = this.h;
        h.swordImg.src = GameSword.ICONS[id] || GAMEUI_ICON.sword;
        const col = (GameData.RARITY[sw.rarity] || {}).color || '#888';
        h.sword.style.setProperty('--rc', col);
        h.swordGem.style.setProperty('--gc', (GameData.ELEMENTS[sw.element] || {}).color || '#fff');
        h.swordGem.hidden = sw.element === 'none';
    },

    /** Уровень загружен: баннер «Уровень N», имя, знакомство с новыми мобами. */
    onLevelStart(level) {
        if (!this._hudOn) return;
        const kids = [ocmH('div', { class: 'o-bn-t o-t3' }, level.boss ? this.icon('boss') : null, ocmH('span', { text: this.t('levelN', { n: level.n }) })),
            ocmH('div', { class: 'o-bn-s' }, this.nm(level.title))];
        if (level.fresh && level.fresh.length) {
            kids.push(ocmH('div', { class: 'o-bn-s', text: this.t('ui.newMobs') }),
                ocmH('div', { class: 'o-bn-mobs' }, level.fresh.map(id => {
                    const d = GameData.MOBS[id] || {};
                    return ocmH('div', { class: 'o-bn-mob' }, ocmH('span', { class: 'o-chip', style: { '--cc': '#6a3fd0' } }, this.icon('skull'), this.nm(d.name)), d.desc ? ocmH('span', { class: 'd', text: this.nm(d.desc) }) : null);
                })));
        }
        this._banner$('lv', kids, 2600, 3);
    },

    onWave(i, total) {
        if (!this._hudOn) return;
        if (!total) {   // выживание: волн без конца — только подпись, баннер покажет onSurvivalWave
            this.h.lvlTxt.textContent = this.t('surv.wave', { n: i });
            return;
        }
        const pips = this.h.pips.children;
        for (let k = 0; k < pips.length; k++) pips[k].className = 'o-pip' + (k < i - 1 ? ' done' : k === i - 1 ? ' cur' : '');
        this.h.lvlSub.textContent = i + '/' + total;
        const last = i === total && total > 1 && !this._lvl.boss;
        this._banner$('wave', [ocmH('div', { class: 'o-bn-t o-t3', text: last ? this.t('ui.lastWave') : this.t('ui.wave', { i, n: total }) })], 1500, 2);
    },

    showBoss(mob, quiet) {
        this._boss = mob;
        this._bossT = this._bossShown = this._bossTrail = mob.maxHp > 0 ? Math.max(0, mob.hp / mob.maxHp) : 1;
        this.h.bossName.textContent = this.nm(mob.def.name);
        this.h.boss.hidden = false;
        if (typeof HudLayout !== 'undefined' && HudLayout._inited) HudLayout.schedule();
        if (!quiet) this._banner$('boss', [ocmH('div', { class: 'o-bn-t o-t4' }, this.icon('boss'), ocmH('span', { text: this.t('ui.boss') })),
            ocmH('div', { class: 'o-bn-s', text: this.nm(mob.def.name) })], 2300, 3);
    },

    onMobHit(mob) {
        if (mob === this._boss && mob.maxHp > 0) this._bossT = Math.max(0, mob.hp / mob.maxHp);
    },

    hideBoss() {
        if (this._boss) { this._bossT = 0; }
        this._boss = null;
        this.h.boss.hidden = true;
        if (typeof HudLayout !== 'undefined' && HudLayout._inited) HudLayout.schedule();
    },

    // --- баннеры ---------------------------------------------------------------------------------

    /** Баннер по центру сверху. prio: 3 — уровень и босс (не прерываются), 2 — волна (заменяет волну, ждёт уровень). */
    _banner$(kind, content, ms, prio) {
        const cur = this._banner;
        if (cur && cur.prio > prio) {
            this._bannerQ = this._bannerQ.filter(q => q.kind !== kind);
            if (this._bannerQ.length < 3) this._bannerQ.push({ kind, content, ms, prio });
            return;
        }
        this._hideBanner(true);
        const host = /** @type {HTMLElement} */ (this.L.banner.firstElementChild);
        const free = typeof HudLayout !== 'undefined' && HudLayout._inited && HudLayout.free ? HudLayout.free.t : 0;
        host.style.top = Math.round(free > 0 ? free + 6 : this.root.clientHeight * 0.16) + 'px';
        const el = ocmH('div', { class: 'o-blk o-bn in ' + kind }, content);
        host.append(el);
        const t = window.setTimeout(() => this._hideBanner(false), ms);
        this._banner = { el, prio, kind, t };
        if (kind === 'wave') this.sfx('toast');
    },

    _hideBanner(instant) {
        const b = this._banner;
        if (!b) return;
        clearTimeout(b.t);
        this._banner = null;
        if (instant) { b.el.remove(); return; }
        b.el.classList.remove('in');
        b.el.classList.add('out');
        window.setTimeout(() => b.el.remove(), 330);
        const nx = this._bannerQ.shift();
        if (nx) this._later(360, () => { if (this._hudOn) this._banner$(nx.kind, nx.content, nx.ms, nx.prio); });
    },

    // --- монетки и сердца ------------------------------------------------------------------------

    /** +n монет: монетки летят из точки моба (CSS px) в счётчик HUD. */
    onCoins(n, pos) {
        if (!this._hudOn) return;
        const icon = this.h.coins.firstElementChild;
        const to = icon ? icon.getBoundingClientRect() : null;
        const total = Math.max(1, Math.round(n));
        if (!to || !to.width || !pos || typeof pos.x !== 'number') { this.h.runC.t = Game.runCoins || this.h.runC.t + total; return; }
        const count = Math.min(6, 1 + Math.floor(Math.sqrt(total)));
        const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
        const share = total / count;
        this._runPending += total;
        for (let i = 0; i < count; i++) {
            const sx = pos.x + (Math.random() - 0.5) * 36, sy = pos.y + (Math.random() - 0.5) * 24;
            const img = ocmH('img', { src: GAMEUI_ICON.coin, alt: '', draggable: 'false' });
            const c = ocmH('div', { class: 'c' }, img);
            const holder = ocmH('div', { class: 'o-fly', style: { left: sx + 'px', top: sy + 'px' } }, c);
            this.L.fly.append(holder);
            const dur = 620 + Math.random() * 260, delay = i * 55;
            const dx = tx - sx, dy = ty - sy;
            c.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + dx + 'px)' }], { duration: dur, delay, easing: 'cubic-bezier(.55,.05,.9,.45)', fill: 'both' });
            img.animate([{ transform: 'translateY(0) scale(.6)' }, { transform: 'translateY(' + dy * 0.7 + 'px) scale(1.25)', offset: 0.5 }, { transform: 'translateY(' + dy + 'px) scale(.7)' }], { duration: dur, delay, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'both' });
            const done = () => {
                holder.remove();
                this._runPending = Math.max(0, this._runPending - share);
                this.h.runC.t = Math.min(Game.runCoins || 0, this.h.runC.t + share);
                const el = this.h.coins;
                el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
            };
            const a = c.getAnimations()[0];
            if (a) a.onfinish = done; else this._later(dur + delay, done);
        }
    },

    _buildHearts(max, cur) {
        const box = this.h.hearts;
        box.textContent = '';
        this._hearts = [];
        for (let i = 0; i < max; i++) {
            const el = ocmH('div', { class: 'o-heart' + (i < cur ? '' : ' lost') }, ocmH('img', { src: GAMEUI_ICON.heart, alt: '', draggable: 'false' }));
            box.append(el);
            this._hearts.push(el);
        }
        box.append(this.h.shield);
        this._heartsMax = max;
    },

    onHearts(h, max, delta) {
        if (!this._hudOn) return;
        const prev = Math.max(0, Math.min(max, h - delta));
        if (max !== this._heartsMax || this._hearts.length !== max) this._buildHearts(max, prev);
        this._hearts.forEach((el, i) => {
            const was = i < prev, now = i < h;
            if (was && !now) this._heartBurst(el);
            else if (!was && now) { el.classList.remove('lost'); el.classList.add('heal'); window.setTimeout(() => el.classList.remove('heal'), 650); }
            else el.classList.toggle('lost', !now);
        });
        if (delta < 0) {
            this.sfx('lifeLost');
            const f = /** @type {HTMLElement} */ (this.L.flash.firstElementChild);
            f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
            this.h.hearts.classList.remove('shake'); void this.h.hearts.offsetWidth; this.h.hearts.classList.add('shake');
        }
    },

    /** Сердце лопается: пульс, осколки, потускнение. */
    _heartBurst(el) {
        el.classList.add('lost', 'pop');
        window.setTimeout(() => el.classList.remove('pop'), 600);
        const cols = ['#ffd23d', '#2f9bff', '#52d63c', '#ff8a1f', '#ffffff', '#9a5cff', '#1fd1bf'];
        for (let i = 0; i < 11; i++) {
            const p = ocmH('i', { class: 'o-hp', style: { '--pc': cols[i % cols.length] } });
            el.append(p);
            const a = (i / 11) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 22;
            const k = this.h.hearts.getBoundingClientRect().height / 34 || 1;
            const anim = p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d * k + 'px,' + (Math.sin(a) * d * k + 12) + 'px) scale(.3) rotate(160deg)', opacity: 0 }], { duration: 520 + Math.random() * 180, easing: 'cubic-bezier(.1,.7,.3,1)' });
            anim.onfinish = () => p.remove();
        }
    },

    // =============================================================================================
    // Выживание (рогалик): HUD забега, баннеры, выбор перка, итог
    // =============================================================================================

    /** Список «Новые враги»: имя и способности (общий кусок баннеров). */
    _freshRows(ids) {
        return ocmH('div', { class: 'o-bn-mobs' }, ids.map(id => {
            const d = GameData.MOBS[id] || {};
            return ocmH('div', { class: 'o-bn-mob' }, ocmH('span', { class: 'o-chip', style: { '--cc': '#6a3fd0' } }, this.icon('skull'), this.nm(d.name)), d.desc ? ocmH('span', { class: 'd', text: this.nm(d.desc) }) : null);
        }));
    },

    /** Цвет редкости перка. */
    _perkColor(r) { return GAMEUI_RARITY[r] || '#b8c4cf'; },

    /** Ряд полученных перков (иконка в рамке редкости, ×n — стопки). */
    _perkCell(p, n) {
        const col = this._perkColor(p.rarity);
        return ocmH('div', { class: 'o-pcell', title: this.nm(p.name), style: { '--rc': col, '--rc2': gameUiRgba(col, 0.4) } },
            ocmH('img', { src: p.icon, alt: '', draggable: 'false' }), n > 1 ? ocmH('b', { text: '×' + n }) : null);
    },

    onSurvivalStart(run) {
        this._survHud(run);
    },

    /** Обновить HUD забега: подпись волны, перки со стопками, заряды защиты. */
    _survHud(run) {
        if (!run || !this._hudOn || typeof GameSurvival === 'undefined') return;
        const h = this.h;
        h.lvlTxt.textContent = this.t('surv.wave', { n: run.wave });
        const ids = Object.keys(run.perks || {}).filter(id => run.perks[id] > 0);
        h.perks.textContent = '';
        for (const id of ids) { const p = GameSurvival.perk(id); if (p) h.perks.append(this._perkCell(p, run.perks[id])); }
        h.perks.hidden = !ids.length;
        const charges = (run.barrier || 0) + (run.angel || 0);
        h.shield.hidden = charges <= 0;
        const b = h.shield.querySelector('b');
        if (b) b.textContent = '×' + charges;
        if (typeof HudLayout !== 'undefined' && HudLayout._inited) HudLayout.schedule();
    },
    onSurvivalHud(run) { this._survHud(run); },

    /** Волна началась: баннер «Волна N» (+ БОСС, + новые враги). */
    onSurvivalWave(run, lvl) {
        if (!this._hudOn) return;
        this._survHud(run);
        const biome = GameData.BIOMES.find(b => b.id === lvl.biome);
        const kids = [ocmH('div', { class: 'o-bn-t o-t3' }, lvl.boss ? this.icon('boss') : null, ocmH('span', { text: this.t('surv.wave', { n: run.wave }) })),
            ocmH('div', { class: 'o-bn-s', text: lvl.boss ? this.t('ui.boss') + ' · ' + this.nm((GameData.MOBS[lvl.boss] || {}).name) : this.nm(biome && biome.name) })];
        if (lvl.fresh && lvl.fresh.length) kids.push(ocmH('div', { class: 'o-bn-s', text: this.t('ui.newMobs') }), this._freshRows(lvl.fresh));
        this._banner$(lvl.boss ? 'boss' : 'lv', kids, lvl.fresh && lvl.fresh.length ? 3000 : 2200, 3);
    },

    onSurvivalWaveCleared(run, bonus) {
        if (!this._hudOn) return;
        this._banner$('ok', [ocmH('div', { class: 'o-bn-t o-t3', text: this.t('ui.waveCleared') }),
            ocmH('div', { class: 'o-bn-s' }, this.icon('coin'), ' +' + gameUiFmt(bonus))], 1400, 2);
    },

    /** Новая локация: баннер с названием биома (выше волны — идёт первым). */
    onSurvivalLocation(biome, run) {
        if (!this._hudOn || !biome) return;
        this._banner$('loc', [ocmH('div', { class: 'o-bn-s', text: this.t('ui.newLocation') }), ocmH('div', { class: 'o-bn-t o-t3', text: this.nm(biome.name) })], 2000, 4);
    },

    /** Выбор перка: три карточки (рамка по редкости), «Заменить» и «Заменить за рекламу». Хук может прийти повторно — перерисуем. */
    showPerkChoice(offer, run) {
        const panel = ocmH('div', { class: 'o-panel o-perkm o-pop' });
        const cards = ocmH('div', { class: 'o-perks' });
        const acts = ocmH('div', { class: 'o-perkacts' });
        const ad = typeof GameAds !== 'undefined' && typeof Platform !== 'undefined' && Platform.rewardedSupported();
        let picking = false;
        const pick = async (id) => {
            if (picking) return;
            picking = true;
            cards.classList.add('busy');
            this.sfx('click');
            const ok = await Game.survivalPick(id);
            if (!ok) { picking = false; cards.classList.remove('busy'); this.sfx('error'); }
        };
        (offer || []).forEach((p, i) => {
            const col = this._perkColor(p.rarity);
            const have = (run && run.perks && run.perks[p.id]) || 0;
            const dots = ocmH('div', { class: 'dots' });
            if (p.max > 1) for (let k = 0; k < p.max; k++) dots.append(ocmH('i', { class: k < have ? 'on' : k === have ? 'nx' : '' }));
            const card = ocmH('button', { class: 'o-perk ' + p.rarity, type: 'button', style: { '--rc': col, '--rc2': gameUiRgba(col, 0.42), '--dl': (i * 0.12 + 0.05).toFixed(2) + 's' }, onclick: () => pick(p.id) },
                ocmH('div', { class: 'pic' }, ocmH('img', { src: p.icon, alt: '', draggable: 'false' })),
                ocmH('div', { class: 'tx' }, ocmH('span', { class: 'rar', text: this.nm((GameData.RARITY[p.rarity] || { name: {} }).name) }), ocmH('b', { class: 'nm', text: this.nm(p.name) }),
                    ocmH('span', { class: 'ds', text: this.nm(p.desc) }), p.max > 1 ? dots : null));
            cards.append(card);
        });
        const drawActs = () => {
            acts.textContent = '';
            if (run && run.rerolls > 0) {
                acts.append(this.btn({ cls: 'c-blue', icon: 'restart', text: this.t('ui.reroll', { n: run.rerolls }), onTap: () => { if (!picking) Game.survivalReroll(); } }));
            }
            if (ad) {
                const w = GameAds.wait('perk-reroll'), can = GameAds.can('perk-reroll');
                acts.append(this.btn({
                    cls: can ? 'c-purple' : 'is-off', icon: 'ad', text: w > 0 && GameAds.available() ? this.t('ui.adWaitBtn', { n: w }) : this.t('ui.rerollAd'),
                    onOff: () => this.toast(!GameAds.available() ? this.t('shop.adUnavailable') : this.t('ui.adWaitHint', { n: w }), 'err'),
                    onTap: async () => { if (picking) return; const o = await Game.survivalRerollAd(); if (!o) { this.sfx('error'); this.toast(this.t('ui.adFailed'), 'err'); } },
                }));
            }
        };
        drawActs();
        panel.append(ocmH('div', { class: 'o-blk o-ribbon gold', text: this.t('ui.perkT') }), cards, acts);
        this._modal('perk', panel, { sticky: true, tick: drawActs });
        this.sfx('toast');
    },

    hidePerkChoice() { this._closeModal('perk'); },

    /** Итог забега: волна, рекорд, мобы, монеты, взятые перки; продолжить, ×2, ещё раз, меню. */
    showSurvivalEnd(result) {
        Pause.set('manual', false);
        this._setHud(false);
        this._resetOverlays();
        this._x2Done = false;
        const num = ocmH('span', { text: '0' });
        const c = { el: num, v: 0, t: 0, keep: true };
        this._counters.push(c);
        const wv = ocmH('div', { class: 'o-wv' }, ocmH('small', { text: this.t('ui.waveW') }), ocmH('b', { text: String(result.wave) }),
            result.record ? ocmH('div', { class: 'o-rec', text: this.t('ui.newRecord') }) : ocmH('div', { class: 'o-recl', text: this.t('ui.survBest', { n: result.best }) }));
        const total = ocmH('div', { class: 'o-total o-well' }, this.icon('pile'), ocmH('div', { class: 'big' }, ocmH('span', { text: '+' }), num));
        const lines = this._lines([[this.t('ui.mobs'), String(result.kills)], [this.t('ui.bonusWaves'), '+' + gameUiFmt(result.bonus)]]);
        const grid = ocmH('div', { class: 'o-perkgrid o-well' });
        const list = (result.perks || []).filter(x => x.perk);
        for (const x of list) grid.append(this._perkCell(x.perk, x.n));
        const acts = ocmH('div', { class: 'o-acts' });
        let cont = null;
        if (result.canRevive) {
            cont = this.btn({
                cls: 'c-green lg o-x2', kids: [this.icon('ad'), ocmH('span', {}, this.t('ui.cont'), ocmH('small', { text: this.t('ui.reviveSub') }))],
                onTap: async () => {
                    cont.classList.add('is-busy');
                    const ok = await Game.revive();
                    if (!ok) { cont.classList.remove('is-busy'); this.sfx('error'); this.toast(this.t('ui.adFailed'), 'err'); }
                },
            });
            acts.append(cont);
        }
        if (result.canDouble) {
            const x2 = this.btn({
                cls: 'c-purple o-x2', kids: [this.icon('ad'), ocmH('span', {}, this.t('ui.x2'), ocmH('small', { text: this.t('ui.x2Sub', { n: gameUiFmt(result.coins) }) }))],
                onTap: async () => {
                    if (this._x2Done || x2.classList.contains('is-busy')) return;
                    x2.classList.add('is-busy');
                    const ok = await Game.survivalDouble();
                    if (ok) {
                        this._x2Done = true;
                        c.t = result.coins * 2;
                        this.sfx('coins');
                        x2.replaceChildren(this.icon('check'), ocmH('span', { text: this.t('ui.x2Done') }));
                        x2.classList.remove('c-purple', 'is-busy');
                        x2.classList.add('c-green');
                        if (cont) cont.hidden = true;   // после удвоения «продолжить» недоступно
                    } else { x2.classList.remove('is-busy'); this.sfx('error'); this.toast(this.t('ui.adFailed'), 'err'); }
                },
            });
            acts.append(x2);
        }
        const menuB = this.btn({ cls: 'c-purple', icon: 'home', text: this.t('ui.menu'), onTap: (e) => this._finishGo(e, () => Game.toMenu()) });
        const again = this.btn({ cls: 'c-orange', icon: 'restart', text: this.t('ui.again'), onTap: (e) => this._finishGo(e, () => Game.startSurvival()) });
        acts.append(this._endRow(menuB, again, null));
        const el = ocmH('div', { class: 'o-panel o-end surv o-pop' }, ocmH('div', { class: 'o-blk o-ribbon lose', text: this.t('ui.survival') }), wv, total, lines,
            list.length ? ocmH('div', { class: 'o-perkwrap' }, ocmH('div', { class: 'o-t1 k', text: this.t('ui.perksTaken') }), grid) : null, acts);
        this._modal('lose', el, { sticky: true });
        this._later(500, () => { c.t = result.coins; this.sfx('coins'); if (result.record) this._confetti(50); });
    },

    // --- пауза -----------------------------------------------------------------------------------

    pause() {
        if (!this._hudOn || this.modals.pause || !(Game.state === 'play' || Game.state === 'intro')) return;
        Pause.set('manual', true);
        this._pauseModal();
    },

    _resume() {
        this._closeModal('pause');
        Pause.set('manual', false);
    },

    /** Кнопки «музыка» и «звуки» (переключатели на круглых иконках). */
    _soundToggles() {
        const mk = (key, on, off, label) => {
            const b = this.ibtn(on, () => {
                const v = key === 'music' ? !this.musicOn() : !this.sfxOn();
                this.setSetting(key, v ? 1 : 0);
                sync();
            }, '', label);
            const sync = () => {
                const isOn = key === 'music' ? this.musicOn() : this.sfxOn();
                b.classList.toggle('is-off', !isOn);
                const img = /** @type {HTMLImageElement} */ (b.querySelector('img'));
                img.src = GAMEUI_ICON[isOn ? on : off];
            };
            sync();
            return b;
        };
        return [mk('music', 'musicOn', 'musicOff', this.t('ui.music')), mk('sfx', 'soundOn', 'soundOff', this.t('ui.sounds'))];
    },

    _pauseModal() {
        const n = this._lvl ? this._lvl.n : Game.level.n;
        const surv = Game.mode === 'survival';
        const el = ocmH('div', { class: 'o-panel o-pause o-pop' },
            ocmH('div', { class: 'o-blk o-ribbon pause', text: this.t('ui.pauseT') }),
            this.btn({ cls: 'lg c-green', icon: 'play', text: this.t('ui.resume'), onTap: () => this._resume() }),
            ocmH('div', { class: 'o-btnrow' },
                this.btn({ cls: 'c-orange', icon: 'restart', text: this.t('ui.restart'), onTap: () => { this._closeModal('pause'); Pause.set('manual', false); this._go(() => Platform.ads.quit(() => (surv ? Game.startSurvival() : Game.startLevel(n)))); } }),
                this.btn({ cls: 'c-blue', icon: 'home', text: this.t('ui.menu'), onTap: () => { this._closeModal('pause'); Pause.set('manual', false); this._go(() => Platform.ads.quit(() => Game.toMenu())); } })),
            this.btn({ cls: 'c-purple sm', icon: 'question', text: this.t('ui.howto'), onTap: () => this._howTo() }),
            ocmH('div', { class: 'o-btnrow', style: 'justify-content:center' }, this._soundToggles()));
        this._modal('pause', el, { sticky: true });
    },

    /** «Как играть» из паузы: закрыть паузу и запустить обучение заново. */
    _howTo() {
        this._closeModal('pause');
        Pause.set('manual', false);
        if (typeof Tutorial !== 'undefined') Tutorial.start({ replay: true });
    },

    // =============================================================================================
    // Общие части страниц
    // =============================================================================================

    /** Шапка страницы: назад, название на деревянной табличке, (кнопки), монеты. */
    _head(title, opts) {
        const o = opts || {};
        const back = this.ibtn('back', () => { if (!this._spinning) this._closePage(); }, 'c-purple', this.t('ui.back'));
        return ocmH('div', { class: 'o-head' }, back, ocmH('div', { class: 'o-blk o-plank' }, ocmH('span', { text: title })), o.extra || null, this.pill());
    },

    /** Кнопка «осмотр»: панель уезжает, герой виден целиком. */
    _peekBtn(page) {
        const b = this.btn({ cls: 'o-ibtn o-peekbtn', label: this.t('ui.peek'), onTap: () => this._peek(page) });
        b.insertAdjacentHTML('beforeend', '<svg class="o-eye" viewBox="0 0 32 32" aria-hidden="true"><path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16z" fill="#fff" stroke="#1b1530" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="16" r="5.5" fill="#2f9bff" stroke="#1b1530" stroke-width="3"/></svg>');
        return b;
    },

    /** Глаз: панель магазина или арсенала уезжает целиком (сцена превью свободна) и возвращается кнопкой «Показать». */
    _peek(page, on) {
        const want = on == null ? !page.classList.contains('peek') : on;
        page.classList.toggle('peek', want);
        this._stage();
    },

    /** Куда поставить меч-витрину: в альбоме — в свободную часть справа от панели, в портрете — в полосу над панелью; без панели — в центр. */
    _stage() {
        const S = /** @type {any} */ (GameSword);
        if (typeof S.stage !== 'function' || !this.root) return;
        const p = /** @type {any} */ (this.page);
        const dock = p && p.dock;
        if (!dock || p.el.classList.contains('peek')) { S.stage(null); return; }
        const W = this.root.clientWidth, H = this.root.clientHeight;
        if (this.mode === 'land') {
            const right = dock.offsetLeft + dock.offsetWidth;
            S.stage((right + W) / 2, H * 0.5);
        } else {
            const head = p.el.querySelector('.o-head');
            const top = head ? head.offsetTop + head.offsetHeight : 0;
            S.stage(W / 2, Math.max(top + 40, (top + dock.offsetTop) / 2));
        }
    },

    /** Картинка предмета; пока файл не готов или не загрузился — заглушка с первой буквой названия. */
    _pic(src, cls, label, color, iconId) {
        const frag = document.createDocumentFragment();
        const ph = ocmH('div', { class: 'ph', text: String(label || '?').trim().charAt(0).toUpperCase(), style: color ? { background: gameUiRgba(color, 0.3) } : null });
        if (!src) { frag.append(ph); return frag; }
        const img = ocmH('img', { class: cls, alt: '', draggable: 'false', data: iconId ? { iid: iconId } : null });
        ph.hidden = true;
        img.addEventListener('error', () => { img.hidden = true; ph.hidden = false; });
        /** @type {any} */ (img).src = src;
        frag.append(img, ph);
        return frag;
    },

    // =============================================================================================
    // Карта уровней — «путешествие»
    // =============================================================================================

    openMap() {
        const page = this._page('map', 'full');
        const save = Game.save;
        const N = GameData.LEVEL_COUNT, PER = GameData.LEVELS_PER_BIOME || 10;
        const cur = Math.min(N, Math.max(1, save.level));
        const bname = ocmH('div', { class: 'o-bname o-t1' });
        const chips = ocmH('div', { class: 'o-bchips' });
        const scroll = ocmH('div', { class: 'o-map' });
        const world = ocmH('div', { class: 'o-world' });
        scroll.append(world);
        const nav = ocmH('div', { class: 'o-mapnav' });
        page.append(this._head(this.t('ui.mapT')), chips, bname, ocmH('div', { class: 'o-mapwrap' }, scroll, nav));
        /** @type {Record<string, number>} */
        const geo = { H: 0, SP: 0, BH: 0 };
        const biomeCenters = [];
        let active = -1;
        const Y = (n) => geo.H - ((geo.BOT || 0) + (n - 1) * geo.SP + Math.floor((n - 1) / PER) * geo.BH);
        const setActive = (b) => {
            if (b === active) return;
            active = b;
            for (const c of /** @type {NodeListOf<HTMLElement>} */ (/** @type {any} */ (chips.children))) c.classList.toggle('on', Number(c.dataset.b) === b);
            const bi = GameData.BIOMES[b];
            bname.textContent = this.nm(bi.name) + '  ·  ' + (b * PER + 1) + '–' + ((b + 1) * PER);
        };
        const build = () => {
            const u = this.u, W = Math.max(220, scroll.clientWidth);
            geo.SP = 84 * u; geo.BH = 140 * u; geo.BOT = 150 * u; geo.TOP = 90 * u;
            geo.H = geo.BOT + (N - 1) * geo.SP + (Math.floor((N - 1) / PER)) * geo.BH + geo.TOP;
            world.textContent = '';
            world.style.height = Math.round(geo.H) + 'px';
            const cx = W / 2, amp = Math.min(W * 0.3, 140 * u);
            const X = (n) => cx + amp * Math.sin((n - 1) * 0.86 + 0.4);
            // полосы биомов и таблички
            biomeCenters.length = 0;
            for (let b = 0; b < GameData.BIOMES.length; b++) {
                const bi = GameData.BIOMES[b], f = b * PER + 1;
                // табличка-разделитель — между последним узлом прошлого биома и первым узлом этого (узлы её не касаются)
                const M = Y(f) + (geo.SP + geo.BH) / 2;
                const Mnext = b === GameData.BIOMES.length - 1 ? 0 : Y(f + PER) + (geo.SP + geo.BH) / 2;
                const bottom = b === 0 ? geo.H : M, top = Mnext;
                const open = f <= cur;
                biomeCenters.push({ top, bottom, b });
                world.append(ocmH('div', { class: 'o-band' + (open ? '' : ' locked'), style: { top: top + 'px', height: (bottom - top) + 'px', '--bc': gameUiShade(bi.color, -0.28) } }));
                const plank = ocmH('div', { class: 'o-blk o-plank' }, ocmH('div', { text: this.nm(bi.name) }), ocmH('small', { text: this.t('ui.levelsRange', { a: f, b: f + PER - 1 }) }));
                plank.style.setProperty('--bc', open ? bi.color : '#6a668a');
                plank.style.setProperty('--bcd', open ? gameUiShade(bi.color, -0.4) : '#443f66');
                world.append(ocmH('div', { class: 'o-bband', style: { top: M + 'px' } }, ocmH('i', { class: 'gate' }), plank));
            }
            // тропа
            const pts = [];
            for (let n = 1; n <= N; n++) pts.push([X(n), Y(n)]);
            const curve = (a, z) => {
                let d = 'M' + pts[a][0].toFixed(1) + ' ' + pts[a][1].toFixed(1);
                for (let i = a; i < z; i++) {
                    const p0 = pts[Math.max(a, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(z, i + 2)];
                    d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ',' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
                }
                return d;
            };
            const all = curve(0, N - 1), done = cur > 1 ? curve(0, cur - 1) : '';
            const w1 = (24 * u).toFixed(1), w2 = (16 * u).toFixed(1), w3 = (3 * u).toFixed(1), da = (9 * u).toFixed(1);
            world.insertAdjacentHTML('beforeend', '<svg class="o-path" width="' + Math.round(W) + '" height="' + Math.round(geo.H) + '" viewBox="0 0 ' + Math.round(W) + ' ' + Math.round(geo.H) + '">' +
                '<path d="' + all + '" fill="none" stroke="#1b1530" stroke-width="' + w1 + '" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="' + all + '" fill="none" stroke="#d9c08a" stroke-width="' + w2 + '" stroke-linecap="round"/>' +
                '<path d="' + all + '" fill="none" stroke="#b79a5e" stroke-width="' + w3 + '" stroke-dasharray="' + da + ' ' + da + '" stroke-linecap="butt"/>' +
                (done ? '<path d="' + done + '" fill="none" stroke="#1b1530" stroke-width="' + w1 + '" stroke-linecap="round"/><path d="' + done + '" fill="none" stroke="#ffcf33" stroke-width="' + w2 + '" stroke-linecap="round"/><path d="' + done + '" fill="none" stroke="#fff3a8" stroke-width="' + w3 + '" stroke-dasharray="' + da + ' ' + da + '"/>' : '') + '</svg>');
            // узлы
            for (let n = 1; n <= N; n++) {
                const lvl = GameData.level(n), bi = GameData.BIOMES[lvl.biomeIndex];
                const locked = n > cur, isCur = n === cur, boss = !!lvl.boss;
                const stars = n < cur ? Math.max(1, save.stars[n] || 0) : 0;
                const node = ocmH('button', {
                    class: 'o-node' + (boss ? ' boss' : '') + (locked ? ' lock' : '') + (isCur ? ' cur' : ''), type: 'button', 'aria-label': this.t('levelN', { n }),
                    style: Object.assign({ left: X(n).toFixed(1) + 'px', top: Y(n).toFixed(1) + 'px' }, locked ? {} : { '--nc': boss ? '#8a4cf0' : bi.color, '--ncd': boss ? '#5224b0' : gameUiShade(bi.color, -0.42) }),
                    onclick: () => { if (performance.now() < noClick) return; this.sfx('click'); this._levelCard(n); },
                });
                if (locked) node.append(this.icon('lock'));
                else if (boss) node.append(this.icon('boss'));
                else node.append(ocmH('span', { text: String(n) }));
                if (boss) node.append(ocmH('span', { class: 'num', text: String(n) }));
                if (stars) node.append(ocmH('div', { class: 'st' }, [1, 2, 3].map(i => ocmH('img', { src: i <= stars ? GAMEUI_ICON.star : GAMEUI_ICON.starEmpty, alt: '' }))));
                if (isCur) { node.title = this.t('ui.here'); node.append(ocmH('div', { class: 'o-pin', html: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a8 8 0 0 0-8 8c0 6 8 17 8 17s8-11 8-17a8 8 0 0 0-8-8z" fill="#fff" stroke="#1b1530" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="11" r="3" fill="#ff8a1f" stroke="#1b1530" stroke-width="2"/></svg>' })); }
                world.append(node);
            }
        };
        // полоска биомов
        for (let b = 0; b < GameData.BIOMES.length; b++) {
            const bi = GameData.BIOMES[b], open = b * PER + 1 <= cur;
            chips.append(ocmH('button', {
                class: 'o-bchip' + (open ? '' : ' off'), type: 'button', text: String(b + 1), style: { '--bc': bi.color }, data: { b }, 'aria-label': this.nm(bi.name),
                onclick: () => { this.sfx('click'); const c = biomeCenters[b]; if (c) scroll.scrollTo({ top: Math.max(0, (c.top + c.bottom) / 2 - scroll.clientHeight / 2), behavior: 'smooth' }); },
            }));
        }
        // перетаскивание мышью с инерцией (пальцем листает сам браузер: touch-action: pan-y); порог 6 px — клик по узлу работает
        let noClick = 0, vel = 0, glideRaf = 0;
        /** @type {any} */
        let drag = null;
        const stopGlide = () => { if (glideRaf) cancelAnimationFrame(glideRaf); glideRaf = 0; };
        const glide = () => {
            stopGlide();
            let last = performance.now();
            const step = (now) => {
                const dt = Math.min(48, now - last); last = now;
                const before = scroll.scrollTop;
                scroll.scrollTop = before + vel * dt;
                vel *= Math.pow(0.94, dt / 16);
                if (Math.abs(vel) < 0.015 || scroll.scrollTop === before) { glideRaf = 0; return; }
                glideRaf = requestAnimationFrame(step);
            };
            glideRaf = requestAnimationFrame(step);
        };
        scroll.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            stopGlide();
            drag = { id: e.pointerId, y: e.clientY, top: scroll.scrollTop, lastY: e.clientY, lastT: performance.now(), moved: false };
        });
        scroll.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            const dy = e.clientY - drag.y;
            if (!drag.moved) {
                if (Math.abs(dy) < 6) return;
                drag.moved = true;
                scroll.classList.add('drag');
                try { scroll.setPointerCapture(e.pointerId); } catch (err) { /* указатель уже отпущен */ }
            }
            scroll.scrollTop = drag.top - dy;
            const now = performance.now(), dt = Math.max(1, now - drag.lastT);
            vel = vel * 0.6 + (-(e.clientY - drag.lastY) / dt) * 0.4;
            drag.lastY = e.clientY; drag.lastT = now;
            e.preventDefault();
        });
        const endDrag = (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            const d = drag; drag = null;
            scroll.classList.remove('drag');
            if (d.moved) {
                noClick = performance.now() + 80;
                try { scroll.releasePointerCapture(e.pointerId); } catch (err) { /* не захвачен */ }
                if (performance.now() - d.lastT > 90) vel = 0;
                if (Math.abs(vel) > 0.05) glide();
            }
        };
        scroll.addEventListener('pointerup', endDrag);
        scroll.addEventListener('pointercancel', endDrag);
        scroll.addEventListener('wheel', stopGlide, { passive: true });
        // кнопки: вверх, к текущему уровню, вниз; клавиши ↑ ↓ PageUp PageDown Home End
        const chev = (up) => '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="' + (up ? 'M6 21 16 10 26 21' : 'M6 11 16 22 26 11') + '" fill="none" stroke="#1b1530" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="' + (up ? 'M6 21 16 10 26 21' : 'M6 11 16 22 26 11') + '" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const goCur = () => scroll.scrollTo({ top: Math.max(0, Y(cur) - scroll.clientHeight * 0.55), behavior: 'smooth' });
        const by = (k) => scroll.scrollBy({ top: k * scroll.clientHeight * 0.8, behavior: 'smooth' });
        const mk = (label, html, fn, cls) => { const b = this.btn({ cls: 'o-ibtn sm ' + cls, label, onTap: fn }); b.insertAdjacentHTML('beforeend', html); return b; };
        nav.append(mk(this.t('ui.up'), chev(true), () => by(-1), 'c-blue'),
            mk(this.t('ui.toCurrent'), '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9" fill="none" stroke="#1b1530" stroke-width="7"/><circle cx="16" cy="16" r="9" fill="none" stroke="#fff" stroke-width="3"/><circle cx="16" cy="16" r="3.5" fill="#ffd23d" stroke="#1b1530" stroke-width="2.5"/></svg>', goCur, 'c-orange'),
            mk(this.t('ui.down'), chev(false), () => by(1), 'c-blue'));
        page.keys = (e) => {
            const k = e.code;
            if (k === 'ArrowUp') by(-0.3); else if (k === 'ArrowDown') by(0.3);
            else if (k === 'PageUp') by(-1); else if (k === 'PageDown') by(1);
            else if (k === 'Home') scroll.scrollTo({ top: 0, behavior: 'smooth' }); else if (k === 'End') scroll.scrollTo({ top: world.offsetHeight, behavior: 'smooth' });
            else return false;
            return true;
        };
        let raf = 0;
        scroll.addEventListener('scroll', () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                const mid = scroll.scrollTop + scroll.clientHeight / 2;
                const c = biomeCenters.find(x => mid >= x.top && mid <= x.bottom) || biomeCenters[0];
                if (c) setActive(c.b);
            });
        });
        build();
        scroll.scrollTop = Math.max(0, Y(cur) - scroll.clientHeight * 0.55);
        setActive(GameData.level(cur).biomeIndex);
        page.onFit = () => {
            const mid = (scroll.scrollTop + scroll.clientHeight / 2) / Math.max(1, world.offsetHeight || 1);
            requestAnimationFrame(() => { build(); scroll.scrollTop = mid * world.offsetHeight - scroll.clientHeight / 2; });
        };
        this.page.onFit = page.onFit;
        this.page.keys = page.keys;
    },

    /** Иконка времени суток (inline SVG, статичная разметка). */
    _timeSvg(time) {
        const ink = '#1b1530';
        if (time === 'night') return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M21 4a12 12 0 1 0 7 17A10 10 0 0 1 21 4z" fill="#cfe0ff" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/></svg>';
        if (time === 'sunset') return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23a11 11 0 0 1 22 0z" fill="#ff8a1f" stroke="' + ink + '" stroke-width="3" stroke-linejoin="round"/><path d="M2 26h28" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/><path d="M2 26h28" stroke="#ffd2a0" stroke-width="2" stroke-linecap="round"/></svg>';
        const rays = 'M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3';
        return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="' + rays + '" stroke="' + ink + '" stroke-width="5.5" stroke-linecap="round"/><path d="' + rays + '" stroke="#ffd23d" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="16" r="7" fill="#ffd23d" stroke="' + ink + '" stroke-width="3"/></svg>';
    },

    /** Карточка уровня: название, время суток, волны, мобы, награда, трофей босса. */
    /** Мобы уровня: тип -> варианты (золотой, гигант, малыш) по волнам. */
    _levelMobs(lvl) {
        /** @type {Map<string, Set<string>>} */
        const seen = new Map();
        for (const w of lvl.waves) for (const g of w.groups) {
            if (!seen.has(g.type)) seen.set(g.type, new Set());
            if (g.variant) seen.get(g.type).add(g.variant);
        }
        return [...seen.entries()].map(([id, vars]) => ({ id, def: GameData.MOBS[id] || {}, vars: [...vars] }));
    },

    /** Карточка уровня: название, время суток, волны, мобы с описаниями, награда, трофей босса, усиления, «Играть». */
    _levelCard(n) {
        const save = Game.save;
        const lvl = GameData.level(n), bi = GameData.BIOMES[lvl.biomeIndex];
        const cur = Math.min(GameData.LEVEL_COUNT, save.level);
        const locked = n > cur;
        const stars = n < cur ? Math.max(1, save.stars[n] || 0) : 0;
        const tw = lvl.boss ? GameData.SWORDS.find(w => w.boss === lvl.boss) : null;
        const timeName = { day: this.t('ui.timeDay'), sunset: this.t('ui.timeSunset'), night: this.t('ui.timeNight') }[lvl.time] || '';
        const info = (icon, val, label) => ocmH('div', { class: 'o-i o-well' }, icon, ocmH('b', { text: val }), ocmH('span', { text: label }));
        const body = ocmH('div', { class: 'o-lvbody' },
            ocmH('div', { class: 'o-info' },
                info(ocmH('div', { class: 'o-timeic', html: this._timeSvg(lvl.time) }), timeName, this.t('ui.time')),
                info(this.icon('shield'), String(lvl.waves.length), this.t('ui.waves')),
                info(this.icon('skull'), String(lvl.mobs), this.t('ui.mobs')),
                info(this.icon('pile'), '+' + gameUiFmt(lvl.reward), this.t('ui.reward'))));
        // враги: имя + способности
        const mobs = this._levelMobs(lvl);
        if (mobs.length) {
            const list = ocmH('div', { class: 'o-mobs o-well' }, ocmH('div', { class: 'o-t1 k', text: this.t('ui.enemies') }));
            for (const m of mobs) {
                const vars = m.vars.map(v => this.nm((GameData.VARIANTS[v] || {}).name)).filter(Boolean);
                list.append(ocmH('div', { class: 'o-mobrow' }, this.icon(m.def.boss ? 'boss' : 'skull'),
                    ocmH('div', { class: 'tx' }, ocmH('b', { text: this.nm(m.def.name) || m.id }), vars.length ? ocmH('i', { text: vars.join(', ') }) : null,
                        m.def.desc ? ocmH('span', { text: this.nm(m.def.desc) }) : null)));
            }
            body.append(list);
        }
        if (tw) {
            const col = (GameData.RARITY[tw.rarity] || {}).color || '#fff';
            body.append(ocmH('div', { class: 'o-well o-trow', style: { '--rc': col, '--rc2': gameUiRgba(col, 0.4) } },
                ocmH('div', { class: 'o-tbox' }, this._pic(GameSword.ICONS[tw.id], 'pic', this.nm(tw.name), col)),
                ocmH('div', { class: 'tx' }, ocmH('div', { class: 'o-t1 k', text: this.t('ui.trophy') }),
                    ocmH('div', { class: 'o-t2 nm', style: { color: col }, text: this.nm(tw.name) }))));
        }
        if (stars) body.append(ocmH('div', { class: 'o-lvstars' }, [1, 2, 3].map(i => ocmH('img', { src: i <= stars ? GAMEUI_ICON.star : GAMEUI_ICON.starEmpty, alt: '' }))));
        // подвал: усиления за рекламу и «Играть» (всегда на виду, тело прокручивается)
        const foot = ocmH('div', { class: 'o-lvfoot' });
        let drawBoosts = null;
        if (!locked && typeof GameAds !== 'undefined') {
            const row = ocmH('div', { class: 'o-boosts' });
            drawBoosts = () => {
                row.textContent = '';
                for (const [kind, id, label] of [['hearts', 'boost-hearts', this.t('ui.boostHearts')], ['coins', 'boost-coins', this.t('ui.boostCoins')]]) {
                    const active = kind === 'hearts' ? GameAds.boosts.hearts > 0 : GameAds.boosts.coins > 1;
                    const w = GameAds.wait(id), av = GameAds.available();
                    const ok = !active && av && w <= 0;
                    const why = !av ? this.t('shop.adUnavailable') : w > 0 ? this.t('ui.adWaitHint', { n: w }) : '';
                    const top = active ? null : ocmH('small', {}, this.icon('ad'), this.t('ui.forAd'));
                    const main = active ? this.t('ui.boostActive') : w > 0 && av ? this.t('ui.adWaitBtn', { n: w }) : label;
                    row.append(this.btn({
                        cls: active ? 'c-green' : ok ? 'c-purple' : 'is-off', kids: [ocmH('span', { class: 'o-boost' }, top, ocmH('b', { text: main }), active ? null : (w > 0 && av ? ocmH('small', { text: label }) : null))],
                        onOff: () => this.toast(why, 'err'),
                        onTap: async () => {
                            if (active) return;
                            const done = await GameAds.buyBoost(kind);
                            if (done) this.toast(this.t('ui.boostOn')); else { this.sfx('error'); this.toast(this.t('ui.adFailed'), 'err'); }
                            drawBoosts();
                        },
                    }));
                }
            };
            drawBoosts();
            foot.append(row);
        }
        const play = locked
            ? this.btn({ cls: 'lg is-off', icon: 'lock', text: this.t('ui.locked'), onOff: () => this.toast(this.t('ui.needPrev', { n: n - 1 }), 'err') })
            : this.btn({ cls: 'lg c-green', icon: 'play', text: this.t('ui.play'), onTap: () => { this._closeModal('card'); this._go(() => Game.startLevel(n)); } });
        foot.append(ocmH('div', { class: 'o-lvplay' }, play));
        const head = ocmH('div', { class: 'o-lvhead', style: { '--bc': lvl.boss ? '#8a4cf0' : bi.color } },
            lvl.boss ? this.icon('boss') : ocmH('div', { class: 'o-t3 num', text: String(n) }),
            ocmH('div', {}, ocmH('h2', { text: this.t('levelN', { n }) }), ocmH('small', { text: this.nm(lvl.title) })));
        const close = this.ibtn('close', () => this._closeModal('card'), 'c-pink sm o-close', this.t('ui.close'));
        const card = ocmH('div', { class: 'o-panel o-lvcard o-pop' }, head, body, foot, close);
        this._modal('card', card, { onBackdrop: () => this._closeModal('card'), tick: drawBoosts });
    },

    // =============================================================================================
    // Арсенал и магазин: панель сбоку/снизу, герой виден рядом
    // =============================================================================================

    /** Каркас: шапка с кнопкой «осмотр», панель с рядом вкладок, сеткой карточек и панелью деталей. */
    _dockSkeleton(page, title, showLabel) {
        const grid = ocmH('div', { class: 'o-grid' });
        const detail = ocmH('div', { class: 'o-detail o-well' });
        const tabs = ocmH('div', { class: 'o-tabs' });
        const gridWrap = ocmH('div', { class: 'o-gridwrap' }, grid);
        const dock = ocmH('div', { class: 'o-panel o-dock o-pop' }, tabs, ocmH('div', { class: 'o-split' }, gridWrap, detail));
        const show = ocmH('div', { class: 'o-showwrap' }, this.btn({ cls: 'lg c-orange', icon: 'shop', text: showLabel, onTap: () => this._peek(page, false) }));
        page.append(this._head(title, { extra: this._peekBtn(page) }), dock, show);
        const pg = /** @type {any} */ (this.page);
        pg.dock = dock;
        pg.onFit = () => this._stage();
        this._stage();
        return { grid, detail, tabs, gridWrap };
    },

    _statBar(frac, color) {
        const n = Math.max(1, Math.round(Math.max(0, Math.min(1, frac)) * 10));
        const bar = ocmH('div', { class: 'o-bar', style: { '--bc': color } });
        for (let i = 0; i < 10; i++) bar.append(ocmH('i', { class: i < n ? 'on' : '' }));
        return bar;
    },

    _element(sw) { return GameData.ELEMENTS[sw.element] || GameData.ELEMENTS.none; },

    /** Подпись состояния на карточке меча. */
    _swordSub(sw, st) {
        const mk = (cls, ...kids) => ocmH('div', { class: 'sub ' + cls }, ...kids);
        if (st === 'equipped') return mk('eq', this.icon('check'), this.t('ui.equipped'));
        if (st === 'owned') return mk('', this.t('ui.owned'));
        if (st === 'ads') { const pr = Game.swordAdProgress(sw.id); return mk('', this.icon('ad'), pr.have + '/' + pr.need); }
        if (st === 'buy') return mk('', this.icon('coin'), gameUiFmt(sw.price));
        if (st === 'expensive') return mk('exp', this.icon('coin'), gameUiFmt(sw.price));
        if (st === 'locked') return mk('', this.t('ui.lvShort', { n: sw.level }));
        return mk('boss', this.t('ui.bossShort'));
    },

    openArsenal() {
        const page = this._page('arsenal', 'side');
        const save = Game.save;
        const sk = this._dockSkeleton(page, this.t('ui.arsenal'), this.t('ui.showArsenal'));
        this._arsSel = save.sword;
        this._arsFilter = 'all';
        const rarities = ['all', 'common', 'rare', 'epic', 'legendary', 'mythic'];
        const mx = { dmg: 1, hits: 1, lo: 1e9, hi: 0, stam: 1, dlo: 1e9, dhi: 0 };
        const S = /** @type {any} */ (GameSword);
        const stOf = (sw) => (typeof S.staminaOf === 'function' ? S.staminaOf(sw) : null);
        for (const s of GameData.SWORDS) {
            mx.dmg = Math.max(mx.dmg, s.dmg); mx.hits = Math.max(mx.hits, s.hits); mx.lo = Math.min(mx.lo, s.speed); mx.hi = Math.max(mx.hi, s.speed);
            const st = stOf(s);
            if (st) { mx.stam = Math.max(mx.stam, st.max); mx.dlo = Math.min(mx.dlo, st.draw); mx.dhi = Math.max(mx.dhi, st.draw); }
        }

        const pick = (id) => {
            this._arsSel = id;
            for (const c of /** @type {NodeListOf<HTMLElement>} */ (/** @type {any} */ (sk.grid.children))) c.classList.toggle('sel', c.dataset.id === id);
            detail();
            if (typeof GameSword.preview === 'function') GameSword.preview(id);   // выбранный меч (даже закрытый) — крупно в витрине
        };
        const grid = () => {
            sk.grid.textContent = '';
            for (const sw of GameData.SWORDS) {
                if (this._arsFilter !== 'all' && sw.rarity !== this._arsFilter) continue;
                const st = Game.swordState(sw.id);
                const col = (GameData.RARITY[sw.rarity] || {}).color || '#b8c4cf';
                const el = ocmH('button', { class: 'o-sc' + (st === 'locked' || st === 'boss' ? ' locked' : '') + (this._arsSel === sw.id ? ' sel' : ''), type: 'button', data: { id: sw.id }, 'aria-label': this.nm(sw.name), style: { '--rc': col, '--rc2': gameUiRgba(col, 0.42) } });
                el.append(this._pic(GameSword.ICONS[sw.id], 'pic', this.nm(sw.name), col));
                if (sw.element !== 'none') el.append(ocmH('i', { class: 'o-gem', style: { '--gc': this._element(sw).color } }));
                if (st === 'locked') el.append(this.icon('lock', 'lk'));
                if (st === 'boss') el.append(this.icon('boss', 'lk'));
                el.append(this._swordSub(sw, st));
                el.addEventListener('click', () => { this.sfx('click'); pick(sw.id); });
                sk.grid.append(el);
            }
        };
        const tabs = () => {
            sk.tabs.textContent = '';
            for (const r of rarities) {
                const list = GameData.SWORDS.filter(s => r === 'all' || s.rarity === r);
                const own = list.filter(s => save.swords.includes(s.id)).length;
                const col = r === 'all' ? '#ffffff' : GameData.RARITY[r].color;
                sk.tabs.append(this.btn({
                    cls: 'sm ' + (this._arsFilter === r ? 'c-orange' : 'c-dark') + (r === 'all' ? ' keep' : ''),
                    label: r === 'all' ? this.t('ui.all') : this.nm(GameData.RARITY[r].name),
                    kids: [r === 'all' ? null : ocmH('i', { class: 'o-gem', style: { '--gc': col } }), ocmH('span', { text: r === 'all' ? this.t('ui.all') : this.nm(GameData.RARITY[r].name) }), ocmH('small', { text: own + '/' + list.length })],
                    onTap: () => { this._arsFilter = r; tabs(); grid(); sk.gridWrap.scrollTop = 0; },
                }));
            }
        };
        const detail = () => {
            const sw = GameData.sword(this._arsSel);
            const st = Game.swordState(sw.id);
            const col = (GameData.RARITY[sw.rarity] || {}).color || '#b8c4cf';
            const el = this._element(sw);
            const d = sk.detail;
            d.textContent = '';
            d.style.setProperty('--rc', col);
            d.style.setProperty('--rc2', gameUiRgba(col, 0.45));
            const pic = ocmH('div', { class: 'o-d-pic' }, this._pic(GameSword.ICONS[sw.id], '', this.nm(sw.name), col));
            d.append(ocmH('div', { class: 'o-d-top' }, pic, ocmH('div', { class: 'o-d-nm' },
                ocmH('div', { class: 'o-d-name', text: this.nm(sw.name) }),
                ocmH('div', { class: 'o-d-chips' },
                    ocmH('span', { class: 'o-chip', style: { '--cc': gameUiShade(col, -0.25) }, text: this.nm(GameData.RARITY[sw.rarity].name) }),
                    ocmH('span', { class: 'o-chip', style: { '--cc': gameUiShade(el.color, -0.55) } }, ocmH('i', { class: 'o-gem', style: { '--gc': el.color } }), this.nm(el.name))))));
            d.append(ocmH('div', { class: 'o-d-desc', text: this.nm(el.desc) }));
            const stat = (label, frac, val, color) => ocmH('div', { class: 'o-stat' }, ocmH('b', { text: label }), this._statBar(frac, color), ocmH('span', { text: val }));
            d.append(ocmH('div', { class: 'o-d-stats' },
                stat(this.t('ui.dmg'), sw.dmg / mx.dmg, String(sw.dmg), '#ff6a4a'),
                stat(this.t('ui.hits'), sw.hits / mx.hits, '×' + sw.hits, '#ffd23d'),
                stat(this.t('ui.speed'), 0.15 + 0.85 * (sw.speed - mx.lo) / Math.max(1, mx.hi - mx.lo), String(Math.round(sw.speed / 100)), '#4adfff'),
                ...(stOf(sw) ? [
                    stat(this.t('ui.stamina'), stOf(sw).max / mx.stam, this.t('ui.secShort', { n: +stOf(sw).max.toFixed(1) }), '#52d63c'),
                    stat(this.t('ui.draw'), 1 - 0.85 * (stOf(sw).draw - mx.dlo) / Math.max(0.01, mx.dhi - mx.dlo), this.t('ui.secShort', { n: +stOf(sw).draw.toFixed(2) }), '#b45cff')] : [])));
            const act = ocmH('div', { class: 'o-d-act' });
            if (st === 'equipped') {
                act.append(ocmH('div', { class: 'o-btn c-green', style: 'cursor:default' }, this.icon('check'), ocmH('span', { text: this.t('ui.equipped') })));
            } else if (st === 'owned') {
                act.append(this.btn({ cls: 'c-blue', icon: 'sword', text: this.t('ui.equip'), onTap: async () => { await Game.equipSword(sw.id); refresh(); } }));
            } else if (st === 'buy' || st === 'expensive') {
                const need = sw.price - this.coins();
                act.append(this.btn({
                    cls: st === 'buy' ? 'c-orange' : 'is-off', kids: [this.icon('coin'), ocmH('span', { text: this.t('ui.buyFor', { n: gameUiFmt(sw.price) }) })],
                    onOff: () => this.toast(this.t('ui.needCoins', { n: gameUiFmt(need) }), 'err'),
                    onTap: async () => {
                        if (!Game.buySword(sw.id)) { this.sfx('error'); return; }
                        this.refreshCoins(true);
                        await Game.equipSword(sw.id);
                        this.toast(this.t('ui.boughtEquipped'));
                        refresh();
                    },
                }));
                if (st === 'expensive') act.append(ocmH('div', { class: 'o-hint', text: this.t('ui.needCoins', { n: gameUiFmt(need) }) }));
            } else if (st === 'ads') {
                const pr = Game.swordAdProgress(sw.id);
                const row = ocmH('div', { class: 'o-adprog' });
                for (let i = 0; i < pr.need; i++) row.append(ocmH('i', { class: i < pr.have ? 'on' : '' }));
                const why = !pr.available ? this.t('shop.adUnavailable') : pr.wait > 0 ? this.t('ui.adWaitHint', { n: pr.wait }) : '';
                const label = pr.available && pr.wait > 0 ? this.t('ui.adWaitBtn', { n: pr.wait }) : this.t('ui.adProgress', { a: pr.have, b: pr.need });
                act.append(row, this.btn({
                    cls: pr.available && pr.wait <= 0 ? 'c-purple' : 'is-off', icon: 'ad', text: label,
                    onOff: () => this.toast(why, 'err'),
                    onTap: async () => {
                        const r = await Game.watchSwordAd(sw.id);
                        if (r.ok) {
                            if (r.unlocked) { this.refreshCoins(true); refresh(); this._trophy(sw); }
                            else { this.sfx('click'); this.toast(this.t('ui.adCounted', { a: r.have, b: r.need })); refresh(); }
                        } else {
                            this.sfx('error');
                            if (r.reason === 'declined') this.toast(this.t('ui.adFailed'), 'err');
                            else if (r.reason === 'cooldown') this.toast(this.t('ui.adWaitHint', { n: r.wait || 0 }), 'err');
                            else if (r.reason === 'unavailable') this.toast(this.t('shop.adUnavailable'), 'err');
                            refresh();
                        }
                    },
                }));
                act.append(ocmH('div', { class: 'o-hint', style: why ? '' : 'color:#d9d2ff', text: why || this.t('ui.adsHint', { n: pr.need }) }));
            } else if (st === 'locked') {
                act.append(this.btn({ cls: 'is-off', icon: 'lock', text: this.t('ui.lvShort', { n: sw.level }), onOff: () => this.toast(this.t('ui.opensAt', { n: sw.level }), 'err') }));
                act.append(ocmH('div', { class: 'o-hint', text: this.t('ui.opensAt', { n: sw.level }) }));
            } else {
                const bi = GameData.BIOMES.findIndex(b => b.boss === sw.boss);
                const boss = GameData.MOBS[sw.boss];
                act.append(this.btn({ cls: 'is-off', icon: 'boss', text: this.t('ui.bossTrophy'), onOff: () => this.toast(this.t('ui.bossHint', { name: this.nm(boss && boss.name), n: (bi + 1) * 10 }), 'err') }));
                act.append(ocmH('div', { class: 'o-hint', text: this.t('ui.bossHint', { name: this.nm(boss && boss.name), n: (bi + 1) * 10 }) }));
            }
            d.append(act);
        };
        const refresh = () => { tabs(); grid(); detail(); this.refreshCoins(true); };
        tabs(); grid(); detail();
        const sel = sk.grid.querySelector('.sel');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
        this.page.onClose = () => { if (typeof GameSword.previewEnd === 'function') GameSword.previewEnd(); this._stage(); };
        let lastWait = -1;
        this.page.tick = () => {
            if (Game.swordState(this._arsSel) !== 'ads') { lastWait = -1; return; }
            const w = Game.swordAdProgress(this._arsSel).wait;
            if (w !== lastWait) { lastWait = w; detail(); }
        };
    },

    // =============================================================================================
    // Магазин косметики
    // =============================================================================================

    /** Примерка эффекта: след и сияние сразу видны на мече, разрез, разлёт и салют проигрываются один раз. */
    _tryOn(item) {
        const L = gameUiLook();
        if (L && typeof L.preview === 'function') L.preview(item);
        else Shop.preview(item.id);
    },

    /** Закрыть примерку: вернуть надетое (след и сияние меча снова настоящие). */
    _endTryOn() {
        if (typeof Shop === 'undefined') return;
        Shop.clearPreview();
        const L = gameUiLook();
        if (L && typeof L.apply === 'function') L.apply(Shop.look());
    },

    openShop() {
        const page = this._page('shop', 'side');
        const sk = this._dockSkeleton(page, this.t('ui.shop'), this.t('ui.showShop'));
        const L = gameUiLook();
        const tabList = Shop.tabs();
        if (!tabList.some(t => t.id === this._shopTab)) this._shopTab = tabList[0] ? tabList[0].id : '';
        const rc = (r) => GAMEUI_RARITY[r] || '#b8c4cf';
        const selectDefault = () => {
            const list = Shop.cards(this._shopTab);
            const eq = list.find(c => c.equipped);
            this._shopSel = (eq || list[0] || { id: '' }).id;
        };
        selectDefault();
        const tabs = () => {
            sk.tabs.textContent = '';
            for (const tb of Shop.tabs()) {
                const ic = tb.data && tb.data.icon;
                sk.tabs.append(this.btn({
                    cls: 'sm ' + (this._shopTab === tb.id ? 'c-orange' : 'c-dark') + (ic ? '' : ' keep'),
                    label: tb.name,
                    kids: [ic ? ocmH('img', { class: 'o-ic', src: ic, alt: '', draggable: 'false' }) : null, ocmH('span', { text: tb.name }), ocmH('small', { text: tb.owned + '/' + tb.count })],
                    onTap: () => { this._endTryOn(); this._shopTab = tb.id; selectDefault(); tabs(); grid(); detail(); sk.gridWrap.scrollTop = 0; },
                }));
            }
        };
        const sub = (c) => {
            const mk = (cls, ...kids) => ocmH('div', { class: 'sub ' + cls }, ...kids);
            if (c.state === 'equipped') return mk('eq', this.icon('check'), this.t('shop.equipped'));
            if (c.owned) return mk('', this.t('shop.owned'));
            if (c.kind === 'coins') return mk(c.affordable ? '' : 'exp', this.icon('coin'), gameUiFmt(c.price));
            if (c.kind === 'ads') return mk('', this.icon('ad'), c.progress + '/' + c.need);
            return mk('', this.icon('gift'), this.t('ui.dailyShort'));
        };
        const pick = (id) => {
            this._shopSel = id;
            for (const el of /** @type {NodeListOf<HTMLElement>} */ (sk.grid.children)) el.classList.toggle('sel', el.dataset.id === id);
            const c = Shop.card(id);
            if (c) this._tryOn(c.item);
            if (typeof GameSword.demo === 'function') GameSword.demo(true);   // меч сам машет перед камерой: след, сияние, разрез
            detail();
        };
        const grid = () => {
            sk.grid.textContent = '';
            for (const c of Shop.cards(this._shopTab)) {
                const col = rc(c.rarity);
                const el = ocmH('button', { class: 'o-sc' + (c.kind === 'exclusive' && !c.owned ? ' locked' : '') + (this._shopSel === c.id ? ' sel' : ''), type: 'button', data: { id: c.id }, 'aria-label': c.name, style: { '--rc': col, '--rc2': gameUiRgba(col, 0.42) } });
                el.append(this._pic(L ? L.icon(c.item) : '', 'pic', c.name, col, c.id));
                if (c.kind === 'exclusive' && !c.owned) el.append(this.icon('lock', 'lk'));
                el.append(sub(c));
                el.addEventListener('click', () => { this.sfx('click'); pick(c.id); });
                sk.grid.append(el);
            }
        };
        const act = async (c) => {
            const r = await Shop.act(c.id);
            if (r && r.ok) {
                if (c.action === 'buy') this.sfx('buy');
                else if (c.action === 'watch') this.sfx(r.unlocked ? 'unlock' : 'click');
                else this.sfx('equip');
                if (c.action === 'watch' && r.unlocked) this.toast(this.t('ui.unlocked', { name: c.name }));
                else if (c.action === 'buy') this.toast(this.t('ui.bought', { name: c.name }));
            } else if (r) {
                this.sfx('error');
                if (r.reason === 'noCoins') this.toast(this.t('ui.needCoins', { n: gameUiFmt(r.missing || 0) }), 'err');
                else if (r.reason === 'busy') { /* реклама уже идёт */ }
                else this.toast(this.t('shop.adUnavailable'), 'err');
            }
            this.refreshCoins(true);
            tabs(); grid(); detail();
        };
        const detail = () => {
            const d = sk.detail;
            d.textContent = '';
            const c = Shop.card(this._shopSel);
            if (!c) { d.append(ocmH('div', { class: 'o-d-desc', text: this.t('ui.pickItem') })); return; }
            const col = rc(c.rarity);
            d.style.setProperty('--rc', col);
            d.style.setProperty('--rc2', gameUiRgba(col, 0.45));
            const tabName = (Shop.tabs().find(t => t.id === c.tab) || { name: '' }).name;
            d.append(ocmH('div', { class: 'o-d-top' }, ocmH('div', { class: 'o-d-pic' }, this._pic(L ? L.icon(c.item) : '', '', c.name, col, c.id)),
                ocmH('div', { class: 'o-d-nm' }, ocmH('div', { class: 'o-d-name', text: c.name }),
                    ocmH('div', { class: 'o-d-chips' }, ocmH('span', { class: 'o-chip', style: { '--cc': gameUiShade(col, -0.25) }, text: c.rarityLabel }), ocmH('span', { class: 'o-chip', style: { '--cc': '#4a3f86' }, text: tabName })))));
            // цена или условие
            if (c.kind === 'coins' && !c.owned) d.append(ocmH('div', { class: 'o-d-desc', style: 'display:flex;align-items:center;gap:6px;font-size:calc(var(--u) * 18)' }, this.icon('coin'), ocmH('b', { class: 'o-gold o-t2', text: gameUiFmt(c.price) })));
            if (c.kind === 'ads' && !c.owned) {
                const row = ocmH('div', { class: 'o-adprog' });
                for (let i = 0; i < c.need; i++) row.append(ocmH('i', { class: i < c.progress ? 'on' : '' }));
                d.append(ocmH('div', { class: 'o-d-desc', text: c.priceLabel }), row);
            }
            if (c.kind === 'exclusive' && !c.owned) d.append(ocmH('div', { class: 'o-d-desc', text: this.t('ui.dailyHint') }));
            const box = ocmH('div', { class: 'o-d-act' });
            if (c.action === 'watch') {
                const gw = typeof GameAds !== 'undefined' ? GameAds.wait('shop-unlock') : 0;
                const wait = Math.max(c.adWait || 0, gw);
                const ready = c.enabled && gw === 0;
                box.append(this.btn({
                    cls: c.busy ? 'c-purple is-busy' : ready ? 'c-purple' : 'is-off', icon: 'ad', text: wait > 0 ? this.t('ui.adWaitBtn', { n: wait }) : c.actionLabel,
                    onOff: () => this.toast(wait > 0 ? this.t('ui.adWaitHint', { n: wait }) : c.hint || this.t('shop.adUnavailable'), 'err'), onTap: () => act(c),
                }));
                if (wait > 0) box.append(ocmH('div', { class: 'o-hint', style: 'color:#d9d2ff', text: this.t('ui.adWaitHint', { n: wait }) }));
                else if (!c.enabled && c.hint) box.append(ocmH('div', { class: 'o-hint', text: c.hint }));
            } else if (c.action === 'buy') {
                box.append(this.btn({
                    cls: c.enabled ? 'c-orange' : 'is-off', kids: [this.icon('coin'), ocmH('span', { text: this.t('ui.buyFor', { n: gameUiFmt(c.price) }) })],
                    onOff: () => this.toast(c.hint, 'err'), onTap: () => act(c),
                }));
                if (!c.enabled && c.hint) box.append(ocmH('div', { class: 'o-hint', text: c.hint }));
            } else if (c.action === 'equip') {
                box.append(this.btn({ cls: 'c-blue', icon: 'check', text: c.actionLabel, onTap: () => act(c) }));
            } else if (c.action === 'unequip') {
                box.append(this.btn({ cls: 'c-dark', text: c.actionLabel, onTap: () => act(c) }));
            } else if (c.equipped) {
                box.append(ocmH('div', { class: 'o-btn c-green', style: 'cursor:default' }, this.icon('check'), ocmH('span', { text: this.t('shop.equipped') })));
            } else if (c.hint) {
                box.append(ocmH('div', { class: 'o-hint', style: 'color:#ffe9a8', text: c.hint }));
            }
            d.append(box);
        };
        tabs(); grid(); detail();
        let lastW = -1;
        this.page.tick = () => {
            const c = Shop.card(this._shopSel);
            if (!c || c.action !== 'watch') { lastW = -1; return; }
            const w = Math.max(c.adWait || 0, typeof GameAds !== 'undefined' ? GameAds.wait('shop-unlock') : 0);
            if (w !== lastW) { lastW = w; detail(); }
        };
        this.page.onClose = () => { if (typeof GameSword.demo === 'function') GameSword.demo(false); this._endTryOn(); this._stage(); };
        const sel = sk.grid.querySelector('.sel');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    },

    // =============================================================================================
    // Награды: окно «получено», конфетти
    // =============================================================================================

    /** Окно с полученным: got — [{ type: coins|item|exclusive, amount | id, converted? }] из DailyGift.claim / Wheel.finish. */
    _prize(title, got, onClose) {
        const L = gameUiLook();
        const rows = [];
        for (const g of got || []) {
            if (g.type === 'coins') {
                rows.push(ocmH('div', { class: 'o-reward o-well' }, this.icon('pile'),
                    ocmH('div', {}, ocmH('div', { class: 'big', text: '+' + gameUiFmt(g.amount) }), g.converted ? ocmH('div', { class: 'sm', text: this.t('ui.dupCoins') }) : null)));
            } else {
                const it = Shop.item(g.id);
                const col = GAMEUI_RARITY[it && it.rarity] || '#ffcf33';
                const holder = ocmH('div', { style: { position: 'relative', width: 'calc(var(--u) * 58)', height: 'calc(var(--u) * 58)', flex: 'none', border: '3px solid ' + col, borderRadius: '10px', background: gameUiRgba(col, 0.25) } }, this._pic(L && it ? L.icon(it) : '', 'pic', Shop.name(g.id), col, g.id));
                const img = holder.querySelector('img');
                if (img) img.style.cssText = 'position:absolute;inset:6%;width:88%;height:88%;object-fit:contain';
                rows.push(ocmH('div', { class: 'o-reward o-well' }, holder,
                    ocmH('div', {}, ocmH('div', { class: 'o-t2', style: 'font-size:calc(var(--u) * 19);line-height:1.1', text: Shop.name(g.id) }),
                        ocmH('div', { class: 'sm', text: g.type === 'exclusive' ? this.t('ui.exclusiveSkin') : this.t('ui.newItem') }),
                        this.btn({ cls: 'xs c-blue', text: this.t('shop.equip'), style: 'margin-top:6px', onTap: () => { Shop.equip(g.id); this.toast(this.t('ui.equippedToast', { name: Shop.name(g.id) })); } }))));
            }
        }
        const close = () => { this._closeModal('prize'); if (onClose) onClose(); };
        const el = ocmH('div', { class: 'o-panel o-wwin o-pop' }, ocmH('div', { class: 'o-blk o-ribbon gold', text: title }), rows,
            this.btn({ cls: 'lg c-green', text: this.t('ui.great'), onTap: close }));
        this._modal('prize', el, { sticky: true });
        this._confetti(46);
    },

    /** Кубики-конфетти падают сверху экрана. */
    _confetti(n) {
        const W = this.root.clientWidth, H = this.root.clientHeight;
        const cols = ['#ff8a1f', '#ffcf33', '#52d63c', '#2f9bff', '#ff3d7f', '#9a5cff', '#1fd1bf', '#ffffff'];
        const holder = ocmH('div', { class: 'o-conf' });
        this.L.fly.append(holder);
        for (let i = 0; i < n; i++) {
            const p = ocmH('i', { style: { left: Math.random() * W + 'px', top: '-24px', background: cols[i % cols.length] } });
            holder.append(p);
            const drift = (Math.random() - 0.5) * 220, rot = (Math.random() - 0.5) * 900;
            p.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: 'translate(' + drift + 'px,' + (H + 50) + 'px) rotate(' + rot + 'deg)' }],
                { duration: 1700 + Math.random() * 1700, delay: Math.random() * 800, easing: 'cubic-bezier(.35,.1,.65,1)', fill: 'both' });
        }
        window.setTimeout(() => holder.remove(), 4600);
    },

    // =============================================================================================
    // Подарок дня
    // =============================================================================================

    openGift() {
        if (typeof DailyGift === 'undefined') return;
        const page = this._page('gift', 'full');
        const panel = ocmH('div', { class: 'o-panel o-gift o-pop' });
        page.append(this._head(this.t('ui.giftT')), ocmH('div', { class: 'o-body', style: 'align-items:center;justify-content:center' }, panel));
        const L = gameUiLook();
        let canClaim = null;
        const dayEl = (d) => {
            const r = d.reward || {};
            const el = ocmH('div', { class: 'o-blk o-day ' + d.state + (d.exclusive ? ' d7' : '') }, ocmH('b', { text: d.dayLabel }));
            if (d.exclusive && d.skin) {
                const it = Shop.item(d.skin);
                const wrap = ocmH('div', { style: { position: 'relative', width: 'calc(var(--u) * 56)', height: 'calc(var(--u) * 56)', border: '3px solid #ffcf33', borderRadius: '10px', background: 'rgba(255,207,51,.18)' } }, this._pic(L && it ? L.icon(it) : '', 'pic', Shop.name(d.skin), '#ffcf33', d.skin));
                const img = wrap.querySelector('img');
                if (img) img.style.cssText = 'position:absolute;inset:4%;width:92%;height:92%;object-fit:contain';
                el.append(wrap, ocmH('span', { class: 'o-t1', text: Shop.name(d.skin) }), ocmH('i', { class: 'tag2', text: this.t('ui.exclusive') }));
            } else {
                el.append(this.icon(r.randomItems || r.item ? 'chest' : 'pile'));
                if (r.coins) el.append(ocmH('span', { class: 'o-gold o-t2', style: 'font-size:calc(var(--u) * 15)', text: '+' + gameUiFmt(r.coins) }));
                if (r.randomItems) el.append(ocmH('span', { class: 'ds', text: this.t('ui.plusItem') }));
                if (r.item) el.append(ocmH('span', { class: 'ds', text: Shop.name(r.item) }));
            }
            if (d.state === 'claimed') el.append(ocmH('div', { class: 'done' }, ocmH('img', { src: GAMEUI_ICON.check, alt: '' })));
            else if (d.state === 'today') el.append(ocmH('i', { class: 'tag2', text: this.t('daily.today') }));
            else if (d.state === 'tomorrow') el.append(ocmH('span', { class: 'ds', text: this.t('daily.tomorrow') }));
            return el;
        };
        const render = () => {
            const v = DailyGift.view();
            canClaim = v.canClaim;
            panel.textContent = '';
            const note = ocmH('div', { class: 'o-gnote' });
            const upd = () => { const s = DailyGift.status(); note.textContent = s.canClaim ? (v.x2.hint || '') : s.nextLabel; };
            upd();
            const claim = this.btn({
                cls: v.claim.enabled ? 'lg c-green' : 'lg is-off', icon: v.claim.enabled ? 'gift' : 'check', text: v.claim.enabled ? v.claim.label : this.t('daily.claimed'),
                onOff: () => this.toast(DailyGift.status().nextLabel),
                onTap: () => { const r = DailyGift.claim(); if (r.ok) this._giftDone(r, render); else render(); },
            });
            const acts = ocmH('div', { class: 'o-gact' }, claim);
            if (v.x2.available) {
                const x2 = this.btn({
                    cls: v.x2.busy ? 'lg c-purple is-busy' : v.x2.enabled ? 'lg c-purple o-x2' : 'lg is-off o-x2',
                    kids: [this.icon('ad'), ocmH('span', {}, v.x2.label, ocmH('small', { text: v.x2.rewardLabel }))],
                    onOff: () => this.toast(v.x2.hint || this.t('daily.adUnavailable'), 'err'),
                    onTap: async () => {
                        x2.classList.add('is-busy');
                        const r = await DailyGift.claimX2();
                        if (r.ok) this._giftDone(r, render);
                        else {
                            this.sfx('error');
                            if (r.reason === 'adFailed') this.toast(this.t('ui.adFailedGift'), 'err');
                            else if (r.reason === 'adUnavailable' || r.reason === 'cooldown') this.toast(this.t('daily.adUnavailable'), 'err');
                            render();
                        }
                    },
                });
                acts.append(x2);
            }
            panel.append(ocmH('div', { class: 'o-days' }, v.days.map(dayEl)), acts, note);
            this.page.tick = () => { if (DailyGift.canClaim() !== canClaim) render(); else upd(); };
        };
        render();
    },

    _giftDone(r, then) {
        this.sfx('gift');
        this.refreshCoins(true);
        this._prize(this.t(r.mult > 1 ? 'ui.giftGotX2' : 'ui.giftGot'), r.got, then);
        if (then) then();
    },

    // =============================================================================================
    // Колесо фортуны
    // =============================================================================================

    openWheel() {
        if (typeof Wheel === 'undefined') return;
        const page = this._page('wheel', 'full');
        const L = gameUiLook();
        const secs = Wheel.sectors();
        const n = Math.max(2, secs.length), step = 360 / n;
        const palette = ['#4aa8ff', '#62c13b', '#b45cff', '#ffb02a', '#ff5a8a', '#3ad0e0', '#ff8a1f', '#ffd84a'];
        const stops = secs.map((s, i) => (s.data.color || palette[i % palette.length]) + ' ' + (i * step) + 'deg ' + ((i + 1) * step) + 'deg');
        const disc = ocmH('div', { class: 'o-disc' });
        disc.style.background = 'repeating-conic-gradient(from ' + (-step / 2) + 'deg,#1b1530 0 1.4deg,transparent 1.4deg ' + step + 'deg),conic-gradient(from ' + (-step / 2) + 'deg,' + stops.join(',') + ')';
        secs.forEach((s, i) => {
            const inner = ocmH('div', { class: 'in' });
            if (s.kind === 'item' && s.itemId) {
                const it = Shop.item(s.itemId);
                inner.append(this._pic(L && it ? L.icon(it) : '', '', Shop.name(s.itemId), '#ffffff', s.itemId), ocmH('span', { text: Shop.name(s.itemId) }));
            } else {
                inner.append(this.icon(s.coins >= 300 ? 'pile' : 'coin'), ocmH('span', { style: 'font-size:calc(var(--wd) * .056)', text: gameUiFmt(s.coins) }));
            }
            disc.append(ocmH('div', { class: 'o-sec', style: { transform: 'rotate(' + (i * step) + 'deg)' } }, inner));
        });
        const ptr = ocmH('div', { class: 'o-ptr' });
        const pegs = [];
        for (let i = 0; i < 16; i++) pegs.push(ocmH('i', { class: 'o-peg', style: { transform: 'rotate(' + (i * 22.5) + 'deg) translateY(calc(var(--wd) * -.518))' } }));
        const wheel = ocmH('div', { class: 'o-wheel' }, ocmH('div', { class: 'o-rim' }), pegs, disc, ocmH('div', { class: 'o-hub' }, this.icon('star')), ptr);
        const ctl = ocmH('div', { class: 'o-wctl' });
        page.append(this._head(this.t('ui.wheelT')), ocmH('div', { class: 'o-wh' }, wheel, ctl));
        const setAngle = (a) => { disc.style.transition = 'none'; disc.style.transform = 'rotate(' + a + 'deg)'; };
        const controls = () => {
            const st = Wheel.status();
            ctl.textContent = '';
            const spinning = this._spinning;
            ctl.append(this.btn({
                cls: spinning ? 'lg is-off' : st.canSpinFree ? 'lg c-green' : 'lg is-off', icon: st.canSpinFree && !spinning ? 'wheel' : null,
                text: spinning ? this.t('wheel.spinning') : st.freeLabel, onOff: () => this.toast(spinning ? this.t('wheel.spinning') : st.hint || st.freeLabel, 'err'), onTap: () => spin('free'),
            }));
            if (st.adLimit > 0) {
                ctl.append(this.btn({
                    cls: st.busy ? 'c-purple is-busy o-x2' : st.canSpinAd && !spinning ? 'c-purple o-x2' : 'is-off o-x2', icon: 'ad', text: st.adLabel,
                    onOff: () => this.toast(spinning ? this.t('wheel.spinning') : st.hint || this.t('wheel.adUnavailable'), 'err'), onTap: () => spin('ad'),
                }));
            }
            ctl.append(ocmH('div', { class: 'o-wnote', text: spinning ? '' : st.hint || '' }));
        };
        const run = (r) => {
            this._spinning = true;
            controls();
            const from = this._wheelAngle;
            const target = Wheel.angleFrom(from, r);
            this._wheelAngle = target;
            disc.style.transition = 'transform ' + r.durationMs + 'ms cubic-bezier(.12,.62,.1,1)';
            disc.style.transform = 'rotate(' + target + 'deg)';
            // тики: считаем границы секторов под стрелкой по текущему углу диска
            let acc = from, prev = from, tickIdx = Math.floor((from + step / 2) / step), alive = true;
            const loop = () => {
                if (!alive) return;
                const m = getComputedStyle(disc).transform;
                if (m && m !== 'none') {
                    const v = m.match(/matrix\(([^)]+)\)/);
                    if (v) {
                        const p = v[1].split(',').map(Number);
                        const cur = Math.atan2(p[1], p[0]) * 180 / Math.PI;
                        acc += ((cur - prev + 540) % 360) - 180;
                        prev = cur;
                        const idx = Math.floor((acc + step / 2) / step);
                        if (idx !== tickIdx) { tickIdx = idx; this.sfx('wheelTick'); ptr.classList.remove('tick'); void ptr.offsetWidth; ptr.classList.add('tick'); }
                    }
                }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
            let finished = false;
            const done = () => {
                if (finished) return;
                finished = true;
                alive = false;
                const res = Wheel.finish();
                this._spinning = false;
                if (res.ok) {
                    this.sfx('wheelWin');
                    this.refreshCoins(true);
                    if (this.page && this.page.name === 'wheel') this._prize(this.t('wheel.win'), res.got, controls);
                    else this.toast(res.label || '');
                }
                if (this.page && this.page.name === 'wheel') controls();
            };
            disc.addEventListener('transitionend', (e) => { if (e.target === disc && e.propertyName === 'transform') done(); }, { once: false });
            window.setTimeout(done, r.durationMs + 700);   // запасной таймер: вкладка в фоне, transitionend не пришёл
        };
        const spin = async (kind) => {
            if (this._spinning) return;
            let r;
            if (kind === 'free') r = Wheel.spinFree();
            else {
                this._spinning = true; controls();
                try { r = await Wheel.spinAd(); } finally { this._spinning = false; }
            }
            if (!r.ok) {
                this.sfx('error');
                if (r.reason === 'adFailed') this.toast(this.t('ui.adFailedWheel'), 'err');
                else if (r.reason === 'adUnavailable' || r.reason === 'cooldown') this.toast(this.t('wheel.adUnavailable'), 'err');
                else if (r.reason === 'limit' || r.reason === 'noFree') this.toast(this.t('wheel.noSpins'), 'err');
                controls();
                return;
            }
            run(r);
        };
        setAngle(this._wheelAngle);
        const pend = Wheel.pendingSpin();
        controls();
        if (pend) {   // вращение, чей приз ещё не выдан (вкладку закрывали посреди вращения)
            const res = Wheel.finish();
            if (res.ok) { this.refreshCoins(true); this._prize(this.t('wheel.win'), res.got, controls); }
        }
        this.page.tick = () => { if (!this._spinning) controls(); };
    },

    // =============================================================================================
    // Настройки
    // =============================================================================================

    openSettings() {
        const page = this._page('settings', 'full');
        const panel = ocmH('div', { class: 'o-panel o-set o-pop' });
        page.append(this._head(this.t('ui.settings')), ocmH('div', { class: 'o-body', style: 'align-items:center;justify-content:center;overflow-y:auto' }, panel));
        const toggle = (icon, label, get, set) => {
            const sw = ocmH('div', { class: 'o-switch' + (get() ? ' on' : ''), role: 'switch', 'aria-checked': String(!!get()), tabindex: '0' });
            sw.addEventListener('click', () => { const v = !get(); set(v); sw.classList.toggle('on', v); sw.setAttribute('aria-checked', String(v)); this.sfx('click'); });
            return ocmH('div', { class: 'o-row o-well' }, this.icon(icon), ocmH('div', { class: 'lbl', text: label }), sw);
        };
        panel.append(
            toggle('musicOn', this.t('ui.music'), () => this.musicOn(), (v) => this.setSetting('music', v ? 1 : 0)),
            toggle('soundOn', this.t('ui.sounds'), () => this.sfxOn(), (v) => this.setSetting('sfx', v ? 1 : 0)));
        // качество графики
        if (typeof Quality !== 'undefined') {
            const seg = ocmH('div', { class: 'o-seg' });
            const draw = () => {
                seg.textContent = '';
                for (const q of ['auto', 'low', 'medium', 'high']) {
                    seg.append(this.btn({ cls: 'xs ' + (Quality.choice === q ? 'c-orange' : 'c-dark'), text: this.t('ui.q.' + q), onTap: () => { Quality.set(q); this.setSetting('quality', q); draw(); } }));
                }
            };
            draw();
            panel.append(ocmH('div', { class: 'o-row o-well wrap' }, ocmH('div', { class: 'lbl', text: this.t('ui.quality') }), seg));
        }
        // язык (Telegram, test)
        if (typeof Platform !== 'undefined' && Platform.langSwitch) {
            const seg = ocmH('div', { class: 'o-seg' });
            for (const code of ['ru', 'en']) {
                seg.append(this.btn({ cls: 'xs ' + (Lang.code === code ? 'c-orange' : 'c-dark'), text: code === 'ru' ? 'Русский' : 'English', onTap: () => { Platform.setLanguage(code); } }));
            }
            panel.append(ocmH('div', { class: 'o-row o-well', style: 'flex-wrap:wrap' }, ocmH('div', { class: 'lbl', text: this.t('ui.language') }), seg));
        }
        panel.append(this.btn({ cls: 'c-blue', icon: 'question', text: this.t('ui.howto'), onTap: () => this._howToMenu() }),
            ocmH('div', { class: 'o-ver', text: (typeof GAME_TITLE !== 'undefined' ? GAME_TITLE : '') + ' v' + (typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '') }));
    },

    /** «Как играть» из меню: уровень 1 и обучение заново (в меню героя ещё нечему учить). */
    async _howToMenu() {
        this._closePage(true);
        await this._go(async () => {
            await Game.startLevel(1);
            if (typeof Tutorial !== 'undefined' && !Tutorial.active) Tutorial.start({ replay: true });
        });
    },

    // =============================================================================================
    // Победа и поражение
    // =============================================================================================

    /** Переход после итога: через Platform.ads.next (правило двух раундов), с защитой от двойного нажатия. */
    _finishGo(e, go) {
        const modal = this.modals.win || this.modals.lose;
        const btns = modal ? /** @type {NodeListOf<HTMLElement>} */ (modal.querySelectorAll('.o-btn')) : [];
        for (const b of btns) b.classList.add('is-busy');
        return this._go(() => Platform.ads.next(go)).then((ran) => { if (!ran) for (const b of btns) b.classList.remove('is-busy'); });
    },

    /** Строки итога «подпись — значение» (без переносов: подпись слева, число справа). */
    _lines(rows) {
        const box = ocmH('div', { class: 'o-lines o-well' });
        for (const [label, value] of rows) box.append(ocmH('span', { text: label }), ocmH('b', { text: value }));
        return box;
    },

    /** Ряд кнопок итога: одной высоты, колонки фиксированы (меню, ещё раз, далее — шире). */
    _endRow(menu, again, next) {
        return ocmH('div', { class: 'o-btnrow3' + (next ? '' : ' two') }, menu, again, next);
    },

    showWin(result) {
        Pause.set('manual', false);
        this._setHud(false);
        this._resetOverlays();
        this._x2Done = false;
        const lvl = result.level, n = lvl.n, N = GameData.LEVEL_COUNT;
        const stars = Math.max(1, Math.min(3, Math.round(result.stars) || 1));
        const starEls = [1, 2, 3].map(i => ocmH('div', { class: 'o-st' + (i === 2 ? ' mid' : '') },
            ocmH('img', { class: 'e', src: GAMEUI_ICON.starEmpty, alt: '' }), ocmH('img', { class: 'f', src: GAMEUI_ICON.star, alt: '' })));
        const num = ocmH('span', { text: '0' });
        const c = { el: num, v: 0, t: 0, keep: true };
        this._counters.push(c);
        const total = ocmH('div', { class: 'o-total o-well' }, this.icon('pile'), ocmH('div', { class: 'big' }, ocmH('span', { text: '+' }), num));
        const lines = this._lines([[this.t('ui.reward'), gameUiFmt(result.base)], [this.t('ui.collectedL'), gameUiFmt(result.runCoins)], [this.t('ui.mobs'), String(result.kills)]]);
        const acts = ocmH('div', { class: 'o-acts' });
        if (typeof Platform !== 'undefined' && Platform.rewardedSupported()) {
            const x2 = this.btn({
                cls: 'c-purple o-x2', kids: [this.icon('ad'), ocmH('span', {}, this.t('ui.x2'), ocmH('small', { text: this.t('ui.x2Sub', { n: gameUiFmt(result.coins) }) }))],
                onTap: async () => {
                    if (this._x2Done || x2.classList.contains('is-busy')) return;
                    x2.classList.add('is-busy');
                    let ok = false;
                    try { ok = typeof GameAds !== 'undefined' ? await GameAds.watch('win-x2') : await Platform.rewarded('win-x2'); } catch (err) { ok = false; }
                    if (ok && !this._x2Done) {
                        this._x2Done = true;
                        Game.addCoins(result.coins);
                        c.t = result.coins * 2;
                        this.sfx('coins');
                        x2.replaceChildren(this.icon('check'), ocmH('span', { text: this.t('ui.x2Done') }));
                        x2.classList.remove('c-purple', 'is-busy');
                        x2.classList.add('c-green');
                    } else if (!this._x2Done) {
                        x2.classList.remove('is-busy');
                        this.sfx('error');
                        this.toast(this.t('ui.adFailed'), 'err');
                    }
                },
            });
            acts.append(x2);
        }
        const menuB = this.btn({ cls: 'c-purple', icon: 'home', text: this.t('ui.menu'), onTap: (e) => this._finishGo(e, () => Game.toMenu()) });
        const again = this.btn({ cls: 'c-orange', icon: 'restart', text: this.t('ui.again'), onTap: (e) => this._finishGo(e, () => Game.startLevel(n)) });
        const next = n < N ? this.btn({ cls: 'c-blue o-next', kids: [ocmH('span', { text: this.t('ui.next') }), this.icon('next')], onTap: (e) => this._finishGo(e, () => Game.startLevel(n + 1)) }) : null;
        acts.append(this._endRow(menuB, again, next));
        const el = ocmH('div', { class: 'o-panel o-end win o-pop' }, ocmH('div', { class: 'o-blk o-ribbon', text: this.t('ui.levelDone') }),
            ocmH('div', { class: 'o-stars' }, starEls), total, lines, acts);
        this._modal('win', el, { sticky: true });
        // хореография: звёзды падают с отскоком, число монет катится до итога, потом трофей босса
        let t0 = 450;
        for (let i = 0; i < stars; i++) {
            this._later(t0, () => { starEls[i].classList.add('on'); if (typeof GameAudio !== 'undefined') GameAudio.star(i + 1); });
            t0 += 560;
        }
        this._later(t0 + 100, () => { c.t = result.coins; this.sfx('coins'); this._confetti(stars === 3 ? 60 : 34); });
        if (result.trophy) this._later(t0 + 1700, () => this._trophy(result.trophy));
    },

    /** Трофей босса: лучи, меч влетает с оборотом, имя, стихия. */
    _trophy(sw) {
        const col = (GameData.RARITY[sw.rarity] || {}).color || '#ffcf33';
        const el = this._element(sw);
        const equip = this.btn({ cls: 'c-blue', icon: 'sword', text: this.t('ui.equip'), onTap: async () => { await Game.equipSword(sw.id); this.toast(this.t('ui.equippedToast', { name: this.nm(sw.name) })); this._closeTrophy(); } });
        const panel = ocmH('div', { class: 'o-panel o-trophy o-pop', style: { '--rc': col, '--rc2': gameUiRgba(col, 0.5) } },
            ocmH('div', { class: 'o-blk o-ribbon gold', text: this.t('ui.newSword') }),
            ocmH('div', { class: 'o-tpic' }, this._pic(GameSword.ICONS[sw.id], '', this.nm(sw.name), col)),
            ocmH('div', { class: 'o-t3', style: { fontSize: 'calc(var(--u) * 24)', color: col }, text: this.nm(sw.name) }),
            ocmH('div', { class: 'o-d-chips', style: 'justify-content:center' },
                ocmH('span', { class: 'o-chip', style: { '--cc': gameUiShade(col, -0.25) }, text: this.nm(GameData.RARITY[sw.rarity].name) }),
                ocmH('span', { class: 'o-chip', style: { '--cc': gameUiShade(el.color, -0.55) } }, ocmH('i', { class: 'o-gem', style: { '--gc': el.color } }), this.nm(el.name))),
            ocmH('div', { class: 'o-help', text: this.nm(el.desc) }),
            ocmH('div', { class: 'o-btnrow' }, equip, this.btn({ cls: 'c-green', icon: 'check', text: this.t('ui.great'), onTap: () => this._closeTrophy() })));
        const img = /** @type {HTMLElement} */ (panel.querySelector('.o-tpic .ph'));
        if (img) img.style.cssText = 'position:absolute;inset:10%;display:flex;align-items:center;justify-content:center;font-size:calc(var(--u) * 60)';
        const wrap = this._modal('trophy', panel, { sticky: true });
        wrap.prepend(ocmH('div', { class: 'o-rays' }));
        this.sfx('unlock');
        this._confetti(50);
    },
    _closeTrophy() { this._closeModal('trophy'); },

    showLose(result) {
        Pause.set('manual', false);
        this._setHud(false);
        this._resetOverlays();
        const n = result.level.n;
        const acts = ocmH('div', { class: 'o-acts' });
        if (result.canRevive) {
            const rev = this.btn({
                cls: 'c-purple o-x2', kids: [this.icon('ad'), ocmH('span', {}, this.t('ui.revive'), ocmH('small', { text: this.t('ui.reviveSub') }))],
                onTap: async () => {
                    rev.classList.add('is-busy');
                    const ok = await Game.revive();
                    if (!ok) { rev.classList.remove('is-busy'); this.sfx('error'); this.toast(this.t('ui.adFailed'), 'err'); }
                },
            });
            acts.append(rev);
        }
        let tick = null;
        if (result.canSkip && typeof GameAds !== 'undefined') {
            const small = ocmH('small');
            const skip = this.btn({
                cls: 'c-teal o-x2', kids: [this.icon('ad'), ocmH('span', {}, this.t('ui.skip'), small)],
                onOff: () => this.toast(!GameAds.available() ? this.t('shop.adUnavailable') : this.t('ui.adWaitHint', { n: GameAds.wait('skip-level') }), 'err'),
                onTap: async () => {
                    skip.classList.add('is-busy');
                    const ok = await GameAds.skipLevel(n);
                    if (ok) { this._closeModal('lose'); this._go(() => Game.startLevel(n + 1)); return; }
                    skip.classList.remove('is-busy');
                    this.sfx('error');
                    this.toast(this.t('ui.adFailed'), 'err');
                    upd();
                },
            });
            const upd = () => {
                const w = GameAds.wait('skip-level'), ok = GameAds.available() && w <= 0;
                skip.classList.toggle('is-off', !ok);
                skip.classList.toggle('c-teal', ok);
                small.textContent = w > 0 && GameAds.available() ? this.t('ui.adWaitBtn', { n: w }) : this.t('ui.skipSub', { n: n + 1 });
            };
            upd();
            tick = upd;
            acts.append(skip);
        }
        const menuB = this.btn({ cls: 'c-purple', icon: 'home', text: this.t('ui.menu'), onTap: (e) => this._finishGo(e, () => Game.toMenu()) });
        const again = this.btn({ cls: 'c-orange', icon: 'restart', text: this.t('ui.again'), onTap: (e) => this._finishGo(e, () => Game.startLevel(n)) });
        acts.append(this._endRow(menuB, again, null));
        const rows = [[this.t('ui.mobs'), String(result.kills)]];
        if (result.coins > 0) rows.push([this.t('ui.savedL'), '+' + gameUiFmt(result.coins)]);
        const el = ocmH('div', { class: 'o-panel o-end lose o-pop' }, ocmH('div', { class: 'o-blk o-ribbon lose', text: this.t('ui.youLost') }),
            ocmH('div', { class: 'o-stars' }, ocmH('img', { class: 'o-skull', src: GAMEUI_ICON.skull, alt: '', draggable: 'false' })),
            this._lines(rows), acts);
        this._modal('lose', el, { sticky: true, tick });
    },
};
