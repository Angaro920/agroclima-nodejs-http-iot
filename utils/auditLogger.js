/* import { MongoClient } from "mongodb";
import dotenv from "dotenv"; */
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');


dotenv.config();

const mongoURL = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = "AgroclimaAi";
const auditCollection = "auditorias";

const registrarAuditoria = async (usuario, accion, detalles = {}) => {
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

module.exports = {
  registrarAuditoria
};
