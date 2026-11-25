import * as filmsModel from "../Models/films.model.js";
import * as screeningsModel from "../Models/screenings.model.js";

// Vrai si la valeur est un texte non vide
const isText = (value) => typeof value === "string" && value.trim() !== "";

// Vrai si la valeur est un entier strictement positif
const isPositiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

// Date au format AAAA-MM-JJ
const isDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

// Convertit l'id de l'URL en nombre (null si ce n'est pas un entier)
const toId = (value) => (/^\d+$/.test(value) ? Number(value) : null);

// true / 1 → 1 ; false / 0 / "false" → 0   (fi_is_showing est un TINYINT)
const toBit = (value) =>
  value === false || value === 0 || value === "0" || value === "false" ? 0 : 1;

// GET /films : tous les films
export async function getAllFilms(req, res) {
  try {
    const films = await filmsModel.findAll();
    return res.status(200).json(films);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /films/showing : films à l'affiche
export async function getShowingFilms(req, res) {
  try {
    const films = await filmsModel.findShowing();
    return res.status(200).json(films);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /films/:id : le film + ses séances à venir (avec le nom de la salle)
export async function getFilmById(req, res) {
  try {
    const id = toId(req.params.id);
    const film = id && (await filmsModel.findById(id));
    if (!film) {
      return res.status(404).json({ error: "Film introuvable" });
    }

    const screenings = await screeningsModel.findUpcomingByFilm(id);
    return res.status(200).json({ ...film, screenings });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// POST /films (admin) : créer un film
export async function createFilm(req, res) {
  try {
    const { title, description, duration, genre, release_date, is_showing } = req.body ?? {};

    // title et duration sont obligatoires
    if (!isText(title) || !isPositiveInt(duration)) {
      return res
        .status(403)
        .json({ error: "title (texte) et duration (entier > 0, en minutes) sont obligatoires" });
    }
    if (release_date !== undefined && release_date !== null && !isDate(release_date)) {
      return res.status(403).json({ error: "release_date doit être au format AAAA-MM-JJ" });
    }

    const filmId = await filmsModel.create({
      title,
      description,
      duration: Number(duration),
      genre,
      releaseDate: release_date,
      isShowing: is_showing === undefined ? 1 : toBit(is_showing), // à l'affiche par défaut
    });

    const film = await filmsModel.findById(filmId);
    return res.status(201).json({ message: "Film créé", film });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// PATCH /films/:id (admin) : modification partielle (seuls les champs envoyés changent)
export async function updateFilm(req, res) {
  try {
    const id = toId(req.params.id);
    const existingFilm = id && (await filmsModel.findById(id));
    if (!existingFilm) {
      return res.status(404).json({ error: "Film introuvable" });
    }

    const { title, description, duration, genre, release_date, is_showing } = req.body ?? {};

    // On valide seulement les champs fournis : les autres restent inchangés
    if (title !== undefined && !isText(title)) {
      return res.status(403).json({ error: "title doit être un texte non vide" });
    }
    if (duration !== undefined && !isPositiveInt(duration)) {
      return res.status(403).json({ error: "duration doit être un entier > 0 (minutes)" });
    }
    if (release_date !== undefined && release_date !== null && !isDate(release_date)) {
      return res.status(403).json({ error: "release_date doit être au format AAAA-MM-JJ" });
    }

    await filmsModel.updateById(id, {
      title,
      description,
      duration: duration === undefined ? undefined : Number(duration),
      genre,
      releaseDate: release_date,
      isShowing: is_showing === undefined ? undefined : toBit(is_showing),
    });

    const film = await filmsModel.findById(id);
    return res.status(200).json({ message: "Film mis à jour", film });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// DELETE /films/:id (admin) : supprime aussi ses séances et leurs réservations (ON DELETE CASCADE)
export async function deleteFilm(req, res) {
  try {
    const id = toId(req.params.id);
    const film = id && (await filmsModel.findById(id));
    if (!film) {
      return res.status(404).json({ error: "Film introuvable" });
    }

    await filmsModel.deleteById(id);
    return res.status(200).json({ message: "Film supprimé" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
