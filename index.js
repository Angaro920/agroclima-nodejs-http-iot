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
  origin: "https://vulnerability-enb-die-builder.trycloudflare.com",
};

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors(corsOptions));
dotenv.config();

const PORT = 8000;

const mongoURL = "mongodb://127.0.0.1:27017/AgroclimaAi";
const dbName = "AgroclimaAi";
const collectionTemp = "TemperaturaSensor";
const collectionHum = "HumedadSensor";
const collectionHid = "HidrogenoSensor";
const collectionLu = "LuzSensor";
const collectionTempStationIn = "TemperaturaInterna";
const collectionHumStationIn = "HumedadInterna";
const collectionTempStationOut = "TemperaturaExterna";
const collectionHumStationOut = "HumedadExterna";
const collectionUvStation = "Uv";
const collectionRainStation = "Precipitaciones"
const collectionRadiationStation = "RadiacionSolar"
const collectionBarometricStation = "PresionBarometricaRelativa";


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
    const collectionTStationIn = db.collection(collectionTempStationIn);
    const collectionHStationIn = db.collection(collectionHumStationIn);
    const collectionTStationOut = db.collection(collectionTempStationOut);
    const collectionHStationOut = db.collection(collectionHumStationOut);
    const collectionUVstation = db.collection(collectionUvStation);
    const collectionRStation = db.collection(collectionRainStation);
    const collectionRadStation = db.collection(collectionRadiationStation);
    const collectionPBStation = db.collection(collectionBarometricStation);



    wss.on("connection", (socket) => {
      console.log("Cliente conectado");

      socket.on("message", (message) => {
        const messageStr = message.toString().trim();
        console.log("Datos recibidos limpios: ", messageStr);

        try {
          const data = JSON.parse(messageStr);

          const operations = [
            collectionT.insertOne({ data: data.temperatura, time: new Date() }),
            collectionHu.insertOne({ data: data.humedad, time: new Date() }),
            collectionHi.insertOne({ data: data.hidrogeno, time: new Date() }),
            collectionL.insertOne({ data: data.luz, time: new Date() }),
          ];

          Promise.all(operations)
            .then(() => {
              console.log("Datos guardados correctamente en MongoDB");
            })
            .catch((error) => {
              console.error("Error al guardar datos en MongoDB: ", error);
            });

          // Send to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === socket.OPEN) {
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

        if (ambientData?.tempinf !== undefined) {
          ambientData.tempinfC = ((ambientData.tempinf - 32) * 5 / 9).toFixed(2); // Keep 2 decimals
        }
        if (ambientData?.tempf !== undefined) {
          ambientData.tempoutc= ((ambientData.tempf - 32) * 5 / 9).toFixed(2); // Keep 2 decimals
        }


        if (ambientData) {
          const payload = JSON.stringify({
            type: 'ambient',
            data: {
              ...ambientData,
              tempinf: parseFloat(ambientData.tempinfC)
            }
          });

          // Send to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });

          console.log("Ambient data broadcasted:", ambientData);

          const saveOperations = [];

          if (ambientData.tempinfC !== undefined) {
            saveOperations.push(
              collectionTStationIn.insertOne({ data: ambientData.tempinfC, time: new Date() })
            );
          }
          if (ambientData.humidityin !== undefined) {
            saveOperations.push(
              collectionHStationIn.insertOne({ data: ambientData.humidityin, time: new Date() })
            );
          }
          if (ambientData.tempoutc !== undefined) {
            saveOperations.push(
              collectionTStationOut.insertOne({ data: ambientData.tempoutc, time: new Date() })
            );
          }
          if (ambientData.humidity !== undefined) {
            saveOperations.push(
              collectionHStationOut.insertOne({ data: ambientData.humidity, time: new Date() })
            );
          }
          if (ambientData.uv !== undefined) {
            saveOperations.push(
              collectionUVstation.insertOne({ data: ambientData.uv, time: new Date() })
            );
          }
          if (ambientData.solarradiation !== undefined) {
            saveOperations.push(
              collectionRadStation.insertOne({ data: ambientData.solarradiation, time: new Date() })
            );
          }
          if (ambientData.eventrainin !== undefined) {
            saveOperations.push(
              collectionRStation.insertOne({ data: ambientData.eventrainin, time: new Date() })
            );
          }
          if (ambientData.baromrelin !== undefined) {
            saveOperations.push(
              collectionPBStation.insertOne({ data: ambientData.baromrelin, time: new Date() })
            );
          }


          Promise.all(saveOperations)
            .then(() => {
              console.log("Ambient internal data saved to MongoDB");
            })
            .catch((error) => {
              console.error("Error saving ambient internal data:", error);
            });
        }

      } catch (error) {
        console.error("Error fetching Ambient Weather data:", error.message);
      }
    };

    // Fetch every 60 seconds
    setInterval(fetchAndBroadcastAmbientData, 60000);


    server.listen(8080, () => {
      console.log("Servidor WebSocket corriendo en ws://localhost:8080");
    });
  })
  .catch((error) => {
    console.error("Error al conectar con MongoDB: ", error);
  });
