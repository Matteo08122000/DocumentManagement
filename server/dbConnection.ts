import mysql from "mysql";


// 👇 AGGIUNGI QUESTO SUBITO QUI
console.log("📦 DB ENV VARS", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function connectDatabase() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || "docgenius",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Errore di connessione al database:", err);
      return;
    }
    console.log("Connesso al database!");
  });

  connection.query(
    "SELECT * FROM users WHERE active = true",
    (err, results) => {
      if (err) {
        console.error("Errore nell'esecuzione della query:", err);
      } else {
        console.log(results);
      }
    }
  );

  connection.end();
}

connectDatabase();

export default connectDatabase;
