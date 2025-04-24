const MongoClient = require('mongodb').MongoClient;
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const dotenv = require('dotenv');
const axios = require('axios');
const { formatInTimeZone } = require('date-fns-tz');
const { es } = require('date-fns/locale');


dotenv.config();
const colecciones = ['TemperaturaInterna', 'TemperaturaExterna', 'TemperaturaSensor', 'HumedadInterna', 'HumedadExterna', 'HumedadSensor', 'Uv', 'RadiacionSolar', 'Precipitaciones', 'PresionBarometricaRelativa', 'DireccionViento', 'VelocidadViento', 'HidrogenoSensor', 'LuzSensor'];

const dbName = "AgroclimaAi";
const mongoURL = process.env.MONGO_URI || "mongodb://localhost:27017/AgroclimaAi";

// Función para conectar a MongoDB
const connectToMongoDB = async () => {
  try {
    const client = await MongoClient.connect(mongoURL);
    /* console.log("Conectado a MongoDB en DataController"); */
    const db = client.db(dbName);
    return { client, db };
  } catch (error) {
    console.error("Error conectando a MongoDB:", error);
    throw error;
  }
};

const envioDatosSensores = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const resultados = {};
    for (const col of colecciones) {
      const dato = await db.collection(col)
        .find()
        .sort({ time: -1 })
        .limit(1)
        .toArray();

      resultados[col] = dato[0] || null;
    }
    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al obtener datos de los sensores:", error);
    res.status(500).json({ error: "Error al obtener datos de los sensores." });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

const recibirDatosSensores = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const data = req.body;
    const currentTime = new Date();

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
  } finally {
    if (client) {
      await client.close();
    }
  }
};

const obtenerDatosAmbientWeather = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;

    const response = await axios.get('https://api.ambientweather.net/v1/devices', {
      params: {
        apiKey: process.env.AMBIENT_API_KEY,
        applicationKey: process.env.AMBIENT_APP_KEY
      }
    });

    const ambientData = response.data[0]?.lastData;
    if (!ambientData) {
      return res.status(404).json({ error: "No se encontraron datos de AmbientWeather." });
    }

    // Conversiones
    const conversiones = [
      { key: 'tempinf', newKey: 'tempinfC', factor: v => (v - 32) * 5 / 9 },
      { key: 'tempf', newKey: 'tempoutc', factor: v => (v - 32) * 5 / 9 },
      { key: 'baromrelin', newKey: 'baromrelmm', factor: v => v * 24.4 },
      { key: 'windspeedmph', newKey: 'windspeedkph', factor: v => v * 1.609344 },
      { key: 'eventrainin', newKey: 'eventrainmm', factor: v => v * 24.4 }
    ];

    conversiones.forEach(({ key, newKey, factor }) => {
      if (ambientData[key] !== undefined) {
        ambientData[newKey] = Number(factor(ambientData[key]).toFixed(2));
      }
    });

    // Guardado en base de datos
    const saveMap = [
      { key: 'tempinfC', collection: "TemperaturaInterna" },
      { key: 'humidityin', collection: "HumedadInterna" },
      { key: 'tempoutc', collection: "TemperaturaExterna" },
      { key: 'humidity', collection: "HumedadExterna" },
      { key: 'uv', collection: "Uv" },
      { key: 'solarradiation', collection: "RadiacionSolar" },
      { key: 'eventrainmm', collection: "Precipitaciones" },
      { key: 'baromrelmm', collection: "PresionBarometricaRelativa" },
      { key: 'winddir', collection: "DireccionViento" },
      { key: 'windspeedkph', collection: "VelocidadViento" }
    ];

    const saveOperations = saveMap.reduce((ops, { key, collection }) => {
      if (ambientData[key] !== undefined) {
        ops.push(db.collection(collection).insertOne({ data: ambientData[key], time: new Date() }));
      }
      return ops;
    }, []);

    await Promise.all(saveOperations);

    console.log("Datos de AmbientWeather guardados correctamente.");
    res.status(200).json({ message: "Datos de AmbientWeather guardados correctamente." });

  } catch (error) {
    console.error("Error al obtener o guardar datos AmbientWeather:", error.message);
    res.status(500).json({ error: "Error en AmbientWeather API." });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

const listData = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const { collectionName } = req.params;
    const collection = db.collection(collectionName);
    const pipeline = [
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$time" }
          },
          Promedio: { $avg: "$data" },
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]
    let data = await collection.aggregate(pipeline).toArray();
    data = data.map(item => {
      const fecha = item._id
      const promedio = item.Promedio
      return {
        ...item,
        Fecha: formatInTimeZone(fecha, 'America/Bogota', 'dd MMMM yyyy h:mm a', { locale: es }),
        Promedio: Number(promedio.toFixed(2))
      };
    });

    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    }
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los datos", error: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
const dataDiaDual = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const { collectionNameA, collectionNameB } = req.params;

    if (!collectionNameA || !collectionNameB) {
      return res.status(400).json({ error: "Nombres de colección requeridos" });
    }

    const collectionExterna = db.collection(collectionNameA);
    const collectionInterna = db.collection(collectionNameB);
    const combinedData = [];
    const pipeline = [
      {
        $match: {
          time: { $gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$time" }
          },
          Promedio: { $avg: "$data" },
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ];

    const [dataExterna, dataInterna] = await Promise.all([
      collectionExterna.aggregate(pipeline).toArray(),
      collectionInterna.aggregate(pipeline).toArray()
    ]);

    dataExterna.forEach((ext, index) => {
      combinedData.push({
        hora: formatInTimeZone(ext._id, 'America/Bogota', 'd MMMM h:mm a', { locale: es }),
        lugar: 'Externa',
        value: ext.Promedio,
      });
      if (dataInterna[index]) {
        combinedData.push({
          hora: formatInTimeZone(dataInterna[index]._id, 'America/Bogota', 'dd MMMM h:mm a', { locale: es }),
          lugar: 'Interna',
          value: dataInterna[index].Promedio,
        });
      }
    });

    res.status(200).json(combinedData);
  } catch (error) {
    console.error("Error al obtener datos duales:", error);
    res.status(500).json({ error: "Error al obtener datos duales" });
  } finally {
    if (client) {
      await client.close();
    }
  }
};
const dataDia = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const { collectionName } = req.params;
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
            $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$time" }
          },
          Promedio: { $avg: "$data" },
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]
    let data = await collection.aggregate(pipeline).toArray();

    data = data.map(item => {
      const fecha = item._id
      return {
        ...item,
        Fecha: formatInTimeZone(fecha, 'America/Bogota', 'dd MMMM h:mm a', { locale: es }),
      };
    });
    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    }
    res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener los datos", error: e.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

