// EchoVratsa v9 — Production and platform-ready build
// Features: GPS detection, multi-language UI, cinematic AI narration 2.0,
// route optimization, hero animation, mobile UX hooks, level system, smart recommendations.

let selectedPersona = PERSONAS[0].id;
let selectedTopics = new Set(["история", "легенда"]);
let selectedLanguage = localStorage.getItem("echovratsa_lang") || "bg";
let currentUtterance = null;
let routeMap = null;
let routeLayer = null;
let userLayer = null;
let watchId = null;
let userPosition = null;
let stopElements = new Map();
let activeRoute = [];

const state = {
  xp: Number(localStorage.getItem("echovratsa_xp") || 0),
  completed: new Set(JSON.parse(localStorage.getItem("echovratsa_completed") || "[]")),
  unlocked: new Set(JSON.parse(localStorage.getItem("echovratsa_unlocked") || "[]")),
  quizSolved: new Set(JSON.parse(localStorage.getItem("echovratsa_quiz") || "[]"))
};

const LEVELS = [
  { level: 1, title: "Explorer", xp: 0 },
  { level: 2, title: "Historian", xp: 250 },
  { level: 3, title: "Legend Hunter", xp: 650 },
  { level: 4, title: "Master of Vratsa", xp: 1200 }
];

const I18N = {
  bg: {
    gpsStart: "GPS старт", listen: "Слушай", stop: "Спри", complete: "Маркирай посетено", completed: "Посетено",
    map: "Покажи на картата", nearby: "Пристигна на локацията", gpsTitle: "GPS режим", gpsReady: "Live tracking активен. Локациите се отключват автоматично в радиус до 100 м.",
    gpsAsk: "Натисни “GPS старт”, за да активираш live tracking и automatic unlock.", generateEmpty: "Избери поне една тема, за да генерираме разказ.", noMatch: "Няма спирки с точно тази комбинация от теми — опитай с друга.",
    quiz: "Мини quiz", correct: "Правилно! +100 XP", wrong: "Почти — пробвай пак.", solved: "Вече е решено. +100 XP", routeSummary: "Оптимизиран маршрут", nextBest: "Най-добра следваща спирка", optimize: "Оптимизирай маршрут", startTour: "▶ Започни AI тура"
  },
  en: {
    gpsStart: "Start GPS", listen: "Listen", stop: "Stop", complete: "Mark visited", completed: "Visited",
    map: "Show on map", nearby: "You arrived at the location", gpsTitle: "GPS mode", gpsReady: "Live tracking is active. Stops unlock automatically within 100 m.",
    gpsAsk: "Tap “Start GPS” to enable live tracking and automatic unlock.", generateEmpty: "Choose at least one topic to generate a story.", noMatch: "No stops match this exact topic mix — try another one.",
    quiz: "Mini quiz", correct: "Correct! +100 XP", wrong: "Almost — try again.", solved: "Already solved. +100 XP", routeSummary: "Optimized route", nextBest: "Best next stop", optimize: "Optimize route", startTour: "▶ Start AI tour"
  },
  de: {
    gpsStart: "GPS starten", listen: "Anhören", stop: "Stopp", complete: "Als besucht markieren", completed: "Besucht",
    map: "Auf Karte zeigen", nearby: "Du bist am Ort angekommen", gpsTitle: "GPS-Modus", gpsReady: "Live-Tracking ist aktiv. Orte werden automatisch im Umkreis von 100 m freigeschaltet.",
    gpsAsk: "Tippe auf „GPS starten“, um Live-Tracking und Auto-Unlock zu aktivieren.", generateEmpty: "Wähle mindestens ein Thema, um eine Geschichte zu erstellen.", noMatch: "Keine Station passt genau zu dieser Themenwahl — versuche eine andere.",
    quiz: "Mini-Quiz", correct: "Richtig! +100 XP", wrong: "Fast — versuch es noch einmal.", solved: "Bereits gelöst. +100 XP", routeSummary: "Optimierte Route", nextBest: "Beste nächste Station", optimize: "Route optimieren", startTour: "▶ AI-Tour starten"
  }
};

const BADGES = [
  { id: "first-stop", icon: "🏔", label: "Explorer", rule: () => state.completed.size >= 1 },
  { id: "historian", icon: "📚", label: "Historian", rule: () => selectedTopics.has("история") && state.completed.size >= 2 },
  { id: "legend", icon: "✨", label: "Legend Hunter", rule: () => selectedTopics.has("легенда") && state.completed.size >= 2 },
  { id: "gps", icon: "📍", label: "GPS Unlock", rule: () => state.unlocked.size >= 1 },
  { id: "route", icon: "🏆", label: "Route Finisher", rule: () => state.completed.size >= Math.min(5, LOCATIONS.length) }
];

const QUIZZES = {
  okolchitsa: { q: { bg: "С кое историческо събитие е свързана Околчица?", en: "Which historical event is Okolchitsa linked to?", de: "Mit welchem historischen Ereignis ist Okolchitsa verbunden?" }, a: { bg: ["Последният бой на Ботевата чета", "Основаването на Враца", "Откриването на Рогозенското съкровище"], en: ["The last battle of Botev's detachment", "The founding of Vratsa", "The discovery of the Rogozen treasure"], de: ["Die letzte Schlacht der Botev-Truppe", "Die Gründung von Vratsa", "Die Entdeckung des Rogozen-Schatzes"] }, correct: 0 },
  ledenika: { q: { bg: "Колко е дълга пещера Леденика?", en: "How long is Ledenika Cave?", de: "Wie lang ist die Ledenika-Höhle?" }, a: { bg: ["120 метра", "320 метра", "830 метра"], en: ["120 meters", "320 meters", "830 meters"], de: ["120 Meter", "320 Meter", "830 Meter"] }, correct: 1 },
  vratsata: { q: { bg: "Какво е дало името на град Враца?", en: "What gave Vratsa its name?", de: "Was gab Vratsa seinen Namen?" }, a: { bg: ["Проходът Вратцата", "Река Дунав", "Рогозенското съкровище"], en: ["The Vratsata pass", "The Danube river", "The Rogozen treasure"], de: ["Der Vratsata-Pass", "Die Donau", "Der Rogozen-Schatz"] }, correct: 0 },
  skaklya: { q: { bg: "Колко метра е Врачанска Скакля?", en: "How high is Vrachanska Skaklya?", de: "Wie hoch ist Vrachanska Skaklya?" }, a: { bg: ["91 м", "141 м", "221 м"], en: ["91 m", "141 m", "221 m"], de: ["91 m", "141 m", "221 m"] }, correct: 1 },
  museum: { q: { bg: "С какво е известен Регионалният исторически музей във Враца?", en: "What is Vratsa Regional History Museum famous for?", de: "Wofür ist das Historische Regionalmuseum Vratsa bekannt?" }, a: { bg: ["Рогозенското съкровище", "Пещерни рисунки", "Средновековен кораб"], en: ["The Rogozen treasure", "Cave paintings", "A medieval ship"], de: ["Der Rogozen-Schatz", "Höhlenmalereien", "Ein mittelalterliches Schiff"] }, correct: 0 },
  kurtpashova: { q: { bg: "Какъв тип сграда е Куртпашовата кула?", en: "What type of building is Kurtpashova Tower?", de: "Welche Art Gebäude ist der Kurtpashova-Turm?" }, a: { bg: ["Отбранителна кула", "Римски амфитеатър", "ЖП гара"], en: ["A defensive tower", "A Roman amphitheater", "A railway station"], de: ["Ein Wehrturm", "Ein römisches Amphitheater", "Ein Bahnhof"] }, correct: 0 },
  vestitelyat: { q: { bg: "Колко стъпала водят до комплекса „Вестителят“?", en: "How many steps lead to the Vestitelyat complex?", de: "Wie viele Stufen führen zum Vestitelyat-Komplex?" }, a: { bg: ["163", "463", "763"], en: ["163", "463", "763"], de: ["163", "463", "763"] }, correct: 1 },
  sofroniy: { q: { bg: "На кого е кръстен възрожденският комплекс?", en: "Who is the Revival complex named after?", de: "Nach wem ist der Wiedergeburtskomplex benannt?" }, a: { bg: ["Софроний Врачански", "Христо Ботев", "Иван Вазов"], en: ["Sofroniy Vrachanski", "Hristo Botev", "Ivan Vazov"], de: ["Sofroniy Vrachanski", "Hristo Botev", "Ivan Vazov"] }, correct: 0 }
};

const HERO_LINES = {
  bg: ["Историята оживява", "Легендите говорят", "Враца те очаква"],
  en: ["History comes alive", "Legends start speaking", "Vratsa is waiting"],
  de: ["Geschichte wird lebendig", "Legenden sprechen", "Vratsa wartet auf dich"]
};

function init() {
  renderPersonaChips();
  renderTopicChips();
  renderProgress();
  initMap();
  applyLanguage();
  startHeroAnimation();
  document.getElementById("generate-btn").addEventListener("click", renderRoute);
  document.getElementById("scroll-cta").addEventListener("click", () => document.getElementById("build").scrollIntoView({ behavior: "smooth" }));
  document.getElementById("gps-start-btn")?.addEventListener("click", startGpsTracking);
  document.getElementById("optimize-btn")?.addEventListener("click", () => { activeRoute = optimizeRoute(getMatchingLocations()); renderRoute(activeRoute); });
  document.getElementById("language-select")?.addEventListener("change", e => { selectedLanguage = e.target.value; localStorage.setItem("echovratsa_lang", selectedLanguage); applyLanguage(); renderRoute(activeRoute.length ? activeRoute : getMatchingLocations()); });
}

function t(key) { return (I18N[selectedLanguage] && I18N[selectedLanguage][key]) || I18N.bg[key] || key; }
function localized(value) { return typeof value === "object" ? (value[selectedLanguage] || value.bg) : value; }

function applyLanguage() {
  const sel = document.getElementById("language-select");
  if (sel) sel.value = selectedLanguage;
  document.getElementById("gps-start-btn").textContent = t("gpsStart");
  document.getElementById("optimize-btn").textContent = t("optimize");
  document.getElementById("gps-status-title").textContent = t("gpsTitle");
  document.getElementById("gps-status-text").textContent = watchId ? t("gpsReady") : t("gpsAsk");
  renderProgress();
}

function startHeroAnimation() {
  const el = document.getElementById("hero-animated");
  if (!el) return;
  let i = 0;
  setInterval(() => {
    const lines = HERO_LINES[selectedLanguage] || HERO_LINES.bg;
    i = (i + 1) % lines.length;
    el.classList.remove("swap-in");
    void el.offsetWidth;
    el.textContent = lines[i];
    el.classList.add("swap-in");
  }, 2200);
}

function renderPersonaChips() {
  const wrap = document.getElementById("persona-chips");
  wrap.innerHTML = "";
  PERSONAS.forEach(p => {
    const chip = document.createElement("button");
    chip.className = "chip" + (p.id === selectedPersona ? " active" : "");
    chip.textContent = p.label;
    chip.setAttribute("aria-pressed", p.id === selectedPersona);
    chip.addEventListener("click", () => { selectedPersona = p.id; renderPersonaChips(); renderProgress(); updateSmartRecommendation(); });
    wrap.appendChild(chip);
  });
}

function renderTopicChips() {
  const wrap = document.getElementById("topic-chips");
  wrap.innerHTML = "";
  TOPICS.forEach(topic => {
    const chip = document.createElement("button");
    const active = selectedTopics.has(topic.id);
    chip.className = "chip" + (active ? " active" : "");
    chip.textContent = topic.label;
    chip.setAttribute("aria-pressed", active);
    chip.addEventListener("click", () => {
      if (selectedTopics.has(topic.id)) { if (selectedTopics.size > 1) selectedTopics.delete(topic.id); }
      else selectedTopics.add(topic.id);
      renderTopicChips(); renderProgress(); updateSmartRecommendation();
    });
    wrap.appendChild(chip);
  });
}

function getMatchingLocations() {
  return LOCATIONS.filter(loc => TOPICS.some(topic => selectedTopics.has(topic.id) && loc.facts[topic.id]));
}

function generateNarration(location) {
  const chosenTopics = TOPICS.map(topic => topic.id).filter(id => selectedTopics.has(id) && location.facts[id]);
  const facts = chosenTopics.map(id => location.facts[id]);
  const hook = cinematicHook(location);
  const middle = facts.map(f => humanizeFact(f)).join(" ");
  const closer = personaCloser(location);
  if (selectedLanguage === "en") return `${hook.en} ${middle} ${closer.en}`;
  if (selectedLanguage === "de") return `${hook.de} ${middle} ${closer.de}`;
  return `${hook.bg} ${middle} ${closer.bg}`;
}

function generateFullNarration(location) {
  const all = TOPICS.map(topic => location.facts[topic.id]).filter(Boolean).map(humanizeFact).join(" ");
  const hook = cinematicHook(location);
  const closer = personaCloser(location);
  const lang = selectedLanguage;
  return `${hook[lang] || hook.bg} ${all} ${(closer[lang] || closer.bg)}`;
}

function cinematicHook(location) {
  const bg = {
    okolchitsa: "Представи си май 1876 година. Вятърът над Околчица не просто духа — той сякаш пази последните думи на една чета.",
    ledenika: "Влизаш в тъмнината и въздухът изведнъж става по-студен. Леденика не започва като пещера — започва като тайна.",
    vratsata: "Пред теб скалите се разтварят като огромна каменна врата. Точно тук Враца получава едно от най-силните си имена.",
    skaklya: "Погледни нагоре. Когато Скакля е пълноводна, водата пада като бяла нишка от небето.",
    museum: "Тук историята не стои зад стъкло — тя тежи над 20 килограма сребро и злато.",
    kurtpashova: "В центъра на града има кула, която изглежда тиха, но е строена за времена, в които тишината е била опасна.",
    vestitelyat: "След 463 стъпала градът остава под теб, а звукът на една тръба още носи спомена за свободата.",
    sofroniy: "Тук Възраждането не е урок от учебник, а двор, книги и име, което оцелява през вековете."
  };
  return {
    bg: bg[location.id] || `Представи си, че ${location.name} оживява пред теб.`,
    en: `Imagine standing at ${location.name}. The place is not just a stop on the map — it is a scene with memory, atmosphere, and a story waiting for you.`,
    de: `Stell dir vor, du stehst bei ${location.name}. Dieser Ort ist nicht nur ein Punkt auf der Karte, sondern eine Szene voller Erinnerung und Atmosphäre.`
  };
}

function humanizeFact(fact) {
  if (selectedLanguage !== "bg") return fact;
  return fact.replace(/^На /, "Историята започва на ").replace(/^В /, "Ако се вгледаш внимателно, в ");
}

function personaCloser(location) {
  return {
    tourist: {
      bg: "Спри за момент, огледай се и остави мястото да ти разкаже останалото.",
      en: "Pause for a moment, look around, and let the place tell you the rest.",
      de: "Halte kurz inne, sieh dich um und lass den Ort den Rest erzählen."
    },
    student: {
      bg: "Запомни го не като сух факт, а като сцена, която можеш да преразкажеш.",
      en: "Remember it not as a dry fact, but as a scene you can retell.",
      de: "Merke es dir nicht als trockene Tatsache, sondern als Szene, die du erzählen kannst."
    },
    family: {
      bg: "Попитайте децата какво биха забелязали първо — така разходката става игра.",
      en: "Ask the kids what they notice first — that turns the walk into a game.",
      de: "Frag die Kinder, was sie zuerst bemerken — so wird der Spaziergang zum Spiel."
    }
  }[selectedPersona];
}

