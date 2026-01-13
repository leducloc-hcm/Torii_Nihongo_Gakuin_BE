import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { patchNestJsSwagger } from "nestjs-zod";
import helmet from "helmet";
import { NestExpressApplication } from "@nestjs/platform-express";
import { WebsocketAdapter } from "./websockets/websockets.adapter";

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
    })
  );
  app.useWebSocketAdapter(new WebsocketAdapter(app));

  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .setTitle("Torii Learning Service API")
    .setDescription("Learning Service API for Torii Nihongo Gakuin")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 4001);
  console.log(`Learning Service is running on: ${await app.getUrl()}`);
}

void bootstrap();
