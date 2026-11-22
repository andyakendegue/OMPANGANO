FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl libsndfile1 ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Kokoro-82M (Apache 2.0), ONNX : pleine précision (défaut) et quantifiée (TTS_MODELE=/modele/kokoro-v1.0.int8.onnx) ; empreintes vérifiées.
ARG BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
RUN mkdir /modele && cd /modele \
 && curl -fsSLO $BASE/kokoro-v1.0.onnx && curl -fsSLO $BASE/kokoro-v1.0.int8.onnx && curl -fsSLO $BASE/voices-v1.0.bin \
 && echo "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5  kokoro-v1.0.onnx" | sha256sum -c - \
 && echo "6e742170d309016e5891a994e1ce1559c702a2ccd0075e67ef7157974f6406cb  kokoro-v1.0.int8.onnx" | sha256sum -c - \
 && echo "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d  voices-v1.0.bin" | sha256sum -c -
# ZIPA large CR-CTC (CC BY 4.0, Zhu et al. 2025), version compacte, révision et empreintes figées.
ARG ZIPA=https://huggingface.co/anyspeech/zipa-large-crctc-500k/resolve/62c7a6e31f5035045de2538448a46b037948a206
RUN mkdir -p /modele/zipa && cd /modele/zipa \
 && curl -fsSL $ZIPA/model.int8.onnx -o model.int8.onnx && curl -fsSL $ZIPA/tokens.txt -o tokens.txt \
 && echo "b1e0dd76507e8f851ad13f43f77d1f745f876b6e33c1527f2e2fed9de1f20704  model.int8.onnx" | sha256sum -c - \
 && echo "f8e042a0c9130532b22d03ec7cae2f75a23fbec70c450c31a8efb51787b2b8fe  tokens.txt" | sha256sum -c -
COPY app.py reconnaissance.py ./
RUN useradd -r -u 10001 tts
USER tts
HEALTHCHECK --interval=60s --timeout=5s CMD curl -fs http://${LISTEN_HOST:-127.0.0.1}:${LISTEN_PORT:-8700}/sante || exit 1
CMD ["python", "app.py"]
