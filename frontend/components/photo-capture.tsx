"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5" />
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