import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNameAcquisitionRecordsTable1749600000000
  implements MigrationInterface
{
  name = 'CreateNameAcquisitionRecordsTable1749600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`name_acquisition_records\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`region\` varchar(128) NOT NULL DEFAULT '',
        \`url\` text NOT NULL,
        \`url_hash\` char(64) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_name_acquisition_records_user_created\` (\`user_id\`, \`created_at\`),
        UNIQUE INDEX \`UQ_name_acquisition_records_user_url_hash\` (\`user_id\`, \`url_hash\`),
        CONSTRAINT \`FK_name_acquisition_records_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `name_acquisition_records`');
  }
}
