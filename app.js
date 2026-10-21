const $ = s => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mln = n => n.toFixed(1).replace(".", ",").replace(",0", "") + " млн ₽";
const rub = n => Math.round(n).toLocaleString("ru-RU").replace(/\s/g, " ") + " ₽";
const perM = l => Math.round(l.price * 1000 / l.m2);
const colorOf = id => (AREAS.find(a => a.id === id) || CENTER).color;
const roomsTxt = l => l.rooms === 0 ? "Студия" : l.rooms + "-комн. квартира";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- состояние каталога ---------- */
const state = {area: null, rooms: null, budget: 80, sort: "price"};

/* ---------- схема метро ---------- */
const C = 260, R0 = 58, R1 = 170, RM = 190, RL = 224;
const pt = (ang, r) => [C + r * Math.sin(ang * Math.PI / 180), C - r * Math.cos(ang * Math.PI / 180)];
const metro = $("#metro");
const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || metro).append(e); return e; };

mk("circle", {cx: C, cy: C, r: RM, class: "mkad"});
const [mx, my] = pt(338, RM); const mt = mk("text", {x: mx, y: my + 4, "text-anchor": "middle", class: "mkad-t"});
mt.textContent = "МКАД";

AREAS.forEach((a, i) => {
  const [x0, y0] = pt(a.ang, R0), [x1, y1] = pt(a.ang, R1), [lx, ly] = pt(a.ang, RL);
  const g = mk("g", {class: "ln", tabindex: 0, role: "button", "aria-pressed": "false", "aria-label": a.id + ", " + a.name + " округ", "data-id": a.id, style: "--c:" + a.color + ";--d:" + (0.12 * i) + "s"});
  mk("line", {x1: x0, y1: y0, x2: x1, y2: y1, class: "ln__hit"}, g);
  mk("line", {x1: x0, y1: y0, x2: x1, y2: y1, class: "ln__l", stroke: a.color, pathLength: 1}, g);
  [102, 136].forEach(r => { const [sx, sy] = pt(a.ang, r); mk("circle", {cx: sx, cy: sy, r: 5.5, class: "st"}, g); });
  mk("circle", {cx: x1, cy: y1, r: 11, class: "end"}, g);
  const anchor = lx < C - 8 ? "end" : lx > C + 8 ? "start" : "middle";
  const t = mk("text", {x: lx + (anchor === "end" ? 8 : anchor === "start" ? -8 : 0), y: ly + 5, "text-anchor": anchor, class: "ln-t"}, g);
  t.textContent = a.id;
  const pick = () => selectArea(state.area === a.id ? null : a.id, true);
  g.addEventListener("click", pick);
  g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
});
const rg = mk("g", {class: "ring-g", tabindex: 0, role: "button", "aria-pressed": "false", "aria-label": "ЦАО, Центральный округ", "data-id": "ЦАО"});
mk("circle", {cx: C, cy: C, r: R0, class: "ring"}, rg);
mk("text", {x: C, y: C + 5, class: "ring-t"}, rg).textContent = "ЦАО";
rg.addEventListener("click", () => selectArea(state.area === "ЦАО" ? null : "ЦАО", true));
rg.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rg.dispatchEvent(new Event("click")); } });
const train = mk("circle", {cx: C, cy: C, r: 7, class: "train"});