function renderRoute(locations = null) {
  const container = document.getElementById("route-list");
  const empty = document.getElementById("route-empty");
  container.innerHTML = "";
  stopElements.clear();
  let matches = locations || getMatchingLocations();
  if (!locations && userPosition) matches = optimizeRoute(matches);
  activeRoute = matches;

  if (selectedTopics.size === 0 || matches.length === 0) {
    empty.textContent = selectedTopics.size === 0 ? t("generateEmpty") : t("noMatch");
    empty.style.display = "block";
    updateMap([]); return;
  }
  empty.style.display = "none";
  updateMap(matches);
  renderRouteSummary(matches);

  matches.forEach((loc, i) => {
    const distance = userPosition ? `${Math.round(distanceMeters(userPosition.lat, userPosition.lng, ...parseCoords(loc.coords)))} m` : "GPS ready";
    const eta = i === 0 ? "Start" : etaBetween(matches[i - 1], loc);
    const stop = document.createElement("div");
    stop.className = "stop" + (state.unlocked.has(loc.id) ? " unlocked" : "");
    stop.dataset.locationId = loc.id;
    const narration = generateNarration(loc);
    const completed = state.completed.has(loc.id);
    stop.innerHTML = `
      <div class="stop-marker">${completed ? "✓" : i + 1}</div>
      <div class="stop-card">
        <div class="stop-top" role="button" tabindex="0" aria-expanded="false">
          <div><h3>${loc.name}</h3><div class="stop-sub">${loc.subtitle}</div></div>
          <div class="stop-meta">${loc.duration}</div>
        </div>
        <div class="stop-body">
          <img class="stop-photo" src="${loc.image}" alt="${loc.name}">
          <div class="stop-tags"><span>📍 ${distance}</span><span>⏱ ETA ${eta}</span><span>🎯 +50 XP</span><span>🧭 ${state.unlocked.has(loc.id) ? "Unlocked" : "GPS ready"}</span></div>
          <p class="stop-narration"></p>
          <div class="action-row">
            <button class="play-btn" type="button"><span class="wave"><span></span><span></span><span></span><span></span></span><span class="play-label">${t("listen")}</span></button>
            <button class="mini-btn complete-btn" type="button">${completed ? t("completed") : t("complete")}</button>
            <button class="mini-btn ghost locate-btn" type="button">${t("map")}</button>
          </div>
          <div class="quiz-card"></div>
        </div>
      </div>`;
    const top = stop.querySelector(".stop-top");
    const body = stop.querySelector(".stop-body");
    stop.querySelector(".stop-narration").textContent = narration;
    const open = () => { body.classList.add("open"); top.setAttribute("aria-expanded", "true"); };
    const toggle = () => { const isOpen = body.classList.toggle("open"); top.setAttribute("aria-expanded", String(isOpen)); };
    top.addEventListener("click", toggle);
    top.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    stop.querySelector(".play-btn").addEventListener("click", e => speak(generateFullNarration(loc), e.currentTarget));
    stop.querySelector(".complete-btn").addEventListener("click", () => completeStop(loc.id, stop));
    stop.querySelector(".locate-btn").addEventListener("click", () => focusLocation(loc));
    renderQuiz(loc, stop.querySelector(".quiz-card"));
    stopElements.set(loc.id, { element: stop, open });
    container.appendChild(stop);
  });
  updateSmartRecommendation();
  document.getElementById("route").scrollIntoView({ behavior: "smooth" });
}

function renderRouteSummary(route) {
  const el = document.getElementById("route-summary");
  if (!el || !route.length) return;
  const total = route.slice(1).reduce((sum, loc, i) => sum + distanceBetweenLocations(route[i], loc), 0);
  el.innerHTML = `<strong>${t("routeSummary")}</strong><span>${route.length} stops · ${(total / 1000).toFixed(1)} km route · ${Math.max(8, Math.round(total / 75))} min walking ETA</span>`;
}

function renderQuiz(location, mount) {
  const quiz = QUIZZES[location.id]; if (!quiz) return;
  const solved = state.quizSolved.has(location.id);
  mount.innerHTML = `<p class="quiz-title">${t("quiz")}</p><p>${localized(quiz.q)}</p><div class="quiz-options">${localized(quiz.a).map((answer, index) => `<button class="quiz-option" type="button" data-index="${index}" ${solved ? "disabled" : ""}>${answer}</button>`).join("")}</div><p class="quiz-feedback">${solved ? t("solved") : ""}</p>`;
  mount.querySelectorAll(".quiz-option").forEach(btn => btn.addEventListener("click", () => {
    const feedback = mount.querySelector(".quiz-feedback");
    if (Number(btn.dataset.index) === quiz.correct) { feedback.textContent = t("correct"); state.quizSolved.add(location.id); addXp(100); saveState(); mount.querySelectorAll(".quiz-option").forEach(b => b.disabled = true); }
    else feedback.textContent = t("wrong");
  }));
}

function completeStop(id, stop) {
  if (!state.completed.has(id)) { state.completed.add(id); addXp(50); saveState(); }
  stop.querySelector(".stop-marker").textContent = "✓";
  stop.querySelector(".complete-btn").textContent = t("completed");
  renderProgress(); updateSmartRecommendation();
}
function addXp(amount) { state.xp += amount; renderProgress(); }
function saveState() {
  localStorage.setItem("echovratsa_xp", String(state.xp));
  localStorage.setItem("echovratsa_completed", JSON.stringify([...state.completed]));
  localStorage.setItem("echovratsa_unlocked", JSON.stringify([...state.unlocked]));
  localStorage.setItem("echovratsa_quiz", JSON.stringify([...state.quizSolved]));
}

function currentLevel() {
  return [...LEVELS].reverse().find(l => state.xp >= l.xp) || LEVELS[0];
}
function renderProgress() {
  const xp = document.getElementById("xp-total"), row = document.getElementById("badge-row"), levelLabel = document.getElementById("level-label"), fill = document.getElementById("level-progress-fill");
  if (!xp || !row) return;
  const level = currentLevel(); const next = LEVELS.find(l => l.xp > state.xp) || LEVELS[LEVELS.length - 1];
  xp.textContent = `${state.xp} XP`;
  if (levelLabel) levelLabel.textContent = `Level ${level.level} · ${level.title}`;
  if (fill) fill.style.width = `${Math.min(100, Math.round(((state.xp - level.xp) / Math.max(1, next.xp - level.xp)) * 100))}%`;
  row.innerHTML = BADGES.map(b => `<span class="badge ${b.rule() ? "unlocked" : ""}" title="${b.label}">${b.icon} ${b.label}</span>`).join("");
}

function initMap() {
  const el = document.getElementById("map");
  if (!el || typeof L === "undefined") { el.innerHTML = "Картата се зарежда при интернет връзка."; return; }
  routeMap = L.map("map", { scrollWheelZoom: false }).setView([43.215, 23.54], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(routeMap);
  updateMap(LOCATIONS);
}
function updateMap(locations) {
  if (!routeMap || typeof L === "undefined") return;
  if (routeLayer) routeLayer.remove(); routeLayer = L.layerGroup().addTo(routeMap);
  const points = [];
  locations.forEach(loc => { const [lat, lng] = parseCoords(loc.coords); if (!lat || !lng) return; points.push([lat, lng]); const marker = L.marker([lat, lng]).addTo(routeLayer); marker.bindPopup(renderMapPopup(loc), { minWidth: 280, maxWidth: 340, className: "premium-popup" }); marker.on("click", () => openStop(loc.id)); });
  if (points.length > 1) routeMap.fitBounds(points, { padding: [42, 42] }); else if (points.length === 1) routeMap.setView(points[0], 14);
}
function renderMapPopup(location) {
  const topics = TOPICS.filter(topic => location.facts[topic.id]).map(topic => `<span>${topic.label}</span>`).join("");
  const dist = userPosition ? `<span>🧭 ${Math.round(distanceMeters(userPosition.lat, userPosition.lng, ...parseCoords(location.coords)))} m</span>` : "";
  return `<article class="map-popup map-popup-premium"><img class="map-popup-image" src="${location.image}" alt="${location.name}"><div class="map-popup-body"><strong>${location.name}</strong><span class="map-popup-subtitle">${location.subtitle}</span><div class="map-popup-meta"><span>⏱ ${location.duration}</span>${dist}</div><div class="map-popup-topics">${topics}</div><button class="map-popup-btn" type="button" onclick="openStop('${location.id}')">${t("startTour")}</button></div></article>`;
}
function focusLocation(location) { if (!routeMap) return; const [lat,lng]=parseCoords(location.coords); routeMap.setView([lat,lng],15,{animate:true}); L.popup({minWidth:280,maxWidth:340,className:"premium-popup"}).setLatLng([lat,lng]).setContent(renderMapPopup(location)).openOn(routeMap); }
function openStop(id) { const stop = stopElements.get(id); if (!stop) { renderRoute(); setTimeout(() => openStop(id), 100); return; } stop.open(); stop.element.scrollIntoView({ behavior: "smooth", block: "center" }); }
function parseCoords(coords) { return coords.split(",").map(n => Number(n.trim())); }

function startGpsTracking() {
  if (!("geolocation" in navigator)) { alert("GPS не се поддържа от този браузър."); return; }
  document.getElementById("gps-status-text").textContent = "GPS permission requested...";
  watchId = navigator.geolocation.watchPosition(onGpsUpdate, err => { document.getElementById("gps-status-text").textContent = `GPS error: ${err.message}`; }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
  applyLanguage();
}
function onGpsUpdate(pos) {
  userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  if (routeMap && typeof L !== "undefined") {
    if (userLayer) userLayer.remove(); userLayer = L.circleMarker([userPosition.lat, userPosition.lng], { radius: 8 }).addTo(routeMap).bindPopup("You are here");
  }
  LOCATIONS.forEach(loc => {
    const d = distanceMeters(userPosition.lat, userPosition.lng, ...parseCoords(loc.coords));
    if (d <= 100 && !state.unlocked.has(loc.id)) unlockLocation(loc);
  });
  activeRoute = optimizeRoute(activeRoute.length ? activeRoute : getMatchingLocations());
  renderRoute(activeRoute);
}
function unlockLocation(location) {
  state.unlocked.add(location.id); addXp(25); saveState();
  alert(`${t("nearby")}: ${location.name}`);
  openStop(location.id);
}
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R=6371000, toRad=x=>x*Math.PI/180; const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1); const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a));
}
function distanceBetweenLocations(a,b){ const [lat1,lng1]=parseCoords(a.coords), [lat2,lng2]=parseCoords(b.coords); return distanceMeters(lat1,lng1,lat2,lng2); }
function optimizeRoute(locations) {
  const remaining = locations.filter(l => !state.completed.has(l.id)); const done = locations.filter(l => state.completed.has(l.id));
  let origin = userPosition ? { lat: userPosition.lat, lng: userPosition.lng } : { lat: 43.2007, lng: 23.5474 };
  const ordered = [];
  while (remaining.length) {
    remaining.sort((a,b) => scoreStop(a, origin) - scoreStop(b, origin));
    const next = remaining.shift(); ordered.push(next); const [lat,lng]=parseCoords(next.coords); origin={lat,lng};
  }
  return [...ordered, ...done];
}
function scoreStop(loc, origin) {
  const [lat,lng]=parseCoords(loc.coords); const dist = distanceMeters(origin.lat, origin.lng, lat, lng);
  const interestBoost = TOPICS.filter(t => selectedTopics.has(t.id) && loc.facts[t.id]).length * -350;
  return dist + interestBoost;
}
function etaBetween(a,b){ const m=distanceBetweenLocations(a,b); return `${Math.max(2, Math.round(m/75))} min`; }
function updateSmartRecommendation() {
  const title=document.getElementById("smart-title"), text=document.getElementById("smart-text"); if(!title||!text) return;
  const next = optimizeRoute(getMatchingLocations()).find(l => !state.completed.has(l.id));
  if (!next) { title.textContent = "Маршрутът е завършен"; text.textContent = "Всички избрани спирки са маркирани като посетени."; return; }
  title.textContent = `${t("nextBest")}: ${next.name}`;
  const why = TOPICS.filter(t => selectedTopics.has(t.id) && next.facts[t.id]).map(t => t.label).join(", ");
  text.textContent = `${why || "Интерес"} · ${userPosition ? Math.round(distanceMeters(userPosition.lat, userPosition.lng, ...parseCoords(next.coords))) + " m от теб" : "подредено от центъра на Враца"}`;
}

let bgVoice = null;
function loadVoice() { const voices = speechSynthesis.getVoices(); if (!voices.length) return; const lang = selectedLanguage === "bg" ? "bg" : selectedLanguage === "de" ? "de" : "en"; bgVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang)) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith("bg")) || null; }
if ("speechSynthesis" in window) { loadVoice(); speechSynthesis.onvoiceschanged = loadVoice; }
function speak(text, btn) {
  if (!("speechSynthesis" in window)) { alert("Браузърът не поддържа синтез на реч. Опитайте с Chrome или Edge."); return; }
  if (currentUtterance && speechSynthesis.speaking) { speechSynthesis.cancel(); resetPlayButtons(); if (btn.dataset.wasPlaying === "true") return; }
  loadVoice(); const utter = new SpeechSynthesisUtterance(text); utter.lang = selectedLanguage === "bg" ? "bg-BG" : selectedLanguage === "de" ? "de-DE" : "en-US"; if (bgVoice) utter.voice = bgVoice; utter.rate = selectedPersona === "student" ? 0.94 : 0.98; currentUtterance = utter;
  const label = btn.querySelector(".play-label"); btn.classList.add("playing"); label.textContent = t("stop"); btn.dataset.wasPlaying = "true";
  utter.onend = () => { btn.classList.remove("playing"); label.textContent = t("listen"); btn.dataset.wasPlaying = "false"; }; utter.onerror = utter.onend; speechSynthesis.speak(utter);
}
function resetPlayButtons() { document.querySelectorAll(".play-btn").forEach(b => { b.classList.remove("playing"); b.querySelector(".play-label").textContent = t("listen"); b.dataset.wasPlaying = "false"; }); }



