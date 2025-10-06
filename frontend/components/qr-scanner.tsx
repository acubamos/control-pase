"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, X, RefreshCw } from "lucide-react";
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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Verificar permisos de cámara
  const checkCameraPermissions = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu navegador no soporta acceso a la cámara");
        return false;
      }

      // Verificar permisos usando Permissions API si está disponible
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ 
            name: "camera" as PermissionName 
          });
          setHasCameraPermission(permissionStatus.state === "granted");
          
          permissionStatus.onchange = () => {
            setHasCameraPermission(permissionStatus.state === "granted");
          };
        } catch (e) {
          console.log("Permissions API no disponible para cámara");
        }
      }
      return true;
    } catch (err) {
      console.error("Error verificando permisos:", err);
      return false;
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setCameraReady(false);
      setLastScannedData(null);

      console.log("📷 Iniciando cámara...");

      const constraints = {
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        return new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Elemento video no disponible"));
            return;
          }

          const onLoadedMetadata = () => {
            console.log("✅ Video metadata cargada");
            videoRef.current?.removeEventListener("loadedmetadata", onLoadedMetadata);
            setCameraReady(true);
            resolve();
          };

          const onError = (e: Event) => {
            console.error("❌ Error en video:", e);
            videoRef.current?.removeEventListener("error", onError);
            reject(new Error("Error al cargar el video"));
          };

          videoRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
          videoRef.current.addEventListener("error", onError);

          // Intentar reproducir
          videoRef.current.play().catch(playError => {
            console.error("Error en play():", playError);
            reject(playError);
          });
        });
      }
    } catch (err: any) {
      console.error("❌ Error accediendo a cámara:", err);
      handleCameraError(err);
    }
  };

  const handleCameraError = (err: any) => {
    let errorMessage = "No se pudo acceder a la cámara. ";
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMessage = "Permisos de cámara denegados. Por favor, permite el acceso a la cámara en la configuración de tu navegador.";
      setHasCameraPermission(false);
    } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      errorMessage = "No se encontró una cámara trasera. Asegúrate de que tu dispositivo tenga cámara y que no esté siendo usada por otra aplicación.";
    } else if (err.name === 'NotSupportedError') {
      errorMessage = "Tu navegador no soporta esta funcionalidad. Intenta con Chrome, Firefox o Safari.";
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorMessage = "La cámara está siendo usada por otra aplicación. Cierra otras aplicaciones que usen la cámara e intenta nuevamente.";
    } else {
      errorMessage += err.message || "Error desconocido al acceder a la cámara.";
    }
    
    setError(errorMessage);
    setIsScanning(false);
    setCameraReady(false);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      // Configurar canvas con las dimensiones actuales del video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Dibujar frame actual
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Detectar QR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data !== lastScannedData) {
        console.log("🎉 QR detectado:", code.data);
        setLastScannedData(code.data);
        
        // Verificar formato cubano
        if (code.data.includes('N:') && code.data.includes('A:') && code.data.includes('CI:')) {
          console.log("✅ Formato de cédula cubana detectado");
          const qrData = parseQRData(code.data);
          
          if (qrData) {
            console.log("✅ Datos parseados correctamente");
            handleSuccessfulScan(qrData);
          } else {
            console.warn("❌ No se pudo parsear el QR");
            handleInvalidQR("El QR se detectó pero no tiene el formato correcto para cédula cubana.");
          }
        } else {
          console.warn("❌ No es formato cubano:", code.data);
          handleInvalidQR(`Formato no reconocido. Se esperaba formato de cédula cubana.`);
        }
      }

      // Continuar escaneo
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      console.error("Error en escaneo:", error);
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleSuccessfulScan = (qrData: QRData) => {
    stopCamera();
    alert(`✅ CÉDULA CUBANA ESCANEADA\n\nNombre: ${qrData.nombre}\nApellidos: ${qrData.apellidos}\nCI: ${qrData.ci}`);
    onScan(qrData);
  };

  const handleInvalidQR = (message: string) => {
    alert(`❌ QR NO VÁLIDO\n\n${message}\n\nApunta a un código QR de cédula cubana.`);
  };

  const stopCamera = () => {
    console.log("🛑 Deteniendo cámara...");
    
    // Detener animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Detener stream de cámara
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Limpiar video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setCameraReady(false);
    setLastScannedData(null);
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
      handleClose();
    } else {
      alert("❌ ERROR EN SIMULACIÓN: No se pudieron parsear los datos");
    }
  };

  const retryCamera = async () => {
    stopCamera();
    await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa
    startCamera();
  };

  // Efecto para manejar apertura/cierre del modal
  useEffect(() => {
    if (isOpen) {
      console.log("🎬 Modal abierto, verificando permisos...");
      checkCameraPermissions().then((canAccess) => {
        if (canAccess) {
          startCamera();
        }
      });
    } else {
      console.log("📴 Modal cerrado, deteniendo cámara...");
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Efecto para iniciar escaneo cuando la cámara esté lista
  useEffect(() => {
    if (cameraReady && isScanning) {
      console.log("🔍 Iniciando escaneo QR...");
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraReady, isScanning]);

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
                <Button onClick={retryCamera} className="w-full" variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
                <Button onClick={simulateScan} variant="outline" className="w-full">
                  Usar simulación
                </Button>
                <Button onClick={handleClose} variant="ghost" className="w-full">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {!cameraReady && isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-center text-white">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Iniciando cámara...</p>
                    </div>
                  </div>
                )}

                {cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-green-500 border-dashed w-48 h-48 rounded-lg animate-pulse" />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={simulateScan} className="flex-1" variant="outline">
                  Simular Escaneo
                </Button>
                <Button onClick={retryCamera} variant="outline" size="icon" disabled={!cameraReady}>
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
                <p className="text-xs text-blue-600 text-center mt-1">
                  El formato debe ser: N:Nombre / A:Apellidos / CI:Número
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}