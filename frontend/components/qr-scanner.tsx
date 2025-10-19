"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, RotateCcw } from "lucide-react";
import { parseQRData, type QRData } from "@/lib/qr-scanner";
import jsQR from "jsqr";

interface QRScannerProps {
  onScan: (data: QRData) => void;
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface MediaTrackCapabilities {
    focusMode?: string[];
    zoom?: {
      min: number;
      max: number;
      step: number;
    };
  }

  interface MediaTrackConstraintSet {
    focusMode?: string;
    zoom?: number;
  }
}

const TIMEOUT_CONFIG = {
  CAMERA_INIT: 15000,
  SCAN_DELAY: 800,
  ERROR_RESET: 3000,
  AUTO_CLOSE: 60000,
} as const;

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState("Preparando escáner...");
  const [retryCount, setRetryCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // ✅ CORRECCIÓN: Asegurar el tipo de retorno y manejar undefined
  const startCameraWithTimeout = async (): Promise<MediaStream> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("TIMEOUT: La cámara tardó demasiado en responder"));
      }, TIMEOUT_CONFIG.CAMERA_INIT);

      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
        .then(stream => {
          clearTimeout(timeoutId);
          // ✅ Asegurar que stream no es undefined
          if (!stream) {
            reject(new Error("No se pudo obtener el stream de la cámara"));
            return;
          }
          resolve(stream);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  };

  // ✅ CORRECCIÓN: Especificar tipo de retorno explícito
  const startCameraWithRetry = async (maxRetries: number = 2): Promise<MediaStream> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setScanningStatus(`Iniciando cámara... ${attempt > 0 ? `(Intento ${attempt + 1})` : ''}`);
        
        const stream = await startCameraWithTimeout();
        return stream;
      } catch (error) {
        console.warn(`Intento ${attempt + 1} fallido:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    // ✅ Nunca debería llegar aquí, pero TypeScript necesita este return
    throw new Error("Todos los intentos fallaron");
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setScanningStatus("Verificando permisos...");
      startTimeRef.current = Date.now();

      // ✅ CORRECCIÓN: stream está garantizado que es MediaStream o lanza error
      const stream = await startCameraWithRetry();
      streamRef.current = stream; // ✅ No hay error de tipo aquí

      // ✅ CORRECCIÓN: Verificar que el stream tenga tracks de video
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("No se encontraron tracks de video en el stream");
      }

      const videoTrack = videoTracks[0];
      const capabilities = videoTrack.getCapabilities();
      console.log("📷 Capacidades detectadas:", capabilities);

      if (capabilities.focusMode?.includes("continuous")) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any],
          });
          console.log("✅ Enfoque continuo activado");
        } catch (err) {
          console.warn("⚠️ No se pudo aplicar enfoque continuo", err);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const initTime = Date.now() - startTimeRef.current;
      console.log(`⏱️ Cámara iniciada en ${initTime}ms`);
      
      setScanningStatus("Ajustando cámara...");

      setTimeout(() => {
        setScanningStatus("🔍 Buscando código QR...");
        scanFrame();
        
        autoCloseRef.current = setTimeout(() => {
          if (isScanning) {
            setError("No se detectó ningún código QR. Acerca más la cámara o intenta con mejor iluminación.");
            stopCamera();
          }
        }, TIMEOUT_CONFIG.AUTO_CLOSE);
        
      }, TIMEOUT_CONFIG.SCAN_DELAY);

    } catch (err) {
      console.error("❌ Error crítico iniciando cámara:", err);
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      setIsScanning(false);
      setRetryCount(prev => prev + 1);
    }
  };

  const getFriendlyErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return "La cámara no respondió a tiempo. Puede que esté siendo usada por otra aplicación.";
    }
    
    if (message.includes('permission') || message.includes('denied')) {
      return "Permiso de cámara denegado. Por favor, habilita los permisos en la configuración de tu navegador.";
    }
    
    if (message.includes('not found') || message.includes('no device') || message.includes('no se encontraron')) {
      return "No se encontró ninguna cámara en este dispositivo.";
    }
    
    if (message.includes('not supported')) {
      return "Tu navegador no soporta acceso a la cámara. Intenta con Chrome o Safari.";
    }
    
    if (retryCount >= 2) {
      return "Múltiples intentos fallidos. Verifica que la cámara no esté siendo usada por otra aplicación y reinicia el navegador.";
    }
    
    return "Error al acceder a la cámara. Verifica los permisos e intenta nuevamente.";
  };

  const stopCamera = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsScanning(false);
  };

  const scanFrame = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const scale = 0.8;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (qrCode) {
        console.log("🎯 QR detectado:", qrCode.data);
        setScanningStatus("✅ Procesando código...");

        setTimeout(() => {
          const qrData = parseQRData(qrCode.data);
          if (qrData) {
            console.log("✅ Datos parseados correctamente:", qrData);
            onScan(qrData);
            handleClose();
          } else {
            setScanningStatus("❌ Formato no válido");
            setTimeout(() => {
              setScanningStatus("🔍 Buscando código QR...");
              animationRef.current = requestAnimationFrame(scanFrame);
            }, TIMEOUT_CONFIG.ERROR_RESET);
          }
        }, 500);
        
        return;
      }

      const statusMessages = [
        "🔍 Buscando código QR...",
        "📷 Ajustando enfoque...",
        "💡 Asegura buena iluminación",
        "🎯 Acerca la cámara al código"
      ];
      
      const currentTime = Date.now() - startTimeRef.current;
      const messageIndex = Math.floor(currentTime / 3000) % statusMessages.length;
      
      if (scanningStatus !== "✅ Procesando código..." && 
          scanningStatus !== "❌ Formato no válido") {
        setScanningStatus(statusMessages[messageIndex]);
      }

      animationRef.current = requestAnimationFrame(scanFrame);
    } catch (e) {
      console.error("Error en escaneo de frame:", e);
      animationRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
    setRetryCount(0);
  };

  const simulateScan = () => {
    const mockQRText = "N:HASSAN ALEJANDROA:RODRIGUEZ PEREZCI:99032608049";
    console.log("🧪 Simulando escaneo con:", mockQRText);

    const qrData = parseQRData(mockQRText);
    if (qrData) {
      onScan(qrData);
      handleClose();
    }
  };

  const handleRetry = () => {
    setError(null);
    startCamera();
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
            {retryCount > 0 && (
              <span className="text-xs text-gray-500">(Intento {retryCount + 1})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-6 space-y-4">
              <p className="text-red-600 mb-4 text-sm">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRetry} variant="outline" className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reintentar
                </Button>
                <Button onClick={handleClose} variant="outline">
                  Cancelar
                </Button>
              </div>
              
              {retryCount >= 1 && (
                <div className="text-xs text-gray-500 mt-4">
                  <p>💡 Sugerencias:</p>
                  <ul className="text-left mt-1 space-y-1">
                    <li>• Cierra otras apps que usen la cámara</li>
                    <li>• Reinicia el navegador</li>
                    <li>• Verifica permisos de cámara</li>
                  </ul>
                </div>
              )}
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

              {isScanning && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <p className="text-white bg-black bg-opacity-70 px-3 py-2 rounded-md text-sm backdrop-blur-sm">
                      {scanningStatus}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={simulateScan} 
              className="flex-1" 
              variant="outline"
              disabled={!!error}
            >
              Simular Escaneo (Desarrollo)
            </Button>
            <Button onClick={handleClose} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-gray-600 text-center">
            Apunta la cámara hacia el código QR de la cédula
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}