/**
 * Example: Using Additional Validators in GambitORM
 * 
 * This file demonstrates the additional validators available in GambitORM
 */

import { 
  GambitORM, 
  Model,
  RequiredValidator,
  EmailValidator,
  UniqueValidator,
  ExistsValidator,
  RegexValidator,
  UrlValidator,
  DateValidator,
  ArrayValidator,
} from '../src';

// Example Models
class User extends Model {
  static tableName = 'users';
  id!: number;
  email!: string;
  username!: string;
  website?: string;
  birthDate?: Date;
  tags?: string[];
  roleId?: number;

  static validationRules = {
    email: [
      new RequiredValidator(),
      new EmailValidator(),
      new UniqueValidator('users', 'email'),
    ],
    username: [
      new RequiredValidator(),
      new RegexValidator(/^[a-zA-Z0-9_]+$/, undefined, 'Username must contain only letters, numbers, and underscores'),
      new UniqueValidator('users', 'username'),
    ],
    website: [
      new UrlValidator({ protocols: ['http', 'https'] }),
    ],
    birthDate: [
      new DateValidator({
        max: new Date(),
        min: new Date('1900-01-01'),
      }),
    ],
    tags: [
      new ArrayValidator({
        min: 1,
        max: 10,
        itemType: 'string',
      }),
    ],
    roleId: [
      new ExistsValidator('roles', 'id'),
    ],
  };
}

class Role extends Model {
  static tableName = 'roles';
  id!: number;
  name!: string;
}

async function additionalValidatorsExample() {
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

  console.log('=== Additional Validators ===\n');

  // 1. UniqueValidator
  console.log('1. UniqueValidator:');
  try {
    const user1 = new User();
    user1.email = 'john@example.com';
    user1.username = 'john_doe';
    await user1.save();
    console.log('User created successfully');

    // Try to create another user with same email (should fail)
    const user2 = new User();
    user2.email = 'john@example.com'; // Duplicate email
    user2.username = 'jane_doe';
    await user2.save();
  } catch (error: any) {
    console.log(`Validation error: ${error.message}`);
  }
  console.log('');

  // 2. RegexValidator
  console.log('2. RegexValidator:');
  try {
    const user = new User();
    user.email = 'test@example.com';
    user.username = 'valid_username123'; // Valid
    await user.save();
    console.log('Username validation passed');

    const user2 = new User();
    user2.email = 'test2@example.com';
    user2.username = 'invalid-username'; // Invalid (contains hyphen)
    await user2.save();
  } catch (error: any) {
    console.log(`Validation error: ${error.message}`);
  }
  console.log('');

  // 3. UrlValidator
  console.log('3. UrlValidator:');
  try {
    const user = new User();
    user.email = 'test3@example.com';
    user.username = 'testuser';
    user.website = 'https://example.com'; // Valid URL
    await user.save();
    console.log('URL validation passed');

    const user2 = new User();
    user2.email = 'test4@example.com';
    user2.username = 'testuser2';
    user2.website = 'not-a-url'; // Invalid URL
    await user2.save();
  } catch (error: any) {
    console.log(`Validation error: ${error.message}`);
  }
  console.log('');

  // 4. DateValidator
  console.log('4. DateValidator:');
  try {
    const user = new User();
    user.email = 'test5@example.com';
    user.username = 'testuser3';
    user.birthDate = new Date('1990-01-01'); // Valid date
    await user.save();
    console.log('Date validation passed');

    const user2 = new User();
    user2.email = 'test6@example.com';
    user2.username = 'testuser4';
    user2.birthDate = new Date('2100-01-01'); // Future date (invalid)
    await user2.save();
  } catch (error: any) {
    console.log(`Validation error: ${error.message}`);
  }
  console.log('');

  // 5. ArrayValidator
  console.log('5. ArrayValidator:');
  try {
    const user = new User();
    user.email = 'test7@example.com';
    user.username = 'testuser5';
    user.tags = ['developer', 'nodejs', 'typescript']; // Valid array
    await user.save();
    console.log('Array validation passed');

    const user2 = new User();
    user2.email = 'test8@example.com';
    user2.username = 'testuser6';
    user2.tags = []; // Empty array (fails min: 1)
    await user2.save();
  } catch (error: any) {
    console.log(`Validation error: ${error.message}`);
  }
  console.log('');

  // 6. ExistsValidator
  console.log('6. ExistsValidator:');
  try {
    // Create a role first
    const role = await Role.create({ name: 'Admin' });

    const user = new User();
    user.email = 'test9@example.com';
    user.username = 'testuser7';
    user.roleId = role.id; // Valid role ID
    await user.save();
    console.log('Exists validation passed');

    const user2 = new User();
    user2.email = 'test10@example.com';
    user2.username = 'testuser8';
    user2.roleId = 999; // Non-existent role ID
    await user2.save();
  } catch (error: any) {
    console.log(`Validation error: ${error.message}`);
  }
  console.log('');

  // 7. Combined Validators
  console.log('7. Combined Validators:');
  try {
    const user = new User();
    user.email = 'combined@example.com'; // Required + Email + Unique
    user.username = 'combined_user'; // Required + Regex + Unique
    user.website = 'https://example.com'; // UrlValidator
    user.birthDate = new Date('1990-01-01'); // DateValidator
    user.tags = ['tag1', 'tag2']; // ArrayValidator
    user.roleId = 1; // ExistsValidator
    await user.save();
    console.log('All validations passed');
  } catch (error: any) {
    console.log(`Validation error: ${error.message}`);
  }

  await orm.disconnect();
}

// Run example
if (require.main === module) {
  additionalValidatorsExample().catch(console.error);
}

export { additionalValidatorsExample };

