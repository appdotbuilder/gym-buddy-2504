import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, gymAttendanceTable } from '../db/schema';
import { 
  type CreateGymAttendanceInput,
  type CreateBulkGymAttendanceInput,
  type GetGymAttendanceInput,
  type DeleteInput 
} from '../schema';
import {
  createGymAttendance,
  createBulkGymAttendance,
  getGymAttendanceForMonth,
  getUserAttendanceHistory,
  deleteGymAttendance
} from '../handlers/gym_attendance';
import { eq } from 'drizzle-orm';

describe('gym attendance handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  // Helper to create a test user
  const createTestUser = async (suffix: string = '') => {
    const user = await db.insert(usersTable)
      .values({
        email: `test${suffix}@example.com`,
        password_hash: 'hashed_password',
        name: `Test User${suffix}`,
        role: 'member'
      })
      .returning()
      .execute();
    
    return user[0].id;
  };

  beforeEach(async () => {
    testUserId = await createTestUser();
  });

  describe('createGymAttendance', () => {
    const testInput: CreateGymAttendanceInput = {
      user_id: 0, // Will be set to testUserId
      attendance_date: '2024-01-15'
    };

    it('should create a gym attendance record', async () => {
      testInput.user_id = testUserId;
      
      const result = await createGymAttendance(testInput);

      expect(result.user_id).toEqual(testUserId);
      expect(result.attendance_date).toEqual(new Date('2024-01-15'));
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save attendance record to database', async () => {
      testInput.user_id = testUserId;
      
      const result = await createGymAttendance(testInput);

      const records = await db.select()
        .from(gymAttendanceTable)
        .where(eq(gymAttendanceTable.id, result.id))
        .execute();

      expect(records).toHaveLength(1);
      expect(records[0].user_id).toEqual(testUserId);
      expect(records[0].attendance_date).toEqual('2024-01-15');
      expect(records[0].created_at).toBeInstanceOf(Date);
    });

    it('should throw error when user does not exist', async () => {
      const invalidInput = {
        user_id: 99999,
        attendance_date: '2024-01-15'
      };

      await expect(createGymAttendance(invalidInput)).rejects.toThrow(/User with id 99999 not found/i);
    });
  });

  describe('createBulkGymAttendance', () => {
    const testInput: CreateBulkGymAttendanceInput = {
      user_id: 0, // Will be set to testUserId
      attendance_dates: ['2024-01-15', '2024-01-16', '2024-01-17']
    };

    it('should create multiple gym attendance records', async () => {
      testInput.user_id = testUserId;
      
      const results = await createBulkGymAttendance(testInput);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.user_id).toEqual(testUserId);
        expect(result.attendance_date).toEqual(new Date(testInput.attendance_dates[index]));
        expect(result.id).toBeDefined();
        expect(result.created_at).toBeInstanceOf(Date);
      });
    });

    it('should save all attendance records to database', async () => {
      testInput.user_id = testUserId;
      
      await createBulkGymAttendance(testInput);

      const records = await db.select()
        .from(gymAttendanceTable)
        .where(eq(gymAttendanceTable.user_id, testUserId))
        .execute();

      expect(records).toHaveLength(3);
      const dates = records.map(r => r.attendance_date).sort();
      expect(dates).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
    });

    it('should throw error when user does not exist', async () => {
      const invalidInput = {
        user_id: 99999,
        attendance_dates: ['2024-01-15']
      };

      await expect(createBulkGymAttendance(invalidInput)).rejects.toThrow(/User with id 99999 not found/i);
    });
  });

  describe('getGymAttendanceForMonth', () => {
    const testInput: GetGymAttendanceInput = {
      user_id: 0, // Will be set to testUserId
      year: 2024,
      month: 1 // January 2024
    };

    beforeEach(async () => {
      testInput.user_id = testUserId;
      
      // Create test attendance data for January 2024
      // January 2024: 31 days, Sundays are 7, 14, 21, 28 (4 Sundays)
      // Working days: 27, let's add attendance for some days
      const attendanceDates = [
        '2024-01-01', '2024-01-02', '2024-01-03', // First 3 days
        '2024-01-08', '2024-01-09', '2024-01-10', // Some in second week
        '2024-01-15', '2024-01-16' // Some in third week
      ];

      await createBulkGymAttendance({
        user_id: testUserId,
        attendance_dates: attendanceDates
      });
    });

    it('should calculate monthly attendance summary correctly', async () => {
      const result = await getGymAttendanceForMonth(testInput);

      expect(result.year).toEqual(2024);
      expect(result.month).toEqual(1);
      expect(result.total_days).toEqual(31); // January has 31 days
      expect(result.attended_days).toEqual(8); // We added 8 attendance records
      expect(result.sundays).toEqual(['2024-01-07', '2024-01-14', '2024-01-21', '2024-01-28']);
      expect(result.missed_days).toEqual(19); // 27 working days - 8 attended = 19 missed
      expect(result.attendance_percentage).toEqual(30); // 8/27 = 29.6% rounded to 30%
      expect(result.attendance_dates).toHaveLength(8);
      expect(result.attendance_dates[0]).toEqual('2024-01-01');
    });

    it('should handle month with no attendance', async () => {
      const februaryInput = {
        user_id: testUserId,
        year: 2024,
        month: 2 // February 2024
      };

      const result = await getGymAttendanceForMonth(februaryInput);

      expect(result.year).toEqual(2024);
      expect(result.month).toEqual(2);
      expect(result.total_days).toEqual(29); // February 2024 is a leap year
      expect(result.attended_days).toEqual(0);
      expect(result.missed_days).toEqual(25); // 29 - 4 Sundays = 25 working days
      expect(result.attendance_percentage).toEqual(0);
      expect(result.attendance_dates).toEqual([]);
      expect(result.sundays).toHaveLength(4); // February 2024 has 4 Sundays
    });

    it('should throw error when user does not exist', async () => {
      const invalidInput = {
        user_id: 99999,
        year: 2024,
        month: 1
      };

      await expect(getGymAttendanceForMonth(invalidInput)).rejects.toThrow(/User with id 99999 not found/i);
    });

    it('should calculate attendance percentage correctly for perfect attendance', async () => {
      // Create a new user and add attendance for every working day in February
      const perfectUserId = await createTestUser('_perfect');
      
      // February 2024: 29 days, Sundays are 4, 11, 18, 25 (4 Sundays)
      // Working days: 25
      const allWorkingDays = [];
      for (let day = 1; day <= 29; day++) {
        const date = new Date(2024, 1, day); // February is month 1 (0-indexed)
        if (date.getDay() !== 0) { // Not Sunday
          allWorkingDays.push(date.toISOString().split('T')[0]);
        }
      }

      await createBulkGymAttendance({
        user_id: perfectUserId,
        attendance_dates: allWorkingDays
      });

      const result = await getGymAttendanceForMonth({
        user_id: perfectUserId,
        year: 2024,
        month: 2
      });

      expect(result.attended_days).toEqual(25);
      expect(result.missed_days).toEqual(0);
      expect(result.attendance_percentage).toEqual(100);
    });
  });

  describe('getUserAttendanceHistory', () => {
    beforeEach(async () => {
      // Create attendance records across multiple months
      const attendanceDates = [
        '2024-01-15', '2024-01-16', '2024-01-17',
        '2024-02-10', '2024-02-11',
        '2024-03-05'
      ];

      await createBulkGymAttendance({
        user_id: testUserId,
        attendance_dates: attendanceDates
      });
    });

    it('should return all attendance records for user', async () => {
      const results = await getUserAttendanceHistory(testUserId);

      expect(results).toHaveLength(6);
      results.forEach(record => {
        expect(record.user_id).toEqual(testUserId);
        expect(record.id).toBeDefined();
        expect(record.created_at).toBeInstanceOf(Date);
      });
    });

    it('should return records in descending order by date', async () => {
      const results = await getUserAttendanceHistory(testUserId);

      expect(results[0].attendance_date).toEqual(new Date('2024-03-05')); // Most recent first
      expect(results[5].attendance_date).toEqual(new Date('2024-01-15')); // Oldest last
    });

    it('should return empty array for user with no attendance', async () => {
      const newUserId = await createTestUser('_empty');
      
      const results = await getUserAttendanceHistory(newUserId);

      expect(results).toHaveLength(0);
    });

    it('should throw error when user does not exist', async () => {
      await expect(getUserAttendanceHistory(99999)).rejects.toThrow(/User with id 99999 not found/i);
    });
  });

  describe('deleteGymAttendance', () => {
    let attendanceId: number;

    beforeEach(async () => {
      const attendance = await createGymAttendance({
        user_id: testUserId,
        attendance_date: '2024-01-15'
      });
      attendanceId = attendance.id;
    });

    const testInput: DeleteInput = {
      id: 0 // Will be set to attendanceId
    };

    it('should delete gym attendance record', async () => {
      testInput.id = attendanceId;
      
      const result = await deleteGymAttendance(testInput);

      expect(result.success).toBe(true);

      // Verify record was deleted
      const records = await db.select()
        .from(gymAttendanceTable)
        .where(eq(gymAttendanceTable.id, attendanceId))
        .execute();

      expect(records).toHaveLength(0);
    });

    it('should throw error when attendance record does not exist', async () => {
      const invalidInput = { id: 99999 };

      await expect(deleteGymAttendance(invalidInput)).rejects.toThrow(/Gym attendance record with id 99999 not found/i);
    });
  });
});