import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import { TemplateType, EditorPage } from '../stores/editorStore'
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
import { logger } from './logger'

interface RenderResult {
  container: HTMLDivElement
  roots: Root[]
  canvasElements: HTMLElement[]
}

/**
 * 출력을 위해 모든 페이지를 임시 DOM에 렌더링
 */
export async function renderAllPagesForExport(
  pages: EditorPage[],
  template: TemplateType | null,
  imageAreaDimensions: { width: number; height: number }
): Promise<RenderResult> {
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

  // 레이아웃 컴포넌트 선택
  const getLayoutComponent = (template: TemplateType | null) => {
    switch (template) {
      case 'twoCut-portrait':
        return TwoCutPortraitLayout
      case 'twoCut-landscape':
        return TwoCutLandscapeLayout
      case 'fourCut-portrait':
        return FourCutPortraitLayout
      case 'fourCut-landscape':
        return FourCutLandscapeLayout
      case 'sixCut-portrait':
        return SixCutPortraitLayout
      case 'sixCut-landscape':
        return SixCutLandscapeLayout
      case 'custom-portrait':
        return CustomPortraitLayout
      case 'custom-landscape':
        return CustomLandscapeLayout
      default:
        return TwoCutPortraitLayout
    }
  }

  // 각 페이지를 순차적으로 렌더링
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const pageContainer = document.createElement('div')
    pageContainer.id = `export-page-${page.id}`
    container.appendChild(pageContainer)

    // React Root 생성
    const root = createRoot(pageContainer)
    roots.push(root)

    const LayoutComponent = getLayoutComponent(template)
    
    root.render(
      <div id={`canvas-${page.id}`}>
        <A4Canvas isLandscape={isLandscape}>
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

  // 모든 페이지가 렌더링될 때까지 대기
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
      // 이미지 로드 대기
      await waitForImages(bgWhiteElement, i)
      
      // 출력용 스타일 적용
      applyExportStyles(bgWhiteElement, template, page)
      
      canvasElements.push(bgWhiteElement)
    }
  }

  // 모든 페이지가 완전히 렌더링될 때까지 최종 대기
  await new Promise((resolve) => setTimeout(resolve, 300))

  return { container, roots, canvasElements }
}

/**
 * 이미지 로드 대기
 */
async function waitForImages(bgWhiteElement: HTMLElement, pageIndex: number): Promise<void> {
  const images = bgWhiteElement.querySelectorAll('img')
  const imageLoadPromises = Array.from(images).map((img) => {
    return new Promise<void>((resolve) => {
      const checkImageLoaded = () => {
        return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0
      }
      
      if (checkImageLoaded()) {
        setTimeout(() => resolve(), 50)
        return
      }
      
      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          if (img.naturalWidth > 0) {
            resolve()
          } else {
            logger.warn(`페이지 ${pageIndex + 1}의 이미지 로드 타임아웃:`, img.src)
            resolve()
          }
        }
      }, 10000)
      
      const onLoadHandler = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          setTimeout(() => resolve(), 100)
        }
      }
      
      const onErrorHandler = () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          logger.warn(`페이지 ${pageIndex + 1}의 이미지 로드 실패:`, img.src)
          resolve()
        }
      }
      
      img.addEventListener('load', onLoadHandler, { once: true })
      img.addEventListener('error', onErrorHandler, { once: true })
      
      if (img.src.startsWith('blob:')) {
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
    await new Promise((resolve) => setTimeout(resolve, 200))
  } catch (error) {
    logger.warn(`페이지 ${pageIndex + 1}의 이미지 로드 중 오류:`, error)
  }

  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 50)
      })
    })
  })
}

/**
 * 출력용 스타일 적용
 */
function applyExportStyles(
  bgWhiteElement: HTMLElement,
  template: TemplateType | null,
  page: EditorPage
): void {
  const isLandscape = template?.includes('-landscape') ?? false
  const a4WidthPx = isLandscape ? 1123 : 794
  const a4HeightPx = isLandscape ? 794 : 1123
  
  // A4Canvas 크기 강제 설정
  bgWhiteElement.style.width = `${a4WidthPx}px`
  bgWhiteElement.style.height = `${a4HeightPx}px`
  bgWhiteElement.style.maxWidth = `${a4WidthPx}px`
  bgWhiteElement.style.maxHeight = `${a4HeightPx}px`
  bgWhiteElement.style.aspectRatio = isLandscape ? '297 / 210' : '210 / 297'
  bgWhiteElement.style.flexShrink = '0'
  
  // 빈 슬롯 UI 숨기기
  const emptySlotUIs = bgWhiteElement.querySelectorAll('div[class*="border-dashed"]')
  emptySlotUIs.forEach((emptySlot) => {
    const emptySlotElement = emptySlot as HTMLElement
    const parentSlot = emptySlotElement.parentElement
    
    if (parentSlot && !parentSlot.querySelector('img')) {
      emptySlotElement.style.display = 'none'
      parentSlot.style.background = '#ffffff'
      parentSlot.style.border = 'none'
    }
  })
  
  // 스타일 변경 반영 대기
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 스타일 적용 완료
    })
  })
}

/**
 * 임시 DOM 정리
 */
export function cleanupExportContainer(container: HTMLDivElement, roots: Root[]): void {
  roots.forEach((root) => {
    try {
      root.unmount()
    } catch (error) {
      logger.warn('Root unmount 실패:', error)
    }
  })

  if (container && container.parentNode) {
    container.parentNode.removeChild(container)
  }
}

