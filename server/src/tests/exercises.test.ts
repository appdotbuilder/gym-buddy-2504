import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { exercisesTable, muscleGroupsTable } from '../db/schema';
import { 
    type CreateExerciseInput, 
    type GetExercisesByMuscleGroupInput, 
    type DeleteInput 
} from '../schema';
import { 
    createExercise, 
    getAllExercises, 
    getExercisesByMuscleGroup, 
    deleteExercise 
} from '../handlers/exercises';
import { eq } from 'drizzle-orm';

describe('exercises handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let testMuscleGroupId: number;

    beforeEach(async () => {
        // Create test muscle group for exercises
        const muscleGroupResult = await db.insert(muscleGroupsTable)
            .values({
                name: 'Test Muscle Group',
                description: 'A muscle group for testing'
            })
            .returning()
            .execute();
        
        testMuscleGroupId = muscleGroupResult[0].id;
    });

    describe('createExercise', () => {
        const testInput: CreateExerciseInput = {
            name: 'Test Exercise',
            muscle_group_id: 0, // Will be set dynamically
            description: 'A test exercise',
            gif_url: 'https://example.com/exercise.gif'
        };

        it('should create an exercise', async () => {
            const input = { ...testInput, muscle_group_id: testMuscleGroupId };
            const result = await createExercise(input);

            expect(result.name).toEqual('Test Exercise');
            expect(result.muscle_group_id).toEqual(testMuscleGroupId);
            expect(result.description).toEqual('A test exercise');
            expect(result.gif_url).toEqual('https://example.com/exercise.gif');
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should save exercise to database', async () => {
            const input = { ...testInput, muscle_group_id: testMuscleGroupId };
            const result = await createExercise(input);

            const exercises = await db.select()
                .from(exercisesTable)
                .where(eq(exercisesTable.id, result.id))
                .execute();

            expect(exercises).toHaveLength(1);
            expect(exercises[0].name).toEqual('Test Exercise');
            expect(exercises[0].muscle_group_id).toEqual(testMuscleGroupId);
            expect(exercises[0].description).toEqual('A test exercise');
            expect(exercises[0].gif_url).toEqual('https://example.com/exercise.gif');
        });

        it('should create exercise with null fields', async () => {
            const input: CreateExerciseInput = {
                name: 'Simple Exercise',
                muscle_group_id: testMuscleGroupId,
                description: null,
                gif_url: null
            };

            const result = await createExercise(input);

            expect(result.name).toEqual('Simple Exercise');
            expect(result.description).toBeNull();
            expect(result.gif_url).toBeNull();
        });

        it('should throw error for non-existent muscle group', async () => {
            const input = { ...testInput, muscle_group_id: 999 };
            
            expect(createExercise(input)).rejects.toThrow(/muscle group with id 999 not found/i);
        });
    });

    describe('getAllExercises', () => {
        beforeEach(async () => {
            // Create another muscle group
            const anotherMuscleGroup = await db.insert(muscleGroupsTable)
                .values({
                    name: 'Another Muscle Group',
                    description: 'Another test group'
                })
                .returning()
                .execute();

            // Create test exercises
            await db.insert(exercisesTable)
                .values([
                    {
                        name: 'Exercise 1',
                        muscle_group_id: testMuscleGroupId,
                        description: 'First exercise',
                        gif_url: 'https://example.com/exercise1.gif'
                    },
                    {
                        name: 'Exercise 2',
                        muscle_group_id: anotherMuscleGroup[0].id,
                        description: 'Second exercise',
                        gif_url: null
                    }
                ])
                .execute();
        });

        it('should return all exercises with muscle group data', async () => {
            const results = await getAllExercises();

            expect(results).toHaveLength(2);
            
            // Check first exercise
            const exercise1 = results.find(e => e.name === 'Exercise 1');
            expect(exercise1).toBeDefined();
            expect(exercise1!.muscle_group.name).toEqual('Test Muscle Group');
            expect(exercise1!.description).toEqual('First exercise');
            expect(exercise1!.gif_url).toEqual('https://example.com/exercise1.gif');

            // Check second exercise
            const exercise2 = results.find(e => e.name === 'Exercise 2');
            expect(exercise2).toBeDefined();
            expect(exercise2!.muscle_group.name).toEqual('Another Muscle Group');
            expect(exercise2!.description).toEqual('Second exercise');
            expect(exercise2!.gif_url).toBeNull();
        });

        it('should return empty array when no exercises exist', async () => {
            // Clear all exercises
            await db.delete(exercisesTable).execute();

            const results = await getAllExercises();
            expect(results).toHaveLength(0);
        });
    });

    describe('getExercisesByMuscleGroup', () => {
        let anotherMuscleGroupId: number;

        beforeEach(async () => {
            // Create another muscle group
            const anotherMuscleGroup = await db.insert(muscleGroupsTable)
                .values({
                    name: 'Another Muscle Group',
                    description: 'Another test group'
                })
                .returning()
                .execute();
            
            anotherMuscleGroupId = anotherMuscleGroup[0].id;

            // Create exercises for different muscle groups
            await db.insert(exercisesTable)
                .values([
                    {
                        name: 'Exercise 1',
                        muscle_group_id: testMuscleGroupId,
                        description: 'First exercise',
                        gif_url: 'https://example.com/exercise1.gif'
                    },
                    {
                        name: 'Exercise 2',
                        muscle_group_id: testMuscleGroupId,
                        description: 'Second exercise',
                        gif_url: null
                    },
                    {
                        name: 'Exercise 3',
                        muscle_group_id: anotherMuscleGroupId,
                        description: 'Third exercise',
                        gif_url: 'https://example.com/exercise3.gif'
                    }
                ])
                .execute();
        });

        it('should return exercises for specific muscle group', async () => {
            const input: GetExercisesByMuscleGroupInput = {
                muscle_group_id: testMuscleGroupId
            };

            const results = await getExercisesByMuscleGroup(input);

            expect(results).toHaveLength(2);
            results.forEach(exercise => {
                expect(exercise.muscle_group_id).toEqual(testMuscleGroupId);
            });

            const exerciseNames = results.map(e => e.name);
            expect(exerciseNames).toContain('Exercise 1');
            expect(exerciseNames).toContain('Exercise 2');
        });

        it('should return empty array for muscle group with no exercises', async () => {
            // Create muscle group with no exercises
            const emptyMuscleGroup = await db.insert(muscleGroupsTable)
                .values({
                    name: 'Empty Muscle Group',
                    description: 'No exercises here'
                })
                .returning()
                .execute();

            const input: GetExercisesByMuscleGroupInput = {
                muscle_group_id: emptyMuscleGroup[0].id
            };

            const results = await getExercisesByMuscleGroup(input);
            expect(results).toHaveLength(0);
        });

        it('should throw error for non-existent muscle group', async () => {
            const input: GetExercisesByMuscleGroupInput = {
                muscle_group_id: 999
            };

            expect(getExercisesByMuscleGroup(input)).rejects.toThrow(/muscle group with id 999 not found/i);
        });
    });

    describe('deleteExercise', () => {
        let testExerciseId: number;

        beforeEach(async () => {
            // Create test exercise
            const exerciseResult = await db.insert(exercisesTable)
                .values({
                    name: 'Exercise to Delete',
                    muscle_group_id: testMuscleGroupId,
                    description: 'This will be deleted',
                    gif_url: 'https://example.com/delete.gif'
                })
                .returning()
                .execute();
            
            testExerciseId = exerciseResult[0].id;
        });

        it('should delete exercise successfully', async () => {
            const input: DeleteInput = { id: testExerciseId };
            const result = await deleteExercise(input);

            expect(result.success).toBe(true);

            // Verify exercise was deleted
            const exercises = await db.select()
                .from(exercisesTable)
                .where(eq(exercisesTable.id, testExerciseId))
                .execute();

            expect(exercises).toHaveLength(0);
        });

        it('should throw error for non-existent exercise', async () => {
            const input: DeleteInput = { id: 999 };

            expect(deleteExercise(input)).rejects.toThrow(/exercise with id 999 not found/i);
        });
    });
});