import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foodItemsTable } from '../db/schema';
import { type SearchFoodItemsInput, type CreateFoodItemInput } from '../schema';
import { searchFoodItems } from '../handlers/food_items';
import { eq } from 'drizzle-orm';

// Test data for food items
const testFoodItems = [
    {
        name: 'Apple',
        calories_per_100g: 52,
        image_url: 'https://example.com/apple.jpg'
    },
    {
        name: 'Banana',
        calories_per_100g: 89,
        image_url: 'https://example.com/banana.jpg'
    },
    {
        name: 'Orange',
        calories_per_100g: 47,
        image_url: null
    },
    {
        name: 'Green Apple',
        calories_per_100g: 58,
        image_url: 'https://example.com/green-apple.jpg'
    },
    {
        name: 'Pineapple',
        calories_per_100g: 50,
        image_url: null
    }
];

describe('searchFoodItems', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should search food items by name containing query', async () => {
        // Create test food items
        await db.insert(foodItemsTable)
            .values(testFoodItems)
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: 'Apple'
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(3); // Should find 'Apple', 'Green Apple', and 'Pineapple'
        
        // Verify all results contain 'Apple' in the name
        results.forEach(item => {
            expect(item.name.toLowerCase()).toContain('apple');
            expect(typeof item.calories_per_100g).toBe('number');
            expect(item.id).toBeDefined();
            expect(item.created_at).toBeInstanceOf(Date);
            expect(item.updated_at).toBeInstanceOf(Date);
        });

        // Verify specific items are found
        const foundNames = results.map(item => item.name).sort();
        expect(foundNames).toEqual(['Apple', 'Green Apple', 'Pineapple']);
        
        const appleItem = results.find(item => item.name === 'Apple');
        const greenAppleItem = results.find(item => item.name === 'Green Apple');
        const pineappleItem = results.find(item => item.name === 'Pineapple');
        
        expect(appleItem).toBeDefined();
        expect(greenAppleItem).toBeDefined();
        expect(pineappleItem).toBeDefined();
        expect(appleItem!.calories_per_100g).toBe(52);
        expect(greenAppleItem!.calories_per_100g).toBe(58);
        expect(pineappleItem!.calories_per_100g).toBe(50);
    });

    it('should perform case-insensitive search', async () => {
        // Create test food items
        await db.insert(foodItemsTable)
            .values(testFoodItems)
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: 'BANANA'
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Banana');
        expect(results[0].calories_per_100g).toBe(89);
        expect(typeof results[0].calories_per_100g).toBe('number');
    });

    it('should search for partial matches', async () => {
        // Create test food items
        await db.insert(foodItemsTable)
            .values(testFoodItems)
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: 'app'
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(3); // Should find 'Apple', 'Green Apple', and 'Pineapple'
        
        const foundNames = results.map(item => item.name).sort();
        expect(foundNames).toEqual(['Apple', 'Green Apple', 'Pineapple']);

        // Verify numeric conversion for all items
        results.forEach(item => {
            expect(typeof item.calories_per_100g).toBe('number');
        });
    });

    it('should return empty array when no matches found', async () => {
        // Create test food items
        await db.insert(foodItemsTable)
            .values(testFoodItems)
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: 'NonExistentFood'
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(0);
        expect(results).toEqual([]);
    });

    it('should handle empty database', async () => {
        // Don't insert any items
        const searchInput: SearchFoodItemsInput = {
            query: 'Apple'
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(0);
        expect(results).toEqual([]);
    });

    it('should handle special characters in search query', async () => {
        // Create a food item with special characters
        await db.insert(foodItemsTable)
            .values([{
                name: 'Açaí Berry',
                calories_per_100g: 70,
                image_url: null
            }])
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: 'Açaí'
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Açaí Berry');
        expect(results[0].calories_per_100g).toBe(70);
        expect(typeof results[0].calories_per_100g).toBe('number');
    });

    it('should handle whitespace in search queries', async () => {
        // Create test food items
        await db.insert(foodItemsTable)
            .values(testFoodItems)
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: ' apple '
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(3); // Should find 'Apple', 'Green Apple', and 'Pineapple'
        
        const foundNames = results.map(item => item.name).sort();
        expect(foundNames).toEqual(['Apple', 'Green Apple', 'Pineapple']);
    });

    it('should return all fields correctly formatted', async () => {
        // Create a single food item with all fields
        const insertResult = await db.insert(foodItemsTable)
            .values([{
                name: 'Test Food',
                calories_per_100g: 125,
                image_url: 'https://example.com/test.jpg'
            }])
            .returning()
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: 'Test'
        };

        const results = await searchFoodItems(searchInput);

        expect(results).toHaveLength(1);
        
        const item = results[0];
        expect(item.id).toBe(insertResult[0].id);
        expect(item.name).toBe('Test Food');
        expect(item.calories_per_100g).toBe(125);
        expect(typeof item.calories_per_100g).toBe('number');
        expect(item.image_url).toBe('https://example.com/test.jpg');
        expect(item.created_at).toBeInstanceOf(Date);
        expect(item.updated_at).toBeInstanceOf(Date);
        expect(item.created_at).toEqual(insertResult[0].created_at);
        expect(item.updated_at).toEqual(insertResult[0].updated_at);
    });

    it('should handle single character search', async () => {
        // Create test food items
        await db.insert(foodItemsTable)
            .values(testFoodItems)
            .execute();

        const searchInput: SearchFoodItemsInput = {
            query: 'a'
        };

        const results = await searchFoodItems(searchInput);

        // Should find items containing 'a': Apple, Banana, Orange, Green Apple, Pineapple
        expect(results).toHaveLength(5);
        
        results.forEach(item => {
            expect(item.name.toLowerCase()).toContain('a');
            expect(typeof item.calories_per_100g).toBe('number');
        });
    });
});