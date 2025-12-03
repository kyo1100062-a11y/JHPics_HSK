import { ReactNode } from 'react'

interface A4CanvasProps {
  children: ReactNode
  className?: string
}

// A4 비율: 210mm × 297mm = 약 0.707 (세로형)
// 화면 표시: 96 DPI 기준 (1mm ≈ 3.7795px)
// 화면 표시 크기: 약 794px × 1123px
function A4Canvas({ children, className = '' }: A4CanvasProps) {
  return (
    <div
      className={`bg-white relative ${className}`}
      style={{
        aspectRatio: '210 / 297',
        width: '100%',
        maxWidth: '794px', // 210mm at 96 DPI
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

