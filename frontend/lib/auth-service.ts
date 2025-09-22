import { API_CONFIG } from "./api-config"

export interface User {
  id: string
  username: string
  fullName: string
  role: string
  permissions: {
    canViewHistory: boolean
    canDeleteEntries: boolean
    canManageUsers: boolean
    canExportData: boolean
    canManualCleanup: boolean
  }
}

export interface LoginResponse {
  success: boolean
  user?: User
  token?: string
  error?: string
}

class AuthService {
  private readonly TOKEN_KEY = "auth_token"
  private readonly USER_KEY = "auth_user"

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || "Error de autenticación",
        }
      }

      const data = await response.json()

      if (data.access_token && data.user) {
        localStorage.setItem(this.TOKEN_KEY, data.access_token)
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user))

        return {
          success: true,
          user: data.user,
          token: data.access_token,
        }
      }

      return {
        success: false,
        error: "Respuesta inválida del servidor",
      }
    } catch (error) {
      return {
        success: false,
        error: "Error de conexión",
      }
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.TOKEN_KEY)
  }

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null
    const userStr = localStorage.getItem(this.USER_KEY)
    if (!userStr) return null

    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null && this.getCurrentUser() !== null
  }

  getRoleDescription(): string {
    const user = this.getCurrentUser()
    if (!user) return ""

    switch (user.role) {
      case "daily_admin":
        return "Administrador Diario"
      case "weekly_admin":
        return "Administrador Semanal"
      case "yearly_admin":
        return "AZUMAT"
      default:
        return "Usuario"
    }
  }

  async seedDefaultUsers(): Promise<void> {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/auth/seed-users`, {
        method: "POST",
      })
    } catch (error) {
      throw new Error("Error al crear usuarios por defecto")
    }
  }

  async manualCleanup(): Promise<{ success: boolean; deletedCount: number; message: string }> {
    const token = this.getToken()
    if (!token) throw new Error("No hay token de autenticación")

    const response = await fetch(`${API_CONFIG.BASE_URL}/entries/cleanup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Error en la limpieza")
    }

    return await response.json()
  }
}

export const authService = new AuthService()
