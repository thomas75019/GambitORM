/**
 * Example: Using Many-to-Many Relationships in GambitORM
 * 
 * This file demonstrates many-to-many relationships with pivot tables
 */

import { GambitORM, Model } from '../src';

// Example Models
class User extends Model {
  static tableName = 'users';
  id!: number;
  name!: string;
  email!: string;
}

class Role extends Model {
  static tableName = 'roles';
  id!: number;
  name!: string;
  description?: string;
}

class Post extends Model {
  static tableName = 'posts';
  id!: number;
  title!: string;
  content!: string;
}

class Tag extends Model {
  static tableName = 'tags';
  id!: number;
  name!: string;
  color?: string;
}

async function manyToManyExample() {
  // Initialize ORM
  const orm = new GambitORM({
    host: 'localhost',
    port: 3306,
    database: 'mydb',
    user: 'root',
    password: 'password',
    dialect: 'mysql',
  });

  await orm.connect();
  Model.setConnection(orm.getConnection());

  console.log('=== Many-to-Many Relationships ===\n');

  // 1. Basic Many-to-Many Relationship
  console.log('1. Basic Many-to-Many:');
  const user = await User.findById(1);
  if (user) {
    const roles = user.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    // Load related roles
    const userRoles = await roles.load();
    console.log(`User has ${userRoles.length} roles`);
    userRoles.forEach(role => {
      console.log(`  - ${role.name}`);
    });
  }

  // 2. Attach Related Models
  console.log('\n2. Attach Related Models:');
  const user2 = await User.findById(2);
  if (user2) {
    const userRoles = user2.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    // Attach a single role
    await userRoles.attach(1);
    console.log('Attached role 1 to user 2');

    // Attach multiple roles
    await userRoles.attachMany([2, 3]);
    console.log('Attached roles 2 and 3 to user 2');
  }

  // 3. Attach with Pivot Data
  console.log('\n3. Attach with Pivot Data:');
  const user3 = await User.findById(3);
  if (user3) {
    const userRoles = user3.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    // Attach role with additional pivot data
    await userRoles.attach(1, {
      assigned_at: new Date(),
      assigned_by: 1,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    console.log('Attached role with pivot data (assigned_at, assigned_by, expires_at)');
  }

  // 4. Detach Related Models
  console.log('\n4. Detach Related Models:');
  const user4 = await User.findById(4);
  if (user4) {
    const userRoles = user4.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    // Detach a specific role
    const detached = await userRoles.detach(2);
    console.log(`Detached ${detached} role(s)`);

    // Detach all roles
    const allDetached = await userRoles.detach();
    console.log(`Detached all ${allDetached} roles`);
  }

  // 5. Sync Related Models
  console.log('\n5. Sync Related Models:');
  const user5 = await User.findById(5);
  if (user5) {
    const userRoles = user5.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    // Sync: detach all and attach only specified roles
    await userRoles.sync([1, 2, 3]);
    console.log('Synced roles: only roles 1, 2, and 3 are now attached');

    // Sync without detaching existing
    await userRoles.sync([4, 5], false);
    console.log('Added roles 4 and 5 without detaching existing');
  }

  // 6. Toggle Related Models
  console.log('\n6. Toggle Related Models:');
  const user6 = await User.findById(6);
  if (user6) {
    const userRoles = user6.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    // Toggle: attach if not attached, detach if attached
    const wasAttached = await userRoles.toggle(1);
    console.log(`Toggled role 1: ${wasAttached ? 'attached' : 'detached'}`);
  }

  // 7. Check if Related Model is Attached
  console.log('\n7. Check if Related Model is Attached:');
  const user7 = await User.findById(7);
  if (user7) {
    const userRoles = user7.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    const hasRole = await userRoles.has(1);
    console.log(`User 7 ${hasRole ? 'has' : 'does not have'} role 1`);
  }

  // 8. Count Related Models
  console.log('\n8. Count Related Models:');
  const user8 = await User.findById(8);
  if (user8) {
    const userRoles = user8.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
    });

    const roleCount = await userRoles.count();
    console.log(`User 8 has ${roleCount} roles`);
  }

  // 9. Access Pivot Data
  console.log('\n9. Access Pivot Data:');
  const user9 = await User.findById(9);
  if (user9) {
    const userRoles = user9.belongsToMany(Role, {
      pivotTable: 'user_roles',
      foreignKey: 'user_id',
      relatedKey: 'role_id',
      withPivot: ['assigned_at', 'assigned_by', 'expires_at'], // Include pivot fields
    });

    const rolesWithPivot = await userRoles.load();
    rolesWithPivot.forEach(role => {
      console.log(`Role: ${role.name}`);
      console.log(`  Assigned at: ${(role as any).pivot_assigned_at}`);
      console.log(`  Assigned by: ${(role as any).pivot_assigned_by}`);
      if ((role as any).pivot_expires_at) {
        console.log(`  Expires at: ${(role as any).pivot_expires_at}`);
      }
    });
  }

  // 10. Post-Tag Many-to-Many Example
  console.log('\n10. Post-Tag Many-to-Many Example:');
  const post = await Post.findById(1);
  if (post) {
    const tags = post.belongsToMany(Tag, {
      pivotTable: 'post_tags',
      foreignKey: 'post_id',
      relatedKey: 'tag_id',
      withPivot: ['created_at'], // When tag was added to post
    });

    // Attach tags to post
    await tags.attachMany([1, 2, 3], {
      created_at: new Date(),
    });

    // Load post tags
    const postTags = await tags.load();
    console.log(`Post has ${postTags.length} tags:`);
    postTags.forEach(tag => {
      console.log(`  - ${tag.name} (added at: ${(tag as any).pivot_created_at})`);
    });
  }

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  manyToManyExample().catch(console.error);
}

export { manyToManyExample };

