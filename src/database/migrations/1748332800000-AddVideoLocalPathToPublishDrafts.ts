import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoLocalPathToPublishDrafts1748332800000
  implements MigrationInterface
{
  name = 'AddVideoLocalPathToPublishDrafts1748332800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`publish_drafts\`
      ADD COLUMN \`video_local_path\` text NULL
      AFTER \`video_asset_id\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`publish_drafts\`
      DROP COLUMN \`video_local_path\`
    `);
  }
}
