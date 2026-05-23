import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const enabled = configService.get<boolean>('swagger.enabled');
  const path = configService.get<string>('swagger.path') ?? 'docs';

  if (!enabled) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('ViralEngine API')
    .setDescription('ViralEngine 后端接口文档')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '输入 JWT Token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup(path, app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: `${path}-json`,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });
}
