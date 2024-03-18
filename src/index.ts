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
                result = await fetch(`${this.url}/${endpoint.replace(/\/+/, '')}`, {
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

        if (!noToken && response?.status === 401) {
            const a = await this.handle401();
            if (a) response = await this.request(endpoint, options, noToken);
        }

        return response;
    }

    async get<T>(endpoint: string, noToken?: boolean): Promise<T> {
        const response = await this.fetchWithToken(endpoint, undefined, noToken);
        return response?.json();
    }

    async post<T>(endpoint: string, data?: any, noToken?: boolean): Promise<T> {
        const response = await this.fetchWithToken(
            endpoint,
            {
                method: 'POST',
                body: JSON.stringify(data || {}),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            noToken
        );
        return response?.json();
    }

    async put<T>(endpoint: string, data?: any): Promise<T> {
        const response = await this.fetchWithToken(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data || {}),
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response?.json();
    }

    async patch<T>(endpoint: string, data?: any): Promise<T> {
        const response = await this.fetchWithToken(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data || {}),
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

    private async handle401(): Promise<boolean> {
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

        for (const key of Object.keys(query) as (keyof UserType)[]) {
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

    async getCheck(query: CheckQueryType): Promise<ResultType<CheckResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<CheckResponseType>>(
            queryString ? `/check?${queryString}` : '/check'
        );
    }

    async getDrawio(query: DrawioQueryType): Promise<ResultType<DrawioResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<DrawioResponseType>>(
            queryString ? `/drawio?${queryString}` : '/drawio'
        );
    }

    /***
     * Register new user
     */
    async registerNewUser(body: RegisterPostBodyType): Promise<RegisterResponseType> {
        return this.post<RegisterResponseType>('/register', body);
    }

    /***
     * Get jwt token
     */
    async getAccessToken(body: LoginPostBodyType): Promise<LoginResponseType> {
        return this.post<LoginResponseType>('/login', body);
    }

    async loginByService(
        params: LoginParamsType,
        body: LoginPostBodyType
    ): Promise<LoginResponseType> {
        return this.post<LoginResponseType>(`/login/${params.service}`, body);
    }

    /***
     * Check
     */
    async checkRegisteredEmail(body: CheckPostBodyType): Promise<CheckResponseType> {
        return this.post<CheckResponseType>('/register/check', body);
    }

    /***
     * Refresh jwt token
     */
    async refreshAccessToken(body: RefreshPostBodyType): Promise<RefreshResponseType> {
        return this.post<RefreshResponseType>('/login/refresh', body);
    }

    async logout(body: LogoutPostBodyType): Promise<LogoutResponseType> {
        return this.post<LogoutResponseType>('/logout', body);
    }

    /***
     * Re-send e-mail with confirmation code
     */
    async addResendInRegister(body: ResendPostBodyType): Promise<ResendResponseType> {
        return this.post<ResendResponseType>('/register/resend', body);
    }

    /***
     * Update user
     */
    async changePassword(body: LoginBodyType): Promise<LoginResponseType> {
        return this.patch<LoginResponseType>('/login', body);
    }

    /***
     * Refresh jwt token
     */
    async getRefreshInLogin(query: RefreshQueryType): Promise<ResultType<RefreshResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<RefreshResponseType>>(
            queryString ? `/login/refresh?${queryString}` : '/login/refresh'
        );
    }

    /***
     * Get token to restore password
     */
    async forgotPasssword(body: ForgotPostBodyType): Promise<ForgotResponseType> {
        return this.post<ForgotResponseType>('/login/forgot', body);
    }

    /***
     * Set new password by restore code
     */
    async setForgotPasssword(body: RestorePostBodyType): Promise<RestoreResponseType> {
        return this.post<RestoreResponseType>('/login/restore', body);
    }

    /***
     * Set new email by restore code
     */
    async changeEmail(body: EmailPostBodyType): Promise<EmailResponseType> {
        return this.post<EmailResponseType>('/login/email', body);
    }

    /***
     * Get list of user's external services
     */
    async getExternalsLogin(query: ExternalsQueryType): Promise<ResultType<ExternalsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<ExternalsResponseType>>(
            queryString ? `/login/externals?${queryString}` : '/login/externals'
        );
    }

    /***
     * Remove external service from user's profile
     */
    async deleteExternalsByExternalName(params: LoginParamsType): Promise<ExternalsResponseType> {
        return this.delete<ExternalsResponseType>(`/login/externals/${params.externalName}`);
    }

    /***
     * Create status
     */
    async updateUserStatusByUserId(
        params: UsersParamsType,
        body: StatusesPostBodyType
    ): Promise<StatusesResponseType> {
        return this.post<StatusesResponseType>(
            `/users/${params.userId}/statuses/${params.statusName}`,
            body
        );
    }

    /***
     * Delete status
     */
    async deleteUserStatusByUserId(params: UsersParamsType): Promise<StatusesResponseType> {
        return this.delete<StatusesResponseType>(
            `/users/${params.userId}/statuses/${params.statusName}`
        );
    }

    /***
     * Get user token by superadmin
     */
    async loginAsUserByAdmin(
        params: SuperadminParamsType
    ): Promise<ResultType<TokensResponseType>> {
        return this.get<ResultType<TokensResponseType>>(`/superadmin/tokens/${params.userId}`);
    }

    /***
     * Get back superadmin token
     */
    async logoutAsUserByAdmin(): Promise<TokensResponseType> {
        return this.delete<TokensResponseType>('/superadmin/tokens');
    }

    /***
     * Allow the user to receive all emails
     */
    async addSubscribeInEmails(body: SubscribePostBodyType): Promise<SubscribeResponseType> {
        return this.post<SubscribeResponseType>('/emails/subscribe', body);
    }

    /***
     * Unsubscribe the user from receiving incoming emails, except for the restore password email
     */
    async deleteSubscribeInEmails(): Promise<SubscribeResponseType> {
        return this.delete<SubscribeResponseType>('/emails/subscribe');
    }

    async getImages(query: ImagesQueryType): Promise<ResultType<ImagesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<ImagesResponseType>>(
            queryString ? `/images?${queryString}` : '/images'
        );
    }

    async addImage(body: ImagesPostBodyType): Promise<ImagesResponseType> {
        return this.post<ImagesResponseType>('/images', body);
    }

    async getImagesById(params: ImagesParamsType): Promise<ResultType<ImagesResponseType>> {
        return this.get<ResultType<ImagesResponseType>>(`/images/${params.id}`);
    }

    async deleteImageById(params: ImagesParamsType): Promise<ImagesResponseType> {
        return this.delete<ImagesResponseType>(`/images/${params.id}`);
    }

    async deleteImagesByIdInNewsByNewsId(params: NewsParamsType): Promise<ImagesResponseType> {
        return this.delete<ImagesResponseType>(`/news/${params.newsId}/images/${params.id}`);
    }

    async addImagesByIdInNewsByNewsId(
        params: NewsParamsType,
        body: ImagesPostBodyType
    ): Promise<ImagesResponseType> {
        return this.post<ImagesResponseType>(`/news/${params.newsId}/images/${params.id}`, body);
    }

    async getNews(query: NewsQueryType): Promise<ResultType<NewsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<NewsResponseType>>(
            queryString ? `/news?${queryString}` : '/news'
        );
    }

    async addNew(body: NewsPostBodyType): Promise<NewsResponseType> {
        return this.post<NewsResponseType>('/news', body);
    }

    async getNewsById(params: NewsParamsType): Promise<ResultType<NewsResponseType>> {
        return this.get<ResultType<NewsResponseType>>(`/news/${params.id}`);
    }

    async updateNewById(params: NewsParamsType, body: NewsBodyType): Promise<NewsResponseType> {
        return this.put<NewsResponseType>(`/news/${params.id}`, body);
    }

    async deleteNewById(params: NewsParamsType): Promise<NewsResponseType> {
        return this.delete<NewsResponseType>(`/news/${params.id}`);
    }

    async addKeyPointsInTopics(body: KeyPointsPostBodyType): Promise<KeyPointsResponseType> {
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
        return this.get<ResultType<KeyPointsResponseType>>(`/topics/keyPoints/${params.id}`);
    }

    async updateKeyPointsByIdInTopics(
        params: TopicsParamsType,
        body: KeyPointsBodyType
    ): Promise<KeyPointsResponseType> {
        return this.put<KeyPointsResponseType>(`/topics/keyPoints/${params.id}`, body);
    }

    async deleteKeyPointsByIdInTopics(params: TopicsParamsType): Promise<KeyPointsResponseType> {
        return this.delete<KeyPointsResponseType>(`/topics/keyPoints/${params.id}`);
    }

    async addUserStatusesInTopics(
        body: UserStatusesPostBodyType
    ): Promise<UserStatusesResponseType> {
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
        return this.get<ResultType<UserStatusesResponseType>>(`/topics/userStatuses/${params.id}`);
    }

    async updateUserStatusesByIdInTopics(
        params: TopicsParamsType,
        body: UserStatusesBodyType
    ): Promise<UserStatusesResponseType> {
        return this.put<UserStatusesResponseType>(`/topics/userStatuses/${params.id}`, body);
    }

    async deleteUserStatusesByIdInTopics(
        params: TopicsParamsType
    ): Promise<UserStatusesResponseType> {
        return this.delete<UserStatusesResponseType>(`/topics/userStatuses/${params.id}`);
    }

    async addTopic(body: TopicsPostBodyType): Promise<TopicsResponseType> {
        return this.post<TopicsResponseType>('/topics', body);
    }

    async updateTopicById(
        params: TopicsParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/topics/${params.id}`, body);
    }

    async getTopics(query: TopicsQueryType): Promise<ResultType<TopicsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TopicsResponseType>>(
            queryString ? `/topics?${queryString}` : '/topics'
        );
    }

    async getTopicsById(params: TopicsParamsType): Promise<ResultType<TopicsResponseType>> {
        return this.get<ResultType<TopicsResponseType>>(`/topics/${params.id}`);
    }

    async deleteTopicById(params: TopicsParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/topics/${params.id}`);
    }

    async addTeachersInCourses(body: TeachersPostBodyType): Promise<TeachersResponseType> {
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
        return this.get<ResultType<TeachersResponseType>>(`/courses/teachers/${params.id}`);
    }

    async updateTeachersByIdInCourses(
        params: CoursesParamsType,
        body: TeachersBodyType
    ): Promise<TeachersResponseType> {
        return this.put<TeachersResponseType>(`/courses/teachers/${params.id}`, body);
    }

    async deleteTeachersByIdInCourses(params: CoursesParamsType): Promise<TeachersResponseType> {
        return this.delete<TeachersResponseType>(`/courses/teachers/${params.id}`);
    }

    async addTopicsInCourses(body: TopicsPostBodyType): Promise<TopicsResponseType> {
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
        return this.get<ResultType<TopicsResponseType>>(`/courses/topics/${params.id}`);
    }

    async updateTopicsByIdInCourses(
        params: CoursesParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/courses/topics/${params.id}`, body);
    }

    async deleteTopicsByIdInCourses(params: CoursesParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/courses/topics/${params.id}`);
    }

    async addCourse(body: CoursesPostBodyType): Promise<CoursesResponseType> {
        return this.post<CoursesResponseType>('/courses', body);
    }

    async getCourses(query: CoursesQueryType): Promise<ResultType<CoursesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<CoursesResponseType>>(
            queryString ? `/courses?${queryString}` : '/courses'
        );
    }

    async getCoursesById(params: CoursesParamsType): Promise<ResultType<CoursesResponseType>> {
        return this.get<ResultType<CoursesResponseType>>(`/courses/${params.id}`);
    }

    async updateCourseById(
        params: CoursesParamsType,
        body: CoursesBodyType
    ): Promise<CoursesResponseType> {
        return this.put<CoursesResponseType>(`/courses/${params.id}`, body);
    }

    async deleteCourseById(params: CoursesParamsType): Promise<CoursesResponseType> {
        return this.delete<CoursesResponseType>(`/courses/${params.id}`);
    }

    async addSchedulesForCourseByCourseId(
        params: CoursesParamsType,
        body: SchedulesPostBodyType
    ): Promise<SchedulesResponseType> {
        return this.post<SchedulesResponseType>(`/courses/${params.courseId}/schedules`, body);
    }

    async getSchedulesForCoursesByCourseId(
        params: CoursesParamsType,
        query: SchedulesQueryType
    ): Promise<ResultType<SchedulesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<SchedulesResponseType>>(
            queryString
                ? `/courses/${params.courseId}/schedules?${queryString}`
                : `/courses/${params.courseId}/schedules`
        );
    }

    async getSchedulesByIdInCoursesByCourseId(
        params: CoursesParamsType
    ): Promise<ResultType<SchedulesResponseType>> {
        return this.get<ResultType<SchedulesResponseType>>(
            `/courses/${params.courseId}/schedules/${params.id}`
        );
    }

    async updateSchedulesByIdInCoursesByCourseId(
        params: CoursesParamsType,
        body: SchedulesBodyType
    ): Promise<SchedulesResponseType> {
        return this.put<SchedulesResponseType>(
            `/courses/${params.courseId}/schedules/${params.id}`,
            body
        );
    }

    async deleteSchedulesByIdInCoursesByCourseId(
        params: CoursesParamsType
    ): Promise<SchedulesResponseType> {
        return this.delete<SchedulesResponseType>(
            `/courses/${params.courseId}/schedules/${params.id}`
        );
    }

    async addTeachersInSchedules(body: TeachersPostBodyType): Promise<TeachersResponseType> {
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
        return this.get<ResultType<TeachersResponseType>>(`/schedules/teachers/${params.id}`);
    }

    async updateTeachersByIdInSchedules(
        params: SchedulesParamsType,
        body: TeachersBodyType
    ): Promise<TeachersResponseType> {
        return this.put<TeachersResponseType>(`/schedules/teachers/${params.id}`, body);
    }

    async deleteTeachersByIdInSchedules(
        params: SchedulesParamsType
    ): Promise<TeachersResponseType> {
        return this.delete<TeachersResponseType>(`/schedules/teachers/${params.id}`);
    }

    async addStudentsForScheduleByScheduleId(
        params: SchedulesParamsType,
        body: StudentsPostBodyType
    ): Promise<StudentsResponseType> {
        return this.post<StudentsResponseType>(`/schedules/${params.scheduleId}/students`, body);
    }

    async getStudentsForSchedulesByScheduleId(
        params: SchedulesParamsType,
        query: StudentsQueryType
    ): Promise<ResultType<StudentsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<StudentsResponseType>>(
            queryString
                ? `/schedules/${params.scheduleId}/students?${queryString}`
                : `/schedules/${params.scheduleId}/students`
        );
    }

    async getStudentsByIdInSchedulesByScheduleId(
        params: SchedulesParamsType
    ): Promise<ResultType<StudentsResponseType>> {
        return this.get<ResultType<StudentsResponseType>>(
            `/schedules/${params.scheduleId}/students/${params.id}`
        );
    }

    async updateStudentsByIdInSchedulesByScheduleId(
        params: SchedulesParamsType,
        body: StudentsBodyType
    ): Promise<StudentsResponseType> {
        return this.put<StudentsResponseType>(
            `/schedules/${params.scheduleId}/students/${params.id}`,
            body
        );
    }

    async deleteStudentsByIdInSchedulesByScheduleId(
        params: SchedulesParamsType
    ): Promise<StudentsResponseType> {
        return this.delete<StudentsResponseType>(
            `/schedules/${params.scheduleId}/students/${params.id}`
        );
    }

    async addSchedule(body: SchedulesPostBodyType): Promise<SchedulesResponseType> {
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
        return this.get<ResultType<SchedulesResponseType>>(`/schedules/${params.id}`);
    }

    async updateScheduleById(
        params: SchedulesParamsType,
        body: SchedulesBodyType
    ): Promise<SchedulesResponseType> {
        return this.put<SchedulesResponseType>(`/schedules/${params.id}`, body);
    }

    async deleteScheduleById(params: SchedulesParamsType): Promise<SchedulesResponseType> {
        return this.delete<SchedulesResponseType>(`/schedules/${params.id}`);
    }

    async addSharesInGoals(body: SharesPostBodyType): Promise<SharesResponseType> {
        return this.post<SharesResponseType>('/goals/shares', body);
    }

    async getSharesInGoals(query: SharesQueryType): Promise<ResultType<SharesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<SharesResponseType>>(
            queryString ? `/goals/shares?${queryString}` : '/goals/shares'
        );
    }

    async getSharesByIdInGoals(params: GoalsParamsType): Promise<ResultType<SharesResponseType>> {
        return this.get<ResultType<SharesResponseType>>(`/goals/shares/${params.id}`);
    }

    async updateSharesByIdInGoals(
        params: GoalsParamsType,
        body: SharesBodyType
    ): Promise<SharesResponseType> {
        return this.put<SharesResponseType>(`/goals/shares/${params.id}`, body);
    }

    async deleteSharesByIdInGoals(params: GoalsParamsType): Promise<SharesResponseType> {
        return this.delete<SharesResponseType>(`/goals/shares/${params.id}`);
    }

    async addTopicsInGoals(body: TopicsPostBodyType): Promise<TopicsResponseType> {
        return this.post<TopicsResponseType>('/goals/topics', body);
    }

    async getTopicsInGoals(query: TopicsQueryType): Promise<ResultType<TopicsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TopicsResponseType>>(
            queryString ? `/goals/topics?${queryString}` : '/goals/topics'
        );
    }

    async getTopicsByIdInGoals(params: GoalsParamsType): Promise<ResultType<TopicsResponseType>> {
        return this.get<ResultType<TopicsResponseType>>(`/goals/topics/${params.id}`);
    }

    async updateTopicsByIdInGoals(
        params: GoalsParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/goals/topics/${params.id}`, body);
    }

    async deleteTopicsByIdInGoals(params: GoalsParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/goals/topics/${params.id}`);
    }

    async addGoal(body: GoalsPostBodyType): Promise<GoalsResponseType> {
        return this.post<GoalsResponseType>('/goals', body);
    }

    async getGoals(query: GoalsQueryType): Promise<ResultType<GoalsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<GoalsResponseType>>(
            queryString ? `/goals?${queryString}` : '/goals'
        );
    }

    async getGoalsById(params: GoalsParamsType): Promise<ResultType<GoalsResponseType>> {
        return this.get<ResultType<GoalsResponseType>>(`/goals/${params.id}`);
    }

    async updateGoalById(params: GoalsParamsType, body: GoalsBodyType): Promise<GoalsResponseType> {
        return this.put<GoalsResponseType>(`/goals/${params.id}`, body);
    }

    async deleteGoalById(params: GoalsParamsType): Promise<GoalsResponseType> {
        return this.delete<GoalsResponseType>(`/goals/${params.id}`);
    }

    async addTopicsInCategories(body: TopicsPostBodyType): Promise<TopicsResponseType> {
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
        return this.get<ResultType<TopicsResponseType>>(`/categories/topics/${params.id}`);
    }

    async updateTopicsByIdInCategories(
        params: CategoriesParamsType,
        body: TopicsBodyType
    ): Promise<TopicsResponseType> {
        return this.put<TopicsResponseType>(`/categories/topics/${params.id}`, body);
    }

    async deleteTopicsByIdInCategories(params: CategoriesParamsType): Promise<TopicsResponseType> {
        return this.delete<TopicsResponseType>(`/categories/topics/${params.id}`);
    }

    async addCategorie(body: CategoriesPostBodyType): Promise<CategoriesResponseType> {
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
        return this.get<ResultType<CategoriesResponseType>>(`/categories/${params.id}`);
    }

    async updateCategorieById(
        params: CategoriesParamsType,
        body: CategoriesBodyType
    ): Promise<CategoriesResponseType> {
        return this.put<CategoriesResponseType>(`/categories/${params.id}`, body);
    }

    async deleteCategorieById(params: CategoriesParamsType): Promise<CategoriesResponseType> {
        return this.delete<CategoriesResponseType>(`/categories/${params.id}`);
    }

    async getTree(query: TreeQueryType): Promise<ResultType<TreeResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TreeResponseType>>(
            queryString ? `/tree?${queryString}` : '/tree'
        );
    }

    async getTreeByAssetId(params: TreeParamsType): Promise<ResultType<TreeResponseType>> {
        return this.get<ResultType<TreeResponseType>>(`/tree/${params.assetId}`);
    }

    async getTree2ByAssetId(params: Tree2ParamsType): Promise<ResultType<Tree2ResponseType>> {
        return this.get<ResultType<Tree2ResponseType>>(`/tree2/${params.assetId}`);
    }

    async addLanguageCode(body: LanguageCodesPostBodyType): Promise<LanguageCodesResponseType> {
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
        return this.get<ResultType<LanguageCodesResponseType>>(`/languageCodes/${params.id}`);
    }

    async updateLanguageCodeById(
        params: LanguageCodesParamsType,
        body: LanguageCodesBodyType
    ): Promise<LanguageCodesResponseType> {
        return this.put<LanguageCodesResponseType>(`/languageCodes/${params.id}`, body);
    }

    async deleteLanguageCodeById(
        params: LanguageCodesParamsType
    ): Promise<LanguageCodesResponseType> {
        return this.delete<LanguageCodesResponseType>(`/languageCodes/${params.id}`);
    }

    async addLearnStatuse(body: LearnStatusesPostBodyType): Promise<LearnStatusesResponseType> {
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
        return this.get<ResultType<LearnStatusesResponseType>>(`/learnStatuses/${params.id}`);
    }

    async updateLearnStatuseById(
        params: LearnStatusesParamsType,
        body: LearnStatusesBodyType
    ): Promise<LearnStatusesResponseType> {
        return this.put<LearnStatusesResponseType>(`/learnStatuses/${params.id}`, body);
    }

    async deleteLearnStatuseById(
        params: LearnStatusesParamsType
    ): Promise<LearnStatusesResponseType> {
        return this.delete<LearnStatusesResponseType>(`/learnStatuses/${params.id}`);
    }

    async addRegion(body: RegionsPostBodyType): Promise<RegionsResponseType> {
        return this.post<RegionsResponseType>('/regions', body);
    }

    async getRegions(query: RegionsQueryType): Promise<ResultType<RegionsResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<RegionsResponseType>>(
            queryString ? `/regions?${queryString}` : '/regions'
        );
    }

    async getRegionsById(params: RegionsParamsType): Promise<ResultType<RegionsResponseType>> {
        return this.get<ResultType<RegionsResponseType>>(`/regions/${params.id}`);
    }

    async updateRegionById(
        params: RegionsParamsType,
        body: RegionsBodyType
    ): Promise<RegionsResponseType> {
        return this.put<RegionsResponseType>(`/regions/${params.id}`, body);
    }

    async deleteRegionById(params: RegionsParamsType): Promise<RegionsResponseType> {
        return this.delete<RegionsResponseType>(`/regions/${params.id}`);
    }

    async getMeInUsers(query: MeQueryType): Promise<ResultType<MeResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<MeResponseType>>(
            queryString ? `/users/me?${queryString}` : '/users/me'
        );
    }

    async addUserById(
        params: UsersParamsType,
        body: UsersPostBodyType
    ): Promise<UsersResponseType> {
        return this.post<UsersResponseType>(`/users/${params.id}`, body);
    }

    async updateUserById(params: UsersParamsType, body: UsersBodyType): Promise<UsersResponseType> {
        return this.put<UsersResponseType>(`/users/${params.id}`, body);
    }

    async deleteUserById(params: UsersParamsType): Promise<UsersResponseType> {
        return this.delete<UsersResponseType>(`/users/${params.id}`);
    }

    /***
     * Set new password
     */
    async patchPasswordForUserById(
        params: UsersParamsType,
        body: PasswordBodyType
    ): Promise<PasswordResponseType> {
        return this.patch<PasswordResponseType>(`/users/${params.id}/password`, body);
    }

    async addUser(body: UsersPostBodyType): Promise<UsersResponseType> {
        return this.post<UsersResponseType>('/users', body);
    }

    async getUsers(query: UsersQueryType): Promise<ResultType<UsersResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<UsersResponseType>>(
            queryString ? `/users?${queryString}` : '/users'
        );
    }

    async getUsersById(params: UsersParamsType): Promise<ResultType<UsersResponseType>> {
        return this.get<ResultType<UsersResponseType>>(`/users/${params.id}`);
    }

    async getGoogleUrl(query: GoogleQueryType): Promise<ResultType<GoogleResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<GoogleResponseType>>(
            queryString ? `/login/google?${queryString}` : '/login/google'
        );
    }

    async postGoogleData(body: GooglePostBodyType): Promise<GoogleResponseType> {
        return this.post<GoogleResponseType>('/login/google', body);
    }

    async getMicrosoftUrl(query: MicrosoftQueryType): Promise<ResultType<MicrosoftResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<MicrosoftResponseType>>(
            queryString ? `/login/microsoft?${queryString}` : '/login/microsoft'
        );
    }

    async postMicrosoftData(body: MicrosoftPostBodyType): Promise<MicrosoftResponseType> {
        return this.post<MicrosoftResponseType>('/login/microsoft', body);
    }

    async getLinkedinUrl(query: LinkedinQueryType): Promise<ResultType<LinkedinResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<LinkedinResponseType>>(
            queryString ? `/login/linkedin?${queryString}` : '/login/linkedin'
        );
    }

    async postLinkedinData(body: LinkedinPostBodyType): Promise<LinkedinResponseType> {
        return this.post<LinkedinResponseType>('/login/linkedin', body);
    }

    async getFacebookUrl(query: FacebookQueryType): Promise<ResultType<FacebookResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<FacebookResponseType>>(
            queryString ? `/login/facebook?${queryString}` : '/login/facebook'
        );
    }

    async postFacebookData(body: FacebookPostBodyType): Promise<FacebookResponseType> {
        return this.post<FacebookResponseType>('/login/facebook', body);
    }

    async getTimezones(query: TimezonesQueryType): Promise<ResultType<TimezonesResponseType>> {
        const queryString = this.handleQueryString(query);
        return this.get<ResultType<TimezonesResponseType>>(
            queryString ? `/timezones?${queryString}` : '/timezones'
        );
    }

    async getTimezonesById(
        params: TimezonesParamsType
    ): Promise<ResultType<TimezonesResponseType>> {
        return this.get<ResultType<TimezonesResponseType>>(`/timezones/${params.id}`);
    }
}

