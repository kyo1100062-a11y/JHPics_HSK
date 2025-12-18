import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { TemplateType } from '../stores/editorStore'
import { logger } from './logger'
import { showToast } from '../components/Toast'

interface ExportOptions {
  isHighQuality?: boolean
  isLowQuality?: boolean
  onProgress?: (current: number, total: number) => void
  pagesMetadata?: Array<{ title: string; projectName: string; subProjectName: string }>
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
  const { isHighQuality = false, isLowQuality = false, onProgress, template } = options

  // 가로형 템플릿 여부 확인
  const isLandscape = template?.includes('-landscape') ?? false

  // A4 크기 (mm) - 가로형일 때는 297×210, 세로형일 때는 210×297
  const A4_WIDTH_MM = isLandscape ? 297 : 210
  const A4_HEIGHT_MM = isLandscape ? 210 : 297

  // devicePixelRatio를 고려하여 scale 계산 (저화질: 2.4, 기본: 4.8, 고화질: 7.2)
  // 저화질 출력: 기본 출력(4.8)의 대략 50% = 2.4
  // 기본 출력: 4.8 (수정 없음)
  // 고화질 출력: 기본 출력(4.8)의 약 1.5배 = 7.2
  const baseScale = isLowQuality ? 2.4 : (isHighQuality ? 7.2 : 4.8)
  const devicePixelRatio = window.devicePixelRatio || 1
  const scale = baseScale * devicePixelRatio

  // PDF 생성 - 가로형일 때는 landscape, 세로형일 때는 portrait
  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // PDF 메타데이터 설정
  const title = metadata.title || '현장확인사진'
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

      // DOM 안정화를 위한 렌더링 대기시간
      await new Promise(res => setTimeout(res, 150))

