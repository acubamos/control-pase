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
        };
        
        await videoRef.current.play();
      }

      // Iniciar escaneo cada 200ms
      intervalRef.current = setInterval(scanFrame, 200);
      
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
    }

    setIsScanning(false);
    setCameraReady(false);
    setLastScannedData(null);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
  
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });
  
    const isVideoReady = video.readyState >= video.HAVE_CURRENT_DATA;
    if (!context || !isVideoReady || video.videoWidth === 0) return;
  
    try {
      // Usar tamaño completo para mejor detección
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
  
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  
      // Configuración optimizada para QR cubanos
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
  
      if (code && code.data !== lastScannedData) {
        console.log("🔍 QR detectado:", code.data);
        setLastScannedData(code.data);
        
        // VERIFICAR SI TIENE EL FORMATO CUBANO (N:, A:, CI:)
        const hasCubanFormat = code.data.includes('N:') && code.data.includes('A:') && code.data.includes('CI:');
        
        if (hasCubanFormat) {
          console.log("✅ Formato de cédula cubana detectado");
          const qrData = parseQRData(code.data);
          console.log("📊 Datos parseados:", qrData);
          
          if (qrData) {
            console.log("✅ Enviando datos al padre:", qrData);
            
            // DETENER LA CÁMARA INMEDIATAMENTE
            stopCamera();
            
            // MOSTRAR ALERT 
            alert(`✅ CÉDULA CUBANA ESCANEADA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
            
            // LLAMAR onScan DESPUÉS de detener la cámara
            onScan(qrData);
          } else {
            console.warn("❌ QR detectado pero no se pudo parsear:", code.data);
            alert("❌ CÓDIGO QR NO VÁLIDO\n\nEl formato del código QR no es correcto. Asegúrate de escanear un código QR de cédula válido.");
          }
        } else {
          console.warn("❌ QR detectado pero no es formato cubano:", code.data);
          alert("❌ NO ES CÉDULA CUBANA\n\nSe detectó un código QR pero no es de una cédula de identidad cubana.");
        }
      }
    } catch (error) {
      console.error("Error en escaneo:", error);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const simulateScan = () => {
    // Usar el formato REAL de cédula cubana con FV:
    const mockQRText = `N:MARIA ISABEL
A:PEREZ GUILLEN
CI:61111607936
FV:ACW631074`;
    
    console.log("🎯 Simulando escaneo con formato cubano real:", mockQRText);
    
    const qrData = parseQRData(mockQRText);
    console.log("📊 Datos parseados de simulación:", qrData);
    
    if (qrData) {
      console.log("✅ Enviando datos simulados al padre:", qrData);
      
      alert(`✅ SIMULACIÓN DE CÉDULA CUBANA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
      
      onScan(qrData);
    } else {
      alert("❌ ERROR EN SIMULACIÓN\n\nNo se pudieron parsear los datos de prueba.");
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

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código QR de la cédula cubana. El formato debe contener N:, A: y CI:
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              <strong>Formato esperado:</strong> N:Nombre / A:Apellidos / CI:Número
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}