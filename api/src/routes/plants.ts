import { db, rowToPlant, type PlantRow } from '../db';
import { nanoid } from 'nanoid';
import type { FastifyInstance } from 'fastify';

function coverPhotoId(plantId: string): string | null {
	const row = db
		.prepare('SELECT id FROM photos WHERE plant_id = ? ORDER BY taken_at ASC LIMIT 1')
		.get(plantId) as { id: string } | undefined;
	return row?.id ?? null;
}

export function registerPlantRoutes(app: FastifyInstance) {
	app.get('/api/plants', async () => {
		const rows = db
			.prepare('SELECT * FROM plants ORDER BY created_at DESC')
			.all() as PlantRow[];
		const counts = db
			.prepare('SELECT plant_id, COUNT(*) c FROM photos GROUP BY plant_id')
			.all() as Array<{plant_id: string; c: number}>;
		const countMap = new Map(counts.map((c) => [c.plant_id, c.c]));
		return rows.map((r) => {
			const plant = rowToPlant(r);
			return {
				...plant,
				photoCount: countMap.get(r.id) ?? 0,
				coverPhotoId: coverPhotoId(r.id)
			};
		});
	});

	app.get<{ Params: { id: string } }>('/api/plants/:id', async (req, reply) => {
		const row = db
			.prepare('SELECT * FROM plants WHERE id = ?')
			.get(req.params.id) as PlantRow | undefined;
		if (!row) return reply.code(404).send({ error: 'not found' });
		const photos = (db
			.prepare('SELECT COUNT(*) c FROM photos WHERE plant_id = ?')
			.get(req.params.id) as { c: number }).c;
		return {
			...rowToPlant(row),
			photoCount: photos,
			coverPhotoId: coverPhotoId(req.params.id)
		};
	});

	app.post<{
		Body: { name: string; species?: string; acquiredAt: number; notes?: string };
	}>('/api/plants', async (req, reply) => {
		const { name, species = '', acquiredAt, notes = '' } = req.body ?? {};
		if (!name?.trim()) return reply.code(400).send({ error: 'name required' });
		const now = Date.now();
		const id = nanoid(16);
		db.prepare(
			`INSERT INTO plants (id, name, species, acquired_at, notes, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		).run(id, name.trim(), species.trim(), acquiredAt, notes.trim(), now, now);
		return rowToPlant(
			db.prepare('SELECT * FROM plants WHERE id = ?').get(id) as PlantRow
		);
	});

	app.patch<{
		Params: { id: string };
		Body: { name?: string; species?: string; acquiredAt?: number; notes?: string };
	}>('/api/plants/:id', async (req, reply) => {
		const existing = db
			.prepare('SELECT * FROM plants WHERE id = ?')
			.get(req.params.id) as PlantRow | undefined;
		if (!existing) return reply.code(404).send({ error: 'not found' });

		const { name, species, acquiredAt, notes } = req.body ?? {};
		const next = {
			name: name?.trim() ?? existing.name,
			species: species?.trim() ?? existing.species,
			acquired_at: acquiredAt ?? existing.acquired_at,
			notes: notes?.trim() ?? existing.notes,
			updated_at: Date.now()
		};
		db.prepare(
			`UPDATE plants
			 SET name = ?, species = ?, acquired_at = ?, notes = ?, updated_at = ?
			 WHERE id = ?`
		).run(next.name, next.species, next.acquired_at, next.notes, next.updated_at, req.params.id);
		return rowToPlant(
			db.prepare('SELECT * FROM plants WHERE id = ?').get(req.params.id) as PlantRow
		);
	});

	app.delete<{ Params: { id: string } }>('/api/plants/:id', async (req, reply) => {
		const result = db.prepare('DELETE FROM plants WHERE id = ?').run(req.params.id);
		if (result.changes === 0) return reply.code(404).send({ error: 'not found' });
		return { ok: true };
	});
}