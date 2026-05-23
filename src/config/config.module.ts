import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import configuration from './configuration';
import { EnvironmentVariables } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (config: Record<string, unknown>) => {
        const validated = plainToInstance(EnvironmentVariables, config, {
          enableImplicitConversion: true,
        });

        const errors = validateSync(validated, {
          skipMissingProperties: false,
        });

        if (errors.length > 0) {
          throw new Error(errors.toString());
        }

        return validated;
      },
    }),
  ],
})
export class AppConfigModule {}
