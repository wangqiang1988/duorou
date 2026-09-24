import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			injectRegister: 'auto',
			manifest: {
				name: '多肉成长记',
				short_name: '多肉',
				description: '记录多肉的成长时光',
				theme_color: '#7c9a6e',
				background_color: '#f5f1e8',
				lang: 'zh-CN',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				scope: '/',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/icon-512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
				navigateFallback: '/',
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
				navigateFallbackDenylist: [/^\/api\//],
				// 不缓存 API 请求（始终走网络）
				runtimeCaching: [
					{
						urlPattern: /^\/api\//,
						handler: 'NetworkOnly'
					}
				]
			},
			devOptions: {
				enabled: false
			}
		}),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				fallback: 'index.html',
				pages: 'build',
				assets: 'build',
				strict: false
			})
		})
	],
server: {
			host: '0.0.0.0',
			port: 5173,
			proxy: {
				'/api': {
					target: 'http://localhost:3001',
					changeOrigin: false
				}
			}
		}
});