      // 캔버스 캡처
      const canvas = await html2canvas(canvasElement, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: canvasElement.offsetWidth,
        height: canvasElement.offsetHeight,
        allowTaint: false,
        imageTimeout: 15000,
        removeContainer: false,
        onclone: (clonedDoc) => {
          // 폰트 스타일 정확히 복사: 제목 영역의 font-family 보장
          const clonedMetadataArea = clonedDoc.querySelector('div[class*="text-left"], div[class*="text-center"], div[class*="text-right"]') as HTMLElement
          if (clonedMetadataArea) {
            const clonedFirstLine = clonedMetadataArea.querySelector('div:first-child') as HTMLElement
            if (clonedFirstLine) {
              // 원본 요소의 computed style 가져오기
              const originalMetadataArea = canvasElement.querySelector('div[class*="text-left"], div[class*="text-center"], div[class*="text-right"]') as HTMLElement
              if (originalMetadataArea) {
                const originalFirstLine = originalMetadataArea.querySelector('div:first-child') as HTMLElement
                if (originalFirstLine) {
                  const computedStyle = window.getComputedStyle(originalFirstLine)
                  // 폰트 스타일을 명시적으로 복사 (fallback 포함)
                  clonedFirstLine.style.fontFamily = computedStyle.fontFamily || 'sans-serif'
                  clonedFirstLine.style.fontSize = computedStyle.fontSize || '19px'
                  clonedFirstLine.style.fontWeight = computedStyle.fontWeight || 'normal'
                  clonedFirstLine.style.textAlign = computedStyle.textAlign || 'left'
                }
              }
            }
          }

          // 편집 버튼 숨기기 (html2canvas clone timing 버그 대응)
          clonedDoc.querySelectorAll(".edit-btn, .delete-btn, .add-text-btn, .lock-ratio-btn").forEach(el => {
            (el as HTMLElement).style.display = "none"
          })
          
          // ImageSlotActions 오버레이 숨기기 (편집/삭제/내용추가/비율유지 버튼 포함)
          clonedDoc.querySelectorAll('div[class*="bg-black"][class*="/50"]').forEach(el => {
            const overlay = el as HTMLElement
            if (overlay.querySelector('button')) {
              overlay.style.display = 'none'
            }
          })

          // 이미지 슬롯 테두리 스타일 변경 (출력 시에만): 점선 → 실선
          // 1. 인라인 스타일로 border에 dashed가 포함된 요소 찾기
          const allElements = clonedDoc.querySelectorAll('*')
          allElements.forEach((el) => {
            const element = el as HTMLElement
            const borderStyle = element.style.border || element.style.borderStyle
            if (borderStyle && borderStyle.includes('dashed')) {
              element.style.borderStyle = 'solid'
              element.style.borderColor = '#8a8a8a'
              element.style.borderWidth = '1px'
            }
          })
          
          // 2. border-dashed 클래스를 가진 요소 찾기
          const dashedBorders = clonedDoc.querySelectorAll('[class*="border-dashed"], .border-dashed')
          dashedBorders.forEach((el) => {
            const element = el as HTMLElement
            element.style.borderStyle = 'solid'
            element.style.borderColor = '#8a8a8a'
            element.style.borderWidth = '1px'
          })

          // 커스텀 템플릿의 textarea를 div로 변환
          // 원본 DOM에서 모든 textarea 찾기
          const originalTextareas = canvasElement.querySelectorAll('textarea')
          const clonedTextareas = clonedDoc.querySelectorAll('textarea')
          
          // 원본과 클론된 textarea를 인덱스로 매칭
          originalTextareas.forEach((originalTa, index) => {
            const clonedTa = clonedTextareas[index] as HTMLTextAreaElement
            if (!clonedTa) return

            // 원본 textarea의 computed style 확인
            const originalStyle = window.getComputedStyle(originalTa)
            const fontSize = originalStyle.fontSize
            
            // 커스텀 템플릿 판단: fontSize가 11px이면 커스텀 템플릿
            // 일반 템플릿은 13px, 커스텀 템플릿은 11px
            const isCustomTemplate = fontSize === '11px' || parseFloat(fontSize) === 11

            if (isCustomTemplate) {
              const value = clonedTa.value ?? ''
              
              // div 생성
              const div = clonedDoc.createElement('div')
              div.textContent = value

              // 커스텀 템플릿 전용 스타일: baseline 보정을 위한 설정
              const divHeight = 20  // textarea 고정 height
              const originalLine = 13  // 기존 line-height

              // 원본 textarea와 동일한 크기
              div.style.height = `${divHeight}px`
              // baseline이 아래로 쏠리지 않도록 line-height를 약간 줄여줌
              div.style.lineHeight = `${originalLine}px`  // 13px 유지
              // flex로 상단 정렬 고정 (baseline 보정용)
              div.style.display = 'flex'
              div.style.alignItems = 'flex-start'
              // flex 컨테이너에서는 text-align이 작동하지 않으므로 justify-content로 가운데 정렬
              div.style.justifyContent = 'center'
              // 한 줄 표시 방식
              div.style.whiteSpace = 'nowrap'
              div.style.overflow = 'hidden'
              div.style.textOverflow = 'ellipsis'
              // margin/padding 제거
              div.style.margin = '0'
              div.style.padding = '0'
              div.style.boxSizing = 'border-box'

              // textarea 폰트 스타일 동일하게 적용
              div.style.width = originalStyle.width
              div.style.fontSize = originalStyle.fontSize
              div.style.fontFamily = originalStyle.fontFamily
              div.style.fontWeight = originalStyle.fontWeight
              div.style.color = originalStyle.color
              
              // text-align도 명시적으로 설정 (flex를 사용하더라도 내부 텍스트 정렬 보장)
              div.style.textAlign = 'center'

              // textarea를 div로 교체
              clonedTa.replaceWith(div)

              // 커스텀 템플릿 캡션 주변 부모 요소의 overflow 및 정렬 확인 및 수정
              // 부모 컨테이너 찾기 (flex-shrink-0 bg-white)
              let parent = div.parentElement
              let slotContainer: HTMLElement | null = null // 슬롯 최상위 컨테이너 (overflow 조정용)
              
              while (parent) {
                const parentStyle = window.getComputedStyle(parent)
                
                // 슬롯 최상위 컨테이너 찾기 (ImageSlot의 최상위 div, border가 있는 div)
                if (!slotContainer && parent.style.border && parent.style.border.includes('dashed')) {
                  slotContainer = parent as HTMLElement
                }
                
                // overflow: hidden인 부모 컨테이너를 visible로 변경
                if (parentStyle.overflow === 'hidden' || parentStyle.overflowY === 'hidden') {
                  parent.style.overflow = 'visible'
                  parent.style.overflowY = 'visible'
                }
                
                // 부모 컨테이너가 flex인 경우 justify-content: center 확인 및 설정
                if (parentStyle.display === 'flex' || parentStyle.display === '-webkit-flex') {
                  // 부모가 flex이고 justify-center가 없으면 추가
                  const justifyContent = parentStyle.justifyContent || parentStyle.webkitJustifyContent || ''
                  if (justifyContent !== 'center' && justifyContent !== 'flex-center') {
                    parent.style.justifyContent = 'center'
                  }
                }
                
                // 부모 컨테이너의 text-align이 left로 설정되어 있거나 비어있으면 center로 변경 (커스텀 템플릿만)
                if (parentStyle.textAlign === 'left' || parentStyle.textAlign === '') {
                  parent.style.textAlign = 'center'
                }
                
                // CustomLandscapeLayout이나 CustomPortraitLayout의 직접 자식까지 확인
                if (parent.classList.contains('relative') && parent.querySelector('div[class*="flex"][class*="flex-col"]')) {
                  break
                }
                parent = parent.parentElement
              }
              
              // 문제 구간(세로형 4행 또는 가로형 3행)에서 슬롯 컨테이너 높이 보정
              // 텍스트 영역이 잘리지 않도록 슬롯 컨테이너의 최소 높이 보장
              if (slotContainer) {
                const slotComputedStyle = window.getComputedStyle(slotContainer)
                const slotHeight = parseFloat(slotComputedStyle.height || '0')
                const textAreaHeight = 21 // 텍스트 영역 높이 (커스텀 템플릿)
                
                // 슬롯 높이가 텍스트 영역보다 작으면 최소 높이 설정
                if (slotHeight > 0 && slotHeight < textAreaHeight + 100) {
                  // 텍스트 영역 21px + 이미지 최소 공간 100px = 121px 이상 보장
                  slotContainer.style.minHeight = '130px'
                  slotContainer.style.overflow = 'visible'
                }
                
                // 텍스트 영역 부모 컨테이너(div.flex-shrink-0) 높이 강제 설정
                const textAreaParent = div.parentElement
                if (textAreaParent) {
                  const textParentStyle = window.getComputedStyle(textAreaParent)
                  // 텍스트 영역이 활성화된 경우 높이 보장
                  if (value && value.trim() && (textParentStyle.height === '0px' || parseFloat(textParentStyle.height || '0') < 21)) {
                    textAreaParent.style.height = '21px'
                    textAreaParent.style.minHeight = '21px'
                    textAreaParent.style.maxHeight = '21px'
                    textAreaParent.style.overflow = 'visible'
                    textAreaParent.style.visibility = 'visible'
                  }
                }
              }
            }
          })
        }
      })

      // 캔버스 크기 및 DPI 로그 출력
      const actualWidth = canvas.width
      const actualHeight = canvas.height
      const elementWidth = canvasElement.offsetWidth
      const elementHeight = canvasElement.offsetHeight
      const calculatedDPI = (actualWidth / elementWidth) * (96 / devicePixelRatio) // 96 DPI 기준 화면 해상도
      
      // 롤백 검증: export DOM 렌더링 구조 확인
      const imgElements = canvasElement.querySelectorAll('img.image-wrapper')
      const bgImageElements = Array.from(canvasElement.querySelectorAll('.image-wrapper')).filter(w => {
        const el = w as HTMLElement
        return el.tagName.toLowerCase() === 'div' && el.style.backgroundImage
      })
      
      // 제목 스타일 검증: export DOM에서 제목 영역 찾기
      const metadataArea = canvasElement.querySelector('div[class*="text-left"], div[class*="text-center"], div[class*="text-right"]') as HTMLElement
      let titleStyleInfo: any = null
      let fontCheckInfo: any = null
      if (metadataArea) {
        const firstLine = metadataArea.querySelector('div:first-child') as HTMLElement
        if (firstLine) {
          const computedStyle = window.getComputedStyle(firstLine)
          const appliedFontFamily = computedStyle.fontFamily || 'sans-serif'
          titleStyleInfo = {
            align: computedStyle.textAlign || 'left',
            fontFamily: appliedFontFamily,
            fontSize: computedStyle.fontSize || '19px',
            fontWeight: computedStyle.fontWeight || 'normal',
            bold: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700
          }
          
          // 폰트 검사: 웹폰트 로드 여부 및 fallback 확인
          const webFonts = ['SUIT', 'Inter', 'Noto Sans KR', 'Pretendard', 'Nanum Gothic', 'Nanum Myeongjo', 'IBM Plex Sans KR']
          const selectedFont = appliedFontFamily.split(',')[0].replace(/['"]/g, '').trim()
          const isWebFont = webFonts.some(font => selectedFont.includes(font))
          
          // fonts.ready를 사용하여 웹폰트 로드 여부 확인
          let webFontLoaded = false
          let fallbackApplied = false
          
          if (isWebFont && 'fonts' in document) {
            try {
              await document.fonts.ready
              const fontCheck = document.fonts.check(`16px "${selectedFont}"`)
              webFontLoaded = fontCheck
              // 웹폰트가 로드되지 않았으면 fallback 적용됨
              fallbackApplied = !fontCheck
            } catch (error) {
              console.warn('폰트 로드 확인 중 오류:', error)
              fallbackApplied = true
            }
          } else {
            // 로컬 폰트인 경우 fallback이 적용될 수 있음
            fallbackApplied = appliedFontFamily.includes('Malgun Gothic') || appliedFontFamily.includes('sans-serif')
          }
          
          fontCheckInfo = {
            selectedFont: selectedFont,
            appliedFontFamily: appliedFontFamily,
            isWebFont: isWebFont,
            webFontLoaded: isWebFont ? webFontLoaded : 'N/A (로컬 폰트)',
            fallbackApplied: fallbackApplied
          }
        }
      }

      // 롤백 검증 로그 (개발 모드에서만)
      logger.log(`\n[롤백 검증 - PDF Export] 페이지 ${i + 1}`)
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      logger.log('1. ImageSlot.tsx 렌더 방식:', imgElements.length > 0 ? '✅ <img> 기반' : '❌ <img> 없음')
      logger.log('2. exportUtils.ts background-image 로직:', bgImageElements.length === 0 ? '✅ 제거됨' : `⚠️ 잔존 (${bgImageElements.length}개)`)
      logger.log('3. export DOM 요소:', {
        '<img> 태그': imgElements.length,
        'background-image div': bgImageElements.length
      })
      logger.log('4. html2canvas scale:', scale.toFixed(2))
      logger.log('5. 편집 화면 vs 출력물:', '동일한 <img> 기반 렌더링 (선명도 일치)')
      if (titleStyleInfo) {
        logger.log('6. [제목 스타일] export DOM에서 적용된 titleStyle:', titleStyleInfo)
      }
      if (fontCheckInfo) {
        logger.log('7. [폰트 검사]', fontCheckInfo)
      }
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      logger.log(`[PDF Export - Page ${i + 1}]`, {
        'Canvas 크기 (px)': `${actualWidth} × ${actualHeight}`,
        'Element 크기 (px)': `${elementWidth} × ${elementHeight}`,
        'html2canvas scale': scale.toFixed(2),
        'devicePixelRatio': devicePixelRatio,
        '예상 DPI': calculatedDPI.toFixed(0),
        'JPEG 품질': isLowQuality ? 0.6 : (isHighQuality ? 0.95 : 0.85),
        '저화질 모드': isLowQuality,
        '고화질 모드': isHighQuality,
        'export DOM 렌더링 구조': {
          '<img> 태그 수': imgElements.length,
          'background-image div 수': bgImageElements.length,
          '렌더링 방식': imgElements.length > 0 ? '<img> 기반 (롤백 완료)' : (bgImageElements.length > 0 ? 'background-image (잔존)' : '없음')
        },
        '제목 스타일 (export DOM)': titleStyleInfo || '제목 영역을 찾을 수 없음',
        '폰트 검사': fontCheckInfo || '제목 영역을 찾을 수 없음'
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

      // PDF에 이미지 추가 (JPEG 품질: 기본 0.85, 고화질 0.95)
      const imgData = canvas.toDataURL('image/jpeg', isHighQuality ? 0.95 : 0.85)

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

  // 파일명 생성 (기본 파일명)
  const defaultFileName = generateFileName(metadata.title, metadata.projectName, metadata.subProjectName, 'pdf')

  // PDF를 Blob으로 변환
  const pdfBlob = pdf.output('blob')

  // showSaveFilePicker를 사용하여 파일 저장
  try {
    logger.log('[PDF Export] showSaveFilePicker 호출 시작')
    logger.log('[PDF Export] 기본 파일명:', defaultFileName)
    logger.log('[PDF Export] Blob 크기:', pdfBlob.size, 'bytes')
    logger.log('[PDF Export] Blob 형식: application/pdf')

    // File System Access API 지원 확인
    if ('showSaveFilePicker' in window) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [
          {
            description: 'PDF 파일',
            accept: {
              'application/pdf': ['.pdf']
            }
          }
        ]
      })

      logger.log('[PDF Export] 선택된 파일명:', fileHandle.name)

      const writable = await fileHandle.createWritable()
      await writable.write(pdfBlob)
      await writable.close()

      logger.log('[PDF Export] 파일 저장 성공')
      showToast('PDF가 성공적으로 저장되었습니다.', 'success')
    } else {
      // File System Access API를 지원하지 않는 브라우저의 경우 다운로드로 대체
      logger.warn('[PDF Export] showSaveFilePicker를 지원하지 않는 브라우저입니다. 다운로드로 대체합니다.')
      // Blob URL을 사용하여 Save As 창이 열리도록 함
      const pdfBlobUrl = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      // a.download 속성을 제거하여 Save As 창이 열리도록 함
      link.href = pdfBlobUrl
      link.click()
      // 메모리 정리
      setTimeout(() => URL.revokeObjectURL(pdfBlobUrl), 100)
      showToast('PDF가 다운로드되었습니다.', 'info')
    }
  } catch (error: any) {
    // 사용자가 취소한 경우
    if (error.name === 'AbortError') {
      logger.log('[PDF Export] 사용자가 저장을 취소했습니다.')
      return
    }
    logger.error('[PDF Export] 파일 저장 실패:', error)
    // 저장 실패 시 다운로드로 대체
    // Blob URL을 사용하여 Save As 창이 열리도록 함
    const pdfBlobUrl = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    // a.download 속성을 제거하여 Save As 창이 열리도록 함
    link.href = pdfBlobUrl
    link.click()
    // 메모리 정리
    setTimeout(() => URL.revokeObjectURL(pdfBlobUrl), 100)
    showToast('파일 저장에 실패했습니다. 다운로드로 대체합니다.', 'warning')
  }

  if (failedPages.length > 0) {
    showToast(`일부 페이지(${failedPages.join(', ')})의 캡처에 실패했습니다.`, 'error')
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
  const { isHighQuality = false, isLowQuality = false, onProgress, pagesMetadata } = options

  // devicePixelRatio를 고려하여 scale 계산 (저화질: 2.4, 기본: 4.8, 고화질: 7.2)
  // 저화질 출력: 기본 출력(4.8)의 대략 50% = 2.4
  // 기본 출력: 4.8 (수정 없음)
  // 고화질 출력: 기본 출력(4.8)의 약 1.5배 = 7.2
  const baseScale = isLowQuality ? 2.4 : (isHighQuality ? 7.2 : 4.8)
  const devicePixelRatio = window.devicePixelRatio || 1
  const scale = baseScale * devicePixelRatio
  const quality = isLowQuality ? 0.6 : (isHighQuality ? 0.95 : 0.85)

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

      // DOM 안정화를 위한 렌더링 대기시간
      await new Promise(res => setTimeout(res, 150))

      // 캔버스 캡처
      const canvas = await html2canvas(canvasElement, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: canvasElement.offsetWidth,
        height: canvasElement.offsetHeight,
        allowTaint: false,
        imageTimeout: 15000,
        removeContainer: false,
        onclone: (clonedDoc) => {
          // 폰트 스타일 정확히 복사: 제목 영역의 font-family 보장
          const clonedMetadataArea = clonedDoc.querySelector('div[class*="text-left"], div[class*="text-center"], div[class*="text-right"]') as HTMLElement
          if (clonedMetadataArea) {
            const clonedFirstLine = clonedMetadataArea.querySelector('div:first-child') as HTMLElement
            if (clonedFirstLine) {
              // 원본 요소의 computed style 가져오기
              const originalMetadataArea = canvasElement.querySelector('div[class*="text-left"], div[class*="text-center"], div[class*="text-right"]') as HTMLElement
              if (originalMetadataArea) {
                const originalFirstLine = originalMetadataArea.querySelector('div:first-child') as HTMLElement
                if (originalFirstLine) {
                  const computedStyle = window.getComputedStyle(originalFirstLine)
                  // 폰트 스타일을 명시적으로 복사 (fallback 포함)
                  clonedFirstLine.style.fontFamily = computedStyle.fontFamily || 'sans-serif'
                  clonedFirstLine.style.fontSize = computedStyle.fontSize || '19px'
                  clonedFirstLine.style.fontWeight = computedStyle.fontWeight || 'normal'
                  clonedFirstLine.style.textAlign = computedStyle.textAlign || 'left'
                }
              }
            }
          }

          // 편집 버튼 숨기기 (html2canvas clone timing 버그 대응)
          clonedDoc.querySelectorAll(".edit-btn, .delete-btn, .add-text-btn, .lock-ratio-btn").forEach(el => {
            (el as HTMLElement).style.display = "none"
          })
          
          // ImageSlotActions 오버레이 숨기기 (편집/삭제/내용추가/비율유지 버튼 포함)
          clonedDoc.querySelectorAll('div[class*="bg-black"][class*="/50"]').forEach(el => {
            const overlay = el as HTMLElement
            if (overlay.querySelector('button')) {
              overlay.style.display = 'none'
            }
          })

          // 이미지 슬롯 테두리 스타일 변경 (출력 시에만): 점선 → 실선
          // 1. 인라인 스타일로 border에 dashed가 포함된 요소 찾기
          const allElements = clonedDoc.querySelectorAll('*')
          allElements.forEach((el) => {
            const element = el as HTMLElement
            const borderStyle = element.style.border || element.style.borderStyle
            if (borderStyle && borderStyle.includes('dashed')) {
              element.style.borderStyle = 'solid'
              element.style.borderColor = '#8a8a8a'
              element.style.borderWidth = '1px'
            }
          })
          
          // 2. border-dashed 클래스를 가진 요소 찾기
          const dashedBorders = clonedDoc.querySelectorAll('[class*="border-dashed"], .border-dashed')
          dashedBorders.forEach((el) => {
            const element = el as HTMLElement
            element.style.borderStyle = 'solid'
            element.style.borderColor = '#8a8a8a'
            element.style.borderWidth = '1px'
          })

          // 커스텀 템플릿의 textarea를 div로 변환
          // 원본 DOM에서 모든 textarea 찾기
          const originalTextareas = canvasElement.querySelectorAll('textarea')
          const clonedTextareas = clonedDoc.querySelectorAll('textarea')
          
          // 원본과 클론된 textarea를 인덱스로 매칭
          originalTextareas.forEach((originalTa, index) => {
            const clonedTa = clonedTextareas[index] as HTMLTextAreaElement
            if (!clonedTa) return

            // 원본 textarea의 computed style 확인
            const originalStyle = window.getComputedStyle(originalTa)
            const fontSize = originalStyle.fontSize
            
            // 커스텀 템플릿 판단: fontSize가 11px이면 커스텀 템플릿
            // 일반 템플릿은 13px, 커스텀 템플릿은 11px
            const isCustomTemplate = fontSize === '11px' || parseFloat(fontSize) === 11

            if (isCustomTemplate) {
              const value = clonedTa.value ?? ''
              
              // div 생성
              const div = clonedDoc.createElement('div')
              div.textContent = value

              // 커스텀 템플릿 전용 스타일: baseline 보정을 위한 설정
              const divHeight = 20  // textarea 고정 height
              const originalLine = 13  // 기존 line-height

              // 원본 textarea와 동일한 크기
              div.style.height = `${divHeight}px`
              // baseline이 아래로 쏠리지 않도록 line-height를 약간 줄여줌
              div.style.lineHeight = `${originalLine}px`  // 13px 유지
              // flex로 상단 정렬 고정 (baseline 보정용)
              div.style.display = 'flex'
              div.style.alignItems = 'flex-start'
              // flex 컨테이너에서는 text-align이 작동하지 않으므로 justify-content로 가운데 정렬
              div.style.justifyContent = 'center'
              // 한 줄 표시 방식
              div.style.whiteSpace = 'nowrap'
              div.style.overflow = 'hidden'
              div.style.textOverflow = 'ellipsis'
              // margin/padding 제거
              div.style.margin = '0'
              div.style.padding = '0'
              div.style.boxSizing = 'border-box'

              // textarea 폰트 스타일 동일하게 적용
              div.style.width = originalStyle.width
              div.style.fontSize = originalStyle.fontSize
              div.style.fontFamily = originalStyle.fontFamily
              div.style.fontWeight = originalStyle.fontWeight
              div.style.color = originalStyle.color
              
              // text-align도 명시적으로 설정 (flex를 사용하더라도 내부 텍스트 정렬 보장)
              div.style.textAlign = 'center'

              // textarea를 div로 교체
              clonedTa.replaceWith(div)

              // 커스텀 템플릿 캡션 주변 부모 요소의 overflow 및 정렬 확인 및 수정
              // 부모 컨테이너 찾기 (flex-shrink-0 bg-white)
              let parent = div.parentElement
              let slotContainer: HTMLElement | null = null // 슬롯 최상위 컨테이너 (overflow 조정용)
              
              while (parent) {
                const parentStyle = window.getComputedStyle(parent)
                
                // 슬롯 최상위 컨테이너 찾기 (ImageSlot의 최상위 div, border가 있는 div)
                if (!slotContainer && parent.style.border && parent.style.border.includes('dashed')) {
                  slotContainer = parent as HTMLElement
                }
                
                // overflow: hidden인 부모 컨테이너를 visible로 변경
                if (parentStyle.overflow === 'hidden' || parentStyle.overflowY === 'hidden') {
                  parent.style.overflow = 'visible'
                  parent.style.overflowY = 'visible'
                }
                
                // 부모 컨테이너가 flex인 경우 justify-content: center 확인 및 설정
                if (parentStyle.display === 'flex' || parentStyle.display === '-webkit-flex') {
                  // 부모가 flex이고 justify-center가 없으면 추가
                  const justifyContent = parentStyle.justifyContent || parentStyle.webkitJustifyContent || ''
                  if (justifyContent !== 'center' && justifyContent !== 'flex-center') {
                    parent.style.justifyContent = 'center'
                  }
                }
                
                // 부모 컨테이너의 text-align이 left로 설정되어 있거나 비어있으면 center로 변경 (커스텀 템플릿만)
                if (parentStyle.textAlign === 'left' || parentStyle.textAlign === '') {
                  parent.style.textAlign = 'center'
                }
                
                // CustomLandscapeLayout이나 CustomPortraitLayout의 직접 자식까지 확인
                if (parent.classList.contains('relative') && parent.querySelector('div[class*="flex"][class*="flex-col"]')) {
                  break
                }
                parent = parent.parentElement
              }
              
              // 문제 구간(세로형 4행 또는 가로형 3행)에서 슬롯 컨테이너 높이 보정
              // 텍스트 영역이 잘리지 않도록 슬롯 컨테이너의 최소 높이 보장
              if (slotContainer) {
                const slotComputedStyle = window.getComputedStyle(slotContainer)
                const slotHeight = parseFloat(slotComputedStyle.height || '0')
                const textAreaHeight = 21 // 텍스트 영역 높이 (커스텀 템플릿)
                
                // 슬롯 높이가 텍스트 영역보다 작으면 최소 높이 설정
                if (slotHeight > 0 && slotHeight < textAreaHeight + 100) {
                  // 텍스트 영역 21px + 이미지 최소 공간 100px = 121px 이상 보장
                  slotContainer.style.minHeight = '130px'
                  slotContainer.style.overflow = 'visible'
                }
                
                // 텍스트 영역 부모 컨테이너(div.flex-shrink-0) 높이 강제 설정
                const textAreaParent = div.parentElement
                if (textAreaParent) {
                  const textParentStyle = window.getComputedStyle(textAreaParent)
                  // 텍스트 영역이 활성화된 경우 높이 보장
                  if (value && value.trim() && (textParentStyle.height === '0px' || parseFloat(textParentStyle.height || '0') < 21)) {
                    textAreaParent.style.height = '21px'
                    textAreaParent.style.minHeight = '21px'
                    textAreaParent.style.maxHeight = '21px'
                    textAreaParent.style.overflow = 'visible'
                    textAreaParent.style.visibility = 'visible'
                  }
                }
              }
            }
          })
        }
      })

      // 캔버스 크기 및 DPI 로그 출력
      const actualWidth = canvas.width
      const actualHeight = canvas.height
      const elementWidth = canvasElement.offsetWidth
      const elementHeight = canvasElement.offsetHeight
      const calculatedDPI = (actualWidth / elementWidth) * (96 / devicePixelRatio) // 96 DPI 기준 화면 해상도
      
      // 롤백 검증: export DOM 렌더링 구조 확인
      const imgElements = canvasElement.querySelectorAll('img.image-wrapper')
      const bgImageElements = Array.from(canvasElement.querySelectorAll('.image-wrapper')).filter(w => {
        const el = w as HTMLElement
        return el.tagName.toLowerCase() === 'div' && el.style.backgroundImage
      })
      
      // 제목 스타일 검증: export DOM에서 제목 영역 찾기
      const metadataArea = canvasElement.querySelector('div[class*="text-left"], div[class*="text-center"], div[class*="text-right"]') as HTMLElement
      let titleStyleInfo: any = null
      let fontCheckInfo: any = null
      if (metadataArea) {
        const firstLine = metadataArea.querySelector('div:first-child') as HTMLElement
        if (firstLine) {
          const computedStyle = window.getComputedStyle(firstLine)
          const appliedFontFamily = computedStyle.fontFamily || 'sans-serif'
          titleStyleInfo = {
            align: computedStyle.textAlign || 'left',
            fontFamily: appliedFontFamily,
            fontSize: computedStyle.fontSize || '19px',
            fontWeight: computedStyle.fontWeight || 'normal',
            bold: computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700
          }
          
          // 폰트 검사: 웹폰트 로드 여부 및 fallback 확인
          const webFonts = ['SUIT', 'Inter', 'Noto Sans KR', 'Pretendard', 'Nanum Gothic', 'Nanum Myeongjo', 'IBM Plex Sans KR']
          const selectedFont = appliedFontFamily.split(',')[0].replace(/['"]/g, '').trim()
          const isWebFont = webFonts.some(font => selectedFont.includes(font))
          
          // fonts.ready를 사용하여 웹폰트 로드 여부 확인
          let webFontLoaded = false
          let fallbackApplied = false
          
          if (isWebFont && 'fonts' in document) {
            try {
              await document.fonts.ready
              const fontCheck = document.fonts.check(`16px "${selectedFont}"`)
              webFontLoaded = fontCheck
              // 웹폰트가 로드되지 않았으면 fallback 적용됨
              fallbackApplied = !fontCheck
            } catch (error) {
              logger.warn('폰트 로드 확인 중 오류:', error)
              fallbackApplied = true
            }
          } else {
            // 로컬 폰트인 경우 fallback이 적용될 수 있음
            fallbackApplied = appliedFontFamily.includes('Malgun Gothic') || appliedFontFamily.includes('sans-serif')
          }
          
          fontCheckInfo = {
            selectedFont: selectedFont,
            appliedFontFamily: appliedFontFamily,
            isWebFont: isWebFont,
            webFontLoaded: isWebFont ? webFontLoaded : 'N/A (로컬 폰트)',
            fallbackApplied: fallbackApplied
          }
        }
      }

      // 롤백 검증 로그 (개발 모드에서만)
      logger.log(`\n[롤백 검증 - JPEG Export] 페이지 ${i + 1}`)
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      logger.log('1. ImageSlot.tsx 렌더 방식:', imgElements.length > 0 ? '✅ <img> 기반' : '❌ <img> 없음')
      logger.log('2. exportUtils.ts background-image 로직:', bgImageElements.length === 0 ? '✅ 제거됨' : `⚠️ 잔존 (${bgImageElements.length}개)`)
      logger.log('3. export DOM 요소:', {
        '<img> 태그': imgElements.length,
        'background-image div': bgImageElements.length
      })
      logger.log('4. html2canvas scale:', scale.toFixed(2))
      logger.log('5. 편집 화면 vs 출력물:', '동일한 <img> 기반 렌더링 (선명도 일치)')
      if (titleStyleInfo) {
        logger.log('6. [제목 스타일] export DOM에서 적용된 titleStyle:', titleStyleInfo)
      }
      if (fontCheckInfo) {
        logger.log('7. [폰트 검사]', fontCheckInfo)
      }
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      logger.log(`[JPEG Export - Page ${i + 1}]`, {
        'Canvas 크기 (px)': `${actualWidth} × ${actualHeight}`,
        'Element 크기 (px)': `${elementWidth} × ${elementHeight}`,
        'html2canvas scale': scale.toFixed(2),
        'devicePixelRatio': devicePixelRatio,
        '예상 DPI': calculatedDPI.toFixed(0),
        'JPEG 품질': quality,
        '저화질 모드': isLowQuality,
        '고화질 모드': isHighQuality,
        'export DOM 렌더링 구조': {
          '<img> 태그 수': imgElements.length,
          'background-image div 수': bgImageElements.length,
          '렌더링 방식': imgElements.length > 0 ? '<img> 기반 (롤백 완료)' : (bgImageElements.length > 0 ? 'background-image (잔존)' : '없음')
        },
        '제목 스타일 (export DOM)': titleStyleInfo || '제목 영역을 찾을 수 없음',
        '폰트 검사': fontCheckInfo || '제목 영역을 찾을 수 없음'
      })

      // UI 요소 복원
      restoreUIElements(hiddenElements)

      // JPEG로 변환
      const imgData = canvas.toDataURL('image/jpeg', quality)
      
      // 각 페이지별 메타데이터가 있으면 사용, 없으면 기본 메타데이터 사용
      const pageMetadata = pagesMetadata && pagesMetadata[i] ? pagesMetadata[i] : metadata
      const defaultFileName = generateFileName(
        pageMetadata.title,
        pageMetadata.projectName,
        pageMetadata.subProjectName,
        'jpg',
        i + 1,
        totalPages
      )

      // Data URL을 Blob으로 변환
      const response = await fetch(imgData)
      const blob = await response.blob()

      // 첫 번째 페이지만 사용자에게 파일명 입력받고, 나머지는 자동 저장
      if (i === 0) {
        // 첫 번째 페이지: showSaveFilePicker 사용
        try {
          logger.log('[JPEG Export] showSaveFilePicker 호출 시작 (페이지 1)')
          logger.log('[JPEG Export] 기본 파일명:', defaultFileName)
          logger.log('[JPEG Export] Blob 크기:', blob.size, 'bytes')
          logger.log('[JPEG Export] Blob 형식: image/jpeg')

          // File System Access API 지원 확인
          if ('showSaveFilePicker' in window) {
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: defaultFileName,
              types: [
                {
                  description: 'JPEG 이미지',
                  accept: {
                    'image/jpeg': ['.jpg', '.jpeg']
                  }
                }
              ]
            })

            logger.log('[JPEG Export] 선택된 파일명 (페이지 1):', fileHandle.name)

            const writable = await fileHandle.createWritable()
            await writable.write(blob)
            await writable.close()

            logger.log('[JPEG Export] 파일 저장 성공 (페이지 1)')
          } else {
            // File System Access API를 지원하지 않는 브라우저의 경우 다운로드로 대체
            logger.warn('[JPEG Export] showSaveFilePicker를 지원하지 않는 브라우저입니다. 다운로드로 대체합니다.')
            const link = document.createElement('a')
            // a.download 속성을 제거하여 Save As 창이 열리도록 함
            link.href = imgData
            link.click()
          }
        } catch (error: any) {
          // 사용자가 취소한 경우
          if (error.name === 'AbortError') {
            logger.log('[JPEG Export] 사용자가 저장을 취소했습니다.')
            return // 첫 번째 페이지 저장 취소 시 전체 중단
          }
          logger.error('[JPEG Export] 파일 저장 실패 (페이지 1):', error)
          // 저장 실패 시 다운로드로 대체
          const link = document.createElement('a')
          // a.download 속성을 제거하여 Save As 창이 열리도록 함
          link.href = imgData
          link.click()
        }
      } else {
        // 나머지 페이지: 첫 번째 페이지와 같은 디렉토리에 자동 저장
        // 첫 번째 페이지의 파일 핸들을 재사용할 수 없으므로, 다운로드로 대체
        // 또는 사용자 경험을 위해 첫 번째 파일명을 기준으로 자동 저장 시도
        try {
          logger.log(`[JPEG Export] 페이지 ${i + 1} 저장 시작`)
          logger.log('[JPEG Export] 기본 파일명:', defaultFileName)
          logger.log('[JPEG Export] Blob 크기:', blob.size, 'bytes')

          if ('showSaveFilePicker' in window) {
            // 각 페이지마다 파일명 입력받기 (사용자 경험을 위해)
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: defaultFileName,
              types: [
                {
                  description: 'JPEG 이미지',
                  accept: {
                    'image/jpeg': ['.jpg', '.jpeg']
                  }
                }
              ]
            })

            logger.log(`[JPEG Export] 선택된 파일명 (페이지 ${i + 1}):`, fileHandle.name)

            const writable = await fileHandle.createWritable()
            await writable.write(blob)
            await writable.close()

            logger.log(`[JPEG Export] 파일 저장 성공 (페이지 ${i + 1})`)
          } else {
            // 다운로드로 대체
            const link = document.createElement('a')
            // a.download 속성을 제거하여 Save As 창이 열리도록 함
            link.href = imgData
            link.click()
          }
        } catch (error: any) {
          // 사용자가 취소한 경우
          if (error.name === 'AbortError') {
            logger.log(`[JPEG Export] 사용자가 저장을 취소했습니다 (페이지 ${i + 1})`)
            // 해당 페이지만 건너뛰고 계속 진행
            continue
          }
          logger.error(`[JPEG Export] 파일 저장 실패 (페이지 ${i + 1}):`, error)
          // 저장 실패 시 다운로드로 대체
          const link = document.createElement('a')
          // a.download 속성을 제거하여 Save As 창이 열리도록 함
          link.href = imgData
          link.click()
        }
      }

      // 캔버스 메모리 해제 (메모리 관리)
      canvas.width = 0
      canvas.height = 0
    } catch (error) {
      logger.error(`페이지 ${i + 1} 캡처 실패:`, error)
      failedPages.push(i + 1)
    }
  }

  // 저장 완료 메시지
  const savedPages = totalPages - failedPages.length
  if (savedPages > 0) {
    if (failedPages.length > 0) {
      showToast(`JPEG 저장 완료: ${savedPages}개 페이지 저장됨\n일부 페이지(${failedPages.join(', ')})의 캡처에 실패했습니다.`, 'warning')
    } else {
      showToast(`JPEG 저장 완료: ${savedPages}개 페이지가 모두 저장되었습니다.`, 'success')
    }
  } else {
    showToast('JPEG 저장에 실패했습니다.', 'error')
  }
}

