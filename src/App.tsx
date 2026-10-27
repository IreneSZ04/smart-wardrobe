
import './App.css'

function App() {
  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#inicio">
          <span className="brand-mark">S</span>
          <span>smart wardrobe</span>
        </a>

        <span className="topbar-label">TU ARMARIO, MEJOR PENSADO</span>
      </header>

      <section className="hero" id="inicio">
        <p className="eyebrow">TU ESPACIO PERSONAL</p>

        <h1>
          Menos dudas.
          <br />
          Más conjuntos.
        </h1>

        <p className="hero-description">
          Organiza lo que tienes, descubre nuevas combinaciones
          y compra pensando en todo tu armario.
        </p>

        <div className="hero-actions">
          <button className="button button-primary" type="button">
            Explorar mi armario
          </button>
          <button className="button button-secondary" type="button">
            Analizar una compra
          </button>
        </div>
      </section>

      <section className="features" aria-label="Funciones principales">
        <article className="feature-card">
          <span className="feature-number">01</span>
          <h2>Mi armario</h2>
          <p>Registra tus prendas y tenlas todas organizadas.</p>
        </article>

        <article className="feature-card">
          <span className="feature-number">02</span>
          <h2>Mis conjuntos</h2>
          <p>Guarda combinaciones para cada ocasión.</p>
        </article>

        <article className="feature-card">
          <span className="feature-number">03</span>
          <h2>Compra con cabeza</h2>
          <p>Comprueba qué aporta una prenda antes de comprarla.</p>
        </article>

        <article className="feature-card">
          <span className="feature-number">04</span>
          <h2>¿Qué me falta?</h2>
          <p>Encuentra prendas que encajen con lo que ya tienes.</p>
        </article>
      </section>

      <footer className="footer">
        SMART WARDROBE <span>·</span> TU ESTILO, TU CRITERIO
      </footer>
    </main>
  )
}

export default App
