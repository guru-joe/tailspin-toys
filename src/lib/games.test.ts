import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getAllCategories,
    getAllPublishers,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

/** Seeds two categories and two publishers, with games spread across each combination. */
async function seedGamesAcrossCategoriesAndPublishers(db: Database): Promise<{
    strategy: number;
    puzzle: number;
    pubOne: number;
    pubTwo: number;
}> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'cat' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'pub' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Strategy Pub One Game',
            description: 'd',
            starRating: 4,
            categoryId: strategy.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Strategy Pub Two Game',
            description: 'd',
            starRating: 4,
            categoryId: strategy.id,
            publisherId: pubTwo.id,
        },
        {
            title: 'Puzzle Pub One Game',
            description: 'd',
            starRating: 4,
            categoryId: puzzle.id,
            publisherId: pubOne.id,
        },
        {
            title: 'Puzzle Pub Two Game',
            description: 'd',
            starRating: 4,
            categoryId: puzzle.id,
            publisherId: pubTwo.id,
        },
    ]);

    return { strategy: strategy.id, puzzle: puzzle.id, pubOne: pubOne.id, pubTwo: pubTwo.id };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});

describe('getAllGames filtering', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('filters games by a single category', async () => {
        const { strategy } = await seedGamesAcrossCategoriesAndPublishers(db);
        const result = await getAllGames(db, { categoryIds: [strategy] });
        expect(result.map((g) => g.title).sort()).toEqual(['Strategy Pub One Game', 'Strategy Pub Two Game']);
    });

    it('filters games by multiple categories (OR within the list)', async () => {
        const { strategy, puzzle } = await seedGamesAcrossCategoriesAndPublishers(db);
        const result = await getAllGames(db, { categoryIds: [strategy, puzzle] });
        expect(result).toHaveLength(4);
    });

    it('filters games by a single publisher', async () => {
        const { pubOne } = await seedGamesAcrossCategoriesAndPublishers(db);
        const result = await getAllGames(db, { publisherIds: [pubOne] });
        expect(result.map((g) => g.title).sort()).toEqual(['Puzzle Pub One Game', 'Strategy Pub One Game']);
    });

    it('combines category and publisher filters with AND semantics', async () => {
        const { strategy, pubOne } = await seedGamesAcrossCategoriesAndPublishers(db);
        const result = await getAllGames(db, { categoryIds: [strategy], publisherIds: [pubOne] });
        expect(result.map((g) => g.title)).toEqual(['Strategy Pub One Game']);
    });

    it('returns an empty array when no games match the filter combination', async () => {
        const { pubOne } = await seedGamesAcrossCategoriesAndPublishers(db);
        const result = await getAllGames(db, { categoryIds: [999999], publisherIds: [pubOne] });
        expect(result).toEqual([]);
    });

    it('returns all games when filters are omitted', async () => {
        await seedGamesAcrossCategoriesAndPublishers(db);
        const result = await getAllGames(db);
        expect(result).toHaveLength(4);
    });
});

describe('getAllCategories', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns categories ordered by name', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'cat' },
            { name: 'Arcade', description: 'cat' },
        ]);
        const result = await getAllCategories(db);
        expect(result.map((c) => c.name)).toEqual(['Arcade', 'Strategy']);
    });

    it('returns an empty array when there are no categories', async () => {
        expect(await getAllCategories(db)).toEqual([]);
    });
});

describe('getAllPublishers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns publishers ordered by name', async () => {
        await db.insert(publishers).values([
            { name: 'Zeta Games', description: 'pub' },
            { name: 'Acme Games', description: 'pub' },
        ]);
        const result = await getAllPublishers(db);
        expect(result.map((p) => p.name)).toEqual(['Acme Games', 'Zeta Games']);
    });

    it('returns an empty array when there are no publishers', async () => {
        expect(await getAllPublishers(db)).toEqual([]);
    });
});
