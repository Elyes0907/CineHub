import pool, { withTransaction } from "../Config/db.js";

// Toutes les séances, avec le titre du film et le nom de la salle (jointures)
export async function findAll() {
  const [rows] = await pool.execute(
    `SELECT sc.sc_id, sc.sc_film, sc.sc_room, sc.sc_datetime, sc.sc_price,
            f.fi_title, r.ro_name, r.ro_capacity
     FROM screenings sc
     JOIN films f ON f.fi_id = sc.sc_film
     JOIN rooms r ON r.ro_id = sc.sc_room
     ORDER BY sc.sc_datetime`
  );
  return rows;
}

// Toutes les séances d'un film
export async function findByFilm(filmId) {
  const [rows] = await pool.execute(
    `SELECT sc.sc_id, sc.sc_film, sc.sc_room, sc.sc_datetime, sc.sc_price,
            f.fi_title, r.ro_name, r.ro_capacity
     FROM screenings sc
     JOIN films f ON f.fi_id = sc.sc_film
     JOIN rooms r ON r.ro_id = sc.sc_room
     WHERE sc.sc_film = ?
     ORDER BY sc.sc_datetime`,
    [filmId]
  );
  return rows;
}

// Séances à venir d'un film, avec le nom de la salle (utilisé par GET /films/:id)
export async function findUpcomingByFilm(filmId) {
  const [rows] = await pool.execute(
    `SELECT sc.sc_id, sc.sc_datetime, sc.sc_price, r.ro_id, r.ro_name, r.ro_capacity
     FROM screenings sc
     JOIN rooms r ON r.ro_id = sc.sc_room
     WHERE sc.sc_film = ? AND sc.sc_datetime >= NOW()
     ORDER BY sc.sc_datetime`,
    [filmId]
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT sc.sc_id, sc.sc_film, sc.sc_room, sc.sc_datetime, sc.sc_price,
            f.fi_title, r.ro_name, r.ro_capacity
     FROM screenings sc
     JOIN films f ON f.fi_id = sc.sc_film
     JOIN rooms r ON r.ro_id = sc.sc_room
     WHERE sc.sc_id = ?`,
    [id]
  );
  return rows[0]; // undefined si la séance n'existe pas
}

export async function create({ film, room, datetime, price }) {
  const [result] = await pool.execute(
    "INSERT INTO screenings (sc_film, sc_room, sc_datetime, sc_price) VALUES (?, ?, ?, ?)",
    [film, room, datetime, price]
  );
  return result.insertId;
}

// Mise à jour partielle : COALESCE(?, colonne) garde l'ancienne valeur quand on envoie null
export async function updateById(id, { film, room, datetime, price }) {
  await pool.execute(
    `UPDATE screenings
     SET sc_film = COALESCE(?, sc_film),
         sc_room = COALESCE(?, sc_room),
         sc_datetime = COALESCE(?, sc_datetime),
         sc_price = COALESCE(?, sc_price)
     WHERE sc_id = ?`,
    [film ?? null, room ?? null, datetime ?? null, price ?? null, id]
  );
}

// Supprime la séance et ses réservations (dans une transaction).
export async function deleteById(id) {
  await withTransaction(async (connection) => {
    await connection.execute("DELETE FROM reservations WHERE re_screening = ?", [id]);
    await connection.execute("DELETE FROM screenings WHERE sc_id = ?", [id]);
  });
}
