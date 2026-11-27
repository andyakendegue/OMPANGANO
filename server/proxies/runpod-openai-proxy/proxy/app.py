"""
Relais OpenAI → point d'accès serverless RunPod (worker vLLM), utilisé par Open WebUI (127.0.0.1:8000) et par l'API Nkala
(via le relais Caddy llm-relay, 172.17.0.1:8002). Versé dans le dépôt le 26 nov. 2026 (copie de /opt/runpod-openai-proxy).

Chaque question devient un travail RunPod (/run), suivi par /status jusqu'à la fin. Corrections du 26 nov. 2026 :
- délais httpx bornés (avant : aucun ; une connexion à moitié morte bloquait la question pour toujours) ;
- politique RunPod sur chaque travail : durée de calcul (EXEC_MAX_S) et durée de vie, file comprise (TTL_S) : un travail
  coincé expire chez RunPod au lieu d'occuper un worker ;
- attente bornée (ATTENTE_MAX_S, sous les 600 s du relais Caddy) puis annulation du travail (/cancel) ; annulation aussi
  quand l'appelant raccroche (l'API Nkala abandonne une question après 12 minutes) ;
- mesures renvoyées dans les en-têtes X-Runpod-Job, X-Runpod-Delay-Ms (file, réveil du worker compris),
  X-Runpod-Execution-Ms (calcul) et X-Relais-Ms ; une ligne JSON par travail dans le journal du conteneur ;
- GET /health : workers et file du point d'accès (RunPod /health), travaux en cours et derniers travaux.
"""
import asyncio
import json
import os
import time
from collections import deque
from typing import Any, Dict, List

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

RUNPOD_API_KEY = os.environ["RUNPOD_API_KEY"]
ENDPOINT_ID = os.environ["RUNPOD_ENDPOINT_ID"]
BASE = f"{os.environ.get('RUNPOD_BASE_URL', 'https://api.runpod.ai/v2').rstrip('/')}/{ENDPOINT_ID}"
ATTENTE_MAX_S = int(os.environ.get("ATTENTE_MAX_S", "570"))
EXEC_MAX_S = int(os.environ.get("EXEC_MAX_S", "300"))
TTL_S = int(os.environ.get("TTL_S", "900"))
POLITIQUE = os.environ.get("RUNPOD_POLITIQUE", "1") != "0"
DELAIS = httpx.Timeout(connect=10.0, read=60.0, write=30.0, pool=10.0)
FIN_ECHEC = ("FAILED", "CANCELLED", "CANCELED", "TIMED_OUT")

HEADERS = {
    "Authorization": f"Bearer {RUNPOD_API_KEY}",
    "Content-Type": "application/json",
}

app = FastAPI()
EN_COURS = 0
DERNIERS: deque = deque(maxlen=30)


def sse(obj: Dict[str, Any]) -> bytes:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n".encode("utf-8")


def journal(suivi: Dict[str, Any]) -> None:
    DERNIERS.append(suivi)
    print(json.dumps({"relais": "travail", **suivi}, ensure_ascii=False), flush=True)


@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [{"id": "runpod-vllm", "object": "model", "owned_by": "runpod"}],
    }


@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as c:
            r = await c.get(f"{BASE}/health", headers=HEADERS)
            runpod = r.json() if r.status_code == 200 else {"erreur": f"RunPod /health {r.status_code}"}
    except httpx.HTTPError as e:
        runpod = {"erreur": f"RunPod injoignable : {e.__class__.__name__}"}
    return {
        "ok": True,
        "runpod": runpod,
        "enCours": EN_COURS,
        "derniers": list(DERNIERS)[-10:],
        "reglages": {"attenteMaxS": ATTENTE_MAX_S, "execMaxS": EXEC_MAX_S, "ttlS": TTL_S, "politique": POLITIQUE},
    }


def openai_messages_to_prompt(messages: List[Dict[str, Any]]) -> str:
    parts = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        parts.append(f"{role}: {content}")
    return "\n".join(parts)