// ---------- v8 full-site translations + Product experience ----------
Object.assign(I18N.bg, {
  pageTitle:"ЕхоВраца — историята на Враца, разказана лично на теб", navAria:"Език и GPS", heroEyebrow:"AI аудио-гид · Враца", heroLede:"Историята, легендите и природата на Враца — разказани по различен начин на всеки, който тръгне по маршрута.", heroCta:"Изгради своя разходка ↓",
  whyEyebrow:"Защо ЕхоВраца", whyTitle:"Не поредното статично приложение за туристи", f1Title:"Съобразено с теб", f1Text:"Разказът се генерира спрямо твоя профил и интереси — история, легенди, природа или архитектура. Всяка разходка звучи различно.", f2Title:"Само за Враца", f2Text:"Хиперлокален фокус върху истории, легенди и места, които големите платформи никога не биха приоритизирали.", f3Title:"Никога едно и също", f3Text:"AI съставя нов разказ всеки път — вместо статичен текст, който всеки турист чете еднакво.",
  step1:"Стъпка 1", buildTitle:"За кого е разходката?", buildText:"AI разказва различно в зависимост от това кой слуша.", profile:"Профил", topics:"Теми, които те интересуват", generate:"Генерирай маршрута", progressLabel:"Прогрес", smartLabel:"Smart recommendation", smartEmptyTitle:"Генерирай маршрут", smartEmptyText:"Ще подредим спирките според твоите интереси и най-близката локация.",
  step2:"Стъпка 2", routeTitle:"Твоят маршрут из Враца", routeText:"Отвори всяка спирка, за да прочетеш или изслушаш разказа.", gpsUnsupported:"GPS не се поддържа от този браузър.", gpsPermission:"Заявка за GPS разрешение...", youAreHere:"Ти си тук", eta:"ETA", start:"Старт", unlocked:"Отключено", gpsReadyTag:"GPS готов", routeDone:"Маршрутът е завършен", routeDoneText:"Всички избрани спирки са маркирани като посетени.", orderedCenter:"подредено от центъра на Враца", fromYou:"m от теб", interest:"Интерес",
  phase3Eyebrow:"Product experience", phase3Title:"Готов туристически продукт за Враца", phase3Text:"Започната е продуктовата посока: персонален маршрут, записан аудио гид, дневно предизвикателство, streaks, achievements и analytics dashboard.", arTitle:"Live audio guide", arText:"Мобилен екран с име на локация, факт и CTA за записания аудио тур.", arButton:"Отвори live guide", challengeTitle:"Daily challenge", challengeText:"Посети 2 спирки и реши 1 quiz, за да запазиш streak.", dashboardTitle:"Admin analytics", dashboardText:"Продуктов dashboard за турове, популярни локации, средно време и любими теми.", dashboardButton:"Покажи dashboard", dashboardHide:"Скрий dashboard", metricTours:"Total tours started", metricPopular:"Popular location", metricSession:"Avg session time", metricTopics:"Favorite topics", arAudio:"Слушай историята", footer:"ЕхоВраца · AI туристически аудио гид · v9 Production"
});
Object.assign(I18N.en, {
  pageTitle:"EchoVratsa — Vratsa’s stories, narrated personally for you", navAria:"Language and GPS", heroEyebrow:"AI audio guide · Vratsa", heroLede:"The history, legends, and nature of Vratsa — told differently for every traveler who starts the route.", heroCta:"Build your walk ↓",
  whyEyebrow:"Why EchoVratsa", whyTitle:"Not another static tourist app", f1Title:"Personalized for you", f1Text:"The story adapts to your profile and interests — history, legends, nature, or architecture. Every walk sounds different.", f2Title:"Built only for Vratsa", f2Text:"A hyperlocal focus on stories, legends, and places that big travel platforms would never prioritize.", f3Title:"Never the same story", f3Text:"The AI creates a fresh narrative every time — instead of one static text everyone reads the same way.",
  step1:"Step 1", buildTitle:"Who is the walk for?", buildText:"The AI changes its tone depending on who is listening.", profile:"Profile", topics:"Topics you care about", generate:"Generate route", progressLabel:"Progress", smartLabel:"Smart recommendation", smartEmptyTitle:"Generate a route", smartEmptyText:"We will order stops by your interests and the nearest location.",
  step2:"Step 2", routeTitle:"Your route through Vratsa", routeText:"Open each stop to read or listen to the story.", gpsUnsupported:"GPS is not supported by this browser.", gpsPermission:"Requesting GPS permission...", youAreHere:"You are here", eta:"ETA", start:"Start", unlocked:"Unlocked", gpsReadyTag:"GPS ready", routeDone:"Route completed", routeDoneText:"All selected stops are marked as visited.", orderedCenter:"ordered from central Vratsa", fromYou:"m from you", interest:"Interest",
  phase3Eyebrow:"Product experience", phase3Title:"WOW features for an investor-ready product", phase3Text:"The product experience includes: personalized route, recorded audio guide, daily challenge, streaks, achievements, and an analytics dashboard.", arTitle:"Live audio guide", arText:"Mobile guide screen with the place name, a fact, and a CTA for the recorded audio tour.", arButton:"Open live guide", challengeTitle:"Daily challenge", challengeText:"Visit 2 stops and solve 1 quiz to keep your streak.", dashboardTitle:"Admin analytics", dashboardText:"Product dashboard for tours, popular places, average session time, and favorite topics.", dashboardButton:"Show dashboard", dashboardHide:"Hide dashboard", metricTours:"Total tours started", metricPopular:"Popular location", metricSession:"Avg session time", metricTopics:"Favorite topics", arAudio:"Listen to the story", footer:"EchoVratsa · AI tourist product · v9 Production"
});
Object.assign(I18N.de, {
  pageTitle:"EchoVratsa — Vratsa-Geschichten, persönlich für dich erzählt", navAria:"Sprache und GPS", heroEyebrow:"AI-Audioguide · Vratsa", heroLede:"Geschichte, Legenden und Natur von Vratsa — für jeden Reisenden anders erzählt.", heroCta:"Spaziergang erstellen ↓",
  whyEyebrow:"Warum EchoVratsa", whyTitle:"Nicht noch eine statische Touristen-App", f1Title:"Auf dich zugeschnitten", f1Text:"Die Erzählung passt sich deinem Profil und deinen Interessen an — Geschichte, Legenden, Natur oder Architektur. Jeder Spaziergang klingt anders.", f2Title:"Nur für Vratsa gebaut", f2Text:"Ein hyperlokaler Fokus auf Geschichten, Legenden und Orte, die große Plattformen nie priorisieren würden.", f3Title:"Nie dieselbe Geschichte", f3Text:"Die KI erstellt jedes Mal eine neue Erzählung — statt eines statischen Textes, den alle gleich lesen.",
  step1:"Schritt 1", buildTitle:"Für wen ist der Spaziergang?", buildText:"Die KI erzählt anders, je nachdem wer zuhört.", profile:"Profil", topics:"Themen, die dich interessieren", generate:"Route generieren", progressLabel:"Fortschritt", smartLabel:"Smart-Empfehlung", smartEmptyTitle:"Route generieren", smartEmptyText:"Wir ordnen die Stationen nach deinen Interessen und dem nächsten Ort.",
  step2:"Schritt 2", routeTitle:"Deine Route durch Vratsa", routeText:"Öffne jede Station, um die Geschichte zu lesen oder zu hören.", gpsUnsupported:"GPS wird von diesem Browser nicht unterstützt.", gpsPermission:"GPS-Berechtigung wird angefragt...", youAreHere:"Du bist hier", eta:"ETA", start:"Start", unlocked:"Freigeschaltet", gpsReadyTag:"GPS bereit", routeDone:"Route abgeschlossen", routeDoneText:"Alle ausgewählten Stationen sind als besucht markiert.", orderedCenter:"vom Zentrum von Vratsa sortiert", fromYou:"m von dir", interest:"Interesse",
  phase3Eyebrow:"Product experience", phase3Title:"Ein vollständiges Tourismusprodukt für Vratsa", phase3Text:"Die Produktentwicklung ist aktiv: personalisierte Route, aufgezeichneter Audioguide, Tageschallenge, Streaks, Achievements und Analytics-Dashboard.", arTitle:"Live-Audioguide", arText:"Mobiler Guide-Bildschirm mit Ortsname, Fakt und CTA für die aufgezeichnete Audiotour.", arButton:"Live-Guide öffnen", challengeTitle:"Tageschallenge", challengeText:"Besuche 2 Stationen und löse 1 Quiz, um deinen Streak zu behalten.", dashboardTitle:"Admin analytics", dashboardText:"Product-Dashboard für Touren, beliebte Orte, durchschnittliche Sitzungszeit und Lieblingsthemen.", dashboardButton:"Dashboard zeigen", dashboardHide:"Dashboard ausblenden", metricTours:"Total tours started", metricPopular:"Popular location", metricSession:"Avg session time", metricTopics:"Favorite topics", arAudio:"Geschichte anhören", footer:"EchoVratsa · KI-Audioguide · v9 Production"
});

const PERSONA_LABELS={tourist:{bg:"Турист",en:"Tourist",de:"Tourist"},student:{bg:"Ученик",en:"Student",de:"Schüler"},family:{bg:"Семейство",en:"Family",de:"Familie"}};
const TOPIC_LABELS={история:{bg:"История",en:"History",de:"Geschichte"},легенда:{bg:"Легенди",en:"Legends",de:"Legenden"},природа:{bg:"Природа",en:"Nature",de:"Natur"},архитектура:{bg:"Архитектура",en:"Architecture",de:"Architektur"}};
const LOCATION_I18N={
okolchitsa:{name:{en:"Okolchitsa",de:"Okoltschiza"},subtitle:{en:"Peak with the Zaveta monument",de:"Gipfel mit dem Denkmal „Zaveta“"},duration:{en:"20 min",de:"20 Min."},facts:{en:{история:"In May 1876, Hristo Botev’s detachment fought its final battle near Okolchitsa. Today the peak is one of Bulgaria’s 100 national tourist sites.",легенда:"Local stories say the wind never fully stops on the ridge, as if it still carries the memory of the revolutionaries.",природа:"The summit opens a wide panorama toward the Vratsa Balkan and the surrounding mountain landscape.",архитектура:"The Zaveta monument is shaped like an open book — a symbol of a message left for future generations."},de:{история:"Im Mai 1876 kämpfte die Truppe von Hristo Botev bei Okoltschiza ihre letzte Schlacht. Heute gehört der Gipfel zu Bulgariens 100 nationalen Touristenzielen.",легенда:"Lokale Erzählungen sagen, dass der Wind auf dem Kamm nie ganz verstummt, als trüge er die Erinnerung der Freiheitskämpfer weiter.",природа:"Vom Gipfel öffnet sich ein weites Panorama auf den Vratsa-Balkan und die Berglandschaft.",архитектура:"Das Denkmal „Zaveta“ ist wie ein geöffnetes Buch gestaltet — ein Symbol für eine Botschaft an kommende Generationen."}}},
ledenika:{name:{en:"Ledenika Cave",de:"Ledenika-Höhle"},subtitle:{en:"Karst cave with ice formations",de:"Karsthöhle mit Eisformationen"},duration:{en:"45 min",de:"45 Min."},facts:{en:{история:"Ledenika is one of Bulgaria’s 100 national tourist sites and is open to visitors throughout the year.",природа:"The cave is 320 meters long and has 10 halls. In winter, ice formations give the cave its name and atmosphere.",архитектура:"The Bat visitor center near the entrance adds a modern tourist layer with screenings and souvenirs."},de:{история:"Ledenika gehört zu den 100 nationalen Touristenzielen Bulgariens und ist ganzjährig zugänglich.",природа:"Die Höhle ist 320 Meter lang und besitzt 10 Säle. Im Winter geben Eisformationen ihr Namen und Atmosphäre.",архитектура:"Das Besucherzentrum „Die Fledermaus“ am Eingang ergänzt den Ort mit Projektionen und Souvenirs."}}},
vratsata:{name:{en:"Vratsata Pass",de:"Vratsata-Pass"},subtitle:{en:"The gorge that gave the city its name",de:"Die Schlucht, die der Stadt den Namen gab"},duration:{en:"20 min",de:"20 Min."},facts:{en:{история:"The pass preserves remains of the medieval Vratitsa fortress from the 10th–12th centuries. The city’s name is linked to this rocky gate.",легенда:"A legend says a wall and iron gate once protected the valley of the Leva River here.",природа:"The limestone walls rise over 400 meters, making the pass a favorite climbing area with hundreds of routes."},de:{история:"Im Pass sind Reste der mittelalterlichen Festung Vratitsa aus dem 10.–12. Jahrhundert erhalten. Der Name der Stadt ist mit diesem Felsentor verbunden.",легенда:"Eine Legende erzählt von einer Mauer und einem eisernen Tor, die einst das Tal der Leva schützten.",природа:"Die Kalksteinwände ragen über 400 Meter auf und machen den Pass zu einem beliebten Klettergebiet."}}},
skaklya:{name:{en:"Vrachanska Skaklya Waterfall",de:"Wasserfall Vrachanska Skaklya"},subtitle:{en:"The highest waterfall in Bulgaria",de:"Der höchste Wasserfall Bulgariens"},duration:{en:"30 min",de:"30 Min."},facts:{en:{природа:"The water drops from a 141-meter rock crown, making Skaklya Bulgaria’s highest waterfall. It is strongest in spring and after heavy rain."},de:{природа:"Das Wasser fällt von einem 141 Meter hohen Felskranz und macht Skaklya zum höchsten Wasserfall Bulgariens. Am stärksten ist er im Frühling und nach Regenfällen."}}},
museum:{name:{en:"Regional History Museum",de:"Historisches Regionalmuseum"},subtitle:{en:"Home of the Rogozen Treasure",de:"Heimat des Rogozen-Schatzes"},duration:{en:"30 min",de:"30 Min."},facts:{en:{история:"The museum houses the Rogozen Treasure — the largest Thracian treasure found in Bulgaria, with 165 silver and gilded vessels.",природа:"The museum courtyard connects the building with a small garden and a calmer urban space.",архитектура:"The building is among the few in Bulgaria designed specifically for a modern museum."},de:{история:"Das Museum beherbergt den Rogozen-Schatz — den größten in Bulgarien gefundenen thrakischen Schatz mit 165 silbernen und vergoldeten Gefäßen.",природа:"Der Museumshof verbindet das Gebäude mit einem kleinen Garten und einem ruhigen Stadtraum.",архитектура:"Das Gebäude gehört zu den wenigen in Bulgarien, die speziell als modernes Museum entworfen wurden."}}},
kurtpashova:{name:{en:"Kurtpashova Tower",de:"Kurtpashova-Turm"},subtitle:{en:"Revival-era defensive tower in the center",de:"Wehrturm aus der Wiedergeburtszeit im Zentrum"},duration:{en:"20 min",de:"20 Min."},facts:{en:{история:"The tower dates from the 17th century and served as a fortified residence for a local feudal family.",легенда:"According to local tradition, the family built the tower to protect itself in a tense and dangerous period.",архитектура:"It is an 11-meter square tower with several floors and defensive openings."},de:{история:"Der Turm stammt aus dem 17. Jahrhundert und diente als befestigter Wohnsitz einer lokalen Feudalfamilie.",легенда:"Nach lokaler Überlieferung wurde der Turm in einer angespannten Zeit zum Schutz der Familie errichtet.",архитектура:"Es ist ein 11 Meter hoher quadratischer Turm mit mehreren Etagen und Schießscharten."}}},
vestitelyat:{name:{en:"Vestitelyat Complex",de:"Vestitelyat-Komplex"},subtitle:{en:"Liberation monument above Vratsa",de:"Befreiungsdenkmal oberhalb von Vratsa"},duration:{en:"30 min",de:"30 Min."},facts:{en:{история:"The monument honors the Russian soldier who announced Vratsa’s liberation in 1877 with a trumpet signal.",легенда:"Every Sunday, a trumpet still sounds from the monument area in memory of that moment.",природа:"The complex stands near the Balkan foothills and offers a panoramic view over the city.",архитектура:"The route to the monument begins with 463 stone steps from the city center."},de:{история:"Das Denkmal ehrt den russischen Soldaten, der 1877 mit einem Trompetensignal die Befreiung Vratsa ankündigte.",легенда:"Jeden Sonntag erklingt am Denkmal noch immer eine Trompete zur Erinnerung an diesen Moment.",природа:"Der Komplex liegt am Fuß des Balkangebirges und bietet einen Panoramablick über die Stadt.",архитектура:"Der Weg zum Denkmal beginnt mit 463 Steinstufen vom Stadtzentrum."}}},
sofroniy:{name:{en:"Sofroniy Vrachanski Revival Complex",de:"Wiedergeburtskomplex Sofroniy Vrachanski"},subtitle:{en:"Spiritual and educational landmark",de:"Geistiges und pädagogisches Wahrzeichen"},duration:{en:"25 min",de:"25 Min."},facts:{en:{история:"The complex is named after Sofroniy Vrachanski, a major figure of the Bulgarian Revival and author of the first printed Bulgarian book.",легенда:"Stories about hidden books and secret copying connect the place with the preservation of Bulgarian culture.",природа:"The green courtyard creates a calm atmosphere in the heart of the city.",архитектура:"The buildings combine Revival-period wooden architecture with stone foundations typical of the region."},de:{история:"Der Komplex ist nach Sofroniy Vrachanski benannt, einer wichtigen Figur der bulgarischen Wiedergeburt und Autor des ersten gedruckten bulgarischen Buches.",легенда:"Geschichten über versteckte Bücher und geheimes Abschreiben verbinden den Ort mit der Bewahrung der bulgarischen Kultur.",природа:"Der grüne Hof schafft eine ruhige Atmosphäre im Herzen der Stadt.",архитектура:"Die Gebäude verbinden Holzarchitektur der Wiedergeburtszeit mit für die Region typischen Steinsockeln."}}}
};
function locName(loc){return (LOCATION_I18N[loc.id]?.name?.[selectedLanguage])||loc.name}
function locSubtitle(loc){return (LOCATION_I18N[loc.id]?.subtitle?.[selectedLanguage])||loc.subtitle}
function locDuration(loc){return (LOCATION_I18N[loc.id]?.duration?.[selectedLanguage])||loc.duration}
function locFact(loc,id){return (LOCATION_I18N[loc.id]?.facts?.[selectedLanguage]?.[id])||loc.facts[id]}
function topicLabel(id){return TOPIC_LABELS[id]?.[selectedLanguage]||TOPIC_LABELS[id]?.bg||id}
function personaLabel(id, fallback){return PERSONA_LABELS[id]?.[selectedLanguage]||fallback||id}

