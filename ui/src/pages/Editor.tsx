import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { createRoot, Root } from 'react-dom/client'
import { useEditorStore, TemplateType } from '../stores/editorStore'
import { useProjectStore } from '../stores/projectStore'
import A4Canvas from '../components/A4Canvas'
import MetadataArea from '../components/MetadataArea'
import TwoCutPortraitLayout from '../components/TwoCutPortraitLayout'
import ImageEditModal from '../components/ImageEditModal'
import { exportToPDF, exportToJPEG } from '../utils/exportUtils'
import { selectDirectory } from '../utils/fileSystemUtils'

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
    updateSlot,
    setSlotImage,
    removeSlotImage,
    reset
  } = useEditorStore()

  const { projectList, loadProjects } = useProjectStore()

  const currentPage = pages[currentPageIndex]
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [isHighQuality, setIsHighQuality] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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
    // A4 크기: 210mm × 297mm
    // 캔버스 마진: 20mm (상하좌우)
    // OuterFrame 내부 여백: 8mm (상하좌우)
    // 실제 이미지 영역: (210 - 20*2 - 8*2) × (297 - 20*2 - 8*2) = 154mm × 241mm
    // 96 DPI 기준: 1mm ≈ 3.7795px
    const width = 154 * 3.7795 // 약 582px
    const height = 241 * 3.7795 // 약 910px
    return { width, height }
  }, [])

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

  const handleAddDescription = (slotId: string, description: string) => {
    if (!currentPage) return
    // '__REMOVE__' 값이 오면 undefined로 설정하여 입력란 제거
    const finalDescription = description === '__REMOVE__' ? undefined : description
    updateSlot(currentPage.id, slotId, { description: finalDescription })
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

  // 절충안 3번: 출력 시 모든 페이지를 임시 DOM에 렌더링하는 헬퍼 함수
  const renderAllPagesForExport = async (): Promise<{
    container: HTMLDivElement
    roots: Root[]
    canvasElements: HTMLElement[]
  }> => {
    // 임시 컨테이너 생성 (화면 밖에 위치)
    const container = document.createElement('div')
    container.id = 'export-temp-container'
    container.className = 'export-mode'
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 794px;
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
      root.render(
        <div id={`canvas-${page.id}`}>
          <A4Canvas>
            <MetadataArea metadata={page.metadata} />
            <div className="w-full flex-1" style={{ minHeight: '300px' }}>
              <TwoCutPortraitLayout
                slots={page.slots}
                onImageSelect={() => {}}
                onDelete={() => {}}
                onEdit={() => {}}
                onAddDescription={() => {}}
                imageAreaWidth={imageAreaDimensions.width}
                imageAreaHeight={imageAreaDimensions.height}
              />
            </div>
          </A4Canvas>
        </div>
      )
    }

    // 모든 페이지가 렌더링될 때까지 대기
    await new Promise((resolve) => setTimeout(resolve, 150))

    // 각 페이지의 캔버스 요소 수집 및 이미지 로드 확인
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      const canvasId = `canvas-${page.id}`
      const canvasElement = document.getElementById(canvasId)
      const bgWhiteElement = canvasElement?.querySelector('.bg-white') as HTMLElement

      if (bgWhiteElement) {
        // 해당 페이지의 모든 이미지가 로드될 때까지 대기
        const images = bgWhiteElement.querySelectorAll('img')
        const imageLoadPromises = Array.from(images).map((img) => {
          if (img.complete) {
            return Promise.resolve()
          }
          return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('이미지 로드 타임아웃'))
            }, 5000) // 최대 5초 대기
            
            img.onload = () => {
              clearTimeout(timeout)
              resolve()
            }
            img.onerror = () => {
              clearTimeout(timeout)
              resolve() // 에러가 나도 계속 진행
            }
          })
        })

        try {
          await Promise.all(imageLoadPromises)
        } catch (error) {
          console.warn(`페이지 ${i + 1}의 이미지 로드 중 오류:`, error)
        }

        // 브라우저 렌더링 완료를 위해 추가 대기
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        
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

    // 출력 버튼 클릭 시마다 항상 경로 선택 대화상자 표시
    const selectedHandle = await selectDirectory()
    if (!selectedHandle) {
      // 사용자가 취소한 경우 기존 방식(다운로드)으로 진행
    }
    
    const directoryHandle = selectedHandle

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
        directoryHandle: directoryHandle || undefined,
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

    // 출력 버튼 클릭 시마다 항상 경로 선택 대화상자 표시
    const selectedHandle = await selectDirectory()
    if (!selectedHandle) {
      // 사용자가 취소한 경우 기존 방식(다운로드)으로 진행
    }
    
    const directoryHandle = selectedHandle

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
        directoryHandle: directoryHandle || undefined,
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

  // 세로형 2컷만 지원 (나중에 확장)
  if (template !== 'twoCut-portrait') {
    return (
      <div className="min-h-screen bg-deep-blue flex items-center justify-center">
        <div className="text-white">현재는 세로형 2컷 템플릿만 지원합니다.</div>
      </div>
    )
  }

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
              <A4Canvas>
                <MetadataArea metadata={currentPage.metadata} />
                <div className="w-full flex-1" style={{ minHeight: '300px' }}>
                  <TwoCutPortraitLayout
                    slots={currentPage.slots}
                    onImageSelect={handleImageSelect}
                    onDelete={handleSlotDelete}
                    onEdit={handleSlotEdit}
                    onAddDescription={handleAddDescription}
                    imageAreaWidth={imageAreaDimensions.width}
                    imageAreaHeight={imageAreaDimensions.height}
                  />
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
