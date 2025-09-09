import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User, type CreateUserInput } from '../schema';
import { eq } from 'drizzle-orm';

export const login = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password using Bun's built-in password verification
    const isValidPassword = await Bun.password.verify(input.password, user.password_hash);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Check if user with email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password using Bun's built-in password hashing
    const password_hash = await Bun.password.hash(input.password);

    // Create new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash,
        name: input.name,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};