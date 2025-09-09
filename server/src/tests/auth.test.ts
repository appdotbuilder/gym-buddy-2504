import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput } from '../schema';
import { login, createUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const testCreateUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  role: 'member'
};

const testAdminInput: CreateUserInput = {
  email: 'admin@example.com',
  password: 'adminpass123',
  name: 'Admin User',
  role: 'admin'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user with member role', async () => {
    const result = await createUser(testCreateUserInput);

    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('member');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Password should be hashed
  });

  it('should create a new user with admin role', async () => {
    const result = await createUser(testAdminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Admin User');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database with hashed password', async () => {
    const result = await createUser(testCreateUserInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.name).toEqual('Test User');
    expect(savedUser.role).toEqual('member');
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly using Bun password hashing', async () => {
    const result = await createUser(testCreateUserInput);

    // Verify that the stored password hash can be verified against the original password
    const isValidPassword = await Bun.password.verify('password123', result.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify that wrong password fails
    const isInvalidPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should throw error when user with email already exists', async () => {
    // Create first user
    await createUser(testCreateUserInput);

    // Try to create another user with same email
    const duplicateInput = {
      ...testCreateUserInput,
      name: 'Different Name'
    };

    await expect(createUser(duplicateInput))
      .rejects
      .toThrow(/User with this email already exists/i);
  });

  it('should allow different users with different emails', async () => {
    await createUser(testCreateUserInput);
    
    const secondUser = {
      ...testCreateUserInput,
      email: 'different@example.com'
    };

    const result = await createUser(secondUser);
    
    expect(result.email).toEqual('different@example.com');
    expect(result.id).toBeDefined();
  });
});

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // First create a user
    const createdUser = await createUser(testCreateUserInput);

    // Then try to login
    const result = await login(testLoginInput);

    expect(result.id).toEqual(createdUser.id);
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('member');
    expect(result.password_hash).toEqual(createdUser.password_hash);
  });

  it('should login admin user with valid credentials', async () => {
    // Create admin user
    const createdAdmin = await createUser(testAdminInput);

    // Login with admin credentials
    const adminLogin: LoginInput = {
      email: 'admin@example.com',
      password: 'adminpass123'
    };

    const result = await login(adminLogin);

    expect(result.id).toEqual(createdAdmin.id);
    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Admin User');
    expect(result.role).toEqual('admin');
  });

  it('should throw error with invalid email', async () => {
    // Create a user first
    await createUser(testCreateUserInput);

    // Try to login with wrong email
    const invalidLogin: LoginInput = {
      email: 'wrong@example.com',
      password: 'password123'
    };

    await expect(login(invalidLogin))
      .rejects
      .toThrow(/Invalid email or password/i);
  });

  it('should throw error with invalid password', async () => {
    // Create a user first
    await createUser(testCreateUserInput);

    // Try to login with wrong password
    const invalidLogin: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(login(invalidLogin))
      .rejects
      .toThrow(/Invalid email or password/i);
  });

  it('should throw error when no user exists', async () => {
    // Don't create any users

    await expect(login(testLoginInput))
      .rejects
      .toThrow(/Invalid email or password/i);
  });

  it('should verify password correctly against hash', async () => {
    // Create user with specific password
    const userInput: CreateUserInput = {
      email: 'hash@example.com',
      password: 'myspecialpassword',
      name: 'Hash Test User',
      role: 'member'
    };

    await createUser(userInput);

    // Should succeed with correct password
    const validLogin: LoginInput = {
      email: 'hash@example.com',
      password: 'myspecialpassword'
    };

    const result = await login(validLogin);
    expect(result.email).toEqual('hash@example.com');

    // Should fail with incorrect password
    const invalidLogin: LoginInput = {
      email: 'hash@example.com',
      password: 'differentpassword'
    };

    await expect(login(invalidLogin))
      .rejects
      .toThrow(/Invalid email or password/i);
  });
});