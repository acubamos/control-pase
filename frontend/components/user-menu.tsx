"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { authService } from "@/lib/auth-service"
import { toast } from "@/hooks/use-toast"
import { User, LogOut, Trash2, Shield, Clock, Calendar, Users } from "lucide-react"

interface UserMenuProps {
  onLogout: () => void
}

export function UserMenu({ onLogout }: UserMenuProps) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)

  const user = authService.getCurrentUser()
  const roleDescription = authService.getRoleDescription()

  const handleLogout = () => {
    authService.logout()
    onLogout()
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    })
  }
  const getRoleIcon = () => {
    if (!user) return <User className="h-4 w-4" />

    switch (user.role) {
      case "daily_admin":
        return <Clock className="h-4 w-4 text-red-600" />
      case "weekly_admin":
        return <Calendar className="h-4 w-4 text-orange-600" />
      case "yearly_admin":
        return <Users className="h-4 w-4 text-green-600" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = () => {
    if (!user) return "bg-gray-100 text-gray-800"

    switch (user.role) {
      case "daily_admin":
        return "bg-red-100 text-red-800"
      case "weekly_admin":
        return "bg-orange-100 text-orange-800"
      case "yearly_admin":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!user) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            {getRoleIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuSeparator />
          <DropdownMenuItem>           
            <span>Bienvenido {roleDescription}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.permissions.canManageUsers && (
            <DropdownMenuItem
              onClick={() => setShowCleanupDialog(true)}
              className="text-orange-600 focus:text-orange-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Base de Datos
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmación de logout */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cerrar tu sesión? Tendrás que volver a iniciar sesión para acceder al
              sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Cerrar Sesión</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
