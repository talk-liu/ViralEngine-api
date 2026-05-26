import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMediaJobsTable1748246400000 implements MigrationInterface {
  name = 'CreateMediaJobsTable1748246400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`media_jobs\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`type\` varchar(32) NOT NULL,
        \`status\` varchar(16) NOT NULL DEFAULT 'pending',
        \`input_key\` varchar(512) NULL,
        \`output_key\` varchar(512) NULL,
        \`params\` json NULL,
        \`progress\` tinyint UNSIGNED NOT NULL DEFAULT 0,
        \`error_message\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`started_at\` datetime NULL,
        \`completed_at\` datetime NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_media_jobs_user_created\` (\`user_id\`, \`created_at\`),
        INDEX \`IDX_media_jobs_status_created\` (\`status\`, \`created_at\`),
        CONSTRAINT \`FK_media_jobs_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `media_jobs`');
  }
}
