const requests = new Map()

export function dedupeRequest(key, requestFactory) {
  const existingRequest = requests.get(key)
  if (existingRequest) return existingRequest

  const request = Promise.resolve().then(requestFactory)
  requests.set(key, request)
  request.finally(() => {
    if (requests.get(key) === request) requests.delete(key)
  }).catch(() => {})
  return request
}
