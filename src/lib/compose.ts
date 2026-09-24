import { formatDay } from './photo';

export interface ComposePhoto {
	id: string;
	takenAt: number;
	loadBlob: () => Promise<Blob>;
}

export interface ComposeOptions {
	plantName: string;
	photos: ComposePhoto[];
	title?: string;
}

const CANVAS_WIDTH = 1080; // 出图宽度（PNG 1080 适合手机分享）
const PADDING = 32;
const TITLE_HEIGHT = 120;
const PHOTO_GAP = 24;
const DATE_BAR = 56;
const FOOTER_HEIGHT = 80;
const MAX_PHOTO_HEIGHT = 1400;

function blobUrl(id: string): string {
	return `/api/photos/${id}/blob?v=medium`;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`图片加载失败：${src}`));
		img.src = src;
	});
}

function roundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/**
 * 生成"成长时间线"拼接图：倒序（最新在上）拼成长图，PNG 输出
 */
export async function composeTimeline(opts: ComposeOptions): Promise<Blob> {
	const { plantName, photos } = opts;
	const title = opts.title ?? `${plantName} · 成长时间线`;

	if (photos.length === 0) {
		throw new Error('至少需要 1 张照片');
	}

	// 预加载所有图片
	const images = await Promise.all(
		photos.map(async (p) => {
			const url = blobUrl(p.id);
			const img = await loadImage(url);
			return {photo: p, img};
		})
	);

	// 计算每张照片的目标高度（按比例缩放，宽度统一为内宽）
	const innerWidth = CANVAS_WIDTH - PADDING * 2;
	const itemHeights = images.map(({img}) => {
		const ratio = innerWidth / img.naturalWidth;
		const h = img.naturalHeight * ratio;
		// 限制最大高度避免某张图占比过大
		return Math.min(h, MAX_PHOTO_HEIGHT);
	});

	const totalHeight =
		TITLE_HEIGHT +
		itemHeights.reduce((sum, h) => sum + h + PHOTO_GAP + DATE_BAR, 0) -
		PHOTO_GAP +
		FOOTER_HEIGHT;

	const canvas = document.createElement('canvas');
	canvas.width = CANVAS_WIDTH;
	canvas.height = totalHeight;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context unavailable');

	// 背景
	const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
	bgGrad.addColorStop(0, '#f5f1e8');
	bgGrad.addColorStop(1, '#e3ecdb');
	ctx.fillStyle = bgGrad;
	ctx.fillRect(0, 0, CANVAS_WIDTH, totalHeight);

	// 标题
	ctx.fillStyle = '#364629';
	ctx.font = 'bold 56px sans-serif';
	ctx.textBaseline = 'middle';
	ctx.fillText(title, PADDING, TITLE_HEIGHT / 2 + 4);

	// 副标题（生成时间）
	const now = new Date();
	ctx.fillStyle = '#6b8a4f';
	ctx.font = '24px sans-serif';
	ctx.textAlign = 'right';
	ctx.fillText(
		`共 ${photos.length} 张 · 生成于 ${formatDay(now.getTime())}`,
		CANVAS_WIDTH - PADDING,
		TITLE_HEIGHT / 2 + 4
	);
	ctx.textAlign = 'left';

	// 装饰线
	ctx.strokeStyle = '#84a566';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(PADDING, TITLE_HEIGHT - 8);
	ctx.lineTo(PADDING + 80, TITLE_HEIGHT - 8);
	ctx.stroke();

	// 逐张画图
	let cursorY = TITLE_HEIGHT;
	images.forEach(({photo, img}, i) => {
		const itemH = itemHeights[i];

		// 日期条
		ctx.fillStyle = '#364629';
		ctx.font = 'bold 28px sans-serif';
		ctx.textBaseline = 'middle';
		ctx.fillText(
			formatDay(photo.takenAt),
			PADDING,
			cursorY + DATE_BAR / 2
		);

		ctx.fillStyle = '#6b8a4f';
		ctx.font = '22px sans-serif';
		ctx.textAlign = 'right';
		const days = Math.floor((Date.now() - photo.takenAt) / 86400000);
		ctx.fillText(
			days === 0 ? '今天' : days === 1 ? '昨天' : `${days} 天前`,
			CANVAS_WIDTH - PADDING,
			cursorY + DATE_BAR / 2
		);
		ctx.textAlign = 'left';

		cursorY += DATE_BAR;

		// 图片
		ctx.save();
		roundedRect(ctx, PADDING, cursorY, innerWidth, itemH, 16);
		ctx.clip();
		ctx.drawImage(img, PADDING, cursorY, innerWidth, itemH);
		ctx.restore();

		// 边框
		ctx.strokeStyle = 'rgba(132, 165, 102, 0.4)';
		ctx.lineWidth = 2;
		roundedRect(ctx, PADDING, cursorY, innerWidth, itemH, 16);
		ctx.stroke();

		cursorY += itemH + PHOTO_GAP;
	});

	// 底部签名
	ctx.fillStyle = '#9a7843';
	ctx.font = '22px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(
		'多肉成长记 · duorou',
		CANVAS_WIDTH / 2,
		totalHeight - FOOTER_HEIGHT / 2
	);

	// 输出 PNG
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('toBlob 失败'));
					return;
				}
				resolve(blob);
			},
			'image/png',
			0.92
		);
	});
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}