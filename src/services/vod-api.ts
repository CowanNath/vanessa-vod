import type { VodListResponse, CategoryItem, VodItem } from "../lib/types";

// Proxy responses may include { error: "..." } on failure
interface ProxyResponse<T = unknown> {
  error?: string;
  detail?: string;
}

export class VodApiService {
  constructor(private baseUrl: string) {}

  private async proxyFetch(params: Record<string, string>): Promise<Response> {
    const searchParams = new URLSearchParams({ source: this.baseUrl, ...params });
    const response = await fetch(`/api/proxy?${searchParams.toString()}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    // Check for error embedded in JSON body
    const clone = response.clone();
    try {
      const body: ProxyResponse = await clone.json();
      if (body.error) throw new Error(body.error);
    } catch {
      // If not JSON or no error field, continue with original response
    }
    return response;
  }

  async fetchVideoList(params: {
    page?: number;
    typeId?: number;
    keyword?: string;
  }): Promise<VodListResponse> {
    const query: Record<string, string> = { ac: "detail" };
    if (params.page && params.page > 1) query.pg = String(params.page);
    if (params.typeId) query.t = String(params.typeId);
    if (params.keyword) query.wd = params.keyword;

    const response = await this.proxyFetch(query);
    return response.json();
  }

  async fetchCategories(): Promise<CategoryItem[]> {
    const response = await this.proxyFetch({ ac: "list" });
    const data = await response.json();
    return data.class || [];
  }

  async fetchVideoDetail(vodId: number): Promise<VodItem | null> {
    const response = await this.proxyFetch({ ac: "detail", ids: String(vodId) });
    const data: VodListResponse = await response.json();
    return data.list?.[0] ?? null;
  }
}
