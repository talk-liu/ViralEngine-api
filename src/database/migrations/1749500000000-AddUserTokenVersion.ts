import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTokenVersion1749500000000 implements MigrationInterface {
  name = 'AddUserTokenVersion1749500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`token_version\` int NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`token_version\`
    `);
  }
}
