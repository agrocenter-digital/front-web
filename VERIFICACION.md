# Verificación del rediseño — 8 de octubre de 2026

## Actualización del 11 de octubre de 2026

Esta revisión reemplaza el flujo anterior de descarga por envío y persistencia
local. Ocho tests frontend (incluyendo persistencia real en directorio temporal,
validación, rutas y rechazo de consultas inválidas) pasan con servidor activo.
Se comprobó en navegador el navbar, anclajes entre rutas, sector mayorista
exclusivo y selección que abre contacto. Cambiar cantidad conserva nombre/correo
y actualiza el mensaje. Con una consulta sintética de QA se comprobó HTTP 201,
comprobante visible y archivo JSON coincidente en `.data/consultas`.

El catálogo continúa dependiendo del BFF real; el recorrido de mayoristas se
probó con el servidor aislado de fixtures y luego se detuvo. No se inventaron
clasificaciones ni se configuró WhatsApp con un número ajeno. La persistencia
productiva requiere `CONTACT_STORAGE_DIR` sobre volumen durable; Vercel necesita
adaptar el almacenamiento a un servicio persistente. Ver README actualizado.

Los resultados siguientes son el registro de la entrega inicial del 8 de octubre;
las referencias a descarga corresponden a ese flujo anterior, ya reemplazado.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | Correcto, con validación TypeScript habilitada. `/`, `/productos` y `/admin` compiladas. |
| `npm run typecheck` | Correcto para el despliegue Next.js. |
| `npm test` con `TEST_BASE_URL` | 5 pruebas aprobadas, ninguna omitida. |
| ESLint de archivos nuevos/modificados | Correcto, sin errores ni advertencias. |
| `npm run lint` completo | 31 errores preexistentes en `app/admin/page.tsx`: imports/parámetros sin uso, `any` y etiquetas de formularios. Ese archivo no fue modificado. |
| BFF: Maven tests | 22 pruebas aprobadas. Incluye propagación del campo y compatibilidad cuando falta. |
| Inventario: Maven tests | 27 pruebas aprobadas (26 existentes + 1 clasificación explícita por SKU). |
| Ventas: Maven tests | 32 pruebas aprobadas. Incluye rechazo de cotizables antes de persistir o mover stock. |
| Compras: Maven tests | 17 pruebas aprobadas, sin cambios en el módulo. |

Los tests Maven incluyen seguridad/autorización, DTO, clientes y persistencia
con H2/configuración de pruebas según cada proyecto. El test nuevo de inventario
y el cliente BFF se ejecutaron también por separado tras completar sus cambios.
En total: 98 pruebas Java aprobadas. No se realizaron transacciones de producción.

## Revisión de navegador

- Escritorio 1440 px, tablet 768 px y celular 390 px: sin desbordamiento horizontal.
- Portada institucional antes del catálogo; bloques Nosotros, líneas, soluciones,
  selección de productos y contacto. Imagen agrícola cargada correctamente.
- Menú hamburguesa abre/cierra y permite navegar a Inicio. Escape cierra el menú
  y devuelve el foco al botón. Cuenta disponible también en celular.
- Con fixtures exclusivamente de QA: categorías obtenidas de la respuesta,
  filtro y URL `?categoria=…`, búsqueda y estado sin coincidencias.
- Compra minorista: dos unidades de un artículo de $1.500 producen subtotal
  $3.000; confirmación sin sesión deriva a inicio de sesión. Carrito conservado
  al navegar a Inicio. Producto sin stock muestra compra deshabilitada.
- Cotizable: no muestra botón de carrito; cantidad 8 prepara consulta con
  producto, SKU y cantidad cuando falta WhatsApp. No se envía ninguna venta.
- Sin API configurada: estado de error y botón Reintentar; no aparecen categorías
  ni productos ficticios para disimular el error.

El servidor `tests/fixture-server.mjs` es exclusivo de QA y rechaza transacciones.
Se detuvo tras revisar la interfaz; la compilación final no usa su URL.

## Límites y puesta en marcha pendiente

- No se verificó una sesión Cognito real ni un checkout contra AWS/RDS: no se
  proporcionaron variables del entorno integrado. Las rutas protegidas y sus
  permisos se comprobaron mediante las suites existentes del backend.
- No se envió ningún mensaje real a WhatsApp. La URL, codificación y validación
  del número se probaron automáticamente; el envío requiere el número comercial.
- Sin WhatsApp ni correo reales no existe un destinatario al que enviar: la
  alternativa funcional es preparar/descargar la consulta, claramente identificada
  como no enviada. Con correo configurado se habilita `mailto:`.
- Configurar la lista aprobada `CATALOG_QUOTE_ONLY_SKUS` y desplegar inventario,
  BFF y ventas compatibles. No inferir que una categoría determina la modalidad.
- Validar los textos institucionales y completar contactos antes de publicar.
  Las imágenes de productos y presentaciones requieren ampliar su contrato de
  catálogo; mientras tanto se usa un marcador original y no imágenes inventadas.
- Lint completo sigue pendiente por deuda previa de administración, informada
  arriba; no se deshabilitaron esas reglas para ocultarla.

Ver README para comandos, configuración Docker/Vercel y rutas/componentes.
