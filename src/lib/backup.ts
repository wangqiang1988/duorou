import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from './db';
import type { Photo, Plant } from './types';

interface ExportPayload {
	version: 1;
	exportedAt: number;
	plants: Plant[];
	photos: Array<Omit<Photo, 'thumb' | 'medium' | 'original'>>;
}

export async function exportAll(): Promise<void> {
	const plants = await db.plants.toArray();
	const photos = await db.photos.toArray();

	const meta: ExportPayload = {
		version: 1,
		exportedAt: Date.now(),
		plants,
		photos: photos.map((p) => ({
			id: p.id,
			plantId: p.plantId,
			takenAt: p.takenAt,
			width: p.width,
			height: p.height,
			caption: p.caption,
			mime: p.mime
		}))
	};

	const zip = new JSZip();
	zip.file('meta.json', JSON.stringify(meta, null, 2));

	const photosDir = zip.folder('photos')!;
	await Promise.all(
		photos.map(async (p) => {
			photosDir.file(`${p.id}.jpg`, p.original);
		})
	);

	const blob = await zip.generateAsync({
		type: 'blob',
		compression: 'DEFLATE',
		compressionOptions: { level: 6 }
	});

	const ts = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, '');
	saveAs(blob, `duorou-backup-${ts}.zip`);
}

export async function importAll(file: File): Promise<{ plants: number; photos: number }> {
	const zip = await JSZip.loadAsync(file);
	const metaFile = zip.file('meta.json');
	if (!metaFile) throw new Error('备份包格式无效：缺少 meta.json');
	const meta = JSON.parse(await metaFile.async('string')) as ExportPayload;
	if (meta.version !== 1) throw new Error('不支持的备份版本');

	const photosDir = zip.folder('photos');
	const existingPlants = new Set((await db.plants.toArray()).map((p) => p.id));
	const existingPhotos = new Set((await db.photos.toArray()).map((p) => p.id));

	let plantsAdded = 0;
	let photosAdded = 0;

	await db.transaction('rw', db.plants, db.photos, async () => {
		for (const plant of meta.plants) {
			if (existingPlants.has(plant.id)) continue;
			await db.plants.add(plant);
			plantsAdded++;
		}
		for (const photoMeta of meta.photos) {
			if (existingPhotos.has(photoMeta.id)) continue;
			const fileEntry = photosDir?.file(`${photoMeta.id}.jpg`);
			if (!fileEntry) continue;
			const original = await fileEntry.async('blob');
			const medium = original.slice(0, original.size, original.type);
			const thumb = original.slice(0, original.size, original.type);
			await db.photos.add({
				...photoMeta,
				original,
				medium,
				thumb
			});
			photosAdded++;
		}
	});

	return { plants: plantsAdded, photos: photosAdded };
}