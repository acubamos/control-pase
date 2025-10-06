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

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);
      setLastScannedData(null);

      // Primero verificar si hay permisos
      const permissions = await navigator.permissions?.query({ name: 'camera' as PermissionName });
      if (permissions?.state === 'denied') {
        throw new Error("Permisos de cámara denegados. Ve a ajustes del navegador y permite el acceso a la cámara.");
      }

      const constraints = {
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      console.log("📷 Solicitando acceso a cámara...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log("✅ Cámara accedida correctamente");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log("📹 Metadata de video cargada");
          setCameraReady(true);
        };

        videoRef.current.onplay = () => {
          console.log("▶️ Video reproduciéndose");
          // Iniciar escaneo cuando el video esté reproduciéndose
          startScanning();
        };

        videoRef.current.onerror = (e) => {
          console.error("❌ Error en video:", e);
          setError("Error al reproducir el video de la cámara");
        };
        
        // Usar play() con manejo de errores
        videoRef.current.play().catch(playError => {
          console.error("Error en play():", playError);
          setError("Error al iniciar la cámara: " + playError.message);
        });
      }

    } catch (err: any) {
      console.error("❌ Error accediendo a cámara:", err);
      
      let errorMessage = "No se pudo acceder a la cámara. ";
      
      if (err.name === 'NotAllowedError') {
        errorMessage += "Permisos denegados. Asegúrate de permitir el acceso a la cámara en tu navegador.";
      } else if (err.name === 'NotFoundError') {
        errorMessage += "No se encontró ninguna cámara.";
      } else if (err.name === 'NotSupportedError') {
        errorMessage += "Tu navegador no soporta esta funcionalidad.";
      } else if (err.name === 'NotReadableError') {
        errorMessage += "La cámara está siendo usada por otra aplicación.";
      } else {
        errorMessage += err.message || "Error desconocido.";
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const startScanning = () => {
    console.log("🔍 Iniciando escaneo QR...");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(scanFrame, 300); // Escanear cada 300ms
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      // Configurar canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Detectar QR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data !== lastScannedData) {
        console.log("🎉 QR detectado:", code.data);
        setLastScannedData(code.data);
        
        // Verificar formato cubano
        if (code.data.includes('N:') && code.data.includes('A:') && code.data.includes('CI:')) {
          console.log("✅ Formato de cédula cubana detectado");
          const qrData = parseQRData(code.data);
          
          if (qrData) {
            console.log("✅ Datos parseados:", qrData);
            stopCamera();
            alert(`✅ CÉDULA CUBANA ESCANEADA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
            onScan(qrData);
          } else {
            console.warn("❌ No se pudo parsear:", code.data);
            alert("❌ FORMATO NO VÁLIDO\n\nEl QR se detectó pero no tiene el formato correcto.");
          }
        } else {
          console.warn("❌ No es formato cubano:", code.data);
          alert(`❌ NO ES CÉDULA CUBANA\n\nContenido:\n${code.data}\n\nFormato esperado: N:Nombre / A:Apellidos / CI:Número`);
        }
      }
    } catch (error) {
      console.error("Error en escaneo:", error);
    }
  };

  const stopCamera = () => {
    console.log("🛑 Deteniendo cámara...");
    
    // Limpiar intervalo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Detener stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Limpiar video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setCameraReady(false);
    setLastScannedData(null);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
    const mockQRText = `N:MARIA ISABEL
A:PEREZ GUILLEN
CI:61111607936
FV:ACW631074`;
    
    console.log("🎯 Simulando escaneo:", mockQRText);
    
    const qrData = parseQRData(mockQRText);
    
    if (qrData) {
      alert(`✅ SIMULACIÓN EXITOSA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}`);
      onScan(qrData);
    } else {
      alert("❌ ERROR EN SIMULACIÓN");
    }
  };

  // Función para solicitar permisos manualmente
  const requestPermissions = async () => {
    try {
      // Intentar acceder a la cámara para solicitar permisos
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Cerrar inmediatamente después de obtener permisos
      stream.getTracks().forEach(track => track.stop());
      alert("✅ Permisos concedidos. Ahora puedes usar el escáner.");
      startCamera();
    } catch (err) {
      console.error("Error solicitando permisos:", err);
      alert("❌ No se pudieron obtener los permisos de cámara.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log("🎬 Modal abierto, iniciando cámara...");
      startCamera();
    } else {
      console.log("📴 Modal cerrado, deteniendo cámara...");
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
            Escanear Cédula Cubana
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={requestPermissions} variant="outline" className="w-full">
                  Solicitar Permisos
                </Button>
                <Button onClick={startCamera} variant="outline" className="w-full">
                  Intentar de nuevo
                </Button>
                <Button onClick={simulateScan} variant="outline" className="w-full">
                  Usar simulación
                </Button>
              </div>
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

              {isScanning && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <p className="text-white">Solicitando permisos de cámara...</p>
                </div>
              )}

              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={simulateScan} className="flex-1" variant="outline">
              Simular Escaneo
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              <strong>Permisos necesarios:</strong> La cámara requiere permisos para escanear QR
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              Asegúrate de permitir el acceso a la cámara cuando el navegador lo solicite
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}