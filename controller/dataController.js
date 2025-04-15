import { Temperatura, Humedad, Gas, Luz } from "../model/dataModel.js";
import { MongoClient } from "mongodb";
import { Parser } from "json2csv";
import ExcelJS from "exceljs"
import PDFDocument from "pdfkit";
import dotenv from "dotenv";
import axios from "axios";
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';


dotenv.config();
const colecciones = ['TemperaturaInterna', 'TemperaturaExterna','TemperaturaSensor','HumedadInterna', 'HumedadExterna','HumedadSensor', 'Uv', 'RadiacionSolar', 'Precipitaciones', 'PresionBarometricaRelativa','DireccionViento', 'VelocidadViento', 'HidrogenoSensor', 'LuzSensor'];


const dbName = "AgroclimaAi";
const mongoURL = process.env.MONGO_URI;
let db;

MongoClient.connect(mongoURL)
  .then((client) => {
    console.log("Conectado a MongoDB en DataController");
    db = client.db("AgroclimaAi");
  })
  .catch((error) => console.error("Error conectando a MongoDB:", error));

export const envioDatosSensores = async (req, res) => {
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    const resultados = {};
    for (const col of colecciones) {
      const dato = await db.collection(col)
        .find()
        .sort({ time: -1 })
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
    if (ambientData?.baromrelin !== undefined) {
      ambientData.baromrelmm= Number((ambientData.baromrelin * 24.4).toFixed(2));
    }
    if (ambientData?.windspeedmph !== undefined) {
      ambientData.windspeedkph = Number((ambientData.windspeedmph * 1.609344).toFixed(2));
    }
    if (ambientData?.eventrainin !== undefined) {
      ambientData.eventrainmm = Number((ambientData.eventrainin * 24.4).toFixed(2));
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
    if (ambientData?.eventrainmm !== undefined) {
      saveOperations.push(db.collection("Precipitaciones").insertOne({ data: ambientData.eventrainmm, time: new Date() }));
    }
    if (ambientData?.baromrelmm  !== undefined) {
      saveOperations.push(db.collection("PresionBarometricaRelativa").insertOne({ data: ambientData.baromrelmm, time: new Date() }));
    }
    if (ambientData?. winddir !== undefined) {
      saveOperations.push(db.collection("DireccionViento").insertOne({ data: ambientData.winddir, time: new Date() }));
    }
    if (ambientData?.windspeedkph !== undefined) {
      saveOperations.push(db.collection("VelocidadViento").insertOne({ data: ambientData.windspeedkph, time: new Date() }));
    }

    await Promise.all(saveOperations);

    res.status(200).json({ message: "Datos de AmbientWeather guardados correctamente." });
    console.log(ambientData)
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
export const dataDiaDual = async (req, res) => {
  const { collectionNameA, collectionNameB } = req.params;
  try {
    const client = await MongoClient.connect(mongoURL);
    const db = client.db(dbName);
    console.log(collectionNameA);
    console.log(collectionNameB);
    const collectionExterna = await db.collection(collectionNameA);
    const collectionInterna = await db.collection(collectionNameB);
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
          promedio: { $avg: "$data" },
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ];
    const dataExterna = await collectionExterna.aggregate(pipeline).toArray();
    const dataInterna = await collectionInterna.aggregate(pipeline).toArray();
    console.log(dataExterna)
    console.log(dataInterna)
    
    dataExterna.forEach((ext, index) => {
      combinedData.push({
        hora: formatInTimeZone(ext._id, 'America/Bogota', 'h:mm a', { locale: es }),
        lugar: 'externa',
        value: ext.promedio,
      });
      if (dataInterna[index]) {
        combinedData.push({
          hora: formatInTimeZone(dataInterna[index]._id, 'America/Bogota', 'h:mm a', { locale: es }),
          lugar: 'interna',
          value: dataInterna[index].promedio,
        });
      }
    });
    console.log(combinedData)
    res.status(200).json(combinedData);
  } catch(error) {
    console.log(error)
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
            $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$time"}
          },
          promedio: { $avg: "$data" },
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
        fecha: formatInTimeZone(fecha, 'America/Bogota', 'h:mm a', { locale: es }),
      };
    });
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
        $sort: { "_id": 1 }
      }
    ]
    let data = await collection.aggregate(pipeline).toArray();
    data = data.map(item => {
      const fecha = item._id
      return {
        ...item,
        fecha: formatInTimeZone(fecha, 'America/Bogota', 'dd MMMM yyyy', { locale: es }),
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
    let data = await collection.aggregate(pipeline).toArray();
    data = data.map(item => {
      const fecha = item._id
      return {
        ...item,
        fecha: formatInTimeZone(fecha, 'America/Bogota', 'dd MMMM yyyy', { locale: es }),
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

    const rawData = await collection.find({
      time: { $gte: start, $lte: end } // Asegurar que la consulta usa el campo correcto
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
        time: formatInTimeZone(time, 'America/Bogota', 'dd MMMM yyyy HH:mm', { locale: es }),
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

    // Usar streams para evitar problemas de memoria y paginación
    const stream = res;
    res.setHeader("Content-Disposition", `attachment; filename=${collectionName}-${startDate}_to_${endDate}.pdf`);
    res.setHeader("Content-Type", "application/pdf");

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
    client.close();
  } catch (error) {
    console.error("❌ Error exportando PDF:", error);
    res.status(500).json({ error: "Error al exportar datos" });
  }
};