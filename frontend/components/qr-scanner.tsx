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
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);
      setFrameCount(0);
      lastScanTimeRef.current = 0;

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          alert("✅ CÁMARA LISTA - Iniciando escaneo en 1 segundo...");
          
          // Esperar 1 segundo para que el video esté realmente reproduciendo
          setTimeout(() => {
            startScanning();
          }, 1000);
        };
        
        await videoRef.current.play();
      }

    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios y que la cámara esté funcionando."
      );
      setIsScanning(false);
    }
  };

  const startScanning = () => {
    alert("🔍 INICIANDO ESCANEO...");
    
    // Limpiar cualquier intervalo previo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Usar setInterval con un tiempo más largo para móvil
    intervalRef.current = setInterval(() => {
      scanFrame();
    }, 300); // 300ms entre escaneos (más lento para móvil)
    
    alert("🔄 INTERVALO INICIADO - Debería escanear cada 300ms");
  };

  const stopCamera = () => {
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

    setIsScanning(false);
    setCameraReady(false);
  };

  const scanFrame = () => {
    const now = Date.now();
    
    // Evitar escanear demasiado rápido
    if (now - lastScanTimeRef.current < 250) {
      return;
    }
    lastScanTimeRef.current = now;

    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      console.log("❌ Condiciones no cumplidas para escanear");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      console.log("❌ No se pudo obtener context 2D");
      return;
    }

    // Verificar que el video tenga datos
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log("❌ Video sin dimensiones");
      return;
    }

    try {
      // Incrementar contador
      setFrameCount(prev => {
        const newCount = prev + 1;
        
        // Alertas de debug en frames específicos
        if (newCount === 1) {
          alert("📸 PRIMER FRAME CAPTURADO - El escaneo está funcionando!");
        } else if (newCount === 5) {
          alert(`🔄 ${newCount} frames procesados - Buscando QR...`);
        } else if (newCount === 10) {
          alert(`🔍 ${newCount} frames - ¿Ves el cuadro verde? Apunta a un QR`);
        }
        
        return newCount;
      });

      // Configurar canvas con las dimensiones del video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar el frame actual en el canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Obtener los datos de la imagen
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Intentar detectar QR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        alert(`🎉 QR DETECTADO! Contenido: ${code.data}`);
        stopCamera();
        onScan({
          nombre: "QR_DETECTADO",
          apellidos: code.data.substring(0, 20),
          ci: "FROM_QR"
        });
        onClose();
      }

    } catch (error) {
      console.error("💥 Error en escaneo:", error);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
    alert("🎯 SIMULANDO ESCANEO...");
    onScan({
      nombre: "SIMULACION", 
      apellidos: "FUNCIONA", 
      ci: "123456789"
    });
    alert("✅ SIMULACIÓN COMPLETADA");
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
            QR Scanner - DEBUG FRAMES
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={startCamera} variant="outline" className="w-full">
                  Reiniciar Cámara
                </Button>
                <Button onClick={simulateScan} variant="outline" className="w-full">
                  Simular
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
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />

              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Frames: {frameCount}
                  </div>
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    Escaneando...
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={simulateScan} className="flex-1" variant="outline">
              Simular
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              <strong>DEBUG:</strong> Frames procesados: {frameCount}
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              Si no aumenta, el escaneo no está funcionando
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
