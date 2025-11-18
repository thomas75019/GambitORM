/**
 * Example: Using Validation in GambitORM
 * 
 * This file demonstrates how to use validation in models
 */

import { GambitORM, Model } from '../src';
import {
  RequiredValidator,
  EmailValidator,
  MinLengthValidator,
  MaxLengthValidator,
  MinValidator,
  MaxValidator,
  TypeValidator,
  CustomValidator,
  ValidationError,
} from '../src';

// Example Models with Validation
class User extends Model {
  static tableName = 'users';
  
  // Define validation rules
  static validationRules = {
    name: [
      new RequiredValidator('Name is required'),
      new MinLengthValidator(3, 'Name must be at least 3 characters'),
      new MaxLengthValidator(50, 'Name must be at most 50 characters'),
    ],
    email: [
      new RequiredValidator('Email is required'),
      new EmailValidator('Email must be a valid email address'),
    ],
    age: [
      new TypeValidator('number', 'Age must be a number'),
      new MinValidator(18, 'Age must be at least 18'),
      new MaxValidator(120, 'Age must be at most 120'),
    ],
    password: [
      new RequiredValidator('Password is required'),
      new MinLengthValidator(8, 'Password must be at least 8 characters'),
      new CustomValidator(
        (value) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value),
        'Password must contain uppercase, lowercase, and number'
      ),
    ],
  };

  id!: number;
  name!: string;
  email!: string;
  age!: number;
  password!: string;
}

class Post extends Model {
  static tableName = 'posts';
  
  static validationRules = {
    title: [
      new RequiredValidator(),
      new MinLengthValidator(5),
      new MaxLengthValidator(200),
    ],
    content: [
      new RequiredValidator(),
      new MinLengthValidator(10),
    ],
    published_at: [
      new TypeValidator('date', 'Published date must be a valid date'),
    ],
  };

  id!: number;
  title!: string;
  content!: string;
  published_at!: Date;
}

// Initialize ORM
const orm = new GambitORM({
  host: 'localhost',
  port: 3306,
  database: 'mydb',
  user: 'user',
  password: 'password',
  dialect: 'mysql',
});

async function examples() {
  await orm.connect();

  // ============================================
  // Validation on Create
  // ============================================
  try {
    // This will pass validation
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      password: 'SecurePass123',
    });
    console.log('User created:', user);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation errors:', error.errors);
      // {
      //   name: ['Name must be at least 3 characters'],
      //   email: ['Email must be a valid email address'],
      //   ...
      // }
    } else {
      throw error;
    }
  }

  // ============================================
  // Validation on Save
  // ============================================
  try {
    const user = new User();
    user.name = 'Jo'; // Too short
    user.email = 'invalid-email';
    user.age = 15; // Too young
    user.password = 'weak';

    await user.save(); // Will throw ValidationError
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation failed:', error.message);
      console.error('Field errors:', error.errors);
      
      // Check specific field
      if (error.hasFieldError('name')) {
        console.error('Name errors:', error.getFieldErrors('name'));
      }
    }
  }

  // ============================================
  // Validation on Update
  // ============================================
  try {
    const user = await User.findById(1);
    if (user) {
      await user.update({
        email: 'new-invalid-email', // Invalid email
      });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Update validation failed:', error.errors);
    }
  }

  // ============================================
  // Manual Validation
  // ============================================
  const user = new User();
  user.name = 'John Doe';
  user.email = 'john@example.com';
  user.age = 25;
  user.password = 'SecurePass123';

  try {
    await user.validate();
    console.log('Validation passed');
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation errors:', error.errors);
    }
  }

  // ============================================
  // Skip Validation
  // ============================================
  // Sometimes you may want to skip validation
  const admin = new User();
  admin.name = 'Admin';
  admin.email = 'admin@example.com';
  admin.age = 30;
  admin.password = 'admin123'; // Weak password, but we'll skip validation

  await admin.save({ skipValidation: true }); // Skip validation

  // ============================================
  // Custom Validator Example
  // ============================================
  class Product extends Model {
    static tableName = 'products';
    
    static validationRules = {
      price: [
        new RequiredValidator(),
        new MinValidator(0, 'Price must be positive'),
        new CustomValidator(
          async (value) => {
            // Async validation - e.g., check against external API
            // For demo, just check if price is reasonable
            await new Promise(resolve => setTimeout(resolve, 10));
            return value < 1000000;
          },
          'Price seems unreasonably high'
        ),
      ],
      sku: [
        new RequiredValidator(),
        new CustomValidator(
          (value) => /^[A-Z0-9-]+$/.test(value),
          'SKU must contain only uppercase letters, numbers, and hyphens'
        ),
      ],
    };

    id!: number;
    name!: string;
    price!: number;
    sku!: string;
  }

  await orm.disconnect();
}

// Uncomment to run examples
// examples().catch(console.error);

export { User, Post, Product };

