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

  // Agrega esta función para limpiar permisos en caché
  const resetCameraPermissions = async () => {
    try {
      // Cerrar todos los streams activos primero
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Forzar al navegador a olvidar permisos temporales
      const devices = await navigator.mediaDevices.enumerateDevices();
      devices.forEach((device) => {
        if (device.kind === "videoinput") {
          console.log(`Cámara encontrada: ${device.label}`);
        }
      });
    } catch (error) {
      console.log("Error resetando permisos:", error);
    }
  };
  const startCamera = async () => {
    resetCameraPermissions();
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Diagnosticando cámara...");

      // ✅ 1. Verificar el estado real de los permisos
      const cameraPermission = await navigator.permissions.query({
        name: "camera" as any,
      });
      console.log("📋 Estado de permisos:", cameraPermission.state);

      if (cameraPermission.state === "denied") {
        throw new Error("PERMISSION_DENIED");
      }

      // ✅ 2. Listar cámaras disponibles
      setScanningStatus("Buscando cámaras...");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === "videoinput");

      console.log("📷 Cámaras detectadas:", cameras);

      if (cameras.length === 0) {
        throw new Error("NO_CAMERAS_FOUND");
      }

      // ✅ 3. Verificar si las cámaras tienen label (indicador de permisos)
      const hasGrantedPermission = cameras.some(
        (camera) => camera.label !== ""
      );
      console.log("🔐 Permisos otorgados:", hasGrantedPermission);

      if (!hasGrantedPermission && cameraPermission.state === "prompt") {
        console.log("🔄 Solicitando permisos...");
      }

      // ✅ 4. Estrategia de constraints mejorada
      const constraints = [
        // Primero intentar con cámara trasera
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Luego cualquier cámara
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Finalmente resoluciones más bajas
        { video: true },
      ];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      for (const constraint of constraints) {
        try {
          setScanningStatus(`Probando configuración...`);
          console.log("🔧 Intentando con constraints:", constraint);

          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log("✅ Éxito con constraints:", constraint);
          break;
        } catch (err) {
          console.warn("❌ Falló con constraints:", constraint, err);
          lastError = err as Error;
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error("UNKNOWN_CAMERA_ERROR");
      }

      streamRef.current = stream;

      // ✅ 5. Configurar la cámara
      const videoTrack = stream.getVideoTracks()[0];
      console.log("🎥 Track de video:", videoTrack.label);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanningStatus("🔍 Escaneando QR...");
      scanFrame();
    } catch (err) {
      console.error("❌ Error detallado:", err);
      const errorMessage = diagnoseCameraError(err as Error);
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const diagnoseCameraError = (error: Error): string => {
    const errorName = error.name;
    const errorMessage = error.message;

    console.log("🔍 Diagnóstico - Name:", errorName, "Message:", errorMessage);

    if (errorName === "NotAllowedError" || errorMessage.includes("denied")) {
      return `
        Permisos de cámara denegados. Por favor:
  
        1. Haz clic en el ícono de 🔒 candado en la barra de direcciones
        2. Asegúrate de que "Cámara" esté en "Permitir"
        3. Recarga la página e intenta nuevamente
  
        Si el problema persiste:
        • Verifica los permisos de cámara en configuración de tu navegador
        • Limpia la caché y cookies del sitio
      `;
    }

    if (
      errorName === "NotFoundError" ||
      errorMessage.includes("no camera") ||
      errorMessage.includes("NO_CAMERAS_FOUND")
    ) {
      return "No se encontró ninguna cámara en este dispositivo.";
    }

    if (
      errorName === "NotSupportedError" ||
      errorMessage.includes("not supported")
    ) {
      return "Tu navegador no soporta acceso a la cámara. Intenta con Chrome, Firefox o Safari.";
    }

    if (
      errorName === "NotReadableError" ||
      errorMessage.includes("already used")
    ) {
      return "La cámara está siendo usada por otra aplicación. Ciérrala e intenta nuevamente.";
    }

    return `Error técnico: ${errorMessage}. Recarga la página e intenta nuevamente.`;
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
