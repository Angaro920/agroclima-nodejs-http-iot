import express from "express"
import mongoose from "mongoose"
import bodyParser from "body-parser"
import dotenv from "dotenv"
import routes from "./routes/userRoute.js"
import cors from "cors"
import { WebSocketServer } from "ws"; // Importar el constructor de WebSocketServer
import http from "http";
import { MongoClient } from "mongodb";


const app = express();
app.use(bodyParser.json());
app.use(cors());
dotenv.config();

const PORT = process.env.PORT || 7000;
const MONGOURL = process.env.MONGO_URL;

const mongoURL = "mongodb://127.0.0.1:27017";
const dbName = "AgroclimaAi";
const collectionTemp = "Temperatura";
const collectionHum = "Humedad";
const collectionHid = "Hidrogeno";
const collectionLu = "Luz";


mongoose.connect(MONGOURL).then(() => {
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
MongoClient.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true })
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
            collectionT.insertOne({ temperatura: data.temperatura, timestamp: new Date() }),
            collectionHu.insertOne({ humedad: data.humedad, timestamp: new Date() }),
            collectionHi.insertOne({ hidrogeno: data.hidrogeno, timestamp: new Date() }),
            collectionL.insertOne({ luz: data.luz, timestamp: new Date() }),
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
