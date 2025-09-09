import { db } from '../db';
import { exercisesTable, muscleGroupsTable } from '../db/schema';
import { 
    type CreateExerciseInput, 
    type Exercise,
    type ExerciseWithMuscleGroup,
    type GetExercisesByMuscleGroupInput,
    type DeleteInput 
} from '../schema';
import { eq } from 'drizzle-orm';

export const createExercise = async (input: CreateExerciseInput): Promise<Exercise> => {
    try {
        // Verify muscle group exists
        const muscleGroup = await db.select()
            .from(muscleGroupsTable)
            .where(eq(muscleGroupsTable.id, input.muscle_group_id))
            .execute();
        
        if (muscleGroup.length === 0) {
            throw new Error(`Muscle group with id ${input.muscle_group_id} not found`);
        }

        // Insert exercise record
        const result = await db.insert(exercisesTable)
            .values({
                name: input.name,
                muscle_group_id: input.muscle_group_id,
                description: input.description,
                gif_url: input.gif_url
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Exercise creation failed:', error);
        throw error;
    }
};

export const getAllExercises = async (): Promise<ExerciseWithMuscleGroup[]> => {
    try {
        const results = await db.select()
            .from(exercisesTable)
            .innerJoin(muscleGroupsTable, eq(exercisesTable.muscle_group_id, muscleGroupsTable.id))
            .execute();

        return results.map(result => ({
            id: result.exercises.id,
            name: result.exercises.name,
            muscle_group_id: result.exercises.muscle_group_id,
            description: result.exercises.description,
            gif_url: result.exercises.gif_url,
            created_at: result.exercises.created_at,
            muscle_group: {
                id: result.muscle_groups.id,
                name: result.muscle_groups.name,
                description: result.muscle_groups.description,
                created_at: result.muscle_groups.created_at
            }
        }));
    } catch (error) {
        console.error('Get all exercises failed:', error);
        throw error;
    }
};

export const getExercisesByMuscleGroup = async (input: GetExercisesByMuscleGroupInput): Promise<Exercise[]> => {
    try {
        // Verify muscle group exists
        const muscleGroup = await db.select()
            .from(muscleGroupsTable)
            .where(eq(muscleGroupsTable.id, input.muscle_group_id))
            .execute();
        
        if (muscleGroup.length === 0) {
            throw new Error(`Muscle group with id ${input.muscle_group_id} not found`);
        }

        const results = await db.select()
            .from(exercisesTable)
            .where(eq(exercisesTable.muscle_group_id, input.muscle_group_id))
            .execute();

        return results;
    } catch (error) {
        console.error('Get exercises by muscle group failed:', error);
        throw error;
    }
};

export const deleteExercise = async (input: DeleteInput): Promise<{ success: boolean }> => {
    try {
        // Check if exercise exists
        const existingExercise = await db.select()
            .from(exercisesTable)
            .where(eq(exercisesTable.id, input.id))
            .execute();
        
        if (existingExercise.length === 0) {
            throw new Error(`Exercise with id ${input.id} not found`);
        }

        await db.delete(exercisesTable)
            .where(eq(exercisesTable.id, input.id))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('Exercise deletion failed:', error);
        throw error;
    }
};