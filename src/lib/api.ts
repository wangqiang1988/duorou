import type { Photo, Plant, PlantWithStats } from './types';

const BASE = ''; // 同源走 nginx / vite proxy

class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
	}
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
	const res = await fetch(BASE + input, {
		...init,
		headers: {
			Accept: 'application/json',
			...(init?.body && !(init.body instanceof FormData)
				? {'Content-Type': 'application/json'}
				: {}),
			...init?.headers
		}
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new ApiError(res.status, `${res.status} ${text || res.statusText}`);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

// ───────── Plants ─────────

export const plantsApi = {
	list: (mode: 'alive' | 'dead' | 'all' = 'all') =>
		jsonFetch<PlantWithStats[]>(`/api/plants?mode=${mode}`),
	get: (id: string) => jsonFetch<PlantWithStats>(`/api/plants/${id}`),
	create: (input: {
		name: string;
		species?: string;
		acquiredAt: number;
		notes?: string;
		diedAt?: number | null;
	}) =>
		jsonFetch<PlantWithStats>('/api/plants', {
			method: 'POST',
			body: JSON.stringify(input)
		}),
	update: (
		id: string,
		patch: Partial<{
			name: string;
			species: string;
			acquiredAt: number;
			notes: string;
			diedAt: number | null;
		}>
	) =>
		jsonFetch<PlantWithStats>(`/api/plants/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(patch)
		}),
	remove: (id: string) =>
		jsonFetch<{ok: true}>(`/api/plants/${id}`, {method: 'DELETE'})
};

// ───────── Photos ─────────

export const photosApi = {
	list: (plantId?: string) =>
		jsonFetch<Photo[]>(`/api/photos${plantId ? `?plantId=${encodeURIComponent(plantId)}` : ''}`),

	get: (id: string) => jsonFetch<Photo>(`/api/photos/${id}`),

	upload: async (params: {
		plantId: string;
		takenAt: number;
		width: number;
		height: number;
		mime: string;
		dateSource: 'exif' | 'file' | 'now';
		orig: Blob;
		medium?: Blob;
		thumb?: Blob;
	}): Promise<Photo> => {
		const fd = new FormData();
		fd.append('plantId', params.plantId);
		fd.append('takenAt', String(params.takenAt));
		fd.append('width', String(params.width));
		fd.append('height', String(params.height));
		fd.append('mime', params.mime);
		fd.append('dateSource', params.dateSource);
		fd.append('file', params.orig, 'photo.bin');
		if (params.medium) fd.append('medium', params.medium, 'medium.bin');
		if (params.thumb) fd.append('thumb', params.thumb, 'thumb.bin');
		return jsonFetch<Photo>('/api/photos', {method: 'POST', body: fd});
	},

	update: (id: string, patch: {takenAt?: number; caption?: string}) =>
		jsonFetch<Photo>(`/api/photos/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(patch)
		}),

	remove: (id: string) =>
		jsonFetch<{ok: true}>(`/api/photos/${id}`, {method: 'DELETE'}),

	stats: () => jsonFetch<{plants: number; photos: number; totalBytes: number}>('/api/stats')
};

export {ApiError};