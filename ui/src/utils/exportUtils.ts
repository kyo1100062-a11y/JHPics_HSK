import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { saveFileToDirectory } from './fileSystemUtils'
import { TemplateType } from '../stores/editorStore'

interface ExportOptions {
  isHighQuality?: boolean
  onProgress?: (current: number, total: number) => void
  pagesMetadata?: Array<{ title: string; projectName: string; subProjectName: string }>
  directoryHandle?: FileSystemDirectoryHandle | null
  template?: TemplateType
}

/**
 * A4Canvas 요소를 캡처하여 PDF로 내보내기
 */
export async function exportToPDF(
  canvasElements: HTMLElement[],
  metadata: { title: string; projectName: string; subProjectName: string },
  options: ExportOptions = {}
): Promise<void> {
  const { isHighQuality = false, onProgress, directoryHandle, template } = options

  // 가로형 템플릿 여부 확인
  const isLandscape = template?.includes('-landscape') ?? false

  // A4 크기 (mm) - 가로형일 때는 297×210, 세로형일 때는 210×297
  const A4_WIDTH_MM = isLandscape ? 297 : 210
  const A4_HEIGHT_MM = isLandscape ? 210 : 297

  // 해상도 설정
  const dpi = isHighQuality ? 425 : 300
  const scale = isHighQuality ? 3.5 : 2.5

  // PDF 생성 - 가로형일 때는 landscape, 세로형일 때는 portrait
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // PDF 메타데이터 설정
  const title = metadata.title || '현장확인 사진'
  const projectName = metadata.projectName || ''
  const subProjectName = metadata.subProjectName || ''
  
  pdf.setProperties({
    title: `${title}${projectName ? ` - ${projectName}` : ''}`,
    subject: `보조사업자: ${subProjectName}`,
    author: metadata.subProjectName || '',
    creator: 'JH Pics'
  })

  const totalPages = canvasElements.length
  const failedPages: number[] = []

  // 각 페이지를 순차적으로 캡처
  for (let i = 0; i < canvasElements.length; i++) {
    try {
      if (onProgress) {
        onProgress(i + 1, totalPages)
      }

      const canvasElement = canvasElements[i]

      // UI 요소 숨기기
      const hiddenElements = hideUIElements(canvasElement)

      // 캔버스 캡처
      const canvas = await html2canvas(canvasElement, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: canvasElement.offsetWidth,
        height: canvasElement.offsetHeight
      })

      // UI 요소 복원
      restoreUIElements(hiddenElements)

      // A4 비율에 맞게 이미지 크기 조정
      // 가로형일 때는 캔버스가 가로로 길고, 세로형일 때는 세로로 길다
      // 캔버스 비율을 유지하면서 A4 크기에 맞춤
      const canvasAspectRatio = canvas.width / canvas.height
      const a4AspectRatio = A4_WIDTH_MM / A4_HEIGHT_MM
      
      let imgWidth: number
      let imgHeight: number
      
      if (canvasAspectRatio > a4AspectRatio) {
        // 캔버스가 더 가로로 길면 너비를 A4_WIDTH에 맞춤
        imgWidth = A4_WIDTH_MM
        imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width
      } else {
        // 캔버스가 더 세로로 길면 높이를 A4_HEIGHT에 맞춤
        imgHeight = A4_HEIGHT_MM
        imgWidth = (canvas.width * A4_HEIGHT_MM) / canvas.height
      }

      // PDF에 이미지 추가
      const imgData = canvas.toDataURL('image/jpeg', isHighQuality ? 0.9 : 0.7)

      if (i > 0) {
        pdf.addPage()
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)

      // 페이지 번호 추가 (2페이지 이상일 경우)
      if (totalPages > 1) {
        pdf.setFontSize(10)
        pdf.setTextColor(156, 163, 175) // Gray #9CA3AF
        const pageText = `${i + 1} / ${totalPages}`
        const textWidth = pdf.getTextWidth(pageText)
        // 가로형일 때는 하단 중앙에, 세로형일 때도 하단 중앙에 배치
        pdf.text(pageText, (A4_WIDTH_MM - textWidth) / 2, A4_HEIGHT_MM - 5)
      }

      // 캔버스 메모리 해제 (메모리 관리)
      canvas.width = 0
      canvas.height = 0
    } catch (error) {
      console.error(`페이지 ${i + 1} 캡처 실패:`, error)
      failedPages.push(i + 1)
    }
  }

  // 파일명 생성
  const fileName = generateFileName(metadata.title, metadata.projectName, metadata.subProjectName, 'pdf')

  // 디렉토리 핸들이 제공되면 해당 경로에 저장, 없으면 다운로드
  if (directoryHandle) {
    try {
      // PDF를 Blob으로 변환
      const pdfBlob = pdf.output('blob')
      const success = await saveFileToDirectory(directoryHandle, fileName, pdfBlob)
      if (success) {
        alert('PDF가 성공적으로 저장되었습니다.')
      } else {
        alert('PDF 저장에 실패했습니다. 다운로드로 대체합니다.')
        pdf.save(fileName)
      }
    } catch (error) {
      console.error('PDF 저장 실패:', error)
      alert('PDF 저장에 실패했습니다. 다운로드로 대체합니다.')
      pdf.save(fileName)
    }
  } else {
    // 기존 방식: 다운로드
    pdf.save(fileName)
  }

  if (failedPages.length > 0) {
    alert(`일부 페이지(${failedPages.join(', ')})의 캡처에 실패했습니다.`)
  }
}

