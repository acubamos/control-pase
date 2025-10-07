"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, ZoomIn, ZoomOut, Focus } from "lucide-react";
import { parseQRData, type QRData } from "@/lib/qr-scanner";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: QRData) => void;
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface MediaTrackCapabilities {
    focusMode?: string[];
    focusDistance?: {
      min: number;
      max: number;
      step: number;
    };
    zoom?: {
      min: number;
      max: number;
      step: number;
    };
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [focusMode, setFocusMode] = useState<string>("none");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Iniciando cámara...");

      // 1️⃣ Configuración optimizada para objetos cercanos
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Esperar a que el video esté listo
      await new Promise(resolve => setTimeout(resolve, 1000));

      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      const settings = videoTrack.getSettings();
      
      console.log("📷 Configuración actual:", settings);
      console.log("📷 Capacidades:", capabilities);

      // 2️⃣ ESTRATEGIA MEJORADA DE ENFOQUE
      let focusApplied = false;

      // Intentar enfoque manual primero (para corta distancia)
      if (capabilities.focusMode) {
        try {
          // Priorizar enfoque manual si está disponible
          if (capabilities.focusMode.includes("manual")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "manual" } as any],
            });
            setFocusMode("manual");
            console.log("✅ Enfoque manual activado");
            focusApplied = true;
          } 
          // Luego enfoque continuo
          else if (capabilities.focusMode.includes("continuous")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "continuous" } as any],
            });
            setFocusMode("continuous");
            console.log("✅ Enfoque continuo activado");
            focusApplied = true;
          }
          // Finalmente single-shot
          else if (capabilities.focusMode.includes("single-shot")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "single-shot" } as any],
            });
            setFocusMode("single-shot");
            console.log("✅ Enfoque single-shot activado");
            focusApplied = true;
          }
        } catch (err) {
          console.warn("⚠️ No se pudo aplicar configuración de enfoque", err);
        }
      }

      // 3️⃣ CONFIGURACIÓN DE ZOOM PARA MAYOR DETALLE
      if (capabilities.zoom) {
        try {
          // Usar un zoom moderado para aumentar detalle sin perder calidad
          const optimalZoom = Math.min(1.8, capabilities.zoom.max);
          await videoTrack.applyConstraints({
            advanced: [{ zoom: optimalZoom } as any],
          });
          setZoomLevel(optimalZoom);
          console.log(`🔍 Zoom configurado a: ${optimalZoom}`);
        } catch (err) {
          console.warn("⚠️ No se pudo aplicar zoom", err);
        }
      }

      setScanningStatus("🎯 Enfocando...");

      // 4️⃣ TÉCNICA DE RE-ENFOQUE MÚLTIPLE
      if (!focusApplied) {
        // Si no hay control de enfoque, intentar forzar re-enfoque cambiando constraints
        try {
          await videoTrack.applyConstraints({
            advanced: [
              { focusMode: "continuous" } as any,
              { width: 1280 } as any // Cambiar resolución puede forzar re-enfoque
            ]
          });
        } catch (err) {
          console.warn("⚠️ No se pudo forzar re-enfoque", err);
        }
      }

      // Esperar a que la cámara se estabilice y enfoque
      setScanningStatus("🔍 Ajustando enfoque...");
      await new Promise(resolve => setTimeout(resolve, 2000));

      setScanningStatus("📡 Escaneando... Busca el código QR del carnet");
      scanFrame();

    } catch (err) {
      console.error("❌ Error iniciando cámara:", err);
      setError(
        err instanceof Error && err.name === 'NotAllowedError' 
          ? "Permiso de cámara denegado. Por favor permite el acceso a la cámara."
          : `Error de cámara: ${err instanceof Error ? err.message : 'No se pudo acceder a la cámara'}`
      );
      setIsScanning(false);
    }
  };

  const adjustZoom = async (increment: boolean) => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    
    if (!capabilities.zoom) return;

    const step = 0.3; // Paso más pequeño para ajuste fino
    const newZoom = increment 
      ? Math.min(zoomLevel + step, capabilities.zoom.max)
      : Math.max(zoomLevel - step, capabilities.zoom.min);

    try {
      await videoTrack.applyConstraints({
        advanced: [{ zoom: newZoom } as any],
      });
      setZoomLevel(newZoom);
      console.log(`🔍 Zoom ajustado a: ${newZoom.toFixed(1)}x`);
      
      // Re-enfocar después de cambiar zoom
      setScanningStatus("🔍 Re-enfocando...");
      setTimeout(() => setScanningStatus("📡 Escaneando..."), 1000);
    } catch (err) {
      console.warn("No se pudo ajustar el zoom", err);
    }
  };

  const triggerFocus = async () => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    
    try {
      setScanningStatus("🎯 Enfocando...");
      
      // Estrategia múltiple para forzar enfoque
      if (focusMode === "manual" || focusMode === "single-shot") {
        // Forzar re-enfoque cambiando temporalmente constraints
        await videoTrack.applyConstraints({
          advanced: [{ focusMode: "continuous" } as any],
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        await videoTrack.applyConstraints({
          advanced: [{ focusMode: focusMode } as any],
        });
      } else {
        // Para enfoque continuo, cambiar brevemente la resolución
        const currentSettings = videoTrack.getSettings();
        await videoTrack.applyConstraints({
          width: currentSettings.width === 1920 ? 1280 : 1920,
        });
        await new Promise(resolve => setTimeout(resolve, 300));
        await videoTrack.applyConstraints({
          width: { ideal: 1920 },
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setScanningStatus("📡 Escaneando...");
    } catch (err) {
      console.warn("No se pudo forzar enfoque", err);
      setScanningStatus("📡 Escaneando...");
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
    setZoomLevel(1);
    setFocusMode("none");
  };

  const scanFrame = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Usar resolución completa para máxima calidad
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Configuración optimizada para QR pequeños
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (qrCode) {
        console.log("🎯 QR detectado:", qrCode.data);
        console.log("📏 Dimensión del QR:", qrCode.location);
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
            setScanningStatus("📡 Escaneando...");
            animationRef.current = requestAnimationFrame(scanFrame);
          }, 1500);
          return;
        }
      }

      animationRef.current = requestAnimationFrame(scanFrame);
    } catch (e) {
      console.error("Error en escaneo de frame:", e);
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
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
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Código QR del Carnet
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
                className="w-full h-64 sm:h-80 bg-black rounded-lg object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 border-dashed w-40 h-28 rounded-lg animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <p className="text-white bg-black bg-opacity-80 px-3 py-2 rounded-md text-sm font-medium">
                      {scanningStatus}
                    </p>
                  </div>
                  
                  {/* Controles de cámara */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                    <Button
                      onClick={triggerFocus}
                      size="icon"
                      className="h-8 w-8 bg-blue-600 bg-opacity-80 hover:bg-blue-700"
                      title="Forzar enfoque"
                    >
                      <Focus className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => adjustZoom(true)}
                      size="icon"
                      className="h-8 w-8 bg-black bg-opacity-70 hover:bg-opacity-90"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => adjustZoom(false)}
                      size="icon"
                      className="h-8 w-8 bg-black bg-opacity-70 hover:bg-opacity-90"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <div className="text-white bg-black bg-opacity-70 px-2 py-1 rounded text-xs text-center">
                      {zoomLevel.toFixed(1)}x
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-2 flex-1">
              <Button onClick={simulateScan} variant="outline" className="flex-1">
                Simular Escaneo
              </Button>
            </div>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p className="text-center font-medium">
              📍 Para mejor resultado:
            </p>
            <ul className="text-xs space-y-1 text-center">
              <li>• Acerca el carnet a 10-15 cm de la cámara</li>
              <li>• Usa el botón <Focus className="h-3 w-3 inline" /> para forzar enfoque</li>
              <li>• Ajusta el zoom si es necesario</li>
              <li>• Buena iluminación y evitar reflejos</li>
            </ul>
            <p className="text-center text-xs mt-2">
              {focusMode !== "none" ? `✅ Modo enfoque: ${focusMode}` : "⚠️ Enfoque automático"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}