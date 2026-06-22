import { randomBytes } from 'crypto';
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLiveRoomInviteCode1749400000000 implements MigrationInterface {
  name = 'AddLiveRoomInviteCode1749400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('live_rooms');
    const hasInviteCode = table?.findColumnByName('invite_code');

    if (!hasInviteCode) {
      await queryRunner.addColumn(
        'live_rooms',
        new TableColumn({
          name: 'invite_code',
          type: 'varchar',
          length: '8',
          isNullable: true,
        }),
      );
      table = await queryRunner.getTable('live_rooms');
    }

    const existingCodes: { invite_code: string }[] = await queryRunner.query(
      'SELECT `invite_code` FROM `live_rooms` WHERE `invite_code` IS NOT NULL',
    );
    const usedCodes = new Set(
      existingCodes.map((row) => row.invite_code.toUpperCase()),
    );

    const rooms: { id: string }[] = await queryRunner.query(
      'SELECT `id` FROM `live_rooms` WHERE `invite_code` IS NULL',
    );

    for (const room of rooms) {
      const code = this.generateUniqueCode(usedCodes);
      usedCodes.add(code);
      await queryRunner.query(
        'UPDATE `live_rooms` SET `invite_code` = ? WHERE `id` = ?',
        [code, room.id],
      );
    }

    table = await queryRunner.getTable('live_rooms');
    const inviteCodeColumn = table?.findColumnByName('invite_code');
    const hasUniqueIndex = table?.indices.some(
      (index) =>
        index.isUnique &&
        index.columnNames.length === 1 &&
        index.columnNames[0] === 'invite_code',
    );

    if (inviteCodeColumn?.isNullable) {
      await queryRunner.query(`
        ALTER TABLE \`live_rooms\`
        MODIFY COLUMN \`invite_code\` varchar(8) NOT NULL
      `);
    }

    if (!hasUniqueIndex) {
      await queryRunner.query(`
        ALTER TABLE \`live_rooms\`
        ADD UNIQUE INDEX \`UQ_live_rooms_invite_code\` (\`invite_code\`)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('live_rooms');
    const inviteCodeIndex = table?.indices.find(
      (index) =>
        index.columnNames.length === 1 &&
        index.columnNames[0] === 'invite_code',
    );

    if (inviteCodeIndex) {
      await queryRunner.dropIndex('live_rooms', inviteCodeIndex);
    }

    const hasInviteCode = table?.findColumnByName('invite_code');
    if (hasInviteCode) {
      await queryRunner.dropColumn('live_rooms', 'invite_code');
    }
  }

  private generateUniqueCode(usedCodes: Set<string>): string {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      if (!usedCodes.has(code)) {
        return code;
      }
    }

    throw new Error('直播间邀请码生成失败');
  }
}
