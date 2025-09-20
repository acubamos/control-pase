"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

export default function QrScanner() {
  const [result, setResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scannerRef.current) {
      // Crear el escáner
      const scanner = new Html5QrcodeScanner(
        "qr-reader", // ID del div donde se monta
        {
          fps: 10, // frames por segundo
          qrbox: { width: 250, height: 250 }, // tamaño del cuadro de escaneo
        },
        false
      );

      scanner.render(
        (decodedText) => {
          setResult(decodedText);
          scanner.clear(); // detener después de escanear
        },
        (errorMessage) => {
          console.warn("QR Error:", errorMessage);
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-lg font-bold">Escanear QR</h2>
      <div id="qr-reader" className="w-[300px] h-[300px]" />
      {result && (
        <p className="p-2 bg-green-100 text-green-700 rounded">
          QR Detectado: {result}
        </p>
      )}
    </div>
  );
}
