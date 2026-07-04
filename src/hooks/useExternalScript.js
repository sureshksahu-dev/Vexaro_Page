const scriptCache = new Map();

export function useExternalScript(src) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(
      new Error("External scripts can only be loaded in the browser."),
    );
  }

  if (scriptCache.has(src)) {
    return scriptCache.get(src);
  }

  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (
    existingScript &&
    existingScript.getAttribute("data-loaded") === "true" &&
    window.Razorpay
  ) {
    const ready = Promise.resolve(window.Razorpay);
    scriptCache.set(src, ready);
    return ready;
  }

  const script = existingScript || document.createElement("script");
  script.src = src;
  script.async = true;
  script.setAttribute("data-razorpay-script", "true");

  const loadPromise = new Promise((resolve, reject) => {
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    const onLoad = () => {
      cleanup();
      script.setAttribute("data-loaded", "true");
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        scriptCache.delete(src);
        reject(new Error("Razorpay did not initialize after script load."));
      }
    };

    const onError = () => {
      cleanup();
      scriptCache.delete(src);
      reject(new Error(`Failed to load external script: ${src}`));
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    if (!existingScript) {
      document.body.appendChild(script);
    }
  });

  scriptCache.set(src, loadPromise);
  return loadPromise;
}
