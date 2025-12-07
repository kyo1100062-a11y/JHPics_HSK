interface ImageSlotActionsProps {
  onEdit: () => void
  onDelete: () => void
  onAddDescription: () => void
  onToggleFitMode?: () => void
  hasDescription?: boolean
  fitMode?: 'fill' | 'cover'
}

function ImageSlotActions({ 
  onEdit, 
  onDelete, 
  onAddDescription, 
  onToggleFitMode,
  hasDescription: _hasDescription,
  fitMode = 'fill'
}: ImageSlotActionsProps) {
  return (
    <div
      className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 z-10"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onEdit}
        className="px-3 py-1.5 bg-neoblue text-white rounded hover:bg-neoblue/80 transition-colors text-sm"
      >
        편집
      </button>
      <button
        onClick={onDelete}
        className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
      >
        삭제
      </button>
      <button
        onClick={onAddDescription}
        className="px-3 py-1.5 bg-accent-mint text-deep-blue rounded hover:bg-accent-mint/80 transition-colors text-sm"
      >
        내용추가
      </button>
      {fitMode === 'fill' && onToggleFitMode && (
        <button
          onClick={onToggleFitMode}
          className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
        >
          비율유지
        </button>
      )}
    </div>
  )
}

export default ImageSlotActions

