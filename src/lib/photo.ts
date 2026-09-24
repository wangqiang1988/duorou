import exifr from 'exifr';
import { uid } from './db';
import type { Photo } from './types';

const THUMB_MAX = 320;
const MEDIUM_MAX = 1280;

export async function readTakenAt(file: File): Promise<number> {
	try {
		const data = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
		const date: Date | string | undefined =
			(data?.DateTimeOriginal as Date | string | undefined) ??
			(data?.CreateDate as Date | string | undefined);
		if (date) {
			const d = date instanceof Date ? date : new Date(date);
			if (!isNaN(d.getTime())) return d.getTime();
		}
	} catch {
		/* EXIF 读取失败就用 fallback */
	}
	return file.lastModified || Date.now();
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	return bitmap;
}

function bitmapToBlob(
	bitmap: ImageBitmap,
	maxSide: number,
	mime: string,
	quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
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
				resolve({ blob, width: w, height: h });
			},
			mime,
			quality
		);
	});
}

export interface ProcessedPhoto {
	id: string;
	takenAt: number;
	width: number;
	height: number;
	mime: string;
	thumb: Blob;
	medium: Blob;
	original: Blob;
}

export async function processPhotoFile(
	file: File,
	defaultTakenAt?: number
): Promise<ProcessedPhoto> {
	const takenAt = defaultTakenAt ?? (await readTakenAt(file));
	const mime = file.type.startsWith('image/') ? file.type : 'image/jpeg';

	const bitmap = await fileToImageBitmap(file);
	const thumb = await bitmapToBlob(bitmap, THUMB_MAX, mime, 0.78);
	const medium = await bitmapToBlob(bitmap, MEDIUM_MAX, mime, 0.85);
	bitmap.close();

	return {
		id: uid(),
		takenAt,
		width: medium.width,
		height: medium.height,
		mime,
		thumb: thumb.blob,
		medium: medium.blob,
		original: file
	};
}

export async function processPhotoForPlant(
	file: File,
	plantId: string,
	caption = ''
): Promise<Photo> {
	const p = await processPhotoFile(file);
	return {
		id: p.id,
		plantId,
		takenAt: p.takenAt,
		width: p.width,
		height: p.height,
		caption,
		mime: p.mime,
		thumb: p.thumb,
		medium: p.medium,
		original: p.original
	};
}

export function readFileAsDataURL(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
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