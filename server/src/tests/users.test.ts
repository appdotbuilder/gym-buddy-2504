import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getAllMembers, getUserById } from '../handlers/users';

describe('users handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getAllMembers', () => {
    it('should return empty array when no members exist', async () => {
      const result = await getAllMembers();
      expect(result).toEqual([]);
    });

    it('should return only users with member role', async () => {
      // Create test users with different roles
      const testPassword = 'hashed_password_123';
      
      await db.insert(usersTable).values([
        {
          email: 'admin@test.com',
          password_hash: testPassword,
          name: 'Admin User',
          role: 'admin'
        },
        {
          email: 'member1@test.com',
          password_hash: testPassword,
          name: 'Member One',
          role: 'member'
        },
        {
          email: 'member2@test.com',
          password_hash: testPassword,
          name: 'Member Two',
          role: 'member'
        }
      ]).execute();

      const result = await getAllMembers();

      expect(result).toHaveLength(2);
      expect(result.every(user => user.role === 'member')).toBe(true);
      
      const memberNames = result.map(user => user.name).sort();
      expect(memberNames).toEqual(['Member One', 'Member Two']);
    });

    it('should return users with all expected fields', async () => {
      const testPassword = 'hashed_password_123';
      
      await db.insert(usersTable).values({
        email: 'member@test.com',
        password_hash: testPassword,
        name: 'Test Member',
        role: 'member'
      }).execute();

      const result = await getAllMembers();

      expect(result).toHaveLength(1);
      const member = result[0];
      
      expect(member.id).toBeDefined();
      expect(member.email).toEqual('member@test.com');
      expect(member.password_hash).toEqual(testPassword);
      expect(member.name).toEqual('Test Member');
      expect(member.role).toEqual('member');
      expect(member.created_at).toBeInstanceOf(Date);
      expect(member.updated_at).toBeInstanceOf(Date);
    });

    it('should not return admin users', async () => {
      const testPassword = 'hashed_password_123';
      
      // Create only admin users
      await db.insert(usersTable).values([
        {
          email: 'admin1@test.com',
          password_hash: testPassword,
          name: 'Admin One',
          role: 'admin'
        },
        {
          email: 'admin2@test.com',
          password_hash: testPassword,
          name: 'Admin Two',
          role: 'admin'
        }
      ]).execute();

      const result = await getAllMembers();
      expect(result).toHaveLength(0);
    });
  });

  describe('getUserById', () => {
    it('should return null when user does not exist', async () => {
      const result = await getUserById(999);
      expect(result).toBeNull();
    });

    it('should return user when found by ID', async () => {
      const testPassword = 'hashed_password_123';
      
      const insertResult = await db.insert(usersTable).values({
        email: 'test@example.com',
        password_hash: testPassword,
        name: 'Test User',
        role: 'member'
      }).returning().execute();

      const userId = insertResult[0].id;
      const result = await getUserById(userId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(userId);
      expect(result!.email).toEqual('test@example.com');
      expect(result!.name).toEqual('Test User');
      expect(result!.role).toEqual('member');
    });

    it('should return admin user when found by ID', async () => {
      const testPassword = 'hashed_password_123';
      
      const insertResult = await db.insert(usersTable).values({
        email: 'admin@example.com',
        password_hash: testPassword,
        name: 'Admin User',
        role: 'admin'
      }).returning().execute();

      const userId = insertResult[0].id;
      const result = await getUserById(userId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(userId);
      expect(result!.email).toEqual('admin@example.com');
      expect(result!.name).toEqual('Admin User');
      expect(result!.role).toEqual('admin');
    });

    it('should return user with all expected fields', async () => {
      const testPassword = 'hashed_password_123';
      
      const insertResult = await db.insert(usersTable).values({
        email: 'complete@example.com',
        password_hash: testPassword,
        name: 'Complete User',
        role: 'member'
      }).returning().execute();

      const userId = insertResult[0].id;
      const result = await getUserById(userId);

      expect(result).not.toBeNull();
      expect(result!.id).toBeDefined();
      expect(typeof result!.id).toBe('number');
      expect(result!.email).toBeDefined();
      expect(result!.password_hash).toBeDefined();
      expect(result!.name).toBeDefined();
      expect(result!.role).toBeDefined();
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return correct user when multiple users exist', async () => {
      const testPassword = 'hashed_password_123';
      
      const insertResults = await db.insert(usersTable).values([
        {
          email: 'user1@example.com',
          password_hash: testPassword,
          name: 'User One',
          role: 'member'
        },
        {
          email: 'user2@example.com',
          password_hash: testPassword,
          name: 'User Two',
          role: 'admin'
        },
        {
          email: 'user3@example.com',
          password_hash: testPassword,
          name: 'User Three',
          role: 'member'
        }
      ]).returning().execute();

      // Test fetching the middle user
      const targetUserId = insertResults[1].id;
      const result = await getUserById(targetUserId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(targetUserId);
      expect(result!.email).toEqual('user2@example.com');
      expect(result!.name).toEqual('User Two');
      expect(result!.role).toEqual('admin');
    });
  });
});