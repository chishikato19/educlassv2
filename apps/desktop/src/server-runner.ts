import type { FastifyInstance } from 'fastify';
import { buildServer } from '@educlass/server';
import { getLanIpAddress } from './network.js';
import { generateQrDataUrl } from './qr.js';

export interface EmbeddedServerOptions {
  port?: number | undefined;
  host?: string | undefined;
  teacherUiDir?: string | undefined;
  studentUiDir?: string | undefined;
  dbPath?: string | undefined;
  dataDir?: string | undefined;
  assetsDir?: string | undefined;
}

export interface EmbeddedServerInstance {
  app: FastifyInstance;
  port: number;
  host: string;
  lanIp: string;
  lanUrl: string;
  studentUrl: string;
  teacherUrl: string;
  qrDataUrl: string;
  stop: () => Promise<void>;
}

/**
 * Khởi động máy chủ nhúng Fastify từ Electron app
 * Lắng nghe trên 0.0.0.0 để cho phép điện thoại của học sinh trong cùng mạng WiFi truy cập
 */
export async function startEmbeddedServer(
  options: EmbeddedServerOptions = {}
): Promise<EmbeddedServerInstance> {
  const targetPort = options.port ?? 3000;
  const targetHost = options.host ?? '0.0.0.0';

  const app = await buildServer({
    fastifyOptions: {
      logger: false,
    },
    teacherUiDir: options.teacherUiDir,
    studentUiDir: options.studentUiDir,
    dbPath: options.dbPath,
    dataDir: options.dataDir,
    assetsDir: options.assetsDir,
  });

  await app.listen({
    port: targetPort,
    host: targetHost,
  });

  const address = app.server.address();
  let actualPort = targetPort;
  if (address && typeof address !== 'string') {
    actualPort = address.port;
  }

  const lanIp = getLanIpAddress();
  const lanUrl = `http://${lanIp}:${actualPort}`;
  const studentUrl = `${lanUrl}/`;
  const teacherUrl = `${lanUrl}/teacher`;

  const qrDataUrl = await generateQrDataUrl(studentUrl);

  return {
    app,
    port: actualPort,
    host: targetHost,
    lanIp,
    lanUrl,
    studentUrl,
    teacherUrl,
    qrDataUrl,
    stop: async () => {
      await app.close();
    },
  };
}
