// Autorise le site à envoyer/lire les fichiers directement (URL présignées).
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const origins = (process.env.CORS_ORIGINS || 'https://ompangano.web.app').split(',').map(s => s.trim());
const s3 = new S3Client({
  region: process.env.S3_REGION || 'garage', forcePathStyle: true,
  endpoint: process.env.S3_ENDPOINT_LOCAL || 'http://localhost:3900',
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! }
});
await s3.send(new PutBucketCorsCommand({
  Bucket: process.env.S3_BUCKET || 'ompangano',
  // UNE règle par origine : avec plusieurs origines dans une seule règle, Garage répond avec la liste entière dans
  // Access-Control-Allow-Origin, valeur invalide que les navigateurs rejettent (« Load failed » alors que le fichier est bien enregistré)
  CORSConfiguration: { CORSRules: origins.map(o => ({ AllowedOrigins: [o], AllowedMethods: ['GET', 'PUT', 'HEAD'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600 })) }
}));
console.log('CORS du bucket configuré pour :', origins.join(', '));
