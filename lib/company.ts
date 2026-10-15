// Contenido provisional editable: validar con Agrocenter antes de publicar.
export const company = {
  about:
    "Agrocenter es un proyecto universitario de plataforma agrícola que conecta la exploración de insumos con la gestión de compras, ventas e inventario.",
  purpose:
    "Nuestra propuesta es facilitar el acceso a información clara sobre productos y acompañar distintas necesidades de abastecimiento del campo.",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || "",
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS?.trim() || "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "",
};
