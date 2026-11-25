import pool, { withTransaction } from "../Config/db.js";

// Les models contiennent uniquement les requêtes SQL (toujours préparées avec des "?").
// Aucune requête ne renvoie us_password, sauf findByUsername (nécessaire pour le login).

export async function findAll() {
  const [rows] = await pool.execute(
    "SELECT us_id, us_username, us_email, us_role FROM users ORDER BY us_id"
  );
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.execute(
    "SELECT us_id, us_username, us_email, us_role FROM users WHERE us_id = ?",
    [id]
  );
  return rows[0]; // undefined si l'utilisateur n'existe pas
}

// Utilisé uniquement par le login : renvoie aussi le mot de passe haché pour le comparer
export async function findByUsername(username) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE us_username = ?", [username]);
  return rows[0];
}

// Le rôle est écrit en dur dans la requête : impossible de s'auto-promouvoir admin
export async function create(username, email, hashedPassword) {
  const [result] = await pool.execute(
    "INSERT INTO users (us_username, us_email, us_password, us_role) VALUES (?, ?, ?, 'user')",
    [username, email, hashedPassword]
  );
  return result.insertId;
}

// Mise à jour partielle : COALESCE(?, colonne) garde l'ancienne valeur quand on envoie null
export async function updateById(id, { username, email }) {
  await pool.execute(
    `UPDATE users
     SET us_username = COALESCE(?, us_username),
         us_email = COALESCE(?, us_email)
     WHERE us_id = ?`,
    [username ?? null, email ?? null, id]
  );
}

// Supprime l'utilisateur et ses réservations (dans une transaction).
export async function deleteById(id) {
  await withTransaction(async (connection) => {
    await connection.execute("DELETE FROM reservations WHERE re_user = ?", [id]);
    await connection.execute("DELETE FROM users WHERE us_id = ?", [id]);
  });
}
