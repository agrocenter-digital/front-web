"use client";
import { company } from "@/lib/company";
import InquiryForm from "./InquiryForm";

export default function Contact() {
  return (
    <section className="contact-section shell section" id="contacto">
      <div>
        <span className="eyebrow">Contacto</span>
        <h2>Conversemos sobre tu campo.</h2>
        <p>
          Envíanos tu consulta. La guardaremos junto con tu correo de contacto y
          recibirás un comprobante en pantalla.
        </p>
        {company.email && (
          <a href={`mailto:${company.email}`}>{company.email}</a>
        )}
        {company.phone && <p>{company.phone}</p>}
        {company.address && <p>{company.address}</p>}
      </div>
      <div className="contact-draft">
        <InquiryForm />
      </div>
    </section>
  );
}
