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
          width: { ideal: 1920 },
          height: { ideal: 1080 }
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
      
      // Debug cada 10 frames
      if (newCount % 10 === 0) {
        console.log(`📊 ${newCount} frames procesados - Buscando QR cédula cubana`);
      }
      
      return newCount;
    });

    // Verificar condiciones básicas
    if (!videoRef.current || !canvasRef.current) {
      scheduleNextFrame();
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      scheduleNextFrame();
      return;
    }

    // Verificar que el video tenga datos
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      scheduleNextFrame();
      return;
    }

    try {
      // Configurar canvas con alta resolución para mejor detección
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Obtener image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Intentar detectar QR con configuración optimizada para cédulas cubanas
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth", // Intentar ambos modos de inversión
        // Para cédulas cubanas que suelen tener alto contraste
      });

      if (code && code.data !== lastScannedData) {
        console.log("🎉 QR DETECTADO:", code.data);
        setLastScannedData(code.data);
        
        // Verificar si es formato de cédula cubana ANTES de parsear
        const isCubanCIDFormat = code.data.includes('N:') && code.data.includes('A:') && code.data.includes('CI:');
        
        if (isCubanCIDFormat) {
          console.log("✅ Formato de cédula cubana detectado");
          const qrData = parseQRData(code.data);
          console.log("📊 Datos parseados:", qrData);
          
          if (qrData) {
            console.log("✅ Enviando datos al padre:", qrData);
            
            // DETENER TODO INMEDIATAMENTE
            stopCamera();
            
            // MOSTRAR ALERT 
            alert(`✅ CÉDULA CUBANA ESCANEADA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
            
            // LLAMAR onScan DESPUÉS de detener la cámara
            onScan(qrData);
          } else {
            console.warn("❌ QR detectado pero no se pudo parsear:", code.data);
            alert("❌ FORMATO DE CÉDULA NO VÁLIDO\n\nEl código QR se detectó pero no tiene el formato correcto para cédula cubana.");
            scheduleNextFrame();
          }
        } else {
          console.warn("❌ QR detectado pero no es formato de cédula cubana:", code.data);
          alert("❌ NO ES CÉDULA CUBANA\n\nSe detectó un código QR pero no es de una cédula de identidad cubana.\n\nFormato esperado:\nN:Nombre\nA:Apellidos\nCI:Número");
          scheduleNextFrame();
        }
      } else {
        if (frameCount % 20 === 0) {
          console.log(`🔍 Frame ${frameCount} - Buscando cédula cubana...`);
        }
        scheduleNextFrame();
      }

    } catch (error) {
      console.error("💥 Error procesando frame:", error);
      scheduleNextFrame();
    }
  };

  const scheduleNextFrame = () => {
    if (!isScanningRef.current) return;

    // Usar setTimeout recursivo - más rápido para mejor detección
    timeoutRef.current = setTimeout(() => {
      scanFrame();
    }, 100); // 100ms entre frames para mejor respuesta
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
    console.log("🎯 Simulando escaneo de cédula cubana:", mockQRText);
    
    const qrData = parseQRData(mockQRText);
    console.log("📊 Datos parseados de simulación:", qrData);
    
    if (qrData) {
      console.log("✅ Enviando datos simulados al padre:", qrData);
      
      // ALERT PARA SIMULACIÓN TAMBIÉN
      alert(`✅ SIMULACIÓN DE CÉDULA CUBANA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
      
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

  // Probar con QR de cédula cubana específico
  const testCubanID = () => {
    console.log("🇨🇺 Probando con cédula cubana específica");
    const testQR = `N:JUAN CARLOS
A:GARCIA PEREZ
CI:85041512345`;
    
    const qrData = parseQRData(testQR);
    if (qrData) {
      stopCamera();
      alert(`🇨🇺 PRUEBA CÉDULA CUBANA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}`);
      onScan(qrData);
    }
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
            Escanear Cédula Cubana
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
              Simular
            </Button>
            <Button onClick={forceFrame} variant="outline">
              Forzar Frame
            </Button>
            <Button onClick={testCubanID} variant="outline">
              Test Cédula
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              <strong>Escaneando cédula cubana</strong> - {frameCount} frames procesados
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              Formato: N:Nombre / A:Apellidos / CI:Número
            </p>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código QR de la cédula cubana. Asegúrate de tener buena iluminación.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
