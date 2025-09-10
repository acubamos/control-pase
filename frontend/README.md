# Sistema de Gestión de Entradas Vehiculares

Sistema completo para el control de acceso vehicular con autenticación por roles, escaneo QR y captura de fotos.

## Características

- ✅ Autenticación JWT con 3 roles de usuario
- ✅ Escaneo de códigos QR para datos de CI
- ✅ Captura y upload de fotos
- ✅ Gestión completa de entradas vehiculares
- ✅ Exportación de datos
- ✅ Limpieza automática por roles

## Tecnologías

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, TypeORM, PostgreSQL, JWT
- **Base de datos**: PostgreSQL

## Instalación

### Backend
\`\`\`bash
cd api
npm install
npm run start:dev
\`\`\`

### Frontend
\`\`\`bash
npm install
npm run dev
\`\`\`

## Usuarios de Prueba

- **admin_diario** / admin123 (Sin acceso al historial)
- **admin_semanal** / admin456 (Con historial)
- **admin_anual** / admin789 (Todos los permisos)
