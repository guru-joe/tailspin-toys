import { eq, asc, and, inArray, type SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game, Category, Publisher } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** Optional filters for narrowing the game list by category and/or publisher. */
export interface GameFilters {
    /** Match games belonging to any of these category ids (OR within the list). */
    categoryIds?: number[];
    /** Match games belonging to any of these publisher ids (OR within the list). */
    publisherIds?: number[];
}

/** Build the combined `AND` filter clause for the given category/publisher ids. */
function buildGameFilterClause(filters?: GameFilters): SQL | undefined {
    const clauses: SQL[] = [];
    if (filters?.categoryIds && filters.categoryIds.length > 0) {
        clauses.push(inArray(games.categoryId, filters.categoryIds));
    }
    if (filters?.publisherIds && filters.publisherIds.length > 0) {
        clauses.push(inArray(games.publisherId, filters.publisherIds));
    }
    return clauses.length > 0 ? and(...clauses) : undefined;
}

/** All games ordered by title, optionally narrowed by category and/or publisher. */
export async function getAllGames(db: Database, filters?: GameFilters): Promise<Game[]> {
    const whereClause = buildGameFilterClause(filters);
    const query = baseGamesQuery(db);
    const rows = await (whereClause ? query.where(whereClause) : query).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All categories ordered by name. */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
    return rows;
}

/** All publishers ordered by name. */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
    return rows;
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const rows = await baseGamesQuery(db).where(eq(games.id, id)).limit(1);
    return rows.length > 0 ? mapGame(rows[0]) : null;
}
