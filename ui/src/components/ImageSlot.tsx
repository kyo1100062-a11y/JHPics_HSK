import { useState, useRef, useEffect } from 'react'
import ImageSlotActions from './ImageSlotActions'

interface ImageSlotProps {
  slotId: string
  imageUrl?: string
  description?: string
  scale?: number
  rotation?: number
  fitMode?: 'fill' | 'cover' // prop으로 받아서 store와 동기화
  onImageSelect: (file: File) => void
  onDelete: () => void
  onEdit: () => void
  onAddDescription: (description: string) => void
  onFitModeChange?: (fitMode: 'fill' | 'cover') => void // fitMode 변경 시 호출
  isCustomTemplate?: boolean // 커스텀 템플릿 여부
  className?: string
  style?: React.CSSProperties
}

function ImageSlot({
  slotId,
  imageUrl,
  description,
  scale = 1,
  rotation = 0,
  fitMode = 'fill', // prop으로 받음 (기본값: 'fill')
  onImageSelect,
  onDelete,
  onEdit,
  onAddDescription,
  onFitModeChange,
  isCustomTemplate = false,
  className = '',
  style = {}
}: ImageSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isDescriptionActive, setIsDescriptionActive] = useState(false) // 내용추가 버튼 클릭 시 활성화 상태
  const [localDescription, setLocalDescription] = useState(description || '') // 로컬 state로 즉시 입력 반영
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // description prop이 변경되면 로컬 state 동기화
  useEffect(() => {
    if (description === undefined) {
      setLocalDescription('')
      setIsDescriptionActive(false)
    } else {
      setLocalDescription(description)
      if (description && description.trim()) {
        // 내용이 있으면 활성 상태 유지
        setIsDescriptionActive(true)
      }
    }
  }, [description])

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
      // 새 이미지 업로드 시 기본값으로 리셋 (store에 저장)
      if (onFitModeChange) {
        onFitModeChange('fill')
      }
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
      // 새 이미지 업로드 시 기본값으로 리셋 (store에 저장)
      if (onFitModeChange) {
        onFitModeChange('fill')
      }
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
        <div className="w-full h-full flex flex-col" style={{ border: '1px dashed #000000', overflow: 'hidden' }}>
          <div
            className="bg-gray-100 relative overflow-hidden flex items-center justify-center"
            style={{
              flex: '1 1 0',
              minHeight: '200px',
              minWidth: '200px',
              width: '100%',
              height: '100%'
            }}
          >
            <img
              src={imageUrl}
              alt=""
              className="image-wrapper"
              style={{
                width: '100%',
                height: '100%',
                objectFit: fitMode === 'cover' ? 'cover' : 'fill',
                objectPosition: 'center center',
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                display: 'block'
              }}
            />
            {isHovered && (
              <ImageSlotActions
                onEdit={onEdit}
                onDelete={onDelete}
                onAddDescription={() => {
                  // 내용추가 버튼 클릭 시 입력란 활성화
                  if (description === undefined || description === '') {
                    onAddDescription('')
                    setIsDescriptionActive(true)
                    // textarea에 포커스 (다음 렌더링 사이클에서)
                    setTimeout(() => {
                      textareaRef.current?.focus()
                    }, 0)
                  }
                }}
                onToggleFitMode={() => {
                  // 비율유지 버튼 클릭 시 'cover'로 전환 (store에 저장)
                  if (onFitModeChange) {
                    onFitModeChange('cover')
                  }
                }}
                hasDescription={description !== undefined && description && description.trim() ? true : false}
                fitMode={fitMode}
              />
            )}
          </div>
          {/* 텍스트 영역: 항상 DOM에 유지하되, 내용이 없을 때는 height:0으로 숨김 */}
          <div
            className={`flex-shrink-0 bg-white flex items-start justify-center`}
            style={{
              // 커스텀 템플릿: 전체 높이 21px 고정 (border 포함, 실제 텍스트 공간 20px)
              // 일반 템플릿: 전체 높이 32px 고정 (border 포함, 실제 텍스트 공간 30px)
              padding: (isDescriptionActive || (localDescription && localDescription.trim())) 
                ? '0' 
                : '0',
              height: (isDescriptionActive || (localDescription && localDescription.trim())) 
                ? (isCustomTemplate ? '21px' : '32px') 
                : '0',
              minHeight: (isDescriptionActive || (localDescription && localDescription.trim())) 
                ? (isCustomTemplate ? '21px' : '32px') 
                : '0',
              maxHeight: (isDescriptionActive || (localDescription && localDescription.trim())) 
                ? (isCustomTemplate ? '21px' : '32px') 
                : '0',
              overflow: (isDescriptionActive || (localDescription && localDescription.trim())) ? 'visible' : 'hidden',
              visibility: (isDescriptionActive || (localDescription && localDescription.trim())) ? 'visible' : 'hidden',
              pointerEvents: (isDescriptionActive || (localDescription && localDescription.trim())) ? 'auto' : 'none',
              borderTop: (isDescriptionActive || (localDescription && localDescription.trim())) ? '1px solid #e5e7eb' : 'none',
              boxSizing: (isDescriptionActive || (localDescription && localDescription.trim())) ? 'border-box' : 'content-box',
              flexBasis: (isDescriptionActive || (localDescription && localDescription.trim())) ? 'auto' : '0'
            }}
          >
            {(description !== undefined || isDescriptionActive) && (
              <textarea
                ref={textareaRef}
                value={localDescription}
                onChange={(e) => {
                  const newValue = e.target.value
                  // 로컬 state 즉시 업데이트 (UI 반응성 향상)
                  setLocalDescription(newValue)
                  // 부모 컴포넌트로 전달 (debounce는 부모에서 처리)
                  onAddDescription(newValue)
                  // 입력 중에는 항상 활성 상태 유지
                  if (!isDescriptionActive) {
                    setIsDescriptionActive(true)
                  }
                }}
                onBlur={(e) => {
                  // 포커스가 벗어나면
                  const trimmedValue = e.target.value.trim()
                  if (trimmedValue) {
                    // 내용이 있으면 가운데 정렬
                    e.target.style.textAlign = 'center'
                    // 높이 조정 (커스텀 템플릿은 20px 고정, 일반 템플릿은 30px 고정)
                    if (isCustomTemplate) {
                      e.currentTarget.style.height = '20px'
                      e.currentTarget.style.minHeight = '20px'
                      e.currentTarget.style.maxHeight = '20px'
                      e.currentTarget.style.whiteSpace = 'nowrap'
                    } else {
                      e.currentTarget.style.height = '30px'
                      e.currentTarget.style.minHeight = '30px'
                      e.currentTarget.style.maxHeight = '30px'
                      e.currentTarget.style.whiteSpace = 'nowrap'
                    }
                    // 활성 상태 유지 (내용이 있으므로)
                    setIsDescriptionActive(true)
                    // 최종 값 저장 (trim된 값)
                    onAddDescription(trimmedValue)
                  } else {
                    // 빈 문자열이면 입력란 숨김
                    setIsDescriptionActive(false)
                    // 특별한 값으로 설정하여 제거 신호 전달
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
                  // 커스텀 템플릿: 20px 고정 (21px 컨테이너 - 1px border), 한줄 강제
                  // 일반 템플릿: 30px 고정 (35px 컨테이너 - 1px border), 한줄 강제
                  minHeight: (isDescriptionActive || (localDescription && localDescription.trim())) 
                    ? (isCustomTemplate ? '20px' : '30px') 
                    : '0',
                  height: (isDescriptionActive || (localDescription && localDescription.trim())) 
                    ? (isCustomTemplate ? '20px' : '30px') 
                    : '0',
                  maxHeight: (isDescriptionActive || (localDescription && localDescription.trim())) 
                    ? (isCustomTemplate ? '20px' : '30px') 
                    : '0',
                  fontSize: isCustomTemplate ? '11px' : '13px',
                  lineHeight: isCustomTemplate ? '13px' : '13px', // 둘 다 13px 고정값
                  color: isCustomTemplate ? '#333333' : '#333333', // 둘 다 명시적 색상
                  textAlign: (localDescription && localDescription.trim()) ? 'center' : 'left',
                  overflow: 'visible', // 출력 시 텍스트 잘림 방지
                  whiteSpace: 'nowrap', // 둘 다 한줄 강제
                  padding: '0',
                  margin: '0',
                  border: '0',
                  // 출력 시 텍스트가 잘 보이도록 추가 스타일
                  display: 'block',
                  verticalAlign: 'top' // 둘 다 위쪽 정렬
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  // 클릭 시 왼쪽 정렬로 변경 (입력 편의)
                  e.currentTarget.style.textAlign = 'left'
                  // 클릭 시 활성 상태로 전환
                  if (!isDescriptionActive) {
                    setIsDescriptionActive(true)
                  }
                }}
                onFocus={(e) => {
                  e.stopPropagation()
                  // 포커스 시 왼쪽 정렬 및 높이 자동 조정
                  e.currentTarget.style.textAlign = 'left'
                  e.currentTarget.style.overflow = 'auto'
                  // 포커스 시 활성 상태로 전환
                  setIsDescriptionActive(true)
                }}
                autoFocus={isDescriptionActive && description === ''}
              />
            )}
          </div>
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

