import { pinyin } from 'pinyin-pro';
import type { PlantWithStats } from './types';

export function pinyinInitial(s: string): string {
	const trimmed = s.trim();
	if (!trimmed) return '#';
	const first = trimmed[0];
	// 已是 A-Z / a-z
	if (/[A-Za-z]/.test(first)) return first.toUpperCase();
	// 中文 → 转拼音取首字母
	const py = pinyin(first, {pattern: 'first', toneType: 'none'});
	const ch = (py || '#')[0].toUpperCase();
	return /[A-Z]/.test(ch) ? ch : '#';
}

export interface SpeciesGroup {
	letter: string;
	species: string;
	plants: PlantWithStats[];
}

export function groupBySpecies(plants: PlantWithStats[]): SpeciesGroup[] {
	const map = new Map<string, SpeciesGroup>();
	for (const p of plants) {
		const species = p.species.trim() || '未分类';
		const letter = pinyinInitial(species);
		const key = `${letter}__${species}`;
		if (!map.has(key)) {
			map.set(key, {letter, species, plants: []});
		}
		map.get(key)!.plants.push(p);
	}
	const groups = Array.from(map.values());
	groups.sort((a, b) => {
		if (a.letter === '#' && b.letter !== '#') return 1;
		if (a.letter !== '#' && b.letter === '#') return -1;
		if (a.letter !== b.letter) return a.letter.localeCompare(b.letter);
		return a.species.localeCompare(b.species, 'zh');
	});
	return groups;
}

export function uniqueLetters(groups: SpeciesGroup[]): string[] {
	const seen = new Set<string>();
	for (const g of groups) seen.add(g.letter);
	const letters = Array.from(seen);
	letters.sort((a, b) => {
		if (a === '#' && b !== '#') return 1;
		if (a !== '#' && b === '#') return -1;
		return a.localeCompare(b);
	});
	return letters;
}