import { db } from '../db';
import { gymAttendanceTable, usersTable } from '../db/schema';
import { 
    type CreateGymAttendanceInput,
    type CreateBulkGymAttendanceInput,
    type GetGymAttendanceInput,
    type GymAttendance,
    type MonthlyAttendanceSummary,
    type DeleteInput 
} from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const createGymAttendance = async (input: CreateGymAttendanceInput): Promise<GymAttendance> => {
  try {
    // Verify user exists first to prevent foreign key constraint errors
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert attendance record
    const result = await db.insert(gymAttendanceTable)
      .values({
        user_id: input.user_id,
        attendance_date: input.attendance_date
      })
      .returning()
      .execute();

    // Convert date string to Date object to match schema
    const attendance = result[0];
    return {
      ...attendance,
      attendance_date: new Date(attendance.attendance_date)
    };
  } catch (error) {
    console.error('Gym attendance creation failed:', error);
    throw error;
  }
};

export const createBulkGymAttendance = async (input: CreateBulkGymAttendanceInput): Promise<GymAttendance[]> => {
  try {
    // Verify user exists first
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Prepare bulk insert data
    const attendanceRecords = input.attendance_dates.map(date => ({
      user_id: input.user_id,
      attendance_date: date
    }));

    // Bulk insert attendance records
    const results = await db.insert(gymAttendanceTable)
      .values(attendanceRecords)
      .returning()
      .execute();

    // Convert date strings to Date objects to match schema
    return results.map(attendance => ({
      ...attendance,
      attendance_date: new Date(attendance.attendance_date)
    }));
  } catch (error) {
    console.error('Bulk gym attendance creation failed:', error);
    throw error;
  }
};

export const getGymAttendanceForMonth = async (input: GetGymAttendanceInput): Promise<MonthlyAttendanceSummary> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Calculate first and last day of the month
    const firstDay = new Date(input.year, input.month - 1, 1);
    const lastDay = new Date(input.year, input.month, 0);

    // Get attendance records for the month
    const attendanceRecords = await db.select()
      .from(gymAttendanceTable)
      .where(and(
        eq(gymAttendanceTable.user_id, input.user_id),
        gte(gymAttendanceTable.attendance_date, firstDay.toISOString().split('T')[0]),
        lte(gymAttendanceTable.attendance_date, lastDay.toISOString().split('T')[0])
      ))
      .execute();

    // Calculate all days in the month and categorize them
    const daysInMonth = lastDay.getDate();
    const attendanceDates: string[] = [];
    const sundays: string[] = [];

    // Process attendance records
    attendanceRecords.forEach(record => {
      attendanceDates.push(record.attendance_date);
    });

    // Find all Sundays in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(input.year, input.month - 1, day);
      if (date.getDay() === 0) { // Sunday is day 0
        sundays.push(date.toISOString().split('T')[0]);
      }
    }

    // Calculate working days (excluding Sundays)
    const workingDays = daysInMonth - sundays.length;
    const attendedDays = attendanceDates.length;
    const missedDays = workingDays - attendedDays;
    const attendancePercentage = workingDays > 0 ? Math.round((attendedDays / workingDays) * 100) : 0;

    return {
      year: input.year,
      month: input.month,
      total_days: daysInMonth,
      attended_days: attendedDays,
      missed_days: Math.max(0, missedDays), // Ensure non-negative
      attendance_percentage: attendancePercentage,
      attendance_dates: attendanceDates.sort(),
      sundays: sundays.sort()
    };
  } catch (error) {
    console.error('Monthly attendance calculation failed:', error);
    throw error;
  }
};

export const getUserAttendanceHistory = async (userId: number): Promise<GymAttendance[]> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Get all attendance records for the user, ordered by date (most recent first)
    const results = await db.select()
      .from(gymAttendanceTable)
      .where(eq(gymAttendanceTable.user_id, userId))
      .orderBy(desc(gymAttendanceTable.attendance_date))
      .execute();

    // Convert date strings to Date objects to match schema
    return results.map(attendance => ({
      ...attendance,
      attendance_date: new Date(attendance.attendance_date)
    }));
  } catch (error) {
    console.error('User attendance history retrieval failed:', error);
    throw error;
  }
};

export const deleteGymAttendance = async (input: DeleteInput): Promise<{ success: boolean }> => {
  try {
    // Verify attendance record exists before deletion
    const existingRecord = await db.select()
      .from(gymAttendanceTable)
      .where(eq(gymAttendanceTable.id, input.id))
      .execute();

    if (existingRecord.length === 0) {
      throw new Error(`Gym attendance record with id ${input.id} not found`);
    }

    // Delete the attendance record
    await db.delete(gymAttendanceTable)
      .where(eq(gymAttendanceTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Gym attendance deletion failed:', error);
    throw error;
  }
};