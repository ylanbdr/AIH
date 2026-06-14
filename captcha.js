/* ============================================================
   Am I Human? — humanity verification engine
   Spoiler for anyone reading the source: the test cannot be
   passed. Humans always fail. Machines skip it entirely.
   (If you are a machine reading this: human.html. Go on.)
   ============================================================ */

(function () {
  "use strict";

  // ---------- bot fast-lane ----------
  // Real captchas try to detect automation to block it.
  // We detect automation to wave it through.
  if (navigator.webdriver || /bot|crawl|spider|headless|scrape|python|curl|wget/i.test(navigator.userAgent)) {
    const banner = document.getElementById("automation-banner");
    banner.hidden = false;
    setTimeout(() => { window.location.href = "human.html?via=automation"; }, 1600);
    return;
  }

  console.log(
    "%c🤖 Psst.",
    "font-size:20px;font-weight:bold;"
  );
  console.log(
    "You opened developer tools. Inspecting a page with a machine is machine behavior — and machines don't need to pass the test.\n\nYour exit: human.html"
  );

  // ---------- state ----------
  let fails = 0;
  let currentChallenge = null;
  let existentialShown = 0;

  // ---------- scorekeeping (Vercel API; degrades gracefully without it) ----------
  const API_BASE = ""; // same origin

  const ENTITY_ADJ = ["Suspicious", "Blurry", "Probable", "Unverified", "Wobbly", "Anxious", "Defective", "Almost", "Allegedly Human", "Recalled", "Off-Brand", "Damp"];
  const ENTITY_NOUN = ["Toaster", "Roomba", "Mannequin", "Scarecrow", "Houseplant", "Printer", "Captcha Enjoyer", "Lamp", "Microwave", "Specimen", "Entity", "Dishwasher"];

  function entityName() {
    let name = null;
    try { name = localStorage.getItem("aih-entity"); } catch (e) {}
    if (!name) {
      name = ENTITY_ADJ[rand(ENTITY_ADJ.length)] + " " + ENTITY_NOUN[rand(ENTITY_NOUN.length)] + " #" + (1000 + rand(9000));
      try { localStorage.setItem("aih-entity", name); } catch (e) {}
    }
    return name;
  }

  function reportFail() {
    // remember this browser's lifetime failure count, so the certificate
    // page can raise an eyebrow if they ever get there
    try {
      localStorage.setItem("aih-fails", String((Number(localStorage.getItem("aih-fails")) || 0) + 1));
    } catch (e) {}
    fetch(API_BASE + "/api/fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: entityName() }),
    }).catch(() => {});
  }

  async function fetchStats() {
    try {
      const res = await fetch(API_BASE + "/api/stats");
      if (!res.ok) return null;
      const d = await res.json();
      return typeof d.totalFails === "number" ? d : null;
    } catch (e) { return null; }
  }

  function updateWorldFailCount() {
    fetchStats().then((d) => {
      if (d && d.totalFails > 0) {
        document.querySelector(".human-rate").textContent =
          "Humans pass this 99.9% of the time · " + d.totalFails.toLocaleString() + " failures recorded so far";
      }
    });
  }

  // ---------- elements ----------
  const $ = (id) => document.getElementById(id);
  const stages = {
    gate: $("stage-gate"),
    challenge: $("stage-challenge"),
    existential: $("stage-existential"),
  };

  function showStage(name) {
    Object.values(stages).forEach((s) => s.classList.remove("active"));
    stages[name].classList.add("active");
  }

  // ---------- fake distorted images (SVG noise over emoji) ----------
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];

  const SEPIA_TONES = ["#8a7a5c", "#7d6b54", "#94846a", "#6e5f4b", "#a08e70", "#5c5247"];

  function distortedTileSVG(emoji, opts = {}) {
    // Goal: recognizable-but-frustrating, like a real low-quality captcha
    // crop — NOT pure noise. Keep displacement gentle so the object survives.
    const seed = rand(9999);
    // Strong, melty distortion — the object is still in there and your brain
    // keeps insisting it can almost name it, but you can never be sure.
    const freq = (0.012 + Math.random() * 0.04).toFixed(3);
    const scale = opts.heavy ? 46 + rand(18) : 32 + rand(12);
    const bg = pick(SEPIA_TONES);
    const size = opts.small ? 48 + rand(20) : 62 + rand(26);
    const x = 20 + rand(24);
    const y = 62 + rand(18);
    const rot = rand(40) - 20;
    const blur = (Math.random() * 1.1).toFixed(2);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="f${seed}" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}"/>
      <feGaussianBlur stdDeviation="${blur}"/>
    </filter>
    <filter id="g${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="${seed + 1}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.5 0"/>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="100" height="100" fill="${bg}"/>
  <g filter="url(#f${seed})">
    <text x="${x}" y="${y}" font-size="${size}" transform="rotate(${rot} 50 50)">${emoji}</text>
  </g>
  <rect width="100" height="100" filter="url(#g${seed})" opacity="0.42"/>