/**
 * UI 요소 숨기기
 */
function hideUIElements(canvasElement: HTMLElement): Array<{ element: HTMLElement; originalDisplay: string }> {
  const hiddenElements: Array<{ element: HTMLElement; originalDisplay: string }> = []

  // 1. 편집 버튼들 숨기기 (ImageSlotActions 컴포넌트 - 편집/삭제/내용추가/비율유지 버튼)
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

  // 2. 더 포괄적인 선택자로 편집 UI 요소 찾기 (bg-black/50 오버레이)
  const overlayElements = canvasElement.querySelectorAll('div[class*="bg-black"][class*="/50"]')
  overlayElements.forEach((overlay) => {
    const htmlOverlay = overlay as HTMLElement
    // 버튼이 포함된 오버레이인지 확인
    if (htmlOverlay.querySelector('button')) {
      // 이미 숨겨진 요소인지 확인
      const alreadyHidden = hiddenElements.some(h => h.element === htmlOverlay)
      if (!alreadyHidden) {
        hiddenElements.push({
          element: htmlOverlay,
          originalDisplay: htmlOverlay.style.display
        })
        htmlOverlay.style.display = 'none'
      }
    }
  })

  // 3. 모든 편집 관련 버튼 숨기기 (슬롯 추가, 슬롯 삭제, 편집, 삭제, 내용추가, 비율유지 버튼)
  const allButtons = canvasElement.querySelectorAll('button')
  allButtons.forEach((btn) => {
    const htmlBtn = btn as HTMLElement
    const btnText = htmlBtn.textContent?.trim() || ''
    const btnTitle = htmlBtn.getAttribute('title') || ''
    
    // 편집 관련 버튼인지 확인
    if (
      btnText.includes('편집') ||
      btnText.includes('삭제') ||
      btnText.includes('내용추가') ||
      btnText.includes('비율유지') ||
      btnText.includes('슬롯 추가') ||
      btnText === '×' ||
      btnTitle === '슬롯 삭제'
    ) {
      // 이미 숨겨진 요소인지 확인
      const alreadyHidden = hiddenElements.some(h => h.element === htmlBtn)
      if (!alreadyHidden) {
        hiddenElements.push({
          element: htmlBtn,
          originalDisplay: htmlBtn.style.display
        })
        htmlBtn.style.display = 'none'
      }
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
  // OS에서 금지된 문자만 제거 (공백, 괄호, 언더스코어는 유지)
  const sanitize = (str: string) => {
    return str
      .replace(/[<>:"/\\|?*]/g, '') // 금지된 문자만 제거
      .trim()
  }

  let fileName = sanitize(title || '현장확인사진')

  if (projectName) {
    fileName += `(${sanitize(projectName)})`
  }

  if (subProjectName) {
    fileName += `_${sanitize(subProjectName)}`
  }

  if (pageNumber && totalPages && totalPages > 1) {
    fileName += `_페이지${pageNumber}`
  }

  return `${fileName}.${extension}`
}

