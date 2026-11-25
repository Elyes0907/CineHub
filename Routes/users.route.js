import express from "express";
import { checkAdmin } from "../Middlewares/admin.middleware.js";
import * as usersController from "../Controllers/users.controller.js";

// checkToken est déjà appliqué sur tout /users dans index.js
const router = express.Router();

router.get("/", checkAdmin, usersController.getAllUsers);
router.get("/me", usersController.getMe); // doit rester AVANT "/:id", sinon "me" serait pris pour un id
router.get("/:id", usersController.getUserById);
router.patch("/:id", usersController.updateUser); // soi-même ou admin : vérifié dans le controller
router.delete("/:id", checkAdmin, usersController.deleteUser);

export default router;
