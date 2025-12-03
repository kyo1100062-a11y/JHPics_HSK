import { useState, useEffect } from 'react'

interface ImageEditModalProps {
  isOpen: boolean
  imageUrl: string
  currentScale: number
  currentRotation: number
  onApply: (scale: number, rotation: number) => void
  onCancel: () => void
}

function ImageEditModal({
  isOpen,
  imageUrl,
  currentScale,
  currentRotation,
  onApply,
  onCancel
}: ImageEditModalProps) {
  const [scale, setScale] = useState(currentScale)
  const [rotation, setRotation] = useState(currentRotation)

  useEffect(() => {
    if (isOpen) {
      setScale(currentScale)
      setRotation(currentRotation)
    }
  }, [isOpen, currentScale, currentRotation])

  if (!isOpen) return null

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleApply = () => {
    onApply(scale, rotation)
  }

  const getTransformStyle = () => {
    return {
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      transition: 'transform 0.2s ease'
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-gray-800">이미지 편집</h2>

        {/* 미리보기 영역 */}
        <div className="mb-6 flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[300px]">
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              ...getTransformStyle(),
              maxWidth: '100%',
              maxHeight: '400px',
              objectFit: 'contain'
            }}
          />
        </div>

        {/* 확대/축소 컨트롤 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            확대/축소: {Math.round(scale * 100)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>

        {/* 회전 컨트롤 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            회전: {rotation}°
          </label>
          <button
            onClick={handleRotate}
            className="px-4 py-2 bg-neoblue text-white rounded-lg hover:bg-neoblue/80 transition-colors"
          >
            90° 회전
          </button>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-neoblue text-white rounded-lg hover:bg-neoblue/80 transition-colors"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageEditModal

