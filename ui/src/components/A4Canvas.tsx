import { ReactNode } from 'react'

interface A4CanvasProps {
  children: ReactNode
  className?: string
  isLandscape?: boolean // 가로형 템플릿 여부
}

// A4 비율: 210mm × 297mm = 약 0.707 (세로형)
// 가로형: 297mm × 210mm = 약 1.414 (가로형)
// 화면 표시: 96 DPI 기준 (1mm ≈ 3.7795px)
// 화면 표시 크기: 세로형 약 794px × 1123px, 가로형 약 1123px × 794px
function A4Canvas({ children, className = '', isLandscape = false }: A4CanvasProps) {
  return (
    <div
      className={`bg-white relative ${className}`}
      style={{
        aspectRatio: isLandscape ? '297 / 210' : '210 / 297',
        width: '100%',
        maxWidth: isLandscape ? '1123px' : '794px', // 가로형: 297mm, 세로형: 210mm at 96 DPI
        margin: '0 auto'
      }}
    >
      {/* 캔버스 마진 20mm (상하좌우) */}
      <div
        className="relative w-full h-full"
        style={{
          padding: '20mm'
        }}
      >
        {/* OuterFrame: 2px solid black, 내부 여백 8mm */}
        <div
          className="border-[2px] border-black relative w-full h-full flex flex-col"
          style={{
            padding: '8mm'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export default A4Canvas

