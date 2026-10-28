
import { openDB } from 'idb'

export type ClothingCategory =
  | 'Camisetas'
  | 'Camisas'
  | 'Pantalones'
  | 'Faldas'
  | 'Vestidos'
  | 'Jerseys'
  | 'Chaquetas'
  | 'Abrigos'
  | 'Calzado'
  | 'Accesorios'
  | 'Otros'

export interface ClothingItem {
  id: string
  name: string
  category: ClothingCategory
  color: string
  season: string
  image?: Blob
  createdAt: string
}

interface BackupClothingItem {
  id: string
  name: string
  category: ClothingCategory
  color: string
  season: string
  image?: string
  createdAt: string
}

interface WardrobeBackup {
  app: 'smart-wardrobe'
  version: 1
  exportedAt: string
  items: BackupClothingItem[]
}

type ImportMode = 'merge' | 'replace'

const DATABASE_NAME = 'smart-wardrobe'
const STORE_NAME = 'clothing'

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

const database = openDB(DATABASE_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
  },
})

export async function getClothingItems(): Promise<ClothingItem[]> {
  const db = await database
  return db.getAll(STORE_NAME)
}

export async function saveClothingItem(item: ClothingItem): Promise<void> {
  const db = await database
  await db.put(STORE_NAME, item)
}

export async function deleteClothingItem(id: string): Promise<void> {
  const db = await database
  await db.delete(STORE_NAME, id)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('No se pudo leer una fotografía.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error al leer una fotografía.'))
    }

    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(dataUrl)) {
    throw new Error('La copia contiene una fotografía no válida.')
  }

  const response = await fetch(dataUrl)

  if (!response.ok) {
    throw new Error('No se pudo recuperar una fotografía.')
  }

  return response.blob()
}

export async function createBackupJson(): Promise<string> {
  const items = await getClothingItems()

  const backupItems: BackupClothingItem[] = await Promise.all(
    items.map(async (item) => {
      const backupItem: BackupClothingItem = {
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.color,
        season: item.season,
        createdAt: item.createdAt,
      }

      if (item.image) {
        backupItem.image = await blobToDataUrl(item.image)
      }

      return backupItem
    }),
  )

  const backup: WardrobeBackup = {
    app: 'smart-wardrobe',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: backupItems,
  }

  return JSON.stringify(backup, null, 2)
}

async function parseBackupJson(jsonText: string): Promise<ClothingItem[]> {
  let parsed: unknown

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('El archivo no contiene un JSON válido.')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('app' in parsed) ||
    !('version' in parsed) ||
    !('items' in parsed) ||
    parsed.app !== 'smart-wardrobe' ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.items)
  ) {
    throw new Error(
      'El archivo no es una copia de seguridad válida de Smart Wardrobe.',
    )
  }

  const backup = parsed as WardrobeBackup

  const restoredItems = await Promise.all(
    backup.items.map(async (item: BackupClothingItem) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof item.id !== 'string' ||
        !item.id.trim() ||
        typeof item.name !== 'string' ||
        !item.name.trim() ||
        typeof item.category !== 'string' ||
        !categories.includes(item.category) ||
        typeof item.color !== 'string' ||
        typeof item.season !== 'string' ||
        typeof item.createdAt !== 'string' ||
        (item.image !== undefined && typeof item.image !== 'string')
      ) {
        throw new Error(
          'La copia contiene una prenda con datos no válidos.',
        )
      }

      const restoredItem: ClothingItem = {
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.color,
        season: item.season,
        createdAt: item.createdAt,
      }

      if (item.image !== undefined) {
        restoredItem.image = await dataUrlToBlob(item.image)
      }

      return restoredItem
    }),
  )

  const ids = restoredItems.map((item) => item.id)

  if (new Set(ids).size !== ids.length) {
    throw new Error('La copia contiene identificadores duplicados.')
  }

  return restoredItems
}

async function importBackup(
  jsonText: string,
  mode: ImportMode,
): Promise<number> {
  // Validar toda la copia antes de tocar el armario actual.
  const restoredItems = await parseBackupJson(jsonText)
  const db = await database
  const transaction = db.transaction(STORE_NAME, 'readwrite')

  try {
    if (mode === 'replace') {
      await transaction.store.clear()
    }

    for (const item of restoredItems) {
      await transaction.store.put(item)
    }

    await transaction.done
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // La transacción puede haberse abortado ya.
    }

    throw error
  }

  return restoredItems.length
}

export async function restoreBackupJson(
  jsonText: string,
): Promise<number> {
  return importBackup(jsonText, 'merge')
}

export async function replaceWardrobeFromBackupJson(
  jsonText: string,
): Promise<number> {
  return importBackup(jsonText, 'replace')
}
