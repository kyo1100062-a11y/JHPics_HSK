import { useNavigate } from 'react-router-dom'

interface TemplateCardProps {
  type: '2컷' | '4컷' | '6컷' | '커스텀'
  icon: string
}

function TemplateCard({ type, icon }: TemplateCardProps) {
  const navigate = useNavigate()

  const handleTemplateSelect = (orientation: 'portrait' | 'landscape') => {
    // 템플릿 타입에 따라 편집 화면으로 이동
    const templateMap: Record<string, Record<string, string>> = {
      '2컷': {
        portrait: 'twoCut-portrait',
        landscape: 'twoCut-landscape'
      },
      '4컷': {
        portrait: 'fourCut-portrait',
        landscape: 'fourCut-landscape'
      },
      '6컷': {
        portrait: 'sixCut-portrait',
        landscape: 'sixCut-landscape'
      },
      '커스텀': {
        portrait: 'custom-portrait',
        landscape: 'custom-landscape'
      }
    }

    const templateId = templateMap[type][orientation]
    navigate(`/editor?template=${templateId}`)
  }

  return (
    <div className="bg-deep-blue border border-soft-blue rounded-2xl p-8 flex flex-col items-center gap-6 hover:scale-[1.06] hover:border-neoblue hover:shadow-[0_0_25px_rgba(76,111,255,0.6)] transition-all duration-250 ease-out cursor-pointer">
      {/* 상단: 큰 숫자/기호 */}
      <div className="text-7xl font-inter font-bold text-neoblue">
        {icon}
      </div>

      {/* 중간: Type 텍스트 */}
      <div className="text-white font-suit font-medium text-lg">
        Type {type}
      </div>

      {/* 하단: 세로형/가로형 버튼 */}
      <div className="flex gap-3 w-full">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleTemplateSelect('portrait')
          }}
          className="flex-1 px-4 py-2 rounded-full border border-soft-blue text-white hover:bg-gradient-to-r hover:from-neoblue hover:to-soft-blue hover:shadow-md transition-all duration-200"
        >
          세로형
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleTemplateSelect('landscape')
          }}
          className="flex-1 px-4 py-2 rounded-full border border-soft-blue text-white hover:bg-gradient-to-r hover:from-neoblue hover:to-soft-blue hover:shadow-md transition-all duration-200"
        >
          가로형
        </button>
      </div>
    </div>
  )
}

export default TemplateCard