/**
 * A4Canvas 요소를 캡처하여 JPEG로 내보내기
 */
export async function exportToJPEG(
  canvasElements: HTMLElement[],
  metadata: { title: string; projectName: string; subProjectName: string },
  options: ExportOptions = {}
): Promise<void> {
  const { isHighQuality = false, onProgress, pagesMetadata, directoryHandle } = options

  const scale = isHighQuality ? 3.5 : 2.5
  const quality = isHighQuality ? 0.9 : 0.7

  const totalPages = canvasElements.length
  const failedPages: number[] = []

  // 각 페이지를 순차적으로 캡처
  for (let i = 0; i < canvasElements.length; i++) {
    try {
      if (onProgress) {
        onProgress(i + 1, totalPages)
      }

      const canvasElement = canvasElements[i]

      // UI 요소 숨기기
      const hiddenElements = hideUIElements(canvasElement)

      // 캔버스 캡처
      const canvas = await html2canvas(canvasElement, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: canvasElement.offsetWidth,
        height: canvasElement.offsetHeight
      })

      // UI 요소 복원
      restoreUIElements(hiddenElements)

      // JPEG로 변환 및 다운로드
      const imgData = canvas.toDataURL('image/jpeg', quality)
      
      // 각 페이지별 메타데이터가 있으면 사용, 없으면 기본 메타데이터 사용
      const pageMetadata = pagesMetadata && pagesMetadata[i] ? pagesMetadata[i] : metadata
      const fileName = generateFileName(
        pageMetadata.title,
        pageMetadata.projectName,
        pageMetadata.subProjectName,
        'jpg',
        i + 1,
        totalPages
      )

      // 디렉토리 핸들이 제공되면 해당 경로에 저장, 없으면 다운로드
      const { directoryHandle } = options
      if (directoryHandle) {
        try {
          // Data URL을 Blob으로 변환
          const response = await fetch(imgData)
          const blob = await response.blob()
          const success = await saveFileToDirectory(directoryHandle, fileName, blob)
          if (!success) {
            // 저장 실패 시 다운로드로 대체
            const link = document.createElement('a')
            link.download = fileName
            link.href = imgData
            link.click()
          }
        } catch (error) {
          console.error('JPEG 저장 실패:', error)
          // 저장 실패 시 다운로드로 대체
          const link = document.createElement('a')
          link.download = fileName
          link.href = imgData
          link.click()
        }
      } else {
        // 기존 방식: 다운로드
        const link = document.createElement('a')
        link.download = fileName
        link.href = imgData
        link.click()
      }

      // 캔버스 메모리 해제 (메모리 관리)
      canvas.width = 0
      canvas.height = 0
    } catch (error) {
      console.error(`페이지 ${i + 1} 캡처 실패:`, error)
      failedPages.push(i + 1)
    }
  }

  if (failedPages.length > 0) {
    alert(`일부 페이지(${failedPages.join(', ')})의 캡처에 실패했습니다.`)
  }
}

/**
 * UI 요소 숨기기
 */
function hideUIElements(canvasElement: HTMLElement): Array<{ element: HTMLElement; originalDisplay: string }> {
  const hiddenElements: Array<{ element: HTMLElement; originalDisplay: string }> = []

  // 편집 버튼들 숨기기 (ImageSlotActions 컴포넌트)
  const actionButtons = canvasElement.querySelectorAll('div[class*="absolute"][class*="inset-0"]')
  actionButtons.forEach((btn) => {
    const htmlBtn = btn as HTMLElement
    // 편집/삭제/내용추가 버튼이 있는 오버레이인지 확인
    if (htmlBtn.querySelector('button')) {
      hiddenElements.push({
        element: htmlBtn,
        originalDisplay: htmlBtn.style.display
      })
      htmlBtn.style.display = 'none'
    }
  })

  return hiddenElements
}

/**
 * UI 요소 복원
 */
function restoreUIElements(hiddenElements: Array<{ element: HTMLElement; originalDisplay: string }>): void {
  hiddenElements.forEach(({ element, originalDisplay }) => {
    element.style.display = originalDisplay
  })
}

/**
 * 파일명 생성
 */
function generateFileName(
  title: string,
  projectName: string,
  subProjectName: string,
  extension: 'pdf' | 'jpg',
  pageNumber?: number,
  totalPages?: number
): string {
  const sanitize = (str: string) => {
    return str
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .trim()
  }

  let fileName = sanitize(title || '현장확인사진')

  if (projectName) {
    fileName += `_${sanitize(projectName)}`
  }

  if (subProjectName) {
    fileName += `_${sanitize(subProjectName)}`
  }

  if (pageNumber && totalPages && totalPages > 1) {
    fileName += `_페이지${pageNumber}`
  }

  return `${fileName}.${extension}`
}

