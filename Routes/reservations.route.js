import express from "express";
import { checkAdmin } from "../Middlewares/admin.middleware.js";
import * as reservationsController from "../Controllers/reservations.controller.js";

// checkToken est déjà appliqué sur tout /reservations dans index.js
const router = express.Router();

router.get("/", checkAdmin, reservationsController.getAllReservations);
router.get("/me", reservationsController.getMyReservations);
router.get(
  "/screening/:screeningID",
  checkAdmin,
  reservationsController.getReservationsByScreening
);
router.post("/", reservationsController.createReservation);
// Sa propre réservation ou admin : vérifié dans le controller
router.delete("/:id", reservationsController.deleteReservation);

export default router;
