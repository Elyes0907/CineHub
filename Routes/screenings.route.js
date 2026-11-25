import express from "express";
import { checkAdmin } from "../Middlewares/admin.middleware.js";
import * as screeningsController from "../Controllers/screenings.controller.js";

// checkToken est déjà appliqué sur tout /screenings dans index.js
const router = express.Router();

// Lecture : tout utilisateur connecté
router.get("/", screeningsController.getAllScreenings);
router.get("/film/:filmID", screeningsController.getScreeningsByFilm); // AVANT "/:id"
router.get("/:id", screeningsController.getScreeningById);

// Écriture : admin uniquement
router.post("/", checkAdmin, screeningsController.createScreening);
router.patch("/:id", checkAdmin, screeningsController.updateScreening);
router.delete("/:id", checkAdmin, screeningsController.deleteScreening);

export default router;
