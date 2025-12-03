import { useState, useEffect, useRef } from 'react'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (projectName: string) => void
  initialValue?: string
  title: string
  confirmText: string
}

function ProjectModal({
  isOpen,
  onClose,
  onConfirm,
  initialValue = '',
  title,
  confirmText
}: ProjectModalProps) {
  const [projectName, setProjectName] = useState(initialValue)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setProjectName(initialValue)
      setError('')
      // 모달이 열릴 때 입력 필드에 포커스
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      onConfirm(projectName)
      setProjectName('')
      onClose()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('오류가 발생했습니다')
      }
    }
  }

  const handleClose = () => {
    setProjectName('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-deep-blue border border-soft-blue rounded-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-suit font-bold text-white mb-4">{title}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-soft-blue mb-2">사업명</label>
            <input
              ref={inputRef}
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value)
                setError('')
              }}
              className="w-full px-4 py-2 bg-deep-blue border border-soft-blue rounded-lg text-white focus:outline-none focus:border-neoblue"
              placeholder="사업명을 입력하세요"
              maxLength={100}
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-soft-blue hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-neoblue text-white rounded-lg hover:bg-neoblue/80 transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectModal

