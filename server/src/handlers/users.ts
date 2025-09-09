import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export const getAllMembers = async (): Promise<User[]> => {
  try {
    const members = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'member'))
      .execute();
    
    return members;
  } catch (error) {
    console.error('Failed to fetch members:', error);
    throw error;
  }
};

export const getUserById = async (userId: number): Promise<User | null> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    throw error;
  }
};