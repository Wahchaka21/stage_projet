# Application JulesCoaching - Installation & Exécution

Pour que l'application fonctionne correctement, il est important de créer à l'aide d'un outil externe comme Insomnia ou Postman un utilisateur administrateur (à l'aide des routes créer dans le dossier backend), sans ce dernier, la partie message est désactivé par défaut.

## Technologie utilisées

| Couche | Technologie |
|--------|--------------|
| Frontend | Angular 20 + TailwindCSS + Vite |
| Backend | Node.js / Express |
| Base de données | MongoDB |
| Environnement | Docker / Docker Compose |
| Tests backend | Mocha + Should |
| Authentification | JWT (JSON Web Token) |

---

## 1) Prérequis

- [Node](https://nodejs.org/en)
- [Git](https://git-scm.com/)  
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou Docker Engine  
- [Docker Compose v2](https://docs.docker.com/compose/)

## 2) Cloner le dépôt

```bash
git clone https://github.com/<VOTRE_UTILISATEUR>/<VOTRE_REPO>.git
cd <VOTRE_REPO>
```

---

## 3) Fichier d'environnement .env

Crée un fichier nommé .env à la racine du dossier backend avec les variable suivante : 

PORT=3000

MONGO_URL=mongodb://localhost:27017/projet_stage

JWT_SECRET=VOTRE_CODE
JWT_ISSUER=your-app
JWT_AUDIENCE=your-api

CORS_ORIGINS=http://localhost:5173, http://localhost:4200

BASE_URL=http://localhost:3000

HTTPS_ENABLED=false

REFRESH_JWT_SECRET=VOTRE_CODE
REFRESH_EXPIRES_IN=30d
REFRESH_MAX_AGE=30d

---

## 4) Lancement complet avec Docker

Exécuter simplement à la racine du projet :
```bash
docker compose up --build
```

## 5) Lancement sans Docker

Si vous n'utiliser pas Docker, vous devez vous rendre dans les dossiers "frontend" et "backend", puis, exécuter :
```bash
npm i
```
Cela installera tout les packages utilisé lors du développement.

Ensuite pour lancer l'application :

Se rendre à l'aide de terminal dans le dossier "frontend" et exécuter :
```bash
npm start
```
Puis, dans un autre terminal, se rendre dans le dossier "backend" et exécuter :
```bash
node server.js
```