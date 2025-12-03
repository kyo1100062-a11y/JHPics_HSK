import { create } from 'zustand'

interface ProjectStore {
  projectList: string[]
  appVersion: string
  addProject: (projectName: string) => void
  updateProject: (index: number, newName: string) => void
  deleteProject: (index: number) => void
  loadProjects: () => void
}

const STORAGE_KEY = 'jh-pics-storage'
const APP_VERSION = '1.0.0'

// LocalStorage에서 데이터 로드
const loadFromStorage = (): { projectList: string[]; appVersion: string } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      // 버전 체크 및 마이그레이션
      if (data.appVersion !== APP_VERSION) {
        // 버전이 다르면 초기화
        return { projectList: [], appVersion: APP_VERSION }
      }
      return {
        projectList: data.projectList || [],
        appVersion: data.appVersion || APP_VERSION
      }
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
  }
  return { projectList: [], appVersion: APP_VERSION }
}

// LocalStorage에 데이터 저장
const saveToStorage = (projectList: string[], appVersion: string) => {
  try {
    const data = {
      projectList,
      appVersion
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
    // LocalStorage 용량 초과 시 에러 처리
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('저장 공간 부족')
    }
  }
}

export const useProjectStore = create<ProjectStore>((set, get) => {
  // 초기 로드
  const { projectList, appVersion } = loadFromStorage()

  return {
    projectList,
    appVersion,

    addProject: (projectName: string) => {
      const trimmedName = projectName.trim()
      if (!trimmedName) {
        throw new Error('사업명을 입력해주세요')
      }

      const currentList = get().projectList
      if (currentList.includes(trimmedName)) {
        throw new Error('이미 존재하는 사업명입니다')
      }

      const newList = [...currentList, trimmedName]
      set({ projectList: newList })
      saveToStorage(newList, get().appVersion)
    },

    updateProject: (index: number, newName: string) => {
      const trimmedName = newName.trim()
      if (!trimmedName) {
        throw new Error('사업명을 입력해주세요')
      }

      const currentList = get().projectList
      if (currentList[index] === trimmedName) {
        return // 변경사항 없음
      }

      // 중복 체크 (현재 항목 제외)
      if (currentList.some((name, i) => i !== index && name === trimmedName)) {
        throw new Error('이미 존재하는 사업명입니다')
      }

      const newList = [...currentList]
      newList[index] = trimmedName
      set({ projectList: newList })
      saveToStorage(newList, get().appVersion)
    },

    deleteProject: (index: number) => {
      const currentList = get().projectList
      const newList = currentList.filter((_, i) => i !== index)
      set({ projectList: newList })
      saveToStorage(newList, get().appVersion)
    },

    loadProjects: () => {
      const { projectList, appVersion } = loadFromStorage()
      set({ projectList, appVersion })
    }
  }
})

