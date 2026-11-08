export function getRequestErrorMessage(error) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection. Check your connection and try again.'
  }

  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return 'The server took too long to respond. Check your connection and try again.'
  }

  if (error instanceof TypeError) {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  return error?.message || 'Unable to load data. Please try again.'
}
