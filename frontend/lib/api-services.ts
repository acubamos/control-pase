import { authService } from "./auth-service"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://apicp.acubamos.cu/api"

export interface VehicleEntry {
  id: string
  nombre: string
  apellidos: string
  ci: string
  tipoVehiculo: string[]
  chapa: string
  fechaEntrada: string
  lugarDestino: { [lugar: string]: string[] }
  fechaSalida?: string | null
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CreateVehicleEntry {
  nombre: string
  apellidos: string
  ci: string
  tipoVehiculo: string[]
  chapa: string
  fechaEntrada: string
  lugarDestino: { [lugar: string]: string[] }
  fechaSalida?: string | null
  photoUrl?: string
}

export interface UpdateVehicleEntry {
  nombre?: string
  apellidos?: string
  ci?: string
  tipoVehiculo?: string[]
  chapa?: string
  fechaEntrada?: string
  lugarDestino?: { [lugar: string]: string[] }
  fechaSalida?: string | null
  photoUrl?: string
}

class ApiService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, expectJson: boolean = true): Promise<T> {
    const token = authService.getToken()

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

    if (response.status === 401) {
      authService.logout()
      throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.")
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    if (response.status === 204) {
      return {} as T
    }
    // Si no se espera JSON o la respuesta está vacía, retornar void
    if (!expectJson || response.status === 204) {
      return undefined as T;
    }

    return await response.json()
  }

  // Entradas de vehículos - Rutas basadas en entries.controller.ts
  async getEntries(): Promise<VehicleEntry[]> {
    return this.makeRequest<VehicleEntry[]>("/entries")
  }

  async createEntry(entry: CreateVehicleEntry): Promise<VehicleEntry> {
    // Asegurar que fechaSalida sea null si está vacío
    const entryData = {
      ...entry,
      fechaSalida: entry.fechaSalida || null
    };
    
    return this.makeRequest<VehicleEntry>("/entries", {
      method: "POST",
      body: JSON.stringify(entryData),
    })
  }

  async updateEntry(id: string, entry: UpdateVehicleEntry): Promise<VehicleEntry> {
    // Asegurar que fechaSalida sea null si está vacío
    const entryData = {
      ...entry,
      fechaSalida: entry.fechaSalida || null
    };
    
    return this.makeRequest<VehicleEntry>(`/entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(entryData),
    })
  }

  async deleteEntry(id: string): Promise<void> {
    return this.makeRequest<void>(`/entries/${id}`, {
      method: "DELETE",
    }, false) // Agrega un parámetro para indicar que no espera JSON
  }

  async deleteMultipleEntries(ids: string[]): Promise<{ deletedCount: number; message: string }> {
    return this.makeRequest<{ deletedCount: number; message: string }>("/entries", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    })
  }

  async uploadPhoto(entryId: string, file: File): Promise<VehicleEntry> {
    const token = authService.getToken()
    const formData = new FormData()
    formData.append("photo", file)

    const response = await fetch(`${API_BASE_URL}/entries/${entryId}/photo`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Error al subir la foto")
    }

    return await response.json()
  }

  async getPhoto(photoUrL: string): Promise<Blob> {
    const response = await fetch(`https://apicp.acubamos.cu${photoUrL}`, {
      method: "GET",
      credentials: "include",
    })
  
    if (!response.ok) {
      throw new Error("No se pudo obtener la foto")
    }
  
    return await response.blob()
  }  
  
  // Limpieza manual
  async manualCleanup(): Promise<{ success: boolean; deletedCount: number; message: string }> {
    return this.makeRequest<{ success: boolean; deletedCount: number; message: string }>("/entries/cleanup", {
      method: "POST",
    })
  }
}

export const apiService = new ApiService()


