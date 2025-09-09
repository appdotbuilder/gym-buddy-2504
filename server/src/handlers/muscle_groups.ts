import { db } from '../db';
import { muscleGroupsTable, exercisesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
    type CreateMuscleGroupInput, 
    type MuscleGroup,
    type DeleteInput 
} from '../schema';

export const createMuscleGroup = async (input: CreateMuscleGroupInput): Promise<MuscleGroup> => {
    try {
        // Insert muscle group record
        const result = await db.insert(muscleGroupsTable)
            .values({
                name: input.name,
                description: input.description
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Muscle group creation failed:', error);
        throw error;
    }
};

export const getAllMuscleGroups = async (): Promise<MuscleGroup[]> => {
    try {
        const result = await db.select()
            .from(muscleGroupsTable)
            .execute();

        return result;
    } catch (error) {
        console.error('Failed to fetch muscle groups:', error);
        throw error;
    }
};

export const deleteMuscleGroup = async (input: DeleteInput): Promise<{ success: boolean }> => {
    try {
        // First delete related exercises to handle cascade
        await db.delete(exercisesTable)
            .where(eq(exercisesTable.muscle_group_id, input.id))
            .execute();

        // Then delete the muscle group
        const result = await db.delete(muscleGroupsTable)
            .where(eq(muscleGroupsTable.id, input.id))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('Muscle group deletion failed:', error);
        throw error;
    }
};