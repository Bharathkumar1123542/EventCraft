// This file intentionally violates lint rules to verify S02
// It should be deleted after verification

// Rule violation: max-lines (this comment makes it exceed 300 lines when uncommented)
// Rule violation: complexity > 10
export function complexFunction(x: number): number {
  if (x > 100) {
    if (x > 200) {
      if (x > 300) {
        if (x > 400) {
          if (x > 500) {
            if (x > 600) {
              if (x > 700) {
                if (x > 800) {
                  if (x > 900) {
                    if (x > 1000) {
                      return 1;
                    }
                    return 2;
                  }
                  return 3;
                }
                return 4;
              }
              return 5;
            }
            return 6;
          }
          return 7;
        }
        return 8;
      }
      return 9;
    }
    return 10;
  }
  return 0;
}

// Rule violation: no-explicit-any
export function takesAny(value: any): void {
  console.log(value);
}

// Rule violation: domain cannot import from outside
// Uncomment to test:
// import { getEnv } from '../server/config/env';
