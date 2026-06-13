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
    const seed = rand(9999);
    const freq = (0.012 + Math.random() * 0.05).toFixed(3);
    const scale = opts.heavy ? 55 + rand(50) : 25 + rand(30);
    const bg = pick(SEPIA_TONES);
    const size = opts.small ? 38 + rand(22) : 58 + rand(30);
    const x = 18 + rand(34);
    const y = 55 + rand(30);
    const rot = rand(50) - 25;
    const blur = (Math.random() * 1.4).toFixed(2);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="f${seed}" x="-30%" y="-30%" width="160%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}"/>
      <feGaussianBlur stdDeviation="${blur}"/>
    </filter>
    <filter id="g${seed}">
      <feTurbulence type="turbulence" baseFrequency="0.9" numOctaves="2" seed="${seed + 1}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.28  0 0 0 0.55 0"/>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="100" height="100" fill="${bg}"/>
  <g filter="url(#f${seed})">
    <text x="${x}" y="${y}" font-size="${size}" transform="rotate(${rot} 50 50)">${emoji}</text>
  </g>
  <rect width="100" height="100" filter="url(#g${seed})" opacity="0.6"/>
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
      // classic captcha cruelty: sometimes the image you clicked
      // quietly becomes a different image
      if (Math.random() < 0.3) {
        setTimeout(() => {
          tile.classList.add("fading");
          setTimeout(() => {
            const fresh = pick(Math.random() < 0.5 ? DECOYS : pick(CATEGORIES).emojis);
            tile.querySelector("img").src =
              "data:image/svg+xml," + encodeURIComponent(distortedTileSVG(fresh, opts));
            tile.classList.remove("fading");
          }, 280);
        }, 350);
      }
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
      // sometimes include zero actual targets, because comedy
      const targetCount = Math.random() < 0.35 ? 0 : 2 + rand(3);
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

    // illegible distorted text
    function distortedText() {
      setHeader("Type the characters", "you see below", "Case sensitive. Whitespace sensitive. Emotion sensitive.");
      const chars = Array.from({ length: 7 }, () =>
        pick("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".split(""))
      ).join("");
      const seed = rand(9999);
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90" width="100%">
  <defs>
    <filter id="t${seed}">
      <feTurbulence type="turbulence" baseFrequency="0.035 0.12" numOctaves="3" seed="${seed}"/>
      <feDisplacementMap in="SourceGraphic" scale="38"/>
    </filter>
  </defs>
  <g filter="url(#t${seed})">
    ${chars.split("").map((c, i) =>
      `<text x="${22 + i * 38 + rand(10)}" y="${52 + rand(26) - 13}" font-size="${30 + rand(18)}"
        font-family="Georgia" transform="rotate(${rand(70) - 35} ${30 + i * 38} 50)"
        fill="#4a4036" opacity="0.85">${c}</text>`).join("")}
    <line x1="0" y1="${30 + rand(40)}" x2="300" y2="${30 + rand(40)}" stroke="#4a4036" stroke-width="3" opacity="0.6"/>
    <line x1="0" y1="${30 + rand(40)}" x2="300" y2="${30 + rand(40)}" stroke="#4a4036" stroke-width="2" opacity="0.6"/>
  </g>
</svg>`;
      const body = $("challenge-body");
      body.innerHTML = `
        <div class="text-challenge">
          <div class="distort-box">${svg}</div>
          <input class="text-input" id="text-answer" type="text" autocomplete="off" spellcheck="false" placeholder="Enter the characters">
          <p class="challenge-note">Hint: some of these characters may not exist.</p>
        </div>`;
      return { type: "text" };
    },

    // count the things
    function countThings() {
      const cat = pick(CATEGORIES);
      setHeader("How many", cat.name + " do you see?", "Count carefully. Then count again. Get a different number.");
      const n = 4 + rand(5);
      const seed = rand(9999);
      const items = Array.from({ length: n }, () => `
        <text x="${rand(240)}" y="${30 + rand(120)}" font-size="${24 + rand(26)}"
          transform="rotate(${rand(360)} 130 80)" opacity="${0.35 + Math.random() * 0.55}">${pick(cat.emojis)}</text>`).join("");
      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 160" width="100%">
  <defs>
    <filter id="c${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="${seed}"/>
      <feDisplacementMap in="SourceGraphic" scale="45"/>
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

    // odd one out (they are all identical)
    function oddOneOut() {
      setHeader("Select the image that", "does not belong", "Exactly one image is different. Trust us.");
      const emoji = pick(DECOYS);
      const seed = rand(9999);
      const svg = distortedTileSVG(emoji);
      const body = $("challenge-body");
      body.innerHTML = "";
      const grid = document.createElement("div");
      grid.className = "grid g9";
      for (let i = 0; i < 9; i++) {
        const tile = document.createElement("div");
        tile.className = "tile";
        const img = svgToImg(svg); // the SAME image, nine times
        tile.appendChild(img);
        const tick = document.createElement("div");
        tick.className = "tick";
        tick.textContent = "✓";
        tile.appendChild(tick);
        tile.addEventListener("click", () => {
          grid.querySelectorAll(".tile").forEach((t) => t.classList.remove("selected"));
          tile.classList.add("selected");
        });
        grid.appendChild(tile);
      }
      body.appendChild(grid);
      void seed;
      return { type: "grid" };
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
