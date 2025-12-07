import { create } from 'zustand'
import { logger } from '../utils/logger'

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
  fitMode?: 'fill' | 'cover' // 'fill': 전체 표시 (왜곡 허용), 'cover': 비율 유지 (일부 잘림)
}

export interface PageMetadata {
  title: string
  projectName: string
  subProjectName: string
  manager: string
}

export interface TitleStyle {
  align: 'left' | 'center' | 'right'
  fontFamily: string
  fontSize: number
  bold: boolean
}

export interface EditorPage {
  id: string
  metadata: PageMetadata
  titleStyle: TitleStyle
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
  updateTitleStyle: (pageId: string, titleStyle: Partial<TitleStyle>) => void
  updateSlot: (pageId: string, slotId: string, updates: Partial<ImageSlot>) => void
  setSlotImage: (pageId: string, slotId: string, file: File, url: string) => void
  removeSlotImage: (pageId: string, slotId: string) => void
  addSlot: (pageId: string) => void // 커스텀 템플릿용 슬롯 추가
  removeSlot: (pageId: string, slotId: string) => void // 커스텀 템플릿용 슬롯 삭제
  reset: () => void
}

// 현재 제목 스타일을 기반으로 초기값 설정
const getDefaultTitleStyle = (): TitleStyle => {
  // 현재 MetadataArea에서 사용하는 기본 스타일
  // fontSize: 1.2em (기본 16px 기준으로 약 19.2px)
  // align: 'left' (text-left)
  // fontFamily: 기본 시스템 폰트 (sans-serif)
  // bold: false (기본값)
  return {
    align: 'left',
    fontFamily: 'sans-serif',
    fontSize: 19, // 1.2em 기준으로 계산 (16px * 1.2 ≈ 19px)
    bold: false
  }
}

const createDefaultPage = (): EditorPage => ({
  id: `page-${Date.now()}-${Math.random()}`,
  metadata: {
    title: '현장확인 사진',
    projectName: '',
    subProjectName: '',
    manager: ''
  },
  titleStyle: getDefaultTitleStyle(),
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
    rotation: 0,
    fitMode: 'fill' as const // 기본값: 전체 표시 (왜곡 허용)
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
    logger.log('[제목 스타일] 초기값:', initialPage.titleStyle)
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
      titleStyle: { ...currentPage.titleStyle }, // 직전 페이지 제목 스타일 복사
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

  updateTitleStyle: (pageId, titleStyle) => {
    const { pages } = get()
    set({
      pages: pages.map((p) =>
        p.id === pageId 
          ? { ...p, titleStyle: { ...p.titleStyle, ...titleStyle } } 
          : p
      )
    })
    // 변경 로그 출력
    const updatedPage = pages.find((p) => p.id === pageId)
    if (updatedPage) {
      logger.log('[제목 스타일] 변경됨:', { ...updatedPage.titleStyle, ...titleStyle })
    }
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
      description: undefined,
      fitMode: 'fill' // 이미지 삭제 시 기본값으로 리셋
    })
  },

  addSlot: (pageId) => {
    const { pages, template } = get()
    const page = pages.find((p) => p.id === pageId)
    if (!page) return

    // 커스텀 템플릿만 슬롯 추가 가능
    if (template !== 'custom-portrait' && template !== 'custom-landscape') {
      return
    }

    // 최대 16개 슬롯 제한
    if (page.slots.length >= 16) {
      alert('최대 16개 슬롯까지 추가할 수 있습니다')
      return
    }

    // 새 슬롯 생성
    const newSlot: ImageSlot = {
      id: `slot-${Date.now()}-${Math.random()}`,
      scale: 1,
      rotation: 0,
      fitMode: 'fill' // 기본값: 전체 표시 (왜곡 허용)
    }

    set({
      pages: pages.map((p) =>
        p.id === pageId ? { ...p, slots: [...p.slots, newSlot] } : p
      )
    })
  },

  removeSlot: (pageId, slotId) => {
    const { pages } = get()
    const page = pages.find((p) => p.id === pageId)
    if (!page) return

    // 삭제할 슬롯 찾기
    const slotToRemove = page.slots.find((s) => s.id === slotId)
    if (slotToRemove?.imageUrl && slotToRemove.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(slotToRemove.imageUrl)
    }

    set({
      pages: pages.map((p) =>
        p.id === pageId
          ? { ...p, slots: p.slots.filter((s) => s.id !== slotId) }
          : p
      )
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

