/**
 * File System Access API를 사용한 파일 저장 유틸리티
 * IndexedDB를 사용하여 디렉토리 핸들을 영구 저장
 */

const DB_NAME = 'jh-pics-fs'
const DB_VERSION = 1
const STORE_NAME = 'directory-handles'

// IndexedDB에서 디렉토리 핸들을 저장/로드하는 유틸리티
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * 디렉토리 선택 및 IndexedDB에 저장
 */
export async function selectDirectory(): Promise<FileSystemDirectoryHandle | null> {
  // File System Access API 지원 확인
  if (!('showDirectoryPicker' in window)) {
    alert('이 브라우저는 디렉토리 선택 기능을 지원하지 않습니다.\nChrome 또는 Edge 브라우저를 사용해주세요.')
    return null
  }

  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite'
    })
    
    // IndexedDB에 저장 (키: 'export-directory')
    try {
      const db = await getDB()
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      await new Promise<void>((resolve, reject) => {
        const request = store.put(directoryHandle, 'export-directory')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn('디렉토리 핸들 저장 실패:', error)
      // 저장 실패해도 계속 진행
    }
    
    return directoryHandle
  } catch (error: any) {
    // 사용자가 취소한 경우
    if (error.name === 'AbortError') {
      return null
    }
    console.error('디렉토리 선택 실패:', error)
    alert('디렉토리 선택에 실패했습니다.')
    return null
  }
}

/**
 * 저장된 디렉토리 핸들 가져오기 (IndexedDB에서)
 */
export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    
    return new Promise((resolve, reject) => {
      const request = store.get('export-directory')
      request.onsuccess = () => {
        const handle = request.result as FileSystemDirectoryHandle | undefined
        resolve(handle || null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('저장된 디렉토리 핸들 로드 실패:', error)
    return null
  }
}

/**
 * 권한 확인 및 디렉토리 핸들 검증
 */
export async function verifyDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // 권한 확인
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') {
      return true
    }
    
    // 권한 요청
    if (permission === 'prompt') {
      const newPermission = await handle.requestPermission({ mode: 'readwrite' })
      return newPermission === 'granted'
    }
    
    return false
  } catch (error) {
    console.error('디렉토리 권한 확인 실패:', error)
    return false
  }
}

/**
 * 선택한 디렉토리에 파일 저장
 */
export async function saveFileToDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  fileData: Blob
): Promise<boolean> {
  try {
    // 권한 확인
    const hasPermission = await verifyDirectoryHandle(directoryHandle)
    if (!hasPermission) {
      console.error('디렉토리 접근 권한이 없습니다.')
      return false
    }

    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(fileData)
    await writable.close()
    return true
  } catch (error) {
    console.error('파일 저장 실패:', error)
    return false
  }
}

/**
 * 저장된 디렉토리 핸들 초기화
 */
export async function clearSavedDirectoryHandle(): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.delete('export-directory')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('디렉토리 핸들 삭제 실패:', error)
  }
}

