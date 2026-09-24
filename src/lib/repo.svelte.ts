import {
	db,
	getCoverPhoto,
	listPhotos,
	createPlant as dbCreatePlant,
	updatePlant as dbUpdatePlant,
	deletePlant as dbDeletePlant,
	addPhoto as dbAddPhoto,
	getPhoto as dbGetPhoto,
	getPlant as dbGetPlant,
	updatePhoto as dbUpdatePhoto,
	deletePhoto as dbDeletePhoto
} from './db';
import type { Photo, Plant } from './types';

export const plants = $state<Plant[]>([]);
export const photoCovers = $state<Record<string, string>>({});
export const photoCounts = $state<Record<string, number>>({});

export async function listPlants(): Promise<void> {
	const list = await db.plants.orderBy('createdAt').reverse().toArray();
	for (const url of Object.values(photoCovers)) URL.revokeObjectURL(url);

	plants.length = 0;
	plants.push(...list);

	const covers: Record<string, string> = {};
	const counts: Record<string, number> = {};
	await Promise.all(
		list.map(async (p) => {
			const cover = await getCoverPhoto(p.id);
			if (cover) {
				covers[p.id] = URL.createObjectURL(cover.thumb);
			}
			const all = await listPhotos(p.id);
			counts[p.id] = all.length;
		})
	);

	for (const k of Object.keys(photoCovers)) delete photoCovers[k];
	Object.assign(photoCovers, covers);

	for (const k of Object.keys(photoCounts)) delete photoCounts[k];
	Object.assign(photoCounts, counts);
}

export async function createPlant(
	input: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Plant> {
	const plant = await dbCreatePlant(input);
	await listPlants();
	return plant;
}

export async function updatePlant(
	id: string,
	patch: Partial<Omit<Plant, 'id' | 'createdAt'>>
): Promise<void> {
	await dbUpdatePlant(id, patch);
	await listPlants();
}

export async function deletePlant(id: string): Promise<void> {
	const oldUrl = photoCovers[id];
	if (oldUrl) URL.revokeObjectURL(oldUrl);
	await dbDeletePlant(id);
	await listPlants();
}

export async function getPlant(id: string): Promise<Plant | undefined> {
	return dbGetPlant(id);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
	return dbGetPhoto(id);
}

export async function loadPhotos(plantId: string): Promise<Photo[]> {
	return listPhotos(plantId);
}

export async function addPhoto(photo: Photo): Promise<void> {
	await dbAddPhoto(photo);
}

export async function updatePhoto(id: string, patch: Partial<Photo>): Promise<void> {
	await dbUpdatePhoto(id, patch);
}

export async function deletePhoto(id: string): Promise<void> {
	await dbDeletePhoto(id);
}