const dataSemana = async (req, res) => {
  const { collectionName } = req.params;
  try {
    const { client, db } = await connectToMongoDB();
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
          Promedio: { $avg: "$data" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]
    let data = await collection.aggregate(pipeline).toArray();
    data = data.map(item => {
      const fecha = item._id
      return {
        ...item,
        Fecha: formatInTimeZone(fecha, 'America/Bogota', 'dd MMMM yyyy', { locale: es }),
      };
    });
    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    }
    res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener los datos", error: e.message });
  }
}
const dataMes = async (req, res) => {
  const { collectionName } = req.params;
  try {
    const { client, db } = await connectToMongoDB();
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
          Promedio: { $avg: "$data" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]
    let data = await collection.aggregate(pipeline).toArray();
    data = data.map(item => {
      const fecha = item._id
      return {
        ...item,
        Fecha: formatInTimeZone(fecha, 'America/Bogota', 'dd MMMM yyyy', { locale: es }),
      };
    });
    if (data.length === 0) {
      return res.status(404).json({ message: "No se encontraron datos." });
    }
    res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Error al obtener los datos", error: e.message });
  }
}
const reporteCSV = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const { collectionName } = req.params;
    const { startDate, endDate } = req.query;

    if (!collectionName || !startDate || !endDate) {
      return res.status(400).json({ error: "Parámetros incompletos" });
    }

    const collection = db.collection(collectionName);

    // Convertir fechas a UTC
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Asegurar que 'end' capture todo el último día
    end.setUTCHours(23, 59, 59, 999);

    console.log(`🔎 Buscando datos entre: ${start.toISOString()} y ${end.toISOString()}`);

    const rawData = await collection.find({
      time: { $gte: start, $lte: end }
    }).toArray();

    console.log(`📊 Datos encontrados: ${rawData.length}`);

    if (!rawData.length) {
      return res.status(404).json({ error: "No hay datos en el rango de fechas" });
    }

    const data = rawData.map(item => ({
      ...item,
      time: formatInTimeZone(new Date(item.time), 'America/Bogota', 'dd MMMM yyyy HH:mm', { locale: es }),
    }));

    // Convertir datos a CSV
    const fields = ["data", "time"];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    const fileName = `${collectionName}-${startDate}_to_${endDate}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(csv);

  } catch (error) {
    console.error("Error exportando CSV:", error);
    res.status(500).json({ error: "Error al exportar datos" });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

const reporteXSLM = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const { collectionName } = req.params;
    const { startDate, endDate } = req.query;

    if (!collectionName || !startDate || !endDate) {
      return res.status(400).json({ error: "Parámetros incompletos" });
    }
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
        time: formatInTimeZone(time, 'America/Bogota', 'dd MMMM yyyy HH:mm', { locale: es }),
      });
    });
    const fileName = `${collectionName}-${startDate}_to_${endDate}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error exportando XLSX:", error);
    res.status(500).json({ error: "Error al exportar datos" });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

