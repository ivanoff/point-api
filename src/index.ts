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

    handleQueryString(query: any) {
        const params = new URLSearchParams();

        for (const key of Object.keys(params) as (keyof UserType)[]) {
            if (query[`${key}`]) {
                params.append(key, query[`${key}`]?.toString() || '');
            }
        }

        return params.toString();
    }

    async login(body: UserLoginType): Promise<UserLoginResultType> {
        const res = await this.post<UserLoginResultType>('/login', body, true);

        this.token = res?.token;
        this.refreshToken = res?.refresh;

        this.onTokenUpdate(this.token);

        return res;
    }

    async createUser(body: UserLoginType): Promise<UserLoginResultType> {
        const res = await this.post<UserLoginResultType>('/register', body, true);

        this.token = res?.token;
        this.refreshToken = res?.refresh;

        return res;
    }

    async getDrawio(query: DrawioQueryType): Promise<ResultType<DrawioResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<DrawioResponseType>>(
            queryString ? `/drawio?${queryString}` : '/drawio'
        );
    }

    async registerNewUser(body: RegisterBodyType): Promise<RegisterResponseType> {
        return this.post<RegisterResponseType>('/register', body);
    }

    async getAccessToken(body: LoginBodyType): Promise<LoginResponseType> {
        return this.post<LoginResponseType>('/login', body);
    }

    async loginByService(params: LoginParamsType, body: LoginBodyType): Promise<LoginResponseType> {
        return this.post<LoginResponseType>(`/login/${params.Service}`, body);
    }

    async checkRegisteredEmail(body: CheckBodyType): Promise<CheckResponseType> {
        return this.post<CheckResponseType>('/register/check', body);
    }

    async refreshAccessToken(body: RefreshBodyType): Promise<RefreshResponseType> {
        return this.post<RefreshResponseType>('/login/refresh', body);
    }

    async logout(body: LogoutBodyType): Promise<LogoutResponseType> {
        return this.post<LogoutResponseType>('/logout', body);
    }

    async changePassword(body: LoginBodyType): Promise<LoginResponseType> {
        return this.patch<LoginResponseType>('/login', body);
    }

    async forgotPasssword(body: ForgotBodyType): Promise<ForgotResponseType> {
        return this.post<ForgotResponseType>('/login/forgot', body);
    }

    async setForgotPasssword(body: RestoreBodyType): Promise<RestoreResponseType> {
        return this.post<RestoreResponseType>('/login/restore', body);
    }

    async changeEmail(body: EmailBodyType): Promise<EmailResponseType> {
        return this.post<EmailResponseType>('/login/email', body);
    }

    async getExternalsLogin(query: ExternalsQueryType): Promise<ResultType<ExternalsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<ExternalsResponseType>>(
            queryString ? `/login/externals?${queryString}` : '/login/externals'
        );
    }

    async deleteExternalsByExternalName(params: LoginParamsType): Promise<ExternalsResponseType> {
        return this.delete<ExternalsResponseType>(`/login/externals/${params.ExternalName}`);
    }

    async updateUserStatusByUserId(
        params: UsersParamsType,
        body: StatusesBodyType
    ): Promise<StatusesResponseType> {
        return this.post<StatusesResponseType>(
            `/users/${params.UserId}/statuses/${params.StatusName}`,
            body
        );
    }

    async deleteUserStatusByUserId(params: UsersParamsType): Promise<StatusesResponseType> {
        return this.delete<StatusesResponseType>(
            `/users/${params.UserId}/statuses/${params.StatusName}`
        );
    }

    async loginAsUserByAdmin(
        params: SuperadminParamsType
    ): Promise<ResultType<TokensResponseType>> {
        return this.get<ResultType<TokensResponseType>>(`/superadmin/tokens/${params.UserId}`);
    }

    async logoutAsUserByAdmin(): Promise<TokensResponseType> {
        return this.delete<TokensResponseType>('/superadmin/tokens');
    }

    async addSubscribeInEmails(body: SubscribeBodyType): Promise<SubscribeResponseType> {
        return this.post<SubscribeResponseType>('/emails/subscribe', body);
    }

    async deleteSubscribeInEmails(): Promise<SubscribeResponseType> {
        return this.delete<SubscribeResponseType>('/emails/subscribe');
    }

    async getImages(query: ImagesQueryType): Promise<ResultType<ImagesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<ImagesResponseType>>(
            queryString ? `/images?${queryString}` : '/images'
        );
    }

    async addImage(body: ImagesBodyType): Promise<ImagesResponseType> {
        return this.post<ImagesResponseType>('/images', body);
    }

    async getImagesById(params: ImagesParamsType): Promise<ResultType<ImagesResponseType>> {
        return this.get<ResultType<ImagesResponseType>>(`/images/${params.Id}`);
    }

    async deleteImageById(params: ImagesParamsType): Promise<ImagesResponseType> {
        return this.delete<ImagesResponseType>(`/images/${params.Id}`);
    }

    async deleteImagesByIdInNewsByNewsId(params: NewsParamsType): Promise<ImagesResponseType> {
        return this.delete<ImagesResponseType>(`/news/${params.NewsId}/images/${params.Id}`);
    }

    async addImagesByIdInNewsByNewsId(
        params: NewsParamsType,
        body: ImagesBodyType
    ): Promise<ImagesResponseType> {
        return this.post<ImagesResponseType>(`/news/${params.NewsId}/images/${params.Id}`, body);
    }

    async getNews(query: NewsQueryType): Promise<ResultType<NewsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<NewsResponseType>>(
            queryString ? `/news?${queryString}` : '/news'
        );
    }

    async addNew(body: NewsBodyType): Promise<NewsResponseType> {
        return this.post<NewsResponseType>('/news', body);
    }

    async getNewsById(params: NewsParamsType): Promise<ResultType<NewsResponseType>> {
        return this.get<ResultType<NewsResponseType>>(`/news/${params.Id}`);
    }

    async updateNewById(params: NewsParamsType, body: NewsBodyType): Promise<NewsResponseType> {
        return this.put<NewsResponseType>(`/news/${params.Id}`, body);
    }

    async deleteNewById(params: NewsParamsType): Promise<NewsResponseType> {
        return this.delete<NewsResponseType>(`/news/${params.Id}`);
    }

    async addKeyPointsInTopics(body: KeyPointsBodyType): Promise<KeyPointsResponseType> {
        return this.post<KeyPointsResponseType>('/topics/key_points', body);
    }

    async getKeyPointsInTopics(
        query: KeyPointsQueryType
    ): Promise<ResultType<KeyPointsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<KeyPointsResponseType>>(
            queryString ? `/topics/key_points?${queryString}` : '/topics/key_points'
        );
    }

    async getKeyPointsByIdInTopics(
        params: TopicsParamsType
    ): Promise<ResultType<KeyPointsResponseType>> {
        return this.get<ResultType<KeyPointsResponseType>>(`/topics/keyPoints/${params.Id}`);
    }

    async updateKeyPointsByIdInTopics(
        params: TopicsParamsType,
        body: KeyPointsBodyType
    ): Promise<KeyPointsResponseType> {
        return this.put<KeyPointsResponseType>(`/topics/keyPoints/${params.Id}`, body);
    }

    async deleteKeyPointsByIdInTopics(params: TopicsParamsType): Promise<KeyPointsResponseType> {
        return this.delete<KeyPointsResponseType>(`/topics/keyPoints/${params.Id}`);
    }

    async addUserStatusesInTopics(body: UserStatusesBodyType): Promise<UserStatusesResponseType> {
        return this.post<UserStatusesResponseType>('/topics/user_statuses', body);
    }

    async getUserStatusesInTopics(
        query: UserStatusesQueryType
    ): Promise<ResultType<UserStatusesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<UserStatusesResponseType>>(
            queryString ? `/topics/user_statuses?${queryString}` : '/topics/user_statuses'
        );
    }

    async getUserStatusesByIdInTopics(
        params: TopicsParamsType
    ): Promise<ResultType<UserStatusesResponseType>> {
        return this.get<ResultType<UserStatusesResponseType>>(`/topics/userStatuses/${params.Id}`);
    }

    async updateUserStatusesByIdInTopics(
        params: TopicsParamsType,
        body: UserStatusesBodyType
    ): Promise<UserStatusesResponseType> {
        return this.put<UserStatusesResponseType>(`/topics/userStatuses/${params.Id}`, body);
    }

    async deleteUserStatusesByIdInTopics(
        params: TopicsParamsType
    ): Promise<UserStatusesResponseType> {
        return this.delete<UserStatusesResponseType>(`/topics/userStatuses/${params.Id}`);
    }

    async addTopic(body: TopicsBodyType): Promise<TopicsResponseType> {
        return this.post<TopicsResponseType>('/topics', body);
    }

    async updateTopicById(
        params: TopicsParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/topics/${params.Id}`, body);
    }

    async getTopics(query: TopicsQueryType): Promise<ResultType<TopicsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TopicsResponseType>>(
            queryString ? `/topics?${queryString}` : '/topics'
        );
    }

    async getTopicsById(params: TopicsParamsType): Promise<ResultType<TopicsResponseType>> {
        return this.get<ResultType<TopicsResponseType>>(`/topics/${params.Id}`);
    }

    async deleteTopicById(params: TopicsParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/topics/${params.Id}`);
    }

    async addTeachersInCourses(body: TeachersBodyType): Promise<TeachersResponseType> {
        return this.post<TeachersResponseType>('/courses/teachers', body);
    }

    async getTeachersInCourses(
        query: TeachersQueryType
    ): Promise<ResultType<TeachersResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TeachersResponseType>>(
            queryString ? `/courses/teachers?${queryString}` : '/courses/teachers'
        );
    }

    async getTeachersByIdInCourses(
        params: CoursesParamsType
    ): Promise<ResultType<TeachersResponseType>> {
        return this.get<ResultType<TeachersResponseType>>(`/courses/teachers/${params.Id}`);
    }

    async updateTeachersByIdInCourses(
        params: CoursesParamsType,
        body: TeachersBodyType
    ): Promise<TeachersResponseType> {
        return this.put<TeachersResponseType>(`/courses/teachers/${params.Id}`, body);
    }

    async deleteTeachersByIdInCourses(params: CoursesParamsType): Promise<TeachersResponseType> {
        return this.delete<TeachersResponseType>(`/courses/teachers/${params.Id}`);
    }

    async addTopicsInCourses(body: TopicsBodyType): Promise<TopicsResponseType> {
        return this.post<TopicsResponseType>('/courses/topics', body);
    }

    async getTopicsInCourses(query: TopicsQueryType): Promise<ResultType<TopicsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TopicsResponseType>>(
            queryString ? `/courses/topics?${queryString}` : '/courses/topics'
        );
    }

    async getTopicsByIdInCourses(
        params: CoursesParamsType
    ): Promise<ResultType<TopicsResponseType>> {
        return this.get<ResultType<TopicsResponseType>>(`/courses/topics/${params.Id}`);
    }

    async updateTopicsByIdInCourses(
        params: CoursesParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/courses/topics/${params.Id}`, body);
    }

    async deleteTopicsByIdInCourses(params: CoursesParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/courses/topics/${params.Id}`);
    }

    async addCourse(body: CoursesBodyType): Promise<CoursesResponseType> {
        return this.post<CoursesResponseType>('/courses', body);
    }

    async getCourses(query: CoursesQueryType): Promise<ResultType<CoursesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<CoursesResponseType>>(
            queryString ? `/courses?${queryString}` : '/courses'
        );
    }

    async getCoursesById(params: CoursesParamsType): Promise<ResultType<CoursesResponseType>> {
        return this.get<ResultType<CoursesResponseType>>(`/courses/${params.Id}`);
    }

    async updateCourseById(
        params: CoursesParamsType,
        body: CoursesBodyType
    ): Promise<CoursesResponseType> {
        return this.put<CoursesResponseType>(`/courses/${params.Id}`, body);
    }

    async deleteCourseById(params: CoursesParamsType): Promise<CoursesResponseType> {
        return this.delete<CoursesResponseType>(`/courses/${params.Id}`);
    }

    async addSchedulesForCourseByCourseId(
        params: CoursesParamsType,
        body: SchedulesBodyType
    ): Promise<SchedulesResponseType> {
        return this.post<SchedulesResponseType>(`/courses/${params.CourseId}/schedules`, body);
    }

    async getSchedulesForCoursesByCourseId(
        params: CoursesParamsType,
        query: SchedulesQueryType
    ): Promise<ResultType<SchedulesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<SchedulesResponseType>>(
            queryString
                ? `/courses/${params.CourseId}/schedules?${queryString}`
                : `/courses/${params.CourseId}/schedules`
        );
    }

    async getSchedulesByIdInCoursesByCourseId(
        params: CoursesParamsType
    ): Promise<ResultType<SchedulesResponseType>> {
        return this.get<ResultType<SchedulesResponseType>>(
            `/courses/${params.CourseId}/schedules/${params.Id}`
        );
    }

    async updateSchedulesByIdInCoursesByCourseId(
        params: CoursesParamsType,
        body: SchedulesBodyType
    ): Promise<SchedulesResponseType> {
        return this.put<SchedulesResponseType>(
            `/courses/${params.CourseId}/schedules/${params.Id}`,
            body
        );
    }

    async deleteSchedulesByIdInCoursesByCourseId(
        params: CoursesParamsType
    ): Promise<SchedulesResponseType> {
        return this.delete<SchedulesResponseType>(
            `/courses/${params.CourseId}/schedules/${params.Id}`
        );
    }

    async addTeachersInSchedules(body: TeachersBodyType): Promise<TeachersResponseType> {
        return this.post<TeachersResponseType>('/schedules/teachers', body);
    }

    async getTeachersInSchedules(
        query: TeachersQueryType
    ): Promise<ResultType<TeachersResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TeachersResponseType>>(
            queryString ? `/schedules/teachers?${queryString}` : '/schedules/teachers'
        );
    }

    async getTeachersByIdInSchedules(
        params: SchedulesParamsType
    ): Promise<ResultType<TeachersResponseType>> {
        return this.get<ResultType<TeachersResponseType>>(`/schedules/teachers/${params.Id}`);
    }

    async updateTeachersByIdInSchedules(
        params: SchedulesParamsType,
        body: TeachersBodyType
    ): Promise<TeachersResponseType> {
        return this.put<TeachersResponseType>(`/schedules/teachers/${params.Id}`, body);
    }

    async deleteTeachersByIdInSchedules(
        params: SchedulesParamsType
    ): Promise<TeachersResponseType> {
        return this.delete<TeachersResponseType>(`/schedules/teachers/${params.Id}`);
    }

    async addStudentsForScheduleByScheduleId(
        params: SchedulesParamsType,
        body: StudentsBodyType
    ): Promise<StudentsResponseType> {
        return this.post<StudentsResponseType>(`/schedules/${params.ScheduleId}/students`, body);
    }

    async getStudentsForSchedulesByScheduleId(
        params: SchedulesParamsType,
        query: StudentsQueryType
    ): Promise<ResultType<StudentsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<StudentsResponseType>>(
            queryString
                ? `/schedules/${params.ScheduleId}/students?${queryString}`
                : `/schedules/${params.ScheduleId}/students`
        );
    }

    async getStudentsByIdInSchedulesByScheduleId(
        params: SchedulesParamsType
    ): Promise<ResultType<StudentsResponseType>> {
        return this.get<ResultType<StudentsResponseType>>(
            `/schedules/${params.ScheduleId}/students/${params.Id}`
        );
    }

    async updateStudentsByIdInSchedulesByScheduleId(
        params: SchedulesParamsType,
        body: StudentsBodyType
    ): Promise<StudentsResponseType> {
        return this.put<StudentsResponseType>(
            `/schedules/${params.ScheduleId}/students/${params.Id}`,
            body
        );
    }

    async deleteStudentsByIdInSchedulesByScheduleId(
        params: SchedulesParamsType
    ): Promise<StudentsResponseType> {
        return this.delete<StudentsResponseType>(
            `/schedules/${params.ScheduleId}/students/${params.Id}`
        );
    }

    async addSchedule(body: SchedulesBodyType): Promise<SchedulesResponseType> {
        return this.post<SchedulesResponseType>('/schedules', body);
    }

    async getSchedules(query: SchedulesQueryType): Promise<ResultType<SchedulesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<SchedulesResponseType>>(
            queryString ? `/schedules?${queryString}` : '/schedules'
        );
    }

    async getSchedulesById(
        params: SchedulesParamsType
    ): Promise<ResultType<SchedulesResponseType>> {
        return this.get<ResultType<SchedulesResponseType>>(`/schedules/${params.Id}`);
    }

    async updateScheduleById(
        params: SchedulesParamsType,
        body: SchedulesBodyType
    ): Promise<SchedulesResponseType> {
        return this.put<SchedulesResponseType>(`/schedules/${params.Id}`, body);
    }

    async deleteScheduleById(params: SchedulesParamsType): Promise<SchedulesResponseType> {
        return this.delete<SchedulesResponseType>(`/schedules/${params.Id}`);
    }

    async addSharesInGoals(body: SharesBodyType): Promise<SharesResponseType> {
        return this.post<SharesResponseType>('/goals/shares', body);
    }

    async getSharesInGoals(query: SharesQueryType): Promise<ResultType<SharesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<SharesResponseType>>(
            queryString ? `/goals/shares?${queryString}` : '/goals/shares'
        );
    }

    async getSharesByIdInGoals(params: GoalsParamsType): Promise<ResultType<SharesResponseType>> {
        return this.get<ResultType<SharesResponseType>>(`/goals/shares/${params.Id}`);
    }

    async updateSharesByIdInGoals(
        params: GoalsParamsType,
        body: SharesBodyType
    ): Promise<SharesResponseType> {
        return this.put<SharesResponseType>(`/goals/shares/${params.Id}`, body);
    }

    async deleteSharesByIdInGoals(params: GoalsParamsType): Promise<SharesResponseType> {
        return this.delete<SharesResponseType>(`/goals/shares/${params.Id}`);
    }

    async addTopicsInGoals(body: TopicsBodyType): Promise<TopicsResponseType> {
        return this.post<TopicsResponseType>('/goals/topics', body);
    }

    async getTopicsInGoals(query: TopicsQueryType): Promise<ResultType<TopicsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TopicsResponseType>>(
            queryString ? `/goals/topics?${queryString}` : '/goals/topics'
        );
    }

    async getTopicsByIdInGoals(params: GoalsParamsType): Promise<ResultType<TopicsResponseType>> {
        return this.get<ResultType<TopicsResponseType>>(`/goals/topics/${params.Id}`);
    }

    async updateTopicsByIdInGoals(
        params: GoalsParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/goals/topics/${params.Id}`, body);
    }

    async deleteTopicsByIdInGoals(params: GoalsParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/goals/topics/${params.Id}`);
    }

    async addGoal(body: GoalsBodyType): Promise<GoalsResponseType> {
        return this.post<GoalsResponseType>('/goals', body);
    }

    async getGoals(query: GoalsQueryType): Promise<ResultType<GoalsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<GoalsResponseType>>(
            queryString ? `/goals?${queryString}` : '/goals'
        );
    }

    async getGoalsById(params: GoalsParamsType): Promise<ResultType<GoalsResponseType>> {
        return this.get<ResultType<GoalsResponseType>>(`/goals/${params.Id}`);
    }

    async updateGoalById(params: GoalsParamsType, body: GoalsBodyType): Promise<GoalsResponseType> {
        return this.put<GoalsResponseType>(`/goals/${params.Id}`, body);
    }

    async deleteGoalById(params: GoalsParamsType): Promise<GoalsResponseType> {
        return this.delete<GoalsResponseType>(`/goals/${params.Id}`);
    }

    async addTopicsInCategories(body: TopicsBodyType): Promise<TopicsResponseType> {
        return this.post<TopicsResponseType>('/categories/topics', body);
    }

    async getTopicsInCategories(query: TopicsQueryType): Promise<ResultType<TopicsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TopicsResponseType>>(
            queryString ? `/categories/topics?${queryString}` : '/categories/topics'
        );
    }

    async getTopicsByIdInCategories(
        params: CategoriesParamsType
    ): Promise<ResultType<TopicsResponseType>> {
        return this.get<ResultType<TopicsResponseType>>(`/categories/topics/${params.Id}`);
    }

    async updateTopicsByIdInCategories(
        params: CategoriesParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/categories/topics/${params.Id}`, body);
    }

    async deleteTopicsByIdInCategories(params: CategoriesParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/categories/topics/${params.Id}`);
    }

    async addCategorie(body: CategoriesBodyType): Promise<CategoriesResponseType> {
        return this.post<CategoriesResponseType>('/categories', body);
    }

    async getCategories(query: CategoriesQueryType): Promise<ResultType<CategoriesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<CategoriesResponseType>>(
            queryString ? `/categories?${queryString}` : '/categories'
        );
    }

    async getCategoriesById(
        params: CategoriesParamsType
    ): Promise<ResultType<CategoriesResponseType>> {
        return this.get<ResultType<CategoriesResponseType>>(`/categories/${params.Id}`);
    }

    async updateCategorieById(
        params: CategoriesParamsType,
        body: CategoriesBodyType
    ): Promise<CategoriesResponseType> {
        return this.put<CategoriesResponseType>(`/categories/${params.Id}`, body);
    }

    async deleteCategorieById(params: CategoriesParamsType): Promise<CategoriesResponseType> {
        return this.delete<CategoriesResponseType>(`/categories/${params.Id}`);
    }

    async getTree(query: TreeQueryType): Promise<ResultType<TreeResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TreeResponseType>>(
            queryString ? `/tree?${queryString}` : '/tree'
        );
    }

    async getTreeByAssetId(params: TreeParamsType): Promise<ResultType<TreeResponseType>> {
        return this.get<ResultType<TreeResponseType>>(`/tree/${params.AssetId}`);
    }

    async getTree2ByAssetId(params: Tree2ParamsType): Promise<ResultType<Tree2ResponseType>> {
        return this.get<ResultType<Tree2ResponseType>>(`/tree2/${params.AssetId}`);
    }

    async addLanguageCode(body: LanguageCodesBodyType): Promise<LanguageCodesResponseType> {
        return this.post<LanguageCodesResponseType>('/language_codes', body);
    }

    async getLanguageCodes(
        query: LanguageCodesQueryType
    ): Promise<ResultType<LanguageCodesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<LanguageCodesResponseType>>(
            queryString ? `/language_codes?${queryString}` : '/language_codes'
        );
    }

    async getLanguageCodesById(
        params: LanguageCodesParamsType
    ): Promise<ResultType<LanguageCodesResponseType>> {
        return this.get<ResultType<LanguageCodesResponseType>>(`/languageCodes/${params.Id}`);
    }

    async updateLanguageCodeById(
        params: LanguageCodesParamsType,
        body: LanguageCodesBodyType
    ): Promise<LanguageCodesResponseType> {
        return this.put<LanguageCodesResponseType>(`/languageCodes/${params.Id}`, body);
    }

    async deleteLanguageCodeById(
        params: LanguageCodesParamsType
    ): Promise<LanguageCodesResponseType> {
        return this.delete<LanguageCodesResponseType>(`/languageCodes/${params.Id}`);
    }

    async addLearnStatuse(body: LearnStatusesBodyType): Promise<LearnStatusesResponseType> {
        return this.post<LearnStatusesResponseType>('/learn_statuses', body);
    }

    async getLearnStatuses(
        query: LearnStatusesQueryType
    ): Promise<ResultType<LearnStatusesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<LearnStatusesResponseType>>(
            queryString ? `/learn_statuses?${queryString}` : '/learn_statuses'
        );
    }

    async getLearnStatusesById(
        params: LearnStatusesParamsType
    ): Promise<ResultType<LearnStatusesResponseType>> {
        return this.get<ResultType<LearnStatusesResponseType>>(`/learnStatuses/${params.Id}`);
    }

    async updateLearnStatuseById(
        params: LearnStatusesParamsType,
        body: LearnStatusesBodyType
    ): Promise<LearnStatusesResponseType> {
        return this.put<LearnStatusesResponseType>(`/learnStatuses/${params.Id}`, body);
    }

    async deleteLearnStatuseById(
        params: LearnStatusesParamsType
    ): Promise<LearnStatusesResponseType> {
        return this.delete<LearnStatusesResponseType>(`/learnStatuses/${params.Id}`);
    }

    async addRegion(body: RegionsBodyType): Promise<RegionsResponseType> {
        return this.post<RegionsResponseType>('/regions', body);
    }

    async getRegions(query: RegionsQueryType): Promise<ResultType<RegionsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<RegionsResponseType>>(
            queryString ? `/regions?${queryString}` : '/regions'
        );
    }

    async getRegionsById(params: RegionsParamsType): Promise<ResultType<RegionsResponseType>> {
        return this.get<ResultType<RegionsResponseType>>(`/regions/${params.Id}`);
    }

    async updateRegionById(
        params: RegionsParamsType,
        body: RegionsBodyType
    ): Promise<RegionsResponseType> {
        return this.put<RegionsResponseType>(`/regions/${params.Id}`, body);
    }

    async deleteRegionById(params: RegionsParamsType): Promise<RegionsResponseType> {
        return this.delete<RegionsResponseType>(`/regions/${params.Id}`);
    }

    async getMeInUsers(query: MeQueryType): Promise<ResultType<MeResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<MeResponseType>>(
            queryString ? `/users/me?${queryString}` : '/users/me'
        );
    }

    async updateUserById(params: UsersParamsType, body: UsersBodyType): Promise<UsersResponseType> {
        return this.put<UsersResponseType>(`/users/${params.Id}`, body);
    }

    async patchPasswordForUserById(
        params: UsersParamsType,
        body: PasswordBodyType
    ): Promise<PasswordResponseType> {
        return this.patch<PasswordResponseType>(`/users/${params.Id}/password`, body);
    }

    async deleteUserById(params: UsersParamsType): Promise<UsersResponseType> {
        return this.delete<UsersResponseType>(`/users/${params.Id}`);
    }

    async addUser(body: UsersBodyType): Promise<UsersResponseType> {
        return this.post<UsersResponseType>('/users', body);
    }

    async getUsers(query: UsersQueryType): Promise<ResultType<UsersResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<UsersResponseType>>(
            queryString ? `/users?${queryString}` : '/users'
        );
    }

    async getUsersById(params: UsersParamsType): Promise<ResultType<UsersResponseType>> {
        return this.get<ResultType<UsersResponseType>>(`/users/${params.Id}`);
    }

    async getGoogleUrl(query: GoogleQueryType): Promise<ResultType<GoogleResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<GoogleResponseType>>(
            queryString ? `/login/google?${queryString}` : '/login/google'
        );
    }

    async postGoogleData(body: GoogleBodyType): Promise<GoogleResponseType> {
        return this.post<GoogleResponseType>('/login/google', body);
    }

    async getMicrosoftUrl(query: MicrosoftQueryType): Promise<ResultType<MicrosoftResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<MicrosoftResponseType>>(
            queryString ? `/login/microsoft?${queryString}` : '/login/microsoft'
        );
    }

    async postMicrosoftData(body: MicrosoftBodyType): Promise<MicrosoftResponseType> {
        return this.post<MicrosoftResponseType>('/login/microsoft', body);
    }

    async getLinkedinUrl(query: LinkedinQueryType): Promise<ResultType<LinkedinResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<LinkedinResponseType>>(
            queryString ? `/login/linkedin?${queryString}` : '/login/linkedin'
        );
    }

    async postLinkedinData(body: LinkedinBodyType): Promise<LinkedinResponseType> {
        return this.post<LinkedinResponseType>('/login/linkedin', body);
    }

    async getLFacebookUrl(query: FacebookQueryType): Promise<ResultType<FacebookResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<FacebookResponseType>>(
            queryString ? `/login/facebook?${queryString}` : '/login/facebook'
        );
    }

    async postLFacebookData(body: FacebookBodyType): Promise<FacebookResponseType> {
        return this.post<FacebookResponseType>('/login/facebook', body);
    }

    async getCheck(query: CheckQueryType): Promise<ResultType<CheckResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<CheckResponseType>>(
            queryString ? `/check?${queryString}` : '/check'
        );
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

