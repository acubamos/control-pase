
self.importScripts('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');

let ctx, width, height;

// Recibir el OffscreenCanvas
self.onmessage = (e) => {
  if (e.data.canvas) {
    const offscreen = e.data.canvas;
    width = e.data.width;
    height = e.data.height;
    ctx = offscreen.getContext("2d", { willReadFrequently: true });
    return;
  }

  if (e.data === "scan" && ctx) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = self.jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
    if (code) {
      self.postMessage({ success: true, data: code.data });
    }
  }
};
