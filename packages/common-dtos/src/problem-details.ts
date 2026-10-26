export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalid_params?: Array<{ name: string; reason: string }>;
  timestamp: string;
}

export function createProblemDetails(params: {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalid_params?: Array<{ name: string; reason: string }>;
}): ProblemDetails {
  return {
    type: params.type || `https://pupqc-scms.edu.ph/errors/rfc7807/${params.status}`,
    title: params.title,
    status: params.status,
    detail: params.detail,
    instance: params.instance || `/api/v1/error/${Date.now()}`,
    invalid_params: params.invalid_params,
    timestamp: new Date().toISOString()
  };
}
