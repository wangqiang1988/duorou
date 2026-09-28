import { db, rowToPhoto, type PhotoRow } from '../db';
import {
	writePhotoBlob,
	readPhotoBlob,
	deletePhotoFiles,
	photoPath
} from '../storage';
import { nanoid } from 'nanoid';
import type { FastifyInstance } from 'fastify';

export function registerPhotoRoutes(app: FastifyInstance) {
	// 列出照片（可选 plantId）
	app.get<{ Querystring: { plantId?: string } }>('/api/photos', async (req) => {
		const plantId = req.query.plantId;
		const rows = plantId
			? (db
					.prepare('SELECT * FROM photos WHERE plant_id = ? ORDER BY taken_at DESC')
					.all(plantId) as PhotoRow[])
			: (db.prepare('SELECT * FROM photos ORDER BY taken_at DESC').all() as PhotoRow[]);
		return rows.map(rowToPhoto);
	});

	app.get<{ Params: { id: string } }>('/api/photos/:id', async (req, reply) => {
		const row = db
			.prepare('SELECT * FROM photos WHERE id = ?')
			.get(req.params.id) as PhotoRow | undefined;
		if (!row) return reply.code(404).send({ error: 'not found' });
		return rowToPhoto(row);
	});

	// 上传：multipart 字段：file(原图)、thumb、medium、plantId、takenAt、width、height、mime、dateSource、kind、content
	app.post('/api/photos', async (req, reply) => {
		let plantId = '';
		let takenAt = 0;
		let width = 0;
		let height = 0;
		let mime = 'image/jpeg';
		let dateSource: 'exif' | 'file' | 'now' = 'now';
		let kind: 'photo' | 'text' = 'photo';
		let content = '';
		const id = nanoid(16);
		let origBuf: Buffer | null = null;
		let mediumBuf: Buffer | null = null;
		let thumbBuf: Buffer | null = null;

		const parts = req.parts();
		for await (const part of parts) {
			if (part.type === 'file') {
				if (part.fieldname === 'file') {
					origBuf = await part.toBuffer();
				} else if (part.fieldname === 'medium') {
					mediumBuf = await part.toBuffer();
				} else if (part.fieldname === 'thumb') {
					thumbBuf = await part.toBuffer();
				}
			} else if (part.type === 'field') {
				if (part.fieldname === 'plantId') plantId = String(part.value);
				else if (part.fieldname === 'takenAt') takenAt = Number(part.value);
				else if (part.fieldname === 'width') width = Number(part.value);
				else if (part.fieldname === 'height') height = Number(part.value);
				else if (part.fieldname === 'mime') mime = String(part.value);
				else if (part.fieldname === 'dateSource')
					dateSource = String(part.value) as typeof dateSource;
				else if (part.fieldname === 'kind') {
					const v = String(part.value);
					if (v === 'text' || v === 'photo') kind = v;
				} else if (part.fieldname === 'content') {
					content = String(part.value);
				}
			}
		}

		if (!plantId) return reply.code(400).send({ error: 'plantId required' });

		if (kind === 'text') {
			if (!content.trim()) return reply.code(400).send({ error: 'content required' });
		} else {
			if (!origBuf) return reply.code(400).send({ error: 'file required' });
		}

		// 校验植物存在
		const plant = db.prepare('SELECT id FROM plants WHERE id = ?').get(plantId);
		if (!plant) return reply.code(404).send({ error: 'plant not found' });

		if (kind === 'photo') {
			await writePhotoBlob(id, 'orig', origBuf!);
			if (mediumBuf) await writePhotoBlob(id, 'medium', mediumBuf);
			if (thumbBuf) await writePhotoBlob(id, 'thumb', thumbBuf);
		}

		const now = Date.now();
		db.prepare(
			`INSERT INTO photos (id, plant_id, taken_at, width, height, caption, mime, date_source,
			                    kind, content, size_orig, size_medium, size_thumb, created_at)
			 VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			plantId,
			takenAt || now,
			width,
			height,
			mime,
			dateSource,
			kind,
			content,
			kind === 'photo' ? origBuf!.length : 0,
			mediumBuf?.length ?? 0,
			thumbBuf?.length ?? 0,
			now
		);

		const row = db.prepare('SELECT * FROM photos WHERE id = ?').get(id) as PhotoRow;
		return rowToPhoto(row);
	});

	// 获取图片二进制（不同尺寸）
	app.get<{
		Params: { id: string };
		Querystring: { v?: 'orig' | 'medium' | 'thumb' };
	}>('/api/photos/:id/blob', async (req, reply) => {
		const v = req.query.v ?? 'medium';
		if (!['orig', 'medium', 'thumb'].includes(v))
			return reply.code(400).send({ error: 'invalid variant' });

		const row = db
			.prepare('SELECT mime FROM photos WHERE id = ?')
			.get(req.params.id) as { mime: string } | undefined;
		if (!row) return reply.code(404).send({ error: 'not found' });

		try {
			const buf = await readPhotoBlob(req.params.id, v);
			reply.header('Content-Type', row.mime);
			reply.header('Cache-Control', 'public, max-age=31536000, immutable');
			return reply.send(buf);
		} catch {
			return reply.code(404).send({ error: 'blob missing' });
		}
	});

	// 修改元数据（takenAt / caption）
	app.patch<{
		Params: { id: string };
		Body: { takenAt?: number; caption?: string; content?: string };
	}>('/api/photos/:id', async (req, reply) => {
		const existing = db
			.prepare('SELECT * FROM photos WHERE id = ?')
			.get(req.params.id) as PhotoRow | undefined;
		if (!existing) return reply.code(404).send({ error: 'not found' });

		const { takenAt, caption, content } = req.body ?? {};
		const patchTaken = takenAt ?? existing.taken_at;
		const patchCaption = caption ?? existing.caption;
		const patchContent = content ?? existing.content;
		db.prepare(
			`UPDATE photos SET taken_at = ?, caption = ?, content = ? WHERE id = ?`
		).run(patchTaken, patchCaption, patchContent, req.params.id);

		return rowToPhoto(
			db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id) as PhotoRow
		);
	});

	// 删除
	app.delete<{ Params: { id: string } }>('/api/photos/:id', async (req, reply) => {
		const result = db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
		if (result.changes === 0) return reply.code(404).send({ error: 'not found' });
		await deletePhotoFiles(req.params.id).catch(() => undefined);
		return { ok: true };
	});

	// 健康/调试：返回磁盘占用统计
	app.get('/api/stats', async () => {
		const plantCount = (db.prepare('SELECT COUNT(*) c FROM plants').get() as { c: number }).c;
		const photoCount = (db.prepare('SELECT COUNT(*) c FROM photos').get() as { c: number }).c;
		const totalBytes = (db
			.prepare('SELECT COALESCE(SUM(size_orig), 0) s FROM photos')
			.get() as { s: number }).s;
		return { plants: plantCount, photos: photoCount, totalBytes };
	});
}