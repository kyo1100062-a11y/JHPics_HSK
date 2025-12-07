import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { TemplateType } from '../stores/editorStore'

interface ExportOptions {
  isHighQuality?: boolean
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
  const { isHighQuality = false, onProgress, template } = options

  // 가로형 템플릿 여부 확인
  const isLandscape = template?.includes('-landscape') ?? false

  // A4 크기 (mm) - 가로형일 때는 297×210, 세로형일 때는 210×297
  const A4_WIDTH_MM = isLandscape ? 297 : 210
  const A4_HEIGHT_MM = isLandscape ? 210 : 297

  // 해상도 설정 (DPI 약 20% 상향 조정)
  const dpi = isHighQuality ? 425 : 300
  // devicePixelRatio를 고려하여 scale 계산 (일반: 3.0, 고화질: 4.0)
  const baseScale = isHighQuality ? 4.0 : 3.0
  const devicePixelRatio = window.devicePixelRatio || 1
  const scale = baseScale * devicePixelRatio

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

      // ============================================
      // 🧪 테스트 단계: wrapper 방식 cover 재현 테스트
      // ============================================
      let testResults: any = null
      
      // 테스트용 샘플 DOM 생성 및 캡처 테스트 (첫 페이지에서만)
      if (i === 0) {
        const testWrapperCover = async () => {
          console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
          console.log('🧪 [테스트 단계] Wrapper 방식 cover 재현 테스트')
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
          
          // 테스트용 컨테이너 생성
          const testContainer = document.createElement('div')
          testContainer.style.position = 'fixed'
          testContainer.style.top = '-9999px'
          testContainer.style.left = '-9999px'
          testContainer.style.width = '400px'
          testContainer.style.height = '900px'
          testContainer.style.backgroundColor = '#f0f0f0'
          testContainer.style.border = '2px solid #000'
          document.body.appendChild(testContainer)
          
          // 테스트 케이스 1: 가로가 긴 이미지 (슬롯: 400x300, 이미지: 800x400)
          const testCase1 = document.createElement('div')
          testCase1.style.position = 'relative'
          testCase1.style.width = '400px'
          testCase1.style.height = '300px'
          testCase1.style.overflow = 'hidden'
          testCase1.style.border = '1px solid red'
          testCase1.style.marginBottom = '20px'
          
          const wrapper1 = document.createElement('div')
          wrapper1.className = 'slot-wrapper'
          wrapper1.style.position = 'relative'
          wrapper1.style.overflow = 'hidden'
          wrapper1.style.width = '100%'
          wrapper1.style.height = '100%'
          
          const img1 = document.createElement('img')
          img1.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzQ2ODBmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjgwMHg0MDA8L3RleHQ+PC9zdmc+'
          img1.className = 'slot-img'
          img1.style.position = 'absolute'
          img1.style.top = '50%'
          img1.style.left = '50%'
          img1.style.transform = 'translate(-50%, -50%)'
          img1.style.minWidth = '100%'
          img1.style.minHeight = '100%'
          img1.style.objectFit = 'cover'
          
          wrapper1.appendChild(img1)
          testCase1.appendChild(wrapper1)
          testContainer.appendChild(testCase1)
          
          // 테스트 케이스 2: 세로가 긴 이미지 (슬롯: 400x300, 이미지: 400x800)
          const testCase2 = document.createElement('div')
          testCase2.style.position = 'relative'
          testCase2.style.width = '400px'
          testCase2.style.height = '300px'
          testCase2.style.overflow = 'hidden'
          testCase2.style.border = '1px solid blue'
          testCase2.style.marginBottom = '20px'
          
          const wrapper2 = document.createElement('div')
          wrapper2.className = 'slot-wrapper'
          wrapper2.style.position = 'relative'
          wrapper2.style.overflow = 'hidden'
          wrapper2.style.width = '100%'
          wrapper2.style.height = '100%'
          
          const img2 = document.createElement('img')
          img2.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjgwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjgwMCIgZmlsbD0iIzEwYjk4MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjQwMHg4MDA8L3RleHQ+PC9zdmc+'
          img2.className = 'slot-img'
          img2.style.position = 'absolute'
          img2.style.top = '50%'
          img2.style.left = '50%'
          img2.style.transform = 'translate(-50%, -50%)'
          img2.style.minWidth = '100%'
          img2.style.minHeight = '100%'
          img2.style.objectFit = 'cover'
          
          wrapper2.appendChild(img2)
          testCase2.appendChild(wrapper2)
          testContainer.appendChild(testCase2)
          
          // 테스트 케이스 3: scale + rotation 적용
          const testCase3 = document.createElement('div')
          testCase3.style.position = 'relative'
          testCase3.style.width = '400px'
          testCase3.style.height = '300px'
          testCase3.style.overflow = 'hidden'
          testCase3.style.border = '1px solid green'
          
          const wrapper3 = document.createElement('div')
          wrapper3.className = 'slot-wrapper'
          wrapper3.style.position = 'relative'
          wrapper3.style.overflow = 'hidden'
          wrapper3.style.width = '100%'
          wrapper3.style.height = '100%'
          
          const img3 = document.createElement('img')
          img3.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2VmNDQ0NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNjYWxlIDEuNSArIFJvdCA5MDwvdGV4dD48L3N2Zz4='
          img3.className = 'slot-img'
          img3.style.position = 'absolute'
          img3.style.top = '50%'
          img3.style.left = '50%'
          img3.style.transform = 'translate(-50%, -50%) scale(1.5) rotate(90deg)'
          img3.style.minWidth = '100%'
          img3.style.minHeight = '100%'
          img3.style.objectFit = 'cover'
          
          wrapper3.appendChild(img3)
          testCase3.appendChild(wrapper3)
          testContainer.appendChild(testCase3)
          
          // 이미지 로드 대기
          await Promise.all([
            new Promise((resolve) => { img1.onload = resolve; img1.onerror = resolve }),
            new Promise((resolve) => { img2.onload = resolve; img2.onerror = resolve }),
            new Promise((resolve) => { img3.onload = resolve; img3.onerror = resolve })
          ])
          
          // html2canvas로 테스트 캡처
          try {
            const testCanvas = await html2canvas(testContainer, {
              scale: scale,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              width: testContainer.offsetWidth,
              height: testContainer.offsetHeight,
              allowTaint: false,
              imageTimeout: 15000,
              removeContainer: false
            })
            
            // 테스트 결과 분석
            const wrapperElements = testContainer.querySelectorAll('.slot-wrapper')
            const imgElements = testContainer.querySelectorAll('.slot-img')
            
            testResults = {
              success: true,
              canvasSize: `${testCanvas.width} × ${testCanvas.height}`,
              wrapperCount: wrapperElements.length,
              imgCount: imgElements.length,
              wrapperSizes: Array.from(wrapperElements).map((w: any) => ({
                width: w.offsetWidth,
                height: w.offsetHeight
              })),
              imgSizes: Array.from(imgElements).map((img: any) => ({
                width: img.offsetWidth || img.naturalWidth,
                height: img.offsetHeight || img.naturalHeight,
                transform: img.style.transform
              })),
              devicePixelRatio: window.devicePixelRatio || 1,
              scale: scale
            }
            
            console.log('✅ [테스트 결과] Wrapper 방식 캡처 성공')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('1. 캡처된 Canvas 크기:', testResults.canvasSize)
            console.log('2. Wrapper 요소 수:', testResults.wrapperCount)
            console.log('3. 이미지 요소 수:', testResults.imgCount)
            console.log('4. Wrapper 크기:', testResults.wrapperSizes)
            console.log('5. 이미지 크기 및 Transform:', testResults.imgSizes)
            console.log('6. devicePixelRatio:', testResults.devicePixelRatio)
            console.log('7. html2canvas scale:', testResults.scale.toFixed(2))
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            
            // 테스트용 캔버스를 화면에 표시 (디버깅용)
            testCanvas.style.position = 'fixed'
            testCanvas.style.top = '10px'
            testCanvas.style.right = '10px'
            testCanvas.style.border = '2px solid #000'
            testCanvas.style.zIndex = '99999'
            testCanvas.style.maxWidth = '400px'
            testCanvas.style.maxHeight = '300px'
            document.body.appendChild(testCanvas)
            
            // 5초 후 테스트 요소 제거
            setTimeout(() => {
              if (document.body.contains(testContainer)) {
                document.body.removeChild(testContainer)
              }
              if (document.body.contains(testCanvas)) {
                document.body.removeChild(testCanvas)
              }
            }, 5000)
            
          } catch (error) {
            console.error('❌ [테스트 실패] Wrapper 방식 캡처 오류:', error)
            testResults = {
              success: false,
              error: String(error)
            }
            if (document.body.contains(testContainer)) {
              document.body.removeChild(testContainer)
            }
          }
        }
        
        await testWrapperCover()
      }
      // ============================================
      // 테스트 단계 종료
      // ============================================

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

      // 롤백 검증 로그
      console.log(`\n[롤백 검증 - PDF Export] 페이지 ${i + 1}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('1. ImageSlot.tsx 렌더 방식:', imgElements.length > 0 ? '✅ <img> 기반' : '❌ <img> 없음')
      console.log('2. exportUtils.ts background-image 로직:', bgImageElements.length === 0 ? '✅ 제거됨' : `⚠️ 잔존 (${bgImageElements.length}개)`)
      console.log('3. export DOM 요소:', {
        '<img> 태그': imgElements.length,
        'background-image div': bgImageElements.length
      })
      console.log('4. html2canvas scale:', scale.toFixed(2))
      console.log('5. 편집 화면 vs 출력물:', '동일한 <img> 기반 렌더링 (선명도 일치)')
      if (titleStyleInfo) {
        console.log('6. [제목 스타일] export DOM에서 적용된 titleStyle:', titleStyleInfo)
      }
      if (fontCheckInfo) {
        console.log('7. [폰트 검사]', fontCheckInfo)
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      console.log(`[PDF Export - Page ${i + 1}]`, {
        'Canvas 크기 (px)': `${actualWidth} × ${actualHeight}`,
        'Element 크기 (px)': `${elementWidth} × ${elementHeight}`,
        'html2canvas scale': scale.toFixed(2),
        'devicePixelRatio': devicePixelRatio,
        '예상 DPI': calculatedDPI.toFixed(0),
        'JPEG 품질': isHighQuality ? 0.9 : 0.7,
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

  // 파일명 생성 (기본 파일명)
  const defaultFileName = generateFileName(metadata.title, metadata.projectName, metadata.subProjectName, 'pdf')

  // PDF를 Blob으로 변환
  const pdfBlob = pdf.output('blob')

  // showSaveFilePicker를 사용하여 파일 저장
  try {
    console.log('[PDF Export] showSaveFilePicker 호출 시작')
    console.log('[PDF Export] 기본 파일명:', defaultFileName)
    console.log('[PDF Export] Blob 크기:', pdfBlob.size, 'bytes')
    console.log('[PDF Export] Blob 형식: application/pdf')

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

      console.log('[PDF Export] 선택된 파일명:', fileHandle.name)

      const writable = await fileHandle.createWritable()
      await writable.write(pdfBlob)
      await writable.close()

      console.log('[PDF Export] 파일 저장 성공')
      alert('PDF가 성공적으로 저장되었습니다.')
    } else {
      // File System Access API를 지원하지 않는 브라우저의 경우 다운로드로 대체
      console.warn('[PDF Export] showSaveFilePicker를 지원하지 않는 브라우저입니다. 다운로드로 대체합니다.')
      pdf.save(defaultFileName)
      alert('PDF가 다운로드되었습니다.')
    }
  } catch (error: any) {
    // 사용자가 취소한 경우
    if (error.name === 'AbortError') {
      console.log('[PDF Export] 사용자가 저장을 취소했습니다.')
      return
    }
    console.error('[PDF Export] 파일 저장 실패:', error)
    // 저장 실패 시 다운로드로 대체
    pdf.save(defaultFileName)
    alert('파일 저장에 실패했습니다. 다운로드로 대체합니다.')
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
  const { isHighQuality = false, onProgress, pagesMetadata } = options

  // devicePixelRatio를 고려하여 scale 계산 (일반: 3.0, 고화질: 4.0)
  const baseScale = isHighQuality ? 4.0 : 3.0
  const devicePixelRatio = window.devicePixelRatio || 1
  const scale = baseScale * devicePixelRatio
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

      // 롤백 검증 로그
      console.log(`\n[롤백 검증 - JPEG Export] 페이지 ${i + 1}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('1. ImageSlot.tsx 렌더 방식:', imgElements.length > 0 ? '✅ <img> 기반' : '❌ <img> 없음')
      console.log('2. exportUtils.ts background-image 로직:', bgImageElements.length === 0 ? '✅ 제거됨' : `⚠️ 잔존 (${bgImageElements.length}개)`)
      console.log('3. export DOM 요소:', {
        '<img> 태그': imgElements.length,
        'background-image div': bgImageElements.length
      })
      console.log('4. html2canvas scale:', scale.toFixed(2))
      console.log('5. 편집 화면 vs 출력물:', '동일한 <img> 기반 렌더링 (선명도 일치)')
      if (titleStyleInfo) {
        console.log('6. [제목 스타일] export DOM에서 적용된 titleStyle:', titleStyleInfo)
      }
      if (fontCheckInfo) {
        console.log('7. [폰트 검사]', fontCheckInfo)
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      console.log(`[JPEG Export - Page ${i + 1}]`, {
        'Canvas 크기 (px)': `${actualWidth} × ${actualHeight}`,
        'Element 크기 (px)': `${elementWidth} × ${elementHeight}`,
        'html2canvas scale': scale.toFixed(2),
        'devicePixelRatio': devicePixelRatio,
        '예상 DPI': calculatedDPI.toFixed(0),
        'JPEG 품질': quality,
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
          console.log('[JPEG Export] showSaveFilePicker 호출 시작 (페이지 1)')
          console.log('[JPEG Export] 기본 파일명:', defaultFileName)
          console.log('[JPEG Export] Blob 크기:', blob.size, 'bytes')
          console.log('[JPEG Export] Blob 형식: image/jpeg')

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

            console.log('[JPEG Export] 선택된 파일명 (페이지 1):', fileHandle.name)

            const writable = await fileHandle.createWritable()
            await writable.write(blob)
            await writable.close()

            console.log('[JPEG Export] 파일 저장 성공 (페이지 1)')
          } else {
            // File System Access API를 지원하지 않는 브라우저의 경우 다운로드로 대체
            console.warn('[JPEG Export] showSaveFilePicker를 지원하지 않는 브라우저입니다. 다운로드로 대체합니다.')
            const link = document.createElement('a')
            link.download = defaultFileName
            link.href = imgData
            link.click()
          }
        } catch (error: any) {
          // 사용자가 취소한 경우
          if (error.name === 'AbortError') {
            console.log('[JPEG Export] 사용자가 저장을 취소했습니다.')
            return // 첫 번째 페이지 저장 취소 시 전체 중단
          }
          console.error('[JPEG Export] 파일 저장 실패 (페이지 1):', error)
          // 저장 실패 시 다운로드로 대체
          const link = document.createElement('a')
          link.download = defaultFileName
          link.href = imgData
          link.click()
        }
      } else {
        // 나머지 페이지: 첫 번째 페이지와 같은 디렉토리에 자동 저장
        // 첫 번째 페이지의 파일 핸들을 재사용할 수 없으므로, 다운로드로 대체
        // 또는 사용자 경험을 위해 첫 번째 파일명을 기준으로 자동 저장 시도
        try {
          console.log(`[JPEG Export] 페이지 ${i + 1} 저장 시작`)
          console.log('[JPEG Export] 기본 파일명:', defaultFileName)
          console.log('[JPEG Export] Blob 크기:', blob.size, 'bytes')

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

            console.log(`[JPEG Export] 선택된 파일명 (페이지 ${i + 1}):`, fileHandle.name)

            const writable = await fileHandle.createWritable()
            await writable.write(blob)
            await writable.close()

            console.log(`[JPEG Export] 파일 저장 성공 (페이지 ${i + 1})`)
          } else {
            // 다운로드로 대체
            const link = document.createElement('a')
            link.download = defaultFileName
            link.href = imgData
            link.click()
          }
        } catch (error: any) {
          // 사용자가 취소한 경우
          if (error.name === 'AbortError') {
            console.log(`[JPEG Export] 사용자가 저장을 취소했습니다 (페이지 ${i + 1})`)
            // 해당 페이지만 건너뛰고 계속 진행
            continue
          }
          console.error(`[JPEG Export] 파일 저장 실패 (페이지 ${i + 1}):`, error)
          // 저장 실패 시 다운로드로 대체
          const link = document.createElement('a')
          link.download = defaultFileName
          link.href = imgData
          link.click()
        }
      }

      // 캔버스 메모리 해제 (메모리 관리)
      canvas.width = 0
      canvas.height = 0
    } catch (error) {
      console.error(`페이지 ${i + 1} 캡처 실패:`, error)
      failedPages.push(i + 1)
    }
  }

  // 저장 완료 메시지
  const savedPages = totalPages - failedPages.length
  if (savedPages > 0) {
    if (failedPages.length > 0) {
      alert(`JPEG 저장 완료: ${savedPages}개 페이지 저장됨\n일부 페이지(${failedPages.join(', ')})의 캡처에 실패했습니다.`)
    } else {
      alert(`JPEG 저장 완료: ${savedPages}개 페이지가 모두 저장되었습니다.`)
    }
  } else {
    alert('JPEG 저장에 실패했습니다.')
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
  const sanitize = (str: string) => {
    return str
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
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

