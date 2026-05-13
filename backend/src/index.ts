import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import recetasRouter from './routes/recetas.js';
import planRouter from './routes/plan.js';
import perfilRouter from './routes/perfil.js';
import historialRouter from './routes/historial.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT ?? 3002;

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
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

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`NutriPlan API corriendo en http://localhost:${PORT}`);
});

export default app;
