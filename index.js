import express from "express";
import dotenv from "dotenv";
import routes from "./routes/Routes.js";
import connectDB from "./config/db.js"; // <-- Conexión a la base de datos
import { obtenerDatosAmbientWeather, recibirDatosSensores } from "./controller/dataController.js"; // <-- Importamos las funciones
import cors from "cors";
import cookieParser from "cookie-parser";


const allowedOrigins = [
  'http://localhost:5173', // para desarrollo
  'https://ciiap.netlify.app' // para producción en Netlify
];

dotenv.config();
const app = express();
connectDB();
app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true
}));
app.use(cookieParser());

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

// Ejecutar cada minuto
setInterval(ejecutarTareasPeriodicas, 60_000);

// ---- Arrancar servidor ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
