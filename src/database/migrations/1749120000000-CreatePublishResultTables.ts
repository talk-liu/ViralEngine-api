import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePublishResultTables1749120000000
  implements MigrationInterface
{
  name = 'CreatePublishResultTables1749120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`publish_batches\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`client_batch_id\` varchar(36) NULL,
        \`publish_session_key\` bigint NULL,
        \`draft_id\` varchar(36) NULL,
        \`status\` varchar(16) NOT NULL,
        \`platform_scope\` varchar(32) NOT NULL,
        \`publish_method\` varchar(64) NOT NULL,
        \`video_count\` int NOT NULL,
        \`task_count\` int NOT NULL,
        \`success_count\` int NOT NULL,
        \`failure_count\` int NOT NULL,
        \`skipped_non_douyin_count\` int NOT NULL DEFAULT 0,
        \`started_at\` datetime NOT NULL,
        \`finished_at\` datetime NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_publish_batches_user_finished\` (\`user_id\`, \`finished_at\`),
        UNIQUE INDEX \`IDX_publish_batches_user_client_batch\` (\`user_id\`, \`client_batch_id\`),
        CONSTRAINT \`FK_publish_batches_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_publish_batches_draft\` FOREIGN KEY (\`draft_id\`) REFERENCES \`publish_drafts\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`publish_batch_items\` (
        \`id\` varchar(36) NOT NULL,
        \`batch_id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`step_key\` varchar(256) NOT NULL,
        \`entry_client_id\` varchar(128) NOT NULL,
        \`draft_item_client_id\` varchar(128) NULL,
        \`account_id\` varchar(36) NOT NULL,
        \`platform_id\` varchar(32) NOT NULL,
        \`account_nickname\` varchar(128) NOT NULL,
        \`account_open_id\` varchar(128) NULL,
        \`video_title\` varchar(512) NOT NULL,
        \`video_description\` text NULL,
        \`topics\` json NULL,
        \`tags\` json NULL,
        \`video_file_name\` varchar(512) NULL,
        \`video_local_path_hash\` varchar(64) NULL,
        \`douyin_publish_tag\` varchar(64) NULL,
        \`douyin_cart_items\` json NULL,
        \`location\` json NULL,
        \`schedule_at\` datetime NULL,
        \`status\` varchar(16) NOT NULL,
        \`error_code\` varchar(64) NULL,
        \`error_message\` text NULL,
        \`platform_work_id\` varchar(128) NULL,
        \`platform_work_url\` varchar(512) NULL,
        \`published_at\` datetime NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_publish_batch_items_batch\` (\`batch_id\`),
        INDEX \`IDX_publish_batch_items_user_published\` (\`user_id\`, \`published_at\`),
        INDEX \`IDX_publish_batch_items_account_published\` (\`account_id\`, \`published_at\`),
        CONSTRAINT \`FK_publish_batch_items_batch\` FOREIGN KEY (\`batch_id\`) REFERENCES \`publish_batches\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_publish_batch_items_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_publish_batch_items_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`platform_accounts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `publish_batch_items`');
    await queryRunner.query('DROP TABLE `publish_batches`');
  }
}
