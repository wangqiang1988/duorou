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

/**
 * 自动迁移系统
 * 用 PRAGMA user_version 追踪当前 schema 版本
 * 每次升级只需要在 MIGRATIONS 列表追加新版本
 */
const TARGET_SCHEMA_VERSION = 4;

interface Migration {
	version: number;
	up: () => void;
}

const MIGRATIONS: Migration[] = [
	{
		version: 1,
		up: () => {
			// 初始 schema（兼容老库：CREATE IF NOT EXISTS 自动跳过已存在的表）
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
		}
	},
	{
		version: 2,
		up: () => {
			// plants 加 died_at 字段（兼容老库：先检查列是否存在）
			const cols = db
				.prepare("PRAGMA table_info(plants)")
				.all() as Array<{name: string}>;
			if (!cols.some((c) => c.name === 'died_at')) {
				db.exec('ALTER TABLE plants ADD COLUMN died_at INTEGER');
			}
			db.exec(
				'CREATE INDEX IF NOT EXISTS idx_plants_died ON plants(died_at)'
			);
		}
	},
	{
		version: 3,
		up: () => {
			// photos 加 kind (photo/text) + content (text 用) + 索引
			const cols = db
				.prepare("PRAGMA table_info(photos)")
				.all() as Array<{name: string}>;
			if (!cols.some((c) => c.name === 'kind')) {
				db.exec(
					"ALTER TABLE photos ADD COLUMN kind TEXT NOT NULL DEFAULT 'photo'"
				);
			}
			if (!cols.some((c) => c.name === 'content')) {
				db.exec('ALTER TABLE photos ADD COLUMN content TEXT NOT NULL DEFAULT ""');
			}
			db.exec(
				'CREATE INDEX IF NOT EXISTS idx_photos_kind ON photos(kind)'
			);
		}
	},
	{
		version: 4,
		up: () => {
			// photos 加 updated_at（最后一次编辑时间），用于主页按最近活动排序
			const cols = db
				.prepare("PRAGMA table_info(photos)")
				.all() as Array<{name: string}>;
			if (!cols.some((c) => c.name === 'updated_at')) {
				db.exec(
					'ALTER TABLE photos ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0'
				);
			}
			// 回填：老条目没有"编辑"概念，updated_at = created_at
			db.exec('UPDATE photos SET updated_at = created_at WHERE updated_at = 0');
			// 封面查询（plant_id + kind + taken_at 倒序取一张）
			db.exec(
				'CREATE INDEX IF NOT EXISTS idx_photos_plant_kind_taken ON photos(plant_id, kind, taken_at)'
			);
			// 每株植物最近活动（plant_id + updated_at 取 max）
			db.exec(
				'CREATE INDEX IF NOT EXISTS idx_photos_plant_updated ON photos(plant_id, updated_at)'
			);
		}
	}
];

function getCurrentVersion(): number {
	const row = db.pragma('user_version', {simple: true}) as number;
	return row ?? 0;
}

function runMigrations(): void {
	const current = getCurrentVersion();
	if (current >= TARGET_SCHEMA_VERSION) return;

	for (const m of MIGRATIONS) {
		if (m.version <= current) continue;
		const tx = db.transaction(() => {
			m.up();
			db.pragma(`user_version = ${m.version}`);
		});
		tx();
	}
	console.log(
		`[db] schema 迁移完成：v${current} → v${getCurrentVersion()}`
	);
}

runMigrations();

export interface PlantRow {
	id: string;
	name: string;
	species: string;
	acquired_at: number;
	notes: string;
	died_at: number | null;
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
	kind: 'photo' | 'text';
	content: string;
	size_orig: number;
	size_medium: number;
	size_thumb: number;
	created_at: number;
	updated_at: number;
}

export function rowToPlant(r: PlantRow) {
	return {
		id: r.id,
		name: r.name,
		species: r.species,
		acquiredAt: r.acquired_at,
		notes: r.notes,
		diedAt: r.died_at,
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
		kind: r.kind,
		content: r.content,
		sizeOrig: r.size_orig,
		sizeMedium: r.size_medium,
		sizeThumb: r.size_thumb,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	};
}