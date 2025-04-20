const mongoose = require("mongoose");

const temperaturaSchema = new mongoose.Schema({
  temperatura: { type: String, required: true },
  timestamp: { type: String, required: true },
});
const HumedadSchema = new mongoose.Schema({
  humedad: { type: String, required: true },
  timestamp: { type: String, required: true },
});

const GasSchema = new mongoose.Schema({
  gas: { type: String, required: true },
  timestamp: { type: String, required: true },
});

const luzSchema = new mongoose.Schema({
  luz: { type: String, required: true },
  timestamp: { type: String, required: true },
});

export const Temperatura = mongoose.model("Temperatura", temperaturaSchema, "Temperatura");
export const Humedad = mongoose.model("Humedad", HumedadSchema, "Humedad");
export const Gas = mongoose.model("Hidrogeno",GasSchema, "Hidrogeno");
export const Luz = mongoose.model("Luz", luzSchema, "Luz");