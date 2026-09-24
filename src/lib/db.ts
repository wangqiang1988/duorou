import Dexie, { type Table } from 'dexie';
import type { Photo, Plant } from './types';

class DuorouDB extends Dexie {
	plants!: Table<Plant, string>;
	photos!: Table<Photo, string>;

	constructor() {
		super('duorou');
		this.version(1).stores({
			plants: 'id, name, acquiredAt, createdAt',
			photos: 'id, plantId, takenAt'
		});
	}
}

export const db = new DuorouDB();

export function uid(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function listPlants(): Promise<Plant[]> {
	return db.plants.orderBy('createdAt').reverse().toArray();
}

export async function getPlant(id: string): Promise<Plant | undefined> {
	return db.plants.get(id);
}

export async function createPlant(
	input: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Plant> {
	const now = Date.now();
	const plant: Plant = {
		...input,
		id: uid(),
		createdAt: now,
		updatedAt: now
	};
	await db.plants.add(plant);
	return plant;
}

export async function updatePlant(
	id: string,
	patch: Partial<Omit<Plant, 'id' | 'createdAt'>>
): Promise<void> {
	await db.plants.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deletePlant(id: string): Promise<void> {
	const photoIds = (await db.photos.where('plantId').equals(id).toArray()).map(
		(p) => p.id
	);
	await db.transaction('rw', db.plants, db.photos, async () => {
		await db.photos.bulkDelete(photoIds);
		await db.plants.delete(id);
	});
}

export async function listPhotos(plantId: string): Promise<Photo[]> {
	return db.photos
		.where('plantId')
		.equals(plantId)
		.sortBy('takenAt');
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
	return db.photos.get(id);
}

export async function addPhoto(photo: Photo): Promise<void> {
	await db.photos.add(photo);
}

export async function updatePhoto(id: string, patch: Partial<Photo>): Promise<void> {
	await db.photos.update(id, patch);
}

export async function deletePhoto(id: string): Promise<void> {
	await db.photos.delete(id);
}

export async function getCoverPhoto(plantId: string): Promise<Photo | undefined> {
	const first = await db.photos
		.where('plantId')
		.equals(plantId)
		.sortBy('takenAt');
	return first[0];
}