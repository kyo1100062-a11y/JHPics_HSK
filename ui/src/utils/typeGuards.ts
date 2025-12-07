import { TemplateType } from '../stores/editorStore'

/**
 * 타입 가드: TemplateType인지 확인
 */
export function isTemplateType(value: string | null): value is TemplateType {
  if (!value) return false
  
  const validTemplates: TemplateType[] = [
    'twoCut-portrait',
    'twoCut-landscape',
    'fourCut-portrait',
    'fourCut-landscape',
    'sixCut-portrait',
    'sixCut-landscape',
    'custom-portrait',
    'custom-landscape'
  ]
  
  return validTemplates.includes(value as TemplateType)
}

/**
 * 타입 가드: 유효한 이미지 파일인지 확인
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 15 * 1024 * 1024 // 15MB
  
  if (!validTypes.includes(file.type)) {
    return false
  }
  
  if (file.size > maxSize) {
    return false
  }
  
  return true
}

/**
 * 타입 가드: Blob URL인지 확인
 */
export function isBlobUrl(url: string | undefined): boolean {
  return url !== undefined && url.startsWith('blob:')
}

