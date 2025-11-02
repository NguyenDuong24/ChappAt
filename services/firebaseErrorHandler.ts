/**
 * Firebase Error Handler Service
 * Handles common Firebase errors and provides retry logic
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

class FirebaseErrorHandler {
  /**
   * Retry an operation with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2
    } = options;

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, {
          code: error?.code,
          message: error?.message,
          attempt
        });

        // Don't retry on certain permanent errors
        if (this.isPermanentError(error) || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        await this.sleep(Math.min(delay, maxDelay));
        delay *= backoffFactor;
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is permanent and shouldn't be retried
   */
  private static isPermanentError(error: any): boolean {
    const permanentCodes = [
      'auth/unauthenticated',
      'auth/user-not-found',
      'permission-denied',
      'not-found',
      'invalid-argument',
      'failed-precondition'
    ];

    return permanentCodes.includes(error?.code);
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: any): string {
    if (!error) return 'Unknown error occurred';

    const code = error?.code || '';
    const message = error?.message || '';

    // Storage errors
    if (code.includes('storage/retry-limit-exceeded')) {
      return 'Network timeout - please check your connection and try again';
    }
    if (code.includes('storage/object-not-found')) {
      return 'File not found';
    }
    if (code.includes('storage/unauthorized')) {
      return 'Access denied';
    }
    if (code.includes('storage/quota-exceeded')) {
      return 'Storage quota exceeded';
    }

    // Firestore errors
    if (code.includes('unavailable')) {
      return 'Service temporarily unavailable - please try again';
    }
    if (code.includes('deadline-exceeded')) {
      return 'Request timeout - please try again';
    }
    if (code.includes('resource-exhausted')) {
      return 'Too many requests - please wait and try again';
    }

    // Auth errors
    if (code.includes('auth/network-request-failed')) {
      return 'Network error - please check your connection';
    }
    if (code.includes('auth/too-many-requests')) {
      return 'Too many attempts - please wait and try again';
    }

    // Generic network errors
    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('timeout')) {
      return 'Network error - please check your connection';
    }

    // Return original message if no specific handling
    return message || 'An error occurred';
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle Firebase Storage specific errors
   */
  static handleStorageError(error: any): {
    shouldRetry: boolean;
    userMessage: string;
    retryDelay?: number;
  } {
    const code = error?.code || '';

    if (code === 'storage/retry-limit-exceeded') {
      return {
        shouldRetry: true,
        userMessage: 'Network timeout - retrying...',
        retryDelay: 2000
      };
    }

    if (code === 'storage/quota-exceeded') {
      return {
        shouldRetry: false,
        userMessage: 'Storage quota exceeded'
      };
    }

    if (code === 'storage/unauthenticated') {
      return {
        shouldRetry: false,
        userMessage: 'Authentication required'
      };
    }

    if (code === 'storage/unauthorized') {
      return {
        shouldRetry: false,
        userMessage: 'Access denied'
      };
    }

    // Generic retry for network-related errors
    if (code.includes('unavailable') || code.includes('network') || code.includes('timeout')) {
      return {
        shouldRetry: true,
        userMessage: 'Connection issue - retrying...',
        retryDelay: 1500
      };
    }

    return {
      shouldRetry: false,
      userMessage: this.getUserFriendlyMessage(error)
    };
  }
}

export default FirebaseErrorHandler;
