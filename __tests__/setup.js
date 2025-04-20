const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Conectar a la base de datos en memoria antes de ejecutar las pruebas
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

// Limpiar todas las colecciones después de cada test
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Desconectar y detener el servidor después de todas las pruebas
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Suprimir logs durante pruebas
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
};

// Prueba básica para validar la configuración
describe('Configuración de pruebas', () => {
  it('debería tener una conexión a MongoDB activa', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});