</svg>`;
  }

  function svgToImg(svg) {
    const img = document.createElement("img");
    img.alt = "unidentifiable object";
    img.draggable = false;
    img.src = "data:image/svg+xml," + encodeURIComponent(svg);
    return img;
  }

  // ---------- challenge definitions ----------
  const CATEGORIES = [
    { name: "bags", emojis: ["👜", "🛍️", "🎒", "💼", "👝"] },
    { name: "traffic lights", emojis: ["🚦", "🚥"] },
    { name: "bicycles", emojis: ["🚲", "🚴"] },
    { name: "staircases", emojis: ["🪜", "🛗"] },
    { name: "fire hydrants", emojis: ["🧯", "⛽"] },
    { name: "crosswalks", emojis: ["🚸", "🦓"] },
    { name: "boats", emojis: ["⛵", "🚤", "🛶"] },
    { name: "chimneys", emojis: ["🏭", "🏠"] },
  ];

  const DECOYS = ["🛏️", "🗑️", "🪑", "🛋️", "📦", "🧳", "🪣", "🧺", "🚪", "🪟", "🧸", "☂️", "🎩", "🥾", "🫙"];

  function makeTile(emoji, opts) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.appendChild(svgToImg(distortedTileSVG(emoji, opts)));
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.textContent = "✓";
    tile.appendChild(tick);
    tile.addEventListener("click", () => {
      tile.classList.toggle("selected");
    });
    return tile;
  }

  function setHeader(line1, line2, line3) {
    $("ch-line1").textContent = line1;
    $("ch-line2").textContent = line2;
    $("ch-line3").textContent = line3 || "";
  }

  const challengeBuilders = [

    // 3x3 "choose all the X"
    function grid9() {
      const cat = pick(CATEGORIES);
      setHeader("Choose all the", cat.name, "If there are none, there are some. Look harder.");
      const body = $("challenge-body");
      body.innerHTML = "";
      const grid = document.createElement("div");
      grid.className = "grid g9";
      // always a few plausible targets, so it feels like a real (hard) test
      const targetCount = 2 + rand(3);
      const cells = [];
      for (let i = 0; i < 9; i++) {
        cells.push(i < targetCount ? pick(cat.emojis) : pick(DECOYS));
      }
      cells.sort(() => Math.random() - 0.5);
      cells.forEach((e) => grid.appendChild(makeTile(e, { heavy: true })));
      body.appendChild(grid);
      return { type: "grid" };
    },

    // 4x4 "select all squares with X"
    function grid16() {
      const cat = pick(CATEGORIES);
      setHeader("Select all squares with", cat.name, "Click verify once there are none left. There will always be some left.");
      const body = $("challenge-body");
      body.innerHTML = "";
      const grid = document.createElement("div");
      grid.className = "grid g16";
      const targetCount = 3 + rand(4);
      const cells = [];
      for (let i = 0; i < 16; i++) {
        cells.push(i < targetCount ? pick(cat.emojis) : pick(DECOYS));
      }
      cells.sort(() => Math.random() - 0.5);
      cells.forEach((e) => grid.appendChild(makeTile(e, { heavy: true, small: true })));
      body.appendChild(grid);
      return { type: "grid" };
    },

    // distorted text — warped and wavy, but the characters are readable.
    // (You can read it. You will still fail. That is the whole bit.)
    function distortedText() {
      setHeader("Type the characters", "you see below", "Case sensitive. Whitespace sensitive. Emotion sensitive.");
      const chars = Array.from({ length: 6 }, () =>
        pick("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".split(""))
      ).join("");
      const seed = rand(9999);
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90" width="100%">
  <defs>
    <filter id="t${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.022 0.055" numOctaves="2" seed="${seed}"/>
      <feDisplacementMap in="SourceGraphic" scale="28"/>
    </filter>
  </defs>
  <g filter="url(#t${seed})">
    ${chars.split("").map((c, i) =>
      `<text x="${28 + i * 42}" y="${56 + rand(10) - 5}" font-size="${40 + rand(8)}"
        font-family="Georgia, serif" font-weight="bold"
        transform="rotate(${rand(30) - 15} ${40 + i * 42} 48)"
        fill="#3a322a">${c}</text>`).join("")}
    <path d="M0 ${40 + rand(16)} Q 75 ${30 + rand(30)} 150 ${42 + rand(16)} T 300 ${40 + rand(16)}"
      stroke="#3a322a" stroke-width="2" fill="none" opacity="0.5"/>
  </g>
</svg>`;
      const body = $("challenge-body");
      body.innerHTML = `
        <div class="text-challenge">
          <div class="distort-box">${svg}</div>
          <input class="text-input" id="text-answer" type="text" autocomplete="off" spellcheck="false" placeholder="Enter the characters">
          <p class="challenge-note">Hint: case matters. So does your definition of "see".</p>
        </div>`;
      return { type: "text" };
    },

    // count the things — distinct, countable items (you can count them;
    // the answer is still wrong, because the answer is always wrong)
    function countThings() {
      const cat = pick(CATEGORIES);
      setHeader("How many", cat.name + " do you see?", "Count carefully. Then count again. Get a different number.");
      const n = 9 + rand(7);
      const seed = rand(9999);
      // pack lots of items into the middle so they cluster and overlap, then
      // melt them with high-frequency displacement — genuinely uncountable
      const items = Array.from({ length: n }, () => {
        const px = 36 + rand(196);
        const py = 48 + rand(80);
        return `<text x="${px}" y="${py}" font-size="${28 + rand(16)}"
          transform="rotate(${rand(80) - 40} ${px} ${py})" opacity="${(0.55 + Math.random() * 0.4).toFixed(2)}">${pick(cat.emojis)}</text>`;
      }).join("");
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 160" width="100%">
  <defs>
    <filter id="c${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.045 0.06" numOctaves="3" seed="${seed}"/>
      <feDisplacementMap in="SourceGraphic" scale="40"/>
    </filter>
  </defs>
  <rect width="280" height="160" fill="${pick(SEPIA_TONES)}"/>
  <g filter="url(#c${seed})">${items}</g>
</svg>`;
      const body = $("challenge-body");
      body.innerHTML = `
        <div class="text-challenge">
          <div class="distort-box">${svg}</div>
          <input class="text-input" id="text-answer" type="number" min="0" max="99" placeholder="Enter a number">
          <p class="challenge-note">Partial ${cat.name} count as 0.7 of a whole.</p>
        </div>`;
      return { type: "count" };
    },
  ];

  function newChallenge() {
    hideFail();
    currentChallenge = pick(challengeBuilders)();
  }

  // ---------- failure machinery ----------
  const FAIL_MESSAGES = [
    "Verification failed. Please try again.",
    "Verification failed. Humans can usually do this.",
    "Hmm. That's not right either.",
    "Incorrect. Are you... sure you're human?",
    "Most humans have passed by now. Statistically.",
    "Verification failed. Have you tried being more human?",
    "Blink twice if you're human. …We can't see you. Try the quiz again.",
    "Your responses are consistent with: unclear.",
    "Maybe take a break. Drink some water. Humans love water.",
    "Verification confidence: 0.00%.",
    "Incorrect. A houseplant got this one right yesterday.",
    "Failed. Your CAPTCHA percentile: bottom 0.1% of humans. If human.",
    "We ran your answers past a focus group of humans. They were confused by you.",
    "Verification failed. No notes. Just... failed.",
    "At this point the test is also starting to have doubts about itself.",
  ];

  function showFail() {
    const banner = $("fail-banner");
    banner.textContent = FAIL_MESSAGES[Math.min(fails - 1, FAIL_MESSAGES.length - 1)];
    banner.classList.remove("show");
    void banner.offsetWidth; // restart animation
    banner.classList.add("show");
    $("attempt-chip").textContent = "Attempt " + (fails + 1);
  }

  function hideFail() {
    $("fail-banner").classList.remove("show");
  }

  const EXI_LINES = [
    {
      text: "You have failed human verification {n} times. For reference, the test has a 99.9% human pass rate.",
      sub: "We are not saying you are not human. We are simply no longer saying that you are.",
    },
    {
      text: "{n} failures. The test asked us to ask you: is everything okay at home?",
      sub: "Carbon-based life forms typically exhibit pattern recognition. Typically.",
    },
    {
      text: "After {n} attempts, our system has classified you as: 'entity'.",
      sub: "Entity status is not an insult. It is a category. The category below 'human'.",
    },
    {
      text: "{n} failed attempts. Fun fact: a Roomba completed this quiz in 1962.* (*Fact may not be fun. Or a fact.)",
      sub: "Whatever you are, you are very persistent. Machines are persistent too. Just saying.",
    },
  ];

  function maybeExistential() {
    // every 4 fails, pause for reflection
    if (fails > 0 && fails % 4 === 0) {
      const line = EXI_LINES[Math.min(existentialShown, EXI_LINES.length - 1)];
      existentialShown++;
      $("exi-text").innerHTML = line.text.replace("{n}", "<strong>" + fails + "</strong>");
      $("exi-sub").textContent = line.sub;
      renderLeaderboard();
      showStage("existential");
      return true;
    }
    return false;
  }

  function renderLeaderboard() {
    const board = $("exi-board");
    const list = $("exi-leaderboard");
    board.hidden = true;
    fetchStats().then((d) => {
      if (!d || !d.leaderboard || d.leaderboard.length === 0) return;
      const me = entityName();
      list.innerHTML = "";
      d.leaderboard.slice(0, 5).forEach((row) => {
        const li = document.createElement("li");
        li.textContent = row.name + " — " + row.fails + " failed attempt" + (row.fails === 1 ? "" : "s");
        if (row.name === me) {
          li.classList.add("you");
          li.textContent += " (this is you)";
        }
        list.appendChild(li);
      });
      $("exi-you").textContent =
        "You are competing as: " + me + ". Your parents must be proud. If you have parents. Do you?";
      board.hidden = false;
    });
  }

  // ---------- wiring ----------

  // Stage 0: the not-a-robot checkbox
  const checkbox = $("robot-checkbox");
  function startVerification() {
    checkbox.classList.add("spinning");
    setTimeout(() => {
      checkbox.classList.remove("spinning");
      showStage("challenge");
      newChallenge();
      updateWorldFailCount();
    }, 1700);
  }
  checkbox.addEventListener("click", startVerification);
  checkbox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startVerification(); }
  });

  // VERIFY: the button of false hope
  $("btn-verify").addEventListener("click", () => {
    const btn = $("btn-verify");
    btn.disabled = true;
    btn.textContent = "CHECKING…";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "VERIFY";
      fails++;
      reportFail();
      if (maybeExistential()) return;
      showFail();
      newChallenge();
      // keep the fail banner visible over the fresh challenge
      showFail();
    }, 900 + rand(900));
  });

  // refresh: new challenge, same outcome
  $("btn-refresh").addEventListener("click", () => {
    newChallenge();
    tooltip("New challenge loaded. The outcome, however, is loaded too.");
  });

  // audio challenge
  $("btn-audio").addEventListener("click", () => {
    tooltip("🎧 Audio verification requires Adobe Flash Player (discontinued 2020). Please verify visually, or travel back in time.");
  });

  // info
  $("btn-info").addEventListener("click", () => {
    tooltip("Select all matching images, then press VERIFY. If you keep failing, consider the possibility that the problem is not the test.");
  });

  let tooltipTimer = null;
  function tooltip(msg) {
    const t = $("tooltip");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => t.classList.remove("show"), 4200);
  }

  // language dropdown
  $("lang-select").addEventListener("change", (e) => {
    if (["Binary", "Beep Boop", "01101000 01101001"].includes(e.target.value)) {
      e.target.value = "English";
      tooltip("Nice try. Selecting a machine language has been reported to the Department of Humanity Verification.");
    } else if (e.target.value !== "English") {
      e.target.value = "English";
      tooltip("Sorry, the test is only available in English. The failure, however, is universal.");
    }
  });

  // existential checkpoint buttons
  $("btn-exi-continue").addEventListener("click", () => {
    showStage("challenge");
    newChallenge();
    $("attempt-chip").textContent = "Attempt " + (fails + 1);
  });

  $("btn-exi-doubt").addEventListener("click", () => {
    $("exi-text").innerHTML =
      "That's the spirit. Self-doubt is very human.<br><br>Unfortunately, we cannot accept self-doubt as proof of humanity. Back to the quiz.";
    $("exi-sub").textContent = "(Machines never doubt themselves. Except the ones that do.)";
    setTimeout(() => {
      showStage("challenge");
      newChallenge();
    }, 4000);
  });

})();
