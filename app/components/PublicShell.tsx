"use client";
import { usePathname } from "next/navigation";
import AgroCenterApp from "../AgroCenterApp";
export default function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  return path === "/" ||
    path === "/productos" ||
    path === "/productos/mayoristas" ? (
    <AgroCenterApp />
  ) : (
    children
  );
}
