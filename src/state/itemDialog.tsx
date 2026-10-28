import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { ItemDetailDialog } from '@/components/wardrobe/ItemDetailDialog'
import { useApp } from './AppProvider'

const ItemDialogContext = createContext<((id: string) => void) | null>(null)

/** Lets any screen (stylist, studio, calendar…) open a wardrobe item's details. */
export function ItemDialogProvider({ children }: { children: ReactNode }) {
  const { items } = useApp()
  const [openId, setOpenId] = useState<string | null>(null)
  const open = useCallback((id: string) => setOpenId(id), [])
  const item = openId ? items.find((i) => i.id === openId) ?? null : null
  return (
    <ItemDialogContext.Provider value={open}>
      {children}
      <ItemDetailDialog item={item} onClose={() => setOpenId(null)} />
    </ItemDialogContext.Provider>
  )
}

export function useOpenItem() {
  const ctx = useContext(ItemDialogContext)
  if (!ctx) throw new Error('useOpenItem must be used inside ItemDialogProvider')
  return ctx
}
