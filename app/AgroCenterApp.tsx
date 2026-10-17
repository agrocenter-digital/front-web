"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleUserRound,
  CreditCard,
  Leaf,
  Menu,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CatalogItem, canBuy } from "@/lib/catalog";
import { company } from "@/lib/company";
import { demoFallback } from "@/lib/demo-catalog";
import ProductAction from "./components/ProductAction";
import Contact from "./components/Contact";
import { useScrollReveal } from "./components/useScrollReveal";
import QuoteDialog from "./components/QuoteDialog";
import ProductCard, { Product } from "./components/ProductCard";
import {
  AuthSession,
  beginCognitoSignIn,
  cognitoIsConfigured,
  completeCognitoSignIn,
  createDemoSession,
  isUserAdmin,
  readAuthSession,
  signOut,
} from "@/lib/cognito";
import { apiRequest } from "@/lib/api";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function AgroCenterApp() {
  const pathname = usePathname();
  useScrollReveal(pathname);
  const router = useRouter();
  const isWholesale = pathname === "/productos/mayoristas";
  const isCatalog = pathname.startsWith("/productos");
  const [quote, setQuote] = useState<{
    product: Product;
    quantity: number;
  } | null>(null);
  const closeQuote = useCallback(() => setQuote(null), []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [sort, setSort] = useState("featured");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [toast, setToast] = useState("");

  // Estado del catálogo dinámico proveniente del BFF (fuente de datos única)
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [reload, setReload] = useState(0);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);

  useEffect(() => {
    if (!mobileOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [mobileOpen]);

  useEffect(() => {
    completeCognitoSignIn()
      .then((completed) => {
        const active = completed ?? readAuthSession();
        if (active) {
          setSession(active);
          setAuthError("");
        }
      })
      .catch((error: unknown) => {
        const active = readAuthSession();
        if (active) {
          setSession(active);
          setAuthError("");
        } else {
          setAuthError(
            error instanceof Error
              ? error.message
              : "No fue posible iniciar sesión.",
          );
        }
      });
  }, []);

  // Catálogo real; la sustitución de prueba solo se permite en desarrollo y ante un error.
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    apiRequest<CatalogItem[]>("/api/bff/catalogo", {
      signal: controller.signal,
    })
      .then((items) => {
        if (!Array.isArray(items))
          throw new Error("Respuesta de catálogo inválida.");
        setCatalog(
          items
            .filter((p) => p.activo !== false)
            .map((p) => {
              const categoria = p.categoria?.trim() || "Sin categoría";
              const esMaquinaria = categoria.toLowerCase() === "maquinaria";
              return {
                id: p.id,
                name: p.nombre,
                category: categoria,
                price:
                  typeof p.precioVenta === "number" &&
                  Number.isFinite(p.precioVenta)
                    ? p.precioVenta
                    : null,
                unit: p.presentacion || "Unidad",
                stock: p.stockActual,
                description: p.descripcion || "",
                image: p.imagenUrl?.startsWith("https://")
                  ? p.imagenUrl
                  : "/product-placeholder.svg",
                sku: p.sku,
                // La maquinaria se atiende como venta mayorista/cotización, aunque el
                // backend solo marque por SKU los productos de cotización.
                quoteOnly: p.soloCotizacion === true || esMaquinaria,
              };
            }),
        );
        setCatalogError("");
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setCatalog(demoFallback(process.env.NODE_ENV));
        setCatalogError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catálogo.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!disposed) setIsLoadingCatalog(false);
      });
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [session, reload]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const modeCatalog = useMemo(
    () =>
      catalog.filter((product) =>
        isWholesale ? product.quoteOnly : !product.quoteOnly,
      ),
    [catalog, isWholesale],
  );

  const categoryOptions = useMemo(
    () =>
      [...new Set(modeCatalog.map((p) => p.category))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [modeCatalog],
  );

  useEffect(() => {
    const revealHash = () => {
      const id = window.location.hash.slice(1);
      if (id)
        requestAnimationFrame(() =>
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
        );
    };
    revealHash();
    const navigate = (event: MouseEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!anchor) return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || url.pathname !== pathname)
        return;
      if (url.hash) {
        event.preventDefault();
        window.history.pushState(
          null,
          "",
          url.pathname + url.search + url.hash,
        );
        revealHash();
      } else if (url.pathname === "/") {
        event.preventDefault();
        window.history.pushState(null, "", "/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    document.addEventListener("click", navigate);
    window.addEventListener("hashchange", revealHash);
    return () => {
      document.removeEventListener("click", navigate);
      window.removeEventListener("hashchange", revealHash);
    };
  }, [pathname]);

  useEffect(() => {
    const openQuote = (event: Event) => {
      const detail = (
        event as CustomEvent<{ product: Product; quantity: number }>
      ).detail;
      setSelectedProduct(null);
      setQuote(detail);
    };
    window.addEventListener("agrocenter:quote", openQuote);
    return () => window.removeEventListener("agrocenter:quote", openQuote);
  }, []);

  useEffect(() => {
    const sync = () =>
      setCategory(
        new URLSearchParams(window.location.search).get("categoria") || "Todas",
      );
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [pathname]);

  useEffect(() => {
    const panel = document.querySelector<HTMLElement>(
      ".modal-backdrop section, .cart-drawer",
    );
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]',
        ),
      );
    focusable()[0]?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedProduct(null);
        setCartOpen(false);
        setCheckoutOpen(false);
        setAccountOpen(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [selectedProduct, cartOpen, checkoutOpen, accountOpen, orderPlaced]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = modeCatalog.filter((product) => {
      const matchesSearch =
        !normalized ||
        `${product.name} ${product.sku} ${product.category} ${product.description}`
          .toLowerCase()
          .includes(normalized);
      return (
        matchesSearch && (category === "Todas" || product.category === category)
      );
    });
    return [...filtered].sort((a, b) => {
      if (a.price === null) return b.price === null ? 0 : 1;
      if (b.price === null) return -1;
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return a.name.localeCompare(b.name, "es");
    });
  }, [modeCatalog, category, query, sort]);

  const cartItems = useMemo(
    () =>
      catalog
        .filter((product) => cart[product.id] && !product.quoteOnly)
        .map((product) => ({ ...product, quantity: cart[product.id] })),
    [catalog, cart],
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.quantity,
    0,
  );

  function addToCart(product: Product, quantity = 1) {
    if (!canBuy(product, (cart[product.id] ?? 0) + quantity)) {
      setToast(
        "La cantidad supera el stock disponible o el producto requiere cotización.",
      );
      return;
    }
    setCart((current) => ({
      ...current,
      [product.id]: (current[product.id] ?? 0) + quantity,
    }));
    setToast(product.name + " se agregó al carrito.");
  }

  function changeQuantity(id: number, delta: number) {
    setCart((current) => {
      const nextQuantity = (current[id] ?? 0) + delta;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      const product = catalog.find((item) => item.id === id);
      if (!product || !canBuy(product, nextQuantity)) return current;
      return { ...current, [id]: nextQuantity };
    });
  }

  function chooseCategory(nextCategory: string) {
    setCategory(nextCategory);
    setMobileOpen(false);
    const base = isWholesale ? "/productos/mayoristas" : "/productos";
    const url =
      nextCategory === "Todas"
        ? base
        : base + "?categoria=" + encodeURIComponent(nextCategory);
    if (isCatalog) window.history.pushState(null, "", url);
    else router.push(url);
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cartItems.some((item) => item.demo || item.id < 0)) {
      setCheckoutOpen(false);
      setToast("Prueba completada: no se creó una venta ni se descontó inventario.");
      return;
    }

    if (!session) {
      setCheckoutOpen(false);
      setAuthError(
        "Debes iniciar sesión con AgroCenter para completar la compra.",
      );
      setAccountOpen(true);
      return;
    }

    if (
      isSubmittingOrder ||
      cartItems.length === 0 ||
      cartItems.some((item) => !canBuy(item, item.quantity))
    ) {
      setToast("Revisa el carrito y la disponibilidad antes de continuar.");
      return;
    }

    // Contrato exigido por el BFF: POST /api/bff/ventas
    const payload = {
      items: cartItems.map((item) => ({
        productoId: item.id,
        cantidad: item.quantity,
      })),
    };

    setIsSubmittingOrder(true);
    try {
      await apiRequest("/api/bff/ventas", {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });

      setOrderPlaced(true);
      setCart({});
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "No fue posible procesar la orden en el servidor.",
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  return (
    <div className="storefront corporate">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="promo-bar">
        <p>
          <Sprout size={14} /> Conectados con el campo
        </p>
      </div>
      <header className="store-header">
        <div className="header-main shell">
          <Link className="store-logo" href="/" aria-label="Agrocenter inicio">
            <span>
              <Leaf size={25} />
            </span>
            <strong>
              Agrocenter<small>Crecer desde la tierra</small>
            </strong>
          </Link>
          <nav
            id="principal"
            className={mobileOpen ? "corporate-nav open" : "corporate-nav"}
            aria-label="Navegación principal"
          >
            {[
              { label: "Inicio", href: "/" },
              { label: "Nosotros", href: "/#nosotros" },
              { label: "Productos", href: "/productos" },
              { label: "Soluciones agrícolas", href: "/productos" },
              { label: "Mayoristas", href: "/productos/mayoristas" },
              { label: "Contacto", href: "/#contacto" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-controls">
            <button
              className="account-control"
              type="button"
              onClick={() => setAccountOpen(true)}
              aria-label="Mi cuenta"
            >
              <CircleUserRound size={21} />
              <span>{session ? session.name.split(" ")[0] : "Mi cuenta"}</span>
            </button>
            {isUserAdmin(session) && (
              <Link href="/admin" className="admin-link">
                Admin
              </Link>
            )}
            <button
              className="cart-button"
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={"Carrito con " + cartCount + " productos"}
            >
              <ShoppingCart size={20} />
              <span>{cartCount}</span>
            </button>
            <button
              className="menu-toggle"
              type="button"
              aria-controls="principal"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMobileOpen(!mobileOpen)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setMobileOpen(false);
              }}
            >
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="contenido">
        {!isCatalog && (
          <>
            <section className="corporate-hero" id="inicio">
              <div className="shell hero-layout">
                <div className="corporate-hero-copy">
                  <span className="hero-kicker">
                    <Sprout size={15} /> Una mirada hacia el campo
                  </span>
                  <h1>
                    La tierra nos une.
                    <br />
                    <em>El futuro nos mueve.</em>
                  </h1>
                  <p>
                    Conoce Agrocenter: una plataforma agrícola pensada para
                    conectar las necesidades de tu campo con nuevas
                    posibilidades.
                  </p>
                  <div className="hero-actions">
                    <Link className="solid-cta" href="/productos">
                      Conoce nuestros productos <ArrowRight size={17} />
                    </Link>
                    <a className="outline-cta" href="#contacto">
                      Contáctanos ↗
                    </a>
                  </div>
                  <div className="hero-caption">
                    <span>AGROCENTER</span>
                    <span>Personas, productos y campo.</span>
                  </div>
                </div>
                <div
                  className="hero-photograph"
                  role="img"
                  aria-label="Espigas de trigo en un campo"
                >
                  <span>Todo empieza en la tierra.</span>
                </div>
              </div>
            </section>
            <section id="nosotros" className="section shell about-section">
              <div>
                <span className="eyebrow">Nosotros</span>
                <h2>
                  Una visión compartida.
                  <br />
                  Un campo de posibilidades.
                </h2>
              </div>
              <div>
                <span className="editorial-note">
                  Presentación provisional · Proyecto universitario
                </span>
                <p>{company.about}</p>
                <p>{company.purpose}</p>
                <a className="text-link" href="#soluciones">
                  Conoce nuestra propuesta <ArrowRight size={17} />
                </a>
              </div>
            </section>
          </>
        )}
        <section
          className="section products-section shell"
          id="productos"
          aria-busy={isLoadingCatalog}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                {isCatalog
                  ? isWholesale
                    ? "Productos / Mayoristas"
                    : "Productos"
                  : "Una selección del catálogo"}
              </span>
              {isCatalog ? (
                <h1>
                  {isWholesale
                    ? "Mayoristas y maquinaria"
                    : "Productos para tu campo"}
                </h1>
              ) : (
                <h2>Descubre nuestro catálogo</h2>
              )}
            </div>
            {!isCatalog && (
              <Link className="solid-cta" href="/productos">
                Ver catálogo completo <ArrowRight size={17} />
              </Link>
            )}
          </div>
          {isCatalog && (
            <>
              <nav
                className="catalog-modes"
                aria-label="Modalidad de productos"
              >
                <Link
                  href="/productos"
                  aria-current={!isWholesale ? "page" : undefined}
                >
                  Productos
                </Link>
                <Link
                  href="/productos/mayoristas"
                  aria-current={isWholesale ? "page" : undefined}
                >
                  Mayoristas y maquinaria
                </Link>
              </nav>
              <p className="catalog-intro">
                {isWholesale
                  ? "Selecciona un producto para solicitar una cotización y contactar con Agrocenter."
                  : "Explora por categoría y agrega los productos disponibles a tu carrito."}
              </p>
              <nav
                className="filter-chips category-secondary"
                aria-label="Categorías de productos"
              >
                {["Todas", ...categoryOptions].map((item) => (
                  <button
                    type="button"
                    className={category === item ? "active" : ""}
                    aria-pressed={category === item}
                    onClick={() => chooseCategory(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </nav>
              <div className="catalog-toolbar">
                <label className="catalog-search">
                  <Search size={19} />
                  <input
                    aria-label="Buscar por nombre, SKU o descripción"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar productos o SKU…"
                  />
                </label>
                <p role="status">{visibleProducts.length} productos</p>
                <label>
                  Ordenar
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="featured">Nombre A–Z</option>
                    <option value="price-low">Menor precio</option>
                    <option value="price-high">Mayor precio</option>
                  </select>
                </label>
              </div>
            </>
          )}
          {catalog.some((product) => product.demo) && (
            <div className="demo-catalog-notice" role="status">
              <strong>Catálogo de demostración</strong>
              <p>El catálogo real no responde. Estos productos, precios y cantidades son ficticios. Puedes probar el carrito y las cotizaciones sin crear compras.</p>
              <Link className="text-link" href="/productos/mayoristas">Probar mayoristas y maquinaria →</Link>
            </div>
          )}
          <div className="product-grid">
            {(isCatalog ? visibleProducts : catalog.slice(0, 4)).map(
              (product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  saved={wishlist.includes(product.id)}
                  onSave={() =>
                    setWishlist((current) =>
                      current.includes(product.id)
                        ? current.filter((id) => id !== product.id)
                        : [...current, product.id],
                    )
                  }
                  onSelect={() =>
                    product.quoteOnly
                      ? setQuote({ product, quantity: 1 })
                      : setSelectedProduct(product)
                  }
                  onAdd={(quantity) => addToCart(product, quantity)}
                />
              ),
            )}
          </div>
          {isLoadingCatalog && (
            <div className="empty-products" role="status">
              Cargando catálogo…
            </div>
          )}
          {catalogError && !catalog.some((product) => product.demo) && (
            <div className="empty-products" role="alert">
              <h3>No pudimos actualizar el catálogo</h3>
              <p>{catalogError}</p>
              <button
                type="button"
                onClick={() => {
                  setIsLoadingCatalog(true);
                  setReload((value) => value + 1);
                }}
              >
                Reintentar
              </button>
            </div>
          )}
          {catalogError && catalog.some((product) => product.demo) && (
            <button className="outline-cta" type="button" onClick={() => { setIsLoadingCatalog(true); setReload((value) => value + 1); }}>Reintentar catálogo real</button>
          )}
          {!isLoadingCatalog &&
            !catalogError &&
            (isCatalog ? visibleProducts : catalog).length === 0 && (
              <div className="empty-products">
                <Search />
                <h3>
                  {modeCatalog.length
                    ? "No encontramos coincidencias"
                    : "Aún no hay productos publicados"}
                </h3>
                <p>
                  {modeCatalog.length
                    ? "Prueba otra búsqueda o categoría."
                    : "Vuelve a consultar el catálogo más adelante."}
                </p>
                {modeCatalog.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      chooseCategory("Todas");
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
        </section>
        {!isCatalog && (
            <section id="soluciones" className="section shell">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Soluciones agrícolas</span>
                  <h2>Cada proyecto, una forma de avanzar.</h2>
                </div>
              </div>
              <div className="solutions-access">
                <Image className="solutions-landscape" src="/tractor-campo.jpg" alt="Tractor trabajando la tierra en un campo agrícola" width={1920} height={1280} sizes="(max-width: 600px) 100vw, (max-width: 1280px) 90vw, 1170px" />
                <p>
                  Encuentra los productos que necesitas para tu campo. Para
                  pedidos por mayor y maquinaria, selecciona un producto y
                  conversemos sobre tu cotización.
                </p>
                <div className="contact-actions">
                  <Link className="solid-cta" href="/productos">
                    Ver productos <ArrowRight size={17} />
                  </Link>
                  <Link className="outline-cta" href="/productos/mayoristas">
                    Ver mayoristas y maquinaria <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </section>
        )}
        <Contact />
      </main>
      <footer className="store-footer">
        <div className="shell footer-grid">
          <div>
            <Link className="store-logo footer-logo" href="/">
              <span>
                <Leaf size={25} />
              </span>
              <strong>
                Agrocenter<small>Crecer desde la tierra</small>
              </strong>
            </Link>
            <p>
              Personas, productos y campo.
              <br />
              Una propuesta para seguir creciendo.
            </p>
          </div>
          <div>
            <h3>Explora</h3>
            <Link href="/">Inicio</Link>
            <Link href="/#nosotros">Nosotros</Link>
            <Link href="/productos">Productos</Link>
          </div>
          <div>
            <h3>Conversemos</h3>
            <Link href="/productos">Soluciones agrícolas</Link>
            <Link href="/productos/mayoristas">Mayoristas y maquinaria</Link>
            <a href="#contacto">Contacto y cotizaciones</a>
            <button type="button" onClick={() => setAccountOpen(true)}>
              Mi cuenta
            </button>
          </div>
          <div>
            <h3>Contacto</h3>
            {company.email ? (
              <a href={"mailto:" + company.email}>{company.email}</a>
            ) : (
              <p>Canales comerciales por confirmar.</p>
            )}
            {company.phone && <p>{company.phone}</p>}
            {company.address && <p>{company.address}</p>}
          </div>
        </div>
        <div className="shell footer-bottom">
          <p>
            © {new Date().getFullYear()} Agrocenter · Proyecto universitario
          </p>
          <span>Contenido institucional provisional</span>
        </div>
      </footer>

      {quote && (
        <QuoteDialog
          key={quote.product.sku}
          product={quote.product}
          initialQuantity={quote.quantity}
          onClose={closeQuote}
        />
      )}
      {cartOpen && (
        <>
          <button
            className="drawer-overlay"
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Cerrar carrito"
          />
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
          >
            <div className="drawer-head">
              <div>
                <span>Tu compra</span>
                <h2>Carrito ({cartCount})</h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                aria-label="Cerrar carrito"
              >
                <X />
              </button>
            </div>
            {cartItems.length ? (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <Image
                        src={item.image}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                      />
                      <div>
                        <b>{item.name}</b>
                        <small>{item.unit}</small>
                        <div className="quantity-control">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, -1)}
                            aria-label="Quitar una unidad"
                          >
                            <Minus size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.id, 1)}
                            aria-label="Agregar una unidad"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <strong>
                        {money.format((item.price ?? 0) * item.quantity)}
                      </strong>
                    </article>
                  ))}
                </div>
                <div className="cart-summary">
                  <p>
                    <span>Subtotal</span>
                    <b>{money.format(subtotal)}</b>
                  </p>
                  <p>
                    <span>Despacho</span>
                    <small>Coordinación pendiente</small>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false);
                      if (cartItems.some((item) => item.demo || item.id < 0)) {
                        setToast("Prueba completada: no se creó una venta ni se descontó inventario.");
                        return;
                      }
                      setOrderPlaced(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    {cartItems.some((item) => item.demo) ? "Simular compra" : "Continuar compra"} <ArrowRight size={16} />
                  </button>
                  <span>
                    <ShieldCheck size={15} /> Revisa tus productos antes de
                    confirmar
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-cart">
                <ShoppingCart />
                <h3>Tu carrito está vacío</h3>
                <p>Explora el catálogo y agrega lo que necesita tu campo.</p>
                <button type="button" onClick={() => setCartOpen(false)}>
                  Ver productos
                </button>
              </div>
            )}
          </aside>
        </>
      )}

      {selectedProduct && (
        <div className="modal-backdrop">
          <section
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedProduct.name}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setSelectedProduct(null)}
              aria-label="Cerrar detalle"
            >
              <X />
            </button>
            <div className="modal-product-image">
              <Image
                src={selectedProduct.image}
                alt={selectedProduct.name}
                width={600}
                height={500}
                unoptimized
              />
            </div>
            <div className="modal-product-copy">
              <span className="eyebrow">{selectedProduct.category}</span>
              <h2>{selectedProduct.name}</h2>
              <p>
                {selectedProduct.description ||
                  "Descripción pendiente de publicación."}
              </p>
              <p>
                SKU {selectedProduct.sku} · {selectedProduct.unit}
              </p>
              <p>
                {selectedProduct.quoteOnly
                  ? "Venta por cotización"
                  : selectedProduct.stock + " unidades disponibles"}
              </p>
              <div className="modal-price">
                <strong>
                  {selectedProduct.quoteOnly
                    ? "Precio a cotizar"
                    : selectedProduct.price === null
                      ? "Precio no disponible"
                      : money.format(selectedProduct.price)}
                </strong>
              </div>
              <ProductAction
                key={selectedProduct.id}
                product={selectedProduct}
                onQuote={() => setSelectedProduct(null)}
                onAdd={(quantity) => addToCart(selectedProduct, quantity)}
              />
              {selectedProduct.quoteOnly && (
                <button
                  className="text-link"
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    document.querySelector("#contacto")?.scrollIntoView();
                  }}
                >
                  Ir a contacto
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {checkoutOpen && (
        <div className="modal-backdrop">
          <section
            className="checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmación de compra"
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => {
                setCheckoutOpen(false);
                setOrderPlaced(false);
              }}
              aria-label="Cerrar checkout"
            >
              <X />
            </button>
            {orderPlaced ? (
              <div className="success-state">
                <span>
                  <Check />
                </span>
                <p>Solicitud recibida</p>
                <h2>¡Gracias por comprar en AgroCenter!</h2>
                <p>
                  Tu orden ha sido registrada en el sistema de ventas con éxito.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutOpen(false);
                    setOrderPlaced(false);
                  }}
                >
                  Volver a la tienda
                </button>
              </div>
            ) : (
              <>
                <div className="checkout-head">
                  <span>Último paso</span>
                  <h2>Confirmar solicitud</h2>
                  <p>
                    Revisa tus productos antes de confirmar. La coordinación de
                    entrega y pago queda pendiente.
                  </p>
                </div>
                <form onSubmit={submitCheckout}>
                  <div className="payment-demo">
                    <CreditCard />
                    <div>
                      <b>Pago en la siguiente etapa</b>
                      <p>
                        Se registrará tu solicitud de compra. No se realiza un
                        cobro en línea.
                      </p>
                    </div>
                  </div>
                  <div className="checkout-total">
                    <span>Total productos</span>
                    <strong>{money.format(subtotal)}</strong>
                  </div>
                  <button
                    className="primary-modal-action"
                    type="submit"
                    disabled={isSubmittingOrder}
                  >
                    <BadgeCheck size={18} />{" "}
                    {isSubmittingOrder
                      ? "Procesando orden..."
                      : "Confirmar solicitud"}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {accountOpen && (
        <div className="modal-backdrop">
          <section
            className="small-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Mi cuenta"
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setAccountOpen(false)}
              aria-label="Cerrar cuenta"
            >
              <X />
            </button>
            <span className="modal-symbol">
              <CircleUserRound />
            </span>
            {session ? (
              <>
                <p>Mi cuenta</p>
                <h2>Hola, {session.name}</h2>
                <small>
                  {session.demo ? "Sesión de demostración" : session.role}
                </small>
                <button
                  className="primary-modal-action"
                  type="button"
                  onClick={() => {
                    signOut();
                    setSession(null);
                    setAccountOpen(false);
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <p>Clientes AgroCenter</p>
                <h2>Ingresa a tu cuenta</h2>
                <small>
                  Revisa compras, guarda productos y agiliza tus próximos
                  pedidos.
                </small>
                {authError && <div className="form-error">{authError}</div>}
                <button
                  className="primary-modal-action"
                  type="button"
                  disabled={!cognitoIsConfigured() && process.env.NODE_ENV !== "development"}
                  onClick={() => {
                    setAuthError("");
                    if (cognitoIsConfigured())
                      beginCognitoSignIn().catch((error: unknown) =>
                        setAuthError(
                          error instanceof Error
                            ? error.message
                            : "No fue posible conectar.",
                        ),
                      );
                    else setSession(createDemoSession());
                  }}
                >
                  {cognitoIsConfigured()
                    ? "Ingresar con AgroCenter"
                    : process.env.NODE_ENV === "development"
                      ? "Entrar en modo demo"
                      : "Inicio de sesión no configurado"}
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> {toast}
        </div>
      )}
    </div>
  );
}

