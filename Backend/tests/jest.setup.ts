/**
 * Configurazione globale per l'ambiente di test Jest.
 * Questo file viene eseguito prima dell'avvio dei test per impostare timeout e mock condivisi.
 */
jest.setTimeout(15000);

// Mock globale del logger per evitare di stampare i log applicativi nella console durante i test
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));


beforeAll(() => {
  console.log('Ambiente di test inizializzato');
});

afterAll(() => {
  console.log('Tutti i test completati');
});
