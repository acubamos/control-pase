"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Upload, X, Check } from "lucide-react"
import { apiService } from "@/lib/api-services"
import { toast } from "@/hooks/use-toast"

interface PhotoCaptureProps {
  entryId: string
  onPhotoUploaded: (photoUrl: string) => void
  isOpen: boolean
  onClose: () => void
}

export function PhotoCapture({ entryId, onPhotoUploaded, isOpen, onClose }: PhotoCaptureProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedPhoto(photoDataUrl)
    stopCamera()
  }

  const uploadPhoto = async (file: File) => {
    setIsUploading(true)
    try {
      const updatedEntry = await apiService.uploadPhoto(entryId, file)
      onPhotoUploaded(updatedEntry.photoUrl || "")
      toast({
        title: "Éxito",
        description: "Foto subida correctamente",
      })
      handleClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al subir la foto",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadPhoto(file)
    }
  }

  const handleCapturedPhotoUpload = () => {
    if (!capturedPhoto) return

    // Convertir data URL a File
    fetch(capturedPhoto)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `photo-${entryId}.jpg`, { type: "image/jpeg" })
        uploadPhoto(file)
      })
  }

  const handleClose = () => {
    stopCamera()
    setCapturedPhoto(null)
    onClose()
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
    startCamera()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Capturar Foto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {capturedPhoto ? (
            // Vista previa de la foto capturada
            <div className="space-y-4">
              <img
                src={capturedPhoto || "/placeholder.svg"}
                alt="Foto capturada"
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="flex gap-2">
                <Button onClick={handleCapturedPhotoUpload} disabled={isUploading} className="flex-1">
                  {isUploading ? (
                    "Subiendo..."
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Usar esta foto
                    </>
                  )}
                </Button>
                <Button onClick={retakePhoto} variant="outline">
                  Repetir
                </Button>
              </div>
            </div>
          ) : stream ? (
            // Vista de la cámara
            <div className="space-y-4">
              <div className="relative">
                <video ref={videoRef} className="w-full h-64 bg-black rounded-lg object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            // Opciones iniciales
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={startCamera} className="h-24 flex-col gap-2">
                  <Camera className="h-8 w-8" />
                  Tomar Foto
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  disabled={isUploading}
                >
                  <Upload className="h-8 w-8" />
                  {isUploading ? "Subiendo..." : "Subir Archivo"}
                </Button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
          )}

          <Button onClick={handleClose} variant="outline" className="w-full bg-transparent">
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
