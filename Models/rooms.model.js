import pool, { withTransaction } from "../Config/db.js";

export async function findAll() {
  const [rows] = await pool.execute("SELECT * FROM rooms ORDER BY ro_name");
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute("SELECT * FROM rooms WHERE ro_id = ?", [id]);
  return rows[0]; // undefined si la salle n'existe pas
}

export async function create({ name, capacity }) {
  const [result] = await pool.execute(
    "INSERT INTO rooms (ro_name, ro_capacity) VALUES (?, ?)",
    [name, capacity]
  );
  return result.insertId;
}

// Mise à jour partielle : COALESCE(?, colonne) garde l'ancienne valeur quand on envoie null
export async function updateById(id, { name, capacity }) {
  await pool.execute(
    `UPDATE rooms
     SET ro_name = COALESCE(?, ro_name),
         ro_capacity = COALESCE(?, ro_capacity)
     WHERE ro_id = ?`,
    [name ?? null, capacity ?? null, id]
  );
}

// Supprime la salle, ses séances et les réservations de ces séances (dans une transaction).
export async function deleteById(id) {
  await withTransaction(async (connection) => {
    await connection.execute(
      "DELETE FROM reservations WHERE re_screening IN (SELECT sc_id FROM screenings WHERE sc_room = ?)",
      [id]
    );
    await connection.execute("DELETE FROM screenings WHERE sc_room = ?", [id]);
    await connection.execute("DELETE FROM rooms WHERE ro_id = ?", [id]);
  });
}
