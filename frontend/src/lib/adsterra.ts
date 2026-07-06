const SMART_LINK_URL = "https://www.effectivecpmnetwork.com/i14tvw422?key=9526503a8ed4f42ca3c02384f4ecb777";
const POPUNDER_SRC = "https://pl30226680.effectivecpmnetwork.com/ed/df/72/eddf72fa6bb600e61613432939cf36e0.js";
const SOCIAL_BAR_SRC = "https://pl30226683.effectivecpmnetwork.com/e4/0a/a1/e40aa1a05f21b29d65bfbb401d4af4ce.js";

declare global {
  interface Window {
    atOptions?: Record<string, unknown>;
  }
}

function loadScriptOnce(id: string, src: string, async = true) {
  if (typeof window === "undefined") return;
  if (document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = async;
  document.body.appendChild(script);
}

export function openSmartAd() {
  if (typeof window === "undefined") return;
  window.open(SMART_LINK_URL, "_blank", "noopener,noreferrer");
}

export function loadPopunderOnce() {
  const key = "privatebaat_popunder_loaded";
  if (typeof window === "undefined" || window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");
  loadScriptOnce("adsterra-popunder", POPUNDER_SRC, false);
}

export function loadSocialBarOnce() {
  const key = "privatebaat_social_loaded";
  if (typeof window === "undefined" || window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");
  loadScriptOnce("adsterra-socialbar", SOCIAL_BAR_SRC, false);
}

export function loadBannerAd(container: HTMLDivElement) {
  if (container.dataset.loaded === "true") return;
  container.dataset.loaded = "true";
  window.atOptions = {
    key: "5fa7f7a1bf22138aa2b1a3d88cc521a8",
    format: "iframe",
    height: 50,
    width: 320,
    params: {}
  };
  const script = document.createElement("script");
  script.src = "https://www.highperformanceformat.com/5fa7f7a1bf22138aa2b1a3d88cc521a8/invoke.js";
  script.async = true;
  container.appendChild(script);
}

export function loadNativeAd(container: HTMLDivElement) {
  if (container.dataset.loaded === "true") return;
  container.dataset.loaded = "true";

  const adContainer = document.createElement("div");
  adContainer.id = "container-ed13d52d4a9f810f270ab1172d15ecb8";
  container.appendChild(adContainer);

  const script = document.createElement("script");
  script.async = true;
  script.dataset.cfasync = "false";
  script.src = "https://pl30226682.effectivecpmnetwork.com/ed13d52d4a9f810f270ab1172d15ecb8/invoke.js";
  container.appendChild(script);
}
