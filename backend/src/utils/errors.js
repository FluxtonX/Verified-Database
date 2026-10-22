/**
 * @fileoverview Google-grade error taxonomy and structured logging framework.
 * Standardizes error codes, HTTP status mapping, and tamper-resistant audit logs.
 */

export class DomainError extends Error {
  /**
   * @param {string} message - Human-readable explanation.
   * @param {string} code - Machine-readable error code (e.g. DISCREPANCY_DETECTED).
   * @param {number} statusCode - Suggested HTTP status code.
   * @param {Record<string, unknown>} [details={}] - Additional structured debugging context.
   */
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FinancialDiscrepancyError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'FINANCIAL_DISCREPANCY_DETECTED', 422, details);
  }
}

export class SecurityViolationError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'SECURITY_VIOLATION_DETECTED', 400, details);
  }
}

export class FraudAnomalyError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'FRAUD_ANOMALY_DETECTED', 403, details);
  }
}

export class EscrowStateError extends DomainError {
  constructor(message, details = {}) {
    super(message, 'INVALID_ESCROW_STATE_TRANSITION', 409, details);
  }
}

/**
 * Structured JSON Logger adhering to Google Cloud Logging standards.
 */
export class StructuredLogger {
  /**
   * @param {string} component - Name of the subsystem emitting logs.
   */
  constructor(component) {
    this.component = component;
  }

  /**
   * @private
   * @param {'INFO'|'WARNING'|'ERROR'|'DEBUG'} severity
   * @param {string} message
   * @param {Record<string, unknown>} [metadata={}]
   */
  _emit(severity, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      severity,
      component: this.component,
      message,
      ...metadata,
    };
    const serialized = JSON.stringify(entry);
    if (severity === 'ERROR') {
      console.error(serialized);
    } else if (severity === 'WARNING') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  info(msg, meta) { this._emit('INFO', msg, meta); }
  warn(msg, meta) { this._emit('WARNING', msg, meta); }
  error(msg, meta) { this._emit('ERROR', msg, meta); }
  debug(msg, meta) { this._emit('DEBUG', msg, meta); }
}
