export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:3000/api/v1';

console.log('API Base URL:', API_BASE_URL);

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuthRedirect?: boolean;
}

export class ApiError extends Error {
  public statusCode: number;
  public data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    const tokenFromStorage = localStorage.getItem('scms_token');
    if (tokenFromStorage) return tokenFromStorage;

    const match = document.cookie.match(/(?:^|;\s*)scms_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  public buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): string {
    const isAbsolute = /^https?:\/\//i.test(endpoint);
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const rawUrl = isAbsolute ? endpoint : `${this.baseUrl}${normalizedEndpoint}`;

    const url = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T = any>(
    method: string,
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { params, skipAuthRedirect, headers: customHeaders, ...restOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(customHeaders as Record<string, string>),
    };

    const token = this.getAuthToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    console.log(`[apiClient] Request: ${method} ${url}`, {
      isFormData,
      contentType: headers['Content-Type'],
      body: isFormData ? '[FormData]' : body,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        credentials: restOptions.credentials || 'include',
        body: isFormData ? (body as BodyInit) : (body !== undefined ? JSON.stringify(body) : undefined),
        ...restOptions,
      });
    } catch (fetchErr: any) {
      console.error(`[apiClient] Network failure on ${method} ${url}:`, fetchErr);
      throw fetchErr;
    }

    let parsedBody: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      parsedBody = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      try {
        parsedBody = text ? JSON.parse(text) : null;
      } catch {
        parsedBody = text;
      }
    }

    if (!response.ok) {
      const backendMessage =
        (parsedBody && typeof parsedBody === 'object' && (parsedBody.message || parsedBody.error)) ||
        `Request failed with HTTP ${response.status}`;

      if (response.status === 401) {
        if (typeof window !== 'undefined' && !skipAuthRedirect) {
          localStorage.removeItem('scms_token');
          localStorage.removeItem('scms_user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        throw new ApiError(backendMessage, 401, parsedBody);
      }

      if (response.status === 403) {
        const forbiddenMsg =
          (parsedBody && typeof parsedBody === 'object' && (parsedBody.message || parsedBody.error)) ||
          'Forbidden: Access denied. Your assigned role does not permit this action.';
        throw new ApiError(`Forbidden: ${forbiddenMsg}`, 403, parsedBody);
      }

      throw new ApiError(backendMessage, response.status, parsedBody);
    }

    return parsedBody as T;
  }

  public get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  public post<T = any>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  public patch<T = any>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  public put<T = any>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  public delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

export const apiClient = new ApiClient();
export default apiClient;

