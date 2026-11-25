import pool, { withTransaction } from "../Config/db.js";

export async function findAll() {
  const [rows] = await pool.execute("SELECT * FROM films ORDER BY fi_title");
  return rows;
}

// Films à l'affiche (fi_is_showing = 1)
export async function findShowing() {
  const [rows] = await pool.execute(
    "SELECT * FROM films WHERE fi_is_showing = 1 ORDER BY fi_title"
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute("SELECT * FROM films WHERE fi_id = ?", [id]);
  return rows[0]; // undefined si le film n'existe pas
}

export async function create({ title, description, duration, genre, releaseDate, isShowing }) {
  const [result] = await pool.execute(
    `INSERT INTO films (fi_title, fi_description, fi_duration, fi_genre, fi_release_date, fi_is_showing)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description ?? null, duration, genre ?? null, releaseDate ?? null, isShowing]
  );
  return result.insertId;
}

// Mise à jour partielle : COALESCE(?, colonne) garde l'ancienne valeur quand on envoie null
export async function updateById(
  id,
  { title, description, duration, genre, releaseDate, isShowing }
) {
  await pool.execute(
    `UPDATE films
     SET fi_title = COALESCE(?, fi_title),
         fi_description = COALESCE(?, fi_description),
         fi_duration = COALESCE(?, fi_duration),
         fi_genre = COALESCE(?, fi_genre),
         fi_release_date = COALESCE(?, fi_release_date),
         fi_is_showing = COALESCE(?, fi_is_showing)
     WHERE fi_id = ?`,
    [
      title ?? null,
      description ?? null,
      duration ?? null,
      genre ?? null,
      releaseDate ?? null,
      isShowing ?? null,
      id,
    ]
  );
}

// Supprime le film, ses séances et les réservations de ces séances.
// Les séances et les réservations sont supprimées d'abord : sans cela MySQL refuse de supprimer
// le film (erreur "Cannot delete or update a parent row"), car des lignes y sont encore rattachées.
// Tout est dans une transaction : si une suppression échoue, rien n'est supprimé.
export async function deleteById(id) {
  await withTransaction(async (connection) => {
    await connection.execute(
      "DELETE FROM reservations WHERE re_screening IN (SELECT sc_id FROM screenings WHERE sc_film = ?)",
      [id]
    );
    await connection.execute("DELETE FROM screenings WHERE sc_film = ?", [id]);
    await connection.execute("DELETE FROM films WHERE fi_id = ?", [id]);
  });
}
