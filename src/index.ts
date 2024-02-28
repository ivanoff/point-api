const getRandomInt = (max: number) => Math.floor(Math.random() * Math.floor(max));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ApiClient {
    public token: string | undefined;
    private readonly url: string;
    private refreshToken: string | undefined;
    private readonly onTokenUpdate: any;
    private readonly onTokenError: any;

    constructor({ url, token, refreshToken, onTokenUpdate, onTokenError }: ConstructorType) {
        this.url = url;
        this.token = token;
        this.refreshToken = refreshToken;
        this.onTokenUpdate = onTokenUpdate || (() => {});
        this.onTokenError = onTokenError || (() => {});
    }

    private async request(
        endpoint: string,
        options?: RequestInit,
        noToken?: boolean
    ): Promise<Response | undefined> {
        let result;
        for (let i = 1; i < 5; i++) {
            try {
                result = await fetch(`${this.url}/${endpoint}`, {
                    ...options,
                    headers: {
                        ...(options?.headers || {}),
                        ...(!noToken && this.token && { Authorization: `Bearer ${this.token}` }),
                    },
                });

                if (!result) throw new Error('No Result');

                break;
            } catch (err) {
                const ms = 1000 * i + getRandomInt(1000);
                console.log(`sleep ${ms / 1000}s`);
                await sleep(ms);
            }
        }

        return result;
    }

    private async fetchWithToken(
        endpoint: string,
        options?: RequestInit,
        noToken?: boolean
    ): Promise<Response | undefined> {
        let response = await this.request(endpoint, options, noToken);

        if (!noToken && response?.status === 403) {
            const a = await this.handle403();
            if (a) response = await this.request(endpoint, options, noToken);
        }

        return response;
    }

    async get<T>(endpoint: string, noToken?: boolean): Promise<T> {
        const response = await this.fetchWithToken(endpoint, undefined, noToken);
        return response?.json();
    }

    async post<T>(endpoint: string, data: any, noToken?: boolean): Promise<T> {
        const response = await this.fetchWithToken(
            endpoint,
            {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            noToken
        );
        return response?.json();
    }

    async put<T>(endpoint: string, data: any): Promise<T> {
        const response = await this.fetchWithToken(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response?.json();
    }

    async patch<T>(endpoint: string, data: any): Promise<T> {
        const response = await this.fetchWithToken(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response?.json();
    }

    async delete<T>(endpoint: string): Promise<T> {
        const response = await this.fetchWithToken(endpoint, {
            method: 'DELETE',
        });
        return response?.json();
    }

    private async handle403(): Promise<boolean> {
        const response = await this.request(
            'login',
            {
                method: 'POST',
                body: JSON.stringify({ refresh: this.refreshToken }),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            true
        );
        if (response?.status !== 200) {
            await this.onTokenError();
            return false;
        }
        const { token } = await response?.json();
        this.token = token;
        this.onTokenUpdate(this.token);

        return true;
    }

    async login(body: UserLoginType): Promise<UserLoginResultType> {
        const res = await this.post<UserLoginResultType>('login', body, true);

        this.token = res?.token;
        this.refreshToken = res?.refresh;

        this.onTokenUpdate(this.token);

        return res;
    }

    async createUser(body: UserLoginType): Promise<UserLoginResultType> {
        const res = await this.post<UserLoginResultType>('register', body, true);

        this.token = res?.token;
        this.refreshToken = res?.refresh;

        return res;
    }

    async getUsers(
        params: UserType & MetadataType & UserFiltersType
    ): Promise<ResultType<UserType>> {
        const params2 = new URLSearchParams();

        for (const key of Object.keys(params) as (keyof (UserType &
            MetadataType &
            UserFiltersType))[]) {
            if (params[key]) {
                params2.append(key, params[key]?.toString() || '');
            }
        }

        const queryString = params2.toString();
        const endpoint = queryString ? `users?${queryString}` : 'users';

        return this.get<ResultType<UserType>>(endpoint);
    }

    async getPages<T>(): Promise<T> {
        return this.get<T>('pages');
    }

    async getPage<T>(path: string): Promise<T> {
        return this.get<T>(`pages?path=${path}`, true);
    }

    async addPage<T>(data: any): Promise<T> {
        return this.post<T>('pages', data);
    }

    async getStatPage<T>(): Promise<T> {
        return this.get<T>(`pages/stat/1`, true);
    }
}

export type ConstructorType = {
    url: string;
    token?: string;
    refreshToken?: string;
    onTokenUpdate: any;
    onTokenError: any;
};

export type ResultType<T> = {
    total: number;
    data: T[];
};

export type MetadataType = {
    _page?: number;
    _limit?: number;
    _sort?: string[];
    _fields?: string[];
    _search?: string;
};

export type UserType = {
    name?: string;
};

export type UserLoginType = {
    login?: string;
    email: string;
    password: string;
    isInit?: string;
};

export type UserLoginResultType = {
    id: number;
    login: string;
    statuses: string[];
    token: string;
    firstName?: string;
    secondName?: string;
    email: string;
    refresh: string;
};

export type UserFiltersType = {
    _from_name?: string;
    _to_name?: string;
};
