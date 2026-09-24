export type ID = string;

export interface Plant {
	id: ID;
	name: string;
	species: string;
	acquiredAt: number;
	notes: string;
	createdAt: number;
	updatedAt: number;
}

export interface Photo {
	id: ID;
	plantId: ID;
	takenAt: number;
	width: number;
	height: number;
	caption: string;
	mime: string;
	thumb: Blob;
	medium: Blob;
	original: Blob;
	dateSource?: 'exif' | 'file' | 'now';
}

export type PhotoBlobKey = 'thumb' | 'medium' | 'original';