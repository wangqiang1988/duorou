export type ID = string;

export type DateSource = 'exif' | 'file' | 'now';

export interface Plant {
	id: ID;
	name: string;
	species: string;
	acquiredAt: number;
	notes: string;
	createdAt: number;
	updatedAt: number;
}

export interface PlantWithStats extends Plant {
	photoCount: number;
	coverPhotoId: ID | null;
}

export interface Photo {
	id: ID;
	plantId: ID;
	takenAt: number;
	width: number;
	height: number;
	caption: string;
	mime: string;
	dateSource: DateSource;
	sizeOrig: number;
	sizeMedium: number;
	sizeThumb: number;
	createdAt: number;
}

export function photoBlobUrl(id: ID, variant: 'orig' | 'medium' | 'thumb' = 'medium'): string {
	return `/api/photos/${id}/blob?v=${variant}`;
}