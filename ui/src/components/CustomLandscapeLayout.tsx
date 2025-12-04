import ImageSlot from './ImageSlot'
import { ImageSlot as ImageSlotType } from '../stores/editorStore'

interface CustomLandscapeLayoutProps {
  slots: ImageSlotType[]
  onImageSelect: (slotId: string, file: File) => void
  onDelete: (slotId: string) => void
  onEdit: (slotId: string) => void
  onAddDescription: (slotId: string, description: string) => void
  imageAreaWidth: number
  imageAreaHeight: number
}

function CustomLandscapeLayout({
  slots,
  onImageSelect,
  onDelete,
  onEdit,
  onAddDescription,
  imageAreaWidth,
  imageAreaHeight
}: CustomLandscapeLayoutProps) {
  // 커스텀 템플릿: 사용자가 자유롭게 슬롯을 배치
  // 현재는 기본 그리드 레이아웃으로 시작 (향후 드래그/리사이즈 기능 추가 예정)
  // 최대 16개 슬롯 지원
  const gap = 2 // 2mm (약 7.56px at 96 DPI)
  
  // 슬롯이 없으면 빈 영역 표시
  if (slots.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-2xl mb-2">+</div>
          <div className="text-sm">슬롯 추가 버튼을 클릭하여 시작하세요</div>
        </div>
      </div>
    )
  }

  // 기본 그리드 레이아웃 (4열 × 4행 최대)
  // 슬롯 개수에 따라 자동으로 그리드 크기 조정
  const cols = Math.ceil(Math.sqrt(slots.length))
  const rows = Math.ceil(slots.length / cols)
  const slotWidth = `calc((100% - ${(cols - 1) * gap * 3.7795}px) / ${cols})`
  const slotHeight = `calc((100% - ${(rows - 1) * gap * 3.7795}px) / ${rows})`

  return (
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
              <ImageSlot
                key={slot.id}
                slotId={slot.id}
                imageUrl={slot.imageUrl}
                description={slot.description}
                scale={slot.scale}
                rotation={slot.rotation}
                onImageSelect={(file) => onImageSelect(slot.id, file)}
                onDelete={() => onDelete(slot.id)}
                onEdit={() => onEdit(slot.id)}
                onAddDescription={(description) => onAddDescription(slot.id, description)}
                style={{
                  width: slotWidth,
                  height: '100%',
                  minWidth: '200px',
                  minHeight: '200px',
                  flex: '1 1 0',
                  flexShrink: 0,
                  flexBasis: '0',
                  overflow: 'hidden'
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default CustomLandscapeLayout

