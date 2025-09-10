import { Controller, Post, UseGuards, Get, Body } from "@nestjs/common";
import { AuthService } from "./auth.service"; // ← Quita 'type'
import { LoginDto } from "./dto/login.dto"; // ← Quita 'type'
import { CreateUserDto } from "./dto/create-user.dto"; // ← Quita 'type'
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { GetUser } from "./decorators/get-user.decorator";
import { User, UserRole } from "./entities/user.entity"; // ← Quita 'type'

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() loginDto: LoginDto) { // ← Agrega @Body()
    return this.authService.login(loginDto);
  }

  @Post("register")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.YEARLY_ADMIN)
  async register(@Body() createUserDto: CreateUserDto) { // ← Agrega @Body()
    return this.authService.createUser(createUserDto);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: User) {
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      permissions: user.getPermissions(),
    };
  }
}