const {
    envioDatosSensores,
    recibirDatosSensores,
    obtenerDatosAmbientWeather,
    listData,
    dataDia,
    dataSemana,
    dataMes,
    reporteCSV,
    reporteXSLM,
    reportePDF
  } = require('../controller/dataController');
  const { mockRequest, mockResponse } = require('mock-req-res');
  const { MongoClient } = require('mongodb');
  const axios = require('axios');
  const { Parser } = require('json2csv');
  const ExcelJS = require('exceljs');
  const PDFDocument = require('pdfkit');
  const { formatInTimeZone } = require('date-fns-tz');
  const { es } = require('date-fns/locale');
  
  // Mock de módulos externos
  jest.mock('mongodb');
  jest.mock('axios');
  jest.mock('json2csv');
  jest.mock('exceljs');
  jest.mock('pdfkit');
  jest.mock('date-fns-tz');
  jest.mock('date-fns/locale');
  
  describe('Data Controller', () => {
    let mockMongoClient;
    let mockDb;
    let mockCollection;
    let req;
    let res;
    
    beforeEach(() => {
      // Configurar mocks para MongoDB
      mockCollection = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([{ data: 25, time: new Date() }]),
        insertOne: jest.fn().mockResolvedValue({ insertedId: '123' }),
        aggregate: jest.fn().mockReturnThis()
      };
      
      mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      mockMongoClient = {
        db: jest.fn().mockReturnValue(mockDb),
        close: jest.fn().mockResolvedValue(true)
      };
      
      MongoClient.connect = jest.fn().mockResolvedValue(mockMongoClient);
      
      // Configurar request y response
      req = {
        params: {},
        body: {},
        query: {}
      };
      
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        setHeader: jest.fn(),
        attachment: jest.fn()
      };
      
      // Mock de formatInTimeZone
      formatInTimeZone.mockImplementation((date, timezone, format, options) => {
        return '2024-01-01 12:00 PM';
      });
    });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    describe('envioDatosSensores', () => {
      it('debería enviar datos de todos los sensores', async () => {
        await envioDatosSensores(req, res);
        
        expect(MongoClient.connect).toHaveBeenCalled();
        expect(mockDb.collection).toHaveBeenCalledTimes(14); // Número de colecciones
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
      });
  
      it('debería manejar errores correctamente', async () => {
        MongoClient.connect.mockRejectedValueOnce(new Error('Error de conexión'));
        
        await envioDatosSensores(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error al obtener datos de los sensores." });
      });
    });
  
    describe('recibirDatosSensores', () => {
      it('debería guardar datos de sensores correctamente', async () => {
        req.body = {
          temperatura: 25,
          humedad: 60,
          gas: 100,
          luz: 500
        };
        
        await recibirDatosSensores(req, res);
        
        expect(MongoClient.connect).toHaveBeenCalled();
        expect(mockDb.collection).toHaveBeenCalledTimes(4);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: "Datos guardados correctamente." });
      });
  
      it('debería manejar errores correctamente', async () => {
        MongoClient.connect.mockRejectedValueOnce(new Error('Error de conexión'));
        
        await recibirDatosSensores(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error guardando datos." });
      });
    });
  
    describe('obtenerDatosAmbientWeather', () => {
      it('debería obtener y guardar datos de AmbientWeather', async () => {
        const mockAmbientData = {
          tempinf: 70,
          tempf: 75,
          humidityin: 50,
          humidity: 60,
          uv: 5,
          solarradiation: 800,
          eventrainin: 0.1,
          baromrelin: 30,
          winddir: 180,
          windspeedmph: 10
        };
        
        axios.get.mockResolvedValueOnce({ data: [{ lastData: mockAmbientData }] });
        mockCollection.insertOne.mockResolvedValueOnce({ insertedId: '123' });
        
        await obtenerDatosAmbientWeather(req, res);
        
        expect(axios.get).toHaveBeenCalled();
        expect(mockDb.collection).toHaveBeenCalledTimes(10); // Número de colecciones de AmbientWeather
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: "Datos de AmbientWeather guardados correctamente." });
      });
  
      it('debería manejar cuando no hay datos de AmbientWeather', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });
        
        await obtenerDatosAmbientWeather(req, res);
        
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "No se encontraron datos de AmbientWeather." });
      });
  
      it('debería manejar errores de API', async () => {
        axios.get.mockRejectedValueOnce(new Error('Error de API'));
        
        await obtenerDatosAmbientWeather(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error en AmbientWeather API." });
      });
    });
  
    describe('listData', () => {
      it('debería listar datos agrupados por hora', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        mockCollection.aggregate.mockReturnThis();
        mockCollection.toArray.mockResolvedValueOnce([{ _id: '2024-01-01T12:00:00Z', promedio: 25 }]);
        
        await listData(req, res);
        
        expect(MongoClient.connect).toHaveBeenCalled();
        expect(mockDb.collection).toHaveBeenCalledWith('TemperaturaSensor');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
      });
  
      it('debería manejar cuando no hay datos', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        mockCollection.aggregate.mockReturnThis();
        mockCollection.toArray.mockResolvedValueOnce([]);
        
        await listData(req, res);
        
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "No se encontraron datos." });
      });
  
      it('debería manejar errores correctamente', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        MongoClient.connect.mockRejectedValueOnce(new Error('Error de conexión'));
        
        await listData(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
      });
    });
  
    describe('reporteCSV', () => {
      it('debería generar reporte CSV correctamente', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        req.query = { startDate: '2024-01-01', endDate: '2024-01-02' };
        
        mockCollection.find.mockReturnThis();
        mockCollection.toArray.mockResolvedValueOnce([{ 
          data: 25, 
          time: new Date('2024-01-01T12:00:00Z') 
        }]);

        Parser.mockImplementation(() => ({
          parse: jest.fn().mockReturnValue('csv_content')
        }));

        await reporteCSV(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=reporte.csv');
        expect(res.send).toHaveBeenCalledWith('csv_content');
      });
  
      it('debería manejar errores correctamente', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        req.query = { startDate: '2024-01-01', endDate: '2024-01-02' };
        
        MongoClient.connect.mockRejectedValueOnce(new Error('Error de conexión'));

        await reporteCSV(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error al exportar datos" });
      });
    });
  
    describe('reporteXSLM', () => {
      it('debería generar reporte Excel correctamente', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        req.query = { startDate: '2024-01-01', endDate: '2024-01-02' };
        
        mockCollection.find.mockReturnThis();
        mockCollection.toArray.mockResolvedValueOnce([{ 
          data: 25, 
          time: new Date('2024-01-01T12:00:00Z') 
        }]);

        await reporteXSLM(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=reporte.xlsx');
      });
  
      it('debería manejar errores correctamente', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        req.query = { startDate: '2024-01-01', endDate: '2024-01-02' };
        
        MongoClient.connect.mockRejectedValueOnce(new Error('Error de conexión'));

        await reporteXSLM(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error al exportar datos" });
      });
    });
  
    describe('reportePDF', () => {
      it('debería generar reporte PDF correctamente', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        req.query = { startDate: '2024-01-01', endDate: '2024-01-02' };
        
        mockCollection.find.mockReturnThis();
        mockCollection.toArray.mockResolvedValueOnce([{ 
          data: 25, 
          time: new Date('2024-01-01T12:00:00Z') 
        }]);

        await reportePDF(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=reporte.pdf');
      });
  
      it('debería manejar errores correctamente', async () => {
        req.params = { collectionName: 'TemperaturaSensor' };
        req.query = { startDate: '2024-01-01', endDate: '2024-01-02' };
        
        MongoClient.connect.mockRejectedValueOnce(new Error('Error de conexión'));

        await reportePDF(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error al exportar datos" });
      });
    });
  });   