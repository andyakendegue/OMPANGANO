/** Stockage objet compatible S3 (Garage). URLs présignées : le navigateur parle directement à Garage. */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Config } from './config.ts';

export interface MediaStorage {
  presignPut(path: string, contentType: string, size: number, ttlS: number): Promise<string>;
  presignGet(path: string, ttlS: number): Promise<string>;
  remove(path: string): Promise<void>;
  /** Envoi direct côté serveur (script de migration). */
  put(path: string, body: Uint8Array, contentType: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** Lecture côté serveur d'un petit objet (liste de lecture HLS). */
  get?(path: string): Promise<Uint8Array | null>;
}

export function createS3Storage(cfg: Config['s3']): MediaStorage {
  // Pas de somme de contrôle automatique : le SDK en ajoutait une (CRC32 d'un corps vide) aux URL présignées, et Garage refusait
  // alors tout envoi réel avec « Invalid digest: Failed to validate checksum » (aucun enregistrement n'arrivait).
  const base = { requestChecksumCalculation: 'WHEN_REQUIRED' as const, responseChecksumValidation: 'WHEN_REQUIRED' as const, region: cfg.region, forcePathStyle: true, credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } };
  const internal = new S3Client({ ...base, endpoint: cfg.endpoint });
  // Les URL présignées doivent pointer vers l'adresse publique (media.…), pas vers le réseau Docker.
  const signer = cfg.publicEndpoint ? new S3Client({ ...base, endpoint: cfg.publicEndpoint }) : internal;
  return {
    presignPut: (path, contentType, size, ttl) =>
      // ContentLength fait partie de la signature : Garage refuse un envoi d'une autre taille.
      getSignedUrl(signer, new PutObjectCommand({ Bucket: cfg.bucket, Key: path, ContentType: contentType, ContentLength: size }), { expiresIn: ttl }),
    presignGet: (path, ttl) => getSignedUrl(signer, new GetObjectCommand({ Bucket: cfg.bucket, Key: path }), { expiresIn: ttl }),
    remove: async (path) => { await internal.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: path })); },
    put: async (path, body, contentType) => { await internal.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: path, Body: body, ContentType: contentType })); },
    get: async (path) => {
      try {
        const r = await internal.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: path }));
        return r.Body ? await r.Body.transformToByteArray() : null;
      } catch { return null; }
    },
    exists: async (path) => {
      try {
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
        await internal.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: path }));
        return true;
      } catch { return false; }
    }
  };
}
