import { parseInquiry, saveInquiry } from "@/lib/inquiries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Formularios del propio sitio: no aceptar publicaciones desde otros orígenes.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ message: "Origen no permitido." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ message: "Formato no permitido." }, { status: 415 });
  let inquiry;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Consulta vacía.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 20000) {
        await reader.cancel();
        return Response.json(
          { message: "Consulta demasiado extensa." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    inquiry = parseInquiry(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof SyntaxError
            ? "Consulta inválida."
            : error instanceof Error
              ? error.message
              : "Consulta inválida.",
      },
      { status: 400 },
    );
  }
  try {
    const receipt = await saveInquiry(inquiry);
    return Response.json(receipt, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        message:
          "No pudimos guardar tu consulta. Inténtalo nuevamente o utiliza el contacto comercial.",
      },
      { status: 503 },
    );
  }
}
