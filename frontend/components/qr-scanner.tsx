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

interface QRScannerProps {
  onScan: (data: QRData) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [usingNativeAPI, setUsingNativeAPI] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);

      // PRIMERO: Verificar si el navegador soporta BarcodeDetector nativo
      if ('BarcodeDetector' in window) {
        console.log("✅ Navegador soporta BarcodeDetector nativo");
        setUsingNativeAPI(true);
        
        // @ts-ignore
        barcodeDetectorRef.current = new BarcodeDetector({
          formats: ['qr_code', 'datamatrix'] // Incluir DataMatrix por si acaso
        });
        
        alert("🔍 Usando detector nativo de QR/DataMatrix");
      } else {
        console.log("❌ Navegador NO soporta BarcodeDetector, necesitamos alternativa");
        setUsingNativeAPI(false);
        alert("❌ Tu navegador no soporta escaneo nativo. Usa Chrome o Edge.");
        return;
      }

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
          // Iniciar escaneo inmediatamente
          startNativeScanning();
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

  const startNativeScanning = async () => {
    if (!barcodeDetectorRef.current || !videoRef.current) return;

    console.log("🔍 Iniciando escaneo con API nativa...");
    
    const detectBarcode = async () => {
      if (!barcodeDetectorRef.current || !videoRef.current || !isScanning) return;

      try {
        const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
        
        if (barcodes.length > 0) {
          const barcode = barcodes[0];
          console.log("🎉 Código detectado:", barcode);
          console.log("📝 Contenido:", barcode.rawValue);
          console.log("🔤 Formato:", barcode.format);
          
          // Verificar si es formato cubano
          if (barcode.rawValue.includes('N:') && barcode.rawValue.includes('A:') && barcode.rawValue.includes('CI:')) {
            console.log("✅ Formato de cédula cubana detectado");
            const qrData = parseQRData(barcode.rawValue);
            
            if (qrData) {
              stopCamera();
              alert(`✅ CÉDULA DETECTADA (${barcode.format})\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}`);
              onScan(qrData);
              return;
            }
          } else {
            console.log("❌ Formato no reconocido:", barcode.rawValue);
            alert(`❌ CÓDIGO DETECTADO PERO NO ES CÉDULA\n\nFormato: ${barcode.format}\nContenido: ${barcode.rawValue}`);
          }
        }
        
        // Continuar escaneo
        if (isScanning) {
          requestAnimationFrame(detectBarcode);
        }
      } catch (error) {
        console.error("Error en detección:", error);
        if (isScanning) {
          setTimeout(detectBarcode, 100);
        }
      }
    };

    detectBarcode();
  };

  const stopCamera = () => {
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

  // Alternativa: Usar input de archivo para subir imagen del QR
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const image = new Image();
      image.onload = async () => {
        try {
          if ('BarcodeDetector' in window) {
            // @ts-ignore
            const detector = new BarcodeDetector({ formats: ['qr_code', 'datamatrix'] });
            const barcodes = await detector.detect(image);
            
            if (barcodes.length > 0) {
              const barcode = barcodes[0];
              console.log("📸 QR de imagen detectado:", barcode.rawValue);
              
              if (barcode.rawValue.includes('N:') && barcode.rawValue.includes('A:') && barcode.rawValue.includes('CI:')) {
                const qrData = parseQRData(barcode.rawValue);
                if (qrData) {
                  alert(`✅ CÉDULA DESDE IMAGEN\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}`);
                  onScan(qrData);
                }
              } else {
                alert(`❌ NO ES CÉDULA\nContenido: ${barcode.rawValue}`);
              }
            } else {
              alert("❌ No se detectó código QR en la imagen");
            }
          }
        } catch (error) {
          console.error("Error procesando imagen:", error);
          alert("❌ Error procesando la imagen");
        }
      };
      image.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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
            {usingNativeAPI ? "Escanear Cédula (API Nativa)" : "Escanear Cédula"}
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
              
              {/* Alternativa: Subir imagen */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  O sube una foto del QR:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
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

              {isScanning && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <p className="text-white">Iniciando cámara...</p>
                </div>
              )}

              {cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                    {usingNativeAPI ? "Escaneando..." : "Preparando..."}
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
              <strong>Usando {usingNativeAPI ? "API Nativa" : "jsQR"}</strong>
            </p>
            <p className="text-xs text-blue-600 text-center mt-1">
              {usingNativeAPI 
                ? "Chrome/Edge - Detecta QR y DataMatrix" 
                : "Necesita Chrome/Edge para mejor detección"}
            </p>
          </div>

          {/* Alternativa de subir imagen siempre visible */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2 text-center">
              ¿Problemas con la cámara?
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}