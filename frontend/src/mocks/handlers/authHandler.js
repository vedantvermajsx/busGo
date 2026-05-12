/**
 * authHandler — handles POST /auth/login, POST /auth/register, GET /auth/me
 */
export function handleAuth(method, path, body, db, currentUserId) {
  // POST /auth/login
  if (method === 'POST' && path === '/auth/login') {
    const { email, password } = body || {};
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) throw { status: 401, message: 'Invalid email or password' };
    const { password: _pw, ...safeUser } = user;
    return { user: safeUser, token: `mock-jwt-${user._id}` };
  }

  // POST /auth/register
  if (method === 'POST' && path === '/auth/register') {
    const { name, email, password, phone } = body || {};
    if (!name || !email || !password) throw { status: 400, message: 'Name, email and password are required' };
    if (db.users.find(u => u.email === email)) throw { status: 409, message: 'Email already registered' };
    const newUser = {
      _id: `usr_${Date.now()}`,
      name,
      email,
      password,
      phone: phone || '',
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    const { password: _pw, ...safeUser } = newUser;
    return { user: safeUser, token: `mock-jwt-${newUser._id}` };
  }

  // GET /auth/me
  if (method === 'GET' && path === '/auth/me') {
    if (!currentUserId) throw { status: 401, message: 'Unauthorized' };
    const user = db.users.find(u => u._id === currentUserId);
    if (!user) throw { status: 401, message: 'User not found' };
    const { password: _pw, ...safeUser } = user;
    return { user: safeUser };
  }

  return null; // not handled
}
