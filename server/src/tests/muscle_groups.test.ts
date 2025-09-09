import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { muscleGroupsTable, exercisesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateMuscleGroupInput, type DeleteInput } from '../schema';
import { createMuscleGroup, getAllMuscleGroups, deleteMuscleGroup } from '../handlers/muscle_groups';

// Test inputs
const testMuscleGroupInput: CreateMuscleGroupInput = {
    name: 'Chest',
    description: 'Chest muscles including pectorals'
};

const testMuscleGroupInputWithoutDescription: CreateMuscleGroupInput = {
    name: 'Arms',
    description: null
};

describe('createMuscleGroup', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should create a muscle group with description', async () => {
        const result = await createMuscleGroup(testMuscleGroupInput);

        // Basic field validation
        expect(result.name).toEqual('Chest');
        expect(result.description).toEqual('Chest muscles including pectorals');
        expect(result.id).toBeDefined();
        expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create a muscle group without description', async () => {
        const result = await createMuscleGroup(testMuscleGroupInputWithoutDescription);

        // Basic field validation
        expect(result.name).toEqual('Arms');
        expect(result.description).toBeNull();
        expect(result.id).toBeDefined();
        expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save muscle group to database', async () => {
        const result = await createMuscleGroup(testMuscleGroupInput);

        // Query using proper drizzle syntax
        const muscleGroups = await db.select()
            .from(muscleGroupsTable)
            .where(eq(muscleGroupsTable.id, result.id))
            .execute();

        expect(muscleGroups).toHaveLength(1);
        expect(muscleGroups[0].name).toEqual('Chest');
        expect(muscleGroups[0].description).toEqual('Chest muscles including pectorals');
        expect(muscleGroups[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle duplicate name constraint', async () => {
        // Create first muscle group
        await createMuscleGroup(testMuscleGroupInput);

        // Attempt to create duplicate should fail
        await expect(createMuscleGroup(testMuscleGroupInput)).rejects.toThrow(/unique/i);
    });
});

describe('getAllMuscleGroups', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return empty array when no muscle groups exist', async () => {
        const result = await getAllMuscleGroups();

        expect(result).toEqual([]);
    });

    it('should return all muscle groups', async () => {
        // Create test muscle groups
        await createMuscleGroup(testMuscleGroupInput);
        await createMuscleGroup(testMuscleGroupInputWithoutDescription);

        const result = await getAllMuscleGroups();

        expect(result).toHaveLength(2);
        
        // Check first muscle group
        const chestGroup = result.find(group => group.name === 'Chest');
        expect(chestGroup).toBeDefined();
        expect(chestGroup!.description).toEqual('Chest muscles including pectorals');
        expect(chestGroup!.created_at).toBeInstanceOf(Date);

        // Check second muscle group
        const armsGroup = result.find(group => group.name === 'Arms');
        expect(armsGroup).toBeDefined();
        expect(armsGroup!.description).toBeNull();
        expect(armsGroup!.created_at).toBeInstanceOf(Date);
    });

    it('should maintain proper ordering by creation', async () => {
        // Create muscle groups in specific order
        const first = await createMuscleGroup({ name: 'First', description: null });
        const second = await createMuscleGroup({ name: 'Second', description: null });

        const result = await getAllMuscleGroups();

        expect(result).toHaveLength(2);
        // Results should maintain database ordering (by id)
        expect(result[0].id).toBeLessThan(result[1].id);
    });
});

describe('deleteMuscleGroup', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should delete muscle group successfully', async () => {
        // Create test muscle group
        const muscleGroup = await createMuscleGroup(testMuscleGroupInput);

        const deleteInput: DeleteInput = { id: muscleGroup.id };
        const result = await deleteMuscleGroup(deleteInput);

        expect(result.success).toBe(true);

        // Verify muscle group is deleted from database
        const muscleGroups = await db.select()
            .from(muscleGroupsTable)
            .where(eq(muscleGroupsTable.id, muscleGroup.id))
            .execute();

        expect(muscleGroups).toHaveLength(0);
    });

    it('should delete muscle group and cascade delete related exercises', async () => {
        // Create test muscle group
        const muscleGroup = await createMuscleGroup(testMuscleGroupInput);

        // Create related exercise
        await db.insert(exercisesTable)
            .values({
                name: 'Bench Press',
                muscle_group_id: muscleGroup.id,
                description: 'Classic chest exercise',
                gif_url: null
            })
            .execute();

        // Verify exercise exists
        const exercisesBefore = await db.select()
            .from(exercisesTable)
            .where(eq(exercisesTable.muscle_group_id, muscleGroup.id))
            .execute();
        expect(exercisesBefore).toHaveLength(1);

        // Delete muscle group
        const deleteInput: DeleteInput = { id: muscleGroup.id };
        const result = await deleteMuscleGroup(deleteInput);

        expect(result.success).toBe(true);

        // Verify muscle group is deleted
        const muscleGroups = await db.select()
            .from(muscleGroupsTable)
            .where(eq(muscleGroupsTable.id, muscleGroup.id))
            .execute();
        expect(muscleGroups).toHaveLength(0);

        // Verify related exercises are also deleted
        const exercisesAfter = await db.select()
            .from(exercisesTable)
            .where(eq(exercisesTable.muscle_group_id, muscleGroup.id))
            .execute();
        expect(exercisesAfter).toHaveLength(0);
    });

    it('should handle deletion of non-existent muscle group', async () => {
        const deleteInput: DeleteInput = { id: 999 };
        const result = await deleteMuscleGroup(deleteInput);

        // Should still return success even if nothing was deleted
        expect(result.success).toBe(true);
    });

    it('should delete multiple related exercises', async () => {
        // Create test muscle group
        const muscleGroup = await createMuscleGroup(testMuscleGroupInput);

        // Create multiple related exercises
        await db.insert(exercisesTable)
            .values([
                {
                    name: 'Bench Press',
                    muscle_group_id: muscleGroup.id,
                    description: 'Classic chest exercise',
                    gif_url: null
                },
                {
                    name: 'Push Ups',
                    muscle_group_id: muscleGroup.id,
                    description: 'Bodyweight chest exercise',
                    gif_url: null
                },
                {
                    name: 'Incline Press',
                    muscle_group_id: muscleGroup.id,
                    description: 'Upper chest exercise',
                    gif_url: null
                }
            ])
            .execute();

        // Verify exercises exist
        const exercisesBefore = await db.select()
            .from(exercisesTable)
            .where(eq(exercisesTable.muscle_group_id, muscleGroup.id))
            .execute();
        expect(exercisesBefore).toHaveLength(3);

        // Delete muscle group
        const deleteInput: DeleteInput = { id: muscleGroup.id };
        const result = await deleteMuscleGroup(deleteInput);

        expect(result.success).toBe(true);

        // Verify all related exercises are deleted
        const exercisesAfter = await db.select()
            .from(exercisesTable)
            .where(eq(exercisesTable.muscle_group_id, muscleGroup.id))
            .execute();
        expect(exercisesAfter).toHaveLength(0);
    });
});