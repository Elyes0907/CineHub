import pool from "../Config/db.js";

// Toutes les réservations (admin) : utilisateur, film, salle, date de la séance
export async function findAll() {
  const [rows] = await pool.execute(
    `SELECT re.re_id, re.re_seats, re.re_created_at,
            u.us_id, u.us_username,
            sc.sc_id, sc.sc_datetime, sc.sc_price,
            f.fi_title, r.ro_name
     FROM reservations re
     JOIN users u ON u.us_id = re.re_user
     JOIN screenings sc ON sc.sc_id = re.re_screening
     JOIN films f ON f.fi_id = sc.sc_film
     JOIN rooms r ON r.ro_id = sc.sc_room
     ORDER BY re.re_created_at DESC, re.re_id DESC`
  );
  return rows;
}

// Réservations d'un utilisateur ("mes séances réservées") :
// id de la réservation, nombre de places, titre du film, date/heure, salle et prix
export async function findByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT re.re_id, re.re_seats, f.fi_title, sc.sc_datetime, r.ro_name, sc.sc_price
     FROM reservations re
     JOIN screenings sc ON sc.sc_id = re.re_screening
     JOIN films f ON f.fi_id = sc.sc_film
     JOIN rooms r ON r.ro_id = sc.sc_room
     WHERE re.re_user = ?
     ORDER BY sc.sc_datetime`,
    [userId]
  );
  return rows;
}

// Réservations d'une séance (admin)
export async function findByScreening(screeningId) {
  const [rows] = await pool.execute(
    `SELECT re.re_id, re.re_seats, re.re_created_at, u.us_id, u.us_username, u.us_email
     FROM reservations re
     JOIN users u ON u.us_id = re.re_user
     WHERE re.re_screening = ?
     ORDER BY re.re_created_at, re.re_id`,
    [screeningId]
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute("SELECT * FROM reservations WHERE re_id = ?", [id]);
  return rows[0]; // undefined si la réservation n'existe pas
}

// Sert à vérifier qu'un utilisateur ne réserve pas deux fois la même séance
export async function findByUserAndScreening(userId, screeningId) {
  const [rows] = await pool.execute(
    "SELECT * FROM reservations WHERE re_user = ? AND re_screening = ?",
    [userId, screeningId]
  );
  return rows[0];
}

// Nombre de places déjà réservées pour une séance
export async function countSeats(screeningId) {
  const [rows] = await pool.execute(
    "SELECT COALESCE(SUM(re_seats), 0) AS taken FROM reservations WHERE re_screening = ?",
    [screeningId]
  );
  return Number(rows[0].taken); // SUM() peut revenir en texte : on convertit en nombre
}

export async function create(userId, screeningId, seats) {
  const [result] = await pool.execute(
    "INSERT INTO reservations (re_user, re_screening, re_seats) VALUES (?, ?, ?)",
    [userId, screeningId, seats]
  );
  return result.insertId;
}

export async function deleteById(id) {
  await pool.execute("DELETE FROM reservations WHERE re_id = ?", [id]);
}
