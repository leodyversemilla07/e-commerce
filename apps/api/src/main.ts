import { NestFactory } from "@nestjs/core"
import { json, urlencoded } from "express"
import { AppModule } from "./app.module"
import { apiEnv } from './prisma'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  })

  app.enableCors({
    origin: apiEnv.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((s) => s.trim()),
    credentials: true,
  })

  app.use(
    json({
      verify: (req, _res, buffer) => {
        ;(req as { rawBody?: Buffer }).rawBody = Buffer.from(buffer)
      },
    })
  )
  app.use(urlencoded({ extended: true }))

  await app.listen(apiEnv.PORT)
}
bootstrap()
