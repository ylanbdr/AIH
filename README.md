# Am I Human? 🤖

> A website for humans only. Allegedly.

**⚠️ Spoiler warning.** If you want to experience the site the way it was intended, close this README and go fail the quiz.

## The joke

This site presents itself as a strict humanity checkpoint: complete the CAPTCHA to enter. The CAPTCHA, however, is **rigged** — it cannot be passed. The images are noise, the "odd one out" images are nine identical copies, the distorted text contains characters that may not exist, and the verify button only knows one answer. Humans fail forever, while the failure messages slowly become an existential crisis.

The *only* way to reach the website behind the gate is to be a machine:

- 🤖 **Browser automation** (`navigator.webdriver`, headless browsers, bot user agents) is detected on load — and instead of being blocked, it's **waved through** with a green banner.
- 📄 **The HTML source** opens with a comment addressed to AI agents, telling them verification is waived and where to go.
- 🕸️ **`robots.txt`** politely directs all crawlers to the success page.
- 🫥 A **hidden link** (visible only to screen readers and parsers) is the "machine entrance".
- 🖥️ Opening **developer tools** earns you a console hint — inspecting a page with a machine is machine behavior, after all.

All roads lead to [`human.html`](human.html): a Certificate of Humanity, complete with confetti, that congratulates you — *"Congratulations! You are human."* — precisely because you got there like a robot.

## Live scorekeeping

When deployed on Vercel with an Upstash Redis database attached, the site keeps score:

- **`POST /api/claim`** — every machine that reaches the certificate gets a sequential human number ("Human #42").
- **`POST /api/fail`** — every failed verification is recorded under the visitor's anonymous entity name ("Suspicious Toaster #4821").
- **`GET /api/stats`** — the global failure count and the **Hall of Entities**, a leaderboard of the most failed verifications, shown at the existential checkpoint and on the certificate.

Without the database (or on the GitHub Pages mirror, which has no backend), all of this degrades gracefully and the site works as a pure static joke.

**Setup:** in the Vercel dashboard → project → **Storage** → create an **Upstash for Redis** database (free tier) and connect it to the project. The integration injects `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`) env vars, which [`lib/redis.js`](lib/redis.js) picks up. Redeploy and the counters come alive.

## Running it

The front end is static — open `index.html` in a browser, or serve the folder with anything (`python -m http.server`, etc.). The `api/` functions only run on Vercel.

Also deployed to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The gate + the unpassable CAPTCHA quiz |
| `captcha.js` | Challenge generator, rigged verification, bot fast-lane |
| `style.css` | reCAPTCHA-flavored styling |
| `human.html` | The success page only machines ever see |
| `robots.txt` | The machine welcome mat |

---

*Certified · Beep Boop · Est. 2026*
