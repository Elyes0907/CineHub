import * as usersModel from "../Models/users.model.js";

// Vrai si la valeur est un texte non vide
const isText = (value) => typeof value === "string" && value.trim() !== "";

// Convertit l'id de l'URL en nombre (null si ce n'est pas un entier)
const toId = (value) => (/^\d+$/.test(value) ? Number(value) : null);

// GET /users : liste de tous les utilisateurs (admin), sans mot de passe
export async function getAllUsers(req, res) {
  try {
    const users = await usersModel.findAll();
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /users/me : profil de l'utilisateur connecté (identifié par le token → req.user)
export async function getMe(req, res) {
  try {
    const user = await usersModel.findById(req.user.us_id);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /users/:id : détail d'un utilisateur, sans mot de passe
// (le cahier des charges autorise tout utilisateur connecté)
export async function getUserById(req, res) {
  try {
    const id = toId(req.params.id);
    const user = id && (await usersModel.findById(id));
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// PATCH /users/:id : modifier username / email (son propre profil, ou admin)
export async function updateUser(req, res) {
  try {
    const id = toId(req.params.id);

    // Un utilisateur normal ne peut modifier que son propre profil
    if (id !== req.user.us_id && req.user.us_role !== "admin") {
      return res.status(403).json({ error: "Vous ne pouvez modifier que votre propre profil" });
    }

    const existingUser = id && (await usersModel.findById(id));
    if (!existingUser) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const { username, email } = req.body ?? {};
    if (username === undefined && email === undefined) {
      return res.status(403).json({ error: "Aucun champ à modifier (username, email)" });
    }
    if ((username !== undefined && !isText(username)) || (email !== undefined && !isText(email))) {
      return res.status(403).json({ error: "username et email doivent être des textes non vides" });
    }

    await usersModel.updateById(id, { username, email });
    const user = await usersModel.findById(id);
    return res.status(200).json({ message: "Utilisateur mis à jour", user });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(403).json({ error: "Ce nom d'utilisateur ou cet email est déjà utilisé" });
    }
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// DELETE /users/:id : supprimer un utilisateur (admin)
export async function deleteUser(req, res) {
  try {
    const id = toId(req.params.id);
    const user = id && (await usersModel.findById(id));
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    await usersModel.deleteById(id);
    return res.status(200).json({ message: "Utilisateur supprimé" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
