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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // ✅ 1. FUNCIÓN PARA VERIFICAR COMPATIBILIDAD
  const checkCameraSupport = async (): Promise<MediaDeviceInfo[]> => {
    // Verificar si la API existe
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Tu navegador no soporta acceso a la cámara");
    }

    // Verificar permisos previos
    try {
      const permissions = await navigator.permissions.query({ name: "camera" as any });
      if (permissions.state === 'denied') {
        throw new Error("Permisos de cámara denegados previamente");
      }
    } catch (e) {
      console.warn("No se pudo verificar permisos previos:", e);
    }

    // Verificar dispositivos disponibles
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error("No se encontraron cámaras disponibles");
      }
      
      console.log("📷 Cámaras disponibles:", videoDevices);
      return videoDevices;
    } catch (e) {
      console.warn("No se pudieron enumerar dispositivos:", e);
      throw new Error("No se pudieron detectar las cámaras disponibles");
    }
  };

  // ✅ 2. ESTRATEGIA CON FALLBACKS PROGRESIVOS
  const startCameraWithFallback = async (): Promise<MediaStream> => {
    const constraints = [
      // Intentar primero con cámara trasera
      { video: { facingMode: { ideal: "environment" } } },
      // Intentar con cualquier cámara
      { video: true },
      // Intentar con resoluciones más bajas
      { video: { width: { max: 1280 }, height: { max: 720 } } },
      { video: { width: { max: 640 }, height: { max: 480 } } }
    ];

    for (const constraint of constraints) {
      try {
        console.log("🔧 Intentando con constraints:", constraint);
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        console.log("✅ Éxito con constraints:", constraint);
        return stream;
      } catch (err) {
        console.warn(`❌ Intento fallido con:`, constraint, err);
        continue;
      }
    }
    
    throw new Error("No se pudo acceder a ninguna cámara con ninguna configuración");
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Verificando compatibilidad...");

      // ✅ 1. Verificar compatibilidad primero
      await checkCameraSupport();

      setScanningStatus("Iniciando cámara...");

      // ✅ 2. Usar estrategia con fallbacks
      const stream = await startCameraWithFallback();
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      console.log("📷 Capacidades detectadas:", capabilities);

      // 3️⃣ - Aplicamos enfoque continuo si está soportado
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
        scanFrame();
      }, 800);
    } catch (err) {
      console.error("❌ Error iniciando cámara:", err);
      setError(getUserFriendlyError(err));
      setIsScanning(false);
    }
  };

  // ✅ 3. FUNCIÓN PARA MENSAJES DE ERROR AMIGABLES
  const getUserFriendlyError = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied')) {
      return "Permiso de cámara denegado. Por favor, habilita los permisos en configuración de tu navegador.";
    }
    
    if (message.includes('not found') || message.includes('no device') || message.includes('no se encontraron')) {
      return "No se encontró ninguna cámara disponible en este dispositivo.";
    }
    
    if (message.includes('not supported') || message.includes('no soporta')) {
      return "Tu navegador no soporta acceso a la cámara. Intenta con Chrome, Firefox o Safari.";
    }
    
    if (message.includes('could not start') || message.includes('being used')) {
      return "La cámara está siendo usada por otra aplicación. Ciérrala e intenta nuevamente.";
    }
    
    if (message.includes('ninguna configuración')) {
      return "No se pudo acceder a la cámara con ninguna configuración. Intenta reiniciar el navegador.";
    }
    
    return "Error al acceder a la cámara. Verifica los permisos e intenta recargar la página.";
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

      const scale = 1;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

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
            animationRef.current = requestAnimationFrame(scanFrame);
          }, 1000);
          return;
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