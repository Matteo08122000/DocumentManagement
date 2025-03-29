import mysql from "mysql";
import dotenv from "dotenv";

dotenv.config();

async function connectDatabase() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
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
