/* ============================================================
   SPROUT — Habit Tracker
   Vanilla JS, no build step, no dependencies.
   Data persists in the browser via localStorage.
   ============================================================ */

const STORAGE_KEY = "sprout-habit-tracker-v1";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ---------------- state ---------------- */
let state = loadState();
let view = { year: new Date().getFullYear(), month: new Date().getMonth() };
let selectedEmoji = "🌱";
let journalSelectedDate = new Date();

function loadState(){
  const empty = { habits: [], logs: {}, books: {}, journal: {} };
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      logs: typeof parsed.logs === "object" && parsed.logs ? parsed.logs : {},
      books: typeof parsed.books === "object" && parsed.books ? parsed.books : {},
      journal: typeof parsed.journal === "object" && parsed.journal ? parsed.journal : {}
    };
  }catch(e){
    console.error("Sprout: state load failed, starting fresh.", e);
    return empty;
  }
}

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){
    console.error("Sprout: could not save (storage full or blocked).", e);
  }
}

/* ---------------- date helpers ---------------- */
function pad(n){ return String(n).padStart(2,"0"); }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function logKey(habitId, y, m, d){ return `${habitId}_${y}-${pad(m+1)}-${pad(d)}`; }
function dateKey(y, m, d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function sameDate(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function isFutureDate(y,m,d){
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(y,m,d);
  return target > today;
}

/* ---------------- streaks ---------------- */
function computeStreak(habitId){
  let streak = 0;
  let cursor = new Date();
  const keyFor = (d) => logKey(habitId, d.getFullYear(), d.getMonth(), d.getDate());

  // an unfinished "today" shouldn't zero out yesterday's streak
  if(!state.logs[keyFor(cursor)]){
    cursor.setDate(cursor.getDate() - 1);
  }
  while(state.logs[keyFor(cursor)]){
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function bestStreak(){
  if(state.habits.length === 0) return 0;
  return Math.max(0, ...state.habits.map(h => computeStreak(h.id)));
}

function todayCompletionCount(){
  const today = new Date();
  const done = state.habits.filter(h => state.logs[logKey(h.id, today.getFullYear(), today.getMonth(), today.getDate())]).length;
  return { done, total: state.habits.length };
}

/* ---------------- month stats ---------------- */
function monthStats(y, m){
  const totalDays = daysInMonth(y, m);
  const today = new Date();
  let consideredDays;
  if(y === today.getFullYear() && m === today.getMonth()){
    consideredDays = today.getDate();
  } else if(new Date(y, m, 1) > today){
    consideredDays = 0;
  } else {
    consideredDays = totalDays;
  }

  let completed = 0;
  const totalCells = consideredDays * state.habits.length;
  state.habits.forEach(h => {
    for(let d = 1; d <= consideredDays; d++){
      if(state.logs[logKey(h.id, y, m, d)]) completed++;
    }
  });

  const percent = totalCells > 0 ? Math.round((completed / totalCells) * 100) : 0;
  return { percent, completed, totalDays };
}

/* ---------------- books ---------------- */
const BOOKS = {
  humanPsych: [
    { id: "hp1", title: "Thinking, Fast and Slow", author: "Daniel Kahneman" },
    { id: "hp2", title: "Influence", author: "Robert Cialdini" },
    { id: "hp3", title: "Predictably Irrational", author: "Dan Ariely" },
    { id: "hp4", title: "Quiet", author: "Susan Cain" },
    { id: "hp5", title: "Emotional Intelligence", author: "Daniel Goleman" }
  ],
  moneyPsych: [
    { id: "mp1", title: "The Psychology of Money", author: "Morgan Housel" },
    { id: "mp2", title: "Rich Dad Poor Dad", author: "Robert Kiyosaki" },
    { id: "mp3", title: "Your Money or Your Life", author: "Vicki Robin" },
    { id: "mp4", title: "The Millionaire Next Door", author: "Thomas J. Stanley" },
    { id: "mp5", title: "I Will Teach You to Be Rich", author: "Ramit Sethi" }
  ],
  selfImprovement: [
    { id: "si1", title: "Atomic Habits", author: "James Clear" },
    { id: "si2", title: "The 7 Habits of Highly Effective People", author: "Stephen Covey" },
    { id: "si3", title: "How to Win Friends and Influence People", author: "Dale Carnegie" },
    { id: "si4", title: "The Power of Now", author: "Eckhart Tolle" },
    { id: "si5", title: "Mindset", author: "Carol Dweck" },
    { id: "si6", title: "Deep Work", author: "Cal Newport" },
    { id: "si7", title: "The Subtle Art of Not Giving a F*ck", author: "Mark Manson" },
    { id: "si8", title: "Man's Search for Meaning", author: "Viktor Frankl" },
    { id: "si9", title: "The 5 AM Club", author: "Robin Sharma" },
    { id: "si10", title: "Grit", author: "Angela Duckworth" }
  ]
};

/* ---------------- PDF storage (IndexedDB — files can be big, localStorage isn't fit for that) ---------------- */
const PDF_DB_NAME = "sprout-pdfs";
const PDF_STORE = "pdfs";

function openPdfDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PDF_DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(PDF_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function savePdf(id, file){
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, "readwrite");
    tx.objectStore(PDF_STORE).put({ blob: file, name: file.name, savedAt: Date.now() }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getPdf(id){
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, "readonly");
    const req = tx.objectStore(PDF_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function deletePdf(id){
  const db = await openPdfDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PDF_STORE, "readwrite");
    tx.objectStore(PDF_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function setRibbon(li, pct){
  li.style.setProperty("--ribbon-opacity", String(0.15 + (pct / 100) * 0.85));
}

function renderBookGroup(listId, books){
  const ul = document.getElementById(listId);
  ul.innerHTML = "";
  books.forEach(book => {
    const pct = state.books[book.id] || 0;
    const li = document.createElement("li");
    li.className = "book-item";
    li.dataset.id = book.id;
    setRibbon(li, pct);
    li.innerHTML = `
      <div class="book-info">
        <span class="book-title">${escapeHtml(book.title)}</span>
        <span class="book-author">${escapeHtml(book.author)}</span>
      </div>
      <div class="book-pdf-zone" data-id="${book.id}">
        <input type="file" accept="application/pdf" class="pdf-file-input" id="pdf-input-${book.id}" hidden>
        <div class="pdf-zone-empty">
          <label for="pdf-input-${book.id}" class="pdf-drop-label">
            <span class="pdf-drop-icon">📄⬆</span>
            <span>Drop a PDF here or tap to upload your copy</span>
          </label>
        </div>
        <div class="pdf-zone-filled" hidden>
          <span class="pdf-file-name"></span>
          <div class="pdf-actions">
            <button type="button" class="pdf-read-btn">📖 Read</button>
            <button type="button" class="pdf-replace-btn">Replace</button>
            <button type="button" class="pdf-remove-btn" aria-label="Remove PDF">✕</button>
          </div>
        </div>
      </div>
      <div class="book-progress">
        <input type="range" class="book-slider" min="0" max="100" step="5" value="${pct}" data-id="${book.id}" aria-label="${escapeHtml(book.title)} — percent read">
        <span class="book-pct">${pct}%</span>
      </div>`;
    ul.appendChild(li);
    wirePdfZone(li, book.id);
  });
}

function wirePdfZone(li, id){
  const zone = li.querySelector(".book-pdf-zone");
  const input = li.querySelector(".pdf-file-input");
  const emptyView = li.querySelector(".pdf-zone-empty");
  const filledView = li.querySelector(".pdf-zone-filled");
  const nameEl = li.querySelector(".pdf-file-name");

  function showFilled(name){
    nameEl.textContent = name;
    nameEl.title = name;
    emptyView.hidden = true;
    filledView.hidden = false;
  }
  function showEmpty(){
    emptyView.hidden = false;
    filledView.hidden = true;
  }

  async function handleFile(file){
    if(!file) return;
    if(file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")){
      alert("Please choose a PDF file.");
      return;
    }
    await savePdf(id, file);
    showFilled(file.name);
  }

  // initial state — check IndexedDB for an existing upload
  getPdf(id).then(rec => { if(rec) showFilled(rec.name); }).catch(() => {});

  input.addEventListener("change", (e) => handleFile(e.target.files[0]));

  ["dragover", "dragenter"].forEach(evt => {
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add("dragover"); });
  });
  ["dragleave", "dragend"].forEach(evt => {
    zone.addEventListener(evt, () => zone.classList.remove("dragover"));
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
  });

  li.querySelector(".pdf-read-btn").addEventListener("click", async () => {
    const rec = await getPdf(id);
    if(!rec){ alert("No PDF uploaded yet."); return; }
    const url = URL.createObjectURL(rec.blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  li.querySelector(".pdf-replace-btn").addEventListener("click", () => input.click());

  li.querySelector(".pdf-remove-btn").addEventListener("click", async () => {
    if(!confirm("Remove this uploaded PDF?")) return;
    await deletePdf(id);
    input.value = "";
    showEmpty();
  });
}

function renderBooks(){
  renderBookGroup("booksHumanPsych", BOOKS.humanPsych);
  renderBookGroup("booksMoneyPsych", BOOKS.moneyPsych);
  renderBookGroup("booksSelfImprovement", BOOKS.selfImprovement);
}

document.getElementById("bookModalOverlay").addEventListener("input", (e) => {
  if(!e.target.classList.contains("book-slider")) return;
  const id = e.target.dataset.id;
  const val = Number(e.target.value);
  state.books[id] = val;
  const li = e.target.closest(".book-item");
  li.querySelector(".book-pct").textContent = val + "%";
  setRibbon(li, val);
  saveState();
});

/* ---------------- growth & challenge prompts ---------------- */
const PROMPTS = {
  selfImprove: [
    "What is one habit that, if you kept it for a year, would change your life the most?",
    "What would you attempt if you knew you couldn't fail?",
    "What did you learn this week that your past self didn't know?",
    "Which relationship in your life needs more of your attention right now?",
    "What's one thing you're avoiding that you know you should face?",
    "If today were a rehearsal for the rest of your life, what would you change?",
    "What does \"success\" mean to you today, versus a year ago?",
    "What's a fear you've outgrown, and how did that happen?",
    "Who do you need to forgive — including yourself?",
    "What would the most disciplined version of you do today that you're not doing?"
  ],
  growth: [
    "What's a mistake you made that taught you more than any success has?",
    "Where in your life are you playing small, and why?",
    "What's one belief about yourself you're ready to let go of?",
    "When did you last feel truly proud of yourself, and what led to it?",
    "What pattern keeps repeating in your life that you're ready to break?",
    "What would you do differently if no one was watching or judging you?",
    "What's something uncomfortable that helped you grow the most?",
    "Who in your life reflects the person you're trying to become?",
    "What's one thing you needed to hear today that you can tell yourself?",
    "If your future self could send you one piece of advice right now, what would it be?"
  ],
  physical: [
    "Take a 20-minute walk outside before noon.",
    "Do a 10-minute bodyweight circuit — squats, push-ups, and planks.",
    "Stretch for 10 minutes before bed tonight.",
    "Drink a full glass of water first thing after waking up.",
    "Take the stairs instead of the elevator, all day.",
    "Do 50 push-ups spread across the day, in any sets.",
    "Go 30 minutes without checking your phone while moving your body.",
    "Try a new physical activity you've never done before this week.",
    "Sit with a straight spine for one full hour today — no slouching.",
    "Sleep 30 minutes earlier than usual tonight."
  ],
  mind: [
    "Sit in silence for 5 minutes and just breathe.",
    "Write down 3 things you're grateful for before checking your phone.",
    "Go 1 hour without complaining about anything, out loud or in your head.",
    "Practice box breathing (4-4-4-4) for 2 minutes when you feel stressed.",
    "Spend 10 minutes in nature without any screen nearby.",
    "Say one kind thing to yourself out loud today.",
    "Do a \"digital sunset\" — no screens for the last 30 minutes before bed.",
    "Name the emotion you're feeling right now, without judging it.",
    "Let go of one grudge, even just for today.",
    "Sit with a difficult thought for 60 seconds without trying to fix it."
  ]
};

function pulseField(el){
  el.classList.remove("field-pulse");
  void el.offsetWidth; // restart animation
  el.classList.add("field-pulse");
}

function journalThis(question){
  const textarea = document.getElementById("journalText");
  const current = textarea.value.trim();
  textarea.value = current ? `${current}\n\nQ: ${question}\n` : `Q: ${question}\n`;
  closeBookModal();
  document.querySelector(".journal-card").scrollIntoView({ behavior: "smooth", block: "start" });
  textarea.focus();
  pulseField(textarea);
}

function addChallengeAsHabit(text, emoji){
  const input = document.getElementById("habitInput");
  input.value = text.length > 40 ? text.slice(0, 37) + "…" : text;
  document.querySelectorAll(".emoji-opt").forEach(b => b.classList.remove("active"));
  const match = document.querySelector(`.emoji-opt[data-emoji="${emoji}"]`);
  if(match) match.classList.add("active");
  selectedEmoji = emoji;
  closeBookModal();
  document.querySelector(".add-card").scrollIntoView({ behavior: "smooth", block: "center" });
  input.focus();
  pulseField(input);
}

function renderPromptGroup(listId, prompts, kind){
  const ul = document.getElementById(listId);
  ul.innerHTML = "";
  prompts.forEach(text => {
    const li = document.createElement("li");
    li.className = "prompt-item";
    const actionIcon = kind === "journal" ? "📝" : "➕";
    const actionTitle = kind === "journal" ? "Journal this" : "Add as habit";
    li.innerHTML = `
      <span class="prompt-text">${escapeHtml(text)}</span>
      <button type="button" class="prompt-action" title="${actionTitle}" aria-label="${actionTitle}">${actionIcon}</button>`;
    li.querySelector(".prompt-action").addEventListener("click", (e) => {
      if(kind === "journal"){
        journalThis(text);
      } else {
        addChallengeAsHabit(text, kind === "physical" ? "🏃" : "🧘");
        e.currentTarget.classList.add("added");
        setTimeout(() => e.currentTarget.classList.remove("added"), 1200);
      }
    });
    ul.appendChild(li);
  });
}

function renderPrompts(){
  renderPromptGroup("promptsSelfImprove", PROMPTS.selfImprove, "journal");
  renderPromptGroup("promptsGrowth", PROMPTS.growth, "journal");
  renderPromptGroup("promptsPhysical", PROMPTS.physical, "physical");
  renderPromptGroup("promptsMind", PROMPTS.mind, "mind");
}


/* ---------------- journaling ---------------- */
function formatJournalLabel(d){
  const today = new Date();
  if(sameDate(d, today)) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function renderJournalCalendar(){
  const el = document.getElementById("journalCalendar");
  el.innerHTML = "";

  const totalDays = daysInMonth(view.year, view.month);
  const firstDow = new Date(view.year, view.month, 1).getDay();

  for(let i = 0; i < firstDow; i++){
    const pad_ = document.createElement("div");
    pad_.className = "cal-cell pad";
    el.appendChild(pad_);
  }

  for(let d = 1; d <= totalDays; d++){
    const cellDate = new Date(view.year, view.month, d);
    const future = isFutureDate(view.year, view.month, d);
    const hasEntry = !!(state.journal[dateKey(view.year, view.month, d)] || "").trim();

    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if(hasEntry) cell.classList.add("journaled");
    if(future) cell.classList.add("future");
    if(sameDate(cellDate, journalSelectedDate)) cell.classList.add("selected");
    cell.textContent = d;
    cell.title = future ? "Can't journal for a future day yet" : formatJournalLabel(cellDate);

    if(!future){
      cell.addEventListener("click", () => selectJournalDay(view.year, view.month, d));
    }
    el.appendChild(cell);
  }
}

function selectJournalDay(y, m, d){
  journalSelectedDate = new Date(y, m, d);
  document.getElementById("journalSelectedLabel").textContent = formatJournalLabel(journalSelectedDate);
  document.getElementById("journalText").value = state.journal[dateKey(y, m, d)] || "";
  renderJournalCalendar();
}

function saveJournalEntry(){
  const { year, month, date } = { year: journalSelectedDate.getFullYear(), month: journalSelectedDate.getMonth(), date: journalSelectedDate.getDate() };
  const key = dateKey(year, month, date);
  const text = document.getElementById("journalText").value.trim();
  if(text) state.journal[key] = text;
  else delete state.journal[key];
  saveState();
  renderJournalCalendar();
}

/* ---------------- rendering ---------------- */
function renderMonthLabel(){
  document.getElementById("monthName").textContent = MONTHS[view.month];
  document.getElementById("yearName").textContent = view.year;
}

function renderStats(){
  const { percent, completed } = monthStats(view.year, view.month);

  const circumference = 2 * Math.PI * 50;
  const ringFill = document.getElementById("ringProgress");
  ringFill.style.strokeDasharray = circumference;
  ringFill.style.strokeDashoffset = circumference * (1 - percent / 100);
  document.getElementById("ringPercent").textContent = percent + "%";

  document.getElementById("statCompleted").textContent = completed;
  document.getElementById("statStreak").textContent = bestStreak();

  const { done, total } = todayCompletionCount();
  document.getElementById("statToday").textContent = `${done}/${total}`;
}

function renderHeatmap(){
  const el = document.getElementById("heatmap");
  el.innerHTML = "";
  const totalDays = daysInMonth(view.year, view.month);
  const today = new Date();
  const habitCount = state.habits.length;

  for(let d = 1; d <= totalDays; d++){
    const doneCount = habitCount === 0 ? 0 : state.habits.filter(h => state.logs[logKey(h.id, view.year, view.month, d)]).length;
    let lvl = 0;
    if(habitCount > 0 && doneCount > 0){
      lvl = Math.min(4, Math.max(1, Math.ceil((doneCount / habitCount) * 4)));
    }
    const cell = document.createElement("div");
    cell.className = "heat-cell";
    cell.dataset.lvl = String(lvl);
    cell.title = `${MONTHS[view.month]} ${d}: ${doneCount}/${habitCount} completed`;
    if(sameDate(new Date(view.year, view.month, d), today)) cell.classList.add("is-today");
    el.appendChild(cell);
  }
}

function renderGrid(){
  const totalDays = daysInMonth(view.year, view.month);
  const today = new Date();

  // header row
  const headerRow = document.getElementById("dayHeaderRow");
  headerRow.innerHTML = "";
  const corner = document.createElement("th");
  corner.className = "habit-th-corner";
  corner.textContent = "Habit";
  headerRow.appendChild(corner);

  for(let d = 1; d <= totalDays; d++){
    const th = document.createElement("th");
    th.className = "day-th";
    const dow = new Date(view.year, view.month, d).getDay();
    if(sameDate(new Date(view.year, view.month, d), today)) th.classList.add("is-today");
    th.innerHTML = `${d}<span class="wd">${WEEKDAYS[dow]}</span>`;
    headerRow.appendChild(th);
  }

  // body rows
  const body = document.getElementById("habitBody");
  body.innerHTML = "";

  document.getElementById("emptyState").hidden = state.habits.length > 0;

  state.habits.forEach(habit => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.className = "habit-name-cell";
    const streak = computeStreak(habit.id);
    nameTd.innerHTML = `
      <div class="habit-name-row">
        <div class="habit-name-main">
          <span class="h-emoji">${habit.emoji}</span>
          <span class="h-label">${escapeHtml(habit.name)}</span>
        </div>
        <span class="habit-streak">${streak > 0 ? "🔥" + streak : ""}</span>
        <button class="del-btn" data-id="${habit.id}" title="Delete habit" aria-label="Delete habit">✕</button>
      </div>`;
    tr.appendChild(nameTd);

    for(let d = 1; d <= totalDays; d++){
      const td = document.createElement("td");
      td.className = "toggle-cell";
      const future = isFutureDate(view.year, view.month, d);
      const done = !!state.logs[logKey(habit.id, view.year, view.month, d)];
      const toggle = document.createElement("div");
      toggle.className = "toggle" + (done ? " done" : "") + (future ? " future" : "");
      toggle.textContent = done ? "✓" : "";
      if(!future){
        toggle.tabIndex = 0;
        toggle.setAttribute("role","checkbox");
        toggle.setAttribute("aria-checked", String(done));
        toggle.addEventListener("click", () => toggleDay(habit.id, d));
        toggle.addEventListener("keydown", (e) => {
          if(e.key === "Enter" || e.key === " "){ e.preventDefault(); toggleDay(habit.id, d); }
        });
      }
      td.appendChild(toggle);
      tr.appendChild(td);
    }

    body.appendChild(tr);
  });

  // wire up delete buttons
  body.querySelectorAll(".del-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteHabit(btn.dataset.id));
  });
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderAll(){
  renderMonthLabel();
  renderGrid();
  renderStats();
  renderHeatmap();
  renderJournalCalendar();
}

/* ---------------- actions ---------------- */
function toggleDay(habitId, day){
  const key = logKey(habitId, view.year, view.month, day);
  if(state.logs[key]) delete state.logs[key];
  else state.logs[key] = true;
  saveState();
  renderAll();
}

function addHabit(){
  const input = document.getElementById("habitInput");
  const name = input.value.trim();
  if(!name) { input.focus(); return; }

  state.habits.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    name,
    emoji: selectedEmoji
  });
  saveState();
  input.value = "";
  renderAll();
}

function deleteHabit(id){
  const habit = state.habits.find(h => h.id === id);
  if(!habit) return;
  if(!confirm(`Delete "${habit.name}"? All of its tracked data will be lost too.`)) return;

  state.habits = state.habits.filter(h => h.id !== id);
  Object.keys(state.logs).forEach(k => {
    if(k.startsWith(id + "_")) delete state.logs[k];
  });
  saveState();
  renderAll();
}

/* ---------------- event wiring ---------------- */
document.getElementById("prevMonth").addEventListener("click", () => {
  view.month--;
  if(view.month < 0){ view.month = 11; view.year--; }
  renderAll();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  view.month++;
  if(view.month > 11){ view.month = 0; view.year++; }
  renderAll();
});

document.getElementById("addHabitBtn").addEventListener("click", addHabit);
document.getElementById("habitInput").addEventListener("keydown", (e) => {
  if(e.key === "Enter") addHabit();
});

document.getElementById("emojiPick").addEventListener("click", (e) => {
  const btn = e.target.closest(".emoji-opt");
  if(!btn) return;
  document.querySelectorAll(".emoji-opt").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedEmoji = btn.dataset.emoji;
});

document.getElementById("saveJournalBtn").addEventListener("click", saveJournalEntry);

/* ---------------- books menu (kebab) ---------------- */
const menuBtn = document.getElementById("menuBtn");
const bookModalOverlay = document.getElementById("bookModalOverlay");

function openBookModal(){
  bookModalOverlay.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
  document.getElementById("closeModalBtn").focus();
}
function closeBookModal(){
  bookModalOverlay.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.focus();
}

menuBtn.addEventListener("click", openBookModal);
document.getElementById("closeModalBtn").addEventListener("click", closeBookModal);
bookModalOverlay.addEventListener("click", (e) => {
  if(e.target === bookModalOverlay) closeBookModal();
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !bookModalOverlay.hidden) closeBookModal();
});

const tabBtnReads = document.getElementById("tabBtnReads");
const tabBtnGrowth = document.getElementById("tabBtnGrowth");
const panelReads = document.getElementById("panelReads");
const panelGrowth = document.getElementById("panelGrowth");

function showTab(which){
  const readsActive = which === "reads";
  tabBtnReads.classList.toggle("active", readsActive);
  tabBtnGrowth.classList.toggle("active", !readsActive);
  tabBtnReads.setAttribute("aria-selected", String(readsActive));
  tabBtnGrowth.setAttribute("aria-selected", String(!readsActive));
  panelReads.hidden = !readsActive;
  panelGrowth.hidden = readsActive;
}

tabBtnReads.addEventListener("click", () => showTab("reads"));
tabBtnGrowth.addEventListener("click", () => showTab("growth"));

/* ---------------- init ---------------- */
renderAll();
renderBooks();
renderPrompts();
selectJournalDay(journalSelectedDate.getFullYear(), journalSelectedDate.getMonth(), journalSelectedDate.getDate());
