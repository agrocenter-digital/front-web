# AgroCenter Digital — Frontend Web (`front-web`), test

Aplicación web React / Next.js para la plataforma **AgroCenter Digital**, optimizada para la experiencia de clientes y administradores en la gestión de compras, ventas, inventario y catálogo.

---

## 1. Entorno de Producción y Alojamiento

* **URL de Producción (Vercel)**: [`https://front-web-seven.vercel.app`](https://front-web-seven.vercel.app/)
* **Integración CI/CD**:
  - **Vercel Git Integration**: Cada `git push` a la rama `main` dispara automáticamente la optimización y el despliegue a la red global de Vercel.
  - **GitHub Actions (`.github/workflows/deploy.yml`)**: Construye en paralelo la imagen Docker multi-etapa y la sube al repositorio Docker Hub como `agrocenter-frontend:latest`.

---

## 2. Autenticación y Flujo de Sesión

La aplicación utiliza **AWS Cognito** con autenticación segura:
* **Protocolo**: OAuth 2.0 Authorization Code con **PKCE** (Proof Key for Code Exchange).
* **Proveedores de Identidad**: Soporta autenticación nativa de Cognito y federación con **Google**.
* **Manejo de Tokens en Cliente (`lib/api.ts`)**:
  - El cliente HTTP prioriza estrictamente el **`accessToken`** sobre el `idToken` para comunicarse con las APIs del backend.
  - Los endpoints protegidos viajan con la cabecera estándar:
    ```http
    Authorization: Bearer <accessToken>
    ```
  - Los roles y permisos (`ROLE_CLIENTE`, `ROLE_ADMIN`) son interpretados automáticamente por el backend a partir de los claims (`cognito:groups`).
* **Modo Demostración**: Si no se configuran variables de Cognito, la interfaz ofrece un modo de prueba local en memoria para evaluar componentes visuales sin dependencias de red.

---

## 3. Variables de Entorno

Crear un archivo `.env.local` basado en `.env.example`:

| Variable | Descripción | Ejemplo / Producción |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | URL del BFF o API Gateway | `https://...amazonaws.com` o `http://localhost:8080` |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | Dominio Hosted UI de AWS Cognito | `https://tu-dominio.auth.us-east-1.amazoncognito.com` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | App Client ID de Cognito (público) | `tu_app_client_id` |
| `NEXT_PUBLIC_COGNITO_REDIRECT_URI`| Callback de redirección tras login | `https://front-web-seven.vercel.app` o `http://localhost:3000` |

---

## 4. Ejecución Local

### Requisitos
* Node.js `>=22.13.0` (para ejecutar los tests TypeScript con Node, usar 22.18+ o 24 LTS)
* npm `>=10.x`

### Comandos de Desarrollo
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```
La aplicación iniciará en `http://localhost:3000`.

### Verificación y Calidad
```bash
# Validar compilación de producción
npm run build

# Ejecutar suite de pruebas
npm test
```

## 6. Portada corporativa y modalidades de compra

La aplicación conserva Next.js App Router, Cognito/PKCE, el cliente HTTP y los
endpoints del BFF. `/` presenta la identidad institucional; `/productos` contiene
el catálogo, búsqueda por nombre/SKU/descripción, ordenamiento y categorías
obtenidas de `GET /api/bff/catalogo`. No existe un endpoint de categorías separado:
se deducen exclusivamente de los productos devueltos, sin listas ficticias.
`/admin` conserva sus módulos y autorización. Los anclajes `/#nosotros`,
`/#soluciones` y `/#contacto` completan la navegación. El contenedor público
compartido conserva carrito y favoritos en memoria al navegar entre las rutas públicas;
una recarga o salida hacia administración reinicia ese estado, como estado local.

**Minorista:** el cliente elige unidades enteras, limitadas al stock. El carrito
envía `POST /api/bff/ventas` con `items: [{ productoId, cantidad }]`, token y clave
de idempotencia. Ventas sigue calculando precios y validando/descontando stock.
La confirmación registra una solicitud: no integra pagos ni persiste dirección.
Se retiró el formulario anterior de entrega porque sus datos nunca se enviaban
al backend. No se presenta una promesa de pago, despacho o garantía inexistente.

**Cotización (actualizado el 11 de octubre):** `/productos/mayoristas` muestra
exclusivamente `soloCotizacion: true`; `/productos` muestra los minoristas.
Seleccionar la imagen/nombre de un mayorista o pulsar “Contactar y cotizar” abre
una ventana con producto, SKU, presentación y cantidad editable. El formulario
envía una consulta al servidor y muestra un comprobante solo después de guardarla.
WhatsApp es una alternativa cuando existe número comercial válido. No se simulan
envíos, no se crea una venta ni se mueve stock. Se retiró “Descargar consulta”.

El navbar navega a Inicio, Nosotros, Productos, Soluciones agrícolas (catálogo),
Mayoristas y Contacto. Los anclajes funcionan también con el contenedor persistente
y entre rutas. Se retiraron todos los prefijos numéricos de secciones y categorías.

### Guardado de consultas

`POST /api/consultas` es un Route Handler de Next (Node), independiente de los
contratos de ventas/compras del BFF. Recibe `{ name, email, message }`, valida
campos y tamaño, y escribe un archivo JSON privado por UUID con fecha y estado.
No publica un GET de consultas ni expone correos en el catálogo.

En `npm run dev`, la carpeta predeterminada es `front-web/.data/consultas`;
permanece en disco tras reiniciar y está excluida de Git y Docker. Los archivos
pueden revisarse localmente por su comprobante. No existe aún una bandeja web
administrativa ni notificaciones de correo: “recibida” significa guardada.

En producción se requiere `CONTACT_STORAGE_DIR`, variable **solo servidor** con
ruta absoluta a un volumen privado persistente y escribible por Node. Docker:
montar el volumen y pasar la variable al iniciar el contenedor (no al build).
Todas las réplicas deben compartir el almacenamiento. En Vercel, el filesystem
efímero no sirve como bandeja durable: antes de publicar este flujo se debe adaptar
`saveInquiry` a una base de datos/servicio persistente. No apuntar a `/tmp` para
simular persistencia. Sin configuración o con error de escritura, devuelve 503 y
la interfaz informa el fallo conservando el mensaje; nunca confirma un guardado
que no se completó.

### Configuración pública

Agregar a `.env.local` (ver `.env.example`), sin inventar datos:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número comercial internacional de 8–15 dígitos, sin espacios; admite `+` inicial. Vacío desactiva WhatsApp. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Correo comercial aprobado, opcional. |
| `NEXT_PUBLIC_CONTACT_PHONE` | Teléfono visible, opcional. |
| `NEXT_PUBLIC_CONTACT_ADDRESS` | Dirección visible, opcional. |

Estas variables son públicas y se incorporan **durante el build**. Configurarlas
en Vercel antes de reconstruir. En Docker pasarlas como `--build-arg`; se añadieron
los argumentos correspondientes sin cambiar los argumentos previos de API/Cognito.
No colocar secretos en variables `NEXT_PUBLIC_*`. No se publican redes sociales
porque no hay cuentas verificadas. El contenido institucional provisional se edita
en `lib/company.ts` y se identifica como proyecto universitario en pantalla.

### Contrato mínimo compatible y despliegue

El inventario original no tiene modalidad de compra, imagen ni presentación.
Se añadió un campo **de respuesta** `soloCotizacion` sin migraciones de BD:
`ms-inventario` lo calcula mediante `CATALOG_QUOTE_ONLY_SKUS`, una lista de SKU
reales separados por comas, aprobada por el responsable del catálogo. Coincidencia
exacta sin distinguir mayúsculas; no se clasifica por nombre, categoría o precio.
Vacío conserva el comportamiento minorista existente. **Se deben incluir todos
los SKU mayoristas/maquinaria que no deban permitir checkout antes de publicarlos.**

El BFF propaga el campo y `ms-ventas` rechaza productos cotizables con HTTP 400 y
código `PRODUCTO_SOLO_COTIZACION` antes de crear la venta o descontar existencias.
Los constructores Java anteriores y JSON sin el campo siguen siendo compatibles.
Desplegar primero ventas y BFF compatibles, luego inventario con la lista aprobada,
y finalmente frontend. Todas las réplicas de inventario deben usar la misma lista.
Una versión antigua de inventario conserva venta minorista: no habilitar productos
cotizables hasta completar ese despliegue. No se modifican compras ni las reglas
de stock. A futuro puede persistirse un campo comercial administrable; no se ha
creado un mantenimiento ficticio en el panel.

`imagenUrl` (HTTPS autorizado) y `presentacion` son extensiones opcionales que la
UI acepta, pero el backend actual todavía no las emite. Mientras tanto se utiliza
un SVG original neutro con “Imagen pendiente” y la unidad genérica; no se infieren
fotografías ni variantes del nombre del producto. La portada muestra como máximo
cuatro productos reales como selección editorial, sin inventar popularidad.

### Componentes y recursos

- `app/AgroCenterApp.tsx`: navegación, portada, catálogo, sesión, carrito y modales.
- `app/components/PublicShell.tsx`: persistencia del estado entre rutas públicas.
- `app/components/ProductCard.tsx`: ficha, disponibilidad y favoritos.
- `app/components/ProductAction.tsx`: cantidades y separación comprar/cotizar.
- `app/components/Contact.tsx`: sección de contacto y formulario de envío.
- `app/components/InquiryForm.tsx`: formulario compartido, validación y comprobante.
- `app/components/QuoteDialog.tsx`: ventana de contacto por producto y cantidad.
- `app/api/consultas/route.ts`, `lib/inquiries.ts`: validación y guardado privado.
- `lib/catalog.ts`: validaciones y generación segura del mensaje/enlace.
- `lib/company.ts`: textos provisionales y contactos configurables.
- `app/corporate.css`: tokens agrícolas, responsive, foco visible y estilos.
- `public/product-placeholder.svg`: recurso original, sin imágenes de terceros.

La fotografía agrícola del hero usa el recurso Unsplash ya presente en el proyecto:
`https://images.unsplash.com/photo-1500937386664-56d1dfef3854`, solicitado a 1100 px
con formato automático y calidad 80. Uso bajo la [licencia Unsplash](https://unsplash.com/license)
(consultada el 8 de octubre de 2026), que permite uso comercial/no comercial.
No representa instalaciones ni personal de Agrocenter. Los fondos antiguos sin
uso se conservan en el CSS heredado para evitar cambios ajenos al rediseño.
La organización de [Anagra](https://www.anagra.cl/Home) sirvió de referencia para
navegación, información institucional, líneas y contacto; no se copió su contenido.

### Verificación y QA local

```powershell
npm ci
npm run lint
npm run typecheck
npm run build
npm run start
# En otra terminal, para incluir pruebas HTTP de rutas:
$env:TEST_BASE_URL='http://localhost:3000'
npm test
```

`typecheck` y el build verifican el código Next; `worker/`, `vite.config.ts`,
`db/index.ts` y `examples/` son material heredado de Cloudflare/Vinext sin las
dependencias correspondientes en este package.json. Permanecen en el repositorio,
excluidos únicamente de la revisión de tipos de Next. La compilación ya no omite
errores TypeScript. La opción heredada de omitir lint dentro del build se mantiene;
lint debe ejecutarse por separado.

Para QA visual **sin servicios reales**, arrancar `node tests/fixture-server.mjs`
y, en otra terminal, establecer `NEXT_PUBLIC_API_BASE_URL=http://localhost:4010`
antes de `npm run dev -- --port 3001`. Las fixtures están rotuladas QA, solo admiten
GET y rechazan transacciones. No configurar esa URL en producción ni durante su
build. Detener los procesos al terminar. No ejecutar `next dev` y `next build`
simultáneamente: comparten `.next`.

Las pruebas unitarias cubren cantidades inválidas, stock, exclusión de cotizables,
mensajes con caracteres especiales y números ausentes/incorrectos. La prueba HTTP
comprueba portada y rutas; se omite explícitamente si no hay `TEST_BASE_URL`.
Las suites Java se ejecutan con `./mvnw test` (Windows: `.\mvnw.cmd test`) desde cada
servicio. Ver `VERIFICACION.md` para resultados y limitaciones de esta entrega.

---

## 5. Docker

El proyecto cuenta con un `Dockerfile` multi-stage optimizado sobre Alpine Linux con usuario no-root (`agrocenter`):

```bash
# Construir imagen local
docker build -t agrocenter-front-web:latest .

# Ejecutar contenedor
docker run -d --name agrocenter-front -p 3000:3000 agrocenter-front-web:latest
```

## Movimiento y paleta visual

La portada revela sus secciones desde izquierda y derecha mediante `IntersectionObserver`, sin dependencias nuevas. El contenido permanece visible sin JavaScript y respeta `prefers-reduced-motion`. Los colores se centralizan en `app/corporate.css`; la franja superior y el pie comparten el verde oscuro #006838, con texto blanco. El hero usa un verde pastel #E2F0DA; los acentos conservan #5FBA46 y #76C13C, sin amarillo. El fondo general combina un tono natural #F3F6F0 y degradados verdes suaves. La portada presenta una única selección de productos después de Nosotros, con acceso al catálogo completo; las categorías se conservan dentro del catálogo. Soluciones agrícolas utiliza una fotografía local HD (1920 px) con tamaños adaptables y carga diferida de Next Image.

Fotografía de tractor: Matt Jerome Connor, [Pexels](https://www.pexels.com/photo/farm-tractor-in-the-farm-land-14242147/), bajo [licencia Pexels](https://www.pexels.com/license/). Imagen ambiental de referencia; no representa maquinaria del inventario ni implica patrocinio del fabricante.


## Protección del panel administrativo

`/admin` no monta el panel hasta que el BFF autoriza la sesión mediante `GET /api/bff/admin/dashboard`. Sin sesión, en modo demo, ante un rechazo o si el servicio no está disponible, se bloquea el acceso. El rol guardado en el navegador no basta para autorizar. El BFF y los microservicios siguen siendo responsables de validar el JWT y los permisos en cada operación. La respuesta HTML de la ruta puede ser 200, pero solo contiene la pantalla de verificación; esto no concede acceso a los datos.

El modo demo solo se puede crear en desarrollo y no concede acceso administrativo. En producción, Cognito debe estar configurado para iniciar sesión. Estos cambios deben desplegarse en el frontend; verificar además en el entorno AWS que las APIs administrativas respondan 401 sin token y 403 con un usuario CLIENTE.

## Productos de prueba y WhatsApp

Al ejecutar `npm run dev`, si falla el catálogo o tarda más de 8 segundos, aparecen cuatro productos ficticios señalados como demostración. Una respuesta válida (incluso vacía) conserva los datos del backend. En producción nunca se activa este fallback. El botón Reintentar catálogo real permite recuperar los productos reales.

Los minoristas demo permiten agregar cantidades al carrito y Simular compra, sin enviar ventas ni descontar stock. Los mayoristas nunca pasan por carrito: Cotizar por WhatsApp abre `https://wa.me/?text=...` con un mensaje marcado DEMOSTRACIÓN, sin número preasignado; el usuario elige destinatario y decide si enviarlo. No se requiere una API para esta redirección.

Para productos reales, configurar `NEXT_PUBLIC_WHATSAPP_NUMBER` con el número comercial autorizado. Se abre un chat dirigido a ese número con producto, SKU, cantidad y presentación. Si falta el número, se mantiene el formulario de contacto. No hay envío automático ni integración de WhatsApp Cloud API; esta requeriría configuración de Meta y credenciales únicamente en el backend.
Las animaciones se repiten al bajar y subir: se reinician cuando la sección queda completamente fuera del área visible (con un margen de 32 px). Los elementos con foco permanecen visibles; la preferencia de movimiento reducido se respeta también si cambia durante la navegación.
