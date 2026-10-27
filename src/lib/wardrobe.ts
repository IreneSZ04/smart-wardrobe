
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

const DATABASE_NAME = 'smart-wardrobe'
const STORE_NAME = 'clothing'

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
