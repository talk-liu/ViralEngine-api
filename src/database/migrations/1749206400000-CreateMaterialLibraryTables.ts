import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaterialLibraryTables1749206400000
  implements MigrationInterface
{
  name = 'CreateMaterialLibraryTables1749206400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`material_groups\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`name\` varchar(256) NOT NULL,
        \`description\` varchar(512) NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_material_groups_user_sort\` (\`user_id\`, \`sort_order\`),
        CONSTRAINT \`FK_material_groups_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`material_tags\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`name\` varchar(64) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_material_tags_user_name\` (\`user_id\`, \`name\`),
        CONSTRAINT \`FK_material_tags_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`materials\` (
        \`id\` varchar(36) NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`group_id\` varchar(36) NULL,
        \`type\` varchar(16) NOT NULL,
        \`name\` varchar(256) NOT NULL,
        \`storage_key\` varchar(1024) NOT NULL,
        \`mime_type\` varchar(128) NOT NULL,
        \`file_name\` varchar(512) NOT NULL,
        \`file_size\` bigint NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_materials_user_updated\` (\`user_id\`, \`updated_at\`),
        INDEX \`IDX_materials_user_group\` (\`user_id\`, \`group_id\`),
        INDEX \`IDX_materials_user_type\` (\`user_id\`, \`type\`),
        CONSTRAINT \`FK_materials_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_materials_group\` FOREIGN KEY (\`group_id\`) REFERENCES \`material_groups\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`material_tag_links\` (
        \`material_id\` varchar(36) NOT NULL,
        \`tag_id\` varchar(36) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`material_id\`, \`tag_id\`),
        INDEX \`IDX_material_tag_links_tag\` (\`tag_id\`),
        CONSTRAINT \`FK_material_tag_links_material\` FOREIGN KEY (\`material_id\`) REFERENCES \`materials\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_material_tag_links_tag\` FOREIGN KEY (\`tag_id\`) REFERENCES \`material_tags\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `material_tag_links`');
    await queryRunner.query('DROP TABLE `materials`');
    await queryRunner.query('DROP TABLE `material_tags`');
    await queryRunner.query('DROP TABLE `material_groups`');
  }
}
