import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  createFoodItemInputSchema,
  updateFoodItemInputSchema,
  searchFoodItemsInputSchema,
  deleteInputSchema,
  createMuscleGroupInputSchema,
  createExerciseInputSchema,
  getExercisesByMuscleGroupInputSchema,
  createGymAttendanceInputSchema,
  createBulkGymAttendanceInputSchema,
  getGymAttendanceInputSchema
} from './schema';

// Import handlers
import { login, createUser } from './handlers/auth';
import { 
  createFoodItem, 
  getAllFoodItems, 
  searchFoodItems, 
  updateFoodItem, 
  deleteFoodItem 
} from './handlers/food_items';
import { 
  createMuscleGroup, 
  getAllMuscleGroups, 
  deleteMuscleGroup 
} from './handlers/muscle_groups';
import { 
  createExercise, 
  getAllExercises, 
  getExercisesByMuscleGroup, 
  deleteExercise 
} from './handlers/exercises';
import { 
  createGymAttendance, 
  createBulkGymAttendance, 
  getGymAttendanceForMonth, 
  getUserAttendanceHistory, 
  deleteGymAttendance 
} from './handlers/gym_attendance';
import { getAllMembers, getUserById } from './handlers/users';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Food items routes (Admin: CRUD, Member: Read/Search)
  createFoodItem: publicProcedure
    .input(createFoodItemInputSchema)
    .mutation(({ input }) => createFoodItem(input)),
  
  getAllFoodItems: publicProcedure
    .query(() => getAllFoodItems()),
  
  searchFoodItems: publicProcedure
    .input(searchFoodItemsInputSchema)
    .query(({ input }) => searchFoodItems(input)),
  
  updateFoodItem: publicProcedure
    .input(updateFoodItemInputSchema)
    .mutation(({ input }) => updateFoodItem(input)),
  
  deleteFoodItem: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteFoodItem(input)),

  // Muscle groups routes (Admin: CRUD, Member: Read)
  createMuscleGroup: publicProcedure
    .input(createMuscleGroupInputSchema)
    .mutation(({ input }) => createMuscleGroup(input)),
  
  getAllMuscleGroups: publicProcedure
    .query(() => getAllMuscleGroups()),
  
  deleteMuscleGroup: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteMuscleGroup(input)),

  // Exercises routes (Admin: CRUD, Member: Read)
  createExercise: publicProcedure
    .input(createExerciseInputSchema)
    .mutation(({ input }) => createExercise(input)),
  
  getAllExercises: publicProcedure
    .query(() => getAllExercises()),
  
  getExercisesByMuscleGroup: publicProcedure
    .input(getExercisesByMuscleGroupInputSchema)
    .query(({ input }) => getExercisesByMuscleGroup(input)),
  
  deleteExercise: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteExercise(input)),

  // Gym attendance routes (Admin: CRUD, Member: Read own data)
  createGymAttendance: publicProcedure
    .input(createGymAttendanceInputSchema)
    .mutation(({ input }) => createGymAttendance(input)),
  
  createBulkGymAttendance: publicProcedure
    .input(createBulkGymAttendanceInputSchema)
    .mutation(({ input }) => createBulkGymAttendance(input)),
  
  getGymAttendanceForMonth: publicProcedure
    .input(getGymAttendanceInputSchema)
    .query(({ input }) => getGymAttendanceForMonth(input)),
  
  getUserAttendanceHistory: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserAttendanceHistory(input.userId)),
  
  deleteGymAttendance: publicProcedure
    .input(deleteInputSchema)
    .mutation(({ input }) => deleteGymAttendance(input)),

  // User management routes (Admin only)
  getAllMembers: publicProcedure
    .query(() => getAllMembers()),
  
  getUserById: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserById(input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();