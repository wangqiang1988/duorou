import { db, rowToPlant, type PlantRow } from '../db';
import { nanoid } from 'nanoid';
import type { FastifyInstance } from 'fastify';

interface PlantStatsRow extends PlantRow {
	photo_count: number;
	cover_photo_id: string | null;
	last_activity: number;
}

/**
 * 植物列表 / 详情共用的查询。
 *
 * - cover_photo_id：封面 = 拍摄时间最新（taken_at DESC）的那张 kind='photo' 的照片
 * - last_activity：最近活动时间 = max(植物自身 updated_at, 该植物所有条目的 max(updated_at))
 *   传新照片 / 改日期 / 编辑文字 / 改植物信息 / 标记死亡 都会刷新它，
 *   主页按它倒序排 → 刚动过的植物排最前。
 */
const PLANT_STATS_SELECT = `
	SELECT p.*,
	  (SELECT COUNT(*) FROM photos WHERE plant_id = p.id) AS photo_count,
	  (SELECT id FROM photos
	     WHERE plant_id = p.id AND kind = 'photo'
	     ORDER BY taken_at DESC LIMIT 1) AS cover_photo_id,
	  MAX(p.updated_at,
	      COALESCE((SELECT MAX(updated_at) FROM photos WHERE plant_id = p.id), 0)
	  ) AS last_activity
	FROM plants p
`;

function rowToPlantWithStats(r: PlantStatsRow) {
	return {
		...rowToPlant(r),
		photoCount: r.photo_count,
		coverPhotoId: r.cover_photo_id,
		lastActivityAt: r.last_activity
	};
}

export function registerPlantRoutes(app: FastifyInstance) {
	app.get<{ Querystring: { mode?: 'alive' | 'dead' | 'all' } }>(
		'/api/plants',
		async (req) => {
			const mode = req.query.mode ?? 'all';
			let where = '';
			if (mode === 'alive') where = 'WHERE p.died_at IS NULL';
			else if (mode === 'dead') where = 'WHERE p.died_at IS NOT NULL';
			const rows = db
				.prepare(
					`${PLANT_STATS_SELECT} ${where} ORDER BY last_activity DESC, p.created_at DESC`
				)
				.all() as PlantStatsRow[];
			return rows.map(rowToPlantWithStats);
		}
	);

	app.get<{ Params: { id: string } }>('/api/plants/:id', async (req, reply) => {
		const row = db
			.prepare(`${PLANT_STATS_SELECT} WHERE p.id = ?`)
			.get(req.params.id) as PlantStatsRow | undefined;
		if (!row) return reply.code(404).send({ error: 'not found' });
		return rowToPlantWithStats(row);
	});

	app.post<{
		Body: { name: string; species?: string; acquiredAt: number; notes?: string; diedAt?: number | null };
	}>('/api/plants', async (req, reply) => {
		const { name, species = '', acquiredAt, notes = '', diedAt = null } = req.body ?? {};
		if (!name?.trim()) return reply.code(400).send({ error: 'name required' });
		const now = Date.now();
		const id = nanoid(16);
		db.prepare(
			`INSERT INTO plants (id, name, species, acquired_at, notes, died_at, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		).run(id, name.trim(), species.trim(), acquiredAt, notes.trim(), diedAt, now, now);
		const row = db
			.prepare(`${PLANT_STATS_SELECT} WHERE p.id = ?`)
			.get(id) as PlantStatsRow;
		return rowToPlantWithStats(row);
	});

	app.patch<{
		Params: { id: string };
		Body: {
			name?: string;
			species?: string;
			acquiredAt?: number;
			notes?: string;
			diedAt?: number | null;
		};
	}>('/api/plants/:id', async (req, reply) => {
		const existing = db
			.prepare('SELECT * FROM plants WHERE id = ?')
			.get(req.params.id) as PlantRow | undefined;
		if (!existing) return reply.code(404).send({ error: 'not found' });

		const { name, species, acquiredAt, notes, diedAt } = req.body ?? {};
		const next = {
			name: name?.trim() ?? existing.name,
			species: species?.trim() ?? existing.species,
			acquired_at: acquiredAt ?? existing.acquired_at,
			notes: notes?.trim() ?? existing.notes,
			died_at: diedAt !== undefined ? diedAt : existing.died_at,
			updated_at: Date.now()
		};
		db.prepare(
			`UPDATE plants
			 SET name = ?, species = ?, acquired_at = ?, notes = ?, died_at = ?, updated_at = ?
			 WHERE id = ?`
		).run(
			next.name,
			next.species,
			next.acquired_at,
			next.notes,
			next.died_at,
			next.updated_at,
			req.params.id
		);
		const row = db
			.prepare(`${PLANT_STATS_SELECT} WHERE p.id = ?`)
			.get(req.params.id) as PlantStatsRow;
		return rowToPlantWithStats(row);
	});

	app.delete<{ Params: { id: string } }>('/api/plants/:id', async (req, reply) => {
		const result = db.prepare('DELETE FROM plants WHERE id = ?').run(req.params.id);
		if (result.changes === 0) return reply.code(404).send({ error: 'not found' });
		return { ok: true };
	});
}