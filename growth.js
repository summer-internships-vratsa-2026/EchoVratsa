(function initGrowthLayer() {
  const config = window.ECHOVRATSA_CONFIG || {};
  const siteUrl = config.siteUrl || window.location.href;
  const socialLinks = config.socialLinks || {};
  const analytics = config.analytics || {};

  function addScript(src, attrs = {}) {
    if ([...document.scripts].some(script => script.src === src)) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
    document.head.appendChild(script);
  }

  function installGoogleAnalytics(id) {
    if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  }

  function installClarity(id) {
    if (!id || !/^[a-z0-9]+$/i.test(id)) return;
    window.clarity = window.clarity || function clarity(){ (window.clarity.q = window.clarity.q || []).push(arguments); };
    addScript("https://www.clarity.ms/tag/" + encodeURIComponent(id));
  }

  function trackGrowthEvent(name, data = {}) {
    if (typeof window.gtag === "function") window.gtag("event", name, data);
    if (typeof window.clarity === "function") window.clarity("event", name);
  }

  function currentText(key, fallback) {
    if (typeof t === "function") return t(key);
    return fallback;
  }

  function setSocialLinks() {
    document.querySelectorAll("[data-social-link]").forEach(link => {
      const key = link.dataset.socialLink;
      const url = socialLinks[key];
      if (!url) {
        link.setAttribute("aria-disabled", "true");
        link.removeAttribute("href");
        return;
      }
      link.href = url;
      link.addEventListener("click", () => trackGrowthEvent("social_click", { channel: key }));
    });
  }

  async function copySiteLink() {
    const feedback = document.getElementById("share-feedback");
    try {
      await navigator.clipboard.writeText(siteUrl);
      if (feedback) feedback.textContent = currentText("copyDone", "Линкът е копиран.");
      trackGrowthEvent("copy_site_link");
    } catch (error) {
      if (feedback) feedback.textContent = siteUrl;
    }
  }

  async function shareSite() {
    const shareData = {
      title: "EchoVratsa",
      text: currentText("shareText", "Пробвай персонален аудио маршрут из Враца."),
      url: siteUrl
    };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
      trackGrowthEvent("native_share");
      return;
    }
    await copySiteLink();
  }

  Object.assign(I18N.bg, {
    growthEyebrow: "Реални потребители",
    growthTitle: "Присъедини се към EchoVratsa pilot",
    growthText: "Покани приятели, съученици и туристи да пробват маршрута, да споделят обратна връзка и да помогнат проектът да стигне до първите си реални потребители.",
    growthPilotLabel: "Pilot target",
    growthPilotTitle: "50 реални тестера във Враца",
    growthPilotText: "Фокусът е кратък: QR линк към сайта, 7-дневна кампания в социалните мрежи и събиране на реални посещения, споделяния и коментари.",
    shareSite: "Сподели сайта",
    copySite: "Копирай линк",
    copyDone: "Линкът е копиран.",
    shareText: "Пробвай персонален аудио маршрут из Враца.",
    socialInstagram: "Reels и stories",
    socialFacebook: "Постове и покани",
    socialGitHub: "Код и развитие"
  });

  Object.assign(I18N.en, {
    growthEyebrow: "Real users",
    growthTitle: "Join the EchoVratsa pilot",
    growthText: "Invite friends, classmates, and visitors to try the route, share feedback, and help the project reach its first real users.",
    growthPilotLabel: "Pilot target",
    growthPilotTitle: "50 real testers in Vratsa",
    growthPilotText: "The focus is simple: QR link to the site, a 7-day social campaign, and real visits, shares, and comments.",
    shareSite: "Share the site",
    copySite: "Copy link",
    copyDone: "Link copied.",
    shareText: "Try a personalized audio route through Vratsa.",
    socialInstagram: "Reels and stories",
    socialFacebook: "Posts and invites",
    socialGitHub: "Code and progress"
  });

  Object.assign(I18N.de, {
    growthEyebrow: "Echte Nutzer",
    growthTitle: "Mach beim EchoVratsa-Pilot mit",
    growthText: "Lade Freunde, Mitschüler und Besucher ein, die Route zu testen, Feedback zu geben und dem Projekt zu echten Nutzern zu verhelfen.",
    growthPilotLabel: "Pilot target",
    growthPilotTitle: "50 echte Tester in Vratsa",
    growthPilotText: "Der Fokus ist klar: QR-Link zur Website, 7 Tage Social-Kampagne und echte Besuche, Shares und Kommentare.",
    shareSite: "Website teilen",
    copySite: "Link kopieren",
    copyDone: "Link kopiert.",
    shareText: "Teste eine personalisierte Audiotour durch Vratsa.",
    socialInstagram: "Reels and stories",
    socialFacebook: "Gruppen und Einladungen",
    socialGitHub: "Code und Fortschritt"
  });

  installGoogleAnalytics(analytics.googleAnalyticsId);
  installClarity(analytics.clarityProjectId);

  document.addEventListener("DOMContentLoaded", () => {
    setSocialLinks();
    document.getElementById("copy-site-btn")?.addEventListener("click", copySiteLink);
    document.getElementById("share-site-btn")?.addEventListener("click", shareSite);
  });
})();
