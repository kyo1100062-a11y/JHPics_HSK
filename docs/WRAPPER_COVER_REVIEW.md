# object-fit: cover wrapper 방식 적용 가능성 검토 보고서

## 📋 검토 개요

html2canvas에서 `object-fit: cover`가 정상적으로 캡처되지 않는 문제를 해결하기 위해, wrapper 방식의 적용 가능성을 검토합니다.

## 🎯 제안된 Wrapper 구조

```html
<div class="slot-wrapper">
  <img class="slot-img" />
</div>
```

**CSS:**
- `slot-wrapper`: `position: relative`, `overflow: hidden`, `width: 100%`, `height: 100%`
- `slot-img`: `position: absolute`, `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%) scale(S) rotate(R)`, `min-width: 100%`, `min-height: 100%`, `object-fit: cover`

## ✅ 검토 결과

### 1. html2canvas에서 overflow:hidden + absolute positioning 조합 캡처 가능성

**결론: ✅ 가능**

- html2canvas는 CSS의 `overflow: hidden`과 `position: absolute`를 지원합니다.
- 단, 복잡한 transform 조합(translate + scale + rotate)에서 일부 브라우저에서 정확도 문제가 발생할 수 있습니다.
- `min-width: 100%`, `min-height: 100%`를 사용하여 cover 효과를 재현하는 방식은 html2canvas에서 잘 작동합니다.

**주의사항:**
- `transform: translate(-50%, -50%)`는 픽셀 단위 계산에서 소수점 오차가 발생할 수 있습니다.
- `scale`과 `rotate`가 함께 적용될 때 transform-origin 계산이 복잡해질 수 있습니다.

### 2. 현재 코드 구조(TwoCut/FourCut 등)와 충돌 여부

**결론: ✅ 충돌 없음**

**현재 구조:**
- `ImageSlot.tsx`: `<img>` 태그에 직접 `objectFit` 스타일 적용
- `exportUtils.ts`: html2canvas로 DOM을 직접 캡처
- Layout 컴포넌트: 슬롯 배치만 담당

**Wrapper 적용 시:**
- `ImageSlot.tsx`는 수정하지 않음 (요구사항 준수)
- `exportUtils.ts`의 `onclone` 콜백에서만 wrapper 구조 생성
- 편집 화면과 export DOM이 분리되므로 충돌 없음

### 3. scale / rotation 적용 시 문제 발생 가능성

**결론: ⚠️ 주의 필요**

**잠재적 문제:**
1. **Transform 체인 복잡도**: `translate(-50%, -50%) scale(S) rotate(R)` 조합
   - html2canvas가 transform을 순차적으로 계산할 때 정확도 문제 가능
   - 특히 고해상도(scale > 3.0)에서 픽셀 단위 오차 누적 가능

2. **Transform Origin 계산**:
   - 현재: `transformOrigin: 'center center'`
   - Wrapper: `translate(-50%, -50%)`로 중앙 정렬 후 scale/rotate
   - 두 방식의 결과가 완전히 일치하는지 검증 필요

3. **이미지 비율 계산**:
   - `min-width: 100%`, `min-height: 100%`로 cover 효과 재현
   - 이미지 원본 비율과 슬롯 비율에 따라 실제 크기 계산이 달라질 수 있음

**해결 방안:**
- 테스트 단계에서 다양한 비율의 이미지로 검증
- scale/rotation 조합 테스트 필수

### 4. 기존 exportUtils.ts 흐름과 호환성

**결론: ✅ 호환 가능**

**현재 흐름:**
1. `exportToPDF` / `exportToJPEG` 호출
2. `hideUIElements`로 UI 요소 숨김
3. `html2canvas`로 캡처
4. `restoreUIElements`로 UI 복원

**Wrapper 적용 시:**
- `html2canvas` 옵션에 `onclone` 콜백 추가
- `onclone` 내부에서 cover 모드인 이미지만 wrapper로 감싸기
- 기존 흐름은 그대로 유지 (추가 작업만 수행)

**호환성:**
- ✅ fill 모드는 기존 방식 유지
- ✅ cover 모드만 wrapper 적용
- ✅ 기존 DPI/scale 로직 유지
- ✅ UI 숨김/복원 로직 유지

### 5. Wrapper 적용 시 예상되는 레이아웃 영향

**결론: ✅ 영향 없음**

**이유:**
- Wrapper는 `onclone` 내부에서만 생성 (클론된 DOM)
- 원본 DOM은 전혀 수정하지 않음
- 편집 화면 레이아웃에 영향 없음
- export 전용 DOM에서만 적용

**주의사항:**
- Wrapper 생성 시 원본 이미지의 모든 스타일(scale, rotation, position)을 정확히 복제해야 함
- wrapper 내부 img의 크기 계산이 정확해야 cover 효과가 재현됨

## 📊 종합 평가

| 항목 | 평가 | 비고 |
|------|------|------|
| html2canvas 지원 | ✅ 가능 | overflow:hidden + absolute 지원 |
| 코드 충돌 | ✅ 없음 | export 전용 DOM에서만 적용 |
| scale/rotation | ⚠️ 주의 | 테스트 필수 |
| 호환성 | ✅ 양호 | 기존 흐름 유지 |
| 레이아웃 영향 | ✅ 없음 | 클론된 DOM만 수정 |

## 🎯 최종 결론

**Wrapper 방식 적용 가능: ✅**

단, 다음 조건을 충족해야 합니다:
1. 테스트 단계에서 다양한 이미지 비율로 검증
2. scale/rotation 조합 테스트 필수
3. fill 모드는 기존 방식 유지
4. export 전용 DOM에서만 적용

## 📝 다음 단계

1. **테스트 단계**: 샘플 DOM으로 실제 캡처 테스트
2. **검증**: cover 효과 정확도, 선명도, 비율 유지 확인
3. **적용**: 테스트 통과 시 exportUtils.ts에 최소 수정 적용