function translateStatic(){
  document.documentElement.lang=selectedLanguage; document.title=t('pageTitle');
  const map={'.navbar-name':'Echo<span class="accent">Vratsa</span>','.hero .eyebrow':t('heroEyebrow'),'.hero .lede':t('heroLede'),'#scroll-cta':t('heroCta'),'#why .section-head .eyebrow':t('whyEyebrow'),'#why .section-head h2':t('whyTitle'),'#build .section-head .eyebrow':t('step1'),'#build .section-head h2':t('buildTitle'),'#build .section-head p:not(.eyebrow)':t('buildText'),'#generate-btn':t('generate'),'#route .section-head .eyebrow':t('step2'),'#route .section-head h2':t('routeTitle'),'#route .section-head p:not(.eyebrow)':t('routeText'),'footer':t('footer')};
  Object.entries(map).forEach(([sel,val])=>{const el=document.querySelector(sel); if(el) el.innerHTML=val;});
  document.querySelectorAll('#why .feature-card').forEach((card,i)=>{const titles=['f1Title','f2Title','f3Title'], texts=['f1Text','f2Text','f3Text']; card.querySelector('h3').textContent=t(titles[i]); card.querySelector('p:not(.feature-num)').textContent=t(texts[i]);});
  document.querySelectorAll('#build .picker-block .label')[0].textContent=t('profile'); document.querySelectorAll('#build .picker-block .label')[1].textContent=t('topics');
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
  document.querySelector('.nav-actions')?.setAttribute('aria-label', t('navAria'));
  document.getElementById('daily-challenge-text').textContent=t('challengeText');
}

function applyLanguage() {
  const sel = document.getElementById("language-select"); if (sel) sel.value = selectedLanguage;
  translateStatic(); renderPersonaChips(); renderTopicChips();
  document.getElementById("gps-start-btn").textContent = t("gpsStart");
  document.getElementById("optimize-btn").textContent = t("optimize");
  document.getElementById("gps-status-title").textContent = t("gpsTitle");
  document.getElementById("gps-status-text").textContent = watchId ? t("gpsReady") : t("gpsAsk");
  renderProgress(); updateSmartRecommendation(); updateAnalytics(); updateArContent();
}
function renderPersonaChips() { const wrap=document.getElementById('persona-chips'); if(!wrap) return; wrap.innerHTML=''; PERSONAS.forEach(p=>{const chip=document.createElement('button'); chip.className='chip'+(p.id===selectedPersona?' active':''); chip.textContent=personaLabel(p.id,p.label); chip.setAttribute('aria-pressed',p.id===selectedPersona); chip.addEventListener('click',()=>{selectedPersona=p.id; renderPersonaChips(); renderProgress(); updateSmartRecommendation();}); wrap.appendChild(chip);});}
function renderTopicChips(){const wrap=document.getElementById('topic-chips'); if(!wrap) return; wrap.innerHTML=''; TOPICS.forEach(topic=>{const chip=document.createElement('button'); const active=selectedTopics.has(topic.id); chip.className='chip'+(active?' active':''); chip.textContent=topicLabel(topic.id); chip.setAttribute('aria-pressed',active); chip.addEventListener('click',()=>{if(selectedTopics.has(topic.id)){if(selectedTopics.size>1) selectedTopics.delete(topic.id)} else selectedTopics.add(topic.id); renderTopicChips(); renderProgress(); updateSmartRecommendation();}); wrap.appendChild(chip);});}
function generateNarration(location){const chosen=TOPICS.map(topic=>topic.id).filter(id=>selectedTopics.has(id)&&locFact(location,id)); const facts=chosen.map(id=>humanizeFact(locFact(location,id))).join(' '); const hook=cinematicHook(location); const closer=personaCloser(location); const lang=selectedLanguage; return `${hook[lang]||hook.bg} ${facts} ${closer[lang]||closer.bg}`;}
function generateFullNarration(location){const all=TOPICS.map(topic=>topic.id).filter(id=>locFact(location,id)).map(id=>humanizeFact(locFact(location,id))).join(' '); const hook=cinematicHook(location); const closer=personaCloser(location); const lang=selectedLanguage; return `${hook[lang]||hook.bg} ${all} ${closer[lang]||closer.bg}`;}
function cinematicHook(location){const name=locName(location); const bg={okolchitsa:"Представи си май 1876 година. Вятърът над Околчица не просто духа — той сякаш пази последните думи на една чета.",ledenika:"Влизаш в тъмнината и въздухът изведнъж става по-студен. Леденика не започва като пещера — започва като тайна.",vratsata:"Пред теб скалите се разтварят като огромна каменна врата. Точно тук Враца получава едно от най-силните си имена.",skaklya:"Погледни нагоре. Когато Скакля е пълноводна, водата пада като бяла нишка от небето.",museum:"Тук историята не стои зад стъкло — тя тежи над 20 килограма сребро и злато.",kurtpashova:"В центъра на града има кула, която изглежда тиха, но е строена за времена, в които тишината е била опасна.",vestitelyat:"След 463 стъпала градът остава под теб, а звукът на една тръба още носи спомена за свободата.",sofroniy:"Тук Възраждането не е урок от учебник, а двор, книги и име, което оцелява през вековете."}; return {bg:bg[location.id]||`Представи си, че ${name} оживява пред теб.`,en:`Imagine standing at ${name}. This is not just a stop on a map — it is a living scene with memory, atmosphere, and a story waiting for you.`,de:`Stell dir vor, du stehst bei ${name}. Das ist nicht nur ein Punkt auf der Karte — es ist eine lebendige Szene mit Erinnerung, Atmosphäre und Geschichte.`};}
function renderRoute(locations=null){const container=document.getElementById('route-list'), empty=document.getElementById('route-empty'); container.innerHTML=''; stopElements.clear(); let matches=locations||getMatchingLocations(); if(!locations&&userPosition) matches=optimizeRoute(matches); activeRoute=matches; if(selectedTopics.size===0||matches.length===0){empty.textContent=selectedTopics.size===0?t('generateEmpty'):t('noMatch'); empty.style.display='block'; updateMap([]); return;} empty.style.display='none'; updateMap(matches); renderRouteSummary(matches); incrementToursStarted(); matches.forEach((loc,i)=>{const distance=userPosition?`${Math.round(distanceMeters(userPosition.lat,userPosition.lng,...parseCoords(loc.coords)))} m`:t('gpsReadyTag'); const eta=i===0?t('start'):etaBetween(matches[i-1],loc); const stop=document.createElement('div'); stop.className='stop'+(state.unlocked.has(loc.id)?' unlocked':''); stop.dataset.locationId=loc.id; const completed=state.completed.has(loc.id); stop.innerHTML=`<div class="stop-marker">${completed?'✓':i+1}</div><div class="stop-card"><div class="stop-top" role="button" tabindex="0" aria-expanded="false"><div><h3>${locName(loc)}</h3><div class="stop-sub">${locSubtitle(loc)}</div></div><div class="stop-meta">${locDuration(loc)}</div></div><div class="stop-body"><img class="stop-photo" src="${loc.image}" alt="${locName(loc)}"><div class="stop-tags"><span>📍 ${distance}</span><span>⏱ ${t('eta')} ${eta}</span><span>🎯 +50 XP</span><span>🧭 ${state.unlocked.has(loc.id)?t('unlocked'):t('gpsReadyTag')}</span></div><p class="stop-narration"></p><div class="action-row"><button class="play-btn" type="button"><span class="wave"><span></span><span></span><span></span><span></span></span><span class="play-label">${t('listen')}</span></button><button class="mini-btn complete-btn" type="button">${completed?t('completed'):t('complete')}</button><button class="mini-btn ghost locate-btn" type="button">${t('map')}</button></div><div class="quiz-card"></div></div></div>`; const top=stop.querySelector('.stop-top'), body=stop.querySelector('.stop-body'); stop.querySelector('.stop-narration').textContent=generateNarration(loc); const open=()=>{body.classList.add('open');top.setAttribute('aria-expanded','true')}; const toggle=()=>{const isOpen=body.classList.toggle('open');top.setAttribute('aria-expanded',String(isOpen))}; top.addEventListener('click',toggle); top.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}}); stop.querySelector('.play-btn').addEventListener('click',e=>speak(generateFullNarration(loc),e.currentTarget)); stop.querySelector('.complete-btn').addEventListener('click',()=>completeStop(loc.id,stop)); stop.querySelector('.locate-btn').addEventListener('click',()=>focusLocation(loc)); renderQuiz(loc,stop.querySelector('.quiz-card')); stopElements.set(loc.id,{element:stop,open}); container.appendChild(stop);}); updateSmartRecommendation(); updateAnalytics(); document.getElementById('route').scrollIntoView({behavior:'smooth'});}
function renderRouteSummary(route){const el=document.getElementById('route-summary'); if(!el||!route.length)return; const total=route.slice(1).reduce((sum,loc,i)=>sum+distanceBetweenLocations(route[i],loc),0); el.innerHTML=`<strong>${t('routeSummary')}</strong><span>${route.length} stops · ${(total/1000).toFixed(1)} km route · ${Math.max(8,Math.round(total/75))} min walking ${t('eta')}</span>`;}
function renderMapPopup(location){const topics=TOPICS.filter(topic=>location.facts[topic.id]).map(topic=>`<span>${topicLabel(topic.id)}</span>`).join(''); const dist=userPosition?`<span>🧭 ${Math.round(distanceMeters(userPosition.lat,userPosition.lng,...parseCoords(location.coords)))} m</span>`:''; return `<article class="map-popup map-popup-premium"><img class="map-popup-image" src="${location.image}" alt="${locName(location)}"><div class="map-popup-body"><strong>${locName(location)}</strong><span class="map-popup-subtitle">${locSubtitle(location)}</span><div class="map-popup-meta"><span>⏱ ${locDuration(location)}</span>${dist}</div><div class="map-popup-topics">${topics}</div><button class="map-popup-btn" type="button" onclick="openStop('${location.id}')">${t('startTour')}</button></div></article>`;}
function focusLocation(location){if(!routeMap)return; const [lat,lng]=parseCoords(location.coords); routeMap.setView([lat,lng],15,{animate:true}); L.popup({minWidth:280,maxWidth:340,className:'premium-popup'}).setLatLng([lat,lng]).setContent(renderMapPopup(location)).openOn(routeMap);}
function startGpsTracking(){if(!('geolocation' in navigator)){alert(t('gpsUnsupported'));return;} document.getElementById('gps-status-text').textContent=t('gpsPermission'); watchId=navigator.geolocation.watchPosition(onGpsUpdate,err=>{document.getElementById('gps-status-text').textContent=`GPS error: ${err.message}`;},{enableHighAccuracy:true,maximumAge:5000,timeout:12000}); applyLanguage();}
function onGpsUpdate(pos){userPosition={lat:pos.coords.latitude,lng:pos.coords.longitude}; if(routeMap&&typeof L!=='undefined'){if(userLayer)userLayer.remove(); userLayer=L.circleMarker([userPosition.lat,userPosition.lng],{radius:8}).addTo(routeMap).bindPopup(t('youAreHere'));} LOCATIONS.forEach(loc=>{const d=distanceMeters(userPosition.lat,userPosition.lng,...parseCoords(loc.coords)); if(d<=100&&!state.unlocked.has(loc.id)) unlockLocation(loc);}); activeRoute=optimizeRoute(activeRoute.length?activeRoute:getMatchingLocations()); renderRoute(activeRoute);}
function unlockLocation(location){state.unlocked.add(location.id); addXp(25); saveState(); alert(`${t('nearby')}: ${locName(location)}`); openStop(location.id);}
function updateSmartRecommendation(){const title=document.getElementById('smart-title'), text=document.getElementById('smart-text'); if(!title||!text)return; const label=title.closest('.smart-panel')?.querySelector('.label'); if(label) label.textContent=t('smartLabel'); const next=optimizeRoute(getMatchingLocations()).find(l=>!state.completed.has(l.id)); if(!next){title.textContent=t('routeDone'); text.textContent=t('routeDoneText'); return;} title.textContent=`${t('nextBest')}: ${locName(next)}`; const why=TOPICS.filter(topic=>selectedTopics.has(topic.id)&&next.facts[topic.id]).map(topic=>topicLabel(topic.id)).join(', '); text.textContent=`${why||t('interest')} · ${userPosition?Math.round(distanceMeters(userPosition.lat,userPosition.lng,...parseCoords(next.coords)))+' '+t('fromYou'):t('orderedCenter')}`;}
function updateArContent(){const loc=(activeRoute&&activeRoute[0])||LOCATIONS[0]; const name=document.getElementById('ar-place-name'), fact=document.getElementById('ar-place-fact'); if(name) name.textContent=locName(loc); if(fact) fact.textContent=locFact(loc, selectedTopics.values().next().value || 'история') || locSubtitle(loc);}
function incrementToursStarted(){const key='echovratsa_tours_started'; if(!window.__tourCounted){localStorage.setItem(key,String(Number(localStorage.getItem(key)||0)+1)); window.__tourCounted=true;}}
function updateAnalytics(){const tours=document.getElementById('metric-tours'), popular=document.getElementById('metric-popular'), topics=document.getElementById('metric-topics'); if(tours)tours.textContent=localStorage.getItem('echovratsa_tours_started')||'0'; if(popular)popular.textContent=activeRoute[0]?locName(activeRoute[0]):locName(LOCATIONS[0]); if(topics)topics.textContent=[...selectedTopics].map(topicLabel).join(', '); const btn=document.getElementById('analytics-toggle-btn'); const panel=document.getElementById('analytics-panel'); if(btn&&panel) btn.textContent=panel.hidden?t('dashboardButton'):t('dashboardHide');}
function initPhase3(){document.getElementById('ar-mode-btn')?.addEventListener('click',()=>{updateArContent(); document.getElementById('ar-modal').hidden=false;}); document.getElementById('ar-close-btn')?.addEventListener('click',()=>document.getElementById('ar-modal').hidden=true); document.getElementById('ar-audio-btn')?.addEventListener('click',()=>speak(generateFullNarration((activeRoute&&activeRoute[0])||LOCATIONS[0]), document.querySelector('.play-btn')||document.getElementById('ar-audio-btn'))); document.getElementById('analytics-toggle-btn')?.addEventListener('click',()=>{const panel=document.getElementById('analytics-panel'); panel.hidden=!panel.hidden; updateAnalytics();});}
function init(){renderPersonaChips();renderTopicChips();renderProgress();initMap();applyLanguage();startHeroAnimation();initPhase3();document.getElementById('generate-btn').addEventListener('click',()=>renderRoute());document.getElementById('scroll-cta').addEventListener('click',()=>document.getElementById('build').scrollIntoView({behavior:'smooth'}));document.getElementById('gps-start-btn')?.addEventListener('click',startGpsTracking);document.getElementById('optimize-btn')?.addEventListener('click',()=>{activeRoute=optimizeRoute(getMatchingLocations());renderRoute(activeRoute);});document.getElementById('language-select')?.addEventListener('change',e=>{selectedLanguage=e.target.value;localStorage.setItem('echovratsa_lang',selectedLanguage);applyLanguage();renderRoute(activeRoute.length?activeRoute:getMatchingLocations());});}


