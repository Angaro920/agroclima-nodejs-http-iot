import { Temperatura, Humedad, Gas, Luz } from "../model/dataModel.js";
import { MongoClient } from "mongodb";
import { Parser } from "json2csv";
import ExcelJS from "exceljs"
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const colecciones = ['TemperaturaInterna', 'TemperaturaExterna', 'HumedadInterna', 'HumedadExterna', 'Uv', 'RadiacionSolar', 'Precipitaciones', 'PresionBarometricaRelativa'];


const dbName = "AgroclimaAi";
const mongoURL = process.env.MONGO_URI;
let db;

MongoClient.connect(mongoURL)
  .then((client) => {
    console.log("Conectado a MongoDB en DataController");
    db = client.db("AgroclimaAi");
  })
  .catch((error) => console.error("Error conectando a MongoDB:", error));

export const recibirDatosSensor = async (req, res) => {
  try {
    const { temperatura, humedad, gas, luz } = req.body;

    const fechaHoraActual = new Date();

    // Crear documentos independientes
    const newTEmperatura = new Temperatura({
      temperatura: temperatura,
      timestamp: fechaHoraActual
    });

    const newHumedad = new Humedad({
      valor: humedad,
      timestamp: fechaHoraActual
    });

    const newGas = new Gas({
      valor: gas,
      timestamp: fechaHoraActual
    });

    const newLuz = new Luz({
      valor: luz,
      timestamp: fechaHoraActual
    });

    // Guardarlos todos en paralelo
    await Promise.all([
      newTEmperatura.save(),
      newHumedad.save(),
      newGas.save(),
      newLuz.save()
    ]);

    res.status(201).json({ message: 'Datos guardados correctamente en sus respectivas colecciones' });
  } catch (error) {
    console.error('Error al guardar los datos:', error);
    res.status(500).json({ message: 'Error al guardar los datos' });
  }
};


export const envioDatosSensores = async (req, res) => {
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const resultados = {};
    for (const col of colecciones) {
      const dato = await db.collection(col)
        .find()
        .sort({ date: -1 })
        .limit(1)
        .toArray();

      resultados[col] = dato[0] || null;
    }
    res.json(resultados);
  } catch (error) {
    console.error("Error al obtener datos de los sensores:", error);
    res.status(500).json({ error: "Error al obtener datos de los sensores." });
  }
}

export const recibirDatosSensores = async (req, res) => {
  const data = req.body;
  const currentTime = new Date();
  try {
    await Promise.all([
      db.collection("TemperaturaSensor").insertOne({ data: data.temperatura, time: currentTime }),
      db.collection("HumedadSensor").insertOne({ data: data.humedad, time: currentTime }),
      db.collection("HidrogenoSensor").insertOne({ data: data.gas, time: currentTime }),
      db.collection("LuzSensor").insertOne({ data: data.luz, time: currentTime }),
    ]);

    res.status(200).json({ message: "Datos guardados correctamente." });
  } catch (error) {
    console.error("Error guardando datos del sensor:", error);
    res.status(500).json({ error: "Error guardando datos." });
  }
};

// Obtener datos de Ambient Weather y guardarlos
export const obtenerDatosAmbientWeather = async (req, res) => {
  try {
    const response = await axios.get('https://api.ambientweather.net/v1/devices', {
      params: {
        apiKey: process.env.AMBIENT_API_KEY,
        applicationKey: process.env.AMBIENT_APP_KEY
      }
    });

    const ambientData = response.data[0]?.lastData;

    if (ambientData?.tempinf !== undefined) {
      ambientData.tempinfC = Number(((ambientData.tempinf - 32) * 5 / 9).toFixed(2));
    }
    if (ambientData?.tempf !== undefined) {
      ambientData.tempoutc = Number(((ambientData.tempf - 32) * 5 / 9).toFixed(2));
    }

    const saveOperations = [];

    if (ambientData?.tempinfC !== undefined) {
      saveOperations.push(db.collection("TemperaturaInterna").insertOne({ data: ambientData.tempinfC, time: new Date() }));
    }
    if (ambientData?.humidityin !== undefined) {
      saveOperations.push(db.collection("HumedadInterna").insertOne({ data: ambientData.humidityin, time: new Date() }));
    }
    if (ambientData?.tempoutc !== undefined) {
      saveOperations.push(db.collection("TemperaturaExterna").insertOne({ data: ambientData.tempoutc, time: new Date() }));
    }
    if (ambientData?.humidity !== undefined) {
      saveOperations.push(db.collection("HumedadExterna").insertOne({ data: ambientData.humidity, time: new Date() }));
    }
    if (ambientData?.uv !== undefined) {
      saveOperations.push(db.collection("Uv").insertOne({ data: ambientData.uv, time: new Date() }));
    }
    if (ambientData?.solarradiation !== undefined) {
      saveOperations.push(db.collection("RadiacionSolar").insertOne({ data: ambientData.solarradiation, time: new Date() }));
    }
    if (ambientData?.eventrainin !== undefined) {
      saveOperations.push(db.collection("Precipitaciones").insertOne({ data: ambientData.eventrainin, time: new Date() }));
    }
    if (ambientData?.baromrelin !== undefined) {
      saveOperations.push(db.collection("PresionBarometricaRelativa").insertOne({ data: ambientData.baromrelin, time: new Date() }));
    }

    await Promise.all(saveOperations);

    res.status(200).json({ message: "Datos de AmbientWeather guardados correctamente." });
    console.log("Datos de AmbientWeather guardados correctamente.");

  } catch (error) {
    console.error("Error al obtener o guardar datos AmbientWeather:", error.message);
    res.status(500).json({ error: "Error en AmbientWeather API." });
  }
};

