import { bootApp, renderApp } from "./router.js";
import { consumeFlash, getSession } from "./store.js";
import { showToast } from "./components/toast.js";

function start() {
  if (!window.location.hash) {
    const session = getSession();
    if (!session) {
      window.location.replace("./demo.html");
      return;
    }
    window.location.replace(`#/${session.role === "supporter" ? "supporter" : "association"}/overview`);
  }

  bootApp();

  const flash = consumeFlash();
  if (flash?.message) {
    window.setTimeout(() => {
      showToast(flash.message, { tone: flash.tone || "success" });
    }, 450);
  }

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) renderApp({ isRouteChange: true });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
