import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitBaseSchema1748000000000 implements MigrationInterface {
  name = 'InitBaseSchema1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`phone\` varchar(11) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`referral_code\` varchar(8) NOT NULL,
        \`referrer_id\` varchar(36) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_users_phone\` (\`phone\`),
        UNIQUE INDEX \`IDX_users_referral_code\` (\`referral_code\`),
        INDEX \`FK_users_referrer\` (\`referrer_id\`),
        CONSTRAINT \`FK_users_referrer\` FOREIGN KEY (\`referrer_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`platform_accounts\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`platform_id\` varchar(32) NOT NULL,
        \`open_id\` varchar(128) NOT NULL,
        \`nickname\` varchar(128) NOT NULL DEFAULT '',
        \`avatar_url\` varchar(512) NOT NULL DEFAULT '',
        \`status\` varchar(16) NOT NULL DEFAULT 'bound',
        \`bound_at\` datetime NULL,
        \`expires_at\` datetime NULL,
        \`last_error\` varchar(512) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_platform_accounts_user_platform_open\` (\`user_id\`, \`platform_id\`, \`open_id\`),
        CONSTRAINT \`FK_platform_accounts_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`platform_tokens\` (
        \`account_id\` varchar(36) NOT NULL,
        \`access_token\` text NOT NULL,
        \`refresh_token\` text NULL,
        \`expires_at\` datetime NULL,
        \`refresh_expires_at\` datetime NULL,
        \`scope\` varchar(512) NULL,
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`account_id\`),
        CONSTRAINT \`FK_platform_tokens_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`platform_accounts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`oauth_bind_sessions\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`platform_id\` varchar(32) NOT NULL,
        \`state\` varchar(128) NOT NULL,
        \`status\` varchar(16) NOT NULL DEFAULT 'pending',
        \`account_id\` varchar(36) NULL,
        \`error_message\` varchar(512) NULL,
        \`expires_at\` datetime NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_oauth_bind_sessions_state\` (\`state\`),
        CONSTRAINT \`FK_oauth_bind_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`account_network_profiles\` (
        \`account_id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`enabled\` tinyint(1) NOT NULL DEFAULT 0,
        \`proxy_type\` varchar(16) NOT NULL DEFAULT 'none',
        \`host\` varchar(255) NULL,
        \`port\` int NULL,
        \`username\` varchar(128) NULL,
        \`password\` text NULL,
        \`region_label\` varchar(128) NULL,
        \`last_ip\` varchar(64) NULL,
        \`last_region\` varchar(128) NULL,
        \`last_checked_at\` datetime NULL,
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`account_id\`),
        CONSTRAINT \`FK_account_network_profiles_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`platform_accounts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`publish_drafts\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`list_title\` varchar(256) NOT NULL,
        \`video_file_name\` varchar(512) NULL,
        \`video_asset_id\` varchar(36) NULL,
        \`status\` varchar(16) NOT NULL DEFAULT 'draft',
        \`payload\` json NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_publish_drafts_user_updated\` (\`user_id\`, \`updated_at\`),
        CONSTRAINT \`FK_publish_drafts_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`publish_draft_assets\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`draft_id\` varchar(36) NOT NULL,
        \`kind\` varchar(32) NOT NULL,
        \`platform_id\` varchar(32) NULL,
        \`storage_key\` varchar(1024) NOT NULL,
        \`mime_type\` varchar(128) NOT NULL,
        \`file_name\` varchar(512) NOT NULL,
        \`file_size\` bigint NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_publish_draft_assets_draft_kind_platform\` (\`draft_id\`, \`kind\`, \`platform_id\`),
        CONSTRAINT \`FK_publish_draft_assets_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_publish_draft_assets_draft\` FOREIGN KEY (\`draft_id\`) REFERENCES \`publish_drafts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `publish_draft_assets`');
    await queryRunner.query('DROP TABLE `publish_drafts`');
    await queryRunner.query('DROP TABLE `account_network_profiles`');
    await queryRunner.query('DROP TABLE `oauth_bind_sessions`');
    await queryRunner.query('DROP TABLE `platform_tokens`');
    await queryRunner.query('DROP TABLE `platform_accounts`');
    await queryRunner.query('DROP TABLE `users`');
  }
}
