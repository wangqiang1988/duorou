import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import http from 'node:http';
import { registerPlantRoutes } from './routes/plants';
import { registerPhotoRoutes } from './routes/photos';

const PORT = Number(process.env.PORT ?? 3011);
const HOST = process.env.HOST ?? '0.0.0.0';
// 是否额外监听 IPv6 回环（::1）。容器内 localhost 可能优先解析到 ::1，
// 只监听 IPv4 时健康检查连不上 → 容器被判 unhealthy。
const LISTEN_IPV6 = process.env.LISTEN_IPV6 !== 'false';

async function main() {
	const app = Fastify({
		logger: { level: 'info' },
		bodyLimit: 50 * 1024 * 1024
	});

	await app.register(cors, {
		origin: true,
		credentials: false
	});

	await app.register(multipart, {
		limits: {
			fileSize: 50 * 1024 * 1024,
			files: 3
		}
	});

	app.get('/api/health', async () => ({ ok: true, ts: Date.now() }));

	registerPlantRoutes(app);
	registerPhotoRoutes(app);

	app.setErrorHandler((err, req, reply) => {
		app.log.error(err);
		const e = err as { statusCode?: number; message?: string };
		reply.code(e.statusCode ?? 500).send({ error: e.message ?? 'internal error' });
	});

	try {
		await app.listen({ port: PORT, host: HOST });
		app.log.info(`多肉 API 已启动 http://${HOST}:${PORT}`);
		if (LISTEN_IPV6) {
			// Fastify 单实例只能 listen 一次（第二次报 "already listening"），
			// 所以用独立的 http server 补一个 IPv6 回环监听。
			// 失败不致命：健康检查已改用 127.0.0.1，不依赖 ::1。
			try {
				const v6 = http.createServer((req, res) => {
					res.writeHead(200, { 'content-type': 'application/json' });
					res.end(JSON.stringify({ ok: true, ts: Date.now() }));
				});
				v6.on('error', (e) => {
					app.log.warn(`IPv6 回环服务出错: ${e.message}`);
				});
				v6.listen(PORT, '::1', () => {
					app.log.info(`多肉 API 已启动 http://[::1]:${PORT}`);
				});
			} catch (err) {
				app.log.warn(`IPv6 回环监听失败（忽略）: ${(err as Error).message}`);
			}
		}
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

main();