function speak(text, btn) {
  if (!("speechSynthesis" in window)) { alert(selectedLanguage === 'bg' ? "Браузърът не поддържа синтез на реч. Опитайте с Chrome или Edge." : selectedLanguage === 'de' ? "Dieser Browser unterstützt keine Sprachsynthese. Bitte Chrome oder Edge verwenden." : "This browser does not support speech synthesis. Try Chrome or Edge."); return; }
  if (currentUtterance && speechSynthesis.speaking) { speechSynthesis.cancel(); resetPlayButtons(); if (btn && btn.dataset && btn.dataset.wasPlaying === "true") return; }
  loadVoice(); const utter = new SpeechSynthesisUtterance(text); utter.lang = selectedLanguage === "bg" ? "bg-BG" : selectedLanguage === "de" ? "de-DE" : "en-US"; if (bgVoice) utter.voice = bgVoice; utter.rate = selectedPersona === "student" ? 0.94 : 0.98; currentUtterance = utter;
  const label = btn ? btn.querySelector?.(".play-label") : null; if (btn) { btn.classList.add("playing"); btn.dataset.wasPlaying = "true"; } if (label) label.textContent = t("stop");
  utter.onend = () => { if (btn) { btn.classList.remove("playing"); btn.dataset.wasPlaying = "false"; } if (label) label.textContent = t("listen"); }; utter.onerror = utter.onend; speechSynthesis.speak(utter);
}



// ---------- v9 production copy, smarter route engine + platform scaling ----------
Object.assign(I18N.bg, {
  phase3Eyebrow:"Интерактивно преживяване", phase3Title:"Готов туристически продукт за Враца", phase3Text:"EchoVratsa комбинира персонализиран AI маршрут, записан аудио гид, дневни предизвикателства, streaks, achievements и analytics за развитие на продукта.", arTitle:"Live audio guide", arText:"Мобилен екран с име на локация, исторически факт и директен старт на записания аудио тур.", arButton:"Отвори live guide", dashboardTitle:"Analytics", dashboardText:"Dashboard за започнати турове, популярни локации, средно време и любими теми.", dashboardButton:"Покажи analytics", dashboardHide:"Скрий analytics", metricTours:"Започнати турове", metricPopular:"Популярна локация", metricSession:"Средно време", metricTopics:"Любими теми", arOverlayLabel:"LIVE GUIDE", footer:"ЕхоВраца · AI туристически аудио гид за Враца", platformEyebrow:"EchoGuide platform", platformTitle:"От Враца към цяла България", platformText:"Архитектурата вече е подготвена за мащабиране: същият продукт може да работи като EchoSofia, EchoPlovdiv и EchoBulgaria с нови градове, локации и локални разкази.", platformCard1Title:"Градове като модули", platformCard1Text:"Локациите, фактите, снимките и маршрутите са отделени в data layer, за да се добавят нови градове по-бързо.", platformCard2Title:"Един UX, много маршрути", platformCard2Text:"Профили, интереси, GPS, quiz и audio narration могат да се използват повторно за всеки регион.", platformCard3Title:"Tourism analytics", platformCard3Text:"Данните от потребителските маршрути помагат да се откриват най-популярните места и теми.", routeSummary:"Персонален маршрут", routeReason:"Избрано според профила и интересите", familyFriendly:"лесна семейна спирка", studentFriendly:"силна учебна стойност", touristFriendly:"емблематична гледка"
});
Object.assign(I18N.en, {
  phase3Eyebrow:"Interactive experience", phase3Title:"A complete tourist product for Vratsa", phase3Text:"EchoVratsa combines a personalized AI route, recorded audio guide, daily challenges, streaks, achievements, and analytics for product growth.", arTitle:"Live audio guide", arText:"Mobile guide screen with the place name, a historical fact, and one-tap recorded audio tour start.", arButton:"Open live guide", dashboardTitle:"Analytics", dashboardText:"Dashboard for tours started, popular locations, average time, and favorite topics.", dashboardButton:"Show analytics", dashboardHide:"Hide analytics", metricTours:"Tours started", metricPopular:"Popular location", metricSession:"Average time", metricTopics:"Favorite topics", arOverlayLabel:"LIVE GUIDE", footer:"EchoVratsa · AI tourist audio guide for Vratsa", platformEyebrow:"EchoGuide platform", platformTitle:"From Vratsa to all of Bulgaria", platformText:"The architecture is now prepared for scale: the same product can work as EchoSofia, EchoPlovdiv, and EchoBulgaria with new cities, locations, and local stories.", platformCard1Title:"Cities as modules", platformCard1Text:"Locations, facts, photos, and routes live in a data layer so new cities can be added faster.", platformCard2Title:"One UX, many routes", platformCard2Text:"Profiles, interests, GPS, quiz, and audio narration can be reused for every region.", platformCard3Title:"Tourism analytics", platformCard3Text:"Route data helps reveal the most popular places and topics.", routeSummary:"Personal route", routeReason:"Selected by profile and interests", familyFriendly:"family-friendly stop", studentFriendly:"strong learning value", touristFriendly:"iconic view"
});
Object.assign(I18N.de, {
  phase3Eyebrow:"Interaktives Erlebnis", phase3Title:"Ein vollständiges Tourismusprodukt für Vratsa", phase3Text:"EchoVratsa kombiniert personalisierte KI-Routen, aufgezeichnete Audioguides, tägliche Challenges, Streaks, Achievements und Analytics für Produktwachstum.", arTitle:"Live-Audioguide", arText:"Mobiler Guide-Bildschirm mit Ortsname, historischem Fakt und direktem Start der aufgezeichneten Audio-Tour.", arButton:"Live-Guide öffnen", dashboardTitle:"Analytics", dashboardText:"Dashboard für gestartete Touren, beliebte Orte, durchschnittliche Zeit und Lieblingsthemen.", dashboardButton:"Analytics zeigen", dashboardHide:"Analytics ausblenden", metricTours:"Gestartete Touren", metricPopular:"Beliebter Ort", metricSession:"Durchschnittszeit", metricTopics:"Lieblingsthemen", arOverlayLabel:"LIVE GUIDE", footer:"EchoVratsa · KI-Audioguide für Vratsa", platformEyebrow:"EchoGuide platform", platformTitle:"Von Vratsa nach ganz Bulgarien", platformText:"Die Architektur ist für Skalierung vorbereitet: Dasselbe Produkt kann als EchoSofia, EchoPlovdiv und EchoBulgaria mit neuen Städten, Orten und lokalen Erzählungen funktionieren.", platformCard1Title:"Städte als Module", platformCard1Text:"Orte, Fakten, Fotos und Routen liegen in einer Datenschicht, damit neue Städte schneller ergänzt werden können.", platformCard2Title:"Ein UX, viele Routen", platformCard2Text:"Profile, Interessen, GPS, Quiz und Audio-Erzählung können für jede Region wiederverwendet werden.", platformCard3Title:"Tourismus-Analytics", platformCard3Text:"Routendaten zeigen die beliebtesten Orte und Themen.", routeSummary:"Persönliche Route", routeReason:"Nach Profil und Interessen ausgewählt", familyFriendly:"familienfreundliche Station", studentFriendly:"starker Lernwert", touristFriendly:"ikonische Aussicht"
});

const PERSONA_LOCATION_WEIGHTS = {
  tourist: { okolchitsa: 3, ledenika: 3, vratsata: 3, skaklya: 2, vestitelyat: 2, museum: 1, kurtpashova: 1, sofroniy: 1 },
  student: { museum: 4, okolchitsa: 4, sofroniy: 3, kurtpashova: 3, vestitelyat: 2, vratsata: 2, ledenika: 1, skaklya: 1 },
  family: { ledenika: 4, vestitelyat: 3, museum: 3, vratsata: 2, sofroniy: 2, skaklya: 1, okolchitsa: 1, kurtpashova: 1 }
};
const PERSONA_ROUTE_LIMIT = { tourist: 6, student: 5, family: 4 };

function profileScore(loc) {
  const weights = PERSONA_LOCATION_WEIGHTS[selectedPersona] || PERSONA_LOCATION_WEIGHTS.tourist;
  return weights[loc.id] || 1;
}
function interestScore(loc) {
  return TOPICS.filter(topic => selectedTopics.has(topic.id) && loc.facts[topic.id]).length;
}
function routeReason(loc) {
  const strong = profileScore(loc) >= 3;
  const label = selectedPersona === 'family' ? t('familyFriendly') : selectedPersona === 'student' ? t('studentFriendly') : t('touristFriendly');
  const interests = TOPICS.filter(topic => selectedTopics.has(topic.id) && loc.facts[topic.id]).map(topic => topicLabel(topic.id)).join(', ');
  return strong ? `${label}${interests ? ' · ' + interests : ''}` : (interests || t('routeReason'));
}
function getMatchingLocations() {
  const candidates = LOCATIONS
    .map(loc => ({ loc, score: interestScore(loc) * 4 + profileScore(loc) }))
    .filter(item => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .map(item => item.loc);
  const limit = PERSONA_ROUTE_LIMIT[selectedPersona] || 5;
  return candidates.slice(0, Math.min(limit, candidates.length));
}
function scoreStop(loc, origin) {
  const [lat,lng] = parseCoords(loc.coords);
  const dist = distanceMeters(origin.lat, origin.lng, lat, lng);
  const personalFit = (interestScore(loc) * 520) + (profileScore(loc) * 260);
  return dist - personalFit;
}
function renderRouteSummary(route){
  const el=document.getElementById('route-summary'); if(!el||!route.length)return;
  const total=route.slice(1).reduce((sum,loc,i)=>sum+distanceBetweenLocations(route[i],loc),0);
  const reasons=[...new Set(route.slice(0,3).map(routeReason))].join(' · ');
  el.innerHTML=`<strong>${t('routeSummary')}</strong><span>${route.length} stops · ${(total/1000).toFixed(1)} km · ${Math.max(8,Math.round(total/75))} min ${t('eta')} · ${reasons}</span>`;
}
function renderPersonaChips(){
  const wrap=document.getElementById('persona-chips'); wrap.innerHTML='';
  PERSONAS.forEach(p=>{const chip=document.createElement('button'); chip.className='chip'+(p.id===selectedPersona?' active':''); chip.textContent=personaLabel(p.id); chip.setAttribute('aria-pressed',p.id===selectedPersona); chip.addEventListener('click',()=>{selectedPersona=p.id; activeRoute=[]; renderPersonaChips(); renderProgress(); updateSmartRecommendation();}); wrap.appendChild(chip);});
}
function renderTopicChips(){
  const wrap=document.getElementById('topic-chips'); wrap.innerHTML='';
  TOPICS.forEach(topic=>{const active=selectedTopics.has(topic.id); const chip=document.createElement('button'); chip.className='chip'+(active?' active':''); chip.textContent=topicLabel(topic.id); chip.setAttribute('aria-pressed',active); chip.addEventListener('click',()=>{if(selectedTopics.has(topic.id)){if(selectedTopics.size>1) selectedTopics.delete(topic.id);} else selectedTopics.add(topic.id); activeRoute=[]; renderTopicChips(); renderProgress(); updateSmartRecommendation();}); wrap.appendChild(chip);});
}
function updateSmartRecommendation(){
  const title=document.getElementById('smart-title'), text=document.getElementById('smart-text'); if(!title||!text)return; const label=title.closest('.smart-panel')?.querySelector('.label'); if(label) label.textContent=t('smartLabel');
  const next=optimizeRoute(getMatchingLocations()).find(l=>!state.completed.has(l.id));
  if(!next){title.textContent=t('routeDone'); text.textContent=t('routeDoneText'); return;}
  title.textContent=`${t('nextBest')}: ${locName(next)}`;
  text.textContent=`${routeReason(next)} · ${userPosition?Math.round(distanceMeters(userPosition.lat,userPosition.lng,...parseCoords(next.coords)))+' '+t('fromYou'):t('orderedCenter')}`;
}
function updateAnalytics(){
  const tours=document.getElementById('metric-tours'), popular=document.getElementById('metric-popular'), topics=document.getElementById('metric-topics');
  if(tours)tours.textContent=localStorage.getItem('echovratsa_tours_started')||'0'; if(popular)popular.textContent=activeRoute[0]?locName(activeRoute[0]):locName(getMatchingLocations()[0]||LOCATIONS[0]); if(topics)topics.textContent=[...selectedTopics].map(topicLabel).join(', ');
  const btn=document.getElementById('analytics-toggle-btn'); const panel=document.getElementById('analytics-panel'); if(btn&&panel) btn.textContent=panel.hidden?t('dashboardButton'):t('dashboardHide');
}


document.addEventListener("DOMContentLoaded", init);


/* ---------- V10: presentation reset, replayable quizzes, product-ready polish ---------- */
Object.assign(I18N.bg, {
  presentationLabel: "Инструменти за представяне",
  presentationTitle: "Готов за нов потребител",
  presentationText: "Нулирай прогреса преди презентация или стартирай guided walkthrough на продукта.",
  resetDemo: "Нулирай представянето",
  presentationMode: "Режим презентация",
  quizAgain: "Отговори пак",
  resetDone: "Прогресът е нулиран. Можеш да представиш проекта отначало.",
  presentationStarted: "Презентационният режим стартира: профил, интереси, маршрут, карта, аудио и quiz flow.",
  dashboardTitle: "Product insights",
  dashboardText: "Панел за започнати турове, популярни локации, средно време и любими теми.",
  dashboardButton: "Покажи insights",
  dashboardHide: "Скрий insights"
});
Object.assign(I18N.en, {
  presentationLabel: "Presentation tools",
  presentationTitle: "Ready for a new visitor",
  presentationText: "Reset progress before presenting or launch a guided product walkthrough.",
  resetDemo: "Reset presentation",
  presentationMode: "Presentation mode",
  quizAgain: "Answer again",
  resetDone: "Progress has been reset. You can present the product from the beginning.",
  presentationStarted: "Presentation mode started: profile, interests, route, map, audio, and quiz flow.",
  dashboardTitle: "Product insights",
  dashboardText: "Panel for started tours, popular locations, average time, and favorite topics.",
  dashboardButton: "Show insights",
  dashboardHide: "Hide insights"
});
Object.assign(I18N.de, {
  presentationLabel: "Präsentationswerkzeuge",
  presentationTitle: "Bereit für einen neuen Besucher",
  presentationText: "Setze den Fortschritt vor der Präsentation zurück oder starte eine geführte Produkt-Tour.",
  resetDemo: "Präsentation zurücksetzen",
  presentationMode: "Präsentationsmodus",
  quizAgain: "Noch einmal antworten",
  resetDone: "Der Fortschritt wurde zurückgesetzt. Du kannst das Produkt von Anfang an präsentieren.",
  presentationStarted: "Präsentationsmodus gestartet: Profil, Interessen, Route, Karte, Audio und Quiz-Flow.",
  dashboardTitle: "Product insights",
  dashboardText: "Panel für gestartete Touren, beliebte Orte, Durchschnittszeit und Lieblingsthemen.",
  dashboardButton: "Insights zeigen",
  dashboardHide: "Insights ausblenden"
});

function resetPresentationState() {
  ["echovratsa_xp", "echovratsa_completed", "echovratsa_unlocked", "echovratsa_quiz", "echovratsa_tours_started"].forEach(key => localStorage.removeItem(key));
  state.xp = 0;
  state.completed.clear();
  state.unlocked.clear();
  state.quizSolved.clear();
  activeRoute = [];
  renderProgress();
  updateSmartRecommendation();
  updateAnalytics();
  const routeList = document.getElementById("route-list");
  if (routeList) routeList.innerHTML = "";
  const summary = document.getElementById("route-summary");
  if (summary) summary.innerHTML = "";
  const empty = document.getElementById("route-empty");
  if (empty) { empty.style.display = "block"; empty.textContent = t("generateEmpty"); }
  updateMap(LOCATIONS);
  showPresentationToast(t("resetDone"));
}

function showPresentationToast(message) {
  let toast = document.getElementById("presentation-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "presentation-toast";
    toast.className = "presentation-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(window.__echoToastTimer);
  window.__echoToastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function startPresentationMode() {
  if (!activeRoute.length) renderRoute(optimizeRoute(getMatchingLocations()));
  showPresentationToast(t("presentationStarted"));
  const steps = ["build", "route", "product-features", "platform"];
  let delay = 0;
  steps.forEach(id => {
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), delay);
    delay += 1800;
  });
  setTimeout(() => {
    const first = document.querySelector(".stop");
    if (first) {
      document.querySelectorAll(".stop").forEach(el => el.classList.remove("presentation-focus"));
      first.classList.add("presentation-focus");
      first.querySelector(".stop-body")?.classList.add("open");
      first.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, delay + 400);
}

function renderQuiz(location, mount) {
  const quiz = QUIZZES[location.id];
  if (!quiz || !mount) return;
  const solved = state.quizSolved.has(location.id);
  const answers = localized(quiz.a);
  mount.innerHTML = `
    <p class="quiz-title">${t("quiz")}</p>
    <p>${localized(quiz.q)}</p>
    <div class="quiz-options">
      ${answers.map((answer, index) => `<button class="quiz-option" type="button" data-index="${index}" ${solved ? "disabled" : ""}>${answer}</button>`).join("")}
    </div>
    <p class="quiz-feedback">${solved ? t("solved") : ""}</p>
    ${solved ? `<button class="mini-btn ghost quiz-reset-btn" type="button">${t("quizAgain")}</button>` : ""}
  `;
  mount.querySelectorAll(".quiz-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const feedback = mount.querySelector(".quiz-feedback");
      if (Number(btn.dataset.index) === quiz.correct) {
        feedback.textContent = t("correct");
        state.quizSolved.add(location.id);
        addXp(100);
        saveState();
        renderQuiz(location, mount);
      } else {
        feedback.textContent = t("wrong");
      }
    });
  });
  mount.querySelector(".quiz-reset-btn")?.addEventListener("click", () => {
    state.quizSolved.delete(location.id);
    saveState();
    renderQuiz(location, mount);
  });
}

