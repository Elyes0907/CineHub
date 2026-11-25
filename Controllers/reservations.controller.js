import * as reservationsModel from "../Models/reservations.model.js";
import * as screeningsModel from "../Models/screenings.model.js";

// Convertit l'id de l'URL en nombre (null si ce n'est pas un entier)
const toId = (value) => (/^\d+$/.test(value) ? Number(value) : null);

// GET /reservations (admin) : toutes les réservations
export async function getAllReservations(req, res) {
  try {
    const reservations = await reservationsModel.findAll();
    return res.status(200).json(reservations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /reservations/me : mes réservations (l'utilisateur vient du token)
export async function getMyReservations(req, res) {
  try {
    const reservations = await reservationsModel.findByUser(req.user.us_id);
    return res.status(200).json(reservations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// GET /reservations/screening/:screeningID (admin) : réservations d'une séance
export async function getReservationsByScreening(req, res) {
  try {
    const screeningId = toId(req.params.screeningID);
    const screening = screeningId && (await screeningsModel.findById(screeningId));
    if (!screening) {
      return res.status(404).json({ error: "Séance introuvable" });
    }

    const reservations = await reservationsModel.findByScreening(screeningId);
    return res.status(200).json(reservations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// POST /reservations : réserver une séance
export async function createReservation(req, res) {
  try {
    // L'utilisateur vient du token (req.user), jamais du body
    const userId = req.user.us_id;
    const { screening, seats } = req.body ?? {};

    // 1. screening est obligatoire
    if (screening === undefined || screening === null || screening === "") {
      return res.status(403).json({ error: "screening est obligatoire" });
    }

    // 2. seats : entier >= 1 (1 par défaut)
    const nbSeats = seats === undefined ? 1 : Number(seats);
    if (!Number.isInteger(nbSeats) || nbSeats < 1) {
      return res.status(403).json({ error: "seats doit être un entier supérieur ou égal à 1" });
    }

    // 3. la séance doit exister
    const screeningId = toId(String(screening));
    const foundScreening = screeningId && (await screeningsModel.findById(screeningId));
    if (!foundScreening) {
      return res.status(404).json({ error: "Séance introuvable" });
    }

    // 4. une seule réservation par utilisateur et par séance
    if (await reservationsModel.findByUserAndScreening(userId, screeningId)) {
      return res.status(403).json({ error: "Vous avez déjà réservé cette séance" });
    }

    // 5. il doit rester assez de places : déjà réservées + demandées <= capacité de la salle
    const takenSeats = await reservationsModel.countSeats(screeningId);
    if (takenSeats + nbSeats > foundScreening.ro_capacity) {
      return res.status(403).json({ error: "Plus assez de places disponibles" });
    }

    const reservationId = await reservationsModel.create(userId, screeningId, nbSeats);
    return res.status(201).json({
      message: "Réservation créée",
      reservation: {
        re_id: reservationId,
        re_user: userId,
        re_screening: screeningId,
        re_seats: nbSeats,
      },
    });
  } catch (error) {
    // Filet de sécurité si deux requêtes identiques arrivent en même temps (contrainte UNIQUE)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(403).json({ error: "Vous avez déjà réservé cette séance" });
    }
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

// DELETE /reservations/:id : annuler une réservation (la sienne, ou n'importe laquelle pour un admin)
export async function deleteReservation(req, res) {
  try {
    const id = toId(req.params.id);
    const reservation = id && (await reservationsModel.findById(id));
    if (!reservation) {
      return res.status(404).json({ error: "Réservation introuvable" });
    }

    if (reservation.re_user !== req.user.us_id && req.user.us_role !== "admin") {
      return res
        .status(403)
        .json({ error: "Vous ne pouvez annuler que vos propres réservations" });
    }

    await reservationsModel.deleteById(id);
    return res.status(200).json({ message: "Réservation annulée" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}
