"use client"

import { useState, useEffect } from "react"
import { apiService, type VehicleEntry, type CreateVehicleEntry, type UpdateVehicleEntry } from "@/lib/api-services"
import { toast } from "@/hooks/use-toast"

export function useVehicleEntries() {
  const [entries, setEntries] = useState<VehicleEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEntries = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiService.getEntries()
      setEntries(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar las entradas"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createEntry = async (entry: CreateVehicleEntry): Promise<VehicleEntry | null> => {
    try {
      const newEntry = await apiService.createEntry(entry)
      setEntries((prev) => [newEntry, ...prev])
      toast({
        title: "Éxito",
        description: "Entrada creada correctamente",
      })
      return newEntry
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear la entrada"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return null
    }
  }

  const updateEntry = async (id: string, entry: UpdateVehicleEntry): Promise<VehicleEntry | null> => {
    try {
      const updatedEntry = await apiService.updateEntry(id, entry)
      setEntries((prev) => prev.map((e) => (e.id === id ? updatedEntry : e)))
      toast({
        title: "Éxito",
        description: "Entrada actualizada correctamente",
      })
      return updatedEntry
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar la entrada"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return null
    }
  }
  const uploadPhoto = async (entryId: string, file: File): Promise<boolean> => {
    try {
      const updatedEntry = await apiService.uploadPhoto(entryId, file)
      setEntries((prev) => prev.map((e) => (e.id === entryId ? updatedEntry : e)))
      toast({
        title: "Éxito",
        description: "Foto subida correctamente",
      })
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al subir la foto"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  return {
    entries,
    isLoading,
    error,
    loadEntries,
    createEntry,
    updateEntry,
    uploadPhoto,
  }
}
