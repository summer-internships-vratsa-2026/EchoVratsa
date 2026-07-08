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

## Run
Open `index.html` in a browser or run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
