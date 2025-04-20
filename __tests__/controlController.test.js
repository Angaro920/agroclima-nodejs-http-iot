const { recibirInstrucciones, enviarInstrucciones } = require('../controller/controlController');
const { mockRequest, mockResponse } = require('mock-req-res');

describe('Controlador de Control', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recibirInstrucciones', () => {
    it('debería recibir instrucciones correctamente', async () => {
      const req = mockRequest({
        body: {
          device: 'sensor1',
          state: 'on'
        }
      });
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await recibirInstrucciones(req, res);
      
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
    
    it('debería devolver error si faltan campos', async () => {
      const req = mockRequest({
        body: {
          device: 'sensor1'
          // State falta
        }
      });
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await recibirInstrucciones(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Faltan campos' });
    });
  });

  describe('enviarInstrucciones', () => {
    it('debería enviar instrucciones y resetear el estado', async () => {
      const req = mockRequest();
      const res = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      // Primero establecemos una instrucción
      const setReq = mockRequest({
        body: {
          device: 'sensor1',
          state: 'on'
        }
      });
      const setRes = {
        ...mockResponse(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      await recibirInstrucciones(setReq, setRes);
      
      // Ahora probamos enviarInstrucciones
      await enviarInstrucciones(req, res);
      
      expect(res.json).toHaveBeenCalledWith({ device: 'sensor1', state: 'on' });
      
      // Verificamos que se haya reseteado
      await enviarInstrucciones(req, res);
      expect(res.json).toHaveBeenCalledWith({ device: '', state: '' });
    });
  });
});