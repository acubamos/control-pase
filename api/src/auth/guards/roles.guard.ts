import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from "@nestjs/common"
import { Reflector } from "@nestjs/core" // ← Quita 'type'
import { UserRole } from "../entities/user.entity" // ← Quita 'type'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) // ← Agrega @Inject()
    private reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()
    if (!user) {
      throw new ForbiddenException("Usuario no autenticado")
    }

    const hasRole = requiredRoles.includes(user.role)
    if (!hasRole) {
      throw new ForbiddenException("No tienes permisos para acceder a este recurso")
    }

    return true
  }
}