import { useState, useRef } from 'react'
import ImageSlotActions from './ImageSlotActions'

interface ImageSlotProps {
  slotId: string
  imageUrl?: string
  description?: string
  scale?: number
  rotation?: number
  onImageSelect: (file: File) => void
  onDelete: () => void
  onEdit: () => void
  onAddDescription: (description: string) => void
  className?: string
  style?: React.CSSProperties
}

function ImageSlot({
  slotId,
  imageUrl,
  description,
  scale = 1,
  rotation = 0,
  onImageSelect,
  onDelete,
  onEdit,
  onAddDescription,
  className = '',
  style = {}
}: ImageSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [fitMode, setFitMode] = useState<'fill' | 'cover'>('fill') // 기본값: 전체 표시 (왜곡 허용)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (!imageUrl) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 파일 검증
      if (file.size > 15 * 1024 * 1024) {
        alert('파일 크기는 15MB 이하여야 합니다')
        return
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('JPG, PNG, WEBP 형식만 지원됩니다')
        return
      }
      // 새 이미지 업로드 시 기본값으로 리셋
      setFitMode('fill')
      onImageSelect(file)
    }
    // 같은 파일을 다시 선택할 수 있도록 리셋
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > 15 * 1024 * 1024) {
        alert('파일 크기는 15MB 이하여야 합니다')
        return
      }
      // 새 이미지 업로드 시 기본값으로 리셋
      setFitMode('fill')
      onImageSelect(file)
    }
  }

  return (
    <div
      className={`relative ${className}`}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {imageUrl ? (
        <div className="w-full h-full flex flex-col" style={{ border: '1px dashed #000000' }}>
          <div
            className="bg-gray-100 relative overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{
              flex: description !== undefined && description && description.trim() ? '1 1 0' : '1 1 auto',
              minHeight: description !== undefined && description && description.trim() ? '200px' : 'auto'
            }}
          >
            <img
              src={imageUrl}
              alt="Slot"
              style={{
                width: '100%',
                height: '100%',
                objectFit: fitMode, // 'fill': 전체 표시 (왜곡 허용), 'cover': 비율 유지 (일부 잘림)
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
            />
            {isHovered && (
              <ImageSlotActions
                onEdit={onEdit}
                onDelete={onDelete}
                onAddDescription={() => {
                  // 내용추가 버튼 클릭 시 입력란 활성화
                  if (description === undefined) {
                    onAddDescription('')
                  }
                }}
                onToggleFitMode={() => {
                  // 비율유지 버튼 클릭 시 'cover'로 전환
                  setFitMode('cover')
                }}
                hasDescription={description !== undefined && description && description.trim() ? true : false}
                fitMode={fitMode}
              />
            )}
          </div>
          {description !== undefined && (
            <div className="flex-shrink-0 bg-white border-t border-gray-200 flex items-center justify-center" style={{ padding: '2px 4px' }}>
              <textarea
                value={description}
                onChange={(e) => {
                  const newValue = e.target.value
                  onAddDescription(newValue)
                }}
                onBlur={(e) => {
                  // 포커스가 벗어나면
                  if (e.target.value.trim()) {
                    // 내용이 있으면 가운데 정렬
                    e.target.style.textAlign = 'center'
                    // 높이를 다시 작게 조정
                    e.currentTarget.style.height = 'auto'
                    e.currentTarget.style.minHeight = '16px'
                  } else {
                    // 빈 문자열이면 입력란 제거 (특별한 값으로 설정하여 제거 신호 전달)
                    onAddDescription('__REMOVE__')
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    e.currentTarget.blur()
                  }
                }}
                placeholder="설명을 입력하세요..."
                className="w-full text-sm text-gray-700 resize-none border-none outline-none"
                style={{
                  minHeight: '16px', // 60% 감소 (40px → 16px)
                  fontSize: '13px',
                  lineHeight: '1.2',
                  textAlign: description && description.trim() ? 'center' : 'left',
                  overflow: 'hidden'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  // 클릭 시 왼쪽 정렬로 변경 (입력 편의)
                  e.currentTarget.style.textAlign = 'left'
                }}
                onFocus={(e) => {
                  e.stopPropagation()
                  // 포커스 시 왼쪽 정렬 및 높이 자동 조정
                  e.currentTarget.style.textAlign = 'left'
                  e.currentTarget.style.overflow = 'auto'
                }}
                autoFocus
              />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`w-full h-full border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-neoblue bg-neoblue/10'
              : 'border-gray-400 bg-gray-50'
          }`}
        >
          <div className="text-4xl text-gray-400 mb-2">+</div>
          <div className="text-xs text-gray-500 text-center px-2">
            사진 추가 또는 드래그하여 업로드
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageSlot

