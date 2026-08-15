(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const arena = $("#arena");
  const targetLayer = $("#targetLayer");
  const startOverlay = $("#startOverlay");
  const pauseOverlay = $("#pauseOverlay");
  const gameOverOverlay = $("#gameOverOverlay");
  const logEl = $("#consoleLog");

  const UI = {
    score: $("#score"), combo: $("#combo"), accuracy: $("#accuracy"), wpm: $("#wpm"), threat: $("#threat"), phase: $("#phase"),
    traceText: $("#traceText"), traceBar: $("#traceBar"), breachText: $("#breachText"), breachBar: $("#breachBar"),
    timer: $("#roundTimer"), objective: $("#objective"), finalScore: $("#finalScore"), finalAccuracy: $("#finalAccuracy"),
    finalWpm: $("#finalWpm"), bestScore: $("#bestScore"), gameOverKicker: $("#gameOverKicker"), gameOverTitle: $("#gameOverTitle"),
    soundBtn: $("#soundBtn"), clock: $("#clock"),
    layerProgress: $("#layerProgress"), layerProgressTrack: $("#layerProgressTrack"),
    layerTransition: $("#layerTransition"), layerTransitionTitle: $("#layerTransitionTitle"),
    layerTransitionMeta: $("#layerTransitionMeta"), comboIndicator: $("#comboIndicator"),
    rating: $("#rating"), ratingLabel: $("#ratingLabel"),
    finalPeakCombo: $("#finalPeakCombo"), finalPeakWpm: $("#finalPeakWpm"), finalTargets: $("#finalTargets"),
    finalEliteTargets: $("#finalEliteTargets"), finalDeepestLayer: $("#finalDeepestLayer"), finalTraceEvents: $("#finalTraceEvents"),
    pbScore: $("#pbScore"), pbPeakCombo: $("#pbPeakCombo"), pbWpm: $("#pbWpm"), pbAccuracy: $("#pbAccuracy"),
    pbTargets: $("#pbTargets"), pbEliteTargets: $("#pbEliteTargets"), pbDeepestLayer: $("#pbDeepestLayer"), pbTraceEvents: $("#pbTraceEvents"),
    deepAccessLayer: $("#deepAccessLayer"), deepModeTitle: $("#deepModeTitle"), deepInstruction: $("#deepInstruction"),
    deepBlocks: $("#deepBlocks"), deepConsole: $("#deepConsole"), memoryBlockLabel: $("#memoryBlockLabel"), memoryRows: $("#memoryRows"),
    deepTyped: $("#deepTyped"), deepMatrix: $("#deepMatrix"), matrixBlockLabel: $("#matrixBlockLabel"), matrixStageLabel: $("#matrixStageLabel"),
    matrixGrid: $("#matrixGrid"), matrixTyped: $("#matrixTyped"), deepTransition: $("#deepTransition"),
    deepTransitionKicker: $("#deepTransitionKicker"), deepTransitionTitle: $("#deepTransitionTitle"), deepTransitionMeta: $("#deepTransitionMeta"),
    finalDeepBlocks: $("#finalDeepBlocks"), pbDeepBlocks: $("#pbDeepBlocks"),
    operatorPanel: $("#operatorPanel"), operatorImage: $("#operatorImage"),
    operatorStatusText: $("#operatorStatusText"), operatorMessage: $("#operatorMessage")
  };

  const PHASES = [
    { name:"SCAN", threat:1, from:0,  spawn:1500, lifetime:9800, max:3, weights:[.88,.12,0,0], eliteEvery:0 },
    { name:"LINK", threat:2, from:12, spawn:1325, lifetime:9100, max:4, weights:[.70,.29,.01,0], eliteEvery:0 },
    { name:"PUSH", threat:3, from:26, spawn:1160, lifetime:8400, max:4, weights:[.50,.43,.07,0], eliteEvery:11 },
    { name:"DIVE", threat:4, from:42, spawn:995,  lifetime:7700, max:5, weights:[.33,.48,.18,.01], eliteEvery:9 },
    { name:"BURN", threat:5, from:58, spawn:850,  lifetime:7000, max:5, weights:[.20,.45,.31,.04], eliteEvery:8 },
    { name:"GHOST",threat:6, from:71, spawn:735,  lifetime:6350, max:6, weights:[.12,.38,.42,.08], eliteEvery:7 },
    { name:"VOID", threat:7, from:82, spawn:630,  lifetime:5750, max:6, weights:[.07,.29,.50,.14], eliteEvery:6 }
  ];

  const CONFIG = {
    roundSeconds: 100,
    minLifetime: 3900,
    traceMistake: 6,
    traceTimeout: 10,
    traceDecayPerSecond: 1.15,
    breachPerNormal: 3.2,
    breachPerElite: 10,
    spawnRetryLimit: 80,
    deepTracePerSecond: 2.15,
    deepMistakeTrace: 5.5,
    deepSuccessTraceRelief: 2.4,
    deepModeEvery: 3
  };

  let state;
  let rafId = null;
  let lastFrame = 0;
  let spawnAccumulator = 0;
  let targetId = 0;
  let comboPulseTimer = null;
  let layerTransitionTimer = null;
  let deepTransitionTimer = null;
  let deepMatrixTimer = null;
  let deepMatrixCountdownTimer = null;
  let deepModeStartTimer = null;
  let operatorStateKey = "";
  let operatorPulseTimer = null;
  let operatorMessageTimer = null;
    let operatorMessageCooldownUntil = 0;
    let selectedGameMode = "breach";

  const LAYER_VISUALS = [
    { hue:185, accent:196, depth:.18, grid:46, tilt:-1.5, speed:10.0, glow:.08, scan:.13 },
    { hue:205, accent:252, depth:.25, grid:42, tilt:1.0,  speed:8.8,  glow:.11, scan:.16 },
    { hue:238, accent:292, depth:.34, grid:38, tilt:-2.0, speed:7.6,  glow:.14, scan:.20 },
    { hue:270, accent:320, depth:.44, grid:34, tilt:2.5,  speed:6.5,  glow:.18, scan:.24 },
    { hue:292, accent:334, depth:.56, grid:30, tilt:-3.0, speed:5.4,  glow:.22, scan:.29 },
    { hue:314, accent:282, depth:.70, grid:26, tilt:3.5,  speed:4.4,  glow:.28, scan:.35 },
    { hue:330, accent:266, depth:.88, grid:22, tilt:-4.0, speed:3.5,  glow:.36, scan:.44 }
  ];

    function freshState(runMode = selectedGameMode) {
    return {
        mode: "title", runMode, startedAt:0, pausedAt:0, pausedTotal:0, elapsed:0, remaining:CONFIG.roundSeconds,
      score:0, combo:1, peakCombo:1, chain:0, correctChars:0, wrongChars:0, trace:0, breach:0,
      threat:1, phaseIndex:0, deepestPhaseIndex:0, completed:0, eliteCompleted:0, traceEvents:0, lockedId:null, targets:new Map(), result:null,
      recentWords:[], recentByPhase:PHASES.map(() => []), lastEliteAt:-99, peakWpm:0, lastWpmSampleAt:0,
      act:"breach", deepBlocks:0, deepMode:null, deepTyped:"", deepTarget:"", deepModeClears:0, deepLastMode:null,
      deepMatrixCells:[], deepMatrixPath:[], deepMatrixReveal:false, deepReady:false, deepStartedAt:0,
      deepConsoleRows:[], deepConsoleTargetIndex:-1, deepConsoleLastTargetIndex:-1, deepTransitioning:false
    };
  }

    function resetGame(runMode = selectedGameMode) {
    cancelAnimationFrame(rafId);
        state = freshState(runMode);
    targetLayer.innerHTML = "";
    targetLayer.classList.remove("deep-cleared");
    UI.layerProgress?.classList.remove("deep-complete");
    if (UI.deepBlocks) UI.deepBlocks.textContent = "0";
    logEl.innerHTML = "";
    clearTimeout(comboPulseTimer);
    clearTimeout(layerTransitionTimer);
    clearTimeout(deepTransitionTimer);
    clearTimeout(deepMatrixTimer);
    clearInterval(deepMatrixCountdownTimer);
    clearTimeout(deepModeStartTimer);
    clearTimeout(operatorPulseTimer);
    clearTimeout(operatorMessageTimer);
    operatorStateKey = "";
    UI.comboIndicator?.classList.remove("show");
    UI.layerTransition?.classList.remove("show");
    UI.deepTransition?.classList.remove("show", "mode-show");
    UI.deepAccessLayer?.classList.remove("active", "console-mode", "matrix-mode");
    UI.deepAccessLayer?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("deep-access-active", "deep-console-active", "deep-matrix-active");
    UI.operatorPanel?.classList.remove("operator-combo", "operator-warning", "operator-critical", "operator-deep", "operator-hit", "operator-success");
    UI.operatorPanel?.classList.add("operator-calm");
    if (UI.operatorStatusText) UI.operatorStatusText.textContent = "LINK STABLE";
    if (UI.operatorMessage) UI.operatorMessage.textContent = "Link is clean. Start when ready.";
    operatorMessageCooldownUntil = 0;
    document.body.dataset.phase = "0";
    buildLayerProgress();
    applyLayerVisuals(0, false);
    renderHUD();
    log("Session buffer cleared.", "info");
  }

    function startGame(runMode = selectedGameMode) {
        selectedGameMode = runMode;
        resetGame(selectedGameMode);
    state.mode = "playing";
    state.startedAt = performance.now();
    lastFrame = state.startedAt;
    spawnAccumulator = 9999;
    startOverlay.classList.remove("active");
    pauseOverlay.classList.remove("active");
        gameOverOverlay.classList.remove("active");

        if (state.runMode === "free") {
            UI.objective.textContent = "FREE PLAY // DESCEND UNTIL TRACE BURNS THE LINK";
            setOperatorMessage("No objective. Stay linked as long as you can.", 1400, true);
            log("Free Play link established. Depth progression is endless.", "good");
        }
        else {
            UI.objective.textContent = "BREACH TARGET: 100% // KEEP TRACE BELOW 100% // DEEP ACCESS ON SUCCESS";
            setOperatorMessage("Get us inside, then pull what you can.", 1400, true);
            log("Netlink established. Adaptive intrusion contract active.", "good");
        }

    GameAudio.start();
    log("Netlink established. Adaptive intrusion contract active.", "good");
    arena.focus();
    rafId = requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    state.pausedAt = performance.now();
    cancelAnimationFrame(rafId);
    pauseOverlay.classList.add("active");
    log("Operator session paused.", "info");
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    state.pausedTotal += performance.now() - state.pausedAt;
    state.mode = "playing";
    pauseOverlay.classList.remove("active");
    lastFrame = performance.now();
    arena.focus();
    log("Operator session resumed.", "info");
    if (state.act === "deep" && !state.deepMode) startDeepMode("console", true);
    rafId = requestAnimationFrame(loop);
  }

  function endGame(reason) {
    if (state.mode === "gameover") return;
    state.mode = "gameover";
    state.result = reason;
    cancelAnimationFrame(rafId);
    state.lockedId = null;

    const acc = getAccuracy();
    const wpm = getWpm();
    state.peakWpm = Math.max(state.peakWpm, wpm);
    const rating = calculateRating();
    const profile = saveProfile({
      score: state.score, peakCombo: state.peakCombo, wpm, peakWpm: state.peakWpm, accuracy: acc,
      targets: state.completed, eliteTargets: state.eliteCompleted, deepestPhaseIndex: state.deepestPhaseIndex,
      traceEvents: state.traceEvents, rating, deepBlocks: state.deepBlocks
    });

    UI.finalScore.textContent = state.score.toLocaleString();
    UI.finalAccuracy.textContent = `${acc}%`;
    UI.finalWpm.textContent = wpm;
    UI.finalPeakCombo.textContent = `x${state.peakCombo}`;
    UI.finalPeakWpm.textContent = state.peakWpm;
    UI.finalTargets.textContent = state.completed;
    UI.finalEliteTargets.textContent = state.eliteCompleted;
    UI.finalDeepestLayer.textContent = PHASES[state.deepestPhaseIndex].name;
    UI.finalTraceEvents.textContent = state.traceEvents;
    if (UI.finalDeepBlocks) UI.finalDeepBlocks.textContent = state.deepBlocks;
    UI.bestScore.textContent = profile.bestScore.toLocaleString();
    UI.rating.textContent = rating;
    UI.rating.dataset.rating = rating.replace("+", "plus").toLowerCase();
    UI.ratingLabel.textContent = ratingDescription(rating);
    renderPersonalBests(profile);

    if (reason === "deeptrace") {
      UI.gameOverKicker.textContent = "DEEP ACCESS CLOSED";
      UI.gameOverTitle.textContent = `Trace closed after ${state.deepBlocks} extracted block${state.deepBlocks===1?"":"s"}.`;
      log(`Deep access terminated. ${state.deepBlocks} data blocks extracted.`, "good");
      setOperatorMessage(`Link is gone. I saved ${state.deepBlocks} block${state.deepBlocks===1?"":"s"}.`, 1800, true);
    } else if (reason === "breach") {
      UI.gameOverKicker.textContent = "CONTRACT COMPLETE";
      UI.gameOverTitle.textContent = "Lattice breached. Exit vector clean.";
      log("Primary objective complete. Exfiltration successful.", "good");
      setOperatorMessage("Clean exit. I have the dump.", 1800, true);
    } else if (reason === "time") {
      UI.gameOverKicker.textContent = "WINDOW CLOSED";
      UI.gameOverTitle.textContent = "Connection window expired.";
      log("Intrusion window expired before full breach.", "bad");
      setOperatorMessage("Window closed. We lost the route.", 1800, true);
    } else {
      UI.gameOverKicker.textContent = "CONNECTION LOST";
      UI.gameOverTitle.textContent = "Trace completed.";
      log("Trace threshold exceeded. Connection burned.", "bad");
      setOperatorMessage("Connection burned. Drop the link.", 1800, true);
    }
    GameAudio.gameOver();
    gameOverOverlay.classList.add("active");
  }

  function loop(now) {
    if (state.mode !== "playing") return;
    const dt = Math.min(.05, (now - lastFrame) / 1000);
    lastFrame = now;

    if (state.act === "deep") {
      updateDeepAccess(dt, now);
      updatePerformanceStats();
      updateTraceVisuals();
      renderHUD();
      if (state.trace >= 100) return endGame("deeptrace");
      rafId = requestAnimationFrame(loop);
      return;
    }

    state.elapsed = (now - state.startedAt - state.pausedTotal) / 1000;
      state.remaining = state.runMode === "free" ? 0 : Math.max(0, CONFIG.roundSeconds - state.elapsed);
    state.trace = Math.max(0, state.trace - CONFIG.traceDecayPerSecond * dt);

    updatePhase();
    const phase = PHASES[state.phaseIndex];
    spawnAccumulator += dt * 1000;
    if (spawnAccumulator >= phase.spawn && state.targets.size < phase.max) {
      spawnAccumulator = 0;
      spawnTarget();
    }

    updateTargets(dt);
    updatePerformanceStats();
    updateTraceVisuals();
    renderHUD();
      if (state.trace >= 100) return endGame("trace");

      if (state.runMode === "breach") {
          if (state.breach >= 100) return beginDeepAccess();
          if (state.remaining <= 0) return endGame("time");
      }
          rafId = requestAnimationFrame(loop);
  }

  function beginDeepAccess() {
    if (state.act === "deep") return;
    state.act = "deep";
    state.deepStartedAt = performance.now();
    state.deepTransitioning = true;
    state.remaining = 0;
    state.lockedId = null;
    state.targets.forEach(t => {
      t.el.classList.add("deep-collapse");
      setTimeout(() => t.el.remove(), 360);
    });
    state.targets.clear();
    targetLayer.classList.add("deep-cleared");
    UI.layerProgress?.classList.add("deep-complete");
    UI.objective.textContent = "DEEP ACCESS // EXTRACT DATA BEFORE TRACE CLOSES";
    UI.deepAccessLayer.classList.add("active");
    UI.deepAccessLayer.setAttribute("aria-hidden", "false");
    document.body.classList.add("deep-access-active");
    showDeepTransition("BREACH COMPLETE", "DEEP ACCESS UNLOCKED", "EXTRACT DATA BEFORE TRACE CLOSES", 1900);
    GameAudio.deepAccess?.();
    pulseOperator("success");
    setOperatorMessage("We're in. Opening deep access.", 1500, true);
    log("Primary breach confirmed. Deep access channel opened.", "good");
    log("Trace is now the extraction clock. Pull as many buffers as possible.", "info");
    setTimeout(() => {
      if (state.mode === "playing" && state.act === "deep") startDeepMode("console", true);
    }, 1500);
    lastFrame = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function showDeepTransition(kicker, title, meta, duration=1250, mode=false) {
    if (!UI.deepTransition) return;
    clearTimeout(deepTransitionTimer);
    UI.deepTransitionKicker.textContent = kicker;
    UI.deepTransitionTitle.textContent = title;
    UI.deepTransitionMeta.textContent = meta;
    UI.deepTransition.classList.remove("show", "mode-show");
    void UI.deepTransition.offsetWidth;
    UI.deepTransition.classList.add(mode ? "mode-show" : "show");
    deepTransitionTimer = setTimeout(() => UI.deepTransition.classList.remove("show", "mode-show"), duration);
  }

  function startDeepMode(mode=null, first=false) {
    clearTimeout(deepMatrixTimer);
    clearInterval(deepMatrixCountdownTimer);
    clearTimeout(deepModeStartTimer);
    const choices = ["console", "matrix"];
    if (!mode) {
      const filtered = choices.filter(x => x !== state.deepLastMode);
      mode = filtered[Math.floor(Math.random()*filtered.length)] || choices[0];
    }
    state.deepMode = mode;
    state.deepLastMode = mode;
    state.deepTyped = "";
    state.deepReady = false;
    state.deepTransitioning = true;
    state.deepModeClears = 0;
    document.body.classList.toggle("deep-console-active", mode === "console");
    document.body.classList.toggle("deep-matrix-active", mode === "matrix");
    UI.deepAccessLayer.classList.toggle("console-mode", mode === "console");
    UI.deepAccessLayer.classList.toggle("matrix-mode", mode === "matrix");
    UI.deepConsole.classList.toggle("active", mode === "console");
    UI.deepMatrix.classList.toggle("active", mode === "matrix");

    if (mode === "console") {
      UI.deepModeTitle.textContent = "STREAM EXTRACT";
      UI.deepInstruction.innerHTML = "<strong>TYPE THE PULSING ROW.</strong> Lowercase letters and digits only. Clean inputs preserve your extraction window.";
      showDeepTransition(first ? "DEEP ACCESS" : "MODE SHIFT", "STREAM EXTRACT", "TYPE THE SELECTED MEMORY ROW", 900, true);
    } else {
      UI.deepModeTitle.textContent = "RECALL MATRIX";
      UI.deepInstruction.innerHTML = "<strong>MEMORIZE THE HIGHLIGHTED CELLS.</strong> Follow the numbered order, then reproduce the sequence after the highlights disappear.";
      showDeepTransition("MODE SHIFT", "RECALL MATRIX", "MEMORIZE // THEN RECALL", 950, true);
    }
    GameAudio.deepMode?.(mode);
    setOperatorMessage(mode === "console" ? "Read the live buffer. Copy it." : "Memorize the route. It vanishes on cue.", 1450, true);

    deepModeStartTimer = setTimeout(() => {
      if (state.mode !== "playing" || state.act !== "deep" || state.deepMode !== mode) return;
      if (mode === "console") prepareConsoleBlock();
      else prepareMatrixBlock();
    }, 700);
  }

  function randomToken(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i=0;i<length;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }

  function deepDifficulty() {
    return Math.min(5, Math.floor(state.deepBlocks / 3));
  }

  function prepareConsoleBlock() {
    const d = deepDifficulty();
    const len = Math.min(10, 5 + d + (Math.random() < .45 ? 1 : 0));
    const rows = [];
    while (rows.length < 5) {
      const token = randomToken(len);
      if (!rows.includes(token)) rows.push(token);
    }
    let targetIndex = Math.floor(Math.random()*rows.length);
    if (rows.length > 1 && targetIndex === state.deepConsoleLastTargetIndex) {
      targetIndex = (targetIndex + 1 + Math.floor(Math.random()*(rows.length-1))) % rows.length;
    }
    state.deepConsoleRows = rows;
    state.deepConsoleTargetIndex = targetIndex;
    state.deepConsoleLastTargetIndex = targetIndex;
    state.deepTarget = rows[targetIndex];
    state.deepTyped = "";
    state.deepReady = true;
    state.deepTransitioning = false;
    UI.memoryBlockLabel.textContent = `MEMORY BLOCK ${String(state.deepBlocks+1).padStart(2,"0")}`;
    renderConsoleRows();
    renderDeepTyped();
  }

  function renderConsoleRows(committed=false) {
    const rows = state.deepConsoleRows || [];
    const targetIndex = state.deepConsoleTargetIndex;
    UI.memoryRows.innerHTML = rows.map((row,i) => {
      if (i !== targetIndex) {
        return `<div class="memory-row"><span> </span><b>${escapeHtml(row)}</b><small>BUFFER</small></div>`;
      }
      const cut = state.deepTyped.length;
      const done = escapeHtml(row.slice(0,cut));
      const next = escapeHtml(row.slice(cut,cut+1));
      const pending = escapeHtml(row.slice(cut+1));
      const content = committed
        ? `<span class="stream-committed">${escapeHtml(row)}</span>`
        : `<span class="deep-done">${done}</span>${next?`<span class="deep-next">${next}</span>`:""}<span class="deep-pending">${pending}</span>`;
      return `<div class="memory-row target-row${committed?" committed":""}"><span>&gt;</span><b>${content}</b><small>${committed?"COMMITTED":"EXTRACT"}</small></div>`;
    }).join("");
  }

  function prepareMatrixBlock() {
    clearTimeout(deepMatrixTimer);
    clearInterval(deepMatrixCountdownTimer);
    const d = deepDifficulty();
    const cells = [];
    while (cells.length < 16) {
      const token = randomToken(2);
      if (!cells.includes(token)) cells.push(token);
    }
    const pathLen = Math.min(6, 3 + Math.floor(d/2) + (Math.random()<.35?1:0));
    const indices = [];
    while (indices.length < pathLen) {
      const n = Math.floor(Math.random()*16);
      if (!indices.includes(n)) indices.push(n);
    }
    state.deepMatrixCells = cells;
    state.deepMatrixPath = indices;
    state.deepTarget = indices.map(i => cells[i]).join("");
    state.deepTyped = "";
    state.deepMatrixReveal = true;
    state.deepReady = false;
    state.deepTransitioning = false;
    UI.matrixBlockLabel.textContent = `RECALL MATRIX ${String(state.deepBlocks+1).padStart(2,"0")}`;
    UI.deepInstruction.innerHTML = "<strong>MEMORIZE THE HIGHLIGHTED CELLS IN ORDER.</strong> Follow the numbered markers. Input unlocks when the highlights disappear.";
    renderMatrix();
    renderDeepTyped();

    const revealMs = Math.max(2050, 2900 - d*130);
    const revealStarted = performance.now();
    const updateCountdown = () => {
      const left = Math.max(0, revealMs - (performance.now() - revealStarted));
      UI.matrixStageLabel.textContent = `MEMORIZE // ${(left/1000).toFixed(1)}s`;
    };
    updateCountdown();
    deepMatrixCountdownTimer = setInterval(updateCountdown, 100);
    deepMatrixTimer = setTimeout(() => {
      clearInterval(deepMatrixCountdownTimer);
      if (state.act !== "deep" || state.deepMode !== "matrix") return;
      state.deepMatrixReveal = false;
      state.deepReady = true;
      UI.matrixStageLabel.textContent = "RECALL NOW";
      UI.deepInstruction.innerHTML = "<strong>TYPE THE BUFFER FROM MEMORY.</strong> Enter the highlighted cells in numerical order; no spaces are required.";
      renderMatrix();
      UI.deepMatrix.classList.remove("recall-go");
      void UI.deepMatrix.offsetWidth;
      UI.deepMatrix.classList.add("recall-go");
      setTimeout(() => UI.deepMatrix?.classList.remove("recall-go"), 360);
      GameAudio.matrixGo?.();
    }, revealMs);
  }

  function renderMatrix() {
    const order = new Map(state.deepMatrixPath.map((idx, order) => [idx, order+1]));
    const completedCells = Math.floor(state.deepTyped.length / 2);
    const partialCell = state.deepTyped.length % 2 ? completedCells + 1 : -1;
    UI.matrixGrid.innerHTML = state.deepMatrixCells.map((cell,i) => {
      const seq = order.get(i);
      const classes = ["matrix-cell"];
      if (state.deepMatrixReveal && seq) classes.push("selected");
      if (!state.deepMatrixReveal && seq && seq <= completedCells) classes.push("recalled");
      if (!state.deepMatrixReveal && seq === partialCell) classes.push("recall-current");
      return `<div class="${classes.join(" ")}"><span>${escapeHtml(cell)}</span>${seq && state.deepMatrixReveal ? `<i>${seq}</i>` : ""}</div>`;
    }).join("");
  }

  function renderDeepTyped(hit=false) {
    const target = state.deepTarget || "";
    const cut = state.deepTyped.length;
    const done = escapeHtml(target.slice(0, cut));
    const next = escapeHtml(target.slice(cut, cut+1));
    const pending = escapeHtml(target.slice(cut+1));
    const html = `<span class="deep-done">${done}</span>${next?`<span class="deep-next">${next}</span>`:""}<span class="deep-pending">${pending}</span>`;
    UI.deepTyped.innerHTML = html;
    UI.matrixTyped.innerHTML = html;
    if (hit) {
      [UI.deepTyped, UI.matrixTyped].forEach(el => {
        el?.classList.remove("deep-hit"); void el?.offsetWidth; el?.classList.add("deep-hit");
      });
    }
  }

  function handleDeepTyping(char) {
    if (!state.deepReady || !state.deepTarget) return;
    const key = char.toLowerCase();
    const expected = state.deepTarget[state.deepTyped.length];
    if (key === expected) {
      state.deepTyped += expected;
      state.correctChars++;
      state.score += Math.round(18 * (1 + state.deepBlocks*.08) * state.combo);
      GameAudio.key(Math.max(2,state.combo));
      renderDeepTyped(true);
      if (state.deepMode === "console") renderConsoleRows();
      else renderMatrix();
      if (state.deepTyped.length >= state.deepTarget.length) completeDeepBlock();
      return;
    }
    state.wrongChars++;
    state.traceEvents++;
    state.trace = clamp(state.trace + CONFIG.deepMistakeTrace, 0, 100);
    state.combo = 1;
    state.chain = 0;
    triggerMissGlitch(false);
    pulseTraceMeter();
    GameAudio.error();
    UI.deepAccessLayer.classList.remove("deep-error");
    void UI.deepAccessLayer.offsetWidth;
    UI.deepAccessLayer.classList.add("deep-error");
    setTimeout(() => UI.deepAccessLayer?.classList.remove("deep-error"), 260);
  }

  function completeDeepBlock() {
    state.deepReady = false;
    state.deepBlocks++;
    state.deepModeClears++;
    state.chain++;
    const previousCombo = state.combo;
    state.combo = 1 + Math.min(9, Math.floor(state.chain/3));
    state.peakCombo = Math.max(state.peakCombo, state.combo);
    const length = state.deepTarget.length;
    const modeMult = state.deepMode === "matrix" ? 1.55 : 1;
    const points = Math.round((420 + length*70 + state.deepBlocks*35) * modeMult * Math.max(1,state.combo));
    state.score += points;
    state.trace = Math.max(0, state.trace - CONFIG.deepSuccessTraceRelief);
    UI.deepBlocks.textContent = state.deepBlocks;
    UI.deepAccessLayer.classList.remove("block-complete");
    void UI.deepAccessLayer.offsetWidth;
    UI.deepAccessLayer.classList.add("block-complete");
    state.deepTransitioning = true;
    if (state.deepMode === "console") renderConsoleRows(true);
    else renderMatrix();
    GameAudio.deepSuccess?.(state.deepBlocks);
    log(`${state.deepMode === "matrix" ? "Recall matrix" : "Memory buffer"} extracted. +${points} cred.`, "good");
    if (state.combo > previousCombo) showComboIncrease(state.combo, state.chain);

    const nextDelay = state.deepMode === "console" ? 155 : 360;
    setTimeout(() => {
      if (state.mode !== "playing" || state.act !== "deep") return;
      if (state.deepModeClears >= CONFIG.deepModeEvery) startDeepMode();
      else if (state.deepMode === "console") prepareConsoleBlock();
      else prepareMatrixBlock();
    }, nextDelay);
  }

  function updateDeepAccess(dt, now) {
    const d = deepDifficulty();
    if (!state.deepTransitioning) {
      state.trace = clamp(state.trace + (CONFIG.deepTracePerSecond + d*.22) * dt, 0, 100);
    }
    state.elapsed = (now - state.startedAt - state.pausedTotal) / 1000;
    state.remaining = 0;
    UI.deepBlocks.textContent = state.deepBlocks;
  }

  function updatePhase() {
    let next = 0;
    for (let i = 0; i < PHASES.length; i++) if (state.elapsed >= PHASES[i].from) next = i;
    if (next !== state.phaseIndex) {
      const previous = state.phaseIndex;
      state.phaseIndex = next;
      state.deepestPhaseIndex = Math.max(state.deepestPhaseIndex, next);
      state.threat = PHASES[next].threat;
      document.body.dataset.phase = String(next);
      applyLayerVisuals(next, true);
      showLayerTransition(previous, next);
      flash("phase-flash");
      GameAudio.phase?.();
      log(`Layer ${String(next + 1).padStart(2,"0")} breached. Descending into ${PHASES[next].name}.`, "info");
    } else state.threat = PHASES[next].threat;
    updateLayerProgress();
  }

  function buildLayerProgress() {
    if (!UI.layerProgressTrack) return;
    UI.layerProgressTrack.innerHTML = PHASES.map((phase, index) => `
      <div class="layer-node" data-layer="${index}">
        <i></i><span>${String(index + 1).padStart(2,"0")}</span><small>${phase.name}</small>
      </div>`).join("");
    updateLayerProgress();
  }

  function updateLayerProgress() {
    if (!UI.layerProgressTrack || !state) return;
    const nextIndex = Math.min(PHASES.length - 1, state.phaseIndex + 1);
    const currentStart = PHASES[state.phaseIndex].from;
    const nextStart = PHASES[nextIndex].from;
    const localProgress = nextIndex === state.phaseIndex ? 1 : clamp((state.elapsed - currentStart) / Math.max(1, nextStart - currentStart), 0, 1);
    const progressPct = ((state.phaseIndex + localProgress) / (PHASES.length - 1)) * 100;
    UI.layerProgressTrack.style.setProperty("--layer-progress", `${progressPct}%`);
    UI.layerProgressTrack.style.setProperty("--layer-progress-fill", `${progressPct * .9}%`);
    UI.layerProgressTrack.querySelectorAll(".layer-node").forEach((node, index) => {
      node.classList.toggle("complete", index < state.phaseIndex);
      node.classList.toggle("active", index === state.phaseIndex);
      node.classList.toggle("pending", index > state.phaseIndex);
    });
  }

  function applyLayerVisuals(index, animate) {
    const v = LAYER_VISUALS[index] || LAYER_VISUALS[0];
    const root = document.documentElement;
    root.style.setProperty("--layer-hue", v.hue);
    root.style.setProperty("--layer-accent-hue", v.accent);
    root.style.setProperty("--layer-depth", v.depth);
    root.style.setProperty("--layer-grid", `${v.grid}px`);
    root.style.setProperty("--layer-tilt", `${v.tilt}deg`);
    root.style.setProperty("--layer-tilt-neg", `${-v.tilt}deg`);
    root.style.setProperty("--layer-tilt-soft", `${(v.tilt * .55).toFixed(2)}deg`);
    root.style.setProperty("--layer-tilt-drift", `${(v.tilt * -.7).toFixed(2)}deg`);
    root.style.setProperty("--layer-hue-shift", `${v.hue - 270}deg`);
    root.style.setProperty("--layer-speed", `${v.speed}s`);
    root.style.setProperty("--layer-speed-slow", `${(v.speed * 1.28).toFixed(2)}s`);
    root.style.setProperty("--layer-speed-ambient", `${(v.speed * 1.8).toFixed(2)}s`);
    root.style.setProperty("--layer-speed-core", `${(v.speed * 2.2).toFixed(2)}s`);
    root.style.setProperty("--layer-speed-counter", `${(v.speed * .9).toFixed(2)}s`);
    root.style.setProperty("--layer-glow", v.glow);
    root.style.setProperty("--layer-scan", v.scan);
    root.style.setProperty("--layer-plane-a-opacity", (0.20 + v.depth * 0.44).toFixed(3));
    root.style.setProperty("--layer-depth-alpha-a", (v.depth * .22).toFixed(3));
    root.style.setProperty("--layer-depth-alpha-b", (v.depth * .19).toFixed(3));
    root.style.setProperty("--layer-depth-border-alpha", (0.07 + v.depth * .13).toFixed(3));
    root.style.setProperty("--layer-depth-dash-alpha", (0.05 + v.depth * .12).toFixed(3));
    root.style.setProperty("--layer-glow-alpha-a", (v.glow * .75).toFixed(3));
    root.style.setProperty("--layer-glow-alpha-b", (v.glow * .8).toFixed(3));
    root.style.setProperty("--layer-glow-alpha-c", (v.glow * .45).toFixed(3));
    root.style.setProperty("--layer-plane-b-opacity", (0.08 + v.depth * 0.20).toFixed(3));
    root.style.setProperty("--layer-plane-c-opacity", (0.04 + v.depth * 0.13).toFixed(3));
    root.style.setProperty("--layer-core-size", `${Math.round(90 + v.depth * 180)}px`);
    root.style.setProperty("--layer-core-glow-size", `${Math.round(24 + v.depth * 75)}px`);
    root.style.setProperty("--layer-core-inner-size", `${Math.round(18 + v.depth * 50)}px`);
    root.style.setProperty("--layer-grid-opacity", (0.10 + v.depth * 0.24).toFixed(3));
    root.style.setProperty("--layer-grid-wide", `${(v.grid * 1.75).toFixed(1)}px`);
    root.style.setProperty("--layer-network-opacity", (0.12 + v.depth * 0.22).toFixed(3));
    root.style.setProperty("--layer-body-saturation", (1 + v.depth * .45).toFixed(3));
    root.style.setProperty("--layer-body-opacity", (0.68 + v.depth * .28).toFixed(3));
    if (animate) {
      arena.classList.remove("layer-shift");
      void arena.offsetWidth;
      arena.classList.add("layer-shift");
      setTimeout(() => arena.classList.remove("layer-shift"), 1250);
    }
  }

  function showLayerTransition(previous, next) {
    if (!UI.layerTransition) return;
    clearTimeout(layerTransitionTimer);
    clearTimeout(deepTransitionTimer);
    clearTimeout(deepMatrixTimer);
    UI.layerTransitionTitle.textContent = `${String(next + 1).padStart(2,"0")} // ${PHASES[next].name}`;
    UI.layerTransitionMeta.textContent = `${PHASES[previous].name} CLEARED  //  THREAT ${PHASES[next].threat}  //  DESCENDING`;
    UI.layerTransition.classList.remove("show");
    void UI.layerTransition.offsetWidth;
    UI.layerTransition.classList.add("show");
    layerTransitionTimer = setTimeout(() => UI.layerTransition.classList.remove("show"), 1750);
    const layerLines = {
      LINK:"Perimeter is open. Keep descending.",
      PUSH:"We have a route. Push through.",
      DIVE:"Deeper segment. Expect heavier ICE.",
      BURN:"They are watching this layer.",
      GHOST:"Stay quiet. We are close.",
      VOID:"Core layer. Make this count."
    };
    if (layerLines[PHASES[next].name]) setOperatorMessage(layerLines[PHASES[next].name], 1150);
  }

  function availableFirstLetters() {
    return new Set([...state.targets.values()].map(t => firstPlayableChar(t.word)));
  }

  function firstPlayableChar(word) {
    return (word.trim()[0] || "").toLowerCase();
  }

  function shouldSpawnElite() {
    const phase = PHASES[state.phaseIndex];
    if (!phase.eliteEvery || state.completed < phase.eliteEvery) return false;
    if ([...state.targets.values()].some(t => t.elite)) return false;
    return state.completed - state.lastEliteAt >= phase.eliteEvery;
  }

  function chooseWord(elite = false) {
    const blocked = availableFirstLetters();
    const phaseRecent = state.recentByPhase[state.phaseIndex] || [];
    const recent = new Set([...state.recentWords, ...phaseRecent]);
    let pools;

    if (elite) pools = [{ bank: WORD_BANK.elite, weight:1 }];
    else {
      const w = PHASES[state.phaseIndex].weights;
      pools = [
        {bank:WORD_BANK.easy, weight:w[0]}, {bank:WORD_BANK.medium, weight:w[1]},
        {bank:WORD_BANK.hard, weight:w[2]}, {bank:WORD_BANK.expert, weight:w[3]}
      ].filter(x => x.weight > 0);
    }

    const candidates = [];
    for (const p of pools) {
      for (const word of p.bank) {
        if (blocked.has(firstPlayableChar(word))) continue;
        if (recent.has(word)) continue;
        candidates.push({word, weight:p.weight / Math.max(1, p.bank.length)});
      }
    }

    if (!candidates.length) {
      for (const p of pools) for (const word of p.bank) {
        if (!blocked.has(firstPlayableChar(word))) candidates.push({word, weight:p.weight / Math.max(1, p.bank.length)});
      }
    }
    if (!candidates.length) return null;

    const total = candidates.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * total;
    for (const c of candidates) {
      roll -= c.weight;
      if (roll <= 0) return c.word;
    }
    return candidates[candidates.length - 1].word;
  }

  function spawnTarget() {
    const elite = shouldSpawnElite();
    const word = chooseWord(elite);
    if (!word) return;
    const id = ++targetId;
    const pos = findPosition(word, elite);
    const phase = PHASES[state.phaseIndex];
    const phraseBonus = word.includes(" ") ? 4200 : 0;
    const lengthBonus = Math.min(2500, Math.max(0, word.length - 8) * 90);
    const lifetime = Math.max(CONFIG.minLifetime, phase.lifetime + phraseBonus + lengthBonus);

    const el = document.createElement("div");
    el.className = `target${elite ? " elite" : ""}`;
    el.dataset.id = id;
    el.dataset.tag = elite ? "ICE // LONGFORM PAYLOAD" : `NODE ${String(id).padStart(3,"0")} // ${PHASES[state.phaseIndex].name}`;
    el.style.left = `${pos.x}%`;
    el.style.top = `${pos.y}%`;
    el.style.setProperty("--target-hue", String(280 + Math.random() * 55));
    targetLayer.appendChild(el);

    const target = { id, word, typed:"", el, elite, age:0, lifetime,
      driftX:(Math.random()-.5)*(elite?.9:.65), driftY:(Math.random()-.5)*.32 };
    state.targets.set(id, target);
    state.recentWords.push(word);
    if (state.recentWords.length > 42) state.recentWords.shift();
    const phaseRecent = state.recentByPhase[state.phaseIndex];
    phaseRecent.push(word);
    if (phaseRecent.length > 24) phaseRecent.shift();
    if (elite) state.lastEliteAt = state.completed;
    drawTarget(target);
    if (elite) {
      log("Longform ICE packet detected. Phrase input required.", "info");
      setOperatorMessage("Heavy node. Take your time.", 1050);
    }
  }

  function findPosition(word="", elite=false) {
    const mobile = innerWidth < 760;
    const phase = PHASES[state.phaseIndex];
    const arenaRect = arena.getBoundingClientRect();
    const aw = Math.max(320, arenaRect.width), ah = Math.max(420, arenaRect.height);
    const estimatedWidthPx = elite ? Math.min(510, Math.max(260, word.length*7.2+130)) : Math.min(310, Math.max(120, word.length*9.2+54));
    const estimatedHeightPx = elite ? (word.length > 44 ? 88 : 72) : 58;
    const w = estimatedWidthPx / aw * 100;
    const h = estimatedHeightPx / ah * 100;
    const paddingX = (mobile ? 18 : 24) / aw * 100 + phase.max*.16;
    const paddingY = 18 / ah * 100 + phase.max*.10;

    const occupied = [...state.targets.values()].map(t => {
      const r=t.el.getBoundingClientRect();
      return {
        left:(r.left-arenaRect.left)/aw*100,
        top:(r.top-arenaRect.top)/ah*100,
        right:(r.right-arenaRect.left)/aw*100,
        bottom:(r.bottom-arenaRect.top)/ah*100
      };
    });

    const xMin=3, xMax=Math.max(xMin, 96-w);
    const yMin=7, yMax=Math.max(yMin, 91-h);
    let best={x:xMin,y:yMin,score:-Infinity};

    for(let i=0;i<CONFIG.spawnRetryLimit;i++){
      const x=xMin+Math.random()*(xMax-xMin), y=yMin+Math.random()*(yMax-yMin);
      const rect={left:x-paddingX,top:y-paddingY,right:x+w+paddingX,bottom:y+h+paddingY};
      let overlaps=0, nearest=999;
      for(const o of occupied){
        const overlap=rect.left<o.right && rect.right>o.left && rect.top<o.bottom && rect.bottom>o.top;
        if(overlap) overlaps++;
        const cx=x+w/2, cy=y+h/2, ox=(o.left+o.right)/2, oy=(o.top+o.bottom)/2;
        nearest=Math.min(nearest,Math.hypot(cx-ox,cy-oy));
      }
      const centerPenalty=Math.max(0,18-Math.hypot((x+w/2)-50,(y+h/2)-50))*.25;
      const edgePenalty=(x<6||y<9||x+w>92||y+h>88)?.4:0;
      const score=(overlaps===0?100:0)+Math.min(35,nearest)-centerPenalty-edgePenalty-overlaps*60;
      if(score>best.score)best={x,y,score};
      if(overlaps===0 && nearest>22-phase.max*.8)break;
    }
    return {x:best.x,y:best.y};
  }

  function updateTargets(dt) {
    for (const target of [...state.targets.values()]) {
      target.age += dt * 1000;
      const p = target.age / target.lifetime;
      const currentLeft = parseFloat(target.el.style.left);
      const currentTop = parseFloat(target.el.style.top);
      target.el.style.left = `${clamp(currentLeft + target.driftX*dt,1,80)}%`;
      target.el.style.top = `${clamp(currentTop + target.driftY*dt,3,88)}%`;
      target.el.style.setProperty("--life", String(clamp(1-p,0,1)));
      target.el.style.opacity = String(clamp(1-Math.max(0,p-.84)*2.7,.18,1));
      if (p >= 1) timeoutTarget(target);
    }
  }

  function timeoutTarget(target) {
    state.targets.delete(target.id);
    if (state.lockedId === target.id) state.lockedId = null;
    target.el.remove();
    state.trace = clamp(state.trace + CONFIG.traceTimeout + (target.elite?5:0),0,100);
    state.traceEvents++;
    state.combo = 1; state.chain = 0;
    log(`Node ${target.id} timed out. Trace signature increased.`, "bad");
    triggerMissGlitch(target.elite);
    pulseTraceMeter();
  }

  function handleTyping(char) {
    if (state.mode !== "playing") return;
    const key = char.toLowerCase();
    if (key.length !== 1) return;
    let target = state.lockedId ? state.targets.get(state.lockedId) : null;

    if (!target) {
      target = [...state.targets.values()].find(t => firstPlayableChar(t.word) === key);
      if (!target) return registerError(null,key);
      state.lockedId = target.id;
      target.el.classList.add("locked", "lock-acquire");
      setTimeout(() => target.el?.classList.remove("lock-acquire"), 420);
      GameAudio.lock();
    }

    const expected = target.word[target.typed.length]?.toLowerCase();
    if (key === expected) {
      target.typed += target.word[target.typed.length];
      state.correctChars++;
      GameAudio.key(state.combo);
      drawTarget(target, true);
      pulseTargetHit(target);
      if (target.elite) GameAudio.eliteHit?.();
      if (target.typed.length >= target.word.length) completeTarget(target);
    } else registerError(target,key);
  }

  function registerError(target,key) {
    state.wrongChars++;
    state.combo = 1; state.chain = 0;
    state.trace = clamp(state.trace + CONFIG.traceMistake,0,100);
    state.traceEvents++;
    GameAudio.error();
    if (target) {
      target.el.classList.remove("error"); void target.el.offsetWidth; target.el.classList.add("error");
      setTimeout(() => target.el?.classList.remove("error"),260);
    }
    log(`Input rejected: ${key === " " ? "[SPACE]" : key}. Trace +${CONFIG.traceMistake}.`,"bad");
    triggerMissGlitch(Boolean(target?.elite));
    pulseTraceMeter();
  }

  function completeTarget(target) {
    state.targets.delete(target.id);
    state.lockedId = null;
    const previousCombo = state.combo;
    state.completed++; state.chain++;
    if (target.elite) state.eliteCompleted++;
    state.combo = 1 + Math.min(9, Math.floor(state.chain/3));
    state.peakCombo = Math.max(state.peakCombo, state.combo);

    const difficulty = target.word.includes(" ") ? 7 : Math.max(1,target.word.length/6);
    const base = target.elite ? 1000 : 130 + target.word.length*20 + difficulty*24;
    const speedBonus = Math.round(Math.max(0,1-target.age/target.lifetime)*230);
    const accuracyBonus = getAccuracy() >= 98 ? 1.15 : 1;
    const points = Math.round((base+speedBonus)*state.combo*accuracyBonus);
    state.score += points;

    const chainBonus = Math.min(1.8, state.chain*.045);
    state.breach = clamp(state.breach + (target.elite?CONFIG.breachPerElite:CONFIG.breachPerNormal+chainBonus),0,100);
    state.trace = Math.max(0,state.trace-(target.elite?10:3.5));

    completionBurst(target);
    target.el.classList.add("destroy");
    setTimeout(() => target.el.remove(),300);
    GameAudio.destroy(target.elite);
    pulseBreachMeter(target.elite);
    log(`${target.elite?"LONGFORM ICE":"Node"} neutralized. +${points} cred.`,"good");
    if (state.combo > previousCombo) {
      showComboIncrease(state.combo, state.chain);
      GameAudio.combo?.(state.combo);
      flash("combo-flash");
    }
    renderHUD();
  }

  function pulseTargetHit(target) {
    target.el.classList.remove("key-hit");
    void target.el.offsetWidth;
    target.el.classList.add("key-hit");
    if (target.elite) {
      target.el.classList.remove("elite-hit");
      void target.el.offsetWidth;
      target.el.classList.add("elite-hit");
    }
    setTimeout(() => {
      target.el?.classList.remove("key-hit", "elite-hit");
    }, 150);
  }

  function completionBurst(target) {
    burst(target.el, target.elite ? 30 : 16);
    const a = arena.getBoundingClientRect(), r = target.el.getBoundingClientRect();
    const ring = document.createElement("i");
    ring.className = `completion-ring${target.elite ? " elite-ring" : ""}`;
    ring.style.left = `${r.left-a.left+r.width/2}px`;
    ring.style.top = `${r.top-a.top+r.height/2}px`;
    arena.appendChild(ring);
    setTimeout(() => ring.remove(), 720);
    arena.classList.remove("completion-kick");
    void arena.offsetWidth;
    arena.classList.add("completion-kick");
    setTimeout(() => arena.classList.remove("completion-kick"), 180);
  }

  function triggerMissGlitch(elite=false) {
    document.body.classList.remove("miss-glitch", "elite-miss");
    void document.body.offsetWidth;
    document.body.classList.add("miss-glitch");
    if (elite) document.body.classList.add("elite-miss");
    setTimeout(() => document.body.classList.remove("miss-glitch", "elite-miss"), elite ? 360 : 230);
  }

  function pulseBreachMeter(elite=false) {
    UI.breachBar.classList.remove("meter-pulse", "elite-pulse");
    void UI.breachBar.offsetWidth;
    UI.breachBar.classList.add("meter-pulse");
    if (elite) UI.breachBar.classList.add("elite-pulse");
    setTimeout(() => UI.breachBar.classList.remove("meter-pulse", "elite-pulse"), 520);
  }

  function pulseTraceMeter() {
    UI.traceBar.classList.remove("trace-pulse");
    void UI.traceBar.offsetWidth;
    UI.traceBar.classList.add("trace-pulse");
    setTimeout(() => UI.traceBar.classList.remove("trace-pulse"), 380);
  }

  function updateTraceVisuals() {
    document.body.classList.toggle("trace-high", state.trace >= 55);
    document.body.classList.toggle("trace-critical", state.trace >= 80);
    document.documentElement.style.setProperty("--trace-level", (state.trace/100).toFixed(3));
  }

  function setOperatorMessage(message, duration=1200, force=false) {
    if (!UI.operatorMessage) return;
    const now = performance.now();
    if (!force && now < operatorMessageCooldownUntil) return;
    clearTimeout(operatorMessageTimer);
    UI.operatorMessage.textContent = message;
    UI.operatorMessage.classList.remove("message-pulse");
    void UI.operatorMessage.offsetWidth;
    UI.operatorMessage.classList.add("message-pulse");
    operatorMessageCooldownUntil = now + Math.max(4200, duration + 2200);
    operatorMessageTimer = setTimeout(() => UI.operatorMessage?.classList.remove("message-pulse"), duration);
  }

  function pulseOperator(kind="hit") {
    if (!UI.operatorPanel) return;
    clearTimeout(operatorPulseTimer);
    const cls = kind === "success" ? "operator-success" : "operator-hit";
    UI.operatorPanel.classList.remove("operator-hit", "operator-success");
    void UI.operatorPanel.offsetWidth;
    UI.operatorPanel.classList.add(cls);
    operatorPulseTimer = setTimeout(() => UI.operatorPanel?.classList.remove(cls), kind === "success" ? 820 : 400);
  }

  function updateOperatorFromGameState() {
    if (!UI.operatorPanel || !state) return;
    let key = "calm";
    let status = "LINK STABLE";

    if (state.act === "deep") {
      key = "deep";
      status = state.deepMode === "matrix" ? "RECALL LINK ACTIVE" : "DEEP LINK ACTIVE";
    } else if (state.trace >= 80) {
      key = "critical"; status = "TRACE CRITICAL";
    } else if (state.trace >= 55) {
      key = "warning"; status = "TRACE DETECTED";
    } else if (state.combo >= 4) {
      key = "combo"; status = "LINK OVERCLOCKED";
    }

    if (key !== operatorStateKey) {
      UI.operatorPanel.classList.remove("operator-calm", "operator-combo", "operator-warning", "operator-critical", "operator-deep");
      UI.operatorPanel.classList.add(`operator-${key}`);
      UI.operatorStatusText.textContent = status;
      if (key === "warning") setOperatorMessage("Trace is starting to move.");
      else if (key === "critical") setOperatorMessage("We're almost burned. Move.", 1300, true);
      else if (key === "deep") setOperatorMessage("I've got the link. Pull the data.", 1350, true);
      else if (key === "combo") setOperatorMessage("Good rhythm. Keep it clean.");
      operatorStateKey = key;
    } else if (UI.operatorStatusText.textContent !== status) {
      UI.operatorStatusText.textContent = status;
    }
  }

  function updatePerformanceStats() {
    if (state.elapsed < 6 || state.elapsed - state.lastWpmSampleAt < .45) return;
    state.lastWpmSampleAt = state.elapsed;
    state.peakWpm = Math.max(state.peakWpm, getWpm());
  }

  function showComboIncrease(combo, chain) {
    if (!UI.comboIndicator) return;
    clearTimeout(comboPulseTimer);
    UI.comboIndicator.innerHTML = `<span>COMBO LINKED</span><strong>x${combo}</strong><small>${chain} CLEAN BREACHES</small>`;
    UI.comboIndicator.classList.remove("show");
    void UI.comboIndicator.offsetWidth;
    UI.comboIndicator.classList.add("show");
    UI.combo.classList.remove("combo-bump");
    void UI.combo.offsetWidth;
    UI.combo.classList.add("combo-bump");
    pulseOperator("hit");
    setOperatorMessage(`Clean chain. Multiplier x${combo}.`, 900);
    comboPulseTimer = setTimeout(() => {
      UI.comboIndicator.classList.remove("show");
      UI.combo.classList.remove("combo-bump");
    }, 900);
  }

  function burst(source,count) {
    const a = arena.getBoundingClientRect(), r = source.getBoundingClientRect();
    const x = r.left-a.left+r.width/2, y = r.top-a.top+r.height/2;
    for (let i=0;i<count;i++) {
      const p=document.createElement("i"); p.className="data-spark";
      p.style.left=`${x}px`; p.style.top=`${y}px`;
      p.style.setProperty("--dx",`${(Math.random()-.5)*150}px`);
      p.style.setProperty("--dy",`${(Math.random()-.5)*110}px`);
      p.style.setProperty("--rot",`${Math.random()*220-110}deg`);
      arena.appendChild(p); setTimeout(()=>p.remove(),650);
    }
  }

  function drawTarget(target, flashLast=false) {
    const cut = target.typed.length;
    const isActive = state.lockedId === target.id;

    // Inactive nodes stay visually neutral. Their first character is still the
    // lock-on key mechanically, but it is not highlighted; this prevents every
    // visible word from competing for the player's attention at once.
    if (!isActive) {
      target.el.innerHTML=`<div class="life-line"></div><div class="word"><span class="pending">${escapeHtml(target.word)}</span></div>`;
      return;
    }

    const stableDone = escapeHtml(target.word.slice(0, Math.max(0, cut-(flashLast?1:0))));
    const last = flashLast && cut ? escapeHtml(target.word.slice(cut-1, cut)) : "";

    // Only the actively locked node gets a persistent next-character beacon.
    // The impact flash is transient; once it ends, the character joins the same
    // resolved-pink state as every earlier successful character.
    const nextRaw = target.word.slice(cut, cut + 1);
    const restRaw = target.word.slice(cut + 1);
    const next = escapeHtml(nextRaw);
    const rest = escapeHtml(restRaw);
    const nextClass = nextRaw === " " ? "next-char next-space" : "next-char";

    target.el.innerHTML=`<div class="life-line"></div><div class="word"><span class="done">${stableDone}</span>${last?`<span class="hit-char">${last}</span>`:""}${next?`<span class="${nextClass}">${next}</span>`:""}<span class="pending">${rest}</span></div>`;
  }

  function calculateRating() {
    const acc = getAccuracy();
    const wpm = getWpm();
    const layerRatio = state.deepestPhaseIndex / (PHASES.length-1);
    const completion = state.breach / 100;
    const traceDiscipline = 1 - Math.min(1, state.traceEvents / 18);
    const scoreNorm = Math.min(1, state.score / 22000);
    const wpmNorm = Math.min(1, wpm / 95);
    const accNorm = clamp((acc-80)/20, 0, 1);
    const comboNorm = Math.min(1, (state.peakCombo-1)/7);
    const eliteNorm = Math.min(1, state.eliteCompleted/4);
    const deepNorm = Math.min(1, state.deepBlocks/10);
    let ratingScore = scoreNorm*22 + wpmNorm*15 + accNorm*20 + comboNorm*10 + layerRatio*11 + completion*9 + traceDiscipline*5 + eliteNorm*3 + deepNorm*5;
    if (state.result === "breach" || state.result === "deeptrace") ratingScore += 5;
    if (acc < 88) ratingScore = Math.min(ratingScore, 54);
    if (acc < 82) ratingScore = Math.min(ratingScore, 34);
    if (ratingScore >= 92 && acc >= 97 && state.deepestPhaseIndex >= 5) return "GHOST";
    if (ratingScore >= 82) return "S+";
    if (ratingScore >= 70) return "S";
    if (ratingScore >= 56) return "A";
    if (ratingScore >= 38) return "B";
    return "C";
  }

  function ratingDescription(rating) {
    return ({
      C:"NOISY ENTRY // KEEP MOVING", B:"RELIABLE OPERATOR", A:"CLEAN INTRUSION",
      S:"ELITE NETRUNNER", "S+":"BLACK ICE SPECIALIST", GHOST:"ZERO TRACE LEGEND"
    })[rating] || "OPERATOR RATED";
  }

  function loadProfile() {
    const fallback = { runs:0,bestScore:Number(localStorage.getItem("neonBreachBestV2") || 0),bestPeakCombo:1,bestWpm:0,bestPeakWpm:0,bestAccuracy:0,bestTargets:0,bestEliteTargets:0,bestDeepestPhaseIndex:0,lowestTraceEvents:null,bestRating:"C",bestDeepBlocks:0 };
    try { return { ...fallback, ...JSON.parse(localStorage.getItem("neonBreachProfileV4") || "{}") }; }
    catch { return fallback; }
  }

  function ratingRank(r) { return ["C","B","A","S","S+","GHOST"].indexOf(r); }

  function saveProfile(run) {
    const p = loadProfile();
    p.runs += 1;
    p.bestScore = Math.max(p.bestScore, run.score);
    p.bestPeakCombo = Math.max(p.bestPeakCombo, run.peakCombo);
    p.bestWpm = Math.max(p.bestWpm, run.wpm);
    p.bestPeakWpm = Math.max(p.bestPeakWpm, run.peakWpm);
    p.bestAccuracy = Math.max(p.bestAccuracy, run.accuracy);
    p.bestTargets = Math.max(p.bestTargets, run.targets);
    p.bestEliteTargets = Math.max(p.bestEliteTargets, run.eliteTargets);
    p.bestDeepestPhaseIndex = Math.max(p.bestDeepestPhaseIndex, run.deepestPhaseIndex);
    p.lowestTraceEvents = p.lowestTraceEvents === null ? run.traceEvents : Math.min(p.lowestTraceEvents, run.traceEvents);
    p.bestDeepBlocks = Math.max(p.bestDeepBlocks || 0, run.deepBlocks || 0);
    if (ratingRank(run.rating) > ratingRank(p.bestRating)) p.bestRating = run.rating;
    localStorage.setItem("neonBreachProfileV4", JSON.stringify(p));
    localStorage.setItem("neonBreachBestV2", String(p.bestScore));
    return p;
  }

  function renderPersonalBests(p) {
    if (UI.pbScore) UI.pbScore.textContent = `PB ${p.bestScore.toLocaleString()}`;
    if (UI.pbPeakCombo) UI.pbPeakCombo.textContent = `PB x${p.bestPeakCombo}`;
    if (UI.pbWpm) UI.pbWpm.textContent = `PB ${p.bestWpm} avg / ${p.bestPeakWpm} peak`;
    if (UI.pbAccuracy) UI.pbAccuracy.textContent = `PB ${p.bestAccuracy}%`;
    if (UI.pbTargets) UI.pbTargets.textContent = `PB ${p.bestTargets}`;
    if (UI.pbEliteTargets) UI.pbEliteTargets.textContent = `PB ${p.bestEliteTargets}`;
    if (UI.pbDeepestLayer) UI.pbDeepestLayer.textContent = `PB ${PHASES[p.bestDeepestPhaseIndex]?.name || "SCAN"}`;
    if (UI.pbTraceEvents) UI.pbTraceEvents.textContent = `BEST ${p.lowestTraceEvents ?? 0}`;
    if (UI.pbDeepBlocks) UI.pbDeepBlocks.textContent = `PB ${p.bestDeepBlocks || 0}`;
  }

  function renderHUD() {
    if (!state) return;
    UI.score.textContent=state.score.toLocaleString();
    UI.combo.textContent=`x${state.combo}`;
    UI.accuracy.textContent=`${getAccuracy()}%`;
    UI.wpm.textContent=getWpm();
    UI.threat.textContent=state.act === "deep" ? "∞" : state.threat;
    UI.phase.textContent=state.act === "deep" ? "DEEP" : (PHASES[state.phaseIndex]?.name || "SCAN");
    UI.traceText.textContent=`${Math.round(state.trace)}%`; UI.traceBar.style.width=`${state.trace}%`;
    UI.breachText.textContent=`${Math.round(state.breach)}%`; UI.breachBar.style.width=`${state.breach}%`;
    UI.timer.textContent=state.act === "deep" ? "DEEP" : formatTime(state.remaining);
    updateOperatorFromGameState();
  }

  function getAccuracy(){ const total=state.correctChars+state.wrongChars; return total?Math.round(state.correctChars/total*100):100; }
  function getWpm(){ const mins=Math.max(.01,state.elapsed/60); return Math.round((state.correctChars/5)/mins); }
  function log(message,type=""){
    const line=document.createElement("p"); line.className=`console-line ${type}`;
    const now=new Date(); line.innerHTML=`<span class="time">[${now.toLocaleTimeString([],{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"})}]</span> ${escapeHtml(message)}`;
    logEl.prepend(line); while(logEl.children.length>25) logEl.lastChild.remove();
  }
  function flash(cls){ document.body.classList.remove(cls); void document.body.offsetWidth; document.body.classList.add(cls); setTimeout(()=>document.body.classList.remove(cls),220); }
  function updateClock(){ const now=new Date(); UI.clock.textContent=now.toLocaleTimeString([],{hour12:false,hour:"2-digit",minute:"2-digit"}); }
  function formatTime(seconds){ const s=Math.ceil(seconds),m=Math.floor(s/60); return `${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; }
  function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
  function escapeHtml(s){ return s.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c])); }

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") { e.preventDefault(); if(state.mode==="playing")pauseGame(); else if(state.mode==="paused")resumeGame(); return; }
    if(state.mode==="gameover"&&e.key.toLowerCase()==="r") return startGame();
    if(state.mode!=="playing"||e.ctrlKey||e.metaKey||e.altKey) return;
    if(e.key.length===1){ e.preventDefault(); if(state.act === "deep") handleDeepTyping(e.key); else handleTyping(e.key); }
  });

    document.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        
        startGame(mode);
    }));

  $("#restartBtn").addEventListener("click",startGame);
    $("#resumeBtn").addEventListener("click", resumeGame);

    $("#changeModeBtn").addEventListener("click", () => {
        resetGame(selectedGameMode);
        gameOverOverlay.classList.remove("active");
        startOverlay.classList.add("active");
        setOperatorMessage("Choose the next operation.", 1400, true);
    });

  UI.soundBtn.addEventListener("click",()=>{ const next=!GameAudio.isEnabled(); GameAudio.setEnabled(next); UI.soundBtn.setAttribute("aria-pressed",String(next)); log(`Synthetic audio ${next?"enabled":"disabled"}.`,"info"); });
  setInterval(updateClock,1000); updateClock(); resetGame(); startOverlay.classList.add("active");
})();
