import { useNavigate } from 'react-router-dom'

interface TemplateCardProps {
  type: '2컷' | '4컷' | '6컷' | '커스텀' | '커스텀2'
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
      },
      '커스텀2': {
        portrait: 'custom2-portrait',
        landscape: 'custom2-landscape'
      }
    }

    const templateId = templateMap[type][orientation]
    navigate(`/editor?template=${templateId}`)
  }

  const isCustom2 = type === '커스텀2'
  const displayIcon = isCustom2 ? '⧉' : icon
  const baseClasses = 'bg-deep-blue border rounded-2xl p-8 flex flex-col items-center gap-6 hover:scale-[1.06] transition-all duration-250 ease-out cursor-pointer'
  const borderClasses = isCustom2 
    ? '' 
    : 'border-soft-blue hover:border-neoblue'
  const shadowClasses = isCustom2 
    ? 'hover:shadow-[0_0_25px_rgba(174,234,255,0.6)]' 
    : 'hover:shadow-[0_0_25px_rgba(76,111,255,0.6)]'
  const iconColor = isCustom2 ? '' : 'text-neoblue'
  const textColor = isCustom2 ? '' : 'text-white'

  return (
    <div 
      className={`${baseClasses} ${borderClasses} ${shadowClasses}`}
      style={isCustom2 ? { borderColor: '#AEEAFF' } : {}}
      onMouseEnter={(e) => {
        if (isCustom2) {
          e.currentTarget.style.borderColor = '#AEEAFF'
        }
      }}
      onMouseLeave={(e) => {
        if (isCustom2) {
          e.currentTarget.style.borderColor = '#AEEAFF'
        }
      }}
    >
      {/* 상단: 큰 숫자/기호 */}
      <div className={`text-7xl font-inter font-bold ${iconColor}`} style={isCustom2 ? { color: '#AEEAFF' } : {}}>
        {displayIcon}
      </div>

      {/* 중간: Type 텍스트 */}
      <div className={`font-suit font-medium text-lg ${textColor}`} style={isCustom2 ? {} : {}}>
        {type === '커스텀2' ? '커스텀 사진원본비율' : `Type ${type}`}
      </div>

      {/* 하단: 세로형/가로형 버튼 */}
      <div className="flex gap-3 w-full">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleTemplateSelect('portrait')
          }}
          className={`flex-1 px-4 py-2 rounded-full border text-white hover:shadow-md transition-all duration-200 ${
            isCustom2 
              ? 'border-[#AEEAFF] hover:bg-gradient-to-r hover:from-[#AEEAFF] hover:to-[#8DD5FF]' 
              : 'border-soft-blue hover:bg-gradient-to-r hover:from-neoblue hover:to-soft-blue'
          }`}
        >
          세로형
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleTemplateSelect('landscape')
          }}
          className={`flex-1 px-4 py-2 rounded-full border text-white hover:shadow-md transition-all duration-200 ${
            isCustom2 
              ? 'border-[#AEEAFF] hover:bg-gradient-to-r hover:from-[#AEEAFF] hover:to-[#8DD5FF]' 
              : 'border-soft-blue hover:bg-gradient-to-r hover:from-neoblue hover:to-soft-blue'
          }`}
        >
          가로형
        </button>
      </div>
    </div>
  )
}

export default TemplateCard

