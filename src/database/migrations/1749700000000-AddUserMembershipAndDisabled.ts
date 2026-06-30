import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserMembershipAndDisabled1749700000000
  implements MigrationInterface
{
  name = 'AddUserMembershipAndDisabled1749700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`membership_expires_at\` datetime NULL,
      ADD COLUMN \`is_disabled\` tinyint(1) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE \`users\`
      SET \`membership_expires_at\` = NULL
      WHERE \`is_admin\` = 1
    `);

    await queryRunner.query(`
      UPDATE \`users\`
      SET \`membership_expires_at\` = DATE_ADD(NOW(), INTERVAL 1 MONTH)
      WHERE \`is_admin\` = 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      DROP COLUMN \`membership_expires_at\`,
      DROP COLUMN \`is_disabled\`
    `);
  }
}
