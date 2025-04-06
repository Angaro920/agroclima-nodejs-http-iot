import express from "express";
import dotenv from "dotenv";
import routes from "./routes/Routes.js"; // <-- Usamos tu archivo de rutas
import { obtenerDatosAmbientWeather, recibirDatosSensores } from "./controller/dataController.js";
import connectDB from "./config/db.js"; // <-- Conexión a la base de datos
import axios from "axios"; // <-- Importamos axios para hacer peticiones HTTP

dotenv.config();
const app = express();

app.use(express.json());
connectDB();
// Usamos tu archivo de rutas
app.use("/api", routes);

// ---- Ejecutar automáticamente cada minuto ----
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

// Fakes para simular req y res
const obtenerDatosAmbientWeatherFake = () => {
  return new Promise((resolve, reject) => {
    obtenerDatosAmbientWeather(
      {}, 
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

// Ejecutar cada minuto
setInterval(ejecutarTareasPeriodicas, 60_000);

// ---- Arrancar servidor ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
