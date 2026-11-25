import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as usersModel from "../Models/users.model.js";

// Vrai si la valeur est un texte non vide
const isText = (value) => typeof value === "string" && value.trim() !== "";

// POST /auth/register : inscription (le rôle est toujours "user")
export async function register(req, res) {
  try {
    const { username, email, password } = req.body ?? {};

    // Champs manquants → 403 (code imposé par le cahier des charges)
    if (!isText(username) || !isText(email) || !isText(password)) {
      return res.status(403).json({ error: "username, email et password sont obligatoires" });
    }

    // Le mot de passe n'est jamais stocké en clair : on enregistre son hash bcrypt
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = await usersModel.create(username, email, hashedPassword);

    // On ne renvoie JAMAIS le mot de passe (ni son hash)
    return res.status(201).json({
      message: "Inscription réussie",
      user: { us_id: userId, us_username: username, us_email: email, us_role: "user" },
    });
  } catch (error) {
    // Contraintes UNIQUE de la table users (username et email)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(403).json({ error: "Ce nom d'utilisateur ou cet email est déjà utilisé" });
    }
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// POST /auth/login : connexion → renvoie un token JWT valable 1 heure
export async function login(req, res) {
  try {
    const { username, password } = req.body ?? {};

    if (!isText(username) || !isText(password)) {
      return res.status(403).json({ error: "username et password sont obligatoires" });
    }

    // Même message si l'utilisateur n'existe pas ou si le mot de passe est faux
    const user = await usersModel.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.us_password)) {
      return res.status(403).json({ error: "Identifiants incorrects" });
    }

    const token = jwt.sign(
      {
        us_id: user.us_id,
        us_username: user.us_username,
        us_email: user.us_email,
        us_role: user.us_role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ message: "Connexion réussie", token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
