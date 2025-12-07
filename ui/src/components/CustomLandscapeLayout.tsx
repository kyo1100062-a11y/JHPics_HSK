import ImageSlot from './ImageSlot'
import { ImageSlot as ImageSlotType } from '../stores/editorStore'

interface CustomLandscapeLayoutProps {
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

function CustomLandscapeLayout({
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
}: CustomLandscapeLayoutProps) {
  // 커스텀 템플릿: 사용자가 자유롭게 슬롯을 배치
  // 최대 16개 슬롯 지원
  // custom-landscape는 기존 그대로 적용 (자율적으로 계산)
  const gap = 2 // 2mm (약 7.56px at 96 DPI)
  
  // 기본 그리드 레이아웃 (4열 × 4행 최대)
  // 슬롯 개수에 따라 자동으로 그리드 크기 조정
  const cols = slots.length > 0 ? Math.ceil(Math.sqrt(slots.length)) : 1
  const rows = slots.length > 0 ? Math.ceil(slots.length / cols) : 1
  const slotWidth = `calc((100% - ${(cols - 1) * gap * 3.7795}px) / ${cols})`
  const _slotHeight = `calc((100% - ${(rows - 1) * gap * 3.7795}px) / ${rows})`

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
      
      <div className="flex flex-col w-full h-full" style={{ gap: `${gap * 3.7795}px`, minHeight: '0', overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex flex-row w-full"
          style={{ gap: `${gap * 3.7795}px`, minWidth: '0', overflow: 'hidden', flex: '1 1 0' }}
        >
          {Array.from({ length: cols }).map((_, colIndex) => {
            const slotIndex = rowIndex * cols + colIndex
            const slot = slots[slotIndex]
            
            if (!slot) {
              return <div key={`empty-${rowIndex}-${colIndex}`} style={{ width: slotWidth, flex: '1 1 0' }} />
            }
            
            return (
              <div key={slot.id} className="relative" style={{ width: slotWidth, flex: '1 1 0' }}>
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
                    minHeight: '200px',
                    flex: '1 1 0',
                    flexShrink: 0,
                    flexBasis: '0',
                    overflow: 'hidden'
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

export default CustomLandscapeLayout

