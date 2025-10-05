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

      const constraints = {
        video: {
          facingMode: "environment",
          aspectRatio: { ideal: 1.777 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
        
        await videoRef.current.play();
      }

      // Iniciar el escaneo cada 500ms (más lento para debug)
      intervalRef.current = setInterval(scanFrame, 500);
      console.log("🔍 Escaneo iniciado - intervalo configurado");
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios y que la cámara esté funcionando."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log("🛑 Escaneo detenido - intervalo limpiado");
    }

    setIsScanning(false);
    setCameraReady(false);
    setLastScannedData(null);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      console.log("⏸️  Escaneo pausado - condiciones no cumplidas");
      return;
    }
  
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });
  
    const isVideoReady = video.readyState >= video.HAVE_CURRENT_DATA;
    if (!context || !isVideoReady || video.videoWidth === 0) {
      console.log("⏸️  Video no listo para escanear");
      return;
    }
  
    try {
      // Configurar canvas con el mismo tamaño que el video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
  
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  
      console.log("📸 Frame capturado - procesando QR...");
      
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
  
      if (code) {
        console.log("🎉 QR DETECTADO:", code.data);
        console.log("📏 Tamaño QR:", code.width, "x", code.height);
        console.log("📍 Posición:", code.location);
        
        if (code.data !== lastScannedData) {
          setLastScannedData(code.data);
          
          // DETENER TODO INMEDIATAMENTE
          stopCamera();
          
          // ALERTA DE ÉXITO
          alert(`✅ QR DETECTADO EXITOSAMENTE!\n\nContenido: ${code.data}`);
          
          // ENVIAR AL PADRE - datos simples
          onScan({
            nombre: "QR_DETECTADO",
            apellidos: code.data.substring(0, 20), // primeros 20 chars
            ci: "FROM_QR_SCAN"
          });
          
          console.log("🚀 Datos enviados al componente padre");
        } else {
          console.log("🔁 QR duplicado - ignorando");
        }
      } else {
        console.log("❌ No se detectó QR en este frame");
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
    console.log("🎯 Simulando escaneo...");
    
    onScan({
      nombre: "SIMULACION",
      apellidos: "FUNCIONA", 
      ci: "123456789"
    });
    
    alert("✅ SIMULACIÓN DE ESCANEO EXITOSA");
  };

  useEffect(() => {
    if (isOpen) {
      console.log("🚀 Iniciando cámara y escaneo...");
      startCamera();
    } else {
      console.log("📴 Deteniendo cámara y escaneo...");
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
            Escanear Código QR - DETECCIÓN
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2">
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
                  <p className="text-white">Iniciando cámara...</p>
                </div>
              )}

              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    Escaneando...
                  </div>
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
              <strong>Modo detección:</strong> Abre las herramientas de desarrollo y revisa la consola para ver los logs del escaneo.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
