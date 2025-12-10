import ImageSlot from './ImageSlot'
import { ImageSlot as ImageSlotType } from '../stores/editorStore'

interface FourCutPortraitLayoutProps {
  slots: ImageSlotType[]
  onImageSelect: (slotId: string, file: File) => void
  onDelete: (slotId: string) => void
  onEdit: (slotId: string) => void
  onAddDescription: (slotId: string, description: string) => void
  onFitModeChange?: (slotId: string, fitMode: 'fill' | 'cover') => void
  imageAreaWidth: number
  imageAreaHeight: number
}

function FourCutPortraitLayout({
  slots,
  onImageSelect,
  onDelete,
  onEdit,
  onAddDescription,
  onFitModeChange,
  imageAreaWidth: _imageAreaWidth,
  imageAreaHeight: _imageAreaHeight
}: FourCutPortraitLayoutProps) {
  // 세로형 4컷: 2열 × 2행
  // 슬롯 간격: 너비 간격 15px, 높이 간격 80px
  // 슬롯 크기는 이미지 영역 내에서 가능한 범위에서 최대 크기로 자동 조정
  const GAP_WIDTH_PX = 15 // 너비 간격 15px
  const GAP_HEIGHT_PX = 80 // 높이 간격 80px
  const slotWidth = `calc((100% - ${GAP_WIDTH_PX}px) / 2)`

  return (
    <div className="flex flex-col w-full h-full" style={{ gap: `${GAP_HEIGHT_PX}px`, minHeight: '0', overflow: 'hidden' }}>
      {/* 첫 번째 행: 슬롯 0, 1 */}
      <div className="flex flex-row w-full" style={{ gap: `${GAP_WIDTH_PX}px`, minWidth: '0', overflow: 'hidden', flex: '1 1 0' }}>
        {slots.slice(0, 2).map((slot) => (
          <ImageSlot
            key={slot.id}
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
            hideFitModeToggle={true}
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
        ))}
      </div>
      {/* 두 번째 행: 슬롯 2, 3 */}
      <div className="flex flex-row w-full" style={{ gap: `${GAP_WIDTH_PX}px`, minWidth: '0', overflow: 'hidden', flex: '1 1 0' }}>
        {slots.slice(2, 4).map((slot) => (
          <ImageSlot
            key={slot.id}
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
            hideFitModeToggle={true}
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
        ))}
      </div>
    </div>
  )
}

export default FourCutPortraitLayout

