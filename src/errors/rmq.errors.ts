export class PayloadValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'PayloadValidationError'; }
}
export class TransientStoreError extends Error {
  constructor(message: string) { super(message); this.name = 'TransientStoreError'; }
}
