import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import { recibirDatosSensores, obtenerDatosAmbientWeather } from "./controller/dataController.js";
import routes from "./routes/Routes.js";
import mongoose from "mongoose";

const mongoURL = "mongodb://127.0.0.1:27017/AgroclimaAi";
const dbName = "AgroclimaAi";
dotenv.config();
const app = express(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));


app.use(express.json());


app.use("/api", routes  );

mongoose.connect(mongoURL).then(() => {
  console.log("Conectado a la base de datos")
  app.listen(PORT, () => {
    console.log(`Servidor HTTP corriendo en el puerto : ${PORT}`);
  });
}).catch((error) => console.log(error));

const ejecutarTareasPeriodicas = async () => {
  console.log("⏰ Ejecutando tareas periódicas...");

  try {
    await obtenerDatosAmbientWeatherFake();
  } catch (error) {
    console.error("Error al obtener datos AmbientWeather:", error?.message || error);
  }

  try {
    await recibirDatosSensoresFake();
  } catch (error) {
    console.error("Error al recibir datos de sensores:", error?.message || error);
  }
};

// Fakes para simular una llamada como Express lo haría
const obtenerDatosAmbientWeatherFake = () => {
  return new Promise((resolve, reject) => {
    obtenerDatosAmbientWeather(
      {}, // req vacío
      { 
        status: () => ({ json: resolve }),
        json: resolve
      }
    );
  });
};

const recibirDatosSensoresFake = () => {
  return new Promise((resolve, reject) => {
    recibirDatosSensores(
      {}, 
      { 
        status: () => ({ json: resolve }),
        json: resolve
      }
    );
  });
};

// Ejecutar cada 1 minuto (60,000 milisegundos)
setInterval(ejecutarTareasPeriodicas, 60_000);
// ---- Arrancar servidor ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
