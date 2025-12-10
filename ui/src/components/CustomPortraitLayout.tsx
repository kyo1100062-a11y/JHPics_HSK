import ImageSlot from './ImageSlot'
import { ImageSlot as ImageSlotType } from '../stores/editorStore'

interface CustomPortraitLayoutProps {
  slots: ImageSlotType[]
  onImageSelect: (slotId: string, file: File) => void
  onDelete: (slotId: string) => void
  onEdit: (slotId: string) => void
  onAddDescription: (slotId: string, description: string) => void
  onFitModeChange?: (slotId: string, fitMode: 'fill' | 'cover') => void
  onAddSlot?: () => void // 슬롯 추가 버튼 핸들러
  onRemoveSlot?: (slotId: string) => void // 슬롯 삭제 핸들러
  imageAreaWidth: number
  imageAreaHeight: number
}

function CustomPortraitLayout({
  slots,
  onImageSelect,
  onDelete,
  onEdit,
  onAddDescription,
  onFitModeChange,
  onAddSlot,
  onRemoveSlot,
  imageAreaWidth: _imageAreaWidth,
  imageAreaHeight: _imageAreaHeight
}: CustomPortraitLayoutProps) {
  // 커스텀 템플릿: 사용자가 자유롭게 슬롯을 배치
  // 최대 16개 슬롯 지원
  const GAP_PX = 15 // 고정 간격 15px
  
  // custom-portrait 슬롯 행 규칙
  // 2개: 1열*2행 (2행)
  // 5~9개: 3행, 10~12개: 4행, 13~16개: 5행
  // 그 외: 자율적으로 계산
  const getRowsForPortrait = (slotCount: number): number => {
    if (slotCount === 0) return 1
    if (slotCount === 2) return 2 // 1열*2행
    if (slotCount >= 5 && slotCount <= 9) return 3
    if (slotCount >= 10 && slotCount <= 12) return 4
    if (slotCount >= 13 && slotCount <= 16) return 5
    // 그 외: 자율적으로 계산 (1개는 1행, 3~4개는 2행)
    if (slotCount === 1) return 1
    if (slotCount <= 4) return 2
    return Math.ceil(Math.sqrt(slotCount))
  }
  
  const rows = getRowsForPortrait(slots.length)
  const cols = slots.length > 0 ? Math.ceil(slots.length / rows) : 1
  const slotWidth = `calc((100% - ${(cols - 1) * GAP_PX}px) / ${cols})`
  
  // 세로형 4행(슬롯 10-12개)에서 텍스트 영역 보호를 위한 최소 높이 계산
  // 텍스트 영역 21px + 이미지 최소 높이 100px = 121px (여유 있게 130px)
  const isProblematicRows = rows === 4 && slots.length >= 10 && slots.length <= 12
  const minSlotHeight = isProblematicRows ? '130px' : '200px'

  return (
    <div className="relative w-full h-full">
      {/* 슬롯 추가 버튼: 이미지 영역 우측 상단에 고정 배치 */}
      {onAddSlot && slots.length < 16 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddSlot()
          }}
          className="absolute top-0 right-0 z-20 px-3 py-1.5 bg-neoblue text-white rounded-lg hover:bg-neoblue/80 transition-colors text-sm shadow-lg"
          style={{ marginTop: '8px', marginRight: '8px' }}
        >
          + 슬롯 추가
        </button>
      )}
      
      <div className="flex flex-col w-full h-full" style={{ gap: `${GAP_PX}px`, minHeight: '0', overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex flex-row w-full"
          style={{ gap: `${GAP_PX}px`, minWidth: '0', overflow: 'hidden', flex: '1 1 0' }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => {
            const slotIndex = rowIndex * cols + colIndex
            const slot = slots[slotIndex]
            
            if (!slot) {
              return <div key={`empty-${rowIndex}-${colIndex}`} style={{ width: slotWidth, flex: '1 1 0' }} />
            }
            
            return (
              <div key={slot.id} className="relative" style={{ width: slotWidth, flex: '1 1 0', minHeight: isProblematicRows ? minSlotHeight : 'auto' }}>
                <ImageSlot
                  slotId={slot.id}
                  imageUrl={slot.imageUrl}
                  description={slot.description}
                  scale={slot.scale}
                  rotation={slot.rotation}
                  fitMode={slot.fitMode}
                  onImageSelect={(file) => onImageSelect(slot.id, file)}
                  onDelete={() => onDelete(slot.id)}
                  onEdit={() => onEdit(slot.id)}
                  onAddDescription={(description) => onAddDescription(slot.id, description)}
                  onFitModeChange={onFitModeChange ? (fitMode) => onFitModeChange(slot.id, fitMode) : undefined}
                  isCustomTemplate={true}
                  style={{
                    width: '100%',
                    height: '100%',
                    minWidth: '200px',
                    minHeight: isProblematicRows ? minSlotHeight : '200px',
                    flex: '1 1 0',
                    flexShrink: 0,
                    flexBasis: '0',
                    overflow: 'visible' // 텍스트 영역 보호를 위해 visible로 변경 (하위에서 제어)
                  }}
                />
                {/* 커스텀 템플릿 슬롯 삭제 버튼 (슬롯 우측 상단) */}
                {onRemoveSlot && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveSlot(slot.id)
                    }}
                    className="absolute top-1 right-1 z-10 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center text-xs"
                    style={{ fontSize: '12px' }}
                    title="슬롯 삭제"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
      </div>
    </div>
  )
}

export default CustomPortraitLayout

