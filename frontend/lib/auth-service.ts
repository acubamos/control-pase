import { API_CONFIG } from "./api-config";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  permissions: {
    canViewHistory: boolean;
    canCreateEntries: boolean;
    canEditEntries: boolean;
    canViewStatistics: boolean;
    canViewEntries: boolean;
  };
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  isMasterLogin?: boolean;
  daysRemaining?: number;
}

class AuthService {
  private readonly TOKEN_KEY = "auth_token";
  private readonly USER_KEY = "auth_user";
  private readonly EXPIRY_KEY = "auth_expiry_date";
  private readonly EXPIRY_DAYS = 365; 
  private readonly MASTER_PASSWORD_HASH = "$2b$10$X8WY5U7Q3E9R2T1Y6V8B9uZ2A1B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T";

  constructor() {
    this.initializeExpiryDate();
  }

  private initializeExpiryDate(): void {
    if (typeof window === "undefined") return;

    const existingDate = localStorage.getItem(this.EXPIRY_KEY);
    if (!existingDate) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + this.EXPIRY_DAYS);
      localStorage.setItem(this.EXPIRY_KEY, expiryDate.toISOString());
    }
  }

  private isExpired(): boolean {
    if (typeof window === "undefined") return false;

    const expiryDateStr = localStorage.getItem(this.EXPIRY_KEY);
    if (!expiryDateStr) return false;

    try {
      const expiryDate = new Date(expiryDateStr);
      const now = new Date();
      return now >= expiryDate;
    } catch {
      return false;
    }
  }

  private async verifyMasterPassword(password: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/verify-master-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.isValid;
      }
      return false;
    } catch (error) {
      console.error("Error verificando contraseña maestra:", error);
      return false;
    }
  }

  private resetExpiry(): void {
    if (typeof window === "undefined") return;

    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + this.EXPIRY_DAYS);
    localStorage.setItem(this.EXPIRY_KEY, newExpiryDate.toISOString());
  }

  private getDaysRemaining(): number {
    if (typeof window === "undefined") return this.EXPIRY_DAYS;

    const expiryDateStr = localStorage.getItem(this.EXPIRY_KEY);
    if (!expiryDateStr) return this.EXPIRY_DAYS;

    try {
      const expiryDate = new Date(expiryDateStr);
      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return this.EXPIRY_DAYS;
    }
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    try {
     
      const isExpired = this.isExpired();
      
     
      if (isExpired) {
       
        const isMasterPassword = await this.verifyMasterPassword(password);
        
        if (isMasterPassword) {
          
          const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            return {
              success: false,
              error: "Error de autenticación con credenciales maestras",
            };
          }

          const data = await response.json();

          if (data.access_token && data.user) {
            localStorage.setItem(this.TOKEN_KEY, data.access_token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));

           
            this.resetExpiry();

            const daysRemaining = this.getDaysRemaining();

            return {
              success: true,
              user: data.user,
              token: data.access_token,
              isMasterLogin: true,
              daysRemaining: daysRemaining,
            };
          }
        } else {
          
          return {
            success: false,
            error: "Usuario bloqueado, ponga la contraseña maestra o llamar AL CREADOR DE ESTE SISTEMA",
          };
        }
      }
     
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || "Error de autenticación",
        };
      }

      const data = await response.json();

      if (data.access_token && data.user) {
        localStorage.setItem(this.TOKEN_KEY, data.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));

        const daysRemaining = this.getDaysRemaining();

        return {
          success: true,
          user: data.user,
          token: data.access_token,
          isMasterLogin: false,
          daysRemaining: daysRemaining,
        };
      }

      return {
        success: false,
        error: "Respuesta inválida del servidor",
      };
    } catch (error) {
      return {
        success: false,
        error: "Error de conexión",
      };
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null && this.getCurrentUser() !== null;
  }

  getRoleDescription(): string {
    const user = this.getCurrentUser();
    if (!user) return "";

    switch (user.role) {
      case "admin_diario":
        return "Administrador Diario"
      case "admin_semanal":
        return "Administrador Semanal"
      case "admin_anual":
        return "Demo"
      default:
        return "Usuario";
    }
  }

 
  getExpiryInfo() {
    return {
      isExpired: this.isExpired(),
      daysRemaining: this.getDaysRemaining(),
      expiryDate: this.getExpiryDate(),
    };
  }

  private getExpiryDate(): Date | null {
    if (typeof window === "undefined") return null;

    const expiryDateStr = localStorage.getItem(this.EXPIRY_KEY);
    if (!expiryDateStr) return null;

    try {
      return new Date(expiryDateStr);
    } catch {
      return null;
    }
  }

  
  checkExpiryStatus(): { isExpired: boolean; daysRemaining: number; shouldWarn: boolean } {
    const daysRemaining = this.getDaysRemaining();
    return {
      isExpired: this.isExpired(),
      daysRemaining: daysRemaining,
      shouldWarn: daysRemaining <= 30,
    };
  }
}

export const authService = new AuthService()

