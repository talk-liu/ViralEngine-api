import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAdminAndLiveRoomTables1749300000000
  implements MigrationInterface
{
  name = 'AddUserAdminAndLiveRoomTables1749300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD COLUMN \`is_admin\` tinyint(1) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE \`live_rooms\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`url\` varchar(1024) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`live_room_scripts\` (
        \`id\` varchar(36) NOT NULL,
        \`room_id\` varchar(36) NOT NULL,
        \`content\` text NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_live_room_scripts_room_sort\` (\`room_id\`, \`sort_order\`),
        CONSTRAINT \`FK_live_room_scripts_room\` FOREIGN KEY (\`room_id\`) REFERENCES \`live_rooms\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `live_room_scripts`');
    await queryRunner.query('DROP TABLE `live_rooms`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `is_admin`');
  }
}
