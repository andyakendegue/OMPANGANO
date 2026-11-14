export const SUPER_ADMIN_EMAIL = 'andymigoumbi@gmail.com';
export const FIREBASE_PROJECT_ID = 'enenga';
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Vidéos d'annonces de logement (60 s au plus côté application). */
export const MAX_UPLOAD_VIDEO_BYTES = 50 * 1024 * 1024;
/** URL d'envoi de médias d'annonce par compte et par jour. */
export const MAX_ENVOIS_ANNONCES_JOUR = 60;
export const UPLOAD_URL_TTL_S = 600;

const PROD_ORIGINES = 'https://ompangano.web.app,https://ompangano.firebaseapp.com,https://source.essaka.engineering';
const DEV_ORIGINES = 'http://localhost:3000,http://localhost:5173,http://localhost:8081,http://127.0.0.1:3000,http://127.0.0.1:5173';

export interface Config {
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  s3: { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicEndpoint?: string };
}

export function loadConfig(env = process.env): Config {
  const need = (k: string) => {
    const v = env[k];
    if (!v) throw new Error(`Variable d'environnement manquante : ${k}`);
    return v;
  };
  return {
    port: Number(env.PORT || 3000),
    databaseUrl: need('DATABASE_URL'),
    // En production : jamais d'origine locale (localhost), même si CORS_ORIGINS en contient une
    corsOrigins: (env.CORS_ORIGINS || (PROD_ORIGINES + (env.NODE_ENV === 'production' ? '' : ',' + DEV_ORIGINES))).split(',').map(s => s.trim()).filter(Boolean)
      .filter(o => env.NODE_ENV !== 'production' || !/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(o)),
    s3: {
      endpoint: need('S3_ENDPOINT'),
      publicEndpoint: env.S3_PUBLIC_ENDPOINT || undefined,
      region: env.S3_REGION || 'garage',
      bucket: need('S3_BUCKET'),
      accessKeyId: need('S3_ACCESS_KEY_ID'),
      secretAccessKey: need('S3_SECRET_ACCESS_KEY')
    }
  };
}
