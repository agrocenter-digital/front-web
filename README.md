# AgroCenter Digital — Frontend MVP

Frontend React para centralizar compras, ventas, inventario y movimientos de stock de AgroCenter.

## Alcance del MVP

- Inicio y cierre de sesión con modo demostración funcional.
- Flujo OAuth 2.0 / OpenID Connect Authorization Code con PKCE preparado para AWS Cognito.
- Panel operativo con indicadores, alertas y actividad reciente.
- Consulta y filtrado de inventario por nombre, SKU o categoría.
- Registro de compras con incremento automático de existencias.
- Registro de ventas con validación previa de stock y descuento automático.
- Historial auditable de entradas y salidas.
- Diseño adaptable a escritorio, tablet y móvil.

Los datos del modo demostración viven en memoria y se reinician al recargar. Cuando exista el BFF, `lib/api.ts` permite consumirlo adjuntando el Access Token como Bearer Token.

## Ejecutar localmente

Requiere Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Configurar AWS Cognito y el BFF

1. Copia `.env.example` como `.env.local`.
2. Completa el dominio del Hosted UI, App Client ID, URI de redirección y URL del API Gateway/BFF.
3. Configura en Cognito el flujo Authorization Code, PKCE, scopes `openid email profile` y la misma URI de redirección.

Si Cognito no está configurado, la pantalla de acceso ofrece automáticamente el modo demostración.

## Verificación

```bash
npm run build
npm test
```

## Estructura principal

- `app/AgroCenterApp.tsx`: experiencia y estados del MVP.
- `app/globals.css`: sistema visual y comportamiento responsive.
- `lib/cognito.ts`: PKCE, intercambio de código, sesión y cierre local.
- `lib/api.ts`: cliente HTTP preparado para JWT Bearer.
- `.env.example`: variables de integración.
