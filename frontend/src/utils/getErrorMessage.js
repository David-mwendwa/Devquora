// Turns an axios error into a message worth showing a user. The backend's errorHandler
// sends { message } on normal errors, but some failures never reach it — express-rate-limit
// responses, a dead backend (ECONNREFUSED), a request that times out — so each of those
// needs its own fallback instead of collapsing to a generic "Something went wrong".
const getErrorMessage = (err) => {
  if (err.response) {
    const { status, data } = err.response;
    if (typeof data?.message === 'string' && data.message) return data.message;
    if (typeof data === 'string' && data) return data;
    if (status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
    if (status === 401) return 'Invalid email or password.';
    if (status >= 500) return 'The server ran into a problem. Please try again shortly.';
    return `Request failed (${status}). Please try again.`;
  }

  if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (err.request) return "Can't reach the server. Check your connection and try again.";

  return err.message || 'Something went wrong. Please try again.';
};

export default getErrorMessage;
