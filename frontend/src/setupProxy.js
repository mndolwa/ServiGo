const { createProxyMiddleware } = require('http-proxy-middleware');

const rawTarget = process.env.BACKEND_PROXY_TARGET || 'http://127.0.0.1:8000';
const normalizedTarget = rawTarget.replace(/\/+$/, '');
const target = normalizedTarget;

module.exports = function proxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      logLevel: 'warn',
    })
  );
};
