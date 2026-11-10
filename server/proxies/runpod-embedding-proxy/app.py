"""
Proxy d'embeddings : expose une API OpenAI (POST /v1/embeddings) devant un endpoint serverless RunPod, sur le modèle de runpod-openai-proxy.
N'écoute que sur l'adresse interne du serveur (LISTEN_HOST, par défaut la passerelle Docker 172.17.0.1) : jamais exposé sur Internet.
Variables : RUNPOD_API_KEY, RUNPOD_EMBED_ENDPOINT_ID (laisser vides = mode simulation), EMBED_MODEL, PROXY_TOKEN (facultatif : jeton exigé en Bearer).
"""
import hashlib, math, os, re
from typing import Any, Dict, List

import httpx
from fastapi import FastAPI, Header, HTTPException

API_KEY = os.environ.get("RUNPOD_API_KEY", "")
ENDPOINT = os.environ.get("RUNPOD_EMBED_ENDPOINT_ID", "")
MODEL = os.environ.get("EMBED_MODEL", "BAAI/bge-m3")
TOKEN = os.environ.get("PROXY_TOKEN", "")
SIMULATION = not (API_KEY and ENDPOINT)
BASE = f"https://api.runpod.ai/v2/{ENDPOINT}"
app = FastAPI()


def verifier(authorization: str | None):
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Jeton invalide")


def simule(texte: str, dim: int = 128) -> List[float]:
    """Même idée que l'API Nkala : sac de mots haché, normalisé (déterministe, sans réseau)."""
    v = [0.0] * dim
    for m in re.split(r"[^a-z0-9ɛɔ]+", texte.lower()):
        if len(m) > 2:
            v[int.from_bytes(hashlib.md5(m.encode()).digest()[:2], "big") % dim] += 1
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def extraire(sortie: Any) -> List[List[float]]:
    """Les workers d'embeddings répondent en format OpenAI (data[].embedding) ou en liste brute : on accepte les deux."""
    if isinstance(sortie, dict):
        if "data" in sortie:
            return [d["embedding"] for d in sorted(sortie["data"], key=lambda d: d.get("index", 0))]
        if "embeddings" in sortie:
            return sortie["embeddings"]
        if "output" in sortie:
            return extraire(sortie["output"])
    if isinstance(sortie, list) and sortie and isinstance(sortie[0], list):
        return sortie
    if isinstance(sortie, list) and sortie and isinstance(sortie[0], dict):
        return extraire({"data": sortie})
    raise HTTPException(status_code=502, detail=f"Réponse RunPod inattendue : {str(sortie)[:200]}")


@app.get("/health")
async def health():
    return {"ok": True, "simulation": SIMULATION, "model": MODEL}


@app.get("/v1/models")
async def models(authorization: str | None = Header(default=None)):
    verifier(authorization)
    return {"object": "list", "data": [{"id": MODEL, "object": "model", "owned_by": "runpod"}]}


@app.post("/v1/embeddings")
async def embeddings(body: Dict[str, Any], authorization: str | None = Header(default=None)):
    verifier(authorization)
    entree = body.get("input")
    textes = [entree] if isinstance(entree, str) else list(entree or [])
    if not textes or not all(isinstance(t, str) for t in textes) or len(textes) > 256:
        raise HTTPException(status_code=400, detail="input : 1 à 256 textes attendus")
    if SIMULATION:
        vecteurs = [simule(t) for t in textes]
    else:
        async with httpx.AsyncClient(timeout=120) as c:
            r = await c.post(f"{BASE}/runsync", headers={"Authorization": f"Bearer {API_KEY}"}, json={"input": {"model": body.get("model", MODEL), "input": textes}})
            if r.status_code != 200:
                raise HTTPException(status_code=502, detail=f"RunPod {r.status_code} : {r.text[:200]}")
            j = r.json()
            if j.get("status") not in (None, "COMPLETED"):
                raise HTTPException(status_code=504, detail=f"Travail RunPod {j.get('status')} (démarrage à froid ? réessayer)")
            vecteurs = extraire(j.get("output", j))
    return {"object": "list", "model": body.get("model", MODEL), "data": [{"object": "embedding", "index": i, "embedding": v} for i, v in enumerate(vecteurs)], "usage": {"prompt_tokens": sum(len(t) // 3 for t in textes), "total_tokens": sum(len(t) // 3 for t in textes)}}
