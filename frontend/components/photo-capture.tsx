// components/photo-capture.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, AlertCircle } from "lucide-react";
import { apiService } from "@/lib/api-services";
import { toast } from "@/hooks/use-toast";

interface PhotoCaptureProps {
  entryId: string;
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: (photoUrl: string) => void;
  onCameraError: (error: string) => void;
}

export function PhotoCapture({
  entryId,
  isOpen,
  onClose,
  onPhotoUploaded,
  onCameraError,
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setCameraError(null);
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      if (cameraError) return; // No intentar si ya hay un error

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      const errorMsg = "No se pudo acceder a la cámara. Verifica los permisos.";
      setCameraError(errorMsg);
      onCameraError(errorMsg);
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Ajustar el tamaño del canvas al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir a data URL
    const imageData = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageData);
    setIsCapturing(true);

    // Detener la cámara después de capturar
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsCapturing(false);
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      // Convertir data URL a blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Subir la foto
      await apiService.uploadPhoto(entryId, blob);

      toast({
        title: "Éxito",
        description: "Foto subida correctamente",
      });

      onPhotoUploaded(URL.createObjectURL(blob));
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir la foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tomar Foto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {cameraError ? (
            <div className="text-center p-8 border rounded-lg bg-yellow-50">
              <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <p className="text-yellow-800 font-medium">{cameraError}</p>
              <p className="text-sm text-yellow-700 mt-2">
                Por favor, verifica que la cámara esté disponible y los permisos
                estén concedidos.
              </p>
              <Button onClick={startCamera} variant="outline" className="mt-4">
                Reintentar
              </Button>
            </div>
          ) : !isCapturing ? (
            <>
              <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <Button onClick={capturePhoto} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Tomar Foto
              </Button>
            </>
          ) : (
            <>
              <div className="w-full h-64 bg-black rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  onClick={retakePhoto}
                  variant="outline"
                  className="flex-1"
                >
                  Volver a tomar
                </Button>
                <Button
                  onClick={uploadPhoto}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? "Subiendo..." : "Subir Foto"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