export type ConstructorType = {
    url: string;
    token?: string;
    refreshToken?: string;
    onTokenUpdate?: any;
    onTokenError?: any;
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
    email?: string;
    password: string;
    isInit?: string;
};

export type UserLoginResultType = {
    id: number;
    login: string;
    statuses: string[];
    token: string;
    fullName?: string;
    email: string;
    refresh: string;
};

export type ImagePostType = string | File;

export type ImageGetType = {
    id: string;
    timeCreated: string;
    timeUpdated: string;
    name: string;
    path: string;
    type?: string;
    group: string;
    sizeName?: string;
    userId?: number;
};

export type CheckQueryType = any;

export type CheckResponseType = {
    email?: string;
    login?: string;
    code?: string;
};

export type DrawioQueryType = any;

export type DrawioResponseType = any;

export type RegisterQueryType = any;

export type RegisterResponseType = {
    login?: string;
    password?: string;
    fullName?: string;
    email?: string;
};

export type RegisterBodyType = {
    login?: string;
    password?: string;
    fullName?: string;
    email?: string;
};

export type RegisterPostBodyType = {
    login?: string;
    password: string;
    fullName?: string;
    email: string;
};

export type LoginQueryType = any;

export type LoginResponseType = {
    login?: string;
    password?: string;
    email?: string;
    fullName?: string;
    newPassword?: string;
};

