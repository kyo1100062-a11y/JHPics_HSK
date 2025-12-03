import { create } from 'zustand'

export type TemplateType = 
  | 'twoCut-portrait'
  | 'twoCut-landscape'
  | 'fourCut-portrait'
  | 'fourCut-landscape'
  | 'sixCut-portrait'
  | 'sixCut-landscape'
  | 'custom-portrait'
  | 'custom-landscape'

export interface ImageSlot {
  id: string
  imageUrl?: string
  imageFile?: File
  scale: number // 0.5 ~ 2.0
  rotation: number // 0, 90, 180, 270
  description?: string
}

export interface PageMetadata {
  title: string
  projectName: string
  subProjectName: string
  manager: string
}

export interface EditorPage {
  id: string
  metadata: PageMetadata
  slots: ImageSlot[]
}

interface EditorStore {
  template: TemplateType | null
  pages: EditorPage[]
  currentPageIndex: number
  setTemplate: (template: TemplateType) => void
  addPage: () => void
  deletePage: (pageId: string) => void
  setCurrentPage: (index: number) => void
  updatePageMetadata: (pageId: string, metadata: Partial<PageMetadata>) => void
  updateSlot: (pageId: string, slotId: string, updates: Partial<ImageSlot>) => void
  setSlotImage: (pageId: string, slotId: string, file: File, url: string) => void
  removeSlotImage: (pageId: string, slotId: string) => void
  reset: () => void
}

const createDefaultPage = (): EditorPage => ({
  id: `page-${Date.now()}-${Math.random()}`,
  metadata: {
    title: '현장확인 사진',
    projectName: '',
    subProjectName: '',
    manager: ''
  },
  slots: []
})

const createSlotsForTemplate = (template: TemplateType): ImageSlot[] => {
  const slotCounts: Record<TemplateType, number> = {
    'twoCut-portrait': 2,
    'twoCut-landscape': 2,
    'fourCut-portrait': 4,
    'fourCut-landscape': 4,
    'sixCut-portrait': 6,
    'sixCut-landscape': 6,
    'custom-portrait': 0,
    'custom-landscape': 0
  }

  const count = slotCounts[template] || 0
  return Array.from({ length: count }, (_, i) => ({
    id: `slot-${Date.now()}-${i}`,
    scale: 1,
    rotation: 0
  }))
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  template: null,
  pages: [],
  currentPageIndex: 0,

  setTemplate: (template) => {
    const slots = createSlotsForTemplate(template)
    const initialPage: EditorPage = {
      ...createDefaultPage(),
      slots
    }
    set({
      template,
      pages: [initialPage],
      currentPageIndex: 0
    })
  },

  addPage: () => {
    const { pages, currentPageIndex, template } = get()
    if (pages.length >= 10) {
      alert('최대 10페이지까지 생성 가능합니다')
      return
    }

    if (!template) {
      alert('템플릿이 설정되지 않았습니다')
      return
    }

    const currentPage = pages[currentPageIndex]
    const slots = createSlotsForTemplate(template)
    const newPage: EditorPage = {
      ...createDefaultPage(),
      metadata: { ...currentPage.metadata }, // 직전 페이지 메타데이터 복사
      slots // 템플릿에 맞는 슬롯 생성
    }
    set({
      pages: [...pages, newPage],
      currentPageIndex: pages.length
    })
  },

  deletePage: (pageId) => {
    const { pages } = get()
    if (pages.length <= 1) {
      alert('최소 1페이지는 유지해야 합니다')
      return
    }

    const newPages = pages.filter((p) => p.id !== pageId)
    const deletedIndex = pages.findIndex((p) => p.id === pageId)
    set({
      pages: newPages,
      currentPageIndex: Math.min(deletedIndex, newPages.length - 1)
    })
  },

  setCurrentPage: (index) => {
    set({ currentPageIndex: index })
  },

  updatePageMetadata: (pageId, metadata) => {
    const { pages } = get()
    set({
      pages: pages.map((p) =>
        p.id === pageId ? { ...p, metadata: { ...p.metadata, ...metadata } } : p
      )
    })
  },

  updateSlot: (pageId, slotId, updates) => {
    const { pages } = get()
    set({
      pages: pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              slots: p.slots.map((s) =>
                s.id === slotId ? { ...s, ...updates } : s
              )
            }
          : p
      )
    })
  },

  setSlotImage: (pageId, slotId, file, url) => {
    get().updateSlot(pageId, slotId, { imageFile: file, imageUrl: url })
  },

  removeSlotImage: (pageId, slotId) => {
    get().updateSlot(pageId, slotId, {
      imageUrl: undefined,
      imageFile: undefined,
      scale: 1,
      rotation: 0,
      description: undefined
    })
  },

  reset: () => {
    set({
      template: null,
      pages: [],
      currentPageIndex: 0
    })
  }
}))

