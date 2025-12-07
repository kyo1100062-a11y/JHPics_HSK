import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { createRoot, Root } from 'react-dom/client'
import { useEditorStore, TemplateType } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import A4Canvas from '../components/A4Canvas'
import MetadataArea from '../components/MetadataArea'
import TwoCutPortraitLayout from '../components/TwoCutPortraitLayout'
import TwoCutLandscapeLayout from '../components/TwoCutLandscapeLayout'
import FourCutPortraitLayout from '../components/FourCutPortraitLayout'
import FourCutLandscapeLayout from '../components/FourCutLandscapeLayout'
import SixCutPortraitLayout from '../components/SixCutPortraitLayout'
import SixCutLandscapeLayout from '../components/SixCutLandscapeLayout'
import CustomPortraitLayout from '../components/CustomPortraitLayout'
import CustomLandscapeLayout from '../components/CustomLandscapeLayout'
import ImageEditModal from '../components/ImageEditModal'
import { exportToPDF, exportToJPEG } from '../utils/exportUtils'

function Editor() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const templateParam = searchParams.get('template') as TemplateType | null

  const {
    template,
    pages,
    currentPageIndex,
    setTemplate,
    addPage,
    deletePage,
    setCurrentPage,
    updatePageMetadata,
    updateTitleStyle,
    updateSlot,
    setSlotImage,
    removeSlotImage,
    addSlot,
    removeSlot,
    reset
  } = useEditorStore()

  const { projectList, loadProjects } = useProjectStore()

  const currentPage = pages[currentPageIndex]
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [isHighQuality, setIsHighQuality] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  // 텍스트 입력 debounce를 위한 ref
  const descriptionTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})

  // URL 파라미터에서 템플릿 로드
  useEffect(() => {
    if (templateParam && templateParam !== template) {
      setTemplate(templateParam)
    }
  }, [templateParam, template, setTemplate])

  // 프로젝트 리스트 로드
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // 템플릿이 없으면 홈으로 리다이렉트
  useEffect(() => {
    if (!templateParam) {
      navigate('/')
    }
  }, [templateParam, navigate])

  // 저장된 출력 경로는 자동 로드하지 않음 (매번 선택하도록 변경)

  // 이미지 영역은 CSS로 자동 계산되므로 고정값 사용
  const imageAreaDimensions = useMemo(() => {
    // 세로형 A4 크기: 210mm × 297mm
    // 가로형 A4 크기: 297mm × 210mm
    // 캔버스 마진: 20mm (상하좌우)
    // OuterFrame 내부 여백: 8mm (상하좌우)
    // 세로형 이미지 영역: (210 - 20*2 - 8*2) × (297 - 20*2 - 8*2) = 154mm × 241mm
    // 가로형 이미지 영역: (297 - 20*2 - 8*2) × (210 - 20*2 - 8*2) = 241mm × 154mm
    // 96 DPI 기준: 1mm ≈ 3.7795px
    const isLandscape = template?.includes('-landscape') ?? false
    const width = (isLandscape ? 241 : 154) * 3.7795 // 가로형: 약 910px, 세로형: 약 582px
    const height = (isLandscape ? 154 : 241) * 3.7795 // 가로형: 약 582px, 세로형: 약 910px
    return { width, height }
  }, [template])

  const handleImageSelect = (slotId: string, file: File) => {
    if (!currentPage) return

    // 기존 이미지 URL이 있으면 해제 (메모리 누수 방지)
    const existingSlot = currentPage.slots.find(s => s.id === slotId)
    if (existingSlot?.imageUrl && existingSlot.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(existingSlot.imageUrl)
    }

    const url = URL.createObjectURL(file)
    setSlotImage(currentPage.id, slotId, file, url)
  }

  const handleSlotDelete = (slotId: string) => {
    if (!currentPage) return

    // 이미지 삭제 전 URL 해제 (메모리 누수 방지)
    const slot = currentPage.slots.find(s => s.id === slotId)
    if (slot?.imageUrl && slot.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(slot.imageUrl)
    }

    removeSlotImage(currentPage.id, slotId)
  }

  const handleSlotEdit = (slotId: string) => {
    setEditingSlotId(slotId)
  }

  const handleEditApply = (slotId: string, scale: number, rotation: number) => {
    if (!currentPage) return
    updateSlot(currentPage.id, slotId, { scale, rotation })
    setEditingSlotId(null)
  }

  const handleEditCancel = () => {
    setEditingSlotId(null)
  }

  // 텍스트 입력 debounce 최적화: 즉시 업데이트는 하되, 리렌더링 최소화
  const handleAddDescription = useCallback((slotId: string, description: string) => {
    if (!currentPage) return
    
    // '__REMOVE__' 값이 오면 즉시 처리 (debounce 없이)
    if (description === '__REMOVE__') {
      // 기존 타이머 취소
      if (descriptionTimeoutRef.current[slotId]) {
        clearTimeout(descriptionTimeoutRef.current[slotId])
        delete descriptionTimeoutRef.current[slotId]
      }
      updateSlot(currentPage.id, slotId, { description: undefined })
      return
    }
    
    // 일반 텍스트 입력은 debounce 적용 (100ms로 단축하여 더 자연스러운 입력 경험)
    if (descriptionTimeoutRef.current[slotId]) {
      clearTimeout(descriptionTimeoutRef.current[slotId])
    }
    
    descriptionTimeoutRef.current[slotId] = setTimeout(() => {
      updateSlot(currentPage.id, slotId, { description })
      delete descriptionTimeoutRef.current[slotId]
    }, 100)
  }, [currentPage, updateSlot])

  const handleFitModeChange = useCallback((slotId: string, fitMode: 'fill' | 'cover') => {
    if (!currentPage) return
    updateSlot(currentPage.id, slotId, { fitMode })
  }, [currentPage, updateSlot])
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      Object.values(descriptionTimeoutRef.current).forEach(timer => {
        clearTimeout(timer)
      })
      descriptionTimeoutRef.current = {}
    }
  }, [])

  // 현재화면 초기화 핸들러
  const handleReset = () => {
    if (!template) return

    // 확인 대화상자
    if (!confirm('모든 작업 내용이 삭제됩니다. 정말 초기화하시겠습니까?')) {
      return
    }

    // 모든 페이지의 blob URL 해제 (메모리 누수 방지)
    pages.forEach((page) => {
      page.slots.forEach((slot) => {
        if (slot.imageUrl && slot.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(slot.imageUrl)
        }
      })
    })

    // 템플릿을 유지하면서 초기화 (새로운 빈 페이지 하나 생성)
    setTemplate(template)
  }

  // 절충안 3번: 출력 시 모든 페이지를 임시 DOM에 렌더링하는 헬퍼 함수
  const renderAllPagesForExport = async (): Promise<{
    container: HTMLDivElement
    roots: Root[]
    canvasElements: HTMLElement[]
  }> => {
    // 가로형/세로형에 따라 컨테이너 크기 설정
    const isLandscape = template?.includes('-landscape') ?? false
    const containerWidth = isLandscape ? '1123px' : '794px'
    
    // 임시 컨테이너 생성 (화면 밖에 위치)
    const container = document.createElement('div')
    container.id = 'export-temp-container'
    container.className = 'export-mode'
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: ${containerWidth};
      opacity: 0;
      pointer-events: none;
    `
    document.body.appendChild(container)

    const roots: Root[] = []
    const canvasElements: HTMLElement[] = []

    // 각 페이지를 순차적으로 렌더링
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const pageContainer = document.createElement('div')
      pageContainer.id = `export-page-${page.id}`
      container.appendChild(pageContainer)

      // React Root 생성
      const root = createRoot(pageContainer)
      roots.push(root)

      // 페이지 컴포넌트 렌더링 (출력용 - 편집 UI 제거, 빈 슬롯은 하얀 배경으로 표시)
      let LayoutComponent
      switch (template) {
        case 'twoCut-portrait':
          LayoutComponent = TwoCutPortraitLayout
          break
        case 'twoCut-landscape':
          LayoutComponent = TwoCutLandscapeLayout
          break
        case 'fourCut-portrait':
          LayoutComponent = FourCutPortraitLayout
          break
        case 'fourCut-landscape':
          LayoutComponent = FourCutLandscapeLayout
          break
        case 'sixCut-portrait':
          LayoutComponent = SixCutPortraitLayout
          break
        case 'sixCut-landscape':
          LayoutComponent = SixCutLandscapeLayout
          break
        case 'custom-portrait':
          LayoutComponent = CustomPortraitLayout
          break
        case 'custom-landscape':
          LayoutComponent = CustomLandscapeLayout
          break
        default:
          LayoutComponent = TwoCutPortraitLayout
      }
      
      root.render(
        <div id={`canvas-${page.id}`}>
          <A4Canvas isLandscape={template?.includes('-landscape') ?? false}>
            <MetadataArea metadata={page.metadata} titleStyle={page.titleStyle} />
            <div className="w-full flex-1" style={{ minHeight: '300px' }}>
              <LayoutComponent
                slots={page.slots}
                onImageSelect={() => {}}
                onDelete={() => {}}
                onEdit={() => {}}
                onAddDescription={() => {}}
                onFitModeChange={() => {}}
                imageAreaWidth={imageAreaDimensions.width}
                imageAreaHeight={imageAreaDimensions.height}
              />
            </div>
          </A4Canvas>
        </div>
      )
    }

    // 모든 페이지가 렌더링될 때까지 대기 (이미지 로드 및 레이아웃 계산 완료 대기)
    // 첫 번째 페이지 렌더링 안정화를 위해 충분한 대기 시간 확보
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    // 추가로 레이아웃 재계산을 위한 requestAnimationFrame 대기
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100)
        })
      })
    })

    // 각 페이지의 캔버스 요소 수집 및 이미지 로드 확인
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const canvasId = `canvas-${page.id}`
      const canvasElement = document.getElementById(canvasId)
      const bgWhiteElement = canvasElement?.querySelector('.bg-white') as HTMLElement

      if (bgWhiteElement) {
        // 해당 페이지의 모든 이미지가 로드될 때까지 대기 (더 확실한 확인)
        const images = bgWhiteElement.querySelectorAll('img')
        const imageLoadPromises = Array.from(images).map((img) => {
          return new Promise<void>((resolve, reject) => {
            // 이미지가 완전히 로드되었는지 확인하는 함수
            const checkImageLoaded = () => {
              // naturalWidth와 naturalHeight가 0보다 크면 이미지가 로드된 것
              if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                return true
              }
              return false
            }
            
            // 이미 로드된 경우 즉시 resolve
            if (checkImageLoaded()) {
              // 추가로 렌더링 완료를 위해 짧은 대기
              setTimeout(() => resolve(), 50)
              return
            }
            
            // 이미지 로드 대기
            let resolved = false
            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true
                // 타임아웃이어도 naturalWidth가 있으면 진행
                if (img.naturalWidth > 0) {
                  resolve()
                } else {
                  console.warn(`페이지 ${i + 1}의 이미지 로드 타임아웃:`, img.src)
                  resolve() // 타임아웃이어도 계속 진행
                }
              }
            }, 10000) // 최대 10초 대기 (증가)
            
            // onload 이벤트 리스너
            const onLoadHandler = () => {
              if (!resolved) {
                resolved = true
                clearTimeout(timeout)
                // 추가로 렌더링 완료를 위해 짧은 대기
                setTimeout(() => resolve(), 100)
              }
            }
            
            // onerror 이벤트 리스너
            const onErrorHandler = () => {
              if (!resolved) {
                resolved = true
                clearTimeout(timeout)
                console.warn(`페이지 ${i + 1}의 이미지 로드 실패:`, img.src)
                resolve() // 에러가 나도 계속 진행
              }
            }
            
            img.addEventListener('load', onLoadHandler, { once: true })
            img.addEventListener('error', onErrorHandler, { once: true })
            
            // 이미지가 blob URL인 경우 추가 확인
            if (img.src.startsWith('blob:')) {
              // blob URL 이미지는 추가 대기 시간 필요
              setTimeout(() => {
                if (checkImageLoaded() && !resolved) {
                  resolved = true
                  clearTimeout(timeout)
                  img.removeEventListener('load', onLoadHandler)
                  img.removeEventListener('error', onErrorHandler)
                  setTimeout(() => resolve(), 100)
                }
              }, 200)
            }
          })
        })

        try {
          await Promise.all(imageLoadPromises)
          // 모든 이미지 로드 후 추가 안정화 대기
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
          console.warn(`페이지 ${i + 1}의 이미지 로드 중 오류:`, error)
        }

        // 브라우저 렌더링 완료를 위해 추가 대기 (레이아웃 재계산 보장)
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 50) // 추가 안정화 대기
            })
          })
        })
        
        // 롤백 검증: export DOM의 <img> 태그 확인
        const imagesBeforeStyle = bgWhiteElement.querySelectorAll('img.image-wrapper')
        const bgImageDivs = Array.from(bgWhiteElement.querySelectorAll('.image-wrapper')).filter(w => {
          const el = w as HTMLElement
          return el.tagName.toLowerCase() === 'div' && el.style.backgroundImage
        })
        
        if (imagesBeforeStyle.length > 0 || bgImageDivs.length > 0) {
          console.log(`\n[롤백 검증] 페이지 ${i + 1} - export DOM 렌더링 구조 (이미지 로드 직후)`)
          console.log(`총 ${imagesBeforeStyle.length}개의 <img> 태그 발견`)
          console.log(`총 ${bgImageDivs.length}개의 background-image div 발견 (잔존 여부 확인)`)
          
          if (imagesBeforeStyle.length > 0) {
            imagesBeforeStyle.forEach((img, imgIndex) => {
              const imgElement = img as HTMLElement
              const imgSrc = imgElement.getAttribute('src') || ''
              const objectFit = imgElement.style.objectFit || window.getComputedStyle(imgElement).objectFit || 'fill'
              const matchingSlot = page.slots.find(slot => slot.imageUrl === imgSrc)
              
              console.log(`  <img> #${imgIndex + 1}:`, {
                'src': imgSrc.substring(0, 50) + '...',
                'object-fit': objectFit,
                'slot.fitMode': matchingSlot?.fitMode || 'fill',
                '렌더링 방식': '<img> 기반 (롤백 완료)'
              })
            })
          }
          
          if (bgImageDivs.length > 0) {
            console.warn(`⚠️ 경고: ${bgImageDivs.length}개의 background-image div가 잔존합니다.`)
          }
          
          console.log(`[롤백 검증] 페이지 ${i + 1} - export DOM 렌더링 구조 확인 완료\n`)
        }
        
        // 출력용: A4Canvas 크기를 명시적으로 강제 설정 (모든 페이지 동일한 크기 보장)
        const isLandscape = template?.includes('-landscape') ?? false
        const a4WidthPx = isLandscape ? 1123 : 794 // 가로형: 297mm, 세로형: 210mm at 96 DPI
        const a4HeightPx = isLandscape ? 794 : 1123 // 가로형: 210mm, 세로형: 297mm at 96 DPI
        
        // A4Canvas 최상위 요소 크기 강제 설정
        const a4Canvas = bgWhiteElement
        if (a4Canvas) {
          a4Canvas.style.width = `${a4WidthPx}px`
          a4Canvas.style.height = `${a4HeightPx}px`
          a4Canvas.style.maxWidth = `${a4WidthPx}px`
          a4Canvas.style.maxHeight = `${a4HeightPx}px`
          a4Canvas.style.aspectRatio = isLandscape ? '297 / 210' : '210 / 297'
          a4Canvas.style.flexShrink = '0'
        }
        
        // 캔버스 마진 컨테이너 크기 강제 설정
        const marginContainer = bgWhiteElement.querySelector('div[style*="padding: 20mm"]') as HTMLElement
        if (marginContainer) {
          marginContainer.style.width = '100%'
          marginContainer.style.height = '100%'
          marginContainer.style.boxSizing = 'border-box'
        }
        
        // 출력용: A4Canvas의 flex 레이아웃이 제대로 작동하도록 보장
        // OuterFrame 내부의 flex 컨테이너 확인
        const outerFrame = bgWhiteElement.querySelector('div[class*="border-[2px]"][class*="border-black"]') as HTMLElement
        if (outerFrame) {
          outerFrame.style.display = 'flex'
          outerFrame.style.flexDirection = 'column'
          outerFrame.style.width = '100%'
          outerFrame.style.height = '100%'
          outerFrame.style.boxSizing = 'border-box'
        }
        
        // 메타데이터 영역과 이미지 영역이 flex로 제대로 배치되도록 확인
        const metadataArea = bgWhiteElement.querySelector('div[class*="text-left"]') as HTMLElement
        const imageArea = bgWhiteElement.querySelector('div[class*="w-full"][class*="flex-1"]') as HTMLElement
        
        if (metadataArea) {
          metadataArea.style.flexShrink = '0'
          metadataArea.style.width = '100%'
        }
        
        if (imageArea) {
          imageArea.style.flex = '1 1 0'
          imageArea.style.width = '100%'
          imageArea.style.minHeight = '0' // flex-1이 제대로 작동하도록
          imageArea.style.overflow = 'hidden'
        }
        
        // 출력용: 모든 슬롯에 overflow: hidden 강제 적용 (슬롯 크기 벗어남 방지)
        const allSlots = bgWhiteElement.querySelectorAll('div[class*="flex"][class*="flex-col"]')
        allSlots.forEach((slot) => {
          const slotElement = slot as HTMLElement
          // 슬롯 컨테이너에 overflow: hidden 강제 적용
          slotElement.style.overflow = 'hidden'
          slotElement.style.position = 'relative'
          slotElement.style.contain = 'layout style paint'
          
          // 텍스트 입력 영역 찾기 및 스타일 조정
          const textAreas = slotElement.querySelectorAll('textarea')
          textAreas.forEach((textarea) => {
            const textareaElement = textarea as HTMLElement
            const computedStyle = window.getComputedStyle(textareaElement)
            
            // 텍스트 영역 컨테이너 찾기
            const textContainer = textareaElement.parentElement
            if (textContainer) {
              const containerStyle = window.getComputedStyle(textContainer)
              const containerHeight = containerStyle.height
              const isCustomTemplate = containerHeight === '21px' || containerStyle.maxHeight === '21px'
              const isNormalTemplate = containerHeight === '32px' || containerStyle.maxHeight === '32px'
              
              if (isCustomTemplate || isNormalTemplate) {
                // 커스텀 템플릿 또는 일반 템플릿: 출력 시 textarea를 div로 변환하여 텍스트를 실제 노드로 렌더링
                const textValue = textareaElement.value || textareaElement.textContent || ''
                if (textValue.trim()) {
                  // 기존에 추가된 출력용 textDiv가 있다면 제거 (중복 방지)
                  const existingTextDivs = Array.from(textContainer.children).filter(
                    (child) => child.tagName.toLowerCase() === 'div' && child !== textareaElement
                  )
                  existingTextDivs.forEach((div) => div.remove())
                  
                  // textarea의 스타일 복사
                  const computedStyle = window.getComputedStyle(textareaElement)
                  const fontSize = computedStyle.fontSize || (isCustomTemplate ? '11px' : '13px')
                  const lineHeight = computedStyle.lineHeight || '13px'
                  const textAlign = computedStyle.textAlign || 'center'
                  const color = computedStyle.color || '#333333'
                  const fontFamily = computedStyle.fontFamily || 'sans-serif'
                  
                  // textarea를 숨기고 div로 대체
                  textareaElement.style.display = 'none'
                  
                  // 새로운 div 생성 (실제 텍스트 노드)
                  const textDiv = document.createElement('div')
                  textDiv.textContent = textValue
                  textDiv.style.width = '100%'
                  textDiv.style.height = isCustomTemplate ? '20px' : '30px'
                  textDiv.style.minHeight = isCustomTemplate ? '20px' : '30px'
                  textDiv.style.maxHeight = isCustomTemplate ? '20px' : '30px'
                  textDiv.style.fontSize = fontSize
                  textDiv.style.lineHeight = lineHeight
                  textDiv.style.textAlign = textAlign
                  textDiv.style.color = color
                  textDiv.style.fontFamily = fontFamily
                  textDiv.style.overflow = 'visible'
                  textDiv.style.whiteSpace = 'nowrap'
                  textDiv.style.padding = '0'
                  textDiv.style.margin = '0'
                  textDiv.style.border = '0'
                  textDiv.style.display = 'flex'
                  textDiv.style.alignItems = 'flex-start' // 위쪽 정렬
                  textDiv.style.justifyContent = 'center'
                  textDiv.style.paddingTop = '0' // 상단 여유 최소화
                  
                  // 컨테이너에 div 추가
                  textContainer.appendChild(textDiv)
                  
                  // 컨테이너도 조정 (border 포함하여 고정 높이 유지, 위쪽 정렬)
                  const containerHeightValue = isCustomTemplate ? '21px' : '32px'
                  textContainer.style.height = containerHeightValue
                  textContainer.style.minHeight = containerHeightValue
                  textContainer.style.maxHeight = containerHeightValue
                  textContainer.style.alignItems = 'flex-start' // 위쪽 정렬
                  textContainer.style.display = 'flex'
                }
              } else {
                // 기존 로직 유지 (혹시 모를 다른 경우)
                textareaElement.style.overflow = 'visible'
                textareaElement.style.whiteSpace = 'pre-wrap'
                textareaElement.style.wordWrap = 'break-word'
                
                const scrollHeight = textareaElement.scrollHeight
                if (scrollHeight > 16) {
                  textareaElement.style.height = `${scrollHeight}px`
                  textareaElement.style.minHeight = `${scrollHeight}px`
                }
              }
            }
          })
          
          // 이미지 컨테이너 찾기 및 편집 화면 선명도 비교 로그
          const imageContainers = slotElement.querySelectorAll('div[class*="bg-gray-100"]')
          imageContainers.forEach((container) => {
            const containerElement = container as HTMLElement
            containerElement.style.overflow = 'hidden'
            containerElement.style.position = 'relative'
            containerElement.style.contain = 'layout style paint'
            
            // 롤백 검증: 편집 DOM의 <img> 태그 확인
            const images = containerElement.querySelectorAll('img.image-wrapper')
            if (images.length > 0) {
              console.log(`\n[롤백 검증] 페이지 ${i + 1} - 편집 DOM 렌더링 구조`)
              console.log(`총 ${images.length}개의 <img> 태그 발견 (편집 화면: <img> 기반 렌더링)`)
              images.forEach((img, imgIndex) => {
                const imgElement = img as HTMLElement
                const imgSrc = imgElement.getAttribute('src') || ''
                const objectFit = imgElement.style.objectFit || window.getComputedStyle(imgElement).objectFit || 'fill'
                const matchingSlot = page.slots.find(slot => slot.imageUrl === imgSrc)
                console.log(`  <img> #${imgIndex + 1}:`, {
                  'src': imgSrc.substring(0, 50) + '...',
                  'object-fit': objectFit,
                  'slot.fitMode': matchingSlot?.fitMode || 'fill',
                  '렌더링 방식': '<img> 기반 (롤백 완료)'
                })
              })
              console.log(`[롤백 검증] 페이지 ${i + 1} - 편집 DOM 렌더링 구조 확인 완료\n`)
            }
          })
        })
        
        // 출력용: 빈 슬롯의 UI 요소 숨기기 (하얀 배경만 표시)
        // 빈 슬롯 UI 찾기 (border-dashed가 있는 div, 이미지가 없는 경우)
        const emptySlotUIs = bgWhiteElement.querySelectorAll('div[class*="border-dashed"]')
        emptySlotUIs.forEach((emptySlot) => {
          const emptySlotElement = emptySlot as HTMLElement
          const parentSlot = emptySlotElement.parentElement
          
          // 이미지가 있는지 확인 (같은 슬롯 내에 이미지가 없으면 빈 슬롯)
          if (parentSlot && !parentSlot.querySelector('img')) {
            // 빈 슬롯 UI 전체 숨기기
            emptySlotElement.style.display = 'none'
            
            // 부모 슬롯 컨테이너에 하얀 배경 설정
            parentSlot.style.background = '#ffffff'
            parentSlot.style.border = 'none'
            // 슬롯의 높이와 공간은 유지 (flex 레이아웃 유지)
          }
        })
        
        // objectFit 등 스타일 적용 후 브라우저 렌더링 반영을 위한 대기
        // 스타일 변경이 브라우저에 반영되기 전에 캡처되는 것을 방지
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve(undefined)
            })
          })
        })
        
        canvasElements.push(bgWhiteElement)
      }
    }

    // 모든 페이지가 완전히 렌더링될 때까지 최종 대기
    await new Promise((resolve) => setTimeout(resolve, 300))

    return { container, roots, canvasElements }
  }

  // 임시 DOM 정리 함수
  const cleanupExportContainer = (container: HTMLDivElement, roots: Root[]) => {
    // 모든 React Root 언마운트
    roots.forEach((root) => {
      try {
        root.unmount()
      } catch (error) {
        console.warn('Root unmount 실패:', error)
      }
    })

    // 컨테이너 제거
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }

  const handleExportPDF = async () => {
    if (!currentPage || isExporting) return

    setIsExporting(true)
    let exportContainer: HTMLDivElement | null = null
    let exportRoots: Root[] = []

    try {
      // 절충안 3번: 모든 페이지를 임시 DOM에 렌더링
      const { container, roots, canvasElements } = await renderAllPagesForExport()
      exportContainer = container
      exportRoots = roots

      if (canvasElements.length === 0) {
        // 정리 후 에러 반환
        if (exportContainer && exportRoots.length > 0) {
          cleanupExportContainer(exportContainer, exportRoots)
        }
        alert('캔버스를 찾을 수 없습니다.')
        setIsExporting(false)
        return
      }

      if (canvasElements.length !== pages.length) {
        console.warn(`일부 페이지(${pages.length - canvasElements.length}개)를 찾지 못했습니다.`)
      }

      // 각 페이지의 메타데이터를 배열로 전달 (PDF는 첫 번째 페이지만 사용하지만, 향후 확장 가능)
      await exportToPDF(canvasElements, pages[0].metadata, {
        isHighQuality,
        template: template || undefined,
        onProgress: (current, total) => {
          console.log(`${current}/${total} 페이지 처리 중...`)
        }
      })
    } catch (error) {
      console.error('PDF 내보내기 실패:', error)
      alert('PDF 내보내기 중 오류가 발생했습니다.')
    } finally {
      // 임시 DOM 정리 (항상 실행)
      if (exportContainer && exportRoots.length > 0) {
        cleanupExportContainer(exportContainer, exportRoots)
      }
      setIsExporting(false)
    }
  }

  const handleExportJPEG = async () => {
    if (!currentPage || isExporting) return

    setIsExporting(true)
    let exportContainer: HTMLDivElement | null = null
    let exportRoots: Root[] = []

    try {
      // 절충안 3번: 모든 페이지를 임시 DOM에 렌더링
      const { container, roots, canvasElements } = await renderAllPagesForExport()
      exportContainer = container
      exportRoots = roots

      if (canvasElements.length === 0) {
        // 정리 후 에러 반환
        if (exportContainer && exportRoots.length > 0) {
          cleanupExportContainer(exportContainer, exportRoots)
        }
        alert('캔버스를 찾을 수 없습니다.')
        setIsExporting(false)
        return
      }

      if (canvasElements.length !== pages.length) {
        console.warn(`일부 페이지(${pages.length - canvasElements.length}개)를 찾지 못했습니다.`)
      }

      // 각 페이지의 메타데이터를 배열로 전달 (JPEG는 각 페이지별로 파일명 생성)
      await exportToJPEG(canvasElements, pages[0].metadata, {
        isHighQuality,
        template: template || undefined,
        pagesMetadata: pages.map((p) => p.metadata), // 각 페이지별 메타데이터 전달
        onProgress: (current, total) => {
          console.log(`${current}/${total} 페이지 처리 중...`)
        }
      })
    } catch (error) {
      console.error('JPEG 내보내기 실패:', error)
      alert('JPEG 내보내기 중 오류가 발생했습니다.')
    } finally {
      // 임시 DOM 정리 (항상 실행)
      if (exportContainer && exportRoots.length > 0) {
        cleanupExportContainer(exportContainer, exportRoots)
      }
      setIsExporting(false)
    }
  }

  if (!template || !currentPage) {
    return (
      <div className="min-h-screen bg-deep-blue flex items-center justify-center">
        <div className="text-white">템플릿을 불러오는 중...</div>
      </div>
    )
  }

  // 템플릿이 없으면 홈으로 리다이렉트 (이미 위에서 처리됨)

  return (
    <div className="min-h-screen bg-deep-blue">
      <div className="container mx-auto px-4 py-8">
        {/* 상단 입력 영역 - 테두리 박스 */}
        <div className="mb-6 bg-deep-blue border border-soft-blue rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-soft-blue mb-2 text-sm">제목</label>
              <input
                type="text"
                value={currentPage.metadata.title}
                onChange={(e) =>
                  updatePageMetadata(currentPage.id, { title: e.target.value })
                }
                className="w-full px-4 py-2 bg-deep-blue border border-soft-blue rounded-lg text-white focus:outline-none focus:border-neoblue"
                placeholder="현장확인 사진"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-soft-blue mb-2 text-sm">사업명</label>
              <div className="relative">
                <input
                  type="text"
                  list="project-list"
                  value={currentPage.metadata.projectName}
                  onChange={(e) =>
                    updatePageMetadata(currentPage.id, { projectName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-deep-blue border border-soft-blue rounded-lg text-white focus:outline-none focus:border-neoblue"
                  placeholder="사업 선택"
                />
                <datalist id="project-list">
                  {projectList.map((project, index) => (
                    <option key={index} value={project} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-soft-blue mb-2 text-sm">보조사업자</label>
              <input
                type="text"
                value={currentPage.metadata.subProjectName}
                onChange={(e) =>
                  updatePageMetadata(currentPage.id, { subProjectName: e.target.value })
                }
                className="w-full px-4 py-2 bg-deep-blue border border-soft-blue rounded-lg text-white focus:outline-none focus:border-neoblue"
                placeholder="보조사업자 입력"
              />
            </div>
            <div>
              <label className="block text-soft-blue mb-2 text-sm">담당자</label>
              <input
                type="text"
                value={currentPage.metadata.manager}
                onChange={(e) =>
                  updatePageMetadata(currentPage.id, { manager: e.target.value })
                }
                className="w-full px-4 py-2 bg-deep-blue border border-soft-blue rounded-lg text-white focus:outline-none focus:border-neoblue"
                placeholder="담당자 입력"
              />
            </div>
          </div>
        </div>

        {/* 페이지 네비게이션 - 테두리 박스 */}
        <div className="mb-6 bg-deep-blue border border-soft-blue rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPage(index)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    index === currentPageIndex
                      ? 'bg-neoblue text-white'
                      : 'bg-soft-blue/20 text-soft-blue hover:bg-soft-blue/30'
                  }`}
                >
                  페이지 {index + 1}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {pages.length > 1 && (
                <button
                  onClick={() => deletePage(currentPage.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  현재 페이지 삭제
                </button>
              )}
              <button
                onClick={addPage}
                disabled={pages.length >= 10}
                className="px-4 py-2 bg-neoblue text-white rounded-lg hover:bg-neoblue/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>+</span>
                <span>추가</span>
              </button>
            </div>
          </div>
        </div>

        {/* 메인 편집 영역 */}
        <div className="flex gap-6">
          {/* A4 캔버스 영역 (좌측) */}
          <div className="flex-1">
            <div id={`canvas-${currentPage.id}`}>
              <A4Canvas isLandscape={template?.includes('-landscape') ?? false}>
                <MetadataArea metadata={currentPage.metadata} titleStyle={currentPage.titleStyle} />
                <div className="w-full flex-1" style={{ minHeight: '300px' }}>
                  {(() => {
                    let LayoutComponent
                    switch (template) {
                      case 'twoCut-portrait':
                        LayoutComponent = TwoCutPortraitLayout
                        break
                      case 'twoCut-landscape':
                        LayoutComponent = TwoCutLandscapeLayout
                        break
                      case 'fourCut-portrait':
                        LayoutComponent = FourCutPortraitLayout
                        break
                      case 'fourCut-landscape':
                        LayoutComponent = FourCutLandscapeLayout
                        break
                      case 'sixCut-portrait':
                        LayoutComponent = SixCutPortraitLayout
                        break
                      case 'sixCut-landscape':
                        LayoutComponent = SixCutLandscapeLayout
                        break
                      case 'custom-portrait':
                        LayoutComponent = CustomPortraitLayout
                        break
                      case 'custom-landscape':
                        LayoutComponent = CustomLandscapeLayout
                        break
                      default:
                        LayoutComponent = TwoCutPortraitLayout
                    }
                    const Layout = LayoutComponent
                    const isCustomTemplate = template === 'custom-portrait' || template === 'custom-landscape'
                    return (
                      <Layout
                        slots={currentPage.slots}
                        onImageSelect={handleImageSelect}
                        onDelete={handleSlotDelete}
                        onEdit={handleSlotEdit}
                        onAddDescription={handleAddDescription}
                        onFitModeChange={handleFitModeChange}
                        onAddSlot={isCustomTemplate ? () => addSlot(currentPage.id) : undefined}
                        onRemoveSlot={isCustomTemplate ? (slotId: string) => removeSlot(currentPage.id, slotId) : undefined}
                        imageAreaWidth={imageAreaDimensions.width}
                        imageAreaHeight={imageAreaDimensions.height}
                      />
                    )
                  })()}
                </div>
              </A4Canvas>
            </div>
          </div>

          {/* 편집 모달 */}
          {editingSlotId && currentPage && (() => {
            const slot = currentPage.slots.find((s) => s.id === editingSlotId)
            if (!slot || !slot.imageUrl) return null
            return (
              <ImageEditModal
                isOpen={!!editingSlotId}
                imageUrl={slot.imageUrl}
                currentScale={slot.scale}
                currentRotation={slot.rotation}
                onApply={(scale, rotation) => handleEditApply(editingSlotId, scale, rotation)}
                onCancel={handleEditCancel}
              />
            )
          })()}

          {/* 우측 사이드바 (출력 옵션) */}
          <div className="w-64 flex-shrink-0 space-y-4">
            {/* 제목 스타일 옵션 */}
            <div className="bg-deep-blue border border-soft-blue rounded-lg p-4">
              <h3 className="text-white font-bold mb-4">제목 스타일 옵션</h3>
              <div className="space-y-3">
                {/* 정렬 방식 */}
                <div>
                  <label className="block text-soft-blue mb-2 text-sm">정렬 방식</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => currentPage && updateTitleStyle(currentPage.id, { align: 'left' })}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                        currentPage?.titleStyle.align === 'left'
                          ? 'bg-neoblue border-neoblue text-white'
                          : 'bg-deep-blue border-soft-blue text-soft-blue hover:border-neoblue'
                      }`}
                      title="왼쪽 정렬"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h8M4 18h16"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => currentPage && updateTitleStyle(currentPage.id, { align: 'center' })}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                        currentPage?.titleStyle.align === 'center'
                          ? 'bg-neoblue border-neoblue text-white'
                          : 'bg-deep-blue border-soft-blue text-soft-blue hover:border-neoblue'
                      }`}
                      title="가운데 정렬"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M8 12h8M4 18h16"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => currentPage && updateTitleStyle(currentPage.id, { align: 'right' })}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all ${
                        currentPage?.titleStyle.align === 'right'
                          ? 'bg-neoblue border-neoblue text-white'
                          : 'bg-deep-blue border-soft-blue text-soft-blue hover:border-neoblue'
                      }`}
                      title="오른쪽 정렬"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M12 12h8M4 18h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 글꼴 선택 */}
                <div>
                  <label className="block text-soft-blue mb-2 text-sm">글꼴</label>
                  <select
                    value={currentPage?.titleStyle.fontFamily || 'sans-serif'}
                    onChange={(e) => currentPage && updateTitleStyle(currentPage.id, { fontFamily: e.target.value })}
                    className="w-full px-3 py-2 bg-deep-blue border border-soft-blue rounded-lg text-white focus:outline-none focus:border-neoblue"
                  >
                    {/* 웹폰트 7개 */}
                    <option value="SUIT, sans-serif" style={{ fontFamily: "'SUIT', sans-serif" }}>SUIT</option>
                    <option value="Inter, sans-serif" style={{ fontFamily: "'Inter', sans-serif" }}>Inter</option>
                    <option value="'Noto Sans KR', sans-serif" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>Noto Sans KR</option>
                    <option value="Pretendard, sans-serif" style={{ fontFamily: "'Pretendard', sans-serif" }}>Pretendard</option>
                    <option value="'Nanum Gothic', sans-serif" style={{ fontFamily: "'Nanum Gothic', sans-serif" }}>Nanum Gothic</option>
                    <option value="'Nanum Myeongjo', serif" style={{ fontFamily: "'Nanum Myeongjo', serif" }}>Nanum Myeongjo</option>
                    <option value="'IBM Plex Sans KR', sans-serif" style={{ fontFamily: "'IBM Plex Sans KR', sans-serif" }}>IBM Plex Sans KR</option>
                    {/* Windows 기본 글꼴 13개 */}
                    <option value="'Malgun Gothic', sans-serif" style={{ fontFamily: "'Malgun Gothic', sans-serif" }}>Malgun Gothic</option>
                    <option value="'New Mingjo', serif" style={{ fontFamily: "'New Mingjo', serif" }}>New Mingjo</option>
                    <option value="Gulim, sans-serif" style={{ fontFamily: "'Gulim', sans-serif" }}>Gulim</option>
                    <option value="'Human Myeongjo', serif" style={{ fontFamily: "'Human Myeongjo', serif" }}>Human Myeongjo</option>
                    <option value="Gungsuh, serif" style={{ fontFamily: "'Gungsuh', serif" }}>Gungsuh</option>
                    <option value="Dotum, sans-serif" style={{ fontFamily: "'Dotum', sans-serif" }}>Dotum</option>
                    <option value="'HY MyeongJo', serif" style={{ fontFamily: "'HY MyeongJo', serif" }}>HY MyeongJo</option>
                    <option value="'HY Headline M', sans-serif" style={{ fontFamily: "'HY Headline M', sans-serif" }}>HY Headline M</option>
                    <option value="'Segoe UI', sans-serif" style={{ fontFamily: "'Segoe UI', sans-serif" }}>Segoe UI</option>
                    <option value="Arial, sans-serif" style={{ fontFamily: "'Arial', sans-serif" }}>Arial</option>
                    <option value="Tahoma, sans-serif" style={{ fontFamily: "'Tahoma', sans-serif" }}>Tahoma</option>
                    <option value="'Courier New', monospace" style={{ fontFamily: "'Courier New', monospace" }}>Courier New</option>
                    <option value="'Times New Roman', serif" style={{ fontFamily: "'Times New Roman', serif" }}>Times New Roman</option>
                  </select>
                </div>

                {/* 글꼴 크기 */}
                <div>
                  <label className="block text-soft-blue mb-2 text-sm">글꼴 크기</label>
                  <input
                    type="number"
                    min="8"
                    max="72"
                    value={currentPage?.titleStyle.fontSize || 19}
                    onChange={(e) => {
                      const size = parseInt(e.target.value, 10)
                      if (!isNaN(size) && currentPage) {
                        updateTitleStyle(currentPage.id, { fontSize: size })
                      }
                    }}
                    className="w-full px-3 py-2 bg-deep-blue border border-soft-blue rounded-lg text-white focus:outline-none focus:border-neoblue"
                  />
                </div>

                {/* 진하게 여부 */}
                <div>
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={currentPage?.titleStyle.bold || false}
                      onChange={(e) => currentPage && updateTitleStyle(currentPage.id, { bold: e.target.checked })}
                      className="rounded"
                    />
                    <span>진하게</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-deep-blue border border-soft-blue rounded-lg p-4">
              <h3 className="text-white font-bold mb-4">출력 옵션</h3>
              <div className="space-y-3">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="w-full px-4 py-2 bg-neoblue text-white rounded-lg hover:bg-neoblue/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? '처리 중...' : 'PDF 내보내기'}
                </button>
                <button
                  onClick={handleExportJPEG}
                  disabled={isExporting}
                  className="w-full px-4 py-2 bg-neoblue text-white rounded-lg hover:bg-neoblue/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? '처리 중...' : 'JPEG 내보내기'}
                </button>
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={isHighQuality}
                    onChange={(e) => setIsHighQuality(e.target.checked)}
                    className="rounded"
                  />
                  <span>고화질 출력</span>
                </label>
              </div>
            </div>

            {/* 현재화면 초기화 박스 */}
            <div className="bg-deep-blue border border-soft-blue rounded-lg p-4">
              <h3 className="text-white font-bold mb-4">작업 관리</h3>
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                현재화면 초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Editor
