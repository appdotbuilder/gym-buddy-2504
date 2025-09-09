import { serial, text, pgTable, timestamp, integer, pgEnum, date, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// User role enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'member']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Food items table
export const foodItemsTable = pgTable('food_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  calories_per_100g: real('calories_per_100g').notNull(),
  image_url: text('image_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Muscle groups table
export const muscleGroupsTable = pgTable('muscle_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Exercises table
export const exercisesTable = pgTable('exercises', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  muscle_group_id: integer('muscle_group_id').notNull().references(() => muscleGroupsTable.id),
  description: text('description'),
  gif_url: text('gif_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Gym attendance table
export const gymAttendanceTable = pgTable('gym_attendance', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  attendance_date: date('attendance_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  gymAttendance: many(gymAttendanceTable),
}));

export const muscleGroupsRelations = relations(muscleGroupsTable, ({ many }) => ({
  exercises: many(exercisesTable),
}));

export const exercisesRelations = relations(exercisesTable, ({ one }) => ({
  muscleGroup: one(muscleGroupsTable, {
    fields: [exercisesTable.muscle_group_id],
    references: [muscleGroupsTable.id],
  }),
}));

export const gymAttendanceRelations = relations(gymAttendanceTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [gymAttendanceTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type FoodItem = typeof foodItemsTable.$inferSelect;
export type NewFoodItem = typeof foodItemsTable.$inferInsert;

export type MuscleGroup = typeof muscleGroupsTable.$inferSelect;
export type NewMuscleGroup = typeof muscleGroupsTable.$inferInsert;

export type Exercise = typeof exercisesTable.$inferSelect;
export type NewExercise = typeof exercisesTable.$inferInsert;

export type GymAttendance = typeof gymAttendanceTable.$inferSelect;
export type NewGymAttendance = typeof gymAttendanceTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  foodItems: foodItemsTable,
  muscleGroups: muscleGroupsTable,
  exercises: exercisesTable,
  gymAttendance: gymAttendanceTable,
};