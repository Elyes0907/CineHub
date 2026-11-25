import * as roomsModel from "../Models/rooms.model.js";

// Vrai si la valeur est un texte non vide
const isText = (value) => typeof value === "string" && value.trim() !== "";

// Vrai si la valeur est un entier strictement positif
const isPositiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

// Convertit l'id de l'URL en nombre (null si ce n'est pas un entier)
const toId = (value) => (/^\d+$/.test(value) ? Number(value) : null);

// GET /rooms : toutes les salles
export async function getAllRooms(req, res) {
  try {
    const rooms = await roomsModel.findAll();
    return res.status(200).json(rooms);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /rooms/:id : détail d'une salle
export async function getRoomById(req, res) {
  try {
    const id = toId(req.params.id);
    const room = id && (await roomsModel.findById(id));
    if (!room) {
      return res.status(404).json({ error: "Salle introuvable" });
    }
    return res.status(200).json(room);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// POST /rooms (admin) : créer une salle
export async function createRoom(req, res) {
  try {
    const { name, capacity } = req.body ?? {};

    // name et capacity sont obligatoires
    if (!isText(name) || !isPositiveInt(capacity)) {
      return res
        .status(403)
        .json({ error: "name (texte) et capacity (entier > 0) sont obligatoires" });
    }

    const roomId = await roomsModel.create({ name, capacity: Number(capacity) });
    const room = await roomsModel.findById(roomId);
    return res.status(201).json({ message: "Salle créée", room });
  } catch (error) {
    // Contrainte UNIQUE sur ro_name
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(403).json({ error: "Une salle porte déjà ce nom" });
    }
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// PATCH /rooms/:id (admin) : modification partielle
export async function updateRoom(req, res) {
  try {
    const id = toId(req.params.id);
    const existingRoom = id && (await roomsModel.findById(id));
    if (!existingRoom) {
      return res.status(404).json({ error: "Salle introuvable" });
    }

    const { name, capacity } = req.body ?? {};

    // On valide seulement les champs fournis : les autres restent inchangés
    if (name !== undefined && !isText(name)) {
      return res.status(403).json({ error: "name doit être un texte non vide" });
    }
    if (capacity !== undefined && !isPositiveInt(capacity)) {
      return res.status(403).json({ error: "capacity doit être un entier > 0" });
    }

    await roomsModel.updateById(id, {
      name,
      capacity: capacity === undefined ? undefined : Number(capacity),
    });

    const room = await roomsModel.findById(id);
    return res.status(200).json({ message: "Salle mise à jour", room });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(403).json({ error: "Une salle porte déjà ce nom" });
    }
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// DELETE /rooms/:id (admin) : supprime aussi ses séances et leurs réservations (ON DELETE CASCADE)
export async function deleteRoom(req, res) {
  try {
    const id = toId(req.params.id);
    const room = id && (await roomsModel.findById(id));
    if (!room) {
      return res.status(404).json({ error: "Salle introuvable" });
    }

    await roomsModel.deleteById(id);
    return res.status(200).json({ message: "Salle supprimée" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
