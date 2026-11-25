import * as screeningsModel from "../Models/screenings.model.js";
import * as filmsModel from "../Models/films.model.js";
import * as roomsModel from "../Models/rooms.model.js";

// Vrai si la valeur est un entier strictement positif
const isPositiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

// Format attendu : "2026-12-01 20:30:00" (les secondes sont facultatives)
const isDateTime = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value) &&
  !Number.isNaN(Date.parse(value.replace(" ", "T")));

// Prix : nombre positif avec 2 décimales maximum (colonne DECIMAL(6,2) → 9999.99 maximum)
const isPrice = (value) => /^\d{1,4}(\.\d{1,2})?$/.test(String(value));

// Convertit l'id de l'URL en nombre (null si ce n'est pas un entier)
const toId = (value) => (/^\d+$/.test(value) ? Number(value) : null);

// GET /screenings : toutes les séances (avec titre du film + nom de la salle)
export async function getAllScreenings(req, res) {
  try {
    const screenings = await screeningsModel.findAll();
    return res.status(200).json(screenings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /screenings/film/:filmID : séances d'un film
export async function getScreeningsByFilm(req, res) {
  try {
    const filmId = toId(req.params.filmID);
    const film = filmId && (await filmsModel.findById(filmId));
    if (!film) {
      return res.status(404).json({ error: "Film introuvable" });
    }

    const screenings = await screeningsModel.findByFilm(filmId);
    return res.status(200).json(screenings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /screenings/:id : détail d'une séance
export async function getScreeningById(req, res) {
  try {
    const id = toId(req.params.id);
    const screening = id && (await screeningsModel.findById(id));
    if (!screening) {
      return res.status(404).json({ error: "Séance introuvable" });
    }
    return res.status(200).json(screening);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// POST /screenings (admin) : créer une séance
export async function createScreening(req, res) {
  try {
    const { film, room, datetime, price } = req.body ?? {};

    // film, room, datetime et price sont obligatoires (et doivent avoir un format valide)
    if (!isPositiveInt(film) || !isPositiveInt(room) || !isDateTime(datetime) || !isPrice(price)) {
      return res.status(403).json({
        error:
          "film, room, datetime (AAAA-MM-JJ HH:MM:SS) et price sont obligatoires et doivent être valides",
      });
    }

    // Le film et la salle doivent exister
    if (!(await filmsModel.findById(Number(film)))) {
      return res.status(404).json({ error: "Film introuvable" });
    }
    if (!(await roomsModel.findById(Number(room)))) {
      return res.status(404).json({ error: "Salle introuvable" });
    }

    const screeningId = await screeningsModel.create({
      film: Number(film),
      room: Number(room),
      datetime,
      price: Number(price),
    });

    const screening = await screeningsModel.findById(screeningId);
    return res.status(201).json({ message: "Séance créée", screening });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// PATCH /screenings/:id (admin) : modification partielle
export async function updateScreening(req, res) {
  try {
    const id = toId(req.params.id);
    const existingScreening = id && (await screeningsModel.findById(id));
    if (!existingScreening) {
      return res.status(404).json({ error: "Séance introuvable" });
    }

    const { film, room, datetime, price } = req.body ?? {};

    // On valide seulement les champs fournis : les autres restent inchangés
    if (
      (film !== undefined && !isPositiveInt(film)) ||
      (room !== undefined && !isPositiveInt(room)) ||
      (datetime !== undefined && !isDateTime(datetime)) ||
      (price !== undefined && !isPrice(price))
    ) {
      return res.status(403).json({
        error:
          "film et room doivent être des identifiants, datetime au format AAAA-MM-JJ HH:MM:SS, price un nombre positif",
      });
    }
    if (film !== undefined && !(await filmsModel.findById(Number(film)))) {
      return res.status(404).json({ error: "Film introuvable" });
    }
    if (room !== undefined && !(await roomsModel.findById(Number(room)))) {
      return res.status(404).json({ error: "Salle introuvable" });
    }

    await screeningsModel.updateById(id, {
      film: film === undefined ? undefined : Number(film),
      room: room === undefined ? undefined : Number(room),
      datetime,
      price: price === undefined ? undefined : Number(price),
    });

    const screening = await screeningsModel.findById(id);
    return res.status(200).json({ message: "Séance mise à jour", screening });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// DELETE /screenings/:id (admin) : supprime aussi ses réservations (ON DELETE CASCADE)
export async function deleteScreening(req, res) {
  try {
    const id = toId(req.params.id);
    const screening = id && (await screeningsModel.findById(id));
    if (!screening) {
      return res.status(404).json({ error: "Séance introuvable" });
    }

    await screeningsModel.deleteById(id);
    return res.status(200).json({ message: "Séance supprimée" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
