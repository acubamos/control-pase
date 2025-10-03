"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X, Upload, Scan } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-scanner"
import jsQR from "jsqr"

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

// Configuración ajustable
const SCAN_INTERVAL = 150
const SCAN_QUALITY = 0.7
const MIN_QR_SIZE = 150

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera")
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastScanTimeRef = useRef<number>(0)
  const scanAttemptsRef = useRef<number>(0)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setDetected(false)
      scanAttemptsRef.current = 0

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1024 },
          height: { ideal: 768 },
          frameRate: { ideal: 20 }
        },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(scanLoop)
      }, 500)
    } catch (err) {
      console.error("Error accessing camera:", err)
      setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.")
      setIsScanning(false)
    }
  }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setDetected(false)
  }, [])

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || detected) return

    const now = Date.now()
    if (now - lastScanTimeRef.current < SCAN_INTERVAL) return

    lastScanTimeRef.current = now
    scanAttemptsRef.current++

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    const scale = SCAN_QUALITY
    canvas.width = video.videoWidth * scale
    canvas.height = video.videoHeight * scale

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
      maxResolution: 800,
    })

    if (code) {
      const qrSize = Math.max(
        code.location.topRightCorner.x - code.location.topLeftCorner.x,
        code.location.bottomRightCorner.y - code.location.topRightCorner.y
      )
      
      if (qrSize >= MIN_QR_SIZE * scale) {
        const qrData = parseQRData(code.data)
        if (qrData) {
          setDetected(true)
          console.log(`QR detectado en el intento: ${scanAttemptsRef.current}`)
          
          setTimeout(() => {
            onScan(qrData)
            handleClose()
          }, 300)
        }
      }
    }
  }, [detected, onScan])

  const scanLoop = useCallback(() => {
    scanFrame()
    if (!detected) {
      animationFrameRef.current = requestAnimationFrame(scanLoop)
    }
  }, [scanFrame, detected])

  // Función para procesar imagen subida
  const processImage = useCallback((image: HTMLImageElement) => {
    setIsProcessingImage(true)
    setError(null)

    try {
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      
      if (!context) {
        throw new Error("No se pudo obtener el contexto del canvas")
      }

      // Usar tamaño original de la imagen para máxima calidad
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      
      // Intentar múltiples estrategias de detección
      const scanStrategies = [
        { inversionAttempts: "attemptBoth" as const },
        { inversionAttempts: "dontInvert" as const },
        { inversionAttempts: "invertFirst" as const }
      ]

      let code = null
      for (const strategy of scanStrategies) {
        code = jsQR(imageData.data, imageData.width, imageData.height, {
          ...strategy,
          maxResolution: Math.max(imageData.width, imageData.height),
        })
        
        if (code) break
      }

      if (code) {
        const qrData = parseQRData(code.data)
        if (qrData) {
          setDetected(true)
          console.log("QR detectado en imagen subida")
          
          setTimeout(() => {
            onScan(qrData)
            handleClose()
          }, 500)
        } else {
          setError("QR detectado pero no se pudo procesar. Asegúrate de que sea un código válido.")
        }
      } else {
        setError("No se pudo detectar ningún código QR en la imagen. Intenta con otra foto.")
      }
    } catch (err) {
      console.error("Error processing image:", err)
      setError("Error al procesar la imagen. Intenta con otra foto.")
    } finally {
      setIsProcessingImage(false)
    }
  }, [onScan])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError("Por favor sube solo archivos de imagen")
      return
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen es demasiado grande. Máximo 10MB.")
      return
    }

    const reader = new FileReader()
    
    reader.onload = (e) => {
      const result = e.target?.result as string
      setSelectedImage(result)
      
      const img = new Image()
      img.onload = () => processImage(img)
      img.onerror = () => setError("Error al cargar la imagen")
      img.src = result
    }
    
    reader.onerror = () => setError("Error al leer el archivo")
    reader.readAsDataURL(file)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleTabChange = (tab: "camera" | "upload") => {
    setActiveTab(tab)
    setError(null)
    setSelectedImage(null)
    
    if (tab === "camera") {
      stopCamera()
      setTimeout(() => {
        startCamera()
      }, 100)
    } else {
      stopCamera()
    }
  }

  const handleClose = useCallback(() => {
    stopCamera()
    setSelectedImage(null)
    setActiveTab("camera")
    onClose()
  }, [stopCamera, onClose])

  // Efecto para manejar apertura/cierre
  useEffect(() => {
    if (isOpen) {
      if (activeTab === "camera") {
        startCamera()
      }
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen, activeTab])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Escanear Código QR
            {isScanning && !detected && activeTab === "camera" && (
              <span className="text-sm font-normal text-muted-foreground">
                ({scanAttemptsRef.current} intentos)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Selector de modo */}
        <div className="flex border rounded-lg p-1 bg-muted/50">
          <Button
            variant={activeTab === "camera" ? "default" : "ghost"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => handleTabChange("camera")}
          >
            <Camera className="h-4 w-4" />
            Cámara
          </Button>
          <Button
            variant={activeTab === "upload" ? "default" : "ghost"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => handleTabChange("upload")}
          >
            <Upload className="h-4 w-4" />
            Subir Foto
          </Button>
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4">{error}</p>
              {activeTab === "camera" ? (
                <Button onClick={startCamera} variant="outline">
                  Intentar de nuevo
                </Button>
              ) : (
                <Button onClick={triggerFileInput} variant="outline">
                  Elegir otra imagen
                </Button>
              )}
            </div>
          ) : activeTab === "camera" ? (
            // Vista de cámara
            <div className="relative">
              <video 
                ref={videoRef} 
                className="w-full h-64 sm:h-80 bg-black rounded-lg object-cover" 
                playsInline 
                muted 
              />
              <canvas ref={canvasRef} className="hidden" />

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`border-2 w-48 h-48 rounded-lg transition-all duration-300 ${
                      detected
                        ? "border-green-500 bg-green-500/20 scale-110"
                        : "border-green-500 border-dashed animate-pulse"
                    }`}
                  />
                </div>
              )}

              {detected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-white text-center">
                    <div className="animate-bounce mb-2">✅</div>
                    <p className="font-semibold">¡QR Detectado!</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Vista de subir imagen
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              
              {selectedImage ? (
                <div className="relative">
                  <img 
                    src={selectedImage} 
                    alt="Imagen seleccionada"
                    className="w-full h-64 sm:h-80 object-contain bg-black rounded-lg"
                  />
                  {isProcessingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <div className="text-white text-center">
                        <div className="animate-spin mb-2">⏳</div>
                        <p className="font-semibold">Procesando imagen...</p>
                      </div>
                    </div>
                  )}
                  {detected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <div className="text-white text-center">
                        <div className="animate-bounce mb-2">✅</div>
                        <p className="font-semibold">¡QR Detectado!</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={triggerFileInput}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Haz clic para subir una imagen</p>
                  <p className="text-sm text-gray-500">JPG, PNG, WebP (Máx. 10MB)</p>
                </div>
              )}
              
              {!selectedImage && (
                <Button 
                  onClick={triggerFileInput}
                  variant="outline" 
                  className="w-full gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar Imagen
                </Button>
              )}
            </div>
          )}          
          
          <div className="text-center space-y-2">
            {activeTab === "camera" ? (
              <>
                <p className="text-sm text-gray-600">
                  Apunta la cámara hacia el código QR. Asegúrate de tener buena iluminación.
                </p>
                {isScanning && !detected && (
                  <p className="text-xs text-orange-600">
                    Escaneando... Acerca o aleja la cámara si no detecta
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Sube una foto que contenga el código QR. Asegúrate de que esté nítido y bien iluminado.
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <Button onClick={handleClose} variant="outline" className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
