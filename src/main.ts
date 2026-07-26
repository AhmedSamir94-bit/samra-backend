import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'x-admin-setup-key',
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  try {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Samra POS API')
      .setDescription('REST API for Easy POS Arabia / Samra backend')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the accessToken from POST /api/auth/login',
        },
        'access-token',
      )
      .addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-setup-key',
          description:
            'Optional setup key for creating admins when users already exist',
        },
        'admin-setup-key',
      )
      .addServer('https://samra-backend.vercel.app', 'Production')
      .addServer('http://localhost:3000', 'Local')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      customCssUrl:
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css',
      customJs: [
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js',
        'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js',
      ],
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  } catch (error) {
    console.error(
      'Swagger setup failed (API still runs):',
      error instanceof Error ? error.message : error,
    );
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Samra backend running on port ${port}`);
  console.log(`Swagger docs at /api/docs`);
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
