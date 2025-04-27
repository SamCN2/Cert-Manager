"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserGroups = exports.UpdateUserGroupsMigration = exports.BaseMigrationScript = void 0;
class BaseMigrationScript {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async execute(sql) {
        await this.dataSource.execute(sql);
    }
}
exports.BaseMigrationScript = BaseMigrationScript;
class UpdateUserGroupsMigration extends BaseMigrationScript {
    async up() {
        const tx = await this.dataSource.beginTransaction({
            isolationLevel: 'SERIALIZABLE',
        });
        try {
            // Add user_id and username columns
            await this.execute(`
        ALTER TABLE user_groups 
        ADD COLUMN user_id UUID,
        ADD COLUMN username VARCHAR(255);
      `);
            // Populate user_id and username from users table
            await this.execute(`
        UPDATE user_groups ug
        SET user_id = u.id,
            username = u.username
        FROM users u
        WHERE ug.username = u.username;
      `);
            // Verify all entries have valid user_id and username
            const orphanedGroups = await this.dataSource.execute(`
        SELECT * FROM user_groups
        WHERE user_id IS NULL OR username IS NULL;
      `);
            if (orphanedGroups.length > 0) {
                throw new Error('Found user groups without valid user_id or username');
            }
            // Set NOT NULL constraints and update foreign keys
            await this.execute(`
        ALTER TABLE user_groups
        ALTER COLUMN user_id SET NOT NULL,
        ALTER COLUMN username SET NOT NULL;

        ALTER TABLE user_groups
        DROP CONSTRAINT IF EXISTS user_groups_username_fkey CASCADE;

        ALTER TABLE user_groups
        ADD CONSTRAINT user_groups_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE;

        ALTER TABLE user_groups
        ADD CONSTRAINT user_groups_username_fkey
        FOREIGN KEY (username)
        REFERENCES users(username) ON DELETE CASCADE;

        ALTER TABLE user_groups
        DROP CONSTRAINT IF EXISTS user_groups_pkey CASCADE;

        ALTER TABLE user_groups
        ADD PRIMARY KEY (user_id, group_name);

        DROP INDEX IF EXISTS user_groups_user_id_group_name_idx;
        CREATE UNIQUE INDEX user_groups_user_id_group_name_idx
        ON user_groups(user_id, group_name);
      `);
            await tx.commit();
            console.log('Successfully updated user_groups table to use user_id and username');
        }
        catch (err) {
            console.error('Error in updateUserGroups migration:', err);
            await tx.rollback();
            throw err;
        }
    }
    async down() {
        const tx = await this.dataSource.beginTransaction({
            isolationLevel: 'SERIALIZABLE',
        });
        try {
            await this.execute(`
        DROP INDEX IF EXISTS user_groups_user_id_group_name_idx;
        CREATE UNIQUE INDEX user_groups_username_group_name_idx 
        ON user_groups(username, group_name);

        ALTER TABLE user_groups
        DROP CONSTRAINT IF EXISTS user_groups_pkey CASCADE;

        ALTER TABLE user_groups
        ADD PRIMARY KEY (username, group_name);

        ALTER TABLE user_groups
        DROP CONSTRAINT IF EXISTS user_groups_user_id_fkey CASCADE;

        ALTER TABLE user_groups
        ADD CONSTRAINT user_groups_username_fkey 
        FOREIGN KEY (username) 
        REFERENCES users(username) ON DELETE CASCADE;

        ALTER TABLE user_groups
        DROP COLUMN user_id,
        DROP COLUMN username;
      `);
            await tx.commit();
        }
        catch (err) {
            console.error('Error in updateUserGroups down migration:', err);
            await tx.rollback();
            throw err;
        }
    }
}
exports.UpdateUserGroupsMigration = UpdateUserGroupsMigration;
async function updateUserGroups(dataSource) {
    const migration = new UpdateUserGroupsMigration(dataSource);
    await migration.up();
}
exports.updateUserGroups = updateUserGroups;
//# sourceMappingURL=20250418-update-user-groups.js.map