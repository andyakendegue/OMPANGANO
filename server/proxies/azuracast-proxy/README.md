# Proxy AzuraCast (web radio sur un pod RunPod)
1. Sur RunPod : un pod avec l'image AzuraCast (ports HTTP 80 et ceux des flux), un volume réseau monté sur `/var/azuracast`.
2. Ici : `.env` avec `AZURACAST_ORIGINE=https://<id-du-pod>-80.proxy.runpod.net` puis `docker compose up -d`.
3. DNS : `radio.essaka.engineering` → serveur ; Caddy : `radio.essaka.engineering { reverse_proxy 172.17.0.1:8004 }`.
4. API Nkala (`/opt/ompangano/server/.env`) : `AZURACAST_URL=https://radio.essaka.engineering`, `AZURACAST_API_URL=http://172.17.0.1:8003`, `AZURACAST_API_KEY=…`.
5. Console > IA, régie > « Web radio » > « Importer les stations dans Ontci ».
Remarque : AzuraCast diffuse de l'audio (Icecast, HLS audio). La web TV vidéo se saisit dans la collection `chaines_tv` avec l'adresse HLS de votre serveur vidéo.
