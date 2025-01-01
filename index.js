const WebSocket = require('ws');
const http = require('http');
const {MongoClient} = require('mongodb');


const mongoURL = "mongodb://127.0.0.1:27017/sensores";
const dbName = "sensores";
const collectionTemp = "Temperatura";
const collectionHum = "Humedad";
const collectionHid = "Hidrogeno";
const collectionLu =  "Luz"

// Crear servidor HTTP para servir un cliente web opcional
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Servidor WebSocket para DHT22</h1>');
});

// Crear servidor WebSocket
const wss = new WebSocket.Server({ server });

MongoClient.connect(mongoURL, {useNewUrlParser: true, useUnifiedTopology: true})
.then((client)=>{
  console.log("Conectado a MongoDb");

  const db = client.db(dbName);
  const collectionT = db.collection(collectionTemp);
  const collectionHu = db.collection(collectionHum);
  const collectionHi = db.collection(collectionHid);
  const collectionL = db.collection(collectionLu);
  wss.on('connection',(ws) =>{
    console.log('Cliente conectado');

    ws.on('message',(message) =>{
      const messageStr = message.toString().trim();

      console.log('Datos recibidos limpios: ', messageStr);


      try{
        const data = JSON.parse(messageStr);

        collectionT.insertOne({
          temperatura: data.temperatura,
          timestamp: new Date()
        });/* .then((result)=>{
          console.log("Datos guardados en MongoDB: ", result);
        }).then((error) =>{
          console.error("Error guardando datos en MongoDB: ", error);
        }); */
        collectionHu.insertOne({
          temperatura: data.humedad,
          timestamp: new Date()
        });
        collectionHi.insertOne({
          temperatura: data.hidrogeno,
          timestamp: new Date()
        });
        collectionL.insertOne({
          temperatura: data.luz,
          timestamp: new Date()
        });
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr); // Enviar la cadena JSON limpia
          }
        });
      } catch(error){
        console.error('Error: Mensaje no es un JSON valido', error);
      }
    });

    ws.on('close',() => {
      console.log('Cliente desconectado');
    });
  });

  server.listen(8080, () => {
    console.log('Servidor WebSocket corriendo en ws://localhost:8080');
  });
})
.catch((error)=>{
  console.error('Error al conectar con MongoDB: ', error);
});




