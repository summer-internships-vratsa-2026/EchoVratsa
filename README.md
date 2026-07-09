# EchoVratsa v11 — Phase 4 presentation-ready build

Static HTML/CSS/JS MVP for an AI tourist audio guide in Vratsa.

## New in v11
- Language-aware AI voice assistant: BG, EN and DE select matching browser voices for story narration.
- Complete Bulgarian, English, and German recorded narration: supplied MP3 files play for every destination and for the AI guide intro before falling back to browser AI voice.
- Voice status panel: shows the active narrator or a graceful fallback when a browser voice is missing.
- Safer language switching: active narration stops when the site language changes, then stories re-render in the new language.
- Localized product-ready status in the navbar.

## New in v10
- Reset presentation button: clears XP, visited stops, GPS unlocks, solved quizzes and tour stats.
- Quiz replay: every solved question can be answered again during a live presentation.
- Presentation mode: guided walkthrough through profile selection, route, product features and platform vision.
- Product-ready wording: no visible demo/preview language in the app.
- Phase 4 continuation: EchoGuide platform section is preserved and polished for scale.

## Links
- Live site: https://echo-vratsa.vercel.app/
- GitHub repository: https://github.com/summer-internships-vratsa-2026/EchoVratsa
- Google Analytics: `G-P8ZX9458CQ`
- Microsoft Clarity: `xj3zr1fnz2`
## Run
Open `index.html` in a browser or run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
## GitHub upload
Project files live in the root folder, and media files are organized in `assets/`, so the repository should include `index.html`, `style.css`, `script.js`, `data.js`, `site-settings.js`, `growth.js`, `README.md`, `SOCIAL_MEDIA_PLAN.md`, and the full `assets/` folder.

## Launch checklist
- Real social links, public site URL, Google Analytics ID and Microsoft Clarity ID should be filled in `site-settings.js` after the accounts are created.
- Vercel should point to the chosen GitHub repository and deploy the `main` branch.
- Google Analytics needs a GA4 Web stream for the deployed Vercel URL; paste the Measurement ID that starts with `G-` into `site-settings.js`.
- Microsoft Clarity needs a project for the deployed Vercel URL; paste the Clarity project ID into `site-settings.js`.
- Access should be shared in GitHub, Vercel, Google Analytics and Microsoft Clarity with the evaluation email.

## Growth assets
- `SOCIAL_MEDIA_PLAN.md` contains a ready 7-day posting plan, captions, story ideas, hashtags and success metrics for proving real users.
- `LAUNCH_CHECKLIST.md` contains the deployment/access checklist for GitHub, Vercel, Google Analytics and Microsoft Clarity.
