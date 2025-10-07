"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, ZoomIn } from "lucide-react";
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
  const [hasAutoFocus, setHasAutoFocus] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Iniciando cámara...");

      // 1️⃣ Configuración mejorada para alta resolución
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 }, // Mayor resolución para más detalle
          height: { ideal: 1080 },
          aspectRatio: { ideal: 16/9 }
        },
      });

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      const settings = videoTrack.getSettings();
      
      console.log("📷 Configuración de cámara:", settings);
      console.log("📷 Capacidades:", capabilities);

      // 2️⃣ Configuración de enfoque mejorada
      if (capabilities.focusMode) {
        try {
          if (capabilities.focusMode.includes("continuous")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "continuous" } as any],
            });
            setHasAutoFocus(true);
            console.log("✅ Enfoque continuo activado");
          } else if (capabilities.focusMode.includes("single-shot")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "single-shot" } as any],
            });
            console.log("✅ Enfoque single-shot activado");
          }
        } catch (err) {
          console.warn("⚠️ No se pudo aplicar enfoque automático", err);
        }
      }

      // 3️⃣ Configuración de zoom inicial
      if (capabilities.zoom) {
        const initialZoom = Math.min(1.5, capabilities.zoom.max);
        await videoTrack.applyConstraints({
          advanced: [{ zoom: initialZoom } as any],
        });
        setZoomLevel(initialZoom);
        console.log(`🔍 Zoom inicial: ${initialZoom}`);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanningStatus("🔍 Enfocando...");
      
      // Esperar a que la cámara se estabilice
      setTimeout(() => {
        setScanningStatus("📡 Escaneando...");
        scanFrame();
      }, 1500);

    } catch (err) {
      console.error("❌ Error iniciando cámara:", err);
      setError(
        err instanceof Error && err.name === 'NotAllowedError' 
          ? "Permiso de cámara denegado. Por favor permite el acceso a la cámara."
          : "No se pudo acceder a la cámara. Asegúrate de permitir los permisos."
      );
      setIsScanning(false);
    }
  };

  const adjustZoom = async (increment: boolean) => {
    if (!streamRef.current) return;

    const videoTrack = streamRef.current.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();
    
    if (!capabilities.zoom) return;

    const newZoom = increment 
      ? Math.min(zoomLevel + 0.5, capabilities.zoom.max)
      : Math.max(zoomLevel - 0.5, capabilities.zoom.min);

    try {
      await videoTrack.applyConstraints({
        advanced: [{ zoom: newZoom } as any],
      });
      setZoomLevel(newZoom);
      console.log(`🔍 Zoom ajustado a: ${newZoom}`);
    } catch (err) {
      console.warn("No se pudo ajustar el zoom", err);
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
    setHasAutoFocus(false);
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

      // 4️⃣ Usar resolución completa para mejor detección
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // 5️⃣ Configuración mejorada de jsQR para QR pequeños
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
        // Ajustar estos parámetros para QR pequeños
      });

      if (qrCode) {
        console.log("🎯 QR detectado:", qrCode.data);
        console.log("📏 Tamaño del QR:", qrCode.location);
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
            animationRef.current = requestAnimationFrame(scanFrame);
          }, 1000);
          return;
        }
      }

      // 6️⃣ Intentar con diferentes escalas para QR pequeños
      if (canvas.width > 800) {
        const scale = 0.7; // Reducir tamaño para mejor procesamiento
        const scaledWidth = Math.floor(canvas.width * scale);
        const scaledHeight = Math.floor(canvas.height * scale);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        const tempContext = tempCanvas.getContext('2d');
        
        if (tempContext) {
          tempContext.drawImage(video, 0, 0, scaledWidth, scaledHeight);
          const scaledImageData = tempContext.getImageData(0, 0, scaledWidth, scaledHeight);
          const scaledQrCode = jsQR(scaledImageData.data, scaledWidth, scaledHeight, {
            inversionAttempts: "attemptBoth",
          });
          
          if (scaledQrCode) {
            console.log("🎯 QR detectado (escala reducida):", scaledQrCode.data);
            setScanningStatus("✅ QR detectado - Procesando...");

            const qrData = parseQRData(scaledQrCode.data);
            if (qrData) {
              onScan(qrData);
              handleClose();
              return;
            }
          }
        }
      }

      setScanningStatus("🔍 Buscando código QR...");
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
                className="w-full h-64 sm:h-80 bg-black rounded-lg object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 border-dashed w-48 h-32 rounded-lg animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <p className="text-white bg-black bg-opacity-70 px-3 py-1 rounded-md text-sm">
                      {scanningStatus}
                    </p>
                  </div>
                  
                  {/* Controles de zoom */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    <Button
                      onClick={() => adjustZoom(true)}
                      size="icon"
                      className="h-8 w-8 bg-black bg-opacity-50 hover:bg-opacity-70"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="text-white bg-black bg-opacity-50 px-2 py-1 rounded text-xs text-center">
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
              <Button 
                onClick={() => adjustZoom(true)} 
                variant="outline" 
                size="icon"
                disabled={!isScanning}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p className="text-center">
              📍 Para QR pequeños: Acerca la cámara al carnet y mantén estable
            </p>
            <p className="text-center text-xs">
              {hasAutoFocus ? "✅ Enfoque automático activo" : "⚠️ Usa zoom manual si es necesario"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}