export type DrawioQueryType = any;

export type DrawioResponseType = any;

export type RegisterQueryType = any;

export type RegisterResponseType = {
    login?: string | number | boolean;
    password?: string | number | boolean;
    firstName?: string | number | boolean;
    secondName?: string | number | boolean;
    email?: string | number | boolean;
};

export type RegisterBodyType = {
    login?: string | number | boolean;
    password?: string | number | boolean;
    firstName?: string | number | boolean;
    secondName?: string | number | boolean;
    email?: string | number | boolean;
};

export type LoginQueryType = any;

export type LoginResponseType = {
    login?: string | number | boolean;
    password?: string | number | boolean;
    email?: string | number | boolean;
    firstName?: string | number | boolean;
    newPassword?: string | number | boolean;
};

export type LoginBodyType = {
    login?: string | number | boolean;
    password?: string | number | boolean;
    email?: string | number | boolean;
    firstName?: string | number | boolean;
    newPassword?: string | number | boolean;
};

export type LoginParamsType = {
    Service?: string | number | boolean;
    ExternalName?: string | number | boolean;
};

export type CheckQueryType = any;

export type CheckResponseType = {
    login?: string | number | boolean;
    code?: string | number | boolean;
};

export type CheckBodyType = {
    login?: string | number | boolean;
    code?: string | number | boolean;
};

