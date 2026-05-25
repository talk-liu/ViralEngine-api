import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import * as http from 'http';
import * as https from 'https';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { buildCorsOptions } from './config/cors.config';
import { loadLocalHttpsOptions } from './config/https.config';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  const configService = app.get(ConfigService);
  app.enableCors(
    buildCorsOptions(
      configService.get<string>('nodeEnv') ?? 'development',
      configService.get<string>('cors.origins'),
    ),
  );

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  setupSwagger(app);
  await app.init();

  const logger = new Logger('Bootstrap');
  const port = configService.get<number>('port') ?? 3000;
  const httpsEnabled = configService.get<boolean>('https.enabled') ?? false;
  const httpsHost = configService.get<string>('https.host') ?? '127.0.0.1';
  const httpsPort = configService.get<number>('https.port') ?? 3443;
  const expressApp = app.getHttpAdapter().getInstance();

  http.createServer(expressApp).listen(port, () => {
    logger.log(`HTTP  API: http://localhost:${port}/api`);
  });

  if (httpsEnabled) {
    const httpsOptions = loadLocalHttpsOptions({
      enabled: true,
      host: httpsHost,
      port: httpsPort,
      callbackBaseUrl: configService.get<string>('https.callbackBaseUrl') ?? '',
      keyPath: configService.get<string>('https.keyPath') ?? 'certs/dev-key.pem',
      certPath: configService.get<string>('https.certPath') ?? 'certs/dev-cert.pem',
    });

    if (httpsOptions) {
      https
        .createServer(httpsOptions, expressApp)
        .listen(httpsPort, httpsHost, () => {
          logger.log(
            `HTTPS OAuth: https://${httpsHost}:${httpsPort}/api/oauth/{platform}/callback`,
          );
        });
    }
  }

  const douyinRedirect = configService.get<string>('oauth.douyin.redirectUri');
  if (douyinRedirect) {
    logger.log(`Douyin redirect URI: ${douyinRedirect}`);
  }
}

bootstrap();
