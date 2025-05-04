import {Client, expect} from '@loopback/testlab';
import {CertAdminApplication} from '../..';
import {setupApplication} from './test-helper';

describe('HomePage', () => {
  let app: CertAdminApplication;
  let client: Client;

  beforeAll(async () => {
    ({app, client} = await setupApplication());
  });

  afterAll(async () => {
    await app.stop();
  });

  it('exposes a default home page', async () => {
    await client
      .get('/')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect(/Certificate Administration System/);
  });

  it('exposes API explorer', async () => {
    await client
      .get('/explorer/')
      .expect(200)
      .expect('Content-Type', /text\/html/)
      .expect(/Swagger UI/);
  });
});
