import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'member']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type User = z.infer<typeof userSchema>;

// Login input schema
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
export type LoginInput = z.infer<typeof loginInputSchema>;

// User creation input schema
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: userRoleSchema
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Food item schema
export const foodItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  calories_per_100g: z.number(),
  image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});
export type FoodItem = z.infer<typeof foodItemSchema>;

// Food item creation input schema
export const createFoodItemInputSchema = z.object({
  name: z.string().min(1),
  calories_per_100g: z.number().positive(),
  image_url: z.string().url().nullable()
});
export type CreateFoodItemInput = z.infer<typeof createFoodItemInputSchema>;

// Food item update input schema
export const updateFoodItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  calories_per_100g: z.number().positive().optional(),
  image_url: z.string().url().nullable().optional()
});
export type UpdateFoodItemInput = z.infer<typeof updateFoodItemInputSchema>;

// Muscle group schema
export const muscleGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

// Muscle group creation input schema
export const createMuscleGroupInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable()
});
export type CreateMuscleGroupInput = z.infer<typeof createMuscleGroupInputSchema>;

// Exercise schema
export const exerciseSchema = z.object({
  id: z.number(),
  name: z.string(),
  muscle_group_id: z.number(),
  description: z.string().nullable(),
  gif_url: z.string().nullable(),
  created_at: z.coerce.date()
});
export type Exercise = z.infer<typeof exerciseSchema>;

// Exercise with muscle group schema
export const exerciseWithMuscleGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  muscle_group_id: z.number(),
  description: z.string().nullable(),
  gif_url: z.string().nullable(),
  created_at: z.coerce.date(),
  muscle_group: muscleGroupSchema
});
export type ExerciseWithMuscleGroup = z.infer<typeof exerciseWithMuscleGroupSchema>;

// Exercise creation input schema
export const createExerciseInputSchema = z.object({
  name: z.string().min(1),
  muscle_group_id: z.number(),
  description: z.string().nullable(),
  gif_url: z.string().url().nullable()
});
export type CreateExerciseInput = z.infer<typeof createExerciseInputSchema>;

// Gym attendance schema
export const gymAttendanceSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  attendance_date: z.coerce.date(),
  created_at: z.coerce.date()
});
export type GymAttendance = z.infer<typeof gymAttendanceSchema>;

// Gym attendance creation input schema
export const createGymAttendanceInputSchema = z.object({
  user_id: z.number(),
  attendance_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  })
});
export type CreateGymAttendanceInput = z.infer<typeof createGymAttendanceInputSchema>;

// Bulk gym attendance creation input schema
export const createBulkGymAttendanceInputSchema = z.object({
  user_id: z.number(),
  attendance_dates: z.array(z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  }))
});
export type CreateBulkGymAttendanceInput = z.infer<typeof createBulkGymAttendanceInputSchema>;

// Get gym attendance input schema
export const getGymAttendanceInputSchema = z.object({
  user_id: z.number(),
  year: z.number().int().min(2000).max(3000),
  month: z.number().int().min(1).max(12)
});
export type GetGymAttendanceInput = z.infer<typeof getGymAttendanceInputSchema>;

// Monthly attendance summary schema
export const monthlyAttendanceSummarySchema = z.object({
  year: z.number(),
  month: z.number(),
  total_days: z.number(),
  attended_days: z.number(),
  missed_days: z.number(),
  attendance_percentage: z.number(),
  attendance_dates: z.array(z.string()),
  sundays: z.array(z.string())
});
export type MonthlyAttendanceSummary = z.infer<typeof monthlyAttendanceSummarySchema>;

// Food search input schema
export const searchFoodItemsInputSchema = z.object({
  query: z.string().min(1)
});
export type SearchFoodItemsInput = z.infer<typeof searchFoodItemsInputSchema>;

// Get exercises by muscle group input schema
export const getExercisesByMuscleGroupInputSchema = z.object({
  muscle_group_id: z.number()
});
export type GetExercisesByMuscleGroupInput = z.infer<typeof getExercisesByMuscleGroupInputSchema>;

// Delete input schemas
export const deleteInputSchema = z.object({
  id: z.number()
});
export type DeleteInput = z.infer<typeof deleteInputSchema>;