function initV10PresentationTools() {
  document.getElementById("reset-demo-btn")?.addEventListener("click", resetPresentationState);
  document.getElementById("presentation-mode-btn")?.addEventListener("click", startPresentationMode);
  const nav = document.querySelector(".navbar .nav-actions");
  if (nav && !document.getElementById("product-status-pill")) {
    const pill = document.createElement("span");
    pill.id = "product-status-pill";
    pill.className = "product-status-pill";
    pill.textContent = "Product-ready";
    nav.prepend(pill);
  }
  applyLanguage();
}

document.addEventListener("DOMContentLoaded", initV10PresentationTools);


/* ---------- V11: language-aware AI voice assistant ---------- */
const VOICE_PROFILES = {
  bg: {
    locale: "bg-BG",
    locales: ["bg-BG", "bg"],
    nativeName: "български",
    title: { bg: "Български разказвач", en: "Bulgarian narrator", de: "Bulgarische Stimme" },
    sample: "Здравей, аз съм твоят AI гид за Враца. Гласът ми вече следва избрания език."
  },
  en: {
    locale: "en-US",
    locales: ["en-US", "en-GB", "en"],
    nativeName: "English",
    title: { bg: "Английски разказвач", en: "English narrator", de: "Englische Stimme" },
    sample: "Hello, I am your AI guide for Vratsa. My voice now follows the selected language."
  },
  de: {
    locale: "de-DE",
    locales: ["de-DE", "de-AT", "de-CH", "de"],
    nativeName: "Deutsch",
    title: { bg: "Немски разказвач", en: "German narrator", de: "Deutsche Stimme" },
    sample: "Hallo, ich bin dein KI-Guide für Vratsa. Meine Stimme folgt jetzt der gewählten Sprache."
  }
};

const RECORDED_NARRATION = {
  bg: {
    okolchitsa: "assets/audio/okolchitsa-bg.mp3",
    ledenika: "assets/audio/ledenika-bg.mp3",
    vratsata: "assets/audio/vratsata-bg.mp3",
    skaklya: "assets/audio/skaklya-bg.mp3",
    museum: "assets/audio/museum-bg.mp3",
    kurtpashova: "assets/audio/kurtpashova-bg.mp3",
    vestitelyat: "assets/audio/vestitelyat-bg.mp3",
    sofroniy: "assets/audio/sofroniy-bg.mp3"
  },
  en: {
    okolchitsa: "assets/audio/okolchitsa-en.mp3",
    ledenika: "assets/audio/ledenika-en.mp3",
    vratsata: "assets/audio/vratsata-en.mp3",
    skaklya: "assets/audio/skaklya-en.mp3",
    museum: "assets/audio/museum-en.mp3",
    kurtpashova: "assets/audio/kurtpashova-en.mp3",
    vestitelyat: "assets/audio/vestitelyat-en.mp3",
    sofroniy: "assets/audio/sofroniy-en.mp3"
  },
  de: {
    okolchitsa: "assets/audio/okolchitsa-de.mp3",
    ledenika: "assets/audio/ledenika-de.mp3",
    vratsata: "assets/audio/vratsata-de.mp3",
    skaklya: "assets/audio/skaklya-de.mp3",
    museum: "assets/audio/museum-de.mp3",
    kurtpashova: "assets/audio/kurtpashova-de.mp3",
    vestitelyat: "assets/audio/vestitelyat-de.mp3",
    sofroniy: "assets/audio/sofroniy-de.mp3"
  }
};

const RECORDED_INTRO = {
  bg: "assets/audio/ai-guide-bg.mp3",
  en: "assets/audio/ai-guide-en.mp3",
  de: "assets/audio/ai-guide-de.mp3"
};

let currentRecordedAudio = null;
let currentRecordedButton = null;

Object.assign(I18N.bg, {
  productReady: "Готов продукт",
  voiceLabel: "AI глас",
  voiceTest: "Проба на гласа",
  voiceLoading: "Зареждам наличните гласове...",
  voiceReady: "Активен глас: {voice}",
  voiceFallback: "Няма инсталиран точен {language} глас. Четенето ще тръгне с резервен глас: {voice}.",
  voiceRecorded: "Пуска записан разказ на {language}.",
  voiceIntroRecorded: "Пуска записано представяне на AI гида.",
  voiceSpeaking: "Чете историята на {language}.",
  voiceUnavailable: "Този браузър няма синтез на реч. Опитай с Chrome или Edge."
});
Object.assign(I18N.en, {
  productReady: "Product-ready",
  voiceLabel: "AI voice",
  voiceTest: "Test voice",
  voiceLoading: "Loading available voices...",
  voiceReady: "Active voice: {voice}",
  voiceFallback: "No exact {language} voice is installed. Narration will use fallback voice: {voice}.",
  voiceRecorded: "Playing recorded narration in {language}.",
  voiceIntroRecorded: "Playing the recorded AI guide intro.",
  voiceSpeaking: "Reading the story in {language}.",
  voiceUnavailable: "This browser does not support speech synthesis. Try Chrome or Edge."
});
Object.assign(I18N.de, {
  productReady: "Produktbereit",
  voiceLabel: "KI-Stimme",
  voiceTest: "Stimme testen",
  voiceLoading: "Verfügbare Stimmen werden geladen...",
  voiceReady: "Aktive Stimme: {voice}",
  voiceFallback: "Keine genaue {language}-Stimme ist installiert. Die Erzählung nutzt Ersatzstimme: {voice}.",
  voiceRecorded: "Aufgezeichnete Erzählung auf {language} wird abgespielt.",
  voiceIntroRecorded: "Aufgezeichnete Vorstellung des KI-Guides wird abgespielt.",
  voiceSpeaking: "Die Geschichte wird auf {language} vorgelesen.",
  voiceUnavailable: "Dieser Browser unterstützt keine Sprachsynthese. Bitte Chrome oder Edge verwenden."
});

function voiceProfile() {
  return VOICE_PROFILES[selectedLanguage] || VOICE_PROFILES.bg;
}

