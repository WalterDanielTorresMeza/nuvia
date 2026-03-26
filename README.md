# MediSystem — Sistema de Gestión Médica

Sistema médico completo para consultorios con varios doctores.

## Stack
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Supabase (Auth + PostgreSQL + Storage + Realtime)
- **Deploy**: Vercel + GitHub

---

## Configuración inicial

### 1. Clonar e instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Copia `.env.local` y rellena con tus credenciales de Supabase:
```
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Ejecutar el schema SQL en Supabase
Ve a **Supabase > SQL Editor** y ejecuta el archivo:
```
supabase/migrations/001_initial_schema.sql
```

### 4. Crear el primer usuario doctor
En **Supabase > Authentication > Users**, crea un usuario con email y contraseña.

Luego en **SQL Editor**, inserta el doctor:
```sql
insert into doctors (user_id, nombre, apellidos, especialidad, email)
values (
  'UUID_DEL_USUARIO',  -- cópialo desde Authentication > Users
  'Juan',
  'Pérez García',
  'Medicina General',
  'doctor@clinica.com'
);
```

### 5. Correr en desarrollo
```bash
npm run dev
```

---

## Módulos actuales (Fase 1)
- ✅ Autenticación por doctor
- ✅ Dashboard con estadísticas y gráficas
- ✅ Gestión de pacientes
- ✅ Expediente clínico completo:
  - Signos vitales (IMC calculado automático)
  - Antecedentes (familiares, patológicos, gineco-obstétricos, etc.)
  - Medicamentos activos
  - Vacunas con alertas de próxima dosis
  - Historial de consultas con notas
  - Dietas y nutrición
- ✅ Agenda de citas

## Próximos módulos (Fase 2 y 3)
- 🔜 Videoconsultas (Daily.co)
- 🔜 Facturación CFDI (Facturama / SAT)
- 🔜 WhatsApp (Twilio)
- 🔜 Reportes y exportación PDF
- 🔜 Configuración de doctores y roles

---

## Deploy en Vercel
1. Sube el proyecto a GitHub
2. Importa en Vercel
3. Agrega las variables de entorno en Vercel > Settings > Environment Variables
4. Deploy automático en cada push a `main`
