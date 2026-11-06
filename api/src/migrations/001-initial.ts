import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Initial1710000000000 implements MigrationInterface {
  name = 'Initial1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'username', type: 'varchar', length: '191', isUnique: true },
          { name: 'passwordHash', type: 'varchar', length: '255' },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'isAdmin', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'name', type: 'varchar', length: '191', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'menus',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'title', type: 'varchar', length: '191' },
          { name: 'path', type: 'varchar', length: '191', isNullable: true },
          { name: 'icon', type: 'varchar', length: '191', isNullable: true },
          { name: 'sort', type: 'int', default: 0 },
          { name: 'parentId', type: 'varchar', length: '191', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'userId', type: 'varchar', length: '191' },
          { name: 'roleId', type: 'varchar', length: '191' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'role_menus',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'roleId', type: 'varchar', length: '191' },
          { name: 'menuId', type: 'varchar', length: '191' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'folders',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'name', type: 'varchar', length: '191' },
          { name: 'parentId', type: 'varchar', length: '191', isNullable: true },
          { name: 'sort', type: 'int', default: 0 },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'docs',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'folderId', type: 'varchar', length: '191', isNullable: true },
          { name: 'originalName', type: 'varchar', length: '255' },
          { name: 'storageName', type: 'varchar', length: '255' },
          { name: 'storagePath', type: 'varchar', length: '1024' },
          { name: 'mimeType', type: 'varchar', length: '64' },
          { name: 'size', type: 'bigint' },
          { name: 'status', type: 'varchar', length: '32', default: 'uploaded' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'tasks',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'type', type: 'varchar', length: '64' },
          { name: 'docId', type: 'varchar', length: '191', isNullable: true },
          { name: 'requestJson', type: 'text', isNullable: true },
          { name: 'responseJson', type: 'text', isNullable: true },
          { name: 'aiTaskId', type: 'varchar', length: '64', isNullable: true },
          { name: 'status', type: 'varchar', length: '32', default: 'pending' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'qa_logs',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'userId', type: 'varchar', length: '191', isNullable: true },
          { name: 'question', type: 'text' },
          { name: 'answer', type: 'text', isNullable: true },
          { name: 'aiResponseJson', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'qa_feedbacks',
        columns: [
          { name: 'id', type: 'char', length: '36', isPrimary: true, default: '(UUID())' },
          { name: 'qaLogId', type: 'varchar', length: '191' },
          { name: 'satisfied', type: 'boolean' },
          { name: 'note', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('users', new TableIndex({ name: 'IDX_users_username', columnNames: ['username'] }));
    await queryRunner.createIndex('folders', new TableIndex({ name: 'IDX_folders_name', columnNames: ['name'] }));
    await queryRunner.createIndex('folders', new TableIndex({ name: 'IDX_folders_parentId', columnNames: ['parentId'] }));
    await queryRunner.createIndex('docs', new TableIndex({ name: 'IDX_docs_folderId', columnNames: ['folderId'] }));
    await queryRunner.createIndex('tasks', new TableIndex({ name: 'IDX_tasks_type', columnNames: ['type'] }));
    await queryRunner.createIndex('tasks', new TableIndex({ name: 'IDX_tasks_docId', columnNames: ['docId'] }));
    await queryRunner.createIndex('qa_logs', new TableIndex({ name: 'IDX_qa_logs_userId', columnNames: ['userId'] }));
    await queryRunner.createIndex('qa_feedbacks', new TableIndex({ name: 'IDX_qa_feedbacks_qaLogId', columnNames: ['qaLogId'] }));
    await queryRunner.createIndex('user_roles', new TableIndex({ name: 'IDX_user_roles_userId', columnNames: ['userId'] }));
    await queryRunner.createIndex('user_roles', new TableIndex({ name: 'IDX_user_roles_roleId', columnNames: ['roleId'] }));
    await queryRunner.createIndex('role_menus', new TableIndex({ name: 'IDX_role_menus_roleId', columnNames: ['roleId'] }));
    await queryRunner.createIndex('role_menus', new TableIndex({ name: 'IDX_role_menus_menuId', columnNames: ['menuId'] }));

    
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('qa_feedbacks');
    await queryRunner.dropTable('qa_logs');
    await queryRunner.dropTable('tasks');
    await queryRunner.dropTable('docs');
    await queryRunner.dropTable('folders');
    await queryRunner.dropTable('role_menus');
    await queryRunner.dropTable('user_roles');
    await queryRunner.dropTable('menus');
    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('users');
  }
}