export type LoginBodyType = {
    login?: string;
    password?: string;
    email?: string;
    fullName?: string;
    newPassword?: string;
};

export type LoginPostBodyType = {
    login?: string;
    password: string;
};

export type LoginParamsType = {
    service?: string | number | boolean;
    externalName?: string | number | boolean;
};

export type CheckBodyType = {
    email?: string;
    login?: string;
    code?: string;
};

export type CheckPostBodyType = {
    email?: string;
    login?: string;
    code: string;
};

export type RefreshQueryType = any;

export type RefreshResponseType = {
    refresh?: string;
};

export type RefreshBodyType = {
    refresh?: string;
};

export type RefreshPostBodyType = {
    refresh: string;
};

export type LogoutQueryType = any;

export type LogoutResponseType = any;

export type LogoutBodyType = any;

export type LogoutPostBodyType = any;

export type ResendQueryType = any;

export type ResendResponseType = {
    email?: string;
};

export type ResendBodyType = {
    email?: string;
};

export type ResendPostBodyType = {
    email: string;
};

export type ForgotQueryType = any;

export type ForgotResponseType = {
    login?: string;
};

export type ForgotBodyType = {
    login?: string;
};

export type ForgotPostBodyType = {
    login: string;
};

export type RestoreQueryType = any;

