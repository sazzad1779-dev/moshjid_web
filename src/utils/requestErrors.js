const validationMessages = new Map(Object.entries({
  'Missing required fields': 'Complete the required fields before saving.',
  'Invalid amount': 'Enter a payment amount greater than zero.',
  'Invalid monthly amount': 'Enter a monthly amount of zero or more, or leave it blank.',
  'Invalid type': 'Choose an available transaction type.',
  'Invalid category': 'Choose an available category for this transaction type.',
  'Invalid payment method': 'Choose an available payment method.',
  'Invalid date': 'Enter a valid date.',
  'Invalid from': 'Enter a valid start date.',
  'Invalid to': 'Enter a valid end date.',
  'Invalid month selection': 'Select each payment month only once.',
  'Invalid month year': 'Enter a year between 2000 and 2200 for the selected months.',
  'Invalid payment month': 'Choose a valid month in Monthly Dues and open its payments again.',
  'Invalid member': 'Select an active member or enter the name of a new member.',
  'Invalid transaction member': 'Choose an active member from the search results, then save again.',
  'Invalid member name': 'Enter a member name of 200 characters or fewer.',
  'Invalid email': 'Enter a valid email address or leave it blank.',
  'Invalid phone': 'Enter a phone number of 50 characters or fewer.',
  'Invalid area': 'Choose an available area or leave it blank.',
  'Invalid address': 'Enter an address of 1,000 characters or fewer.',
  'Invalid status': 'Choose an available status.',
  'Invalid description': 'Enter a description of 5,000 characters or fewer.',
  'Invalid donor name': 'Enter a name of 500 characters or fewer.',
  'Invalid search': 'Enter a search term of 100 characters or fewer.',
  'Search text is too long': 'Enter a search term of 100 characters or fewer.',
  'PIN required': 'Enter your access PIN.',
  'Enter a valid time for all six prayers.': 'Enter a valid time for all six prayers.',
  'Invalid member. Select an existing member or enter a new member name.': 'Select an existing member or enter a new member name.',
  'Invalid month selection: select a member for a confirmed Imam Hadya income payment': 'To assign months, link the payment to a member and choose Imam Hadya as the income category.',
  'Invalid payment transaction for this member': 'This payment could not be found for the member. Reopen the member profile and check their payment history.',
}))

const defaultFailure = 'Something went wrong. Try again. If the problem continues, contact the site administrator.'

export async function readJsonResponse(response, failure = defaultFailure) {
  const data = await response.json().catch(() => null)
  if (response.ok && data && !data.error) return data

  switch (response.status) {
    case 400:
    case 422:
      throw new Error(validationMessages.get(data?.error) || 'Check the information you entered and try again.')
    case 401:
      throw new Error(data?.error === 'Invalid PIN'
        ? 'That PIN is incorrect. Check it and try again.'
        : 'Sign in again to continue.')
    case 403:
      throw new Error('Your account does not have permission for this action. Contact an administrator if you need access.')
    case 404:
      throw new Error('This record or page could not be found. Refresh the page before trying again.')
    case 429: {
      const delay = typeof data?.error === 'string'
        ? data.error.match(/^Too many attempts\. Try again in (\d+)s\.$/)?.[1]
        : null
      throw new Error(delay ? `Too many attempts. Try again in ${delay} seconds.` : 'Too many attempts. Wait a moment and try again.')
    }
    default:
      throw new Error(failure)
  }
}

export function getRequestErrorMessage(error, fallback = defaultFailure) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection. Check your connection and try again.'
  }

  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return 'The server took too long to respond. Refresh the page to check the latest information before trying again.'
  }

  if (error instanceof TypeError) {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  return error?.message || fallback
}
