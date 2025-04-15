import { MongoClient } from "mongodb";

const mongoURL = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = "AgroclimaAi";
const auditCollection = "auditorias";

export const listarAuditorias = async (req, res) => {
  try {
    const client = new MongoClient(mongoURL);
    await client.connect();
    const db = client.db(dbName);
    const auditorias = await db.collection(auditCollection).find().sort({ fecha: -1 }).toArray();
    await client.close();

    res.status(200).json(auditorias);
  } catch (err) {
    console.error("Error al consultar auditorías:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
};
