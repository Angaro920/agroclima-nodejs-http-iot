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
import axios from 'axios';



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


const wss = new WebSocketServer({ server });
MongoClient.connect(mongoURL)
  .then((client) => {
    console.log("Conectado a MongoDB");

    const db = client.db(dbName);
    const collectionT = db.collection("Temperatura");
    const collectionHu = db.collection("Humedad");
    const collectionHi = db.collection("Hidrogeno");
    const collectionL = db.collection("Luz");
    const collectionBarom = db.collection("Barometro");

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
              // client.send(messageStr); // Enviar la cadena JSON limpia
              const sensorPayload = JSON.stringify({ type: 'sensor', data: data });
              client.send(sensorPayload);

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

    const fetchAndBroadcastAmbientData = async () => {
      try {
        const response = await axios.get('https://api.ambientweather.net/v1/devices', {
          params: {
            apiKey: process.env.AMBIENT_API_KEY,
            applicationKey: process.env.AMBIENT_APP_KEY
          }
        });
    
        const ambientData = response.data[0]?.lastData;
    
        if (ambientData) {
          const payload = JSON.stringify({ type: 'ambient', data: ambientData });
          
          const operations = [
            collectionBarom.insertOne({ data: ambientData.baromabsin, time: new Date()}),
          ];

          Promise.all(operations)
            .then(() => {
              console.log("Datos guardados correctamente en MongoDB");
            })
            .catch((error) => {
              console.error("Error al guardar datos en MongoDB: ", error);
            });
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });
    
          console.log("Ambient data broadcasted:", ambientData);
        }
      } catch (error) {
        console.error("Error fetching Ambient Weather data:", error.message);
      }
    };
    
    setInterval(fetchAndBroadcastAmbientData, 60000);
    

    server.listen(8080, () => {
      console.log("Servidor WebSocket corriendo en ws://localhost:8080");
    });
  })
  .catch((error) => {
    console.error("Error al conectar con MongoDB: ", error);
  });
