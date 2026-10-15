import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

export type Inquiry = { name: string; email: string; message: string };

export function parseInquiry(value: unknown): Inquiry {
  if (!value || typeof value !== "object")
    throw new Error("Consulta inválida.");
  const data = value as Record<string, unknown>;
  const field = (key: string) =>
    typeof data[key] === "string" ? data[key].trim() : "";
  const inquiry = {
    name: field("name"),
    email: field("email"),
    message: field("message"),
  };
  if (inquiry.name.length < 2 || inquiry.name.length > 120)
    throw new Error("Ingresa tu nombre (2 a 120 caracteres).");
  if (
    inquiry.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)
  )
    throw new Error("Ingresa un correo válido.");
  if (inquiry.message.length < 10 || inquiry.message.length > 4000)
    throw new Error("La consulta debe contener entre 10 y 4000 caracteres.");
  return inquiry;
}

export function inquiryDirectory() {
  const configured = process.env.CONTACT_STORAGE_DIR?.trim();
  if (configured) {
    if (!isAbsolute(configured))
      throw new Error("CONTACT_STORAGE_DIR debe ser una ruta absoluta.");
    return configured;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("El almacenamiento de consultas no está configurado.");
  return join(process.cwd(), ".data", "consultas");
}

export async function saveInquiry(
  inquiry: Inquiry,
  directory = inquiryDirectory(),
) {
  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "recibida",
    ...inquiry,
  };
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(
    join(directory, `${record.id}.json`),
    JSON.stringify(record, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  return { id: record.id, createdAt: record.createdAt };
}
