import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoURL = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = "AgroclimaAi";
const auditCollection = "auditorias";

export async function registrarAuditoria(usuario, accion, detalles = {}) {
  const client = new MongoClient(mongoURL);
  try {
    await client.connect();
    const db = client.db(dbName);
    await db.collection(auditCollection).insertOne({
      usuario,
      accion,
      detalles,
      fecha: new Date()
    });
  } catch (err) {
    console.error("Error registrando auditoría:", err);
  } finally {
    await client.close();
  }
}