function runTrain(a) {
  if (reduce || !a || a.id === "ЦАО") { train.style.opacity = 0; return; }
  const t0 = performance.now(), D = 900;
  const step = now => {
    const k = Math.min((now - t0) / D, 1), e = 1 - Math.pow(1 - k, 3);
    const [x, y] = pt(a.ang, R0 + (R1 - R0) * e);
    train.setAttribute("cx", x); train.setAttribute("cy", y);
    train.style.opacity = k < 1 ? 1 : 0;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function areaStats(id) {
  const list = id ? LISTINGS.filter(l => l.area === id) : LISTINGS;
  if (!list.length) return null;
  const avg = list.reduce((s, l) => s + perM(l), 0) / list.length;
  return {n: list.length, min: Math.min(...list.map(l => l.price)), avg: Math.round(avg)};
}
function renderArea() {
  const el = $("#area"), id = state.area;
  const a = id === "ЦАО" ? CENTER : AREAS.find(x => x.id === id);
  const s = areaStats(id);
  el.style.setProperty("--c", a ? a.color : "var(--ring)");
  const title = a ? `${a.id}, ${a.name} округ` : "Вся Москва";
  el.innerHTML = `<h3>${title}</h3>` + (s
    ? `<dl><div><dt>Квартир</dt><dd>${s.n}</dd></div><div><dt>Цены от</dt><dd>${mln(s.min)}</dd></div><div><dt>Средняя цена метра</dt><dd>${s.avg} тыс. ₽</dd></div></dl><a href="#kvartiry">Смотреть квартиры</a>`
    : `<p>Здесь пока нет квартир, но подбираю варианты под заказ. Напишите боту.</p>`) +
    (a ? "" : `<p class="note" style="margin-top:.5rem">Нажмите на линию или на кольцо, чтобы выбрать округ.</p>`);
}
function selectArea(id, run) {
  state.area = id;
  metro.classList.toggle("has-sel", !!id);
  metro.querySelectorAll("[data-id]").forEach(g => {
    const on = g.dataset.id === id;
    g.classList.toggle("on", on);
    g.setAttribute("aria-pressed", on);
  });
  if (run) runTrain(AREAS.find(x => x.id === id));
  renderArea(); renderGrid();
}

/* ---------- фасады-иллюстрации ---------- */
function rng(seed) { let a = seed * 2654435761 >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function facade(l) {
  const r = rng(l.id * 97 + 11), isNew = l.kind === "Новостройка";
  const skies = [["#B9D2E8", "#F4EADB", "#FFF3C7"], ["#F2C6A0", "#F8E6CB", "#FFFFFF"], ["#C8D3E6", "#E9E2EE", "#F6F1D8"]][l.id % 3];
  const body = isNew ? ["#3F566B", "#4C6377", "#566E85"][l.id % 3] : ["#A8573A", "#C48B52", "#CFC096"][l.id % 3];
  const trim = isNew ? "#2B3C4B" : ["#6E3524", "#8D6232", "#A99C74"][l.id % 3];
  const rows = Math.min(l.fls, 12), cols = isNew ? 5 : 4;
  const W = isNew ? 150 : 170, H = isNew ? 70 + Math.min(l.fls, 30) * 5.2 : 90 + Math.min(l.fls, 14) * 7;
  const x0 = 200 - W / 2, y0 = 226 - H, cw = W / cols, ch = H / rows;
  let s = `<svg viewBox="0 0 400 250" role="img" aria-label="Иллюстрация дома, красной рамкой отмечен этаж квартиры"><defs><linearGradient id="sk${l.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skies[0]}"/><stop offset="1" stop-color="${skies[1]}"/></linearGradient></defs>`;
  s += `<rect width="400" height="250" fill="url(#sk${l.id})"/><circle cx="${60 + r() * 280}" cy="${34 + r() * 22}" r="${15 + r() * 8}" fill="${skies[2]}" opacity=".9"/>`;
  [[10, 95], [300, 80], [92, 60]].forEach(([bx, bw], i) => {
    const bh = 60 + r() * 90; s += `<rect x="${bx + r() * 10}" y="${226 - bh}" width="${bw * .6}" height="${bh}" fill="${isNew ? "#9FB2C4" : "#CBB59A"}" opacity=".55"/>`;
  });
  s += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${body}"/>`;
  if (isNew) s += `<rect x="${x0 + 14}" y="${y0 - 14}" width="${W - 28}" height="14" fill="${trim}"/><rect x="${x0 + W / 2 - 2}" y="${y0 - 34}" width="4" height="20" fill="${trim}"/>`;
  else s += `<rect x="${x0 - 8}" y="${y0 - 10}" width="${W + 16}" height="12" fill="${trim}"/><polygon points="${x0 - 8},${y0 - 10} ${x0 + W + 8},${y0 - 10} ${x0 + W - 18},${y0 - 34} ${x0 + 18},${y0 - 34}" fill="${trim}" opacity=".85"/>`;
  const hr = rows - 1 - Math.round((l.fl - 1) / Math.max(l.fls - 1, 1) * (rows - 1)), hc = Math.floor(r() * cols);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const wx = x0 + j * cw + cw * .2, wy = y0 + i * ch + ch * .2, ww = cw * .6, wh = ch * .58;
    const lit = r() < .34;
    if (i === hr && j === hc) { s += `<rect x="${wx - 2}" y="${wy - 2}" width="${ww + 4}" height="${wh + 4}" fill="#FFD98A" stroke="#D6402F" stroke-width="3"/>`; continue; }
    s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${lit ? "#FFD98A" : isNew ? "#8FB1CC" : "#2F3A44"}" opacity="${lit ? 1 : isNew ? .75 : .8}"/>`;
    if (!isNew && i % 2 === 1 && r() < .5) s += `<rect x="${wx - 2}" y="${wy + wh}" width="${ww + 4}" height="3" fill="${trim}"/>`;
  }
  s += `<rect y="226" width="400" height="24" fill="#2B2F36"/><rect y="226" width="400" height="3" fill="#4B505A"/>`;
  [[48, 20], [118, 14], [290, 18], [352, 22]].forEach(([tx, tr]) => { s += `<rect x="${tx - 2}" y="${226 - tr * .5}" width="4" height="${tr * .5}" fill="#5A4631"/><circle cx="${tx}" cy="${226 - tr}" r="${tr}" fill="#4F8F57"/>`; });
  return s + `</svg>`;
}

/* ---------- каталог ---------- */
const roomsBox = $("#rooms");
[["Все", null], ["Студия", 0], ["1", 1], ["2", 2], ["3", 3], ["4 и больше", 4]].forEach(([t, v]) => {
  const b = document.createElement("button");
  b.className = "chip"; b.type = "button"; b.textContent = t; b.dataset.v = v === null ? "" : v;
  b.setAttribute("aria-pressed", v === state.rooms);
  b.onclick = () => { state.rooms = v; syncRooms(); renderGrid(); };
  roomsBox.append(b);
});
function syncRooms() { [...roomsBox.children].forEach(b => b.setAttribute("aria-pressed", (b.dataset.v === "" ? null : +b.dataset.v) === state.rooms)); }
$("#budget").oninput = e => { state.budget = +e.target.value; renderGrid(); };
$("#sort").onchange = e => { state.sort = e.target.value; renderGrid(); };

function filtered() {
  const f = LISTINGS.filter(l => (!state.area || l.area === state.area) && (state.rooms === null || (state.rooms === 4 ? l.rooms >= 4 : l.rooms === state.rooms)) && l.price <= state.budget);
  const by = {price: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, sqm: (a, b) => perM(a) - perM(b), area: (a, b) => b.m2 - a.m2};
  return f.sort(by[state.sort]);
}
function renderGrid() {
  $("#budgetOut").textContent = state.budget >= 80 ? "любой" : "до " + state.budget + " млн";
  const list = filtered();
  $("#grid").innerHTML = list.map((l, i) => `
    <li class="card" style="--c:${colorOf(l.area)};animation-delay:${Math.min(i, 8) * 35}ms">
      <div class="card__img">${facade(l)}${l.tag ? `<span class="badge">${l.tag}</span>` : ""}<span class="badge badge--k">${l.kind}</span></div>
      <div class="card__body">
        <div class="card__price"><b>${mln(l.price)}</b><span>${perM(l)} тыс. ₽/м²</span></div>
        <h3>${roomsTxt(l)}, ${l.m2} м²</h3>
        <p class="card__metro"><i class="mdot"></i>${l.metro}, ${l.walk} мин пешком</p>
        <p class="card__spec">${l.fl} этаж из ${l.fls} · округ ${l.area}</p>
        <p class="card__note">${l.note}</p>
        <button class="btn btn--sm" type="button" data-ask="${l.id}">Спросить бота</button>
      </div>
    </li>`).join("");
  $("#empty").hidden = list.length > 0;
  const now = $("#now");
  now.innerHTML = `<span class="cnt">Найдено: ${list.length} из ${LISTINGS.length}</span>` + (state.area ? `<span class="tagx">Округ ${state.area}<button type="button" aria-label="Сбросить округ" id="clrArea">×</button></span>` : "");
  const c = $("#clrArea"); if (c) c.onclick = () => selectArea(null, false);
}
$("#grid").addEventListener("click", e => { const b = e.target.closest("[data-ask]"); if (b) askAbout(+b.dataset.ask); });

/* ---------- новости ---------- */
let newsCat = "Все";
const cats = ["Все", ...new Set(NEWS.map(n => n.cat))];
const tabs = $("#newsTabs");
cats.forEach(c => {
  const b = document.createElement("button");
  b.className = "chip"; b.type = "button"; b.textContent = c; b.setAttribute("aria-pressed", c === newsCat);
  b.onclick = () => { newsCat = c; [...tabs.children].forEach(x => x.setAttribute("aria-pressed", x.textContent === c)); renderNews(); };
  tabs.append(b);
});
function renderNews() {
  const list = NEWS.filter(n => newsCat === "Все" || n.cat === newsCat);
  $("#newsBody").innerHTML = list.map((n, i) => `
    <article class="nw ${i === 0 ? "nw--big" : "nw--row"}" style="animation-delay:${i * 50}ms">
      <p class="nw__meta"><b>${n.cat}</b> · ${n.src} · ${n.date}</p>
      <h3>${n.title}</h3>
      <p>${n.text}</p>
      <p class="nw__for"><b>Для покупателя.</b> ${n.buyer}</p>
      <a href="${n.url}" target="_blank" rel="noopener noreferrer">Читать в источнике: ${n.src}</a>
    </article>`).join("");
}

/* ---------- чат ---------- */
const log = $("#log"), quick = $("#quick"), cin = $("#cin");
let flow = null, busy = false;
const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
function scrollLog() { log.scrollTop = log.scrollHeight; }
function me(text) { const d = document.createElement("div"); d.className = "msg msg--me"; d.textContent = text; log.append(d); scrollLog(); }
async function say(...parts) {
  busy = true; setQuick([]);
  for (const p of parts) {
    const t = document.createElement("div"); t.className = "msg msg--bot msg--typing"; t.innerHTML = "<i></i><i></i><i></i>"; log.append(t); scrollLog();
    await wait(450 + Math.min(String(p).length * 6, 700));
    t.className = "msg msg--bot"; t.innerHTML = p; scrollLog();
  }
  busy = false;
}
function setQuick(items) {
  quick.innerHTML = "";
  items.forEach(([label, fn]) => {
    const b = document.createElement("button"); b.className = "chip"; b.type = "button"; b.textContent = label;
    b.onclick = () => { if (busy) return; me(label); fn(label); };
    quick.append(b);
  });
}
const MENU = () => setQuick([
  ["Подобрать квартиру", () => startPick()], ["Посчитать ипотеку", () => startMortgage()], ["Записаться на просмотр", () => startVisit()],
  ["Как проходит сделка", () => answer("deal")], ["Сколько стоят услуги", () => answer("fees")], ["Позвать Романа", () => answer("human")]
]);
const ANSWERS = {
  deal: ["Сделка проходит в пять шагов:<p>1. Вы выбираете квартиру и вносите аванс или задаток.<br>2. Роман проверяет документы: выписку из ЕГРН, историю собственников, прописанных.<br>3. Подписываете договор купли-продажи.<br>4. Расчёты через банк, чаще всего через аккредитив или банковскую ячейку.<br>5. Договор регистрируют в Росреестре, обычно это несколько рабочих дней.</p>"],
  docs: ["От продавца понадобятся: паспорт, документ о праве собственности, свежая выписка из ЕГРН, справка о зарегистрированных, согласие супруга, если квартира нажита в браке. Если есть доли или дети-собственники, добавится разрешение опеки. Роман проверит всё до задатка."],
  fees: ["Услуги Романа в этом демо такие: для продавца 2% от цены сделки, но не меньше 150 тысяч рублей, оплата после регистрации. Для покупателя фиксированная плата от 100 тысяч рублей, называю после первого показа. Показы и консультация бесплатны."],
  tax: ["Налоги простыми словами. Когда покупаете, можно вернуть часть налога: с расходов на квартиру до 2 млн ₽ и с процентов по ипотеке до 3 млн ₽. Сумма зависит от ваших доходов и налога, который вы платили. Когда продаёте, налог обычно не платят, если квартира в собственности пять лет и больше, в некоторых случаях три года. Для точного расчёта лучше показать документы Роману."],
  human: ["Передаю разговор Роману. Он отвечает в будни с 10:00 до 20:00, в выходные до 18:00. Если хотите, оставьте номер, и он перезвонит сам.", "Или позвоните: +7 (495) 000-00-00. Номер вымышленный, это демо."],
  hello: ["Здравствуйте! Чем помочь?"],
  thanks: ["Пожалуйста! Если появятся вопросы, пишите."]
};
async function answer(key) { await say(...ANSWERS[key]); flow = null; MENU(); }

/* ---- подбор ---- */
const parseNum = t => { const m = String(t).replace(",", ".").match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
function askBudget() {
  flow.step = "budget";
  return say("Подберу варианты за три вопроса. Какой у вас бюджет?").then(() => setQuick([["до 15 млн", () => pickIn("15")], ["до 25 млн", () => pickIn("25")], ["до 35 млн", () => pickIn("35")], ["до 50 млн", () => pickIn("50")], ["Любой", () => pickIn("любой")]]));
}
function startPick(pre) {
  flow = {type: "pick", step: "budget", d: pre || {}};
  return nextPick();
}
function nextPick() {
  const d = flow.d;
  if (d.budget === undefined) return askBudget();
  if (d.rooms === undefined) {
    flow.step = "rooms";
    return say("Сколько комнат нужно?").then(() => setQuick([["Студия", () => pickIn("студия")], ["1", () => pickIn("1")], ["2", () => pickIn("2")], ["3", () => pickIn("3")], ["4 и больше", () => pickIn("4")], ["Не важно", () => pickIn("не важно")]]));
  }
  if (d.area === undefined) {
    flow.step = "area";
    return say("В каком округе смотреть?").then(() => setQuick([["Любой", () => pickIn("любой")], ["ЦАО", () => pickIn("ЦАО")], ...AREAS.map(a => [a.id, () => pickIn(a.id)])]));
  }
  return pickResult();
}
function pickIn(text) {
  const d = flow.d, t = text.trim().toLowerCase();
  if (flow.step === "budget") {
    if (/люб|без огр|не важно/.test(t)) d.budget = null;
    else { let n = parseNum(t); if (n === null) return say("Назовите бюджет числом, например «до 20 млн».").then(() => setQuick([["до 15 млн", () => pickIn("15")], ["до 25 млн", () => pickIn("25")], ["до 35 млн", () => pickIn("35")]])); if (n >= 1e6) n /= 1e6; d.budget = n; }
  } else if (flow.step === "rooms") {
    if (/студ/.test(t)) d.rooms = 0; else if (/не важно|люб/.test(t)) d.rooms = null; else { const n = parseNum(t); if (n === null || n > 9) return say("Выберите число комнат или «Не важно».").then(() => nextPick()); d.rooms = n >= 4 ? 4 : Math.round(n); }
  } else if (flow.step === "area") {
    const up = text.trim().toUpperCase();
    const hit = ["ЦАО", ...AREAS.map(a => a.id)].find(id => up.includes(id));
    if (hit) d.area = hit; else if (/центр/.test(t)) d.area = "ЦАО"; else if (/люб|не важно/.test(t)) d.area = null;
    else return say("Назовите округ, например «ЮЗАО», или выберите кнопку.").then(() => nextPick());
  }
  nextPick();
}
async function pickResult() {
  const d = flow.d;
  const fits = (l, rooms, area) => (d.budget === null || l.price <= d.budget) && (!rooms || d.rooms === null || (d.rooms === 4 ? l.rooms >= 4 : l.rooms === d.rooms)) && (!area || d.area === null || l.area === d.area);
  let list = LISTINGS.filter(l => fits(l, true, true)).sort((a, b) => a.price - b.price), near = false;
  const sum = [d.budget ? "до " + mln(d.budget) : "любой бюджет", d.rooms === null ? "любое число комнат" : d.rooms === 0 ? "студия" : d.rooms === 4 ? "4 комнаты и больше" : d.rooms + " комн.", d.area || "вся Москва"].join(", ");
  if (!list.length) {
    list = LISTINGS.filter(l => fits(l, false, true)).sort((a, b) => a.price - b.price);
    if (!list.length) list = LISTINGS.filter(l => fits(l, true, false)).sort((a, b) => a.price - b.price);
    near = list.length > 0;
  }
  if (!list.length) {
    await say(`По условиям «${sum}» сейчас ничего нет.`, "Попробуйте увеличить бюджет или выбрать другой округ. А Роман может поискать вариант под заказ, у него есть закрытые предложения.");
    flow = null; return setQuick([["Подобрать заново", () => startPick()], ["Позвать Романа", () => answer("human")], ["Меню", MENU]]);
  }
  const top = list.slice(0, 3);
  await say((near ? `Точных совпадений с условиями «${sum}» нет, но есть близкие варианты (${list.length}). Самые доступные:` : `Нашёл ${list.length} вариант${list.length === 1 ? "" : list.length < 5 ? "а" : "ов"} по условиям «${sum}». Лучшие по цене:`) + top.map(l => `<div class="mini" style="--c:${colorOf(l.area)}"><b>${mln(l.price)} · ${l.rooms === 0 ? "студия" : l.rooms + "-комн."}, ${l.m2} м²</b><small>${l.area}, ${l.metro}, ${l.walk} мин пешком</small><button type="button" data-visit="${l.id}">Записаться</button><button type="button" data-mort="${l.id}">Ипотека</button></div>`).join(""));
  const keep = {...d};
  flow = null;
  setQuick([["Показать в каталоге", () => { state.area = keep.area; state.rooms = keep.rooms; state.budget = keep.budget ? Math.min(80, Math.ceil(keep.budget)) : 80; $("#budget").value = state.budget; syncRooms(); selectArea(keep.area, false); say("Открыл подборку в каталоге выше, посмотрите.").then(() => { $("#kvartiry").scrollIntoView({behavior: "smooth"}); MENU(); }); }], ["Подобрать заново", () => startPick()], ["Меню", MENU]]);
}

/* ---- ипотека ---- */
function startMortgage(price) {
  flow = {type: "mort", step: "price", d: {price: price || null}};
  if (price) return nextMort();
  say("Посчитаю платёж. Какова стоимость квартиры?").then(() => setQuick([["15 млн", () => mortIn("15")], ["25 млн", () => mortIn("25")], ["35 млн", () => mortIn("35")]]));
}
function nextMort() {
  const d = flow.d;
  if (!d.price) { flow.step = "price"; return startMortgage(); }
  if (d.down === undefined) { flow.step = "down"; return say(`Квартира за ${mln(d.price)}. Какой первый взнос в процентах?`).then(() => setQuick([["15%", () => mortIn("15")], ["20%", () => mortIn("20")], ["30%", () => mortIn("30")], ["50%", () => mortIn("50")]])); }
  if (d.years === undefined) { flow.step = "years"; return say("На сколько лет берёте кредит?").then(() => setQuick([["10 лет", () => mortIn("10")], ["20 лет", () => mortIn("20")], ["30 лет", () => mortIn("30")]])); }
  return mortResult();
}
function mortIn(text) {
  const d = flow.d; let n = parseNum(text);
  const retry = msg => say(msg).then(() => nextMort());
  if (flow.step === "price") { if (n === null) return retry("Напишите стоимость числом, например «25 млн»."); if (n >= 1e6) n /= 1e6; if (n < 1 || n > 500) return retry("Сумма выглядит необычно. Напишите в миллионах, например 25."); d.price = n; }
  else if (flow.step === "down") { if (n === null || n < 10 || n > 90) return retry("Первый взнос обычно от 10% до 90%. Напишите число процентов."); d.down = n; }
  else if (flow.step === "years") { if (n === null || n < 1 || n > 30) return retry("Срок кредита от 1 до 30 лет. Напишите число лет."); d.years = Math.round(n); }
  nextMort();
}
const annuity = (loan, rate, years) => { const i = rate / 1200, n = years * 12; return loan * i / (1 - Math.pow(1 + i, -n)); };
async function mortResult() {
  const d = flow.d, loan = d.price * 1e6 * (1 - d.down / 100);
  const opt = (name, rate) => { const p = annuity(loan, rate, d.years); return `<div><small>${name}, ${String(rate).replace(".", ",")}%</small><b>${rub(p)} в месяц</b><small>переплата ${mln(p * d.years * 12 / 1e6 - loan / 1e6)}</small></div>`; };
  await say(`Кредит ${mln(loan / 1e6)} на ${d.years} лет, взнос ${rub(d.price * 1e6 * d.down / 100)}.<div class="pay">${opt("Рыночная ипотека", 18.7)}${opt("Семейная, один ребёнок (Москва)", 12)}</div>`,
    "Расчёт ориентировочный: точную ставку и лимит семейной программы назовёт банк. Ставки взяты из новостей выше.");
  flow = null; setQuick([["Другой срок или взнос", () => startMortgage(d.price)], ["Записаться на просмотр", () => startVisit()], ["Меню", MENU]]);
}

/* ---- запись на просмотр ---- */
function startVisit(l) {
  flow = {type: "visit", step: l ? "name" : "what", d: {what: l ? `${roomsTxt(l).toLowerCase()}, ${l.m2} м², ${l.metro}` : ""}};
  if (l) return say(`Запишу вас на просмотр: ${roomsTxt(l).toLowerCase()}, ${l.m2} м², ${l.metro}. Как к вам обращаться?`);
  say("Запишу на просмотр. Какая квартира или какой район вас интересует?");
}
function visitIn(text) {
  const d = flow.d, t = text.trim();
  if (flow.step === "what") { d.what = t; flow.step = "name"; return say("Как к вам обращаться?"); }
  if (flow.step === "name") { if (t.length < 2) return say("Напишите имя, чтобы Роман знал, как обратиться."); d.name = t; flow.step = "phone"; return say(`${esc(t)}, оставьте номер телефона. Роман перезвонит для подтверждения.`); }
  if (flow.step === "phone") {
    if (t.replace(/\D/g, "").length < 10) return say("Проверьте номер: нужно минимум 10 цифр.");
    d.phone = t; flow.step = "day";
    return say("Когда удобно?").then(() => setQuick([["Сегодня вечером", () => visitIn("сегодня вечером")], ["Завтра", () => visitIn("завтра")], ["В выходные", () => visitIn("в выходные")]]));
  }
  if (flow.step === "day") {
    d.day = t;
    say(`Готово, ${esc(d.name)}. Записал: <b>${esc(d.day)}</b>, ${esc(d.what)}.<p>Роман позвонит по номеру ${esc(d.phone)} в течение часа и подтвердит время.</p>`, "Это демо: заявка нигде не сохранена.").then(() => { flow = null; MENU(); });
  }
}

/* ---- свободный текст ---- */
function route(text) {
  const t = text.toLowerCase();
  if (flow) {
    if (/^(меню|отмена|стоп)$/.test(t.trim())) { flow = null; return say("Хорошо, вернулся в меню.").then(MENU); }
    if (flow.type === "pick") return pickIn(text);
    if (flow.type === "mort") return mortIn(text);
    if (flow.type === "visit") return visitIn(text);
  }
  if (/ипотек|кредит|платеж|платёж/.test(t)) return startMortgage();
  if (/просмотр|записат|приехат|показ/.test(t)) return startVisit();
  if (/документ|справк|егрн|выписк/.test(t)) return answer("docs");
  if (/налог|вычет/.test(t)) return answer("tax");
  if (/сделк|как проход|этап/.test(t)) return answer("deal");
  if (/стоим.*услуг|комисс|сколько.*(берёте|берете|стоит.*услуг)|оплат/.test(t)) return answer("fees");
  if (/роман|человек|оператор|менеджер|позвон|связаться/.test(t)) return answer("human");
  if (/спасиб|благодар/.test(t)) return answer("thanks");
  const ar = ["ЦАО", ...AREAS.map(a => a.id)].find(id => text.toUpperCase().includes(id));
  if (ar) { const s = areaStats(ar); if (s) return say(`${ar}: в продаже ${s.n} квартир, от ${mln(s.min)}, средняя цена метра около ${s.avg} тыс. ₽.`, "Показать подборку по этому округу?").then(() => setQuick([["Подобрать в " + ar, () => startPick({budget: null, rooms: undefined, area: ar})], ["Меню", MENU]])); }
  if (/подобр|ищу|хочу|нужн|купить|квартир|однушк|двушк|трёшк|трешк|студи/.test(t) || (/\d/.test(t) && /млн/.test(t))) {
    const d = {}; if (/млн/.test(t)) { const n = parseNum(t); if (n) d.budget = n; }
    if (/однушк/.test(t)) d.rooms = 1; if (/двушк/.test(t)) d.rooms = 2; if (/трёшк|трешк/.test(t)) d.rooms = 3; if (/студи/.test(t)) d.rooms = 0;
    return startPick(d);
  }
  if (/привет|здравств|добрый|добрый день|здорово/.test(t)) return answer("hello");
  say("Пока не уверен, что понял. Я умею подбирать квартиры, считать ипотеку, записывать на просмотр и отвечать про сделку, документы, налоги и стоимость услуг. Если нужен человек, позову Романа.").then(MENU);
}
$("#cform").addEventListener("submit", e => {
  e.preventDefault();
  const v = cin.value.trim(); if (!v || busy) return;
  cin.value = ""; me(v); route(v);
});
log.addEventListener("click", e => {
  const v = e.target.closest("[data-visit]"), m = e.target.closest("[data-mort]");
  if (busy) return;
  if (v) { const l = LISTINGS.find(x => x.id === +v.dataset.visit); me("Записаться: " + l.metro); startVisit(l); }
  if (m) { const l = LISTINGS.find(x => x.id === +m.dataset.mort); me("Ипотека на квартиру у метро " + l.metro); startMortgage(l.price); }
});

function openChat() { $("#chat").scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}); setTimeout(() => cin.focus({preventScroll: true}), reduce ? 0 : 600); }
async function askAbout(id) {
  const l = LISTINGS.find(x => x.id === id);
  openChat();
  if (busy) return;
  flow = null; me(`Расскажите про квартиру у метро ${l.metro}`);
  await say(`${roomsTxt(l)}, ${l.m2} м², ${l.fl} этаж из ${l.fls}. ${l.kind}, округ ${l.area}. ${l.metro}, ${l.walk} мин пешком. Цена ${mln(l.price)}, это ${perM(l)} тыс. ₽ за метр.<p>${l.note}.</p>`, "Что сделать дальше?");
  setQuick([["Записаться на просмотр", () => startVisit(l)], ["Ипотека на эту квартиру", () => startMortgage(l.price)], ["Другие варианты в " + l.area, () => startPick({budget: null, rooms: undefined, area: l.area})], ["Позвать Романа", () => answer("human")]]);
}
document.querySelectorAll("[data-open-chat]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openChat(); }));
new IntersectionObserver(([en]) => { $("#fab").hidden = en.isIntersecting; }, {threshold: .25}).observe($("#chat"));

/* ---------- старт ---------- */
selectArea(null, false);
renderNews();
say("Здравствуйте! Я помощник Романа Левина. Подберу квартиру, посчитаю ипотеку, запишу на просмотр или отвечу на вопрос про сделку.").then(MENU);
