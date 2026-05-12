import client from './ApiClient.js';

export class AuthApi {
  login(phone, password) {
    return client.post('/auth/login', { phone, password });
  }
  register(name, phone, password) {
    return client.post('/auth/signup', { name, phone, password });
  }
  getProfile() {
    return client.get('/auth/me');
  }
}

export default new AuthApi();
