import {CertAdminApplication} from '../..';
import {
  createRestAppClient,
  givenHttpServerConfig,
  Client,
  createClientForHandler,
} from '@loopback/testlab';
import {RestServer} from '@loopback/rest';

export async function setupApplication(): Promise<AppWithClient> {
  const restConfig = givenHttpServerConfig({
    port: 0, // Let the system pick a random port
  });

  const app = new CertAdminApplication({
    rest: restConfig,
  });
  await app.boot();
  await app.start();

  const client = createClientForHandler(app.restServer.requestHandler);

  return {app, client};
}

export interface AppWithClient {
  app: CertAdminApplication;
  client: Client;
}

describe('Test Helper', () => {
  it('should setup application correctly', async () => {
    const {app, client} = await setupApplication();
    expect(app).toBeInstanceOf(CertAdminApplication);
    expect(client).toBeDefined();
    await app.stop();
  });
});
