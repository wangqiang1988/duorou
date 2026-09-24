import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { registerPlantRoutes } from './routes/plants';
import { registerPhotoRoutes } from './routes/photos';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

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
		reply.code(err.statusCode ?? 500).send({ error: err.message });
	});

	try {
		await app.listen({ port: PORT, host: HOST });
		app.log.info(`多肉 API 已启动 http://${HOST}:${PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

main();