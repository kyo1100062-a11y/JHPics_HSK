# JH Pics - 지혜로운 Pictures

내부 행정업무의 사진 편집 및 출력 효율화를 위한 웹 기반 사진편집·출력 도구

## 기술 스택

- **React 18** + **TypeScript**
- **Vite** - 빌드 도구
- **Zustand** - 상태 관리
- **Tailwind CSS** - 스타일링
- **React Router** - 라우팅
- **html2canvas** + **jsPDF** - PDF/JPEG 출력

## 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

### 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

### 미리보기

```bash
npm run preview
```

## 프로젝트 구조

```
ui/
├── src/
│   ├── components/     # 재사용 가능한 컴포넌트
│   ├── pages/          # 페이지 컴포넌트
│   ├── stores/         # Zustand 상태 관리
│   ├── utils/          # 유틸리티 함수
│   ├── types/          # TypeScript 타입 정의
│   ├── App.tsx         # 메인 앱 컴포넌트
│   ├── main.tsx        # 엔트리 포인트
│   └── index.css       # 글로벌 스타일
├── public/             # 정적 파일
├── index.html          # HTML 템플릿
└── vite.config.ts      # Vite 설정
```

## 배포

Vercel을 통한 배포를 권장합니다.

