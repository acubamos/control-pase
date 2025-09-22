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
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @Inject(JwtService)
    private readonly jwtService: JwtService
  ) {}

  async onModuleInit() {
    await this.createDefaultUsers();
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
        fullName: "AZUMAT",
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
}