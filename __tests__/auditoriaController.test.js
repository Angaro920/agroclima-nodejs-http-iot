const { listarAuditorias, exportarAuditorias } = require('../controller/auditoriaController');
const { MongoClient } = require('mongodb');
const { mockRequest, mockResponse } = require('mock-req-res');
const sinon = require('sinon');

// Mock de módulos externos
jest.mock('mongodb');
jest.mock('json2csv', () => ({
  Parser: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue('csv_content')
  }))
}));
jest.mock('exceljs', () => {
  return {
    Workbook: jest.fn().mockImplementation(() => ({
      addWorksheet: jest.fn().mockReturnValue({
        columns: [],
        addRow: jest.fn()
      }),
      xlsx: {
        write: jest.fn().mockResolvedValue(true)
      }
    }))
  };
});
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    end: jest.fn()
  }));
});
jest.mock('moment', () => {
  return jest.fn().mockImplementation(() => ({
    format: jest.fn().mockReturnValue('2025-04-20 12:00:00')
  }));
});

describe('Controlador de Auditoría', () => {
  let mockMongoClient;
  let mockDb;
  let mockCollection;
  
  beforeEach(() => {
    // Configurar mocks para MongoDB
    mockCollection = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([
        { _id: '1', usuario: 'test', accion: 'login', fecha: new Date() }
      ])
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };
    mockMongoClient = {
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(true)
    };
    
    MongoClient.connect = jest.fn().mockResolvedValue(mockMongoClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listarAuditorias', () => {
    it('debería listar auditorías correctamente', async () => {
      const req = mockRequest();
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await listarAuditorias(req, res);
      
      expect(MongoClient.connect).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('auditorias');
      expect(mockCollection.find).toHaveBeenCalled();
      expect(mockCollection.sort).toHaveBeenCalledWith({ fecha: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });
    
    it('debería manejar errores correctamente', async () => {
      const req = mockRequest();
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      // Simular un error de conexión
      MongoClient.connect.mockRejectedValueOnce(new Error('Error de conexión'));
      
      await listarAuditorias(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error en el servidor' });
    });
  });

  describe('exportarAuditorias', () => {
    it('debería exportar auditorías en formato CSV', async () => {
      const req = mockRequest({
        params: { type: 'csv' },
        query: { startDate: '2025-01-01', endDate: '2025-04-20' }
      });
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        send: jest.fn()
      };
      
      await exportarAuditorias(req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=auditorias.csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalled();
    });
    
    it('debería exportar auditorías en formato Excel', async () => {
      const req = mockRequest({
        params: { type: 'xlsx' },
        query: { startDate: '2025-01-01', endDate: '2025-04-20' }
      });
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        send: jest.fn()
      };
      
      await exportarAuditorias(req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=auditorias.xlsx');
    });
    
    it('debería exportar auditorías en formato PDF', async () => {
      const req = mockRequest({
        params: { type: 'pdf' },
        query: { startDate: '2025-01-01', endDate: '2025-04-20' }
      });
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
        setHeader: jest.fn(),
        send: jest.fn()
      };
      
      await exportarAuditorias(req, res);
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=auditorias.pdf');
    });
    
    it('debería devolver error si no hay registros', async () => {
      const req = mockRequest({
        params: { type: 'csv' },
        query: { startDate: '2025-01-01', endDate: '2025-04-20' }
      });
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      mockCollection.toArray.mockResolvedValueOnce([]);
      
      await exportarAuditorias(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'No hay registros en el rango de fechas' });
    });
    
    it('debería devolver error si faltan fechas', async () => {
      const req = mockRequest({
        params: { type: 'csv' },
        query: {}
      });
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await exportarAuditorias(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fechas requeridas' });
    });
  });
});