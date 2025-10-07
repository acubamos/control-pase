"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X } from "lucide-react";
import { parseQRData, type QRData } from "@/lib/qr-scanner";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: QRData) => void;
  isOpen: boolean;
  onClose: () => void;
}
// ✅ Extensión local de tipos para capacidades no estándar
declare global {
  interface MediaTrackCapabilities {
    focusMode?: string[]; // algunos dispositivos devuelven ["continuous", "single-shot"]
  }

  interface MediaTrackConstraintSet {
    focusMode?: string;
    zoom?: number;
  }
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState("Escaneando...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Iniciando cámara...");

      // 1️⃣ - Abrimos la cámara sin forzar resolución
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 }, // ← Máxima posible
          height: { ideal: 720 }, // ← Máxima posible
          frameRate: { ideal: 30 }, // Balance entre fluidez y calidad
        },
      });

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      console.log("📷 Capacidades detectadas:", capabilities);

      // 2️⃣ - Aplicamos enfoque continuo si está soportado
      if (
        capabilities.focusMode &&
        capabilities.focusMode.includes("continuous")
      ) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any],
          });
          console.log("✅ Enfoque continuo activado");
        } catch (err) {
          console.warn("⚠️ No se pudo aplicar enfoque continuo", err);
        }
      }

      // 4️⃣ - Iniciamos el video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanningStatus("📡 Escaneando...");
      setTimeout(() => {
        scanFrameSimplified();
      }, 800);
    } catch (err) {
      console.error("❌ Error iniciando cámara:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de permitir los permisos."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsScanning(false);
  };

  const scanFrameSimplified = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        animationRef.current = requestAnimationFrame(scanFrameSimplified);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scanFrameSimplified);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // ESTRATEGIA DOBLE: Normal + Escalado
      let qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      // Si falla, intentar con imagen escalada
      if (!qrCode) {
        const scale = 1.8;
        const scaledWidth = Math.floor(canvas.width * scale);
        const scaledHeight = Math.floor(canvas.height * scale);

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        const tempContext = tempCanvas.getContext("2d");

        if (tempContext) {
          tempContext.imageSmoothingEnabled = false;
          tempContext.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
          const scaledImageData = tempContext.getImageData(
            0,
            0,
            scaledWidth,
            scaledHeight
          );

          qrCode = jsQR(scaledImageData.data, scaledWidth, scaledHeight, {
            inversionAttempts: "attemptBoth",
          });
        }
      }

      if (qrCode) {
        console.log("🎯 QR detectado:", qrCode.data);
        setScanningStatus("✅ QR detectado - Procesando...");

        const qrData = parseQRData(qrCode.data);

        if (qrData) {
          onScan(qrData);
          handleClose();
          return;
        } else {
          setScanningStatus("❌ Formato QR no válido");
          setTimeout(() => {
            setScanningStatus("Escaneando...");
            animationRef.current = requestAnimationFrame(scanFrameSimplified);
          }, 1000);
          return;
        }
      }

      setScanningStatus("🔍 Buscando código QR...");
      animationRef.current = requestAnimationFrame(scanFrameSimplified);
    } catch (e) {
      console.error("Error en escaneo de frame:", e);
      animationRef.current = requestAnimationFrame(scanFrameSimplified);
    }
  };

  // 🔧 FUNCIÓN AUXILIAR: Mejorar contraste para QR pequeños
  const enhanceContrast = (imageData: Uint8ClampedArray) => {
    // Simple ajuste de contraste para hacer el QR más legible
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];

      // Convertir a escala de grises
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Aumentar contraste (hacer oscuros más oscuros, claros más claros)
      const contrasted =
        gray < 128
          ? Math.max(0, gray - 40) // Oscurecer
          : Math.min(255, gray + 40); // Aclarar

      imageData[i] = contrasted; // R
      imageData[i + 1] = contrasted; // G
      imageData[i + 2] = contrasted; // B
      // Alpha se mantiene igual
    }
  };

  // 🎯 VERSIÓN MÁS AVANZADA CON DETECCIÓN DE TAMAÑO
  const scanFrameAdvanced = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        animationRef.current = requestAnimationFrame(scanFrameAdvanced);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scanFrameAdvanced);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // ESTRATEGIA MULTINIVEL para QR pequeños
      const detectionStrategies = [
        // Nivel 1: Normal
        { scale: 1, smoothing: true, contrast: false },
        // Nivel 2: Escalado 1.5x
        { scale: 1.5, smoothing: false, contrast: false },
        // Nivel 3: Escalado 2x
        { scale: 2, smoothing: false, contrast: false },
        // Nivel 4: Con contraste
        { scale: 1, smoothing: true, contrast: true },
        // Nivel 5: Escalado + contraste
        { scale: 1.5, smoothing: false, contrast: true },
      ];

      let qrCode = null;

      for (const strategy of detectionStrategies) {
        if (qrCode) break;

        let processedImageData = imageData;

        // Aplicar escalado si es necesario
        if (strategy.scale !== 1) {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = Math.floor(canvas.width * strategy.scale);
          tempCanvas.height = Math.floor(canvas.height * strategy.scale);
          const tempContext = tempCanvas.getContext("2d");

          if (tempContext) {
            tempContext.imageSmoothingEnabled = strategy.smoothing;
            tempContext.drawImage(
              canvas,
              0,
              0,
              tempCanvas.width,
              tempCanvas.height
            );
            processedImageData = tempContext.getImageData(
              0,
              0,
              tempCanvas.width,
              tempCanvas.height
            );
          }
        }

        // Aplicar mejora de contraste si es necesario
        if (strategy.contrast) {
          enhanceContrast(processedImageData.data);
        }

        qrCode = jsQR(
          processedImageData.data,
          processedImageData.width,
          processedImageData.height,
          {
            inversionAttempts: "attemptBoth",
          }
        );

        if (qrCode) {
          console.log(
            `🎯 QR detectado con estrategia: Escala ${strategy.scale}x, Contraste: ${strategy.contrast}`
          );
          break;
        }
      }

      // ... el resto del código de procesamiento igual
      if (qrCode) {
        console.log("🎯 QR detectado:", qrCode.data);
        setScanningStatus("✅ QR detectado - Procesando...");

        const qrData = parseQRData(qrCode.data);

        if (qrData) {
          console.log("✅ Datos parseados correctamente:", qrData);
          onScan(qrData);
          handleClose();
          return;
        } else {
          console.warn("❌ No se pudieron parsear los datos del QR");
          setScanningStatus("❌ Formato QR no válido");
          setTimeout(() => {
            setScanningStatus("Escaneando...");
            animationRef.current = requestAnimationFrame(scanFrameAdvanced);
          }, 1000);
          return;
        }
      }

      setScanningStatus("🔍 Buscando código QR...");
      animationRef.current = requestAnimationFrame(scanFrameAdvanced);
    } catch (e) {
      console.error("Error en escaneo de frame:", e);
      animationRef.current = requestAnimationFrame(scanFrameAdvanced);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
    // Función para simular un escaneo en desarrollo
    const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049";
    console.log("🧪 Simulando escaneo con:", mockQRText);

    const qrData = parseQRData(mockQRText);
    if (qrData) {
      onScan(qrData);
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={startCamera} variant="outline">
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <p className="text-white bg-black bg-opacity-50 px-3 py-1 rounded-md text-sm">
                      {scanningStatus}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={simulateScan} className="flex-1" variant="outline">
              Simular Escaneo (Desarrollo)
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código QR de la cédula
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