export const listData = async (req, res) => {
  const { collectionName } = req.params;
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const data = await collection.find().sort({ time: -1 }).toArray();

    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los datos", error: error.message });
  }
}

export const dataDia = async (req, res) => {
  const { collectionName } = req.params;
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const pipeline = [
      {
        $match: {
          time: { $gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateTrunc: { date: "$time", unit: "hour" }
          },
          promedio: { $avg: "$data" },
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ];
    const data = await collection.aggregate(pipeline).toArray();
    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    } res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener los datos", error: e.message });
  }
}

export const dataSemana = async (req, res) => {
  const { collectionName } = req.params;
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const pipeline = [
      {
        $match: {
          time: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$time" } }
          },
          promedio: { $avg: "$data" }
        }
      },
      {
        $sort: { "_id": 1 } // Ordenar por fecha ascendente
      }
    ]
    const data = await collection.aggregate(pipeline).toArray();
    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    }
    res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener los datos", error: e.message });
  }
}
export const dataMes = async (req, res) => {
  const { collectionName } = req.params;
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const pipeline = [
      {
        $match: {
          time: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$time" } }
          },
          promedio: { $avg: "$data" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]
    const data = await collection.aggregate(pipeline).toArray();
    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    }
    res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener los datos", error: e.message });
  }
}
export const reporteCSV = async (req, res) => {
  const { collectionName } = req.params;
  const { startDate, endDate } = req.query;

  if (!collectionName) {
    return res.status(400).json({ error: "Debe proporcionar un nombre de colección" });
  }

  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Convertir fechas a UTC
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Asegurar que 'end' capture todo el último día
    end.setUTCHours(23, 59, 59, 999);

    console.log(`🔎 Buscando datos entre: ${start.toISOString()} y ${end.toISOString()}`);

    const data = await collection.find({
      time: { $gte: start, $lte: end } // Asegurar que la consulta usa el campo correcto
    }).toArray();

    console.log(`📊 Datos encontrados: ${data.length}`);

    if (!data.length) {
      return res.status(404).json({ error: "No hay datos en el rango de fechas" });
    }

    // Convertir datos a CSV
    const fields = ["data", "time"];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(`${collectionName}-${startDate}_to_${endDate}.csv`);
    res.send(csv);

    client.close();
  } catch (error) {
    console.error("❌ Error exportando CSV:", error);
    res.status(500).json({ error: "Error al exportar datos" });
  }
}
export const reporteXSLM = async (req, res) => {
  const { collectionName } = req.params;
  const { startDate, endDate } = req.query;

  if (!collectionName || !startDate || !endDate) {
    return res.status(400).json({ error: "Debe proporcionar el nombre de la colección y un rango de fechas" });
  }

  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Convertir fechas a UTC
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999); // Asegurar captura del día completo

    console.log(`🔎 Buscando datos entre: ${start.toISOString()} y ${end.toISOString()}`);

    const data = await collection.find({
      time: { $gte: start, $lte: end }
    }).toArray();

    console.log(`📊 Datos encontrados: ${data.length}`);

    if (!data.length) {
      return res.status(404).json({ error: "No hay datos en el rango de fechas" });
    }

    // Crear un nuevo libro de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(collectionName);

    // Definir encabezados
    worksheet.columns = [
      { header: "Valor", key: "data", width: 15 },
      { header: "Fecha", key: "time", width: 25 }
    ];

    // Agregar datos a la hoja de Excel
    data.forEach(({ data, time }) => {
      worksheet.addRow({
        data,
        time: new Date(time).toLocaleString("es-ES", { timeZone: "UTC" }) // Formato de fecha legible
      });
    });

    // Configurar la respuesta HTTP
    res.setHeader("Content-Disposition", `attachment; filename=${collectionName}-${startDate}_to_${endDate}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // Enviar el archivo como respuesta
    await workbook.xlsx.write(res);
    res.end();

    client.close();
  } catch (error) {
    console.error("❌ Error exportando XLSX:", error);
    res.status(500).json({ error: "Error al exportar datos" });
  }

}
export const reportePDF = async (req, res) => {
  const { collectionName } = req.params;
  const { startDate, endDate } = req.query;

  if (!collectionName || !startDate || !endDate) {
    return res.status(400).json({ error: "Debe proporcionar el nombre de la colección y un rango de fechas" });
  }

  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Convertir fechas a UTC
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999); // Capturar el día completo

    console.log(`🔎 Buscando datos entre: ${start.toISOString()} y ${end.toISOString()}`);

    const data = await collection.find({
      time: { $gte: start, $lte: end }
    }).toArray();

    console.log(`📊 Datos encontrados: ${data.length}`);

    if (!data.length) {
      return res.status(404).json({ error: "No hay datos en el rango de fechas" });
    }

    // Crear el documento PDF
    const doc = new PDFDocument();
    res.setHeader("Content-Disposition", `attachment; filename=${collectionName}-${startDate}_to_${endDate}.pdf`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);
    doc.fontSize(16).text(`Reporte de ${collectionName}`, { align: "center" });
    doc.moveDown();

    // Agregar encabezados
    doc.fontSize(12).text("Valor", 100, doc.y, { bold: true });
    doc.text("Fecha", 300, doc.y, { bold: true });
    doc.moveDown();

    // Agregar los datos al PDF
    data.forEach(({ data, time }) => {
      doc.text(`${data}`, 100, doc.y);
      doc.text(new Date(time).toLocaleString("es-ES", { timeZone: "UTC" }), 300, doc.y);
      doc.moveDown();
    });

    doc.end();
    client.close();
  } catch (error) {
    console.error("❌ Error exportando PDF:", error);
    res.status(500).json({ error: "Error al exportar datos" });
  }
}; 