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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);
      setFrameCount(0);
      isScanningRef.current = false;

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          aspectRatio: { ideal: 1.777 },
          height: { ideal: 720 }
        },
      };

      console.log("📷 Solicitando acceso a cámara...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log("✅ Cámara accedida");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log("📹 Metadata de video cargada");
          setCameraReady(true);
          alert("✅ CÁMARA LISTA - El video debería verse ahora");
          
          // Esperar a que el video realmente se reproduzca
          setTimeout(() => {
            console.log("🚀 Iniciando escaneo después de delay");
            startScanning();
          }, 1000);
        };

        videoRef.current.onplay = () => {
          console.log("▶️ Video reproduciéndose");
        };

        videoRef.current.onerror = (e) => {
          console.error("❌ Error en video:", e);
        };
        
        await videoRef.current.play();
        console.log("🎬 Play llamado al video");
      }

    } catch (err) {
      console.error("Error accediendo a cámara:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios y que la cámara esté funcionando."
      );
      setIsScanning(false);
    }
  };

  const startScanning = () => {
    console.log("🔍 Iniciando proceso de escaneo");
    alert("🔍 INICIANDO ESCANEO - Debería empezar a procesar frames");
    
    isScanningRef.current = true;
    scanFrame(); // Llamar directamente la primera vez
  };

  const scanFrame = () => {
    if (!isScanningRef.current) {
      console.log("⏹️ Escaneo detenido, no procesar frame");
      return;
    }

    // Incrementar contador inmediatamente
    setFrameCount(prev => {
      const newCount = prev + 1;
      
      // Alertas de debug
      if (newCount === 1) {
        alert("🎉 PRIMER FRAME PROCESADO - El escaneo SÍ está funcionando!");
      } else if (newCount === 3) {
        alert(`🔄 ${newCount} frames procesados - El escaneo está activo`);
      } else if (newCount === 5) {
        alert(`👀 ${newCount} frames - Apunta a un código QR ahora`);
      }
      
      return newCount;
    });

    // Verificar condiciones básicas
    if (!videoRef.current || !canvasRef.current) {
      console.log("❌ Elementos de video/canvas no disponibles");
      scheduleNextFrame();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      console.log("❌ Context 2D no disponible");
      scheduleNextFrame();
      return;
    }

    // Verificar que el video tenga datos
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log("❌ Video sin dimensiones válidas");
      scheduleNextFrame();
      return;
    }

    try {
      console.log(`📸 Procesando frame ${frameCount + 1}`);

      // Configurar canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Obtener image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      console.log(`🖼️ ImageData obtenido: ${canvas.width}x${canvas.height}`);

      // Intentar detectar QR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        console.log("🎉 QR DETECTADO:", code.data);
        alert(`🎉 QR DETECTADO!\nContenido: ${code.data}`);
        stopCamera();
        onScan({
          nombre: "QR_DETECTADO",
          apellidos: code.data.substring(0, 20),
          ci: "FROM_QR"
        });
        onClose();
      } else {
        console.log(`❌ No se detectó QR en frame ${frameCount + 1}`);
        scheduleNextFrame();
      }

    } catch (error) {
      console.error("💥 Error procesando frame:", error);
      scheduleNextFrame();
    }
  };

  const scheduleNextFrame = () => {
    if (!isScanningRef.current) return;

    // Usar setTimeout recursivo en lugar de setInterval
    timeoutRef.current = setTimeout(() => {
      scanFrame();
    }, 200); // 200ms entre frames
  };

  const stopCamera = () => {
    console.log("🛑 Deteniendo cámara y escaneo");
    
    // Detener el loop de escaneo
    isScanningRef.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Detener stream de cámara
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    setIsScanning(false);
    setCameraReady(false);
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

  // Forzar un frame manualmente
  const forceFrame = () => {
    alert("🔄 FORZANDO FRAME MANUALMENTE");
    scanFrame();
  };

  useEffect(() => {
    if (isOpen) {
      console.log("🎬 Modal abierto, iniciando cámara");
      startCamera();
    } else {
      console.log("📴 Modal cerrado, deteniendo cámara");
      stopCamera();
    }

    return () => {
      console.log("🧹 Cleanup effect");
      stopCamera();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR Scanner - TEST FRAMES
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
                    {isScanningRef.current ? "Escaneando..." : "Pausado"}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={simulateScan} variant="outline">
              Simular
            </Button>
            <Button onClick={forceFrame} variant="outline">
              Forzar Frame
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700 text-center">
              <strong>ESTADO:</strong> {frameCount > 0 ? `ACTIVO (${frameCount} frames)` : "INACTIVO"}
            </p>
            <p className="text-xs text-yellow-600 text-center mt-1">
              Usa "Forzar Frame" si el contador no aumenta automáticamente
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
