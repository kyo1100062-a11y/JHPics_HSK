import ImageSlot from './ImageSlot'
import { ImageSlot as ImageSlotType } from '../stores/editorStore'

interface TwoCutLandscapeLayoutProps {
  slots: ImageSlotType[]
  onImageSelect: (slotId: string, file: File) => void
  onDelete: (slotId: string) => void
  onEdit: (slotId: string) => void
  onAddDescription: (slotId: string, description: string) => void
  onFitModeChange?: (slotId: string, fitMode: 'fill' | 'cover') => void
  imageAreaWidth: number
  imageAreaHeight: number
}

function TwoCutLandscapeLayout({
  slots,
  onImageSelect,
  onDelete,
  onEdit,
  onAddDescription,
  onFitModeChange,
  imageAreaWidth,
  imageAreaHeight
}: TwoCutLandscapeLayoutProps) {
  // 가로형 2컷: 2열 × 1행
  // 슬롯 간격: 2mm
  // 슬롯 크기는 이미지 영역 내에서 가능한 범위에서 최대 크기로 자동 조정
  const gap = 2 // 2mm (약 7.56px at 96 DPI)
  const slotWidth = `calc((100% - ${gap * 3.7795}px) / 2)`

  return (
    <div className="flex flex-row w-full h-full" style={{ gap: `${gap * 3.7795}px`, minWidth: '0', overflow: 'hidden' }}>
      {slots.map((slot) => (
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
  )
}

export default TwoCutLandscapeLayout


