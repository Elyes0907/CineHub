// Point d'entrée de l'API CineHub
import "dotenv/config"; // charge le fichier .env : doit rester en premier
import express from "express";

import { checkToken } from "./Middlewares/auth.middleware.js";
import authRoutes from "./Routes/auth.route.js";
import usersRoutes from "./Routes/users.route.js";
import filmsRoutes from "./Routes/films.route.js";
import roomsRoutes from "./Routes/rooms.route.js";
import screeningsRoutes from "./Routes/screenings.route.js";
import reservationsRoutes from "./Routes/reservations.route.js";

const app = express();

// Permet de lire le JSON envoyé dans le body (req.body)
app.use(express.json());

// Santé de l'API (public)
app.get("/", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Routes publiques : pas de token nécessaire
app.use("/auth", authRoutes);

// Routes protégées : checkToken s'exécute avant chaque route.
// checkAdmin est ajouté route par route dans les fichiers du dossier Routes/.
app.use("/users", checkToken, usersRoutes);
app.use("/films", checkToken, filmsRoutes);
app.use("/rooms", checkToken, roomsRoutes);
app.use("/screenings", checkToken, screeningsRoutes);
app.use("/reservations", checkToken, reservationsRoutes);

// Route inconnue : réponse JSON (et non la page HTML d'Express)
app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

// Erreur non prévue, par exemple un JSON invalide dans le body : réponse JSON
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON invalide dans le corps de la requête" });
  }
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

const PORT = process.env.SERVER_PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur démarré : http://127.0.0.1:${PORT}`);
});
