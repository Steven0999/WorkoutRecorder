/* Workout Builder + History
 * - Step 1: collect session setup
 * - Step 2: build workout (table). Sets -> auto create reps/weight inputs per set
 * - Step 3: history & charts (Chart.js). Data stored in localStorage.
 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const STORAGE_KEY = "wb_history_v1";

  // ---- EXERCISE LIBRARY (focus tags + equipment tags) ----
  // Keep it compact but useful. You can add more easily.
  const EXERCISE_LIBRARY = [
    // Push
    { n: "Barbell Bench Press", f: ["push","upper"], e: ["Barbell","Machines"] },
    { n: "Dumbbell Bench Press", f: ["push","upper"], e: ["Dumbbells"] },
    { n: "Incline Bench Press", f: ["push","upper"], e: ["Barbell","Dumbbells","Machines"] },
    { n: "Overhead Press", f: ["push","upper"], e: ["Barbell","Dumbbells"] },
    { n: "Seated Shoulder Press (Machine)", f:["push","upper"], e:["Machines"] },
    { n: "Push-Up", f:["push","upper","full body"], e:["Bodyweight"] },
    { n: "Dips", f:["push","upper"], e:["Bodyweight","Machines"] },

    // Pull
    { n: "Pull-Up / Chin-Up", f:["pull","upper"], e:["Bodyweight","Bands","Machines"] },
    { n: "Lat Pulldown", f:["pull","upper"], e:["Machines"] },
    { n: "Barbell Row", f:["pull","upper","hinge"], e:["Barbell"] },
    { n: "Dumbbell Row", f:["pull","upper"], e:["Dumbbells"] },
    { n: "Seated Row (Cable)", f:["pull","upper"], e:["Machines"] },
    { n: "Face Pull", f:["pull","upper"], e:["Bands","Machines"] },
    { n: "Biceps Curl (DB)", f:["pull","upper","specific muscle"], e:["Dumbbells"] },
    { n: "Barbell Curl", f:["pull","upper","specific muscle"], e:["Barbell"] },

    // Hinge
    { n: "Deadlift", f:["hinge","lower"], e:["Barbell"] },
    { n: "Romanian Deadlift (Barbell)", f:["hinge","lower"], e:["Barbell"] },
    { n: "Romanian Deadlift (DB)", f:["hinge","lower"], e:["Dumbbells"] },
    { n: "Kettlebell Swing", f:["hinge","full body"], e:["Kettlebell"] },
    { n: "Hip Thrust", f:["hinge","lower"], e:["Barbell","Machines","Dumbbells"] },
    { n: "Good Morning", f:["hinge","lower"], e:["Barbell"] },

    // Squat
    { n: "Back Squat", f:["squat","lower"], e:["Barbell"] },
    { n: "Front Squat", f:["squat","lower"], e:["Barbell"] },
    { n: "Goblet Squat", f:["squat","lower"], e:["Dumbbells","Kettlebell"] },
    { n: "Leg Press", f:["squat","lower"], e:["Machines"] },
    { n: "Lunge (DB)", f:["squat","lower"], e:["Dumbbells"] },
    { n: "Split Squat (DB)", f:["squat","lower"], e:["Dumbbells"] },

    // Core
    { n: "Plank", f:["core","full body"], e:["Bodyweight"] },
    { n: "Hanging Leg Raise", f:["core"], e:["Bodyweight","Machines"] },
    { n: "Cable Crunch", f:["core","specific muscle"], e:["Machines"] },
    { n: "Ab Wheel Rollout", f:["core"], e:["Other"] },

    // Full body / misc
    { n: "Clean & Press", f:["full body","hinge","push"], e:["Barbell"] },
    { n: "Thruster (DB)", f:["full body","squat","push"], e:["Dumbbells"] },
    { n: "Farmer's Carry", f:["full body"], e:["Dumbbells","Kettlebell"] },
    { n: "Machine Chest Fly", f:["push","specific muscle"], e:["Machines"] },
    { n: "Triceps Pushdown", f:["push","specific muscle"], e:["Machines"] },
  ];

  // ---- STATE ----
  let sessionConfig = null;  // filled after setup
  let chart = null;

  // ---- ELEMENTS ----
  const tabs = $$(".tab");
  const views = $$(".view");
  const setupForm = $("#setupForm");
  const whenRadios = $$('input[name="when"]', setupForm);
  const sessionDate = $("#sessionDate");
  const specificFocusChk = $("#specificFocusChk");
  const specificFocusTxt = $("#specificFocusTxt");
  const otherEquipChk = $("#otherEquipChk");
  const otherEquipTxt = $("#otherEquipTxt");

  const builderView = $("#builder");
  const sessionSummary = $("#sessionSummary");
  const addExerciseBtn = $("#addExercise");
  const backToSetupBtn = $("#backToSetup");
  const workoutBody = $("#workoutBody");
  const exerciseSuggestions = $("#exerciseSuggestions");
  const computeTotalsBtn = $("#computeTotals");
  const finishSaveBtn = $("#finishSave");
  const totalSetsEl = $("#totalSets");
  const totalRepsEl = $("#totalReps");
  const totalVolumeEl = $("#totalVolume");

  const summaryDialog = $("#summaryDialog");
  const summaryMeta = $("#summaryMeta");
  const summaryTableBody = $("#summaryTable tbody");
  const sumSets = $("#sumSets");
  const sumReps = $("#sumReps");
  const sumVolume = $("#sumVolume");

  const historyView = $("#history");
  const historyExerciseSel = $("#historyExercise");
  const historyMetricSel = $("#historyMetric");
  const historyTableBody = $("#historyTable tbody");
  const clearHistoryBtn = $("#clearHistory");
  const chartCanvas = $("#progressChart");

  // ---- INIT ----
  initTabs();
  initSetup();
  initBuilder();
  initHistory();
  renderHistoryUI(); // populate initial chart (if any)

  // ---- Tabs / Views ----
  function initTabs() {
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const target = btn.dataset.target;
        views.forEach(v => v.classList.toggle("active", `#${v.id}` === target));
      });
    });
  }

  // ---- Setup step ----
  function initSetup() {
    // when: now vs date
    whenRadios.forEach(r => r.addEventListener("change", () => {
      sessionDate.disabled = (getSelectedWhen() !== "date");
      if (!sessionDate.disabled && !sessionDate.value) {
        sessionDate.valueAsDate = new Date();
      }
    }));

    specificFocusChk.addEventListener("change", () => {
      specificFocusTxt.disabled = !specificFocusChk.checked;
      if (!specificFocusChk.checked) specificFocusTxt.value = "";
    });

    otherEquipChk.addEventListener("change", () => {
      otherEquipTxt.disabled = !otherEquipChk.checked;
      if (!otherEquipChk.checked) otherEquipTxt.value = "";
    });

    setupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // collect config
      const location = $("#location").value;
      if (!location) { alert("Please select where you're training."); return; }

      const when = getSelectedWhen();
      const dateISO = (when === "now")
        ? new Date().toISOString()
        : (sessionDate.value ? new Date(sessionDate.value).toISOString() : new Date().toISOString());

      const focus = $$("#focusGroup input[type=checkbox]:checked")
        .map(cb => cb.value);
      let specific = specificFocusTxt.value.trim();
      if (specific && !focus.includes("specific muscle")) focus.push("specific muscle");

      const equip = $$("#equipGroup input[type=checkbox]:checked")
        .map(cb => cb.value);
      const otherTxt = otherEquipTxt.value.split(",").map(s => s.trim()).filter(Boolean);
      const equipment = Array.from(new Set(equip.concat(otherTxt)));

      sessionConfig = { location, dateISO, focus, specific, equipment };

      // suggestions based on chosen focus/equipment
      fillExerciseSuggestions(sessionConfig);

      // update summary line
      sessionSummary.innerHTML = [
        `Date: <code>${formatDateShort(new Date(sessionConfig.dateISO))}</code>`,
        `Where: <code>${sessionConfig.location}</code>`,
        `Focus: <code>${(sessionConfig.focus.join(", ") || "n/a")}${sessionConfig.specific ? ` (${sessionConfig.specific})` : ""}</code>`,
        `Equipment: <code>${sessionConfig.equipment.join(", ") || "n/a"}</code>`
      ].join(" • ");

      // go to builder tab
      selectTab("#builder");
      // if no rows yet, add the first one
      if (!workoutBody.children.length) addExerciseRow();
    });
  }

  function getSelectedWhen() {
    const r = whenRadios.find(x => x.checked);
    return r ? r.value : "now";
  }

  function fillExerciseSuggestions(cfg) {
    exerciseSuggestions.innerHTML = "";
    const chosenFocus = new Set(cfg.focus);
    const chosenEquip = new Set(cfg.equipment);
    const allowAllEquip = chosenEquip.size === 0;

    const list = EXERCISE_LIBRARY.filter(item => {
      const matchesFocus = chosenFocus.size === 0 || item.f.some(t => chosenFocus.has(t));
      const matchesEquip = allowAllEquip || item.e.some(t => chosenEquip.has(t) || chosenEquip.has("Other"));
      return matchesFocus && matchesEquip;
    });

    // always include everything as fallback duplicates are okay (datalist shows all)
    const names = Array.from(new Set(list.map(x => x.n).concat(EXERCISE_LIBRARY.map(x => x.n))));
    names.sort((a,b) => a.localeCompare(b));
    names.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      exerciseSuggestions.appendChild(opt);
    });
  }

  // ---- Builder step ----
  function initBuilder() {
    addExerciseBtn.addEventListener("click", () => addExerciseRow());
    backToSetupBtn.addEventListener("click", () => selectTab("#setup"));
    computeTotalsBtn.addEventListener("click", computeTotals);
    finishSaveBtn.addEventListener("click", finishAndSave);
  }

  function addExerciseRow(initial = null) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input class="ex-name" list="exerciseSuggestions" placeholder="Choose or type exercise" value="${initial?.name || ""}">
      </td>
      <td>
        <input class="ex-sets" type="number" min="1" max="20" value="${initial?.setsCount || 3}">
      </td>
      <td>
        <div class="sets-pairs"></div>
      </td>
      <td>
        <input class="ex-notes" type="text" placeholder="Notes (optional)" value="${initial?.notes || ""}">
      </td>
      <td>
        <button class="remove-row" title="Remove row">✖</button>
      </td>
    `;
    const setsInput = $(".ex-sets", tr);
    const pairsWrap = $(".sets-pairs", tr);
    const removeBtn = $(".remove-row", tr);

    // render initial pairs
    renderSetPairs(pairsWrap, +setsInput.value, initial?.sets || []);

    // adjust on change
    setsInput.addEventListener("input", () => {
      const val = clamp(parseInt(setsInput.value || "0", 10), 1, 20);
      setsInput.value = val;
      renderSetPairs(pairsWrap, val);
    });

    pairsWrap.addEventListener("input", () => debounceComputeTotals());
    $(".ex-name", tr).addEventListener("input", () => debounceComputeTotals());
    $(".ex-notes", tr).addEventListener("input", () => { /* nothing */ });

    removeBtn.addEventListener("click", () => {
      tr.remove();
      computeTotals();
    });

    workoutBody.appendChild(tr);
    computeTotals();
    return tr;
  }

  function renderSetPairs(container, count, existing = []) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const pair = document.createElement("div");
      pair.className = "pair";
      const repVal = existing[i]?.reps ?? "";
      const wtVal = existing[i]?.weight ?? "";
      pair.innerHTML = `
        <input type="number" class="reps" min="1" placeholder="Reps" value="${repVal}">
        <input type="number" class="weight" min="0" step="0.5" placeholder="Weight" value="${wtVal}">
      `;
      container.appendChild(pair);
    }
  }

  let computeDebTimer = null;
  function debounceComputeTotals() {
    clearTimeout(computeDebTimer);
    computeDebTimer = setTimeout(computeTotals, 150);
  }

  function computeTotals() {
    const rows = $$("#workoutBody tr");
    let totalSets = 0, totalReps = 0, totalVolume = 0;

    rows.forEach(tr => {
      const sets = +$(".ex-sets", tr).value || 0;
      totalSets += sets;
      $$(".pair", tr).forEach(p => {
        const reps = +$(".reps", p).value || 0;
        const weight = +$(".weight", p).value || 0;
        totalReps += reps;
        totalVolume += reps * weight;
      });
    });

    totalSetsEl.textContent = totalSets;
    totalRepsEl.textContent = totalReps;
    totalVolumeEl.textContent = round1(totalVolume);
  }

  function collectWorkout() {
    const entries = [];
    $$("#workoutBody tr").forEach(tr => {
      const name = $(".ex-name", tr).value.trim();
      if (!name) return; // skip empty
      const notes = $(".ex-notes", tr).value.trim();
      const sets = $$(".pair", tr).map(p => ({
        reps: +$(".reps", p).value || 0,
        weight: +$(".weight", p).value || 0
      }));
      entries.push({ name, notes, sets });
    });
    return entries;
  }

  function finishAndSave() {
    const entries = collectWorkout();
    if (!entries.length) {
      alert("Add at least one exercise with some sets.");
      return;
    }
    // compute totals + per-exercise summary
    const per = entries.map(e => {
      const reps = e.sets.reduce((a, s) => a + (s.reps || 0), 0);
      const volume = e.sets.reduce((a, s) => a + (s.reps * s.weight || 0), 0);
      return { name: e.name, sets: e.sets.length, reps, volume };
    });
    const totals = {
      sets: per.reduce((a, x) => a + x.sets, 0),
      reps: per.reduce((a, x) => a + x.reps, 0),
      volume: round1(per.reduce((a, x) => a + x.volume, 0))
    };

    // Save to history
    const record = {
      id: cryptoRandomId(),
      dateISO: sessionConfig?.dateISO || new Date().toISOString(),
      location: sessionConfig?.location || "Unknown",
      focus: sessionConfig?.focus || [],
      specific: sessionConfig?.specific || "",
      equipment: sessionConfig?.equipment || [],
      entries,
      totals
    };
    const history = loadHistory();
    history.push(record);
    saveHistory(history);

    // Update UI: history + chart + dropdowns
    renderHistoryUI();

    // Show summary dialog
    populateSummaryDialog(record, per);
    if (typeof summaryDialog.showModal === "function") {
      summaryDialog.showModal();
    } else {
      alert("Workout saved! (Your browser doesn't support <dialog>.)");
    }
    computeTotals(); // refresh footer totals
  }

  function populateSummaryDialog(record, per) {
    summaryMeta.textContent = `${formatDateLong(new Date(record.dateISO))} • ${record.location}`;
    summaryTableBody.innerHTML = "";
    per.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.name)}</td>
        <td>${row.sets}</td>
        <td>${row.reps}</td>
        <td>${round1(row.volume)}</td>
      `;
      summaryTableBody.appendChild(tr);
    });
    sumSets.textContent = per.reduce((a,x)=>a+x.sets,0);
    sumReps.textContent = per.reduce((a,x)=>a+x.reps,0);
    sumVolume.textContent = round1(per.reduce((a,x)=>a+x.volume,0));
  }

  // ---- History & Charts ----
  function initHistory() {
    historyExerciseSel.addEventListener("change", renderChartAndTable);
    historyMetricSel.addEventListener("change", renderChartAndTable);
    clearHistoryBtn.addEventListener("click", () => {
      if (!confirm("Clear all saved workouts? This cannot be undone.")) return;
      saveHistory([]);
      renderHistoryUI();
    });
  }

  function renderHistoryUI() {
    // Populate exercise dropdown from history
    const history = loadHistory();
    const allExercises = new Set();
    history.forEach(r => r.entries.forEach(e => allExercises.add(e.name)));
    // reset select (keep __ALL__)
    const prev = historyExerciseSel.value;
    historyExerciseSel.innerHTML = `<option value="__ALL__">All exercises (total volume)</option>`;
    Array.from(allExercises).sort((a,b)=>a.localeCompare(b)).forEach(name => {
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      historyExerciseSel.appendChild(opt);
    });
    // restore selection if possible
    const canRestore = Array.from(historyExerciseSel.options).some(o => o.value === prev);
    historyExerciseSel.value = canRestore ? prev : "__ALL__";

    renderChartAndTable();
  }

  function renderChartAndTable() {
    const history = loadHistory();
    const selExercise = historyExerciseSel.value;
    const metric = historyMetricSel.value; // "volume" | "best"

    // Build timeline
    const labels = [];
    const values = [];
    const tableRows = [];

    history.sort((a,b)=> new Date(a.dateISO) - new Date(b.dateISO));

    if (selExercise === "__ALL__") {
      // per session total volume
      history.forEach(rec => {
        labels.push(formatDateShort(new Date(rec.dateISO)));
        values.push(rec.totals.volume || 0);
        tableRows.push({
          date: rec.dateISO,
          location: rec.location,
          exercise: "(all)",
          sets: rec.totals.sets,
          reps: rec.totals.reps,
          volume: rec.totals.volume
        });
      });
    } else {
      // per session for selected exercise
      history.forEach(rec => {
        const entry = rec.entries.find(e => e.name === selExercise);
        if (!entry) return;
        const best = entry.sets.reduce((m,s)=>Math.max(m, s.weight||0), 0);
        const volume = entry.sets.reduce((a,s)=>a+(s.reps*s.weight||0),0);
        labels.push(formatDateShort(new Date(rec.dateISO)));
        values.push(metric === "best" ? best : round1(volume));
        const reps = entry.sets.reduce((a,s)=>a+(s.reps||0),0);
        tableRows.push({
          date: rec.dateISO,
          location: rec.location,
          exercise: entry.name,
          sets: entry.sets.length,
          reps,
          volume
        });
      });
    }

    // Draw chart
    drawChart(labels, values, selExercise, metric);

    // Fill table
    historyTableBody.innerHTML = "";
    tableRows.reverse().forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDateLong(new Date(row.date))}</td>
        <td>${escapeHtml(row.location)}</td>
        <td>${escapeHtml(row.exercise)}</td>
        <td>${row.sets}</td>
        <td>${row.reps}</td>
        <td>${round1(row.volume)}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  function drawChart(labels, values, selExercise, metric) {
    const title = selExercise === "__ALL__"
      ? "Total Volume by Workout"
      : `${selExercise} • ${metric === "best" ? "Best Weight" : "Total Volume"}`;

    const dsColor = metric === "best" ? "#60a5fa" : "#6ee7b7";

    if (chart) { chart.destroy(); }
    chart = new Chart(chartCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          borderColor: dsColor,
          backgroundColor: dsColor + "33",
          tension: 0.25,
          pointRadius: 3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: "#9aa0b4" }, grid: { color: "#283047" } },
          y: { ticks: { color: "#9aa0b4" }, grid: { color: "#283047" } }
        },
        plugins: {
          legend: { labels: { color: "#f4f6ff" } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${round1(ctx.parsed.y)}`
            }
          }
        }
      }
    });
  }

  // ---- Utils + storage ----
  function selectTab(id) {
    tabs.forEach(b => b.classList.toggle("active", b.dataset.target === id));
    views.forEach(v => v.classList.toggle("active", `#${v.id}` === id));
  }

  function formatDateShort(d) {
    // Europe/London vibe; simple dd Mon
    const opts = { day: "2-digit", month: "short", year: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  }
  function formatDateLong(d) {
    const opts = { weekday: "short", day: "2-digit", month: "short", year: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function round1(n){ return Math.round(n * 10) / 10; }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function cryptoRandomId() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  }
  function saveHistory(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
})();
