import express from "express";
import { checkAdmin } from "../Middlewares/admin.middleware.js";
import * as filmsController from "../Controllers/films.controller.js";

// checkToken est déjà appliqué sur tout /films dans index.js
const router = express.Router();

// Lecture : tout utilisateur connecté
router.get("/", filmsController.getAllFilms);
router.get("/showing", filmsController.getShowingFilms); // doit rester AVANT "/:id"
router.get("/:id", filmsController.getFilmById);

// Écriture : admin uniquement
router.post("/", checkAdmin, filmsController.createFilm);
router.patch("/:id", checkAdmin, filmsController.updateFilm);
router.delete("/:id", checkAdmin, filmsController.deleteFilm);

export default router;
