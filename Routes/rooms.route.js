import express from "express";
import { checkAdmin } from "../Middlewares/admin.middleware.js";
import * as roomsController from "../Controllers/rooms.controller.js";

// checkToken est déjà appliqué sur tout /rooms dans index.js
const router = express.Router();

// Lecture : tout utilisateur connecté
router.get("/", roomsController.getAllRooms);
router.get("/:id", roomsController.getRoomById);

// Écriture : admin uniquement
router.post("/", checkAdmin, roomsController.createRoom);
router.patch("/:id", checkAdmin, roomsController.updateRoom);
router.delete("/:id", checkAdmin, roomsController.deleteRoom);

export default router;
