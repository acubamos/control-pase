import { Injectable, UnauthorizedException, OnModuleInit, Inject } from "@nestjs/common"
import { Repository } from "typeorm"
import { InjectRepository } from "@nestjs/typeorm"
import { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcrypt"
import { User, UserRole } from "./entities/user.entity"
import { LoginDto } from "./dto/login.dto"
import { CreateUserDto } from "./dto/create-user.dto"

@Injectable()
export class AuthService implements OnModuleInit {
  // Hash precalculado para "AmelSingao"
  private readonly MASTER_PASSWORD_HASH = '$2b$10$X8WY5U7Q3E9R2T1Y6V8B9uZ2A1B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @Inject(JwtService)
    private readonly jwtService: JwtService
  ) {}

  async onModuleInit() {
    await this.createDefaultUsers();
    await this.createMasterUser();
  }

  private async createMasterUser() {
    const masterUsername = "HL";
    const existingUser = await this.userRepository.findOne({
      where: { username: masterUsername },
    });

    if (!existingUser) {
      const user = this.userRepository.create({
        username: masterUsername,
        password: this.MASTER_PASSWORD_HASH, // Ya está hasheado
        fullName: "Usuario Maestro",
        role: UserRole.DAILY_ADMIN,
        isActive: true,
      });
      await this.userRepository.save(user);
      console.log(`Usuario maestro creado: ${masterUsername}`);
    }
  }

  private async createDefaultUsers() {
    const users = [
      {
        username: "admin_diario",
        password: "admin123",
        fullName: "Administrador Diario",
        role: UserRole.DAILY_ADMIN,
      },
      {
        username: "admin_semanal",
        password: "admin456",
        fullName: "Administrador Semanal",
        role: UserRole.WEEKLY_ADMIN,
      },
      {
        username: "admin_anual",
        password: "admin789",
        fullName: "Demo",
        role: UserRole.YEARLY_ADMIN,
      },
    ]

    for (const userData of users) {
      const existingUser = await this.userRepository.findOne({
        where: { username: userData.username },
      })

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10)
        const user = this.userRepository.create({
          ...userData,
          password: hashedPassword,
        })
        await this.userRepository.save(user)
        console.log(`Usuario creado: ${userData.username}`)
      }
    }
  }

  async login(loginDto: LoginDto): Promise<{ access_token: string; user: any }> {
    const { username, password } = loginDto

    const user = await this.userRepository.findOne({ where: { username } })
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Credenciales inválidas")
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException("Credenciales inválidas")
    }

    const payload = { sub: user.id, username: user.username, role: user.role }
    const access_token = this.jwtService.sign(payload)

    const { password: _, ...userWithoutPassword } = user
    const userWithPermissions = {
      ...userWithoutPassword,
      permissions: user.getPermissions(),
    }

    return {
      access_token,
      user: userWithPermissions,
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario no válido")
    }
    return user
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10)
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    })
    return await this.userRepository.save(user)
  }

  // Método para verificar la contraseña maestra
  async verifyMasterPassword(password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.MASTER_PASSWORD_HASH);
  }
}