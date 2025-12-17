import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEditorStore } from '../stores/editorStore'
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
import Custom2OriginalRatioPortraitLayout from '../components/Custom2OriginalRatioPortraitLayout'
import Custom2OriginalRatioLandscapeLayout from '../components/Custom2OriginalRatioLandscapeLayout'
import ImageEditModal from '../components/ImageEditModal'
import { exportToPDF, exportToJPEG } from '../utils/exportUtils'
import { logger } from '../utils/logger'
import { showToast } from '../components/Toast'
import { isTemplateType, isCustom2Template } from '../utils/typeGuards'
import { renderAllPagesForExport, cleanupExportContainer } from '../utils/exportRenderUtils'
import type { Root } from 'react-dom/client'

function Editor() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const templateParamRaw = searchParams.get('template')
  const templateParam = templateParamRaw && isTemplateType(templateParamRaw) ? templateParamRaw : null

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
    removeSlot
  } = useEditorStore()

  const { projectList, loadProjects } = useProjectStore()

  const currentPage = pages[currentPageIndex]
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [isHighQuality, setIsHighQuality] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  // 텍스트 입력 debounce를 위한 ref
  const descriptionTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

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

  // Custom2 이미지 확정 핸들러 (Step 2: 자동 크롭 구현)
  const handleConfirmImagesForCustom2 = async () => {
    const page = currentPage
    if (!page || !isCustom2Template(template)) return

    const { id: pageId, slots } = page

    for (const slot of slots) {
      const hasImage = !!slot.imageUrl || !!slot.imageFile
      if (!hasImage) continue

      // 1) 실제 이미지 DOM 찾기 (Custom2의 ImageSlot에서 img에 data-slot-id 같은 식별자가 있다고 가정)
      const imgElement = document.querySelector<HTMLImageElement>(
        `img[data-slot-id="${slot.id}"]`
      )
      if (!imgElement) continue

      // 2) 이미지가 들어가는 wrapper (이미지 영역만)를 기준으로 rect 계산
      const imageWrapper = imgElement.closest('.image-wrapper') as HTMLElement | null
      const containerElement = imageWrapper || imgElement.parentElement
      if (!containerElement) continue

      const rect = containerElement.getBoundingClientRect()
      const slotWidth = rect.width
      const slotHeight = rect.height

      // 3) 원본 이미지 로드 (naturalWidth / naturalHeight 사용)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imgElement.src

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
      })

      const { naturalWidth, naturalHeight } = img
      if (!naturalWidth || !naturalHeight) continue

      // 4) cover 기준 scale 계산
      const exportScale = 3 // 필요에 따라 조정
      const canvasWidth = slotWidth * exportScale
      const canvasHeight = slotHeight * exportScale

      const coverScale = Math.max(
        canvasWidth / naturalWidth,
        canvasHeight / naturalHeight
      )

      const drawnWidth = naturalWidth * coverScale
      const drawnHeight = naturalHeight * coverScale
      const offsetX = (canvasWidth - drawnWidth) / 2
      const offsetY = (canvasHeight - drawnHeight) / 2

      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      // 회전 및 스케일 적용 (현재 편집 상태 반영)
      ctx.save()
      ctx.translate(canvasWidth / 2, canvasHeight / 2)
      ctx.rotate((slot.rotation * Math.PI) / 180)
      ctx.scale(slot.scale, slot.scale)
      ctx.translate(-canvasWidth / 2, -canvasHeight / 2)

      ctx.drawImage(
        img,
        offsetX,
        offsetY,
        drawnWidth,
        drawnHeight
      )

      ctx.restore()

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.9)

      // 5) slot 업데이트 (croppedImageUrl + isConfirmed)
      updateSlot(pageId, slot.id, {
        croppedImageUrl: croppedUrl,
        isConfirmed: true,
      })
    }

    console.log('[Custom2] 이미지 확정 완료 - 자동 크롭 적용')
    showToast('이미지 확정이 완료되었습니다.', 'success')
  }

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


  const handleExportPDF = async () => {
    if (!currentPage || isExporting) return

    // Custom2 템플릿에서 이미지 확정 여부 검사
    const hasUnconfirmedSlotsInCustom2 = pages.some((page) => {
      if (!isCustom2Template(template)) return false

      return page.slots.some((slot) => {
        const hasImage = !!slot.imageUrl || !!slot.imageFile
        const notConfirmed = !slot.isConfirmed || !slot.croppedImageUrl
        return hasImage && notConfirmed
      })
    })

    if (hasUnconfirmedSlotsInCustom2) {
      alert("커스텀2 템플릿에서는 출력 전에 반드시 '이미지 확정' 버튼을 눌러주세요.")
      return // 여기서 export 중단
    }

    setIsExporting(true)
    let exportContainer: HTMLDivElement | null = null
    let exportRoots: Root[] = []

    try {
      // 절충안 3번: 모든 페이지를 임시 DOM에 렌더링
      const { container, roots, canvasElements } = await renderAllPagesForExport(pages, template, imageAreaDimensions)
      exportContainer = container
      exportRoots = roots

      if (canvasElements.length === 0) {
        // 정리 후 에러 반환
        if (exportContainer && exportRoots.length > 0) {
          cleanupExportContainer(exportContainer, exportRoots)
        }
        showToast('캔버스를 찾을 수 없습니다.', 'error')
        setIsExporting(false)
        return
      }

      if (canvasElements.length !== pages.length) {
        logger.warn(`일부 페이지(${pages.length - canvasElements.length}개)를 찾지 못했습니다.`)
      }

      // 각 페이지의 메타데이터를 배열로 전달 (PDF는 첫 번째 페이지만 사용하지만, 향후 확장 가능)
      await exportToPDF(canvasElements, pages[0].metadata, {
        isHighQuality,
        template: template || undefined,
        onProgress: (current, total) => {
          logger.log(`${current}/${total} 페이지 처리 중...`)
        }
      })
    } catch (error) {
      logger.error('PDF 내보내기 실패:', error)
      showToast('PDF 내보내기 중 오류가 발생했습니다.', 'error')
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

    // Custom2 템플릿에서 이미지 확정 여부 검사
    const hasUnconfirmedSlotsInCustom2 = pages.some((page) => {
      if (!isCustom2Template(template)) return false

      return page.slots.some((slot) => {
        const hasImage = !!slot.imageUrl || !!slot.imageFile
        const notConfirmed = !slot.isConfirmed || !slot.croppedImageUrl
        return hasImage && notConfirmed
      })
    })

    if (hasUnconfirmedSlotsInCustom2) {
      alert("커스텀2 템플릿에서는 출력 전에 반드시 '이미지 확정' 버튼을 눌러주세요.")
      return // 여기서 export 중단
    }

    setIsExporting(true)
    let exportContainer: HTMLDivElement | null = null
    let exportRoots: Root[] = []

    try {
      // 절충안 3번: 모든 페이지를 임시 DOM에 렌더링
      const { container, roots, canvasElements } = await renderAllPagesForExport(pages, template, imageAreaDimensions)
      exportContainer = container
      exportRoots = roots

      if (canvasElements.length === 0) {
        // 정리 후 에러 반환
        if (exportContainer && exportRoots.length > 0) {
          cleanupExportContainer(exportContainer, exportRoots)
        }
        showToast('캔버스를 찾을 수 없습니다.', 'error')
        setIsExporting(false)
        return
      }

      if (canvasElements.length !== pages.length) {
        logger.warn(`일부 페이지(${pages.length - canvasElements.length}개)를 찾지 못했습니다.`)
      }

      // 각 페이지의 메타데이터를 배열로 전달 (JPEG는 각 페이지별로 파일명 생성)
      await exportToJPEG(canvasElements, pages[0].metadata, {
        isHighQuality,
        template: template || undefined,
        pagesMetadata: pages.map((p) => p.metadata), // 각 페이지별 메타데이터 전달
        onProgress: (current, total) => {
          logger.log(`${current}/${total} 페이지 처리 중...`)
        }
      })
    } catch (error) {
      logger.error('JPEG 내보내기 실패:', error)
      showToast('JPEG 내보내기 중 오류가 발생했습니다.', 'error')
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
                placeholder="현장확인사진"
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
                      case 'custom2-portrait':
                        LayoutComponent = Custom2OriginalRatioPortraitLayout
                        break
                      case 'custom2-landscape':
                        LayoutComponent = Custom2OriginalRatioLandscapeLayout
                        break
                      default:
                        LayoutComponent = TwoCutPortraitLayout
                    }
                    const Layout = LayoutComponent
                    const isCustomTemplate = template === 'custom-portrait' || template === 'custom-landscape' ||
                                             template === 'custom2-portrait' || template === 'custom2-landscape'
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
                {/* Custom2 전용 이미지 확정 버튼 */}
                {isCustom2Template(template) && (
                  <button
                    type="button"
                    onClick={handleConfirmImagesForCustom2}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    이미지 확정
                  </button>
                )}
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
