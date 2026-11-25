# CineHub

API REST de gestion de cinéma (films, salles, séances, réservations) en Node.js, Express et MySQL.
Authentification par token JWT, avec deux rôles : `user` et `admin`.

## Installation

1. Installer les dépendances :

   ```bash
   npm install
   ```

2. Importer la base de données. Le script `bdd.sql` crée la base `cinehub`, les 5 tables, l'utilisateur MySQL `cine_user` et les données de test :

   ```bash
   mysql -u root -p --default-character-set=utf8mb4
   ```

   Puis, à l'invite `mysql>` :

   ```sql
   source bdd.sql
   ```

   Attention : la base `cinehub` est supprimée puis recréée à chaque import.

3. Copier `.env.example` en `.env` et le compléter :

   ```
   SERVER_PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=cine_user
   DB_PASSWORD=cine_password
   DB_NAME=cinehub
   JWT_SECRET=une_cle_secrete_longue
   ```

   `DB_PASSWORD` doit être le mot de passe défini dans `bdd.sql` pour `cine_user`.

## Lancement

```bash
npm start
```

L'API répond sur http://127.0.0.1:3000 (le port vient de `SERVER_PORT`).
Un appel à `GET /` renvoie `{ "status": "OK" }`.

## Comptes de test

| Rôle  | username | mot de passe |
|-------|----------|--------------|
| admin | admin    | admin123     |

Un compte `user` se crée avec `POST /auth/register` (le rôle est toujours `user`).

## Exemples d'appels

Toutes les routes, sauf `/` et `/auth/*`, demandent le header `Authorization: Bearer <token>`.
Le token est renvoyé par `POST /auth/login`.

**Inscription**

```
POST /auth/register
{ "username": "alice", "email": "alice@mail.com", "password": "secret123" }
```

**Connexion** (renvoie `{ "message": "...", "token": "..." }`)

```
POST /auth/login
{ "username": "alice", "password": "secret123" }
```

**Films à l'affiche, puis détail d'un film avec ses séances à venir**

```
GET /films/showing
GET /films/1
```

**Réserver une séance, puis consulter ses réservations**

```
POST /reservations
{ "screening": 3, "seats": 2 }

GET /reservations/me
```

**Créer un film (admin)**

```
POST /films
{ "title": "Inception", "duration": 148, "genre": "Science-fiction", "release_date": "2010-07-21", "is_showing": true }
```

**Créer une séance (admin)**

```
POST /screenings
{ "film": 1, "room": 2, "datetime": "2026-12-01 20:30:00", "price": 9.50 }
```

## Structure du projet

```
cinehub/
├── Config/db.js              Connexion MySQL (pool mysql2) et withTransaction (suppressions « tout ou rien »)
├── Controllers/              Validation des entrées, codes HTTP, appel du model
├── Middlewares/              checkToken (JWT) et checkAdmin (rôle)
├── Models/                   Requêtes SQL uniquement (requêtes préparées)
├── Routes/                   Déclaration des endpoints
├── bdd.sql                   Base, tables, utilisateur MySQL, données de test
└── index.js                  Point d'entrée
```

## Codes HTTP

| Code | Situation |
|------|-----------|
| 200  | Lecture, modification, suppression réussies |
| 201  | Création réussie |
| 401  | Token absent |
| 403  | Token invalide, identifiants incorrects, champs manquants ou invalides, accès réservé aux admins, plus de places, doublon |
| 404  | Ressource introuvable |
| 500  | Erreur serveur ou base de données |

Toutes les erreurs sont renvoyées en JSON : `{ "error": "Message explicite" }`.

## Suppression en cascade

Quand un admin supprime un élément, l'API supprime aussi ce qui s'y rattache :

- supprimer un film supprime ses séances et leurs réservations ;
- supprimer une salle supprime ses séances et leurs réservations ;
- supprimer une séance supprime ses réservations ;
- supprimer un utilisateur supprime ses réservations.

C'est le model (`deleteById`) qui le fait, avec `withTransaction` (`Config/db.js`) : les suppressions se font
dans l'ordre (réservations, puis séances, puis l'élément), et si l'une échoue rien n'est supprimé.

Cela marche quelle que soit la façon dont les tables ont été créées : avec `bdd.sql` (qui déclare aussi
`ON DELETE CASCADE`) ou avec un schéma sans `ON DELETE`, comme celui du cahier des charges. Dans ce second cas,
sans ce travail du model, MySQL refuserait la suppression : « Cannot delete or update a parent row:
a foreign key constraint fails ».