export type RestoreResponseType = {
    code?: string;
    password?: string;
};

export type RestoreBodyType = {
    code?: string;
    password?: string;
};

export type RestorePostBodyType = {
    code: string;
    password: string;
};

export type EmailQueryType = any;

export type EmailResponseType = {
    code?: string;
};

export type EmailBodyType = {
    code?: string;
};

export type EmailPostBodyType = {
    code: string;
};

export type ExternalsQueryType = any;

export type ExternalsResponseType = any;

export type StatusesPostBodyType = any;

export type UsersParamsType = {
    userId?: string | number | boolean;
    statusName?: string | number | boolean;
    id?: string | number | boolean;
};

export type SuperadminParamsType = {
    userId?: string | number | boolean;
};

export type TokensQueryType = any;

export type TokensResponseType = any;

export type SubscribeQueryType = any;

export type SubscribeResponseType = any;

export type SubscribeBodyType = any;

export type SubscribePostBodyType = any;

export type ImagesQueryType = any;

export type ImagesResponseType = any;

export type ImagesBodyType = any;

export type ImagesPostBodyType = any;

export type ImagesParamsType = {
    id?: string | number | boolean;
};

export type NewsParamsType = {
    newsId?: string | number | boolean;
    id?: string | number | boolean;
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

export type NewsPostBodyType = {
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

export type KeyPointsPostBodyType = {
    userId?: number;
    topicId?: number;
    question?: string;
};

export type TopicsParamsType = {
    id?: string | number | boolean;
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

export type UserStatusesPostBodyType = {
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

export type TopicsPostBodyType = {
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

export type TeachersPostBodyType = {
    userId?: number;
    sceduleId?: number;
    teacherId?: number;
    courseName?: string;
    teacherName?: string;
};

export type CoursesParamsType = {
    id?: string | number | boolean;
    courseId?: string | number | boolean;
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

export type CoursesPostBodyType = {
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

export type SchedulesPostBodyType = {
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
    id?: string | number | boolean;
    scheduleId?: string | number | boolean;
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

export type StudentsPostBodyType = {
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

export type SharesPostBodyType = {
    goalId?: number;
    userId?: number;
};

export type GoalsParamsType = {
    id?: string | number | boolean;
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

export type GoalsPostBodyType = {
    userId?: number;
    name?: string;
    description?: string;
    motivation?: string;
    deadline?: string;
    motto?: string;
};

export type CategoriesParamsType = {
    id?: string | number | boolean;
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

export type CategoriesPostBodyType = {
    userId?: number;
    name?: string;
    description?: string;
};

export type TreeQueryType = any;

export type TreeResponseType = any;

export type TreeParamsType = {
    assetId?: string | number | boolean;
};

export type Tree2ParamsType = {
    assetId?: string | number | boolean;
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

export type LanguageCodesPostBodyType = {
    name?: string;
};

export type LanguageCodesParamsType = {
    id?: string | number | boolean;
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

export type LearnStatusesPostBodyType = {
    name?: string;
    description?: string;
};

export type LearnStatusesParamsType = {
    id?: string | number | boolean;
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

export type RegionsPostBodyType = {
    name?: string;
};

export type RegionsParamsType = {
    id?: string | number | boolean;
};

export type MeQueryType = any;

export type MeResponseType = any;

export type UsersPostBodyType = {
    avatar?: string | number | boolean;
    login?: string;
    options?: object;
    timeCreated?: string;
    timeUpdated?: string;
    isUnsubscribed?: boolean;
    fullName?: string;
    biography?: string;
    timezone?: string;
};

export type UsersBodyType = {
    avatar?: ImagePostType;
    login?: string;
    options?: object;
    timeCreated?: string;
    timeUpdated?: string;
    isUnsubscribed?: boolean;
    fullName?: string;
    biography?: string;
    timezone?: string;
};

export type PasswordQueryType = any;

export type PasswordResponseType = {
    password?: string;
    newPassword?: string;
};

export type PasswordBodyType = {
    password?: string;
    newPassword?: string;
};

export type UsersQueryType = {
    id?: number;
    login?: string;
    options?: object;
    timeCreated?: string;
    timeUpdated?: string;
    statuses?: (string | number)[];
    isUnsubscribed?: boolean;
    fullName?: string;
    biography?: string;
    timezone?: string;
    _null_options?: string;
    _not_null_options?: string;
    _null_timeCreated?: string;
    _not_null_timeCreated?: string;
    _null_timeUpdated?: string;
    _not_null_timeUpdated?: string;
    _null_statuses?: string;
    _not_null_statuses?: string;
    _null_isUnsubscribed?: string;
    _not_null_isUnsubscribed?: string;
    _null_fullName?: string;
    _not_null_fullName?: string;
    _null_biography?: string;
    _not_null_biography?: string;
    _null_timezone?: string;
    _not_null_timezone?: string;
    _from_id?: number;
    _to_id?: number;
    _from_login?: string;
    _to_login?: string;
    _from_options?: object;
    _to_options?: object;
    _from_timeCreated?: string;
    _to_timeCreated?: string;
    _from_timeUpdated?: string;
    _to_timeUpdated?: string;
    _from_statuses?: (string | number)[];
    _to_statuses?: (string | number)[];
    _from_fullName?: string;
    _to_fullName?: string;
    _from_biography?: string;
    _to_biography?: string;
    _from_timezone?: string;
    _to_timezone?: string;
    avatar?: ImageGetType[];
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
    avatar?: ImageGetType[];
    login?: string;
    options?: object;
    timeCreated?: string;
    timeUpdated?: string;
    isUnsubscribed?: boolean;
    fullName?: string;
    biography?: string;
    timezone?: string;
};

export type GoogleQueryType = any;

export type GoogleResponseType = any;

export type GoogleBodyType = any;

export type GooglePostBodyType = any;

export type MicrosoftQueryType = any;

export type MicrosoftResponseType = any;

export type MicrosoftBodyType = any;

export type MicrosoftPostBodyType = any;

export type LinkedinQueryType = any;

export type LinkedinResponseType = any;

export type LinkedinBodyType = any;

export type LinkedinPostBodyType = any;

export type FacebookQueryType = any;

export type FacebookResponseType = any;

export type FacebookBodyType = any;

export type FacebookPostBodyType = any;

export type TimezonesQueryType = {
    _fields?: string;
    _sort?: string;
    _join?: string;
    _limit?: number;
    _page?: number;
    _skip?: number;
    _lang?: string;
    _search?: string;
};

export type TimezonesResponseType = any;

export type TimezonesParamsType = {
    id?: string | number | boolean;
};

export type StatusesBodyType = any;

export type StatusesResponseType = any;

export type Tree2ResponseType = any;
