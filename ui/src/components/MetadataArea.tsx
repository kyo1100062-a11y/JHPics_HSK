import React from 'react'
import { TitleStyle } from '../stores/editorStore'

interface PageMetadata {
  title: string
  projectName: string
  subProjectName: string
  manager: string
}

interface MetadataAreaProps {
  metadata: PageMetadata
  titleStyle?: TitleStyle
}

function MetadataArea({ metadata, titleStyle }: MetadataAreaProps) {
  const { title, projectName, subProjectName, manager } = metadata
  
  // 기본 titleStyle (없을 경우)
  const defaultTitleStyle: TitleStyle = {
    align: 'center',
    fontFamily: 'sans-serif',
    fontSize: 19,
    bold: true
  }
  
  const finalTitleStyle = titleStyle || defaultTitleStyle

  // 동적으로 줄 수 계산
  const lines: Array<{ text: string; isFirstLine?: boolean; hasProjectName?: boolean; hasSubProjectName?: boolean }> = []
  
  // 1줄: 제목 + (사업명값) (한 줄에 표기)
  if (title || projectName) {
    const titleText = title || '현장확인사진'
    const projectText = projectName ? `(${projectName})` : ''
    lines.push({ 
      text: `${titleText} ${projectText}`.trim(),
      isFirstLine: true,
      hasProjectName: !!projectName
    })
  }

  // 2줄: 보조사업자
  if (subProjectName) {
    lines.push({ 
      text: `보조사업자 : ${subProjectName}`,
      hasSubProjectName: true
    })
  }

  // 3줄: 담당자
  if (manager) {
    lines.push({ text: `담당자: ${manager}` })
  }

  if (lines.length === 0) {
    return null
  }

  return (
    <div
      className="text-left"
      style={{
        marginBottom: '6mm',
        lineHeight: '1.5',
        fontSize: 'clamp(12px, 1.5vw, 16px)',
        color: '#333333',
        letterSpacing: 'normal' // 기본값
      }}
    >
      {lines.map((line, index) => {
        // 첫 번째 줄은 한 줄에 표기 (엑셀 텍스트 셀맞춤처럼)
        const isFirstLine = line.isFirstLine
        const hasProjectName = line.hasProjectName
        const hasSubProjectName = line.hasSubProjectName
        
        // 모든 텍스트를 매우 짙은 회색으로 표시
        let displayContent: React.ReactNode = line.text
        
        if (hasProjectName) {
          // 첫 번째 줄에서 "사업명" 부분
          // 예: "현장확인사진 (사업명값)"
          const titleText = title || '현장확인사진'
          const projectValue = projectName
          displayContent = (
            <>
              <span style={{ color: '#333333' }}>{titleText}</span>
              {' '}
              <span style={{ color: '#333333' }}>({projectValue})</span>
            </>
          )
        } else if (hasSubProjectName) {
          // "보조사업자" 부분
          const parts = line.text.split(' : ')
          if (parts.length === 2) {
            displayContent = (
              <>
                <span style={{ color: '#333333' }}>보조사업자</span>
                {' : '}
                <span style={{ color: '#333333' }}>{parts[1]}</span>
              </>
            )
          }
        } else {
          // 담당자 등 기타 텍스트
          displayContent = <span style={{ color: '#333333' }}>{line.text}</span>
        }
        
        // 보조사업자(index=1)와 담당자(index=2) 줄간격을 30% 감소 (2mm → 1.4mm)
        const isSubProjectOrManager = index === 1 || index === 2
        const marginBottom = isSubProjectOrManager 
          ? (index < lines.length - 1 ? '1.4mm' : '0')
          : (index < lines.length - 1 ? '2mm' : '0')
        
        // 제목 줄(index === 0)에만 titleStyle 적용
        const isTitleLine = index === 0
        const titleFontSize = isTitleLine ? `${finalTitleStyle.fontSize}px` : '1em'
        // 폰트 fallback 처리: 선택된 폰트 + Malgun Gothic + sans-serif
        const titleFontFamily = isTitleLine 
          ? `${finalTitleStyle.fontFamily}, 'Malgun Gothic', sans-serif`
          : undefined
        const titleFontWeight = isTitleLine && finalTitleStyle.bold ? 'bold' : undefined
        // 제목 줄에만 정렬 적용, 나머지는 항상 왼쪽 정렬
        const titleTextAlign = isTitleLine ? finalTitleStyle.align : 'left'
        
        return (
          <div
            key={index}
            style={{
              fontSize: isTitleLine ? titleFontSize : '1em',
              fontFamily: isTitleLine ? titleFontFamily : undefined,
              fontWeight: isTitleLine ? titleFontWeight : undefined,
              textAlign: titleTextAlign, // 제목 줄에만 정렬 적용
              marginBottom: marginBottom,
              color: '#333333',
              whiteSpace: isFirstLine ? 'nowrap' : 'normal' // 첫 번째 줄은 한 줄에 표기
            }}
          >
            {displayContent}
          </div>
        )
      })}
    </div>
  )
}

export default MetadataArea

