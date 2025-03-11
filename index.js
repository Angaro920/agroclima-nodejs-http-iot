import express from "express"
import mongoose from "mongoose"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import routes from "./routes/Routes.js"
import cors from "cors"
import { WebSocketServer } from "ws";
import http from "http";
import { MongoClient } from "mongodb";
import cookieParser from "cookie-parser";
import { formatInTimeZone } from "date-fns-tz"


const corsOptions = {
  origin: "http://localhost:5173", 
  credentials: true,
};

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors(corsOptions));
dotenv.config();

const PORT = 8000;

const mongoURL = "mongodb://127.0.0.1:27017/AgroclimaAi";
const dbName = "AgroclimaAi";
const collectionTemp = "Temperatura";
const collectionHum = "Humedad";
const collectionHid = "Hidrogeno";
const collectionLu = "Luz";


mongoose.connect(mongoURL).then(() => {
    console.log("Conectado a la base de datos")
    app.listen(PORT, () => {
        console.log(`Servidor HTTP corriendo en el puerto : ${PORT}`);
    });
}).catch((error) => console.log(error));


app.use("/api", routes);

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>Servidor WebSocket para DHT22</h1>");
});

/* function horaActual (){
  const ahora = new Date();
  const dateFormat =  formatInTimeZone(ahora, "America/Bogota", "yyyy-MM-dd'T'HH:mm:ss");
  return dateFormat;
} */

const wss = new WebSocketServer({ server });
MongoClient.connect(mongoURL)
  .then((client) => {
    console.log("Conectado a MongoDB");

    const db = client.db(dbName);
    const collectionT = db.collection(collectionTemp);
    const collectionHu = db.collection(collectionHum);
    const collectionHi = db.collection(collectionHid);
    const collectionL = db.collection(collectionLu);

    wss.on("connection", (socket) => {
      console.log("Cliente conectado");

      socket.on("message", (message) => {
        const messageStr = message.toString().trim();
        console.log("Datos recibidos limpios: ", messageStr);

        try {
          const data = JSON.parse(messageStr);

          // Guardar datos en las colecciones correspondientes
          const operations = [
            collectionT.insertOne({ data: data.temperatura, time: new Date()}),
            collectionHu.insertOne({ data: data.humedad, time: new Date() }),
            collectionHi.insertOne({ data: data.hidrogeno, time: new Date()}),
            collectionL.insertOne({ data: data.luz, time: new Date()}),
          ];

          Promise.all(operations)
            .then(() => {
              console.log("Datos guardados correctamente en MongoDB");
            })
            .catch((error) => {
              console.error("Error al guardar datos en MongoDB: ", error);
            });

          // Enviar los datos recibidos a todos los clientes conectados
          wss.clients.forEach((client) => {
            if (client.readyState === socket.OPEN) {
              client.send(messageStr); // Enviar la cadena JSON limpia
            }
          });
        } catch (error) {
          console.error("Error: Mensaje no es un JSON válido", error);
        }
      });

      socket.on("close", () => {
        console.log("Cliente desconectado");
      });
    });

    server.listen(8080, () => {
      console.log("Servidor WebSocket corriendo en ws://localhost:8080");
    });
  })
  .catch((error) => {
    console.error("Error al conectar con MongoDB: ", error);
  });
