import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import recetasRouter from './routes/recetas.js';
import planRouter from './routes/plan.js';
import perfilRouter from './routes/perfil.js';
import historialRouter from './routes/historial.js';
import despensaRouter from './routes/despensa.js';
import adminRouter from './routes/admin.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT ?? 3002;

// ── CORS ────────────────────────────────────────────────────────────────────
// CORS_ORIGIN puede ser un único origen o una lista separada por comas.
// Ej: CORS_ORIGIN=https://nutriplan-mauve-eight.vercel.app,http://localhost:5173
const allowedOrigins: string[] = (
  process.env.CORS_ORIGIN ?? 'http://localhost:5173'
).split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (incoming, callback) => {
      // Permitir requests sin Origin (curl, Postman, server-to-server)
      if (!incoming) return callback(null, true);
      if (allowedOrigins.includes(incoming)) return callback(null, true);
      callback(new Error(`Origin no permitido por CORS: ${incoming}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Responder a preflight OPTIONS en todas las rutas antes de cualquier auth
app.options('*', cors());

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/recetas', recetasRouter);
app.use('/api/plan', planRouter);
app.use('/api/perfil', perfilRouter);
app.use('/api/historial', historialRouter);
app.use('/api/despensa', despensaRouter);
app.use('/api/admin', adminRouter);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`NutriPlan API corriendo en http://localhost:${PORT}`);
});

export default app;
