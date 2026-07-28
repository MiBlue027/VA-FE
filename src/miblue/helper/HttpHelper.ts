import axios, {
    type AxiosRequestConfig,
    type AxiosResponse,
    type Method,
} from "axios";

const DEFAULT_TIMEOUT = 250_000;

class Http {
    private static async request<TResponse, TRequest = unknown>(
            method: Method,
            baseUrl: string,
            endpoint: string,
            dto?: TRequest,
            timeout: number = DEFAULT_TIMEOUT,
            responseType: AxiosRequestConfig["responseType"] = "json"
    ): Promise<TResponse> {
        const config: AxiosRequestConfig = {
            baseURL: baseUrl,
            url: endpoint,
            method,
            timeout,
            responseType,
        };

        if (method === "GET" || method === "DELETE") {
            config.params = dto;
        } else {
            config.data = dto;
        }

        const response: AxiosResponse<TResponse> = await axios(config);
        return response.data;
    }

    static get<TResponse, TRequest = unknown>(
            baseUrl: string,
            endpoint: string,
            dto?: TRequest,
            timeout?: number,
            responseType?: AxiosRequestConfig["responseType"]
    ) {
        return this.request<TResponse, TRequest>(
                "GET",
                baseUrl,
                endpoint,
                dto,
                timeout,
                responseType
        );
    }

    static post<TResponse, TRequest = unknown>(
            baseUrl: string,
            endpoint: string,
            dto?: TRequest,
            timeout?: number,
            responseType?: AxiosRequestConfig["responseType"]
    ) {
        return this.request<TResponse, TRequest>(
                "POST",
                baseUrl,
                endpoint,
                dto,
                timeout,
                responseType
        );
    }

    static put<TResponse, TRequest = unknown>(
            baseUrl: string,
            endpoint: string,
            dto?: TRequest,
            timeout?: number,
            responseType?: AxiosRequestConfig["responseType"]
    ) {
        return this.request<TResponse, TRequest>(
                "PUT",
                baseUrl,
                endpoint,
                dto,
                timeout,
                responseType
        );
    }

    static patch<TResponse, TRequest = unknown>(
            baseUrl: string,
            endpoint: string,
            dto?: TRequest,
            timeout?: number,
            responseType?: AxiosRequestConfig["responseType"]
    ) {
        return this.request<TResponse, TRequest>(
                "PATCH",
                baseUrl,
                endpoint,
                dto,
                timeout,
                responseType
        );
    }

    static delete<TResponse, TRequest = unknown>(
            baseUrl: string,
            endpoint: string,
            dto?: TRequest,
            timeout?: number,
            responseType?: AxiosRequestConfig["responseType"]
    ) {
        return this.request<TResponse, TRequest>(
                "DELETE",
                baseUrl,
                endpoint,
                dto,
                timeout,
                responseType
        );
    }
}

export default Http;