async def runpod_submit_job(client: httpx.AsyncClient, openai_body: Dict[str, Any]) -> str:
    messages = openai_body.get("messages") or []
    prompt = openai_messages_to_prompt(messages)

    payload: Dict[str, Any] = {
        "input": {
            **openai_body,
            "prompt": prompt,
            "stream": bool(openai_body.get("stream", False)),
        }
    }
    if POLITIQUE:
        payload["policy"] = {"executionTimeout": EXEC_MAX_S * 1000, "ttl": TTL_S * 1000}

    try:
        r = await client.post(f"{BASE}/run", headers=HEADERS, json=payload)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Runpod /run injoignable : {e.__class__.__name__}")
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Runpod /run failed: {r.text[:300]}")

    job = r.json()
    job_id = job.get("id")
    if not job_id:
        raise HTTPException(status_code=502, detail=f"No job id in response: {str(job)[:300]}")
    return job_id


async def annuler(job_id: str) -> None:
    """Annule le travail chez RunPod (la question a été abandonnée) ; une panne ici n'empêche rien."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as c:
            await c.post(f"{BASE}/cancel/{job_id}", headers=HEADERS)
    except httpx.HTTPError:
        pass


def parse_openai_sse_blob(blob: str) -> Dict[str, Any]:
    """
    Worker sometimes returns strings that are themselves OpenAI SSE:
      "data: {...}\n\n"
      "data: [DONE]\n\n"
    We return:
      {"done": bool, "contents": [str,...]}
    """
    contents: List[str] = []
    done = False

    for raw_line in blob.splitlines():
        line = raw_line.strip()
        if not line or not line.startswith("data:"):
            continue

        payload = line[len("data:"):].strip()
        if payload == "[DONE]":
            done = True
            continue

        try:
            evt = json.loads(payload)
        except Exception:
            continue

        try:
            choices = evt.get("choices") or []
            if choices and isinstance(choices, list):
                delta = choices[0].get("delta") or {}
                c = delta.get("content")
                if isinstance(c, str) and c:
                    contents.append(c)
        except Exception:
            continue

    return {"done": done, "contents": contents}


def extract_texts_from_stream_item(item: Any) -> Dict[str, Any]:
    """
    Returns {"done": bool, "contents": [str,...]}. Handles: string with OpenAI SSE lines, dict with output.text = [str] or str,
    dict with output = str, plain str.
    """
    done = False
    out_texts: List[str] = []

    if item is None:
        return {"done": False, "contents": []}

    if isinstance(item, str):
        if "data:" in item:
            return parse_openai_sse_blob(item)
        return {"done": False, "contents": [item] if item else []}

    if not isinstance(item, dict):
        return {"done": False, "contents": []}

    if "text" in item:
        t = item.get("text")
        if isinstance(t, list):
            out_texts.extend([x for x in t if isinstance(x, str) and x])
        elif isinstance(t, str) and t:
            out_texts.append(t)

    output = item.get("output")

    if isinstance(output, str):
        if "data:" in output:
            return parse_openai_sse_blob(output)
        if output:
            out_texts.append(output)
        return {"done": done, "contents": out_texts}

    if isinstance(output, dict):
        t = output.get("text")
        if isinstance(t, list):
            out_texts.extend([x for x in t if isinstance(x, str) and x])
        elif isinstance(t, str) and t:
            out_texts.append(t)

    return {"done": done, "contents": out_texts}


@app.post("/v1/chat/completions")
async def chat_completions(req: Request):
    global EN_COURS
    body = await req.json()
    stream = bool(body.get("stream", False))
    t0 = time.monotonic()

    if not stream:
        async with httpx.AsyncClient(timeout=DELAIS) as client:
            job_id = await runpod_submit_job(client, body)
            suivi: Dict[str, Any] = {"job": job_id, "debut": round(time.time()), "statuts": [], "maxTokens": body.get("max_tokens")}
            EN_COURS += 1
            fini = False
            pannes = 0
            try:
                while True:
                    ecoule = time.monotonic() - t0
                    if ecoule > ATTENTE_MAX_S:
                        suivi["fin"] = "abandon : délai du relais"
                        raise HTTPException(status_code=504, detail=f"Travail RunPod {job_id} toujours {suivi['statuts'][-1][0] if suivi['statuts'] else 'inconnu'} après {ATTENTE_MAX_S} s")
                    if await req.is_disconnected():
                        suivi["fin"] = "abandon : appelant parti"
                        return Response(status_code=499)

                    # Coupure réseau ou panne passagère de RunPod (/status) : on réessaie au lieu de faire échouer la question.
                    try:
                        s = await client.get(f"{BASE}/status/{job_id}", headers=HEADERS)
                    except httpx.HTTPError:
                        pannes += 1
                        await asyncio.sleep(2)
                        continue
                    if s.status_code == 429 or s.status_code >= 500:
                        pannes += 1
                        await asyncio.sleep(2)
                        continue
                    if s.status_code != 200:
                        suivi["fin"] = f"/status {s.status_code}"
                        raise HTTPException(status_code=502, detail=f"Runpod /status failed: {s.text[:300]}")

                    sj = s.json()
                    st = sj.get("status")
                    if not suivi["statuts"] or suivi["statuts"][-1][0] != st:
                        suivi["statuts"].append([st, round(time.monotonic() - t0, 1)])

                    if st == "COMPLETED":
                        fini = True
                        suivi.update(fin="ok", delayMs=sj.get("delayTime"), executionMs=sj.get("executionTime"))
                        entetes = {"X-Runpod-Job": job_id, "X-Relais-Ms": str(round((time.monotonic() - t0) * 1000))}
                        if sj.get("delayTime") is not None:
                            entetes["X-Runpod-Delay-Ms"] = str(sj["delayTime"])
                        if sj.get("executionTime") is not None:
                            entetes["X-Runpod-Execution-Ms"] = str(sj["executionTime"])
                        return JSONResponse(sj.get("output", sj), headers=entetes)

                    if st in FIN_ECHEC:
                        fini = True
                        suivi["fin"] = st
                        raise HTTPException(status_code=502, detail=f"Runpod job ended: {st} {str(sj.get('error', ''))[:300]}")

                    await asyncio.sleep(1)
            finally:
                EN_COURS -= 1
                if not fini:
                    await annuler(job_id)
                suivi.update(relaisMs=round((time.monotonic() - t0) * 1000), pannesStatus=pannes)
                journal(suivi)

    async def gen():
        global EN_COURS
        async with httpx.AsyncClient(timeout=DELAIS) as client:
            job_id = await runpod_submit_job(client, body)
            suivi: Dict[str, Any] = {"job": job_id, "debut": round(time.time()), "flux": True}
            EN_COURS += 1
            fini = False
            try:
                yield sse({
                    "id": job_id,
                    "object": "chat.completion.chunk",
                    "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}],
                })

                while True:
                    if time.monotonic() - t0 > ATTENTE_MAX_S:
                        suivi["fin"] = "abandon : délai du relais"
                        yield sse({"error": f"Travail RunPod {job_id} trop long ({ATTENTE_MAX_S} s)"})
                        break
                    try:
                        sr = await client.get(f"{BASE}/stream/{job_id}", headers=HEADERS)
                    except httpx.HTTPError:
                        await asyncio.sleep(1)
                        continue
                    if sr.status_code != 200:
                        suivi["fin"] = f"/stream {sr.status_code}"
                        yield sse({"error": f"Runpod /stream failed: {sr.text[:300]}"})
                        break

                    try:
                        data = sr.json()
                    except Exception:
                        await asyncio.sleep(0.25)
                        continue

                    if not isinstance(data, dict):
                        await asyncio.sleep(0.25)
                        continue

                    status = data.get("status")
                    items = data.get("stream", []) or []

                    if isinstance(items, (dict, str)):
                        items = [items]
                    elif not isinstance(items, list):
                        items = []

                    saw_done_marker = False

                    for item in items:
                        parsed = extract_texts_from_stream_item(item)
                        for t in parsed["contents"]:
                            yield sse({
                                "id": job_id,
                                "object": "chat.completion.chunk",
                                "choices": [{"index": 0, "delta": {"content": t}, "finish_reason": None}],
                            })
                        if parsed["done"]:
                            saw_done_marker = True

                    if saw_done_marker or status == "COMPLETED":
                        fini = True
                        suivi["fin"] = "ok"
                        break
                    if status in FIN_ECHEC:
                        fini = True
                        suivi["fin"] = status
                        yield sse({"error": f"Runpod job ended: {status}"})
                        break

                    await asyncio.sleep(0.25)

                yield sse({
                    "id": job_id,
                    "object": "chat.completion.chunk",
                    "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
                })
                yield b"data: [DONE]\n\n"
            finally:
                # Aussi quand l'appelant ferme le flux en cours de route (GeneratorExit).
                EN_COURS -= 1
                if not fini:
                    await annuler(job_id)
                suivi["relaisMs"] = round((time.monotonic() - t0) * 1000)
                journal(suivi)

    return StreamingResponse(gen(), media_type="text/event-stream")
