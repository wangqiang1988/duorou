import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), '../data');
export const DB_PATH = path.join(DATA_DIR, 'meta.sqlite');
export const PHOTOS_DIR = path.join(DATA_DIR, 'photos');

// 确保目录存在
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS plants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    species     TEXT NOT NULL DEFAULT '',
    acquired_at INTEGER NOT NULL,
    notes       TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id           TEXT PRIMARY KEY,
    plant_id     TEXT NOT NULL,
    taken_at     INTEGER NOT NULL,
    width        INTEGER NOT NULL DEFAULT 0,
    height       INTEGER NOT NULL DEFAULT 0,
    caption      TEXT NOT NULL DEFAULT '',
    mime         TEXT NOT NULL DEFAULT 'image/jpeg',
    date_source  TEXT NOT NULL DEFAULT 'now',
    size_orig    INTEGER NOT NULL DEFAULT 0,
    size_medium  INTEGER NOT NULL DEFAULT 0,
    size_thumb   INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_photos_plant ON photos(plant_id);
  CREATE INDEX IF NOT EXISTS idx_photos_taken ON photos(taken_at);
`);

export interface PlantRow {
	id: string;
	name: string;
	species: string;
	acquired_at: number;
	notes: string;
	created_at: number;
	updated_at: number;
}

export interface PhotoRow {
	id: string;
	plant_id: string;
	taken_at: number;
	width: number;
	height: number;
	caption: string;
	mime: string;
	date_source: 'exif' | 'file' | 'now';
	size_orig: number;
	size_medium: number;
	size_thumb: number;
	created_at: number;
}

export function rowToPlant(r: PlantRow) {
	return {
		id: r.id,
		name: r.name,
		species: r.species,
		acquiredAt: r.acquired_at,
		notes: r.notes,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	};
}

export function rowToPhoto(r: PhotoRow) {
	return {
		id: r.id,
		plantId: r.plant_id,
		takenAt: r.taken_at,
		width: r.width,
		height: r.height,
		caption: r.caption,
		mime: r.mime,
		dateSource: r.date_source,
		sizeOrig: r.size_orig,
		sizeMedium: r.size_medium,
		sizeThumb: r.size_thumb,
		createdAt: r.created_at
	};
}