export type RefreshQueryType = any;

export type RefreshResponseType = {
    refresh?: string | number | boolean;
};

export type RefreshBodyType = {
    refresh?: string | number | boolean;
};

export type LogoutQueryType = any;

export type LogoutResponseType = any;

export type LogoutBodyType = any;

export type ForgotQueryType = any;

export type ForgotResponseType = {
    login?: string | number | boolean;
};

export type ForgotBodyType = {
    login?: string | number | boolean;
};

export type RestoreQueryType = any;

export type RestoreResponseType = {
    code?: string | number | boolean;
    password?: string | number | boolean;
};

export type RestoreBodyType = {
    code?: string | number | boolean;
    password?: string | number | boolean;
};

export type EmailQueryType = any;

export type EmailResponseType = {
    code?: string | number | boolean;
};

export type EmailBodyType = {
    code?: string | number | boolean;
};

export type ExternalsQueryType = any;

export type ExternalsResponseType = any;

export type UsersParamsType = {
    UserId?: string | number | boolean;
    StatusName?: string | number | boolean;
    Id?: string | number | boolean;
};

export type SuperadminParamsType = {
    UserId?: string | number | boolean;
};

export type TokensQueryType = any;

export type TokensResponseType = any;

export type SubscribeQueryType = any;

export type SubscribeResponseType = any;

