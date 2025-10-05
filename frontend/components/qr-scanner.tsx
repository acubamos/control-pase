"use client"

import { useEffect, useRef, useState } from "react"
import jsQR from "jsqr"
import { X } from "lucide-react"
import { parseQRData, type QRData } from "@/lib/qr-acanner"
import { Button } from "@/components/ui/button"

export default function QRScannerCarnet() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<QRData | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let scanInterval: NodeJS.Timeout

    async function startCamera() {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" }, // usa cámara trasera en móvil
          },
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()

          scanInterval = setInterval(scanFrame, 80) // escaneo rápido (~12fps)
        }
      } catch (err) {
        console.error("Error al activar la cámara:", err)
      }
    }

    function stopCamera() {
      if (scanInterval) clearInterval(scanInterval)
      if (stream) stream.getTracks().forEach((track) => track.stop())
    }

    function scanFrame() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code?.data) {
        const parsed = parseQRData(code.data)
        if (parsed) {
          setResult(parsed)
          setIsScanning(false)
          stopCamera()
        }
      }
    }

    if (isScanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [isScanning])

  return (
    <>
      {/* Botón principal */}
      <Button
        onClick={() => {
          setResult(null)
          setIsScanning(true)
        }}
      >
        Escanear carnet
      </Button>

      {/* Resultado escaneado */}
      {result && (
        <div className="mt-4 p-4 bg-white border rounded-lg shadow-md max-w-sm">
          <h3 className="text-lg font-semibold mb-2">✅ Datos detectados</h3>
          <p><strong>Nombre:</strong> {result.nombre}</p>
          <p><strong>Apellidos:</strong> {result.apellidos}</p>
          <p><strong>CI:</strong> {result.ci}</p>
        </div>
      )}

      {/* Overlay estilo WhatsApp/Eventbrite */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          {/* Botón cerrar */}
          <button
            onClick={() => setIsScanning(false)}
            className="absolute top-5 right-5 bg-white rounded-full p-2 shadow-lg"
          >
            <X size={24} />
          </button>

          {/* Video a pantalla completa */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover absolute inset-0"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Área de escaneo central */}
          <div className="absolute w-72 h-72 border-4 border-green-500 rounded-xl animate-pulse scanner-frame" />
          <p className="absolute bottom-10 text-white text-center text-sm opacity-80">
            Alinea el código QR del carnet dentro del recuadro
          </p>
        </div>
      )}
    </>
  )
}
