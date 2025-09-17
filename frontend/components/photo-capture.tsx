"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, X, Check, RotateCcw } from "lucide-react";
import { apiService } from "@/lib/api-services";
import { toast } from "@/hooks/use-toast";

interface PhotoCaptureProps {
  entryId: string;
  onPhotoUploaded: (photoUrl: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onCameraError: (error: string) => void;
}

export function PhotoCapture({
  entryId,
  onPhotoUploaded,
  isOpen,
  onClose,
  onCameraError,
}: PhotoCaptureProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [isCameraSupported, setIsCameraSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Verificar soporte de cámara al montar el componente
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsCameraSupported(false);
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(
          (device) => device.kind === "videoinput"
        );
        setIsCameraSupported(hasCamera);
      } catch (error) {
        console.error("Error checking camera support:", error);
        setIsCameraSupported(false);
      }
    };

    checkCameraSupport();
  }, []);

  const startCamera = async () => {
    try {
      if (cameraError) return;

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(newStream);
      streamRef.current = newStream;

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Esperar a que el video esté listo para reproducir
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((error) => {
            console.error("Error al reproducir video:", error);
          });
        };
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
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    stopCamera();
    // Pequeña pausa para permitir que la cámara anterior se libere completamente
    await new Promise((resolve) => setTimeout(resolve, 300));
    startCamera();
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || !video.videoWidth || !video.videoHeight) return;

    // Ajustar el canvas al tamaño del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar la imagen en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener la imagen como data URL
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(photoDataUrl);
    stopCamera();
  };

  const validateFile = (file: File): boolean => {
    // Verificar que sea una imagen
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido",
        variant: "destructive",
      });
      return false;
    }

    // Verificar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "La imagen es demasiado grande. Máximo permitido: 10MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const uploadPhoto = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    try {
      const updatedEntry = await apiService.uploadPhoto(entryId, file);
      onPhotoUploaded(updatedEntry.photoUrl || "");
      toast({
        title: "Éxito",
        description: "Foto subida correctamente",
      });
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al subir la foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
    // Limpiar el input para permitir seleccionar el mismo archivo otra vez
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCapturedPhotoUpload = () => {
    if (!capturedPhoto) return;

    // Convertir data URL a File
    fetch(capturedPhoto)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `photo-${entryId}-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        uploadPhoto(file);
      })
      .catch((error) => {
        console.error("Error converting photo:", error);
        toast({
          title: "Error",
          description: "No se pudo procesar la foto",
          variant: "destructive",
        });
      });
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    setCameraError(null);
    onClose();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // Efecto para iniciar/detener la cámara cuando se abre/cierra el diálogo
  useEffect(() => {
    if (isOpen && isCameraSupported) {
      // Pequeño retraso para asegurar que el diálogo esté completamente abierto
      const timer = setTimeout(() => {
        startCamera();
      }, 100);

      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, isCameraSupported]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Camera className="h-5 w-5" />
            Subir Foto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full h-24 flex-col gap-2"
              disabled={isUploading}
            >
              <Upload className="h-8 w-8" />
              {isUploading ? "Subiendo..." : "Subir Archivo"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Formatos soportados: JPG, PNG, WEBP, GIF. Máximo 10MB.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full bg-transparent"
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}