export type SubscribeBodyType = any;

export type ImagesQueryType = any;

export type ImagesResponseType = any;

export type ImagesBodyType = any;

export type ImagesParamsType = {
    Id?: string | number | boolean;
};

export type NewsParamsType = {
    NewsId?: string | number | boolean;
    Id?: string | number | boolean;
};

export type NewsQueryType = {
    id?: number;
    timeCreated?: string;
    timePublished?: string;
    userId?: number;
    title?: string;
    announcement?: string;
    body?: string;
    totalViews?: number;
    totalLikes?: number;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_timePublished?: string;
    _not_null_timePublished?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_title?: string;
    _not_null_title?: string;
    _null_announcement?: string;
    _not_null_announcement?: string;
    _null_body?: string;
    _not_null_body?: string;
    _null_totalViews?: string;
    _not_null_totalViews?: string;
    _null_totalLikes?: string;
    _not_null_totalLikes?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_timePublished?: string;
    _to_timePublished?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_title?: string;
    _to_title?: string;
    _from_announcement?: string;
    _to_announcement?: string;
    _from_body?: string;
    _to_body?: string;
    _from_totalViews?: number;
    _to_totalViews?: number;
    _from_totalLikes?: number;
    _to_totalLikes?: number;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
};

export type NewsResponseType = {
    timePublished?: string;
    userId?: number;
    title?: string;
    announcement?: string;
    body?: string;
    totalLikes?: number;
};

