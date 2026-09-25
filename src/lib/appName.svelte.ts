const KEY = 'duorou.appName';
const DEFAULT = '多肉成长记';

class AppNameState {
	value = $state<string>(load());
}

export const appName = new AppNameState();

function load(): string {
	if (typeof localStorage === 'undefined') return DEFAULT;
	const v = localStorage.getItem(KEY);
	return v && v.trim() ? v : DEFAULT;
}

export function setAppName(name: string): void {
	const trimmed = name.trim();
	const next = trimmed || DEFAULT;
	appName.value = next;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(KEY, next);
	}
}

export function resetAppName(): void {
	appName.value = DEFAULT;
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(KEY);
	}
}