export {};
declare global {
  namespace jest {
    interface Matchers<R> {
        toBeFinite(): R
        // Greater than or equal
        toBeGeaterThanOrEqualTo(bound: number): R
        // Greater than
        toBeGreaterThan(bound: number): R
        toBeEmptyArray(): R
    }
  }
}