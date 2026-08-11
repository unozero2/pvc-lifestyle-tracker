(function () {
  "use strict";

  var STORAGE_KEY = "pvcTrackerData_v1";

  var PHASES = {
    1: { name: "Sonno", color: "var(--phase1)" },
    2: { name: "Reflusso", color: "var(--phase2)" },
    3: { name: "Stimolanti", color: "var(--phase3)" },
    4: { name: "Respiro/Stress", color: "var(--phase4)" },
    5: { name: "Attività fisica", color: "var(--phase5)" }
  };

  var CHECKLIST_ITEMS = [
    { id: "night_shift", label: "Turno notturno gestito col partner / pausa sonno fatta", phase: 1, weekStart: 1, weekEnd: 4 },
    { id: "meal_timing", label: "Ultimo pasto ≥ 2-3h prima di dormire", phase: 2, weekStart: 1, weekEnd: 6 },
    { id: "left_side", label: "Dormito sul lato sinistro", phase: 2, weekStart: 1, weekEnd: 6 },
    { id: "bed_elevated", label: "Testata del letto alzata", phase: 2, weekStart: 1, weekEnd: 6 },
    { id: "no_intense_after_meal", label: "Niente sforzo intenso subito dopo i pasti", phase: 2, weekStart: 1, weekEnd: 99 },
    { id: "caffeine_limit", label: "Caffè ≤1 al giorno, non nel pomeriggio", phase: 3, weekStart: 2, weekEnd: 8 },
    { id: "no_alcohol", label: "Niente alcol", phase: 3, weekStart: 2, weekEnd: 8 },
    { id: "breathing", label: "Respirazione lenta fatta (mattina/sera)", phase: 4, weekStart: 3, weekEnd: 10 },
    { id: "light_activity", label: "Attività fisica leggera, lontano dai pasti", phase: 5, weekStart: 4, weekEnd: 99 }
  ];

  var PHASE_RANGES = [
    { phase: 1, start: 1, end: 4 },
    { phase: 2, start: 1, end: 6 },
    { phase: 3, start: 2, end: 8 },
    { phase: 4, start: 3, end: 10 },
    { phase: 5, start: 4, end: 99 }
  ];

  // ---------- Date helpers ----------
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayKey() { return dateKey(new Date()); }
  function parseDateKey(key) {
    var parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  function addDays(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }
  function nowHM() {
    var d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function weekNumberFor(startKey, dKey) {
    var start = parseDateKey(startKey);
    var d = parseDateKey(dKey);
    var diffDays = Math.floor((d.setHours(0,0,0,0) - start.setHours(0,0,0,0)) / 86400000);
    return Math.floor(diffDays / 7) + 1;
  }

  // ---------- Storage ----------
  function defaultData() {
    return {
      settings: {
        startDate: todayKey(),
        notifEnabled: false,
        reminderMorning: "07:30",
        reminderEvening: "21:00",
        showAllItems: false,
        lastNotified: {}
      },
      logs: {}
    };
  }

  var data = loadData();

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      var parsed = JSON.parse(raw);
      var d = defaultData();
      d.settings = Object.assign(d.settings, parsed.settings || {});
      d.logs = parsed.logs || {};
      return d;
    } catch (e) {
      console.error("Errore lettura dati", e);
      return defaultData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ---------- Checklist active items ----------
  function activeItems(weekNum, showAll) {
    if (showAll) return CHECKLIST_ITEMS.slice();
    return CHECKLIST_ITEMS.filter(function (it) {
      return weekNum >= it.weekStart && weekNum <= it.weekEnd;
    });
  }
  function activePhasesForWeek(weekNum) {
    return PHASE_RANGES.filter(function (p) { return weekNum >= p.start && weekNum <= p.end; })
      .map(function (p) { return PHASES[p.phase]; });
  }

  function getLog(key) {
    return data.logs[key] || null;
  }
  function ensureLog(key) {
    if (!data.logs[key]) {
      data.logs[key] = { date: key, checklist: {}, pvcPerceived: false, pvcIntensity: 0, pvcMoments: [], reflux: false, sleepHours: null, sleepAwakenings: null, stressLevel: 5, notes: "" };
    }
    return data.logs[key];
  }

  // ---------- Tabs ----------
  var tabs = ["oggi", "settimana", "andamento", "impostazioni"];
  function switchTab(tab) {
    tabs.forEach(function (t) {
      document.getElementById("tab-" + t).classList.toggle("hidden", t !== tab);
    });
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
    });
    if (tab === "settimana") renderWeekTab();
    if (tab === "andamento") renderTrends();
    if (tab === "impostazioni") renderSettings();
    if (tab === "oggi") renderWeekBanner();
  }

  document.querySelectorAll(".nav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-tab")); });
  });

  // ---------- Week banner ----------
  function renderWeekBanner() {
    var wk = weekNumberFor(data.settings.startDate, todayKey());
    var banner = document.getElementById("weekBanner");
    var reeval = document.getElementById("reeval-banner");
    if (wk < 1) {
      banner.textContent = "Il piano inizierà il " + data.settings.startDate + ".";
    } else {
      var phases = activePhasesForWeek(wk).map(function (p) { return p.name; }).join(", ");
      banner.textContent = "Settimana " + wk + " del piano — Fasi attive: " + (phases || "nessuna, solo mantenimento");
    }
    reeval.classList.toggle("hidden", !(wk >= 8 && wk <= 12));
  }

  // ---------- OGGI tab ----------
  var logDateInput = document.getElementById("logDate");
  logDateInput.value = todayKey();
  logDateInput.max = todayKey();

  var pvcPerceivedSeg = document.getElementById("pvcPerceivedSeg");
  var pvcDetails = document.getElementById("pvcDetails");
  var pvcIntensitySeg = document.getElementById("pvcIntensitySeg");
  var pvcMomentsGroup = document.getElementById("pvcMomentsGroup");
  var refluxSeg = document.getElementById("refluxSeg");
  var stressLevel = document.getElementById("stressLevel");
  var stressLevelVal = document.getElementById("stressLevelVal");

  function setSegActive(container, value) {
    container.querySelectorAll(".seg-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-value") === String(value));
    });
  }
  function getSegActive(container) {
    var el = container.querySelector(".seg-btn.active");
    return el ? el.getAttribute("data-value") : null;
  }
  function bindSegmented(container, onChange) {
    container.querySelectorAll(".seg-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        setSegActive(container, b.getAttribute("data-value"));
        if (onChange) onChange(b.getAttribute("data-value"));
      });
    });
  }
  bindSegmented(pvcPerceivedSeg, function (val) {
    pvcDetails.classList.toggle("hidden", val !== "si");
  });
  bindSegmented(pvcIntensitySeg);
  bindSegmented(refluxSeg);

  pvcMomentsGroup.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () { chip.classList.toggle("active"); });
  });
  function getActiveChips(container) {
    return Array.prototype.slice.call(container.querySelectorAll(".chip.active")).map(function (c) { return c.getAttribute("data-value"); });
  }
  function setActiveChips(container, values) {
    container.querySelectorAll(".chip").forEach(function (c) {
      c.classList.toggle("active", values.indexOf(c.getAttribute("data-value")) !== -1);
    });
  }

  stressLevel.addEventListener("input", function () { stressLevelVal.textContent = stressLevel.value; });

  function renderChecklistForDate(key) {
    var wk = weekNumberFor(data.settings.startDate, key);
    var items = activeItems(wk, data.settings.showAllItems);
    var list = document.getElementById("checklistList");
    var hint = document.getElementById("checklistHint");
    hint.textContent = items.length ? "Voci attive per la settimana " + wk + " del piano." : "Nessuna voce di checklist attiva per questa settimana.";
    list.innerHTML = "";
    var log = getLog(key);
    items.forEach(function (it) {
      var row = document.createElement("label");
      row.className = "checklist-item";
      var checked = log && log.checklist && log.checklist[it.id];
      row.innerHTML =
        '<input type="checkbox" data-item="' + it.id + '" ' + (checked ? "checked" : "") + '>' +
        '<span class="checklist-item-label">' + it.label +
        '<span class="checklist-item-phase" style="background:' + PHASES[it.phase].color + '">' + PHASES[it.phase].name + "</span>" +
        "</span>";
      list.appendChild(row);
    });
  }

  var DOW_LETTERS = ["D", "L", "M", "M", "G", "V", "S"];
  function formatHeroDate(key) {
    var d = parseDateKey(key);
    try {
      return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(d);
    } catch (e) {
      return key;
    }
  }
  function dotColorForLog(log) {
    if (!log || !log.pvcPerceived) return "";
    if (log.pvcIntensity === 3) return "background:var(--dot-3)";
    if (log.pvcIntensity === 2) return "background:var(--dot-2)";
    return "background:var(--dot-1)";
  }

  var SQUIGGLE_SVG = '<svg viewBox="0 0 90 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2,6 Q15,0 28,6 T54,6 T80,6" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"></path></svg>';

  function renderHero(key) {
    document.getElementById("heroDateLabel").textContent = formatHeroDate(key);
    var prefix = key === todayKey() ? "Come sta il tuo " : "Come stava il tuo ";
    var suffix = key === todayKey() ? " oggi?" : " quel giorno?";
    document.getElementById("heroQuestion").innerHTML =
      prefix + '<span class="squiggle-word">cuore' + SQUIGGLE_SVG + "</span>" + suffix;
  }

  function renderDayStrip(selectedKey) {
    var strip = document.getElementById("dayStrip");
    strip.innerHTML = "";
    var end = parseDateKey(todayKey());
    for (var i = 6; i >= 0; i--) {
      var d = addDays(end, -i);
      var k = dateKey(d);
      var log = getLog(k);
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "day-cell" + (k === selectedKey ? " selected" : "");
      cell.setAttribute("data-date", k);
      cell.innerHTML =
        '<span class="day-cell-dow">' + DOW_LETTERS[d.getDay()] + '</span>' +
        '<span class="day-cell-dot ' + (log ? "has-log" : "") + '" style="' + dotColorForLog(log) + '"></span>';
      cell.addEventListener("click", function () {
        var k2 = this.getAttribute("data-date");
        logDateInput.value = k2;
        loadFormForDate(k2);
      });
      strip.appendChild(cell);
    }
  }

  document.getElementById("dateToggleBtn").addEventListener("click", function () {
    document.getElementById("dateInputWrap").classList.toggle("hidden");
  });

  function loadFormForDate(key) {
    var log = getLog(key);
    renderChecklistForDate(key);
    renderHero(key);
    renderDayStrip(key);
    if (log) {
      setSegActive(pvcPerceivedSeg, log.pvcPerceived ? "si" : "no");
      pvcDetails.classList.toggle("hidden", !log.pvcPerceived);
      setSegActive(pvcIntensitySeg, log.pvcIntensity || "");
      setActiveChips(pvcMomentsGroup, log.pvcMoments || []);
      setSegActive(refluxSeg, log.reflux ? "si" : "no");
      document.getElementById("sleepHours").value = log.sleepHours != null ? log.sleepHours : "";
      document.getElementById("sleepAwakenings").value = log.sleepAwakenings != null ? log.sleepAwakenings : "";
      stressLevel.value = log.stressLevel != null ? log.stressLevel : 5;
      stressLevelVal.textContent = stressLevel.value;
      document.getElementById("notes").value = log.notes || "";
    } else {
      setSegActive(pvcPerceivedSeg, "no");
      pvcDetails.classList.add("hidden");
      setSegActive(pvcIntensitySeg, "");
      setActiveChips(pvcMomentsGroup, []);
      setSegActive(refluxSeg, "no");
      document.getElementById("sleepHours").value = "";
      document.getElementById("sleepAwakenings").value = "";
      stressLevel.value = 5;
      stressLevelVal.textContent = "5";
      document.getElementById("notes").value = "";
    }
  }

  logDateInput.addEventListener("change", function () { loadFormForDate(logDateInput.value); });

  document.getElementById("saveLogBtn").addEventListener("click", function () {
    var key = logDateInput.value || todayKey();
    var log = ensureLog(key);
    document.querySelectorAll("#checklistList input[type=checkbox]").forEach(function (cb) {
      log.checklist[cb.getAttribute("data-item")] = cb.checked;
    });
    log.pvcPerceived = getSegActive(pvcPerceivedSeg) === "si";
    log.pvcIntensity = log.pvcPerceived ? Number(getSegActive(pvcIntensitySeg) || 1) : 0;
    log.pvcMoments = log.pvcPerceived ? getActiveChips(pvcMomentsGroup) : [];
    log.reflux = getSegActive(refluxSeg) === "si";
    var sh = document.getElementById("sleepHours").value;
    var sa = document.getElementById("sleepAwakenings").value;
    log.sleepHours = sh === "" ? null : Number(sh);
    log.sleepAwakenings = sa === "" ? null : Number(sa);
    log.stressLevel = Number(stressLevel.value);
    log.notes = document.getElementById("notes").value;
    log.savedAt = Date.now();
    saveData();
    var conf = document.getElementById("saveConfirm");
    conf.classList.remove("hidden");
    setTimeout(function () { conf.classList.add("hidden"); }, 2000);
    renderWeekBanner();
  });

  // ---------- SETTIMANA tab ----------
  var weekOffset = null; // absolute week number being viewed

  var DOW_ABBR = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

  function renderWeekDayPills(days, tk) {
    var html = "";
    days.forEach(function (d) {
      var dd = parseDateKey(d);
      var log = getLog(d);
      html +=
        '<div class="day-pill' + (d === tk ? " today" : "") + '">' +
        '<span class="day-pill-dow">' + DOW_ABBR[dd.getDay()] + '</span>' +
        '<span class="day-pill-num">' + dd.getDate() + '</span>' +
        '<span class="day-pill-mark" style="' + dotColorForLog(log) + '"></span>' +
        "</div>";
    });
    document.getElementById("weekDayPills").innerHTML = html;
  }

  function renderWeekTab() {
    if (weekOffset === null) {
      weekOffset = Math.max(1, weekNumberFor(data.settings.startDate, todayKey()));
    }
    var wk = weekOffset;
    var start = addDays(parseDateKey(data.settings.startDate), (wk - 1) * 7);
    var days = [];
    for (var i = 0; i < 7; i++) days.push(dateKey(addDays(start, i)));

    document.getElementById("weekNavLabel").textContent = "Settimana " + wk;

    var items = activeItems(wk, data.settings.showAllItems);
    var tk = todayKey();

    renderWeekDayPills(days, tk);

    var html = "";
    items.forEach(function (it) {
      html += '<div class="heat-item"><div class="heat-item-label">' + it.label + '</div><div class="heat-dots">';
      days.forEach(function (d) {
        var log = getLog(d);
        var checked = log && log.checklist && log.checklist[it.id];
        var bg = checked ? PHASES[it.phase].color : "";
        html += '<button type="button" class="heat-dot' + (d === tk ? " today-col" : "") + '" style="' + (bg ? "background:" + bg : "") + '" data-date="' + d + '" data-item="' + it.id + '" aria-label="' + it.label + " " + d + '"></button>';
      });
      html += "</div></div>";
    });
    document.getElementById("weekGridWrap").innerHTML = html || '<p class="muted small">Nessuna voce di checklist attiva per questa settimana.</p>';

    document.querySelectorAll(".heat-dot").forEach(function (cell) {
      cell.addEventListener("click", function () {
        var d = cell.getAttribute("data-date");
        var itemId = cell.getAttribute("data-item");
        var log = ensureLog(d);
        log.checklist[itemId] = !log.checklist[itemId];
        saveData();
        renderWeekTab();
      });
    });

    // Summary
    var pvcDays = 0, refluxDays = 0, sleepSum = 0, sleepCount = 0, totalChecks = 0, doneChecks = 0, loggedDays = 0;
    days.forEach(function (d) {
      var log = getLog(d);
      if (!log) return;
      loggedDays++;
      if (log.pvcPerceived) pvcDays++;
      if (log.reflux) refluxDays++;
      if (log.sleepHours != null) { sleepSum += log.sleepHours; sleepCount++; }
      items.forEach(function (it) {
        totalChecks++;
        if (log.checklist && log.checklist[it.id]) doneChecks++;
      });
    });
    var adherence = totalChecks ? Math.round((doneChecks / totalChecks) * 100) : 0;
    var avgSleep = sleepCount ? (sleepSum / sleepCount).toFixed(1) : "-";
    var summary = document.getElementById("weekSummary");
    summary.innerHTML =
      summaryItem(loggedDays + "/7", "Giorni registrati") +
      summaryItem(adherence + "%", "Aderenza checklist") +
      summaryItem(pvcDays, "Giorni con extrasistoli") +
      summaryItem(refluxDays, "Giorni con reflusso") +
      summaryItem(avgSleep, "Media ore sonno");

    renderWeekEntries(days);
  }
  function summaryItem(value, label) {
    return '<div class="summary-item"><div class="value">' + value + '</div><div class="label">' + label + "</div></div>";
  }

  function renderWeekEntries(days) {
    var wrap = document.getElementById("weekEntries");
    var html = "";
    days.slice().reverse().forEach(function (d) {
      var log = getLog(d);
      if (!log) return;
      var dd = parseDateKey(d);
      var dotStyle = log.pvcPerceived ? dotColorForLog(log) : "background:var(--dot-none)";
      var tags = [];
      if (log.reflux) tags.push("reflusso");
      if (log.sleepHours != null) tags.push(log.sleepHours + "h sonno");
      var notesHtml = log.notes ? escapeHtml(log.notes) : "Nessuna nota";
      html +=
        '<div class="entry-card">' +
        '<span class="entry-dot" style="' + dotStyle + '"></span>' +
        '<div class="entry-body">' +
        '<div class="entry-top"><span class="entry-date">' + DOW_LETTERS[dd.getDay()] + " " + dd.getDate() + "/" + (dd.getMonth() + 1) + '</span>' +
        '<span class="entry-tags">' + tags.join(" · ") + "</span></div>" +
        '<p class="entry-notes' + (log.notes ? "" : " empty") + '">' + notesHtml + "</p>" +
        "</div></div>";
    });
    wrap.innerHTML = html || '<p class="muted small">Nessuna voce registrata questa settimana.</p>';
  }
  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.getElementById("prevWeekBtn").addEventListener("click", function () {
    weekOffset = Math.max(1, weekOffset - 1);
    renderWeekTab();
  });
  document.getElementById("nextWeekBtn").addEventListener("click", function () {
    weekOffset = Math.min(30, weekOffset + 1);
    renderWeekTab();
  });

  // ---------- ANDAMENTO tab ----------
  function renderChart(containerId, weeksData, formatVal) {
    var el = document.getElementById(containerId);
    el.innerHTML = "";
    var max = Math.max.apply(null, weeksData.map(function (w) { return w.value; }).concat([1]));
    weeksData.forEach(function (w) {
      var col = document.createElement("div");
      col.className = "chart-col";
      var h = Math.max(2, (w.value / max) * 100);
      col.innerHTML =
        '<div class="chart-val">' + (formatVal ? formatVal(w.value) : w.value) + '</div>' +
        '<div class="chart-bar" style="height:' + h + '%"></div>' +
        '<div class="chart-label">S' + w.week + '</div>';
      el.appendChild(col);
    });
  }

  function renderLineChart(containerId, weeksData, formatVal) {
    var el = document.getElementById(containerId);
    var values = weeksData.map(function (w) { return w.value; });
    var max = Math.max.apply(null, values.concat([1]));
    var min = Math.min.apply(null, values.concat([0]));
    var range = max - min || 1;
    var w = 300, h = 100, pad = 8;
    var n = weeksData.length;
    var points = weeksData.map(function (item, i) {
      var x = n > 1 ? pad + (i / (n - 1)) * (w - pad * 2) : w / 2;
      var y = pad + (1 - (item.value - min) / range) * (h - pad * 2);
      return { x: x, y: y, value: item.value };
    });
    var pathD = points.map(function (p, i) { return (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1); }).join(" ");
    var circles = points.map(function (p) { return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="var(--success)"></circle>'; }).join("");
    el.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path d="' + pathD + '" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>' +
      circles +
      "</svg>" +
      '<div class="linechart-labels">' + weeksData.map(function (w2) { return "<span>S" + w2.week + "</span>"; }).join("") + "</div>";
  }

  function renderRecap() {
    var currentWeek = Math.max(1, weekNumberFor(data.settings.startDate, todayKey()));
    var start = addDays(parseDateKey(data.settings.startDate), (currentWeek - 1) * 7);
    var days = [];
    for (var i = 0; i < 7; i++) days.push(dateKey(addDays(start, i)));
    var items = activeItems(currentWeek, data.settings.showAllItems);
    var loggedDays = 0, pvcDays = 0, refluxDays = 0, sleepSum = 0, sleepCount = 0, totalChecks = 0, doneChecks = 0;
    days.forEach(function (d) {
      var log = getLog(d);
      if (!log) return;
      loggedDays++;
      if (log.pvcPerceived) pvcDays++;
      if (log.reflux) refluxDays++;
      if (log.sleepHours != null) { sleepSum += log.sleepHours; sleepCount++; }
      items.forEach(function (it) { totalChecks++; if (log.checklist && log.checklist[it.id]) doneChecks++; });
    });
    var el = document.getElementById("recapText");
    if (!loggedDays) {
      el.textContent = "Nessuna giornata registrata ancora questa settimana.";
      return;
    }
    var adherence = totalChecks ? Math.round((doneChecks / totalChecks) * 100) : 0;
    var avgSleep = sleepCount ? (sleepSum / sleepCount).toFixed(1) : "-";
    el.innerHTML =
      "Questa settimana (settimana " + currentWeek + "): extrasistoli percepite in <b>" + pvcDays + " giorni</b> su " +
      loggedDays + " registrati, reflusso in " + refluxDays + " giorni, sonno medio " + avgSleep + "h, aderenza checklist " + adherence + "%.";
  }

  function renderMomentsDistribution() {
    var counts = { mattina: 0, pomeriggio: 0, sera: 0, notte: 0 };
    var loggedDays = 0;
    var end = parseDateKey(todayKey());
    for (var i = 6; i >= 0; i--) {
      var log = getLog(dateKey(addDays(end, -i)));
      if (!log) continue;
      loggedDays++;
      (log.pvcMoments || []).forEach(function (m) { if (counts.hasOwnProperty(m)) counts[m]++; });
    }
    var labels = { mattina: "Mattina", pomeriggio: "Pomeriggio", sera: "Sera", notte: "Notte" };
    var swatchClass = { mattina: "swatch-mattina", pomeriggio: "swatch-pomeriggio", sera: "swatch-sera", notte: "swatch-notte" };
    var max = Math.max(counts.mattina, counts.pomeriggio, counts.sera, counts.notte, 1);
    var wrap = document.getElementById("momentsDistribution");
    if (!loggedDays) {
      wrap.innerHTML = '<p class="muted small">Nessuna giornata registrata negli ultimi 7 giorni.</p>';
      return;
    }
    var html = "";
    ["mattina", "pomeriggio", "sera", "notte"].forEach(function (key) {
      var val = counts[key];
      var pct = Math.max(3, Math.round((val / max) * 100));
      html +=
        '<div class="distribution-row">' +
        '<div class="distribution-row-top"><span class="distribution-row-label"><span class="distribution-swatch" style="background:var(--m-' + key + ')"></span>' + labels[key] + '</span>' +
        '<span class="distribution-row-value">' + val + " / " + loggedDays + " giorni</span></div>" +
        '<div class="distribution-bar-track"><div class="distribution-bar-fill" style="width:' + pct + '%;background:var(--m-' + key + ')"></div></div>' +
        "</div>";
    });
    wrap.innerHTML = html;
  }

  function renderTrends() {
    renderRecap();
    renderMomentsDistribution();
    var currentWeek = Math.max(1, weekNumberFor(data.settings.startDate, todayKey()));
    var firstWeek = Math.max(1, currentWeek - 11);
    var adherenceData = [], pvcData = [], refluxData = [], sleepData = [];
    for (var wk = firstWeek; wk <= currentWeek; wk++) {
      var start = addDays(parseDateKey(data.settings.startDate), (wk - 1) * 7);
      var days = [];
      for (var i = 0; i < 7; i++) days.push(dateKey(addDays(start, i)));
      var items = activeItems(wk, data.settings.showAllItems);
      var totalChecks = 0, doneChecks = 0, pvcDays = 0, refluxDays = 0, sleepSum = 0, sleepCount = 0;
      days.forEach(function (d) {
        var log = getLog(d);
        if (!log) return;
        if (log.pvcPerceived) pvcDays++;
        if (log.reflux) refluxDays++;
        if (log.sleepHours != null) { sleepSum += log.sleepHours; sleepCount++; }
        items.forEach(function (it) {
          totalChecks++;
          if (log.checklist && log.checklist[it.id]) doneChecks++;
        });
      });
      adherenceData.push({ week: wk, value: totalChecks ? Math.round((doneChecks / totalChecks) * 100) : 0 });
      pvcData.push({ week: wk, value: pvcDays });
      refluxData.push({ week: wk, value: refluxDays });
      sleepData.push({ week: wk, value: sleepCount ? Number((sleepSum / sleepCount).toFixed(1)) : 0 });
    }
    renderChart("chartAdherence", adherenceData, function (v) { return v + "%"; });
    renderChart("chartPvc", pvcData);
    renderChart("chartReflux", refluxData);
    renderLineChart("chartSleep", sleepData, function (v) { return v + "h"; });
  }

  // ---------- IMPOSTAZIONI tab ----------
  function renderSettings() {
    document.getElementById("startDate").value = data.settings.startDate;
    document.getElementById("showAllItems").checked = !!data.settings.showAllItems;
    document.getElementById("notifEnabled").checked = !!data.settings.notifEnabled;
    document.getElementById("reminderMorning").value = data.settings.reminderMorning;
    document.getElementById("reminderEvening").value = data.settings.reminderEvening;
    renderNotifStatus();
    renderPhaseTimeline();
  }

  function renderPhaseTimeline() {
    var start = parseDateKey(data.settings.startDate);
    var html = "";
    PHASE_RANGES.forEach(function (p) {
      var phaseInfo = PHASES[p.phase];
      var from = addDays(start, (p.start - 1) * 7);
      var toWeek = p.end >= 90 ? p.start + 7 : p.end; // cap open-ended phases for display
      var to = addDays(start, toWeek * 7 - 1);
      var label = p.end >= 90 ? ("dal " + dateKey(from) + " in poi") : (dateKey(from) + " → " + dateKey(to));
      html += '<div class="phase-timeline-item"><span class="phase-swatch" style="background:' + phaseInfo.color + '"></span>' +
        "<span>Fase " + p.phase + " – " + phaseInfo.name + "</span>" +
        '<span class="phase-timeline-dates">' + label + "</span></div>";
    });
    document.getElementById("phaseTimeline").innerHTML = html;
  }

  document.getElementById("startDate").addEventListener("change", function (e) {
    data.settings.startDate = e.target.value;
    saveData();
    renderWeekBanner();
    renderPhaseTimeline();
    weekOffset = null;
  });
  document.getElementById("showAllItems").addEventListener("change", function (e) {
    data.settings.showAllItems = e.target.checked;
    saveData();
    loadFormForDate(logDateInput.value);
  });
  document.getElementById("notifEnabled").addEventListener("change", function (e) {
    data.settings.notifEnabled = e.target.checked;
    saveData();
  });
  document.getElementById("reminderMorning").addEventListener("change", function (e) {
    data.settings.reminderMorning = e.target.value;
    saveData();
  });
  document.getElementById("reminderEvening").addEventListener("change", function (e) {
    data.settings.reminderEvening = e.target.value;
    saveData();
  });

  function renderNotifStatus() {
    var status = document.getElementById("notifStatus");
    if (!("Notification" in window)) {
      status.textContent = "Le notifiche non sono supportate su questo browser.";
      return;
    }
    status.textContent = "Stato permesso notifiche: " + Notification.permission;
  }

  document.getElementById("notifPermBtn").addEventListener("click", function () {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(function () { renderNotifStatus(); });
  });

  // ---------- Export ----------
  function downloadBlob(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.getElementById("exportJsonBtn").addEventListener("click", function () {
    downloadBlob("pvc-diario-" + todayKey() + ".json", JSON.stringify(data, null, 2), "application/json");
  });

  document.getElementById("exportCsvBtn").addEventListener("click", function () {
    var allItemIds = CHECKLIST_ITEMS.map(function (it) { return it.id; });
    var header = ["date", "week"].concat(allItemIds).concat(["pvcPerceived", "pvcIntensity", "pvcMoments", "reflux", "sleepHours", "sleepAwakenings", "stressLevel", "notes"]);
    var rows = [header.join(",")];
    Object.keys(data.logs).sort().forEach(function (key) {
      var log = data.logs[key];
      var wk = weekNumberFor(data.settings.startDate, key);
      var row = [key, wk].concat(allItemIds.map(function (id) { return log.checklist && log.checklist[id] ? "1" : "0"; }));
      row = row.concat([
        log.pvcPerceived ? "1" : "0",
        log.pvcIntensity || 0,
        '"' + (log.pvcMoments || []).join(";") + '"',
        log.reflux ? "1" : "0",
        log.sleepHours != null ? log.sleepHours : "",
        log.sleepAwakenings != null ? log.sleepAwakenings : "",
        log.stressLevel != null ? log.stressLevel : "",
        '"' + (log.notes || "").replace(/"/g, '""') + '"'
      ]);
      rows.push(row.join(","));
    });
    downloadBlob("pvc-diario-" + todayKey() + ".csv", rows.join("\n"), "text/csv");
  });

  document.getElementById("clearDataBtn").addEventListener("click", function () {
    if (!confirm("Cancellare definitivamente tutti i dati salvati su questo dispositivo? L'operazione non è reversibile.")) return;
    localStorage.removeItem(STORAGE_KEY);
    data = defaultData();
    weekOffset = null;
    logDateInput.value = todayKey();
    loadFormForDate(todayKey());
    renderWeekBanner();
    renderSettings();
    alert("Dati cancellati.");
  });

  // ---------- Reminders (best-effort, foreground/open-app based) ----------
  function checkReminders() {
    if (!data.settings.notifEnabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!navigator.serviceWorker || !navigator.serviceWorker.ready) return;
    var tk = todayKey();
    var hm = nowHM();
    data.settings.lastNotified = data.settings.lastNotified || {};

    if (hm === data.settings.reminderMorning && data.settings.lastNotified.morning !== tk) {
      notify("Respirazione lenta", "Promemoria: 5-10 minuti di respirazione lenta (4,5-6 respiri/min).");
      data.settings.lastNotified.morning = tk;
      saveData();
    }
    if (hm === data.settings.reminderEvening && data.settings.lastNotified.evening !== tk) {
      var log = getLog(tk);
      if (!log || !log.savedAt) {
        notify("Diario di oggi", "Non hai ancora registrato la giornata: sintomi, sonno, checklist.");
      }
      data.settings.lastNotified.evening = tk;
      saveData();
    }
  }

  function catchUpCheck() {
    if (!data.settings.notifEnabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    var tk = todayKey();
    var hm = nowHM();
    data.settings.lastNotified = data.settings.lastNotified || {};
    if (hm > data.settings.reminderEvening && data.settings.lastNotified.eveningCatchup !== tk) {
      var log = getLog(tk);
      if (!log || !log.savedAt) {
        notify("Diario di oggi", "Ricorda di registrare la giornata di oggi prima di dormire.");
      }
      data.settings.lastNotified.eveningCatchup = tk;
      saveData();
    }
  }

  function notify(title, body) {
    navigator.serviceWorker.ready.then(function (reg) {
      reg.showNotification(title, { body: body, icon: "icons/icon-192.png", badge: "icons/icon-192.png" });
    }).catch(function () {
      try { new Notification(title, { body: body }); } catch (e) {}
    });
  }

  setInterval(checkReminders, 60000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") catchUpCheck();
  });

  // ---------- Service worker & install prompt ----------
  if ("serviceWorker" in navigator) {
    var swRefreshing = false;
    // self.clients.claim() nel service worker fa scattare "controllerchange" anche alla
    // primissima installazione (senza controller precedente): in quel caso NON bisogna
    // ricaricare, altrimenti si crea un loop di reload infinito ad ogni apertura dell'app.
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController) { hadController = true; return; }
      if (swRefreshing) return;
      swRefreshing = true;
      window.location.reload();
    });
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").then(function (reg) {
        reg.addEventListener("updatefound", function () {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", function () {
            if (newWorker.state === "activated") {
              // Una nuova versione ha preso il controllo: la pagina si ricarica
              // da sola una sola volta per mostrare i file aggiornati.
            }
          });
        });
        // Controlla periodicamente se c'è una nuova versione pubblicata.
        setInterval(function () { reg.update(); }, 60 * 60 * 1000);
      }).catch(function (e) {
        console.error("Registrazione service worker fallita", e);
      });
    });
  }

  var deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById("installBtn").classList.remove("hidden");
  });
  document.getElementById("installBtn").addEventListener("click", function () {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(function () {
      deferredInstallPrompt = null;
      document.getElementById("installBtn").classList.add("hidden");
    });
  });

  // ---------- Init ----------
  loadFormForDate(todayKey());
  renderWeekBanner();
})();
