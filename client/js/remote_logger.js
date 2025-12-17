/**
 * Remote Logger - Captures client-side errors and sends them to server
 * Useful for debugging issues on devices where console access is restricted
 */

class RemoteLogger {
  constructor() {
    this.enabled = true;
    this.buffer = [];
    this.maxBufferSize = 100;
  }

  /**
   * Log an event to the server
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - Log message
   * @param {object} data - Additional data to log
   */
  async log(level, message, data = {}) {
    if (!this.enabled) return;

    const logEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add to buffer
    this.buffer.push(logEntry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Send to server
    try {
      if (typeof apiClient !== 'undefined') {
        await fetch('/api/logs/client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiClient.token ? { 'Authorization': `Bearer ${apiClient.token}` } : {})
          },
          body: JSON.stringify(logEntry)
        });
      }
    } catch (error) {
      // Silent fail - don't want to create infinite loop
      console.error('Failed to send log to server:', error);
    }
  }

  info(message, data) {
    console.log(message, data);
    return this.log('info', message, data);
  }

  warn(message, data) {
    console.warn(message, data);
    return this.log('warn', message, data);
  }

  error(message, data) {
    console.error(message, data);
    return this.log('error', message, data);
  }

  debug(message, data) {
    console.debug(message, data);
    return this.log('debug', message, data);
  }

  /**
   * Get recent logs from buffer
   */
  getRecentLogs() {
    return this.buffer;
  }

  /**
   * Clear the log buffer
   */
  clear() {
    this.buffer = [];
  }
}

// Create global instance
const remoteLogger = new RemoteLogger();
