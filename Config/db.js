// Connexion MySQL : un "pool" de connexions partagé par tous les models.
// Les identifiants viennent du fichier .env (jamais écrits en dur dans le code).
import "dotenv/config";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // DATE / DATETIME renvoyés en texte : "2026-12-01 20:30:00"
  decimalNumbers: true, // DECIMAL (ex : le prix) renvoyé en nombre et non en texte
});

// Test au démarrage : affiche un message clair si le .env est incorrect
pool
  .query("SELECT 1")
  .then(() => console.log("Connexion MySQL : OK"))
  .catch((error) => console.error("Connexion MySQL impossible :", error.message));

// Exécute plusieurs requêtes comme un seul bloc « tout ou rien » (une transaction) :
// si l'une échoue, tout ce qui a déjà été fait dans le bloc est annulé.
//
// Utilisation (dans un model) :
//   await withTransaction(async (connection) => {
//     await connection.execute("DELETE ...", [id]);
//     await connection.execute("DELETE ...", [id]);
//   });
//
// Dans le bloc, il faut utiliser "connection.execute" et non "pool.execute" :
// une requête passée par le pool sortirait de la transaction.
export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    // Annule tout. Si la connexion est perdue, le rollback échoue aussi : on garde l'erreur d'origine.
    await connection.rollback().catch(() => {});
    throw error; // l'erreur remonte au controller (réponse 500)
  } finally {
    connection.release(); // toujours rendre la connexion au pool, sinon l'API finit par se bloquer
  }
}

export default pool;
