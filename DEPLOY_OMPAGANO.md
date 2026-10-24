# Guide de Déploiement : Site OMPAGANO (Projet Firebase NKALA APP)

Ce projet est configuré pour déployer **exclusivement sur le site `ompangano`** du projet Firebase **NKALA APP**, sans jamais impacter le site `enenga`.

---

## 1. Structure Multi-Sites dans Firebase

Dans votre projet Firebase **NKALA APP**, vous avez deux sites d'hébergement :
- **`enenga`** : `enenga.web.app` (préservé, non affecté)
- **`ompangano`** : `ompangano.web.app` (cible de cette application)

---

## 2. Configuration locale préconfigurée

- **`firebase.json`** :
  ```json
  {
    "hosting": {
      "site": "ompangano",
      "public": "dist",
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  }
  ```
  Grâce à la propriété `"site": "ompangano"`, tout déploiement est strictement cloisonné au site `ompangano`.

---

## 3. Étapes de Déploiement depuis votre machine

### Étape 1 : Connexion
```bash
firebase login
```

### Étape 2 : Sélectionner le projet Firebase NKALA APP
Pour voir l'identifiant exact de votre projet **NKALA APP** :
```bash
firebase projects:list
```
Puis activez-le (remplacez `<PROJECT_ID>` par l'identifiant de NKALA APP affiché dans la liste) :
```bash
firebase use <PROJECT_ID>
```

### Étape 3 : Déployer uniquement le site OMPAGANO
```bash
npm run deploy:hosting
```
*Ou directement :*
```bash
npm run build && firebase deploy --only hosting:ompangano
```

---

## 4. Associer le domaine personnalisé `source.essaka.engineering`

1. Ouvrez la **Console Firebase** > Projet **NKALA APP**.
2. Allez dans **Hosting** > cliquez sur le site **`ompangano`**.
3. Cliquez sur **Ajouter un domaine personnalisé** et saisissez : `source.essaka.engineering`.
4. Chez votre registrar DNS (zone `essaka.engineering`) :
   - **Type :** `CNAME`
   - **Nom :** `source`
   - **Valeur :** `ompangano.web.app`
5. Le certificat SSL Let's Encrypt sera généré automatiquement par Google.
