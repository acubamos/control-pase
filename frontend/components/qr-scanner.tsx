"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, X, Scan, CheckCircle } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-scanner"
import jsQR from "jsqr"

interface QRScannerProps {
  onScan: (data: QRData) => void
  isOpen: boolean
  onClose: () => void
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [scanStatus, setScanStatus] = useState<string>("Escaneando...")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const scanAttemptsRef = useRef(0)

  const startCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)
      setCameraReady(false)
      setScanStatus("Escaneando...")
      scanAttemptsRef.current = 0

      // Configuración para máxima calidad
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.playsInline = true
        videoRef.current.muted = true
        
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play()
            setCameraReady(true)
            startScanning()
          } catch (err) {
            console.error("Play error:", err)
          }
        }
      }

    } catch (err) {
      console.error("Camera error:", err)
      setError("No se pudo acceder a la cámara")
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setIsScanning(false)
    setCameraReady(false)
  }

  const captureHighQualityFrame = (): ImageData | null => {
    if (!videoRef.current || !captureCanvasRef.current) return null

    const video = videoRef.current
    const canvas = captureCanvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })

    if (!context) return null

    // Usar dimensiones reales del video para máxima calidad
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Dibujar el frame en alta calidad
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    return context.getImageData(0, 0, canvas.width, canvas.height)
  }

  const processQRCode = (imageData: ImageData) => {
    try {
      // Escanear con múltiples configuraciones
      const codes = [
        jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
          minConfidence: 0.1
        }),
        jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "invertFirst",
          minConfidence: 0.1
        }),
        jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
          minConfidence: 0.08
        })
      ].filter(Boolean)

      // Encontrar el código con mayor confianza
      const bestCode = codes.reduce((best, current) => {
        return current && current.confidence > (best?.confidence || 0) ? current : best
      }, null as any)

      return bestCode
    } catch (error) {
      console.error("Error processing QR:", error)
      return null
    }
  }

  const startScanning = () => {
    const scan = () => {
      if (!isScanning || !cameraReady) return

      scanAttemptsRef.current++

      // Capturar frame en alta calidad
      const imageData = captureHighQualityFrame()
      if (!imageData) {
        animationRef.current = requestAnimationFrame(scan)
        return
      }

      // Procesar QR cada 5 frames para mejor performance
      if (scanAttemptsRef.current % 5 === 0) {
        const code = processQRCode(imageData)
        
        if (code && code.confidence > 0.3) {
          console.log("QR detectado:", {
            data: code.data,
            confidence: code.confidence,
            attempts: scanAttemptsRef.current
          })

          // Capturar imagen del momento del escaneo
          captureAndProcessImage(code.data)
          return
        }
      }

      animationRef.current = requestAnimationFrame(scan)
    }

    animationRef.current = requestAnimationFrame(scan)
  }

  const captureAndProcessImage = (qrData: string) => {
    if (!captureCanvasRef.current) return

    // Capturar la imagen actual
    const canvas = captureCanvasRef.current
    const imageDataURL = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageDataURL)
    setScanStatus("¡QR detectado!")

    // Procesar los datos del QR
    try {
      const qrDataParsed = parseQRData(qrData)
      if (qrDataParsed) {
        setTimeout(() => {
          onScan(qrDataParsed)
          handleClose()
        }, 1000) // Dar tiempo para ver el feedback
      }
    } catch (error) {
      console.error("Error parsing QR data:", error)
      setScanStatus("Error al procesar QR")
      // Reanudar escaneo después de error
      setTimeout(() => {
        setCapturedImage(null)
        setScanStatus("Escaneando...")
        startScanning()
      }, 2000)
    }
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    onClose()
  }

  const handleRetry = () => {
    stopCamera()
    setTimeout(startCamera, 300)
  }

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 bg-black border-0 overflow-hidden">
        <div className="relative h-[70vh] max-h-[600px]">
          {/* Video de la cámara */}
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            playsInline 
            muted 
          />
          
          {/* Canvas ocultos para procesamiento */}
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={captureCanvasRef} className="hidden" />

          {/* Overlay de escaneo */}
          <div className="absolute inset-0 flex flex-col">
            {/* Header */}
            <div className="bg-black/80 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan className="h-6 w-6 text-green-400" />
                  <span className="font-semibold">Escaner QR</span>
                </div>
                <Button 
                  onClick={handleClose} 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Marco de escaneo */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                <div className="w-64 h-64 border-2 border-green-400 rounded-lg bg-transparent">
                  {/* Línea de escaneo */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 animate-pulse" />
                  
                  {/* Esquinas */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-black/80 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                {scanStatus === "¡QR detectado!" ? (
                  <CheckCircle className="h-5 w-5 animate-bounce" />
                ) : (
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                )}
                <span className="text-sm font-medium">{scanStatus}</span>
              </div>
              <p className="text-xs text-gray-300">
                Coloca el código QR dentro del marco
              </p>
            </div>
          </div>

          {/* Estado de captura exitosa */}
          {capturedImage && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
              <div className="text-center text-white p-6">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4 animate-bounce" />
                <p className="text-lg font-semibold mb-2">¡QR detectado!</p>
                <p className="text-sm text-gray-300">Procesando información...</p>
              </div>
            </div>
          )}

          {/* Indicador de carga */}
          {!cameraReady && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Iniciando cámara</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
              <div className="text-center text-white p-6">
                <Camera className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Error</p>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <Button onClick={handleRetry} className="bg-green-600 hover:bg-green-700">
                  Reintentar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
