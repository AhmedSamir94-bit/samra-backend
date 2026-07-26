export const loginRequestExample = {
  username: 'admin',
  password: 'admin123',
};

export const loginResponseExample = {
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N2FiYzEyMyIsInVzZXJuYW1lIjoiYWRtaW4ifQ.example',
  refreshToken:
    'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  expiresIn: 900,
  user: {
    id: '67abc123def4567890123456',
    username: 'admin',
    name: 'مدير النظام',
  },
};

export const refreshRequestExample = {
  refreshToken:
    'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
};

export const logoutResponseExample = {
  message: 'تم تسجيل الخروج بنجاح',
};

export const meResponseExample = {
  id: '67abc123def4567890123456',
  username: 'admin',
  name: 'مدير النظام',
};

export const createAdminRequestExample = {
  username: 'cashier1',
  password: 'pass1234',
  name: 'كاشير ١',
};

export const createAdminResponseExample = {
  id: '67abc123def4567890123457',
  username: 'cashier1',
  name: 'كاشير ١',
};
