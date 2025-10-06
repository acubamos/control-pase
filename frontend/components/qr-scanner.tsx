"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, RefreshCw } from "lucide-react";
import { parseQRData, type QRData } from "@/lib/qr-scanner";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QRScannerProps {
  onScan: (data: QRData) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerHtml5({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const initializeScanner = () => {
    try {
      setError(null);
      setIsScanning(true);

      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [],
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleQRDetected(decodedText);
        },
        (errorMessage) => {
          // Ignorar errores de escaneo continuo
          console.log("Escaneando...", errorMessage);
        }
      );

      scannerRef.current = scanner;
    } catch (err: any) {
      console.error("Error inicializando escáner:", err);
      setError("Error al inicializar el escáner QR: " + err.message);
      setIsScanning(false);
    }
  };

  const handleQRDetected = (decodedText: string) => {
    console.log("🎉 QR detectado:", decodedText);
    
    if (decodedText.includes('N:') && decodedText.includes('A:') && decodedText.includes('CI:')) {
      console.log("✅ Formato de cédula cubana detectado");
      const qrData = parseQRData(decodedText);
      
      if (qrData) {
        console.log("✅ Datos parseados correctamente");
        stopScanner();
        alert(`✅ CÉDULA CUBANA ESCANEADA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}`);
        onScan(qrData);
      } else {
        console.warn("❌ No se pudo parsear el QR");
        alert("❌ FORMATO NO VÁLIDO\n\nEl QR se detectó pero no tiene el formato correcto.");
      }
    } else {
      console.warn("❌ No es formato cubano:", decodedText);
      alert(`❌ NO ES CÉDULA CUBANA\n\nFormato esperado: N:Nombre / A:Apellidos / CI:Número`);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const retryScanner = () => {
    stopScanner();
    setTimeout(() => {
      initializeScanner();
    }, 500);
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
      handleClose();
    } else {
      alert("❌ ERROR EN SIMULACIÓN");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear Cédula Cubana
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <div className="space-y-2">
                <Button onClick={retryScanner} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
                <Button onClick={simulateScan} variant="outline" className="w-full">
                  Usar simulación
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div id="qr-reader" className="w-full"></div>
              
              <div className="flex gap-2">
                <Button onClick={simulateScan} className="flex-1" variant="outline">
                  Simular Escaneo
                </Button>
                <Button onClick={retryScanner} variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={handleClose} variant="outline" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 text-center">
                  <strong>Instrucciones:</strong> Apunta a un código QR de cédula cubana
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}