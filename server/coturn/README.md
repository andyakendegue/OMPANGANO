# coturn (appels vidéo)
Installation sur le VPS : `/opt/coturn` (docker compose up -d). `.env` : TURN_SECRET (le même que dans /opt/ompangano/server/.env), TURN_IP_PUBLIQUE.
Ports à ouvrir chez l'hébergeur si un pare-feu existe : 3478 UDP+TCP, 49160-49260 UDP.
Dans l'API : TURN_URLS=turn:IP:3478?transport=udp,turn:IP:3478?transport=tcp  TURN_SECRET=…  (STUN_URLS reste public par défaut).
Test : https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ avec un identifiant obtenu par GET /v1/appels/ice.
