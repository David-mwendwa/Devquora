const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

// Emitted when a request has been outstanding long enough that the reader
// deserves an explanation, and again once one comes back. The API sleeps on
// Render's free plan and takes upwards of twenty seconds to wake, which
// without this looks exactly like a broken site.
export const API_SLOW_EVENT = 'devquora:api-slow';
export const API_AWAKE_EVENT = 'devquora:api-awake';
const SLOW_AFTER_MS = 4000;

let inflight = 0;
let slowTimer = null;

const startedRequest = () => {
  inflight += 1;
  if (inflight === 1 && typeof window !== 'undefined') {
    slowTimer = setTimeout(() => window.dispatchEvent(new Event(API_SLOW_EVENT)), SLOW_AFTER_MS);
  }
};

const finishedRequest = () => {
  inflight = Math.max(0, inflight - 1);
  if (inflight === 0) {
    clearTimeout(slowTimer);
    slowTimer = null;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(API_AWAKE_EVENT));
  }
};

// axios drops a param only when it is undefined or null — an empty string is
// still sent. Anything stricter changes what the API receives, and the place
// that would notice is a search box that stops clearing its own filter, so the
// rule is copied exactly rather than tightened.
const queryString = (params) => {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((v) => v !== undefined && v !== null && search.append(key, v));
    else search.append(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

// Shaped like an axios rejection on purpose: getErrorMessage and PostView both
// read `err.response.status`, and a network failure has to arrive with
// `err.request` set so it reads as "can't reach the server" rather than as a
// bare JavaScript error.
const httpError = (message, { response, request, code } = {}) => {
  const error = new Error(message);
  if (response) error.response = response;
  if (request) error.request = request;
  if (code) error.code = code;
  return error;
};

const request = async (method, url, { params, data } = {}) => {
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('token');
  const headers = {};
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  startedRequest();
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${url}${queryString(params)}`, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch (cause) {
    finishedRequest();
    throw httpError(cause.message || 'Network request failed', { request: true });
  }
  finishedRequest();

  // A 204, or an error page from something in front of the API, has no JSON to
  // parse; failing to read a body is not itself the failure worth reporting.
  let body = null;
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    // Only an actual 401 clears the session. A request that never reached the
    // server cannot tell you anything about whether the token is still good.
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    throw httpError(`Request failed with status code ${res.status}`, {
      response: { status: res.status, data: body },
    });
  }

  return { data: body, status: res.status };
};

// The axios surface this app actually uses, and no more. Replacing the library
// with the four verbs it was called with removes ~13 kB gzipped from the
// critical path for a client that is mostly a wrapper over fetch already.
const apiClient = {
  get: (url, config) => request('GET', url, config),
  post: (url, data, config) => request('POST', url, { ...config, data: data ?? {} }),
  patch: (url, data, config) => request('PATCH', url, { ...config, data: data ?? {} }),
  put: (url, data, config) => request('PUT', url, { ...config, data: data ?? {} }),
  delete: (url, config) => request('DELETE', url, config),
};

export default apiClient;
