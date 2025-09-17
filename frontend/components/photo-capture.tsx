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

interface PhotoUploadProps {
  entryId: string;
  onPhotoUploaded: (photoUrl: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function PhotoUpload({
  entryId,
  onPhotoUploaded,
  isOpen,
  onClose,
}: PhotoUploadProps) {
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Upload className="h-5 w-5" />
            Subir Foto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          {/* Botón para subir archivo */}
          <div className="text-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-8 text-lg"
              variant="outline"
            >
              <Upload className="h-6 w-6 mr-2" />
              {isUploading ? "Subiendo..." : "Seleccionar foto"}
            </Button>
          </div>

          {/* Información de formatos soportados */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-center">
            <p className="text-sm text-blue-800 font-medium mb-1">
              Formatos soportados
            </p>
            <p className="text-xs text-blue-600">JPG, JPEG, PNG, GIF</p>
            <p className="text-xs text-blue-600">Tamaño máximo: 10MB</p>
          </div>

          {/* Input de archivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment" // Esto abre la cámara en móviles
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Botón de cerrar */}
          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full"
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