export type NewsBodyType = {
    timePublished?: string;
    userId?: number;
    title?: string;
    announcement?: string;
    body?: string;
    totalLikes?: number;
};

export type KeyPointsQueryType = {
    id?: number;
    timeCreated?: string;
    userId?: number;
    topicId?: number;
    question?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_topicId?: string;
    _not_null_topicId?: string;
    _null_question?: string;
    _not_null_question?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_topicId?: number;
    _to_topicId?: number;
    _from_question?: string;
    _to_question?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type KeyPointsResponseType = {
    userId?: number;
    topicId?: number;
    question?: string;
};

export type KeyPointsBodyType = {
    userId?: number;
    topicId?: number;
    question?: string;
};

export type TopicsParamsType = {
    Id?: string | number | boolean;
};

export type UserStatusesQueryType = {
    id?: number;
    timeCreated?: string;
    timeStarted?: string;
    timeFinished?: string;
    userId?: number;
    topicId?: number;
    learnStatusId?: number;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_timeStarted?: string;
    _not_null_timeStarted?: string;
    _null_timeFinished?: string;
    _not_null_timeFinished?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_topicId?: string;
    _not_null_topicId?: string;
    _null_learnStatusId?: string;
    _not_null_learnStatusId?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_timeStarted?: string;
    _to_timeStarted?: string;
    _from_timeFinished?: string;
    _to_timeFinished?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_topicId?: number;
    _to_topicId?: number;
    _from_learnStatusId?: number;
    _to_learnStatusId?: number;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
};

export type UserStatusesResponseType = {
    timeStarted?: string;
    timeFinished?: string;
    userId?: number;
    topicId?: number;
    learnStatusId?: number;
};

export type UserStatusesBodyType = {
    timeStarted?: string;
    timeFinished?: string;
    userId?: number;
    topicId?: number;
    learnStatusId?: number;
};

export type TopicsQueryType = {
    id?: number;
    timeCreated?: string;
    userId?: number;
    categoryId?: number;
    topicId?: number;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_categoryId?: string;
    _not_null_categoryId?: string;
    _null_topicId?: string;
    _not_null_topicId?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_categoryId?: number;
    _to_categoryId?: number;
    _from_topicId?: number;
    _to_topicId?: number;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
};

export type TopicsResponseType = {
    userId?: number;
    name?: string;
    description?: string;
    type?: string;
    tags?: string;
    slug?: string;
    timeToLearnMinutes?: number;
    courseId?: number;
    topicId?: number;
    isPreRequirement?: boolean;
    goalId?: number;
    categoryId?: number;
};

export type TopicsBodyType = {
    userId?: number;
    name?: string;
    description?: string;
    type?: string;
    tags?: string;
    slug?: string;
    timeToLearnMinutes?: number;
    courseId?: number;
    topicId?: number;
    isPreRequirement?: boolean;
    goalId?: number;
    categoryId?: number;
};

export type TeachersQueryType = {
    id?: number;
    timeCreated?: string;
    userId?: number;
    sceduleId?: number;
    teacherId?: number;
    courseName?: string;
    teacherName?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_sceduleId?: string;
    _not_null_sceduleId?: string;
    _null_teacherId?: string;
    _not_null_teacherId?: string;
    _null_courseName?: string;
    _not_null_courseName?: string;
    _null_teacherName?: string;
    _not_null_teacherName?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_sceduleId?: number;
    _to_sceduleId?: number;
    _from_teacherId?: number;
    _to_teacherId?: number;
    _from_courseName?: string;
    _to_courseName?: string;
    _from_teacherName?: string;
    _to_teacherName?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type TeachersResponseType = {
    userId?: number;
    sceduleId?: number;
    teacherId?: number;
    courseName?: string;
    teacherName?: string;
};

export type TeachersBodyType = {
    userId?: number;
    sceduleId?: number;
    teacherId?: number;
    courseName?: string;
    teacherName?: string;
};

export type CoursesParamsType = {
    Id?: string | number | boolean;
    CourseId?: string | number | boolean;
};

export type CoursesQueryType = {
    id?: number;
    timeCreated?: string;
    userId?: number;
    name?: string;
    description?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_name?: string;
    _not_null_name?: string;
    _null_description?: string;
    _not_null_description?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_name?: string;
    _to_name?: string;
    _from_description?: string;
    _to_description?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type CoursesResponseType = {
    userId?: number;
    name?: string;
    description?: string;
};

export type CoursesBodyType = {
    userId?: number;
    name?: string;
    description?: string;
};

export type SchedulesQueryType = {
    id?: number;
    timeCreated?: string;
    timeStart?: string;
    timeEnd?: string;
    userId?: number;
    courseId?: number;
    regionId?: number;
    langId?: number;
    isOnline?: boolean;
    price?: number;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_timeStart?: string;
    _not_null_timeStart?: string;
    _null_timeEnd?: string;
    _not_null_timeEnd?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_courseId?: string;
    _not_null_courseId?: string;
    _null_regionId?: string;
    _not_null_regionId?: string;
    _null_langId?: string;
    _not_null_langId?: string;
    _null_isOnline?: string;
    _not_null_isOnline?: string;
    _null_price?: string;
    _not_null_price?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_timeStart?: string;
    _to_timeStart?: string;
    _from_timeEnd?: string;
    _to_timeEnd?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_courseId?: number;
    _to_courseId?: number;
    _from_regionId?: number;
    _to_regionId?: number;
    _from_langId?: number;
    _to_langId?: number;
    _from_price?: number;
    _to_price?: number;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
};

export type SchedulesResponseType = {
    timeStart?: string;
    timeEnd?: string;
    userId?: number;
    courseId?: number;
    regionId?: number;
    langId?: number;
    isOnline?: boolean;
    price?: number;
};

export type SchedulesBodyType = {
    timeStart?: string;
    timeEnd?: string;
    userId?: number;
    courseId?: number;
    regionId?: number;
    langId?: number;
    isOnline?: boolean;
    price?: number;
};

export type SchedulesParamsType = {
    Id?: string | number | boolean;
    ScheduleId?: string | number | boolean;
};

export type StudentsQueryType = {
    id?: number;
    timeCreated?: string;
    userId?: number;
    sceduleId?: number;
    studentId?: number;
    courseName?: string;
    studentName?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_sceduleId?: string;
    _not_null_sceduleId?: string;
    _null_studentId?: string;
    _not_null_studentId?: string;
    _null_courseName?: string;
    _not_null_courseName?: string;
    _null_studentName?: string;
    _not_null_studentName?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_sceduleId?: number;
    _to_sceduleId?: number;
    _from_studentId?: number;
    _to_studentId?: number;
    _from_courseName?: string;
    _to_courseName?: string;
    _from_studentName?: string;
    _to_studentName?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type StudentsResponseType = {
    userId?: number;
    sceduleId?: number;
    studentId?: number;
    courseName?: string;
    studentName?: string;
};

export type StudentsBodyType = {
    userId?: number;
    sceduleId?: number;
    studentId?: number;
    courseName?: string;
    studentName?: string;
};

export type SharesQueryType = {
    id?: number;
    timeCreated?: string;
    goalId?: number;
    userId?: number;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_goalId?: string;
    _not_null_goalId?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_goalId?: number;
    _to_goalId?: number;
    _from_userId?: number;
    _to_userId?: number;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
};

export type SharesResponseType = {
    goalId?: number;
    userId?: number;
};

export type SharesBodyType = {
    goalId?: number;
    userId?: number;
};

export type GoalsParamsType = {
    Id?: string | number | boolean;
};

export type GoalsQueryType = {
    id?: number;
    timeCreated?: string;
    userId?: number;
    name?: string;
    description?: string;
    motivation?: string;
    deadline?: string;
    motto?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_name?: string;
    _not_null_name?: string;
    _null_description?: string;
    _not_null_description?: string;
    _null_motivation?: string;
    _not_null_motivation?: string;
    _null_deadline?: string;
    _not_null_deadline?: string;
    _null_motto?: string;
    _not_null_motto?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_name?: string;
    _to_name?: string;
    _from_description?: string;
    _to_description?: string;
    _from_motivation?: string;
    _to_motivation?: string;
    _from_deadline?: string;
    _to_deadline?: string;
    _from_motto?: string;
    _to_motto?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type GoalsResponseType = {
    userId?: number;
    name?: string;
    description?: string;
    motivation?: string;
    deadline?: string;
    motto?: string;
};

export type GoalsBodyType = {
    userId?: number;
    name?: string;
    description?: string;
    motivation?: string;
    deadline?: string;
    motto?: string;
};

export type CategoriesParamsType = {
    Id?: string | number | boolean;
};

export type CategoriesQueryType = {
    id?: number;
    timeCreated?: string;
    userId?: number;
    name?: string;
    description?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_userId?: string;
    _not_null_userId?: string;
    _null_name?: string;
    _not_null_name?: string;
    _null_description?: string;
    _not_null_description?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_userId?: number;
    _to_userId?: number;
    _from_name?: string;
    _to_name?: string;
    _from_description?: string;
    _to_description?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type CategoriesResponseType = {
    userId?: number;
    name?: string;
    description?: string;
};

export type CategoriesBodyType = {
    userId?: number;
    name?: string;
    description?: string;
};

export type TreeQueryType = any;

export type TreeResponseType = any;

export type TreeParamsType = {
    AssetId?: string | number | boolean;
};

export type Tree2ParamsType = {
    AssetId?: string | number | boolean;
};

export type LanguageCodesQueryType = {
    id?: number;
    timeCreated?: string;
    name?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_name?: string;
    _not_null_name?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_name?: string;
    _to_name?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type LanguageCodesResponseType = {
    name?: string;
};

export type LanguageCodesBodyType = {
    name?: string;
};

export type LanguageCodesParamsType = {
    Id?: string | number | boolean;
};

export type LearnStatusesQueryType = {
    id?: number;
    name?: string;
    description?: string;
    _null_name?: string;
    _not_null_name?: string;
    _null_description?: string;
    _not_null_description?: string;
    _from_id?: number;
    _to_id?: number;
    _from_name?: string;
    _to_name?: string;
    _from_description?: string;
    _to_description?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type LearnStatusesResponseType = {
    name?: string;
    description?: string;
};

export type LearnStatusesBodyType = {
    name?: string;
    description?: string;
};

export type LearnStatusesParamsType = {
    Id?: string | number | boolean;
};

export type RegionsQueryType = {
    id?: number;
    timeCreated?: string;
    name?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_name?: string;
    _not_null_name?: string;
    _from_id?: number;
    _to_id?: number;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_name?: string;
    _to_name?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type RegionsResponseType = {
    name?: string;
};

export type RegionsBodyType = {
    name?: string;
};

export type RegionsParamsType = {
    Id?: string | number | boolean;
};

export type MeQueryType = any;

export type MeResponseType = any;

export type PasswordQueryType = any;

export type PasswordResponseType = {
    password?: string | number | boolean;
    newPassword?: string | number | boolean;
};

export type PasswordBodyType = {
    password?: string | number | boolean;
    newPassword?: string | number | boolean;
};

export type UsersQueryType = {
    id?: number;
    login?: string;
    firstName?: string;
    secondName?: string;
    options?: object;
    externalProfiles?: object;
    timeCreated?: string;
    timeUpdated?: string;
    statuses?: (string | number)[];
    isUnsubscribed?: boolean;
    emailToChange?: string;
    _null_firstName?: string;
    _not_null_firstName?: string;
    _null_secondName?: string;
    _not_null_secondName?: string;
    _null_options?: string;
    _not_null_options?: string;
    _null_externalProfiles?: string;
    _not_null_externalProfiles?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_timeUpdated?: string;
    _not_null_timeUpdated?: string;
    _null_statuses?: string;
    _not_null_statuses?: string;
    _null_isUnsubscribed?: string;
    _not_null_isUnsubscribed?: string;
    _null_emailToChange?: string;
    _not_null_emailToChange?: string;
    _from_id?: number;
    _to_id?: number;
    _from_login?: string;
    _to_login?: string;
    _from_firstName?: string;
    _to_firstName?: string;
    _from_secondName?: string;
    _to_secondName?: string;
    _from_options?: object;
    _to_options?: object;
    _from_externalProfiles?: object;
    _to_externalProfiles?: object;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_timeUpdated?: string;
    _to_timeUpdated?: string;
    _from_statuses?: (string | number)[];
    _to_statuses?: (string | number)[];
    _from_emailToChange?: string;
    _to_emailToChange?: string;
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type UsersResponseType = {
    login?: string;
    firstName?: string;
    secondName?: string;
    options?: object;
    externalProfiles?: object;
    timeCreated?: string;
    timeUpdated?: string;
    isUnsubscribed?: boolean;
    emailToChange?: string;
};

export type UsersBodyType = {
    login?: string;
    firstName?: string;
    secondName?: string;
    options?: object;
    externalProfiles?: object;
    timeCreated?: string;
    timeUpdated?: string;
    isUnsubscribed?: boolean;
    emailToChange?: string;
};

export type GoogleQueryType = any;

export type GoogleResponseType = any;

export type GoogleBodyType = any;

export type MicrosoftQueryType = any;

export type MicrosoftResponseType = any;

export type MicrosoftBodyType = any;

export type LinkedinQueryType = any;

export type LinkedinResponseType = any;

export type LinkedinBodyType = any;

export type FacebookQueryType = any;

export type FacebookResponseType = any;

export type FacebookBodyType = any;

export type StatusesBodyType = any;

export type StatusesResponseType = any;

export type Tree2ResponseType = any;
