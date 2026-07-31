const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe } = require('@nestjs/common');
const express = require('express');
const { getCorsOptions, applyCorsHeaders } = require('../src/common/cors.config');

let cached;

async function bootstrap() {
  if (cached) return cached;

  // Prefer compiled Nest app from `npm run build` (vercel-build).
  let AppModule;
  try {
    AppModule = require('../dist/app.module').AppModule;
  } catch {
    AppModule = require('../src/app.module').AppModule;
  }

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] },
  );

  app.setGlobalPrefix('api');
  app.enableCors(getCorsOptions());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  try {
    const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Samra POS API')
      .setDescription('REST API for Easy POS Arabia / Samra backend')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('https://samra-backend.vercel.app', 'Production')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  } catch (err) {
    console.error('Swagger skipped:', err && err.message ? err.message : err);
  }

  await app.init();
  cached = expressApp;
  return cached;
}

module.exports = async (req, res) => {
  // Answer preflight immediately so cold starts never fail CORS.
  applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const server = await bootstrap();
    return server(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('api/index bootstrap failed:', message);
    applyCorsHeaders(req, res);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        statusCode: 500,
        message,
        hint: 'Check Vercel logs. Ensure MONGODB_URI and JWT secrets are set, then Redeploy.',
      }),
    );
  }
};
