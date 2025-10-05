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
  const [frameCount, setFrameCount] = useState(0);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);
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
      setLastScannedData(null);
      isScanningRef.current = false;

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
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

      if (code && code.data !== lastScannedData) {
        console.log("🎉 QR DETECTADO:", code.data);
        setLastScannedData(code.data);
        
        const qrData = parseQRData(code.data);
        console.log("📊 Datos parseados:", qrData);
        
        if (qrData) {
          console.log("✅ Enviando datos al padre:", qrData);
          
          // DETENER TODO INMEDIATAMENTE
          stopCamera();
          
          // MOSTRAR ALERT 
          alert(`✅ QR ESCANEADO EXITOSAMENTE\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
          
          // LLAMAR onScan DESPUÉS de detener la cámara
          onScan(qrData);
        } else {
          console.warn("❌ QR detectado pero no se pudo parsear:", code.data);
          alert("❌ CÓDIGO QR NO VÁLIDO\n\nEl formato del código QR no es correcto. Asegúrate de escanear un código QR de cédula válido.");
          scheduleNextFrame();
        }
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
    const mockQRText = `N:HASSAN ALEJANDRO
A:RODRIGUEZ PEREZ
CI:99032608049`;
    console.log("🎯 Simulando escaneo con:", mockQRText);
    
    const qrData = parseQRData(mockQRText);
    console.log("📊 Datos parseados de simulación:", qrData);
    
    if (qrData) {
      console.log("✅ Enviando datos simulados al padre:", qrData);
      
      // ALERT PARA SIMULACIÓN TAMBIÉN
      alert(`✅ SIMULACIÓN DE ESCANEO EXITOSA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
      
      onScan(qrData);
    } else {
      alert("❌ ERROR EN SIMULACIÓN\n\nNo se pudieron parsear los datos de prueba.");
    }
  };

  // Forzar un frame manualmente
  const forceFrame = () => {
    console.log("🔄 Forzando frame manualmente");
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
            Escanear Código QR
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
                autoPlay
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
              Simular Escaneo
            </Button>
            <Button onClick={forceFrame} variant="outline">
              Forzar Frame
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              <strong>Estado:</strong> {frameCount > 0 ? `Escaneando (${frameCount} frames)` : "Preparando cámara"}
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              Usa "Forzar Frame" si el escaneo no inicia automáticamente
            </p>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código QR de la cédula. Asegúrate de tener buena iluminación y mantener el código dentro del marco.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
