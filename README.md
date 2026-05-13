# NutriPlan

App web de planificación de dietas personales con IA.

## Stack

- **Frontend**: React + Vite + TypeScript (`/frontend`)
- **Backend**: Node.js + Express + TypeScript (`/backend`)
- **Base de datos**: Supabase (PostgreSQL)
- **IA**: Anthropic Claude API (`claude-sonnet-4-20250514`)

## Estructura del proyecto

```
nutriplan/
├── frontend/          # React + Vite app
└── backend/           # Express API en puerto 3002
```

## Configuración inicial

### 1. Variables de entorno

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Llena los valores de Supabase y Anthropic en cada `.env`.

### 2. Base de datos

Ejecuta el schema en tu proyecto de Supabase:

```bash
# Copia el contenido de backend/src/db/schema.sql
# y ejecútalo en el SQL Editor de Supabase
```

### 3. Instalar dependencias

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Correr en desarrollo

```bash
# Terminal 1 — Backend (puerto 3002)
cd backend && npm run dev

# Terminal 2 — Frontend (puerto 5173)
cd frontend && npm run dev
```

## Funcionalidades

- Planificación diaria de comidas
- Generación de recetas con IA ajustadas a grupos nutricionales
- Seguimiento de macros (proteína, carbs, grasa, calorías)
- Vista semanal del plan
- Historial de progreso
- Soporte para grupos nutricionales personalizados por nutriólogo
