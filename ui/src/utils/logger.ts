/**
 * 개발 모드에서만 로그를 출력하는 유틸리티
 */
const isDev = import.meta.env.DEV

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },
  error: (...args: any[]) => {
    // 에러는 항상 출력 (프로덕션에서도 중요)
    console.error(...args)
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args)
    }
  }
}