const reportePDF = async (req, res) => {
  let client;
  try {
    const { client: mongoClient, db } = await connectToMongoDB();
    client = mongoClient;
    const { collectionName } = req.params;
    const { startDate, endDate } = req.query;

    if (!collectionName || !startDate || !endDate) {
      return res.status(400).json({ error: "Parámetros incompletos" });
    }

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

    // Usar streams para evitar problemas de memoria y paginación
    const stream = res;
    const fileName = `${collectionName}-${startDate}_to_${endDate}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // Crear el documento PDF con opciones simples
    const doc = new PDFDocument({
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      size: 'A4',
      bufferPages: true
    });

    // Conectar el documento al stream de respuesta
    doc.pipe(stream);

    // Título del reporte
    doc.fontSize(18).font('Helvetica-Bold').text(`Reporte de ${collectionName}`, { align: "center" });
    doc.moveDown(1.5);

    // Información del periodo
    doc.fontSize(10).font('Helvetica')
      .text(`Período: ${formatInTimeZone(start, 'America/Bogota', 'dd/MM/yyyy', { locale: es })} - ${formatInTimeZone(end, 'America/Bogota', 'dd/MM/yyyy', { locale: es })}`);
    doc.moveDown(1);

    // Definir dimensiones para la tabla
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const valueColumnWidth = pageWidth * 0.4;
    const dateColumnWidth = pageWidth * 0.6;

    // Dibujar encabezados iniciales
    let rowY = doc.y;
    const drawTableHeader = () => {
      doc.font('Helvetica-Bold').fontSize(12);
      doc.rect(doc.page.margins.left, rowY, pageWidth, 20).fillAndStroke('#EEEEEE', '#000000');
      doc.fillColor('#000000')
        .text('Valor', doc.page.margins.left + 5, rowY + 6, { width: valueColumnWidth, align: 'left' })
        .text('Fecha', doc.page.margins.left + valueColumnWidth + 5, rowY + 6, { width: dateColumnWidth, align: 'left' });
      rowY += 20;
    };

    drawTableHeader();
    let altColor = false;


    // Calcular altura disponible para datos en cada página
    const pageHeight = doc.page.height;
    const contentHeight = pageHeight - doc.page.margins.top - doc.page.margins.bottom - 20; // 20px extra para margen
    const rowHeight = 20; // Altura estándar para cada fila

    // Procesar los datos y agregarlos al PDF
    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Verificar si necesitamos una nueva página
      if (rowY + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        rowY = doc.page.margins.top;
        drawTableHeader();
        altColor = false;
      }

      // Color alternado para las filas
      if (altColor) {
        doc.rect(doc.page.margins.left, rowY, pageWidth, rowHeight).fill('#F8F8F8');
      }
      altColor = !altColor;

      // Dibujar el borde de la fila
      doc.rect(doc.page.margins.left, rowY, pageWidth, rowHeight).stroke('#DDDDDD');

      // Escribir los datos
      doc.font('Helvetica').fontSize(10).fillColor('#000000')
        .text(`${item.data}`, doc.page.margins.left + 5, rowY + 5, { width: valueColumnWidth, align: 'left' })
        .text(
          formatInTimeZone(item.time, 'America/Bogota', 'dd MMMM yyyy HH:mm', { locale: es }),
          doc.page.margins.left + valueColumnWidth + 5,
          rowY + 5,
          { width: dateColumnWidth, align: 'left' }
        );

      rowY += rowHeight;
    }

    // Finalizar el documento
    doc.end();
  } catch (error) {
    console.error("Error exportando PDF:", error);
    res.status(500).json({ error: "Error al exportar datos" });
  } finally {
    if (client) {
      await client.close();
    }
  }
};
module.exports = {
  envioDatosSensores,
  recibirDatosSensores,
  obtenerDatosAmbientWeather,
  listData,
  dataDiaDual,
  dataDia,
  dataSemana,
  dataMes,
  reporteCSV,
  reporteXSLM,
  reportePDF
};
