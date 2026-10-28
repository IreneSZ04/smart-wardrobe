
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'

import {
  createBackupJson,
  deleteClothingItem,
  getClothingItems,
  replaceWardrobeFromBackupJson,
  restoreBackupJson,
  saveClothingItem,
  type ClothingCategory,
  type ClothingItem,
} from './lib/wardrobe'

import './Wardrobe.css'

const CATEGORIES: ClothingCategory[] = [
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

const SEASONS = ['Primavera', 'Verano', 'Otoño', 'Invierno', 'Todo el año']

const EMPTY_FORM = {
  name: '',
  category: 'Camisetas' as ClothingCategory,
  color: '',
  season: 'Todo el año',
}

type ImportMode = 'merge' | 'replace'

function ClothingImage({ image, name }: { image?: Blob; name: string }) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    if (!image) {
      setImageUrl('')
      return
    }

    const url = URL.createObjectURL(image)
    setImageUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [image])

  if (!imageUrl) {
    return (
      <div className="clothing-image clothing-image-empty">
        Sin fotografía
      </div>
    )
  }

  return (
    <img
      className="clothing-image"
      src={imageUrl}
      alt={name}
    />
  )
}

export default function Wardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedImage, setSelectedImage] = useState<File | undefined>()
  const [editingId, setEditingId] = useState<string | null>(null)

  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [seasonFilter, setSeasonFilter] = useState('Todas')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function refreshItems() {
    const savedItems = await getClothingItems()
    setItems(
      savedItems.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      ),
    )
  }

  useEffect(() => {
    let active = true

    async function loadItems() {
      try {
        const savedItems = await getClothingItems()

        if (active) {
          setItems(
            savedItems.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
          )
        }
      } catch {
        if (active) {
          setError('No se ha podido cargar el armario.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadItems()

    return () => {
      active = false
    }
  }, [])

  function resetForm() {
    setForm(EMPTY_FORM)
    setSelectedImage(undefined)
    setEditingId(null)

    const fileInput = document.getElementById(
      'clothing-photo',
    ) as HTMLInputElement | null

    if (fileInput) fileInput.value = ''
  }

  function handleTextChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setSelectedImage(undefined)
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido.')
      event.target.value = ''
      setSelectedImage(undefined)
      return
    }

    setError('')
    setSelectedImage(file)
  }

  function startEditing(item: ClothingItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      category: item.category,
      color: item.color,
      season: item.season,
    })
    setSelectedImage(undefined)
    setError('')
    setNotice('')

    const fileInput = document.getElementById(
      'clothing-photo',
    ) as HTMLInputElement | null

    if (fileInput) fileInput.value = ''

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!form.name.trim()) {
      setError('Escribe el nombre de la prenda.')
      return
    }

    setSaving(true)

    try {
      const existingItem = editingId
        ? items.find((item) => item.id === editingId)
        : undefined

      const item: ClothingItem = {
        id: editingId ?? crypto.randomUUID(),
        name: form.name.trim(),
        category: form.category,
        color: form.color.trim(),
        season: form.season,
        createdAt: existingItem?.createdAt ?? new Date().toISOString(),
        ...(selectedImage
          ? { image: selectedImage }
          : existingItem?.image
            ? { image: existingItem.image }
            : {}),
      }

      await saveClothingItem(item)
      await refreshItems()

      setNotice(
        editingId
          ? 'Prenda actualizada correctamente.'
          : 'Prenda añadida al armario.',
      )

      resetForm()
    } catch {
      setError('No se ha podido guardar la prenda.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: ClothingItem) {
    const confirmed = window.confirm(
      `¿Quieres eliminar "${item.name}" del armario? Esta acción no se puede deshacer.`,
    )

    if (!confirmed) return

    setError('')
    setNotice('')

    try {
      await deleteClothingItem(item.id)
      await refreshItems()

      if (editingId === item.id) resetForm()

      setNotice('Prenda eliminada.')

    } catch {
      setError('No se ha podido eliminar la prenda.')
    }
  }

  async function handleExport() {
    setError('')
    setNotice('')
    setBackupBusy(true)

    try {
      const json = await createBackupJson()
      const blob = new Blob([json], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `smart-wardrobe-${new Date()
        .toISOString()
        .slice(0, 10)}.json`

      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      setNotice('Copia de seguridad exportada.')
    } catch {
      setError('No se ha podido exportar la copia de seguridad.')
    } finally {
      setBackupBusy(false)
    }
  }

  async function handleImport(
    event: ChangeEvent<HTMLInputElement>,
    mode: ImportMode,
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    setError('')
    setNotice('')

    const message =
      mode === 'replace'
        ? 'RESTAURACIÓN EXACTA: se eliminarán todas las prendas actuales que no estén en la copia. El armario quedará como estaba cuando se exportó el archivo. ¿Continuar?'
        : 'Se importarán las prendas del archivo. Las que tengan el mismo identificador se actualizarán y las demás se conservarán. ¿Continuar?'

    if (!window.confirm(message)) {
      event.target.value = ''
      return
    }

    setBackupBusy(true)

    try {
      const json = await file.text()

      const restoredCount =
        mode === 'replace'
          ? await replaceWardrobeFromBackupJson(json)
          : await restoreBackupJson(json)

      await refreshItems()
      resetForm()

      setNotice(
        mode === 'replace'
          ? `Armario restaurado exactamente. ${restoredCount} prendas recuperadas.`
          : `Copia fusionada. ${restoredCount} prendas importadas.`,
      )
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'No se ha podido importar la copia de seguridad.',
      )
    } finally {
      setBackupBusy(false)
      event.target.value = ''
    }
  }

  const visibleItems = items.filter((item) => {
    const matchesCategory =
      categoryFilter === 'Todas' || item.category === categoryFilter

    const matchesSeason =
      seasonFilter === 'Todas' || item.season === seasonFilter

    const searchText = search.trim().toLocaleLowerCase('es')

    const matchesSearch =
      !searchText ||
      item.name.toLocaleLowerCase('es').includes(searchText) ||
      item.color.toLocaleLowerCase('es').includes(searchText) ||
      item.category.toLocaleLowerCase('es').includes(searchText)

    return matchesCategory && matchesSeason && matchesSearch
  })

  return (
    <main className="wardrobe-page">
      <header className="wardrobe-header">
        <div>
          <p className="wardrobe-eyebrow">TU ESPACIO PERSONAL</p>
          <h1>Smart Wardrobe</h1>
          <p className="wardrobe-subtitle">
            Todo tu armario, organizado en un solo lugar.
          </p>
        </div>

        <div className="wardrobe-count">
          <span>Prendas</span>
          <strong>{items.length}</strong>
        </div>
      </header>

      {error && (
        <div className="wardrobe-message wardrobe-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="wardrobe-message wardrobe-notice" role="status">
          {notice}
        </div>
      )}

      <section className="wardrobe-section">
        <div className="section-heading">
          <div>
            <p className="wardrobe-eyebrow">
              {editingId ? 'MODIFICAR' : 'NUEVA PRENDA'}
            </p>
            <h2>{editingId ? 'Editar prenda' : 'Añadir al armario'}</h2>
          </div>
        </div>

        <form className="clothing-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="clothing-name">Nombre *</label>
            <input
              id="clothing-name"
              name="name"
              type="text"
              placeholder="Ej. Camiseta blanca básica"
              value={form.name}
              onChange={handleTextChange}
              maxLength={100}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="clothing-category">Categoría</label>
            <select
              id="clothing-category"
              name="category"
              value={form.category}
              onChange={handleTextChange}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="clothing-color">Color</label>
            <input
              id="clothing-color"
              name="color"
              type="text"
              placeholder="Ej. Negro"
              value={form.color}
              onChange={handleTextChange}
              maxLength={60}
            />
          </div>

          <div className="form-field">
            <label htmlFor="clothing-season">Temporada</label>
            <select
              id="clothing-season"
              name="season"
              value={form.season}
              onChange={handleTextChange}
            >
              {SEASONS.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="clothing-photo">
              Fotografía {editingId ? '(opcional si quieres conservar la actual)' : '(opcional)'}
            </label>
            <input
              id="clothing-photo"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {selectedImage && (
              <p className="form-help">
                Nueva fotografía: {selectedImage.name}
              </p>
            )}
          </div>

          <div className="form-actions form-field-full">
            <button
              className="button button-primary"
              type="submit"
              disabled={saving || loading}
            >
              {saving
                ? 'Guardando...'
                : editingId
                  ? 'Guardar cambios'
                  : 'Añadir prenda'}
            </button>

            {editingId && (
              <button
                className="button"
                type="button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="wardrobe-section">
        <div className="section-heading">
          <div>
            <p className="wardrobe-eyebrow">ORGANIZACIÓN</p>
            <h2>Mi armario</h2>
          </div>
          <span className="item-count">
            {visibleItems.length} de {items.length} prendas
          </span>
        </div>

        <div className="wardrobe-filters">
          <div className="form-field">
            <label htmlFor="wardrobe-search">Buscar</label>
            <input
              id="wardrobe-search"
              type="search"
              placeholder="Nombre, color o categoría"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="filter-category">Categoría</label>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="Todas">Todas las categorías</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="filter-season">Temporada</label>
            <select
              id="filter-season"
              value={seasonFilter}
              onChange={(event) => setSeasonFilter(event.target.value)}
            >
              <option value="Todas">Todas las temporadas</option>
              {SEASONS.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="wardrobe-empty">Cargando armario...</p>
        ) : visibleItems.length === 0 ? (
          <div className="wardrobe-empty">
            <h3>
              {items.length === 0
                ? 'Tu armario está vacío'
                : 'No hay prendas que coincidan'}
            </h3>
            <p>
              {items.length === 0
                ? 'Añade tu primera prenda con el formulario de arriba.'
                : 'Prueba con otra búsqueda o cambia los filtros.'}
            </p>
          </div>
        ) : (
          <div className="clothing-grid">
            {visibleItems.map((item) => (
              <article className="clothing-card" key={item.id}>
                <ClothingImage image={item.image} name={item.name} />

                <div className="clothing-card-content">
                  <span className="clothing-category">{item.category}</span>
                  <h3>{item.name}</h3>

                  {item.color && (
                    <p className="clothing-detail">
                      <span>Color</span>
                      {item.color}
                    </p>
                  )}

                  <p className="clothing-detail">
                    <span>Temporada</span>
                    {item.season}
                  </p>

                  <div className="clothing-card-actions">
                    <button
                      className="button"
                      type="button"
                      onClick={() => startEditing(item)}
                    >
                      Editar
                    </button>

                    <button
                      className="button button-danger"
                      type="button"
                      onClick={() => void handleDelete(item)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wardrobe-section backup-section">
        <div className="section-heading">
          <div>
            <p className="wardrobe-eyebrow">TUS DATOS</p>
            <h2>Copias de seguridad</h2>
          </div>
        </div>

        <p className="backup-description">
          Exporta el armario a un archivo JSON para guardarlo o recuperarlo
          más adelante. Las fotografías también se incluyen en la copia.
        </p>

        <div className="backup-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={() => void handleExport()}
            disabled={backupBusy || loading}
          >
            {backupBusy ? 'Procesando...' : 'Exportar copia'}
          </button>

          <label className="button backup-import-button">
            Fusionar copia
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => void handleImport(event, 'merge')}
              disabled={backupBusy || loading}
              hidden
            />
          </label>

          <label className="button backup-replace-button">
            Restaurar exactamente
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => void handleImport(event, 'replace')}
              disabled={backupBusy || loading}
              hidden
            />
          </label>
        </div>

        <p className="backup-help">
          <strong>Fusionar copia:</strong> conserva las prendas actuales que
          no estén en el archivo. Si una prenda comparte identificador con
          otra de la copia, se actualiza.
        </p>

        <p className="backup-help">
          <strong>Restaurar exactamente:</strong> sustituye el contenido
          actual por el de la copia. Las prendas añadidas después de exportar
          desaparecerán. Haz una copia antes de usar esta opción si quieres
          conservarlas.
        </p>
      </section>
    </main>
  )
}
