# Nuvia — Sistema de Gestión Médica

Sistema de administración clínica para médicos y consultorios privados, construido con React + Supabase. Permite gestionar pacientes, consultas, recetas, inventario, agenda y punto de venta desde una sola plataforma web.

> **Demo en producción:** [nuvia-lovat.vercel.app](https://nuvia-lovat.vercel.app)

---

## Características principales

### Pacientes
- Expediente clínico completo por paciente
- Antecedentes, alergias, tipo de sangre, CURP
- Historial de consultas, vacunas, medicamentos, dieta y archivos adjuntos
- Mapa corporal interactivo para exploración topográfica

### Consultas
- Notas de padecimiento con editor de texto enriquecido (Tiptap)
- Signos vitales: peso, talla, temperatura, presión arterial, FC, SpO₂ con **cálculo automático de IMC**
- Diagnóstico con autocompletado CIE-10
- Solicitud de estudios de imagen (checklist de 20+ estudios)
- Receta médica con vía de administración por medicamento
- **Descanso médico** con constancia imprimible
- Próxima cita con sincronización automática a la Agenda
- Botón flotante "Imprimir receta" siempre visible sin necesidad de hacer scroll

### Documentos imprimibles (NOM-004-SSA3-2012)
- Receta médica
- Solicitud de estudios de imagen
- Constancia de descanso médico
- Todos incluyen: datos del médico, cédulas profesionales, dirección del consultorio, CURP del paciente y referencia normativa NOM

### Agenda
- Vista semanal/mensual de citas
- Videoconsultas integradas con Jitsi Meet
- Botón "Registrar consulta" directamente desde la videollamada

### Punto de Venta (unificado con Facturación)
- Cobro de consulta + venta de productos en una sola transacción ligada al paciente
- Historial unificado de ventas y cobros
- Filtros: todos / ventas / cobros / por cobrar / para contador
- Descarga CSV para el contador
- Pre-factura imprimible con datos fiscales
- Protección con PIN para editar/eliminar registros

### Inventario
- Catálogo de productos con stock, precio y categorías
- Descuento automático de stock al realizar una venta

### Configuración
- Perfil del médico con CURP
- **Cédulas profesionales dinámicas** — agrega N cédulas con descripción libre (Medicina General, Cardiología, Subespecialidad, etc.)
- Consultorios (múltiples, con dirección, ciudad y color identificador)
- Datos fiscales (RFC, razón social, régimen fiscal)
- PIN de acciones para proteger operaciones sensibles
- **Integraciones externas configurable desde el panel:**
  - Email (Resend / SendGrid / SMTP)
  - WhatsApp Business API
  - Pagos con tarjeta (Stripe)
  - Google Calendar
  - Supabase (para migraciones de proyecto)

---

## Cumplimiento normativo

| Norma | Descripción | Estado |
|---|---|---|
| NOM-004-SSA3-2012 | Expediente Clínico | ✅ |
| NOM-024-SSA3-2010 | Sistemas de Información en Salud | ✅ |

**Implementado:**
- Fecha y hora en cada nota de consulta
- Vía de administración en recetas médicas
- CURP del médico y del paciente en todos los documentos
- Dirección del consultorio en encabezados de impresión
- Cédulas profesionales en documentos y firma
- Bitácora de auditoría (`audit_log`) con RLS — registra creación y modificación de expedientes

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS |
| Estado global | Zustand |
| Routing | React Router DOM v6 |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Seguridad | Row Level Security (RLS) — datos aislados por médico |
| Editor de texto | Tiptap |
| Gráficas | Recharts |
| Íconos | Lucide React |
| Videollamadas | Jitsi Meet (iframe) |
| Deploy | Vercel (CI/CD automático desde GitHub) |

---

## Estructura del proyecto

```
src/
├── components/
│   ├── layout/          # Sidebar y layout principal
│   └── patients/        # ConsultationModal, tabs del expediente,
│                        # modales de impresión (receta, estudios, descanso)
├── pages/               # Una página por módulo
│   ├── DashboardPage.jsx
│   ├── PatientsPage.jsx
│   ├── AppointmentsPage.jsx
│   ├── ConsultationsVideoPage.jsx
│   ├── SalesPage.jsx        # Punto de venta + facturación unificados
│   ├── InventoryPage.jsx
│   ├── ReportsPage.jsx
│   ├── ConfigPage.jsx
│   └── LoginPage.jsx
├── store/               # Zustand (auth, patients, clinic, inventory)
├── lib/                 # Cliente Supabase
├── data/                # Catálogo CIE-10
└── utils/               # cn, calcIMC, clasificarIMC, calcEdad

supabase/
└── migrations/          # 23 migraciones numeradas secuencialmente
```

---

## Instalación local

### Requisitos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (plan gratuito funciona)

### 1. Clonar e instalar

```bash
git clone https://github.com/WalterDanielTorresMeza/nuvia.git
cd nuvia
npm install
```

### 2. Variables de entorno

Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Ejecutar migraciones en Supabase

Ve a **Supabase → SQL Editor** y ejecuta los archivos de `supabase/migrations/` en orden (001 → 023).

### 4. Crear el primer médico

En **Supabase → Authentication → Users**, crea un usuario con email y contraseña. Luego en SQL Editor:

```sql
INSERT INTO doctors (user_id, nombre, apellidos, especialidad, email)
VALUES (
  'UUID_DEL_USUARIO',   -- cópialo desde Authentication > Users
  'Juan',
  'Pérez García',
  'Medicina General',
  'doctor@clinica.com'
);
```

### 5. Levantar en desarrollo

```bash
npm run dev
```

---

## Deploy en Vercel

1. Sube el proyecto a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Agrega las variables de entorno en **Vercel → Settings → Environment Variables**
4. Cada push a `main` despliega automáticamente

---

## Migraciones de base de datos

| # | Descripción |
|---|---|
| 001 | Esquema inicial (doctors, patients, consultations, appointments) |
| 002–005 | Mejoras a consultas y campos clínicos |
| 006–008 | Tabla de consultorios (clinics) |
| 009 | Datos fiscales del médico |
| 010–015 | Inventario, ventas, estudios de imagen, RLS |
| 016–017 | Punto de venta y detalle de ítems |
| 018 | PIN de acciones protegidas |
| 019 | Signos vitales y descanso médico en consultas |
| 020 | Columna `integraciones` jsonb en doctors |
| 021 | Columnas `cedula_profesional` / `cedula_especialidad` |
| 022 | Cédulas como array dinámico (`cedulas` jsonb) |
| 023 | CURP del médico, `fecha_hora` en consultas, tabla `audit_log` (NOM-024) |

---

## Licencia

Uso privado — todos los derechos reservados © 2025 Walter Daniel Torres Meza.
