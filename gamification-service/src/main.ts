import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { patchNestJsSwagger } from "nestjs-zod";
import helmet from "helmet";
import { NestExpressApplication } from "@nestjs/platform-express";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.set("trust proxy", true);
  app.enableCors();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, "data:", "validator.swagger.io"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .setTitle("Torii Gamification Service API")
    .setDescription("Gamification Service API for Torii Nihongo Gakuin")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  if (!document.info) {
    document.info = config.info;
  }

  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 4003);
  console.log(`Gamification Service is running on: ${await app.getUrl()}`);
}

void bootstrap();
