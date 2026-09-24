import { PHOTOS_DIR } from './db';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 文件按 ID 前两位分目录打散：
 *   abcdef123...  ->  photos/ab/abcdef123...
 *   thumb/medium/orig 都用同一 hash 前缀分目录
 */
export function photoPath(id: string, variant: 'orig' | 'medium' | 'thumb'): string {
	if (id.length < 3) throw new Error('photo id 太短');
	const sub = id.slice(0, 2);
	const filename = `${id}.${variant}.bin`;
	return path.join(PHOTOS_DIR, sub, filename);
}

export async function writePhotoBlob(
	id: string,
	variant: 'orig' | 'medium' | 'thumb',
	data: Buffer
): Promise<void> {
	const p = photoPath(id, variant);
	await fs.mkdir(path.dirname(p), { recursive: true });
	await fs.writeFile(p, data);
}

export async function readPhotoBlob(
	id: string,
	variant: 'orig' | 'medium' | 'thumb'
): Promise<Buffer> {
	return fs.readFile(photoPath(id, variant));
}

export async function deletePhotoFiles(id: string): Promise<void> {
	await Promise.all(
		(['orig', 'medium', 'thumb'] as const).map(async (v) => {
			try {
				await fs.unlink(photoPath(id, v));
			} catch (e) {
				if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
			}
		})
	);
}

export async function fileExists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}