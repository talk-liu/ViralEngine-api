import 'dotenv/config';
import { DataSource } from 'typeorm';

const isCompiled = __filename.endsWith('.js');

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: isCompiled
    ? ['dist/**/*.entity.js']
    : ['src/**/*.entity.ts'],
  migrations: isCompiled
    ? ['dist/database/migrations/*.js']
    : ['src/database/migrations/*.ts'],
  synchronize: false,
});
