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

// Interface y función parseQRData integradas en el mismo componente
export interface QRData {
  nombre: string;
  apellidos: string;
  ci: string;
}

function parseQRData(qrText: string): QRData | null {
  try {
    console.log("📝 Texto QR recibido para parsing:", qrText);
    
    const cleanText = qrText.replace(/\r/g, "").trim();
    console.log("🧹 Texto limpio:", cleanText);
    
    // Buscar los índices de los prefijos
    const nombreIndex = cleanText.indexOf('N:');
    const apellidosIndex = cleanText.indexOf('A:');
    const ciIndex = cleanText.indexOf('CI:');

    console.log("🔍 Índices encontrados:", { nombreIndex, apellidosIndex, ciIndex });

    if (nombreIndex === -1 || apellidosIndex === -1 || ciIndex === -1) {
      console.warn("❌ No se encontraron todos los prefijos requeridos");
      return null;
    }

    // Extraer cada campo
    const nombre = cleanText.substring(nombreIndex + 2, apellidosIndex).trim();
    const apellidos = cleanText.substring(apellidosIndex + 2, ciIndex).trim();
    const ci = cleanText.substring(ciIndex + 3).trim();

    console.log("📋 Datos extraídos:", { nombre, apellidos, ci });

    // Validar que los campos no estén vacíos
    if (!nombre || !apellidos || !ci) {
      console.warn("❌ Campos vacíos detectados");
      return null;
    }

    const result = {
      nombre,
      apellidos,
      ci,
    };

    console.log("✅ Datos parseados exitosamente:", result);
    return result;

  } catch (error) {
    console.error("❌ Error parsing QR data:", error);
    return null;
  }
}

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

      // CONFIGURACIÓN OPTIMIZADA PARA QR
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },  // Resolución óptima para QR
          height: { ideal: 720 },   // 720p es suficiente
          aspectRatio: { ideal: 1.777 },
          frameRate: { ideal: 30 }  // Mayor frame rate
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

      // AUMENTAR FRECUENCIA DE ESCANEO
      intervalRef.current = setInterval(scanFrame, 250); // 4 escaneos/segundo
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
      const scale = 0.7;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data !== lastScannedData) {
        console.log("🔍 QR detectado:", code.data);
        setLastScannedData(code.data); // Prevenir escaneos duplicados
        
        const qrData = parseQRData(code.data);
        console.log("📊 Datos parseados:", qrData);
        
        if (qrData) {
          console.log("✅ Enviando datos al padre:", qrData);
          
          // 🔔 MOSTRAR ALERT CUANDO SE DETECTA EL QR
          alert(`✅ QR ESCANEADO EXITOSAMENTE\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
          
          onScan(qrData);
          // NO cerrar inmediatamente - dejar que el padre maneje el cierre
        } else {
          console.warn("❌ QR detectado pero no se pudo parsear:", code.data);
          // 🔔 ALERT PARA QR NO VÁLIDO
          alert("❌ CÓDIGO QR NO VÁLIDO\n\nEl formato del código QR no es correcto. Asegúrate de escanear un código QR de cédula válido.");
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
    const mockQRText = `N:HASSAN ALEJANDRO
A:RODRIGUEZ PEREZ
CI:99032608049`;
    console.log("🎯 Simulando escaneo con:", mockQRText);
    
    const qrData = parseQRData(mockQRText);
    console.log("📊 Datos parseados de simulación:", qrData);
    
    if (qrData) {
      console.log("✅ Enviando datos simulados al padre:", qrData);
      
      // 🔔 ALERT PARA SIMULACIÓN TAMBIÉN
      alert(`✅ SIMULACIÓN DE ESCANEO EXITOSA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
      
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
            Apunta la cámara hacia el código QR de la cédula. Asegúrate de tener buena iluminación y mantener el código dentro del marco.
          </p>
          
          {/* 🔔 Indicador visual de que se mostrará un alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700 text-center">
              <strong>Nota:</strong> Se mostrará una alerta cuando el QR sea detectado exitosamente.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Exportar también la interfaz y función por separado por si se necesitan en otros componentes
export { parseQRData };