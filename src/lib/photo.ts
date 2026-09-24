import exifr from 'exifr';

const THUMB_MAX = 320;
const MEDIUM_MAX = 1280;

export type DateSource = 'exif' | 'file' | 'now';

export interface TakenAtResult {
	takenAt: number;
	source: DateSource;
	sourceField?: string;
}

export async function readTakenAt(file: File): Promise<TakenAtResult> {
	try {
		const data = await exifr.parse(file, [
			'DateTimeOriginal',
			'CreateDate',
			'ModifyDate'
		]);
		const fields: Array<['DateTimeOriginal' | 'CreateDate' | 'ModifyDate', string]> = [
			['DateTimeOriginal', 'DateTimeOriginal'],
			['CreateDate', 'CreateDate'],
			['ModifyDate', 'ModifyDate']
		];
		for (const [key, label] of fields) {
			const raw = data?.[key] as Date | string | undefined;
			if (!raw) continue;
			const d = raw instanceof Date ? raw : new Date(raw);
			if (!isNaN(d.getTime())) {
				return {takenAt: d.getTime(), source: 'exif', sourceField: label};
			}
		}
	} catch {
		/* EXIF 读取失败 */
	}
	if (file.lastModified) {
		return {takenAt: file.lastModified, source: 'file'};
	}
	return {takenAt: Date.now(), source: 'now'};
}

export function isSuspiciousDate(ts: number): boolean {
	const now = Date.now();
	const oneDay = 86400000;
	if (ts > now + oneDay) return true;
	if (ts < now - 3650 * oneDay) return true;
	return false;
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
	return createImageBitmap(file, {imageOrientation: 'from-image'});
}

function bitmapToBlob(
	bitmap: ImageBitmap,
	maxSide: number,
	mime: string,
	quality: number
): Promise<{blob: Blob; width: number; height: number}> {
	const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const w = Math.round(bitmap.width * ratio);
	const h = Math.round(bitmap.height * ratio);
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context unavailable');
	ctx.drawImage(bitmap, 0, 0, w, h);
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Canvas toBlob 返回空'));
					return;
				}
				resolve({blob, width: w, height: h});
			},
			mime,
			quality
		);
	});
}

export interface ProcessedPhoto {
	takenAt: number;
	width: number;
	height: number;
	mime: string;
	dateSource: DateSource;
	orig: Blob;
	medium: Blob;
	thumb: Blob;
}

export async function processPhotoFile(file: File): Promise<ProcessedPhoto> {
	const result = await readTakenAt(file);
	const mime = file.type.startsWith('image/') ? file.type : 'image/jpeg';

	const bitmap = await fileToImageBitmap(file);
	const thumbResult = await bitmapToBlob(bitmap, THUMB_MAX, mime, 0.78);
	const mediumResult = await bitmapToBlob(bitmap, MEDIUM_MAX, mime, 0.85);
	bitmap.close();

	return {
		takenAt: result.takenAt,
		width: mediumResult.width,
		height: mediumResult.height,
		mime,
		dateSource: result.source,
		orig: file,
		medium: mediumResult.blob,
		thumb: thumbResult.blob
	};
}

export function formatDay(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatMonth(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

export function daysSince(ts: number): number {
	return Math.floor((Date.now() - ts) / 86400000);
}