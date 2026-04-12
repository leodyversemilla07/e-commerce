import { NestFactory } from "@nestjs/core"
import { json, urlencoded } from "express"
import { AppModule } from "./app.module"

const apiBaseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:4000"
const apiURL = new URL(apiBaseURL)
const defaultTrustedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  `${apiURL.protocol}//${apiURL.hostname}:3000`,
]

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  })

  app.enableCors({
    origin:
      process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((s) => s.trim()) ??
      defaultTrustedOrigins,
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

  await app.listen(process.env.PORT ?? 4000)
}
bootstrap()
