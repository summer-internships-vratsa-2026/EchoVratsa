# EchoVratsa launch checklist

## 0. Реални профили
- Instagram и Facebook профилите вече са въведени в `site-settings.js`.
- Не добавяйте канали, които няма да използвате реално.
- При промяна на профилите обновете реалните URL-и в `site-settings.js`.
- Не оставяйте placeholder или измислени social links в публичната версия.

## 1. GitHub repository
- Качете цялата папка `D:\v2\the end` в избраното GitHub хранилище.
- В repository-то трябва да присъстват: `index.html`, `style.css`, `script.js`, `data.js`, `site-settings.js`, `growth.js`, `README.md`, `SOCIAL_MEDIA_PLAN.md`, `LAUNCH_CHECKLIST.md` и цялата папка `assets/`.
- Проверете дали repository-то е public, ако оценяващите трябва да го отворят без покана.
- След качване попълнете GitHub линка в `site-settings.js`.

## 2. Vercel deploy
- Свържете избраното GitHub repository с Vercel.
- Project type: static site / no framework.
- Build command: празно.
- Output directory: празно или `.`.
- След deploy копирайте production URL и го сложете в `site-settings.js` като `siteUrl`.

## 3. Google Analytics
- Създайте GA4 Web stream за production URL от Vercel.
- Копирайте Measurement ID, който започва с `G-`.
- Поставете го в `site-settings.js` като `googleAnalyticsId`.
- След deploy проверете Realtime report и направете screenshot за доказателство.

## 4. Microsoft Clarity
- Създайте Clarity project за production URL от Vercel.
- Копирайте Clarity project ID.
- Поставете го в `site-settings.js` като `clarityProjectId`.
- След deploy проверете дали се появяват sessions/recordings и направете screenshot.

## 5. Достъп за оценяване
- Споделете достъп до GitHub repository, Vercel project, Google Analytics property и Microsoft Clarity project с дадения имейл.
- Запазете screenshot или потвърждение, че имейлът е добавен.

## 6. Доказателства за реални потребители
- Screenshot от deployed сайта.
- Screenshot от Google Analytics Realtime.
- Screenshot от Microsoft Clarity sessions/recordings.
- Screenshot-и от Instagram/Facebook posts или stories, ако създадете тези канали.
- Поне 5 кратки feedback цитата от реални тестери.
- Брой посетители, генерирани маршрути, social clicks и споделяния.

## Данни, които трябва да се попълнят
- Instagram URL: https://www.instagram.com/echovratsa/?hl=en
- Facebook URL: https://www.facebook.com/profile.php?id=61591421355500
- GitHub repository URL: https://github.com/summer-internships-vratsa-2026/EchoVratsa
- Vercel production URL: https://echo-vratsa.vercel.app/
- Google Analytics Measurement ID:
- Microsoft Clarity Project ID:
- Имейл за споделяне на достъп: