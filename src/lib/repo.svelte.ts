import { plantsApi, photosApi } from './api';
import type { Photo, PlantWithStats } from './types';

export const plants = $state<PlantWithStats[]>([]);

export async function loadPlants(): Promise<void> {
	const list = await plantsApi.list();
	plants.length = 0;
	plants.push(...list);
}

export async function loadPhotos(plantId: string): Promise<Photo[]> {
	return photosApi.list(plantId);
}

export async function createPlant(
	input: Omit<PlantWithStats, 'id' | 'createdAt' | 'updatedAt' | 'photoCount' | 'coverPhotoId'>
): Promise<PlantWithStats> {
	const plant = await plantsApi.create(input);
	await loadPlants();
	return plant;
}

export async function updatePlant(
	id: string,
	patch: Partial<Pick<PlantWithStats, 'name' | 'species' | 'acquiredAt' | 'notes'>>
): Promise<void> {
	await plantsApi.update(id, patch);
	await loadPlants();
}

export async function deletePlant(id: string): Promise<void> {
	await plantsApi.remove(id);
	await loadPlants();
}

export async function addPhoto(input: {
	plantId: string;
	takenAt: number;
	width: number;
	height: number;
	mime: string;
	dateSource: 'exif' | 'file' | 'now';
	orig: Blob;
	medium?: Blob;
	thumb?: Blob;
}): Promise<Photo> {
	const photo = await photosApi.upload(input);
	await loadPlants();
	return photo;
}

export async function updatePhoto(
	id: string,
	_plantId: string,
	patch: Partial<{takenAt: number; caption: string}>
): Promise<void> {
	await photosApi.update(id, patch);
}

export async function deletePhoto(id: string, _plantId: string): Promise<void> {
	await photosApi.remove(id);
	await loadPlants();
}

export async function getPlant(id: string): Promise<PlantWithStats | undefined> {
	try {
		return await plantsApi.get(id);
	} catch {
		return undefined;
	}
}