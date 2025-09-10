"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, LogIn } from "lucide-react"
import { authService } from "@/lib/auth-service"

interface LoginFormProps {
  onLoginSuccess: () => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await authService.login(username, password)

      if (result.success) {
        onLoginSuccess()
      } else {
        setError(result.error || "Error de autenticación")
      }
    } catch (error) {
      setError("Error de conexión")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeedUsers = async () => {
    setIsLoading(true)
    setError("")

    try {
      await authService.seedDefaultUsers()
      setError("")
      alert(
        "Usuarios por defecto creados:\n\n" +
          "Administrador Diario: daily_admin / password123\n" +
          "Administrador Semanal: weekly_admin / password123\n" +
          "Administrador Anual: yearly_admin / password123",
      )
    } catch (error) {
      setError("Error al crear usuarios por defecto")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
          <CardDescription>Sistema de Gestión de Entradas de Vehículos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Ingresa tu contraseña"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>

          {/* <div className="mt-6 pt-6 border-t">
            <Button onClick={handleSeedUsers} variant="outline" className="w-full bg-transparent" disabled={isLoading}>
              Crear Usuarios por Defecto
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Solo usar en desarrollo para crear usuarios de prueba
            </p>
          </div> */}
        </CardContent>
      </Card>
    </div>
  )
}
