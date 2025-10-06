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
import { Html5QrcodeScanner } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: QRData) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);

      if (!scannerContainerRef.current) {
        throw new Error("No se encontró el contenedor del scanner");
      }

      // Configurar el scanner
      scannerRef.current = new Html5QrcodeScanner(
        "qr-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [
            { type: "qr_code" },
            { type: "datamatrix" }
          ],
          aspectRatio: 1.0,
        },
        false
      );

      // Iniciar el scanner
      scannerRef.current.render(
        (decodedText) => {
          console.log("🎉 QR detectado:", decodedText);
          
          // Verificar si es formato cubano
          if (decodedText.includes('N:') && decodedText.includes('A:') && decodedText.includes('CI:')) {
            console.log("✅ Formato de cédula cubana detectado");
            const qrData = parseQRData(decodedText);
            
            if (qrData) {
              console.log("✅ Datos parseados:", qrData);
              stopCamera();
              alert(`✅ CÉDULA CUBANA ESCANEADA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}\n\nLos datos se han cargado en el formulario.`);
              onScan(qrData);
            } else {
              console.warn("❌ No se pudo parsear:", decodedText);
              alert("❌ FORMATO NO VÁLIDO\n\nEl QR se detectó pero no tiene el formato correcto.");
            }
          } else {
            console.warn("❌ No es formato cubano:", decodedText);
            alert(`❌ NO ES CÉDULA CUBANA\n\nContenido detectado:\n${decodedText}\n\nFormato esperado: N:Nombre / A:Apellidos / CI:Número`);
          }
        },
        (errorMessage) => {
          // Ignorar errores de no detección, son normales
          if (!errorMessage.includes("No MultiFormat Readers")) {
            console.log("🔍 Escaneando...", errorMessage);
          }
        }
      );

      setCameraReady(true);
      
    } catch (err) {
      console.error("Error iniciando cámara:", err);
      setError(
        "No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios."
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(error => {
        console.log("Error limpiando scanner:", error);
      });
      scannerRef.current = null;
    }
    
    setIsScanning(false);
    setCameraReady(false);
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

  // Función para cambiar entre cámaras
  const switchCamera = async () => {
    if (!scannerRef.current) return;

    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras.length < 2) {
        alert("⚠️ Solo hay una cámara disponible");
        return;
      }

      const currentCamera = await scannerRef.current.getRunningTrackCameraId();
      const otherCamera = cameras.find(cam => cam.id !== currentCamera);
      
      if (otherCamera) {
        await scannerRef.current.clear();
        await startCameraWithId(otherCamera.id);
      }
    } catch (error) {
      console.error("Error cambiando cámara:", error);
    }
  };

  const startCameraWithId = async (cameraId: string) => {
    if (!scannerContainerRef.current) return;

    scannerRef.current = new Html5QrcodeScanner(
      "qr-scanner-container",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [
          { type: "qr_code" },
          { type: "datamatrix" }
        ],
        aspectRatio: 1.0,
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        console.log("🎉 QR detectado:", decodedText);
        
        if (decodedText.includes('N:') && decodedText.includes('A:') && decodedText.includes('CI:')) {
          const qrData = parseQRData(decodedText);
          if (qrData) {
            stopCamera();
            alert(`✅ CÉDULA DETECTADA\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}`);
            onScan(qrData);
          }
        } else {
          alert(`❌ NO ES CÉDULA\nContenido: ${decodedText}`);
        }
      },
      (errorMessage) => {
        if (!errorMessage.includes("No MultiFormat Readers")) {
          console.log("🔍 Escaneando...", errorMessage);
        }
      }
    );

    setCameraReady(true);
  };

  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        startCamera();
      }, 100);
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
              {/* Contenedor donde html5-qrcode renderizará el scanner */}
              <div 
                id="qr-scanner-container"
                ref={scannerContainerRef}
                className="w-full h-64 rounded-lg overflow-hidden"
              />
              
              {isScanning && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <p className="text-white">Iniciando cámara...</p>
                </div>
              )}

              {cameraReady && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={simulateScan} variant="outline">
              Simular Escaneo
            </Button>
            <Button onClick={switchCamera} variant="outline">
              Cambiar Cámara
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
              <strong>html5-qrcode</strong> - Librería especializada para QR
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              Soporta QR y DataMatrix. Más confiable que jsQR.
            </p>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Apunta el código QR de la cédula dentro del marco. Buena iluminación mejora la detección.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}