function voiceText(key, values = {}) {
  return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function voiceTitle() {
  const profile = voiceProfile();
  return profile.title[selectedLanguage] || profile.title.bg;
}

function findBestVoice(voices, profile) {
  const byExactLocale = voices.find(voice =>
    profile.locales.some(locale => (voice.lang || "").toLowerCase() === locale.toLowerCase())
  );
  if (byExactLocale) return byExactLocale;
  const languagePrefix = profile.locale.slice(0, 2).toLowerCase();
  return voices.find(voice => (voice.lang || "").toLowerCase().startsWith(languagePrefix)) || null;
}

function hasSpeechSynthesis() {
  return typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined";
}

function getSpeechVoices() {
  return hasSpeechSynthesis() ? speechSynthesis.getVoices() : [];
}

function waitForSpeechVoices(timeout = 700) {
  if (!hasSpeechSynthesis() || getSpeechVoices().length) {
    return Promise.resolve(getSpeechVoices());
  }

  return new Promise(resolve => {
    const finish = () => {
      speechSynthesis.removeEventListener?.("voiceschanged", finish);
      resolve(getSpeechVoices());
    };

    speechSynthesis.addEventListener?.("voiceschanged", finish, { once: true });
    window.setTimeout(finish, timeout);
  });
}

function findFallbackVoice(voices) {
  return voices.find(voice => voice.default) ||
    voices.find(voice => (voice.lang || "").toLowerCase().startsWith("en")) ||
    voices[0] ||
    null;
}

const BG_TRANSLITERATION = {
  А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "G", г: "g", Д: "D", д: "d",
  Е: "E", е: "e", Ж: "Zh", ж: "zh", З: "Z", з: "z", И: "I", и: "i", Й: "Y", й: "y",
  К: "K", к: "k", Л: "L", л: "l", М: "M", м: "m", Н: "N", н: "n", О: "O", о: "o",
  П: "P", п: "p", Р: "R", р: "r", С: "S", с: "s", Т: "T", т: "t", У: "U", у: "u",
  Ф: "F", ф: "f", Х: "H", х: "h", Ц: "Ts", ц: "ts", Ч: "Ch", ч: "ch", Ш: "Sh", ш: "sh",
  Щ: "Sht", щ: "sht", Ъ: "A", ъ: "a", Ь: "Y", ь: "y", Ю: "Yu", ю: "yu", Я: "Ya", я: "ya"
};

function transliterateBulgarian(text) {
  return text.replace(/[А-Яа-я]/g, char => BG_TRANSLITERATION[char] || char);
}

function prepareTextForResolvedVoice(text, resolved) {
  if (selectedLanguage === "bg" && resolved?.voice && !resolved.exact) {
    return transliterateBulgarian(text);
  }
  return text;
}

function resolveNarrationVoice() {
  if (!hasSpeechSynthesis()) return { supported: false, voice: null, exact: false, lang: voiceProfile().locale };
  const voices = getSpeechVoices();
  const profile = voiceProfile();
  const exactVoice = findBestVoice(voices, profile);
  if (exactVoice) return { supported: true, voice: exactVoice, exact: true, lang: profile.locale };
  const fallbackVoice = findFallbackVoice(voices);
  return {
    supported: true,
    voice: fallbackVoice,
    exact: false,
    lang: fallbackVoice?.lang || profile.locale
  };
}

loadVoice = function() {
  if (!hasSpeechSynthesis()) {
    bgVoice = null;
    return null;
  }

  bgVoice = resolveNarrationVoice().voice;
  return bgVoice;
};

function updateVoiceAssistant(mode = "") {
  const panel = document.getElementById("voice-panel");
  const title = document.getElementById("voice-panel-title");
  const text = document.getElementById("voice-panel-text");
  if (!panel || !title || !text) return;

  const profile = voiceProfile();
  const supported = hasSpeechSynthesis();
  const voices = getSpeechVoices();
  const resolved = resolveNarrationVoice();
  title.textContent = voiceTitle();
  panel.classList.remove("ready", "speaking", "warning");

  if (mode === "recorded-intro") {
    panel.classList.add("speaking");
    text.textContent = t("voiceIntroRecorded");
    return;
  }

  if (mode === "recorded") {
    panel.classList.add("speaking");
    text.textContent = voiceText("voiceRecorded", { language: profile.nativeName });
    return;
  }

  if (!supported) {
    panel.classList.add("warning");
    text.textContent = t("voiceUnavailable");
    return;
  }

  if (mode === "speaking") {
    panel.classList.add("speaking");
    text.textContent = voiceText("voiceSpeaking", { language: profile.nativeName });
    return;
  }

  if (!voices.length) {
    panel.classList.add("warning");
    text.textContent = t("voiceLoading");
    return;
  }

  const activeVoice = resolved.voice || bgVoice || loadVoice();
  if (activeVoice && resolved.exact) {
    panel.classList.add("ready");
    text.textContent = voiceText("voiceReady", { voice: `${activeVoice.name} (${activeVoice.lang})` });
  } else if (activeVoice) {
    panel.classList.add("warning");
    text.textContent = voiceText("voiceFallback", {
      language: profile.nativeName,
      voice: `${activeVoice.name} (${activeVoice.lang})`
    });
  } else {
    panel.classList.add("warning");
    text.textContent = t("voiceLoading");
  }
}

function updateProductStatusPill() {
  const pill = document.getElementById("product-status-pill");
  if (pill) pill.textContent = t("productReady");
}

const applyLanguageBeforeVoiceAssistant = applyLanguage;
applyLanguage = function() {
  applyLanguageBeforeVoiceAssistant();
  loadVoice();
  updateVoiceAssistant();
  updateProductStatusPill();
};

function defaultAudioButtonText(btn) {
  if (!btn) return t("listen");
  if (btn.id === "ar-audio-btn") return t("arAudio");
  if (btn.dataset?.i18n) return t(btn.dataset.i18n);
  return btn.dataset.defaultText || t("listen");
}

function setAudioButtonState(btn, isPlaying) {
  if (!btn) return;
  const label = btn.querySelector?.(".play-label");
  if (!btn.dataset.defaultText) btn.dataset.defaultText = label ? label.textContent : btn.textContent;
  btn.classList.toggle("playing", isPlaying);
  btn.dataset.wasPlaying = isPlaying ? "true" : "false";
  btn.dataset.audioActive = isPlaying ? "true" : "false";
  if (label) {
    label.textContent = isPlaying ? t("stop") : t("listen");
  } else {
    btn.textContent = isPlaying ? t("stop") : defaultAudioButtonText(btn);
  }
}

resetPlayButtons = function() {
  document.querySelectorAll(".play-btn, #ar-audio-btn, #voice-test-btn").forEach(button => {
    setAudioButtonState(button, false);
  });
};

function narrationLocationIdFromButton(btn) {
  const stopId = btn?.closest?.(".stop")?.dataset?.locationId;
  if (stopId) return stopId;
  if (btn?.id === "ar-audio-btn") return (activeRoute && activeRoute[0]?.id) || LOCATIONS[0]?.id || null;
  return null;
}

function recordedTrackForButton(btn) {
  if (btn?.id === "voice-test-btn") return RECORDED_INTRO[selectedLanguage] || null;
  const locationId = narrationLocationIdFromButton(btn);
  return locationId ? RECORDED_NARRATION[selectedLanguage]?.[locationId] || null : null;
}

function stopRecordedNarration() {
  if (currentRecordedAudio) {
    currentRecordedAudio.pause();
    currentRecordedAudio.currentTime = 0;
  }
  if (currentRecordedButton) setAudioButtonState(currentRecordedButton, false);
  currentRecordedAudio = null;
  currentRecordedButton = null;
}

function finishRecordedNarration(btn) {
  currentRecordedAudio = null;
  currentRecordedButton = null;
  setAudioButtonState(btn, false);
  updateVoiceAssistant();
}

function playRecordedNarration(src, btn, fallbackText) {
  if (typeof Audio !== "function") {
    speak(fallbackText, btn, { skipRecorded: true });
    return;
  }

  const wasPlaying = btn?.dataset?.wasPlaying === "true" && currentRecordedButton === btn;
  stopRecordedNarration();
  if (hasSpeechSynthesis()) speechSynthesis.cancel();
  resetPlayButtons();

  if (wasPlaying) {
    updateVoiceAssistant();
    return;
  }

  const audio = new Audio(src);
  currentRecordedAudio = audio;
  currentRecordedButton = btn;
  setAudioButtonState(btn, true);
  updateVoiceAssistant(btn?.id === "voice-test-btn" ? "recorded-intro" : "recorded");

  audio.addEventListener("ended", () => finishRecordedNarration(btn), { once: true });
  audio.addEventListener("error", () => {
    finishRecordedNarration(btn);
    speak(fallbackText, btn, { skipRecorded: true });
  }, { once: true });

  audio.play().catch(() => {
    finishRecordedNarration(btn);
    speak(fallbackText, btn, { skipRecorded: true });
  });
}

function playAiGuideIntro(btn) {
  const introTrack = RECORDED_INTRO[selectedLanguage];
  if (introTrack) {
    playRecordedNarration(introTrack, btn, voiceProfile().sample);
    return;
  }

  speak(voiceProfile().sample, btn);
}

window.playAiGuideIntro = playAiGuideIntro;

function stopNarration() {
  stopRecordedNarration();
  if (hasSpeechSynthesis()) speechSynthesis.cancel();
  currentUtterance = null;
  resetPlayButtons();
  updateVoiceAssistant();
}

speak = async function(text, btn, options = {}) {
  const recordedTrack = options.skipRecorded ? null : recordedTrackForButton(btn);
  if (recordedTrack) {
    playRecordedNarration(recordedTrack, btn, text);
    return;
  }

  if (!hasSpeechSynthesis()) {
    alert(t("voiceUnavailable"));
    updateVoiceAssistant();
    return;
  }

  stopRecordedNarration();
  const wasPlaying = btn?.dataset?.wasPlaying === "true";
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
    resetPlayButtons();
    if (wasPlaying) {
      currentUtterance = null;
      updateVoiceAssistant();
      return;
    }
  }

  speechSynthesis.resume?.();
  if (!getSpeechVoices().length) {
    updateVoiceAssistant();
    await waitForSpeechVoices();
  }

  const profile = voiceProfile();
  const resolved = resolveNarrationVoice();
  const utterance = new SpeechSynthesisUtterance(prepareTextForResolvedVoice(text, resolved));
  utterance.lang = resolved.lang || profile.locale;
  if (resolved.voice) utterance.voice = resolved.voice;
  utterance.volume = 1;
  utterance.rate = selectedPersona === "student" ? 0.92 : selectedPersona === "family" ? 0.96 : 0.95;
  utterance.pitch = selectedLanguage === "de" ? 0.96 : 1;
  currentUtterance = utterance;

  setAudioButtonState(btn, true);
  updateVoiceAssistant("speaking");

  utterance.onend = () => {
    currentUtterance = null;
    setAudioButtonState(btn, false);
    updateVoiceAssistant();
  };
  utterance.onerror = utterance.onend;
  try {
    speechSynthesis.speak(utterance);
    speechSynthesis.resume?.();
  } catch (error) {
    currentUtterance = null;
    setAudioButtonState(btn, false);
    updateVoiceAssistant();
    alert(t("voiceUnavailable"));
  }
};

function initLanguageAwareVoice() {
  installNavLogo();

  if (hasSpeechSynthesis()) {
    speechSynthesis.onvoiceschanged = () => {
      loadVoice();
      updateVoiceAssistant();
    };
    window.setTimeout(() => {
      loadVoice();
      updateVoiceAssistant();
    }, 200);
  }

  document.getElementById("language-select")?.addEventListener("change", () => {
    stopNarration();
    window.setTimeout(() => {
      loadVoice();
      updateVoiceAssistant();
    }, 0);
  });

  loadVoice();
  updateVoiceAssistant();
  updateProductStatusPill();
}

function installNavLogo() {
  const currentLogo = document.querySelector(".navbar .logo");
  if (!currentLogo || currentLogo.tagName.toLowerCase() === "img") return;

  const logo = document.createElement("img");
  logo.className = "logo";
  logo.src = "assets/logo.svg";
  logo.alt = "EchoVratsa V logo";
  logo.width = 34;
  logo.height = 34;
  currentLogo.replaceWith(logo);
}

document.addEventListener("DOMContentLoaded", initLanguageAwareVoice);


/* ---------- V12: feedback pass - honest guide mode, clearer product logic, stronger route variety ---------- */
(function applyFeedbackImprovements() {
  const ROUTE_STRATEGIES = {
    tourist: {
      limit: 6,
      priority: ["vratsata", "okolchitsa", "ledenika", "skaklya", "vestitelyat", "museum", "sofroniy", "kurtpashova"],
      labelKey: "routeProfileTourist",
      reasonKey: "touristFriendly"
    },
    student: {
      limit: 5,
      priority: ["museum", "sofroniy", "okolchitsa", "kurtpashova", "vestitelyat", "vratsata", "ledenika", "skaklya"],
      labelKey: "routeProfileStudent",
      reasonKey: "studentFriendly"
    },
    family: {
      limit: 4,
      priority: ["ledenika", "vestitelyat", "museum", "vratsata", "sofroniy", "skaklya", "okolchitsa", "kurtpashova"],
      labelKey: "routeProfileFamily",
      reasonKey: "familyFriendly"
    }
  };

  Object.assign(I18N.bg, {
    phase3Text: "EchoVratsa комбинира персонализиран AI маршрут, записан аудио гид, дневни предизвикателства, streaks, achievements и product insights.",
    arTitle: "Live audio guide",
    arText: "Мобилен екран за текущата спирка: име, кратък факт, причина защо е в маршрута и директен старт на записания разказ.",
    arButton: "Отвори live guide",
    arOverlayLabel: "LIVE GUIDE",
    arAudio: "Пусни записания разказ",
    challengeText: "Ежедневна мини цел: посети 2 спирки и реши 1 quiz. Прогресът се обновява автоматично от действията в маршрута.",
    challengeVisitProgress: "{done}/2 посетени спирки",
    challengeQuizProgress: "{done}/1 решен quiz",
    challengeRewardPending: "Награда: streak + badge progress",
    challengeRewardDone: "Daily challenge изпълнен",
    dashboardText: "Insights показват какво се случва в продукта: колко маршрута са започнати, коя спирка води маршрута и кои теми се избират най-често.",
    insightExplainTours: "Tours = всяко генериране на маршрут.",
    insightExplainPopular: "Popular = първата препоръчана спирка.",
    insightExplainTopics: "Topics = избраните интереси.",
    routeWhyLabel: "Защо е тук",
    routeDetailLabel: "Локален детайл",
    routeProfileTourist: "туристически маршрут с гледки и емблеми",
    routeProfileStudent: "учебен маршрут с история и култура",
    routeProfileFamily: "семеен маршрут с по-лесни спирки",
    routeUpdated: "Маршрутът се променя според профила и темите.",
    voiceLabel: "Аудио гид",
    voiceTest: "Проба на запис",
    voicePanelTitle: "Записан разказвач",
    voiceReady: "Готови записани разкази за {language}.",
    voiceFallback: "Няма качествен запис за {language}. Историята остава като текст.",
    voiceRecorded: "Пуска записания разказ на {language}.",
    voiceIntroRecorded: "Пуска записано представяне на гида.",
    voiceRecordingMissing: "За тази спирка няма готов запис. Можеш да прочетеш историята от картата."
  });

  Object.assign(I18N.en, {
    phase3Text: "EchoVratsa combines a personalized AI route, recorded audio guide, daily challenges, streaks, achievements, and product insights.",
    arTitle: "Live audio guide",
    arText: "A mobile screen for the current stop: name, short fact, route reason, and one-tap recorded narration.",
    arButton: "Open live guide",
    arOverlayLabel: "LIVE GUIDE",
    arAudio: "Play recorded story",
    challengeText: "A daily mini-goal: visit 2 stops and solve 1 quiz. Progress updates from the route actions.",
    challengeVisitProgress: "{done}/2 visited stops",
    challengeQuizProgress: "{done}/1 solved quiz",
    challengeRewardPending: "Reward: streak + badge progress",
    challengeRewardDone: "Daily challenge complete",
    dashboardText: "Insights show what happens in the product: started routes, the leading recommended stop, and the topics people choose most.",
    insightExplainTours: "Tours = every generated route.",
    insightExplainPopular: "Popular = first recommended stop.",
    insightExplainTopics: "Topics = selected interests.",
    routeWhyLabel: "Why it is here",
    routeDetailLabel: "Local detail",
    routeProfileTourist: "tourist route with views and landmarks",
    routeProfileStudent: "learning route with history and culture",
    routeProfileFamily: "family route with easier stops",
    routeUpdated: "The route changes by profile and topics.",
    voiceLabel: "Audio guide",
    voiceTest: "Test recording",
    voicePanelTitle: "Recorded narrator",
    voiceReady: "Recorded stories are ready for {language}.",
    voiceFallback: "No quality recording is available for {language}. The story remains readable as text.",
    voiceRecorded: "Playing the recorded story in {language}.",
    voiceIntroRecorded: "Playing the recorded guide intro.",
    voiceRecordingMissing: "No recording is ready for this stop. You can read the story in the card."
  });

  Object.assign(I18N.de, {
    phase3Text: "EchoVratsa kombiniert personalisierte KI-Routen, aufgezeichnete Audioguides, Tageschallenges, Streaks, Achievements und Product Insights.",
    arTitle: "Live-Audioguide",
    arText: "Ein mobiler Bildschirm für die aktuelle Station: Name, kurzer Fakt, Routengrund und aufgezeichnete Erzählung.",
    arButton: "Live-Guide öffnen",
    arOverlayLabel: "LIVE GUIDE",
    arAudio: "Aufzeichnung abspielen",
    challengeText: "Ein tägliches Miniziel: Besuche 2 Stationen und löse 1 Quiz. Der Fortschritt kommt direkt aus den Routenaktionen.",
    challengeVisitProgress: "{done}/2 besuchte Stationen",
    challengeQuizProgress: "{done}/1 gelöstes Quiz",
    challengeRewardPending: "Belohnung: Streak + Badge-Fortschritt",
    challengeRewardDone: "Tageschallenge abgeschlossen",
    dashboardText: "Insights zeigen, was im Produkt passiert: gestartete Routen, führende Station und die meistgewählten Themen.",
    insightExplainTours: "Tours = jede generierte Route.",
    insightExplainPopular: "Popular = erste empfohlene Station.",
    insightExplainTopics: "Topics = gewählte Interessen.",
    routeWhyLabel: "Warum hier",
    routeDetailLabel: "Lokales Detail",
    routeProfileTourist: "Touristenroute mit Ausblicken und Wahrzeichen",
    routeProfileStudent: "Lernroute mit Geschichte und Kultur",
    routeProfileFamily: "Familienroute mit leichteren Stationen",
    routeUpdated: "Die Route ändert sich je nach Profil und Themen.",
    voiceLabel: "Audioguide",
    voiceTest: "Aufzeichnung testen",
    voicePanelTitle: "Aufgezeichnete Stimme",
    voiceReady: "Aufgezeichnete Geschichten sind für {language} bereit.",
    voiceFallback: "Keine hochwertige Aufzeichnung für {language}. Die Geschichte bleibt als Text lesbar.",
    voiceRecorded: "Aufgezeichnete Geschichte auf {language} wird abgespielt.",
    voiceIntroRecorded: "Aufgezeichnete Guide-Vorstellung wird abgespielt.",
    voiceRecordingMissing: "Für diese Station ist keine Aufzeichnung bereit. Du kannst die Geschichte in der Karte lesen."
  });

  function fillTemplate(key, values = {}) {
    return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
  }

  function currentRouteStrategy() {
    return ROUTE_STRATEGIES[selectedPersona] || ROUTE_STRATEGIES.tourist;
  }

  function routePriority(loc) {
    const priority = currentRouteStrategy().priority;
    const index = priority.indexOf(loc.id);
    return index === -1 ? 0 : (priority.length - index) * 3;
  }

  function selectedTopicMatches(loc) {
    return TOPICS.filter(topic => selectedTopics.has(topic.id) && locFact(loc, topic.id));
  }

  function firstUsefulFact(loc) {
    const selected = selectedTopicMatches(loc);
    const topic = selected[0] || TOPICS.find(item => locFact(loc, item.id));
    const fact = topic ? locFact(loc, topic.id) : locSubtitle(loc);
    return fact.length > 190 ? `${fact.slice(0, 187).trim()}...` : fact;
  }

  profileScore = function profileScoreV12(loc) {
    return routePriority(loc);
  };

  interestScore = function interestScoreV12(loc) {
    return selectedTopicMatches(loc).length;
  };

  routeReason = function routeReasonV12(loc) {
    const strategy = currentRouteStrategy();
    const interests = selectedTopicMatches(loc).map(topic => topicLabel(topic.id)).join(", ");
    const profileReason = t(strategy.reasonKey);
    return interests ? `${profileReason} · ${interests}` : profileReason;
  };

  getMatchingLocations = function getMatchingLocationsV12() {
    const strategy = currentRouteStrategy();
    const selectedCount = Math.max(1, selectedTopics.size);
    return LOCATIONS
      .map(loc => {
        const matches = selectedTopicMatches(loc).length;
        const priority = routePriority(loc);
        const score = priority + matches * 9 + (matches === selectedCount ? 4 : 0);
        return { loc, score, matches, priority };
      })
      .filter(item => item.matches > 0 || item.priority >= 9)
      .sort((a, b) => b.score - a.score || strategy.priority.indexOf(a.loc.id) - strategy.priority.indexOf(b.loc.id))
      .slice(0, strategy.limit)
      .map(item => item.loc);
  };

  scoreStop = function scoreStopV12(loc, origin) {
    const [lat, lng] = parseCoords(loc.coords);
    const dist = distanceMeters(origin.lat, origin.lng, lat, lng);
    const personalFit = routePriority(loc) * 95 + interestScore(loc) * 620;
    return dist - personalFit;
  };

  renderRouteSummary = function renderRouteSummaryV12(route) {
    const el = document.getElementById("route-summary");
    if (!el || !route.length) return;

    const total = route.slice(1).reduce((sum, loc, i) => sum + distanceBetweenLocations(route[i], loc), 0);
    const profile = t(currentRouteStrategy().labelKey);
    const reasons = [...new Set(route.slice(0, 3).map(routeReason))].join(" · ");
    el.innerHTML = `<strong>${t("routeSummary")}</strong><span>${profile} · ${route.length} stops · ${(total / 1000).toFixed(1)} km · ${Math.max(8, Math.round(total / 75))} min ${t("eta")} · ${reasons}</span>`;
  };

  function routeHasRenderedCards() {
    return Boolean(document.getElementById("route-list")?.children.length);
  }

  function refreshVisibleRoute() {
    if (routeHasRenderedCards()) {
      renderRoute(null, { scroll: false });
      showPresentationToast?.(t("routeUpdated"));
      return;
    }
    updateSmartRecommendation();
    updateAnalytics();
  }

  renderPersonaChips = function renderPersonaChipsV12() {
    const wrap = document.getElementById("persona-chips");
    if (!wrap) return;
    wrap.innerHTML = "";

    PERSONAS.forEach(persona => {
      const chip = document.createElement("button");
      chip.className = "chip" + (persona.id === selectedPersona ? " active" : "");
      chip.textContent = personaLabel(persona.id);
      chip.setAttribute("aria-pressed", persona.id === selectedPersona);
      chip.addEventListener("click", () => {
        selectedPersona = persona.id;
        activeRoute = [];
        renderPersonaChips();
        renderProgress();
        refreshVisibleRoute();
      });
      wrap.appendChild(chip);
    });
  };

  renderTopicChips = function renderTopicChipsV12() {
    const wrap = document.getElementById("topic-chips");
    if (!wrap) return;
    wrap.innerHTML = "";

    TOPICS.forEach(topic => {
      const active = selectedTopics.has(topic.id);
      const chip = document.createElement("button");
      chip.className = "chip" + (active ? " active" : "");
      chip.textContent = topicLabel(topic.id);
      chip.setAttribute("aria-pressed", active);
      chip.addEventListener("click", () => {
        if (selectedTopics.has(topic.id)) {
          if (selectedTopics.size > 1) selectedTopics.delete(topic.id);
        } else {
          selectedTopics.add(topic.id);
        }
        activeRoute = [];
        renderTopicChips();
        renderProgress();
        refreshVisibleRoute();
      });
      wrap.appendChild(chip);
    });
  };

  renderRoute = function renderRouteV12(locations = null, options = {}) {
    const container = document.getElementById("route-list");
    const empty = document.getElementById("route-empty");
    if (!container || !empty) return;

    container.innerHTML = "";
    stopElements.clear();
    let matches = locations || getMatchingLocations();
    if (!locations && userPosition) matches = optimizeRoute(matches);
    activeRoute = matches;

    if (selectedTopics.size === 0 || matches.length === 0) {
      empty.textContent = selectedTopics.size === 0 ? t("generateEmpty") : t("noMatch");
      empty.style.display = "block";
      updateMap([]);
      updateAnalytics();
      updateDailyChallenge();
      return;
    }

    empty.style.display = "none";
    updateMap(matches);
    renderRouteSummary(matches);
    incrementToursStarted();

    matches.forEach((loc, i) => {
      const distance = userPosition ? `${Math.round(distanceMeters(userPosition.lat, userPosition.lng, ...parseCoords(loc.coords)))} m` : t("gpsReadyTag");
      const eta = i === 0 ? t("start") : etaBetween(matches[i - 1], loc);
      const completed = state.completed.has(loc.id);
      const stop = document.createElement("div");
      stop.className = "stop" + (state.unlocked.has(loc.id) ? " unlocked" : "");
      stop.dataset.locationId = loc.id;
      stop.innerHTML = `
        <div class="stop-marker">${completed ? "✓" : i + 1}</div>
        <div class="stop-card">
          <div class="stop-top" role="button" tabindex="0" aria-expanded="false">
            <div><h3>${locName(loc)}</h3><div class="stop-sub">${locSubtitle(loc)}</div></div>
            <div class="stop-meta">${locDuration(loc)}</div>
          </div>
          <div class="stop-body">
            <img class="stop-photo" src="${loc.image}" alt="${locName(loc)}">
            <div class="stop-tags"><span>📍 ${distance}</span><span>⏱ ${t("eta")} ${eta}</span><span>🎯 +50 XP</span><span>🧭 ${state.unlocked.has(loc.id) ? t("unlocked") : t("gpsReadyTag")}</span></div>
            <div class="route-context">
              <span><strong>${t("routeWhyLabel")}:</strong> ${routeReason(loc)}</span>
              <span><strong>${t("routeDetailLabel")}:</strong> ${firstUsefulFact(loc)}</span>
            </div>
            <p class="stop-narration"></p>
            <div class="action-row">
              <button class="play-btn" type="button"><span class="wave"><span></span><span></span><span></span><span></span></span><span class="play-label">${t("listen")}</span></button>
              <button class="mini-btn complete-btn" type="button">${completed ? t("completed") : t("complete")}</button>
              <button class="mini-btn ghost locate-btn" type="button">${t("map")}</button>
            </div>
            <div class="quiz-card"></div>
          </div>
        </div>`;

      const top = stop.querySelector(".stop-top");
      const body = stop.querySelector(".stop-body");
      stop.querySelector(".stop-narration").textContent = generateNarration(loc);
      const open = () => { body.classList.add("open"); top.setAttribute("aria-expanded", "true"); };
      const toggle = () => { const isOpen = body.classList.toggle("open"); top.setAttribute("aria-expanded", String(isOpen)); };
      top.addEventListener("click", toggle);
      top.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
      stop.querySelector(".play-btn").addEventListener("click", event => speak(generateFullNarration(loc), event.currentTarget));
      stop.querySelector(".complete-btn").addEventListener("click", () => completeStop(loc.id, stop));
      stop.querySelector(".locate-btn").addEventListener("click", () => focusLocation(loc));
      renderQuiz(loc, stop.querySelector(".quiz-card"));
      stopElements.set(loc.id, { element: stop, open });
      container.appendChild(stop);
    });

    updateSmartRecommendation();
    updateAnalytics();
    updateDailyChallenge();
    if (options.scroll !== false) document.getElementById("route")?.scrollIntoView({ behavior: "smooth" });
  };

  updateSmartRecommendation = function updateSmartRecommendationV12() {
    const title = document.getElementById("smart-title");
    const text = document.getElementById("smart-text");
    if (!title || !text) return;

    const label = title.closest(".smart-panel")?.querySelector(".label");
    if (label) label.textContent = t("smartLabel");

    const next = optimizeRoute(getMatchingLocations()).find(loc => !state.completed.has(loc.id));
    if (!next) {
      title.textContent = t("routeDone");
      text.textContent = t("routeDoneText");
      return;
    }

    title.textContent = `${t("nextBest")}: ${locName(next)}`;
    text.textContent = `${t(currentRouteStrategy().labelKey)} · ${routeReason(next)} · ${userPosition ? Math.round(distanceMeters(userPosition.lat, userPosition.lng, ...parseCoords(next.coords))) + " " + t("fromYou") : t("orderedCenter")}`;
  };

  updateArContent = function updateArContentV12() {
    const loc = (activeRoute && activeRoute[0]) || getMatchingLocations()[0] || LOCATIONS[0];
    const frame = document.querySelector(".ar-frame");
    const name = document.getElementById("ar-place-name");
    const fact = document.getElementById("ar-place-fact");
    if (frame && loc?.image) frame.style.setProperty("--guide-image", `url("${loc.image}")`);
    if (name) name.textContent = locName(loc);
    if (fact) fact.textContent = `${routeReason(loc)}. ${firstUsefulFact(loc)}`;
  };

  function estimateRouteMinutes(route) {
    if (!route.length) return 0;
    const travel = route.slice(1).reduce((sum, loc, i) => sum + Math.max(2, Math.round(distanceBetweenLocations(route[i], loc) / 75)), 0);
    const stops = route.reduce((sum, loc) => sum + (Number.parseInt(locDuration(loc), 10) || 15), 0);
    return Math.max(8, travel + stops);
  }

  updateAnalytics = function updateAnalyticsV12() {
    const route = activeRoute.length ? activeRoute : getMatchingLocations();
    const tours = document.getElementById("metric-tours");
    const popular = document.getElementById("metric-popular");
    const topics = document.getElementById("metric-topics");
    const session = document.querySelector("#analytics-panel div:nth-child(3) strong");

    if (tours) tours.textContent = localStorage.getItem("echovratsa_tours_started") || "0";
    if (popular) popular.textContent = route[0] ? locName(route[0]) : locName(LOCATIONS[0]);
    if (topics) topics.textContent = [...selectedTopics].map(topicLabel).join(", ");
    if (session) session.textContent = `${estimateRouteMinutes(route)} min`;

    const btn = document.getElementById("analytics-toggle-btn");
    const panel = document.getElementById("analytics-panel");
    if (btn && panel) btn.textContent = panel.hidden ? t("dashboardButton") : t("dashboardHide");
  };

  function updateDailyChallenge() {
    const visits = Math.min(2, state.completed.size);
    const quizzes = Math.min(1, state.quizSolved.size);
    const visitStep = document.getElementById("challenge-visits-step");
    const quizStep = document.getElementById("challenge-quiz-step");
    const rewardStep = document.getElementById("challenge-reward-step");
    const streak = document.getElementById("streak-pill");
    const complete = visits >= 2 && quizzes >= 1;

    if (visitStep) visitStep.textContent = fillTemplate("challengeVisitProgress", { done: visits });
    if (quizStep) quizStep.textContent = fillTemplate("challengeQuizProgress", { done: quizzes });
    if (rewardStep) rewardStep.textContent = complete ? t("challengeRewardDone") : t("challengeRewardPending");
    if (streak) {
      streak.textContent = complete ? `Streak 2 · ${t("challengeRewardDone")}` : "Streak 1";
      streak.classList.toggle("challenge-complete", complete);
    }
  }

  const renderProgressBeforeV12 = renderProgress;
  renderProgress = function renderProgressWithChallenge() {
    renderProgressBeforeV12();
    updateDailyChallenge();
  };

  const completeStopBeforeV12 = completeStop;
  completeStop = function completeStopWithChallenge(id, stop) {
    completeStopBeforeV12(id, stop);
    updateDailyChallenge();
    updateAnalytics();
  };

  const resetPresentationBeforeV12 = resetPresentationState;
  resetPresentationState = function resetPresentationStateWithChallenge() {
    resetPresentationBeforeV12();
    updateDailyChallenge();
  };

  voiceTitle = function voiceTitleV12() {
    return t("voicePanelTitle");
  };

  updateVoiceAssistant = function updateVoiceAssistantV12(mode = "") {
    const panel = document.getElementById("voice-panel");
    const title = document.getElementById("voice-panel-title");
    const text = document.getElementById("voice-panel-text");
    if (!panel || !title || !text) return;

    const profile = voiceProfile();
    const recordings = RECORDED_NARRATION[selectedLanguage] || {};
    const hasRecordings = Object.keys(recordings).length > 0;
    title.textContent = voiceTitle();
    panel.classList.remove("ready", "speaking", "warning");

    if (mode === "recorded-intro") {
      panel.classList.add("speaking");
      text.textContent = t("voiceIntroRecorded");
      return;
    }

    if (mode === "recorded") {
      panel.classList.add("speaking");
      text.textContent = fillTemplate("voiceRecorded", { language: profile.nativeName });
      return;
    }

    if (hasRecordings) {
      panel.classList.add("ready");
      text.textContent = fillTemplate("voiceReady", { language: profile.nativeName });
    } else {
      panel.classList.add("warning");
      text.textContent = fillTemplate("voiceFallback", { language: profile.nativeName });
    }
  };

  const speakBeforeV12 = speak;
  speak = async function speakRecordedOnly(text, btn, options = {}) {
    const recordedTrack = options.skipRecorded ? null : recordedTrackForButton(btn);
    if (recordedTrack) {
      playRecordedNarration(recordedTrack, btn, text);
      return;
    }

    if (options.allowBrowserVoice) {
      speakBeforeV12(text, btn, { skipRecorded: true });
      return;
    }

    updateVoiceAssistant();
    showPresentationToast?.(t("voiceRecordingMissing"));
  };

  const applyLanguageBeforeV12 = applyLanguage;
  applyLanguage = function applyLanguageWithFeedbackCopy() {
    applyLanguageBeforeV12();
    updateDailyChallenge();
    updateArContent();
  };

  document.addEventListener("DOMContentLoaded", () => {
    updateDailyChallenge();
    updateAnalytics();
    updateArContent();
    updateVoiceAssistant();
  });
})();
