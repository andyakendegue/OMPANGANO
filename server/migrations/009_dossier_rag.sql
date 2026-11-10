-- Documents du RAG issus du dossier de référence (/opt/embeddings) : chemin relatif et empreinte pour ne réindexer que ce qui change
ALTER TABLE ia_documents ADD COLUMN IF NOT EXISTS chemin text;
ALTER TABLE ia_documents ADD COLUMN IF NOT EXISTS empreinte text;
CREATE UNIQUE INDEX IF NOT EXISTS ia_documents_chemin_idx ON ia_documents (chemin) WHERE chemin IS NOT NULL;
