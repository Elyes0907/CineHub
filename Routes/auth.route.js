import express from "express";
import * as authController from "../Controllers/auth.controller.js";

// Routes publiques : aucun middleware (pas de token nécessaire)
const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

export default router;
