import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Configurar CORS
  app.enableCors({
    origin: [
      "http://localhost:3000", 
      "http://localhost:3001",
      "https://siscop.acubamos.cu",
      "https://apicp.acubamos.cu"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })

  // Configurar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Configurar prefijo global para la API
  app.setGlobalPrefix("api")

  const port = process.env.PORT || 3001
  await app.listen(port, '0.0.0.0')
  console.log(`Aplicación ejecutándose en: http://0.0.0.0:${port}`)
}

bootstrap()
