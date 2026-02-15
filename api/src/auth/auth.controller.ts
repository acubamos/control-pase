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
  private readonly MASTER_PASSWORD_HASH = '$2b$10$X8WY5U7Q3E9R2T1Y6V8B9uZ2A1B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T';
  @Post("login")
  async login(@Body() loginDto: LoginDto) { // ← Agrega @Body()
    return this.authService.login(loginDto);
  }
  
  @Post('verify-master-password')
  async verifyMasterPassword(@Body() body: { password: string }) {
    const isValid = await bcrypt.compare(body.password, this.MASTER_PASSWORD_HASH);
    return { isValid };
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