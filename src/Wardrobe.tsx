
import { useEffect, useState, type FormEvent } from 'react'
import {
  deleteClothingItem,
  getClothingItems,
  saveClothingItem,
  type ClothingCategory,
  type ClothingItem,
} from './lib/wardrobe'
import './Wardrobe.css'

const categories: ClothingCategory[] = [
  'Camisetas',
  'Camisas',
  'Pantalones',
  'Faldas',
  'Vestidos',
  'Jerseys',
  'Chaquetas',
  'Abrigos',
  'Calzado',
  'Accesorios',
  'Otros',
]

const seasons = ['Primavera', 'Verano', 'Otoño', 'Invierno', 'Todo el año']

function Wardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('Todas')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('Camisetas')
  const [color, setColor] = useState('')
  const [season, setSeason] = useState('Todo el año')
  const [photo, setPhoto] = useState<Blob | undefined>()
  const [photoPreview, setPhotoPreview] = useState('')

  useEffect(() => {
    let active = true

    getClothingItems()
      .then((storedItems) => {
        if (active) setItems(storedItems)
      })
      .catch(() => {
        if (active) setError('No se pudo cargar el armario.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('')
      return
    }

    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [photo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const item: ClothingItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      category,
      color: color.trim(),
      season,
      image: photo,
      createdAt: new Date().toISOString(),
    }

    try {
      await saveClothingItem(item)
      setItems((current) => [item, ...current])
      setName('')
      setColor('')
      setSeason('Todo el año')
      setPhoto(undefined)

      const input = document.getElementById('clothing-photo')
      if (input instanceof HTMLInputElement) input.value = ''
    } catch {
      setError('No se pudo guardar la prenda. Comprueba el espacio disponible.')
    }
  }

  async function handleDelete(id: string) {
    setError('')

    try {
      await deleteClothingItem(id)
      setItems((current) => current.filter((item) => item.id !== id))
    } catch {
      setError('No se pudo eliminar la prenda.')
    }
  }

  const visibleItems =
    filter === 'Todas'
      ? items
      : items.filter((item) => item.category === filter)

  return (
    <main className="wardrobe-page">
      <header className="wardrobe-header">
        <a className="brand" href="#inicio">
          <span className="brand-mark">S</span>
          <span>smart wardrobe</span>
        </a>
        <span className="wardrobe-caption">MI ESPACIO PERSONAL</span>
      </header>

      <section className="wardrobe-intro">
        <p className="eyebrow">TU ROPA, ORGANIZADA</p>
        <h1>Mi armario<span>.</span></h1>
        <p>Todo lo que tienes, en un solo lugar.</p>
      </section>

      <section className="wardrobe-layout">
        <aside className="add-panel">
          <h2>Añadir prenda</h2>
          <p className="panel-description">Registra una nueva pieza de tu armario.</p>

          <form onSubmit={handleSubmit} className="clothing-form">
            <label htmlFor="clothing-name">Nombre de la prenda</label>
            <input
              id="clothing-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Camiseta blanca básica"
              maxLength={80}
              required
            />

            <label htmlFor="clothing-category">Categoría</label>
            <select
              id="clothing-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as ClothingCategory)}
            >
              {categories.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <label htmlFor="clothing-color">Color</label>
            <input
              id="clothing-color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="Ej. Blanco"
              maxLength={40}
              required
            />

            <label htmlFor="clothing-season">Temporada</label>
            <select
              id="clothing-season"
              value={season}
              onChange={(event) => setSeason(event.target.value)}
            >
              {seasons.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <label htmlFor="clothing-photo">Fotografía (opcional)</label>
            <input
              id="clothing-photo"
              type="file"
              accept="image/*"
              onChange={(event) => setPhoto(event.target.files?.[0])}
            />

            {photoPreview && (
              <img className="photo-preview" src={photoPreview} alt="Vista previa de la prenda" />
            )}

            <button className="button button-primary submit-button" type="submit">
              Guardar prenda
            </button>
          </form>
        </aside>

        <section className="inventory-panel">
          <div className="inventory-heading">
            <div>
              <p className="eyebrow">TU COLECCIÓN</p>
              <h2>Prendas <span className="item-count">{items.length}</span></h2>
            </div>
            <label className="filter-control">
              <span>Filtrar</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="Todas">Todas</option>
                {categories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}

          {loading ? (
            <p className="empty-state">Cargando tu armario...</p>
          ) : visibleItems.length === 0 ? (
            <div className="empty-state">
              <span className="empty-symbol">＋</span>
              <h3>{items.length === 0 ? 'Tu armario empieza aquí' : 'No hay prendas en esta categoría'}</h3>
              <p>
                {items.length === 0
                  ? 'Añade tu primera prenda con el formulario.'
                  : 'Prueba con otra categoría.'}
              </p>
            </div>
          ) : (
            <div className="clothing-grid">
              {visibleItems.map((item) => (
                <article className="clothing-card" key={item.id}>
                  {item.image ? (
                    <img
                      className="clothing-image"
                      src={URL.createObjectURL(item.image)}
                      alt={item.name}
                    />
                  ) : (
                    <div className="clothing-placeholder">
                      <span>{item.category}</span>
                    </div>
                  )}

                  <div className="clothing-details">
                    <h3>{item.name}</h3>
                    <p>{item.color} · {item.season}</p>
                    <span className="category-tag">{item.category}</span>
                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      aria-label={`Eliminar ${item.name}`}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default Wardrobe
