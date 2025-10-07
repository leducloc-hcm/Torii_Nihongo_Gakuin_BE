import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { patchNestJsSwagger } from 'nestjs-zod'
import helmet from 'helmet'
import { NestExpressApplication } from '@nestjs/platform-express'
import { WebsocketAdapter } from 'src/websockets/websockets.adapter'
// import { Logger } from 'nestjs-pino/Logger'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })
  // app.useLogger(app.get(Logger))
  app.set('trust proxy', true) // Trust proxy headers
  app.enableCors()

  // Configure Helmet with CSP settings that allow Swagger UI to work
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  )
  app.useWebSocketAdapter(new WebsocketAdapter(app))
  patchNestJsSwagger()
  const config = new DocumentBuilder()
    .setTitle('Torii Nihongo Gakuin API')
    .setDescription('The API for the Torii Nihongo Gakuin application')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      {
        name: 'authorization',
        type: 'apiKey',
      },
      'payment-api-key',
    )
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
  await app.listen(process.env.PORT ?? 4000)
}

void bootstrap()
