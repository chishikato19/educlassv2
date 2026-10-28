const API_BASE = '/api';
export class TeacherApiClient {
    token = null;
    constructor() {
        if (typeof localStorage !== 'undefined') {
            this.token = localStorage.getItem('educlass_teacher_token');
        }
    }
    getToken() {
        return this.token;
    }
    setToken(token) {
        this.token = token;
        if (typeof localStorage !== 'undefined') {
            if (token) {
                localStorage.setItem('educlass_teacher_token', token);
            }
            else {
                localStorage.removeItem('educlass_teacher_token');
            }
        }
    }
    async login(username = 'admin', password = 'admin123') {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        this.setToken(res.token);
        return res;
    }
    async getTeachers() {
        const res = await this.request('/auth/teachers');
        return res.teachers;
    }
    async registerTeacher(data) {
        const res = await this.request('/auth/register-teacher', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.user;
    }
    async resetPin(userId) {
        await this.request('/auth/reset-pin', {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    }
    async changePassword(oldPassword, newPassword) {
        await this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ oldPassword, newPassword }),
        });
    }
    async logout() {
        try {
            if (this.token) {
                await this.request('/auth/logout', { method: 'POST' });
            }
        }
        finally {
            this.setToken(null);
        }
    }
    async getMe() {
        if (!this.token)
            return null;
        try {
            const res = await this.request('/auth/me');
            return res.user;
        }
        catch {
            this.setToken(null);
            return null;
        }
    }
    async ensureAuthenticated() {
        if (this.token) {
            try {
                await this.request('/auth/me');
            }
            catch {
                this.setToken(null);
            }
        }
    }
    async request(endpoint, options = {}, _isRetry = false) {
        if (!this.token && !endpoint.startsWith('/auth/')) {
            await this.ensureAuthenticated();
        }
        const headers = {
            ...(options.headers ?? {}),
        };
        if (options.body !== undefined && options.body !== null && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });
        if (!res.ok) {
            if (res.status === 401) {
                this.setToken(null);
            }
            let errMsg = `Lỗi yêu cầu máy chủ (${res.status})`;
            try {
                const errorJson = (await res.json());
                if (typeof errorJson.error === 'string') {
                    errMsg = errorJson.error;
                }
                else if (errorJson.error &&
                    typeof errorJson.error === 'object' &&
                    'message' in errorJson.error &&
                    typeof errorJson.error.message === 'string') {
                    errMsg = errorJson.error.message;
                }
                else if (typeof errorJson.message === 'string') {
                    errMsg = errorJson.message;
                }
            }
            catch {
                // bỏ qua nếu response không phải JSON
            }
            throw new Error(errMsg);
        }
        if (res.status === 204) {
            return undefined;
        }
        return (await res.json());
    }
    // Classes
    async getClasses() {
        try {
            const res = await this.request('/classes');
            if (Array.isArray(res))
                return res;
            if (res && Array.isArray(res.classes))
                return res.classes;
            return [];
        }
        catch {
            return [];
        }
    }
    async createClass(req) {
        return this.request('/classes', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async deleteClass(classId) {
        return this.request(`/classes/${classId}`, {
            method: 'DELETE',
        });
    }
    // Students
    async getStudents(classId) {
        try {
            const res = await this.request(`/classes/${classId}/students`);
            if (Array.isArray(res))
                return res;
            if (res && Array.isArray(res.students))
                return res.students;
            return [];
        }
        catch {
            return [];
        }
    }
    async createStudent(classId, req) {
        return this.request(`/classes/${classId}/students`, {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async updateStudent(classId, studentId, req) {
        const res = await this.request(`/classes/${classId}/students/${studentId}`, {
            method: 'PATCH',
            body: JSON.stringify(req),
        });
        return res.student;
    }
    async deleteStudent(studentId) {
        return this.request(`/students/${studentId}`, {
            method: 'DELETE',
        });
    }
    async setStudentPin(studentId, pin) {
        return this.request(`/students/${studentId}/pin`, {
            method: 'PUT',
            body: JSON.stringify({ pin }),
        });
    }
    async importStudents(classId, students, skipDuplicates) {
        return this.request(`/classes/${classId}/students/import`, {
            method: 'POST',
            body: JSON.stringify({ students, skipDuplicates }),
        });
    }
    // Question sets
    async getQuestionSets() {
        try {
            const res = await this.request('/question-sets');
            const raw = Array.isArray(res) ? res : (res?.questionSets ?? []);
            return raw.map(item => ({
                id: item.id,
                ownerId: item.ownerId,
                title: item.title,
                subject: item.subject,
                grade: item.grade,
                tags: item.tags ?? [],
                questionCount: item.questionCount ?? (item.questions?.length || 0),
                updatedAt: item.updatedAt || Date.now(),
            }));
        }
        catch {
            return [];
        }
    }
    async createQuestionSet(data) {
        const res = await this.request('/question-sets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return { id: res.questionSet?.id ?? res.id ?? '' };
    }
    async getQuestionSet(id) {
        const res = await this.request(`/question-sets/${id}`);
        const qList = res.questions ?? res.questionSet?.questions ?? [];
        return {
            questionSet: {
                ...res.questionSet,
                questions: qList,
            },
            questions: qList,
        };
    }
    async updateQuestionSet(id, data) {
        return this.request(`/question-sets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    async deleteQuestionSet(id) {
        return this.request(`/question-sets/${id}`, {
            method: 'DELETE',
        });
    }
    async cloneQuestionSet(id, newTitle) {
        return this.request(`/question-sets/${id}/clone`, {
            method: 'POST',
            body: JSON.stringify({ title: newTitle }),
        });
    }
    async exportQuestionSet(id) {
        return this.request(`/question-sets/${id}/export`);
    }
    async importQuestionSet(pkg) {
        return this.request('/question-sets/import', {
            method: 'POST',
            body: JSON.stringify(pkg),
        });
    }
    async importWord(base64) {
        return this.request('/question-sets/import-word', {
            method: 'POST',
            body: JSON.stringify({ base64 }),
        });
    }
    // Sessions
    async getActiveSession() {
        try {
            const res = await this.request('/sessions/active');
            if (!res)
                return null;
            // 1. Trường hợp chuẩn: { session: { id, joinCode, ... }, className, joinUrl, qrDataUrl }
            if ('session' in res &&
                res.session &&
                typeof res.session === 'object' &&
                'joinCode' in res.session) {
                return res;
            }
            // 2. Trường hợp lồng: { session: { session: ... } }
            if ('session' in res &&
                res.session &&
                typeof res.session === 'object' &&
                'session' in res.session) {
                return res.session;
            }
            // 3. Trường hợp server trả về SessionDto phẳng: { id, joinCode, status, ... }
            if ('joinCode' in res) {
                return {
                    session: res,
                    className: res.className ?? null,
                    joinUrl: res.joinUrl,
                    qrDataUrl: res.qrDataUrl,
                };
            }
            return res;
        }
        catch {
            return null;
        }
    }
    async createSession(req) {
        return this.request('/sessions', {
            method: 'POST',
            body: JSON.stringify(req),
        });
    }
    async closeSession(sessionId) {
        const res = await this.request(`/sessions/${sessionId}/close`, {
            method: 'POST',
            body: JSON.stringify({ reason: 'Giáo viên kết thúc tiết học' }),
        });
        if (res && typeof res === 'object' && 'report' in res && res.report) {
            return res.report;
        }
        return res;
    }
    async closeActiveSession() {
        try {
            return await this.request('/sessions/close-active', {
                method: 'POST',
                body: JSON.stringify({}),
            });
        }
        catch {
            return null;
        }
    }
    async getSessionReport(sessionId) {
        return this.request(`/sessions/${sessionId}/report`);
    }
    async getSessionReports() {
        try {
            const res = await this.request('/sessions/reports');
            return res.reports || [];
        }
        catch {
            return [];
        }
    }
    async getActiveQuizSummary(sessionId) {
        try {
            const res = await this.request(`/sessions/${sessionId}/quiz-summary`);
            return res.summary;
        }
        catch {
            return null;
        }
    }
    async getQuizRuns(sessionId) {
        try {
            const res = await this.request(`/sessions/${sessionId}/quiz-runs`);
            return res.runs || [];
        }
        catch {
            return [];
        }
    }
    async getParticipants(sessionId) {
        try {
            const res = await this.request(`/sessions/${sessionId}/participants`);
            if (Array.isArray(res))
                return res;
            if (res && Array.isArray(res.participants))
                return res.participants;
            return [];
        }
        catch {
            return [];
        }
    }
    async releaseParticipant(sessionId, participantId) {
        try {
            await this.request(`/sessions/${sessionId}/participants/${participantId}/release`, {
                method: 'POST',
            });
        }
        catch {
            await this.request(`/sessions/${sessionId}/release-participant`, {
                method: 'POST',
                body: JSON.stringify({ participantId }),
            });
        }
    }
    async grantReward(sessionId, participantId, exp, reason) {
        try {
            await this.request(`/sessions/${sessionId}/rewards/grant`, {
                method: 'POST',
                body: JSON.stringify({ participantId, exp, reason }),
            });
        }
        catch {
            await this.request(`/sessions/${sessionId}/rewards`, {
                method: 'POST',
                body: JSON.stringify({ participantId, exp, reason }),
            });
        }
    }
    // Activities
    async getActivities() {
        try {
            const res = await this.request('/activities');
            if (Array.isArray(res))
                return res;
            if (res && Array.isArray(res.activities))
                return res.activities;
        }
        catch {
            // Fallback
        }
        return [
            {
                id: 'quiz-live',
                name: 'Quiz Live (Kahoot / Quizizz)',
                version: 1,
                icon: '⚡',
                capabilities: ['chat-lock'],
                rewardTriggers: ['correct_answer', 'finish', 'top3', 'speed_streak'],
            },
            {
                id: 'quick-poll',
                name: 'Bình chọn nhanh (Poll)',
                version: 1,
                icon: '📊',
                capabilities: [],
                rewardTriggers: ['participation'],
            },
            {
                id: 'exam',
                name: 'Kỳ thi trắc nghiệm',
                version: 1,
                icon: '📝',
                capabilities: ['chat-lock'],
                rewardTriggers: ['finish', 'high_score'],
            },
            {
                id: 'assignment-hub',
                name: 'Thu - phát bài tập',
                version: 1,
                icon: '📁',
                capabilities: [],
                rewardTriggers: ['submit'],
            },
            {
                id: 'swiss-duel',
                name: 'Đấu Cờ Thụy Sỹ (Swiss Duel)',
                version: 1,
                icon: '⚔️',
                capabilities: ['chat-lock'],
                rewardTriggers: ['win', 'draw', 'finish'],
            },
            {
                id: 'pdf-presenter',
                name: 'Trình chiếu PDF & Slide',
                version: 1,
                icon: '📑',
                capabilities: [],
                rewardTriggers: [],
            },
            {
                id: 'object-camera',
                name: 'Camera vật thể (Soi bài)',
                version: 1,
                icon: '📷',
                capabilities: [],
                rewardTriggers: [],
            },
            {
                id: 'territory-war',
                name: 'Đại Chiến Lãnh Thổ (Chiếm đất)',
                version: 1,
                icon: '🚩',
                capabilities: ['chat-lock'],
                rewardTriggers: ['capture', 'win', 'sudden_death'],
            },
        ];
    }
    async getCurrentActivity(sessionId, options) {
        try {
            const q = new URLSearchParams();
            if (options?.activityId)
                q.set('activityId', options.activityId);
            if (options?.runId)
                q.set('runId', options.runId);
            const queryStr = q.toString() ? `?${q.toString()}` : '';
            return await this.request(`/sessions/${sessionId}/activities/current${queryStr}`);
        }
        catch {
            return { run: null, state: null };
        }
    }
    async getActiveActivities(sessionId) {
        try {
            const res = await this.request(`/sessions/${sessionId}/activities/active`);
            if (res && Array.isArray(res.activeRuns)) {
                return res.activeRuns.map(item => ({
                    runId: item.run.id,
                    activityId: item.run.activityId,
                    state: item.state,
                    config: item.run.config,
                }));
            }
            return [];
        }
        catch {
            return [];
        }
    }
    async startActivity(sessionId, activityId, config) {
        try {
            const res = await this.request(`/sessions/${sessionId}/activities/start`, {
                method: 'POST',
                body: JSON.stringify({ activityId, config }),
            });
            return {
                runId: res.run?.id ?? res.runId ?? '',
                activityId: res.run?.activityId ?? res.activityId ?? activityId,
                state: res.state,
            };
        }
        catch {
            return this.request('/activities/run', {
                method: 'POST',
                body: JSON.stringify({ sessionId, activityId, config }),
            });
        }
    }
    async sendTeacherIntent(arg1, arg2, arg3) {
        let sessionId = '';
        let runId = '';
        let intent = null;
        if (arg3 !== undefined) {
            sessionId = arg1;
            runId = arg2;
            intent = arg3;
        }
        else {
            runId = arg1;
            intent = arg2;
        }
        if (sessionId) {
            try {
                return await this.request(`/sessions/${sessionId}/activities/teacher-intent`, {
                    method: 'POST',
                    body: JSON.stringify({ runId, intent }),
                });
            }
            catch {
                // Fallback
            }
        }
        return this.request(`/activities/runs/${runId}/intent`, {
            method: 'POST',
            body: JSON.stringify({ sessionId, intent }),
        });
    }
    async endActivity(arg1, arg2) {
        let sessionId = '';
        let runId = '';
        if (arg2) {
            sessionId = arg1;
            runId = arg2;
        }
        else {
            runId = arg1;
        }
        if (sessionId) {
            try {
                return await this.request(`/sessions/${sessionId}/activities/end`, {
                    method: 'POST',
                    body: JSON.stringify({ runId }),
                });
            }
            catch {
                // Fallback
            }
        }
        return this.request(`/activities/runs/${runId}/end`, {
            method: 'POST',
            body: JSON.stringify({ sessionId }),
        });
    }
    // EXP / Reward Rules
    async getRewardRules() {
        try {
            const res = await this.request('/reward-rules');
            return {
                globalRules: Array.isArray(res?.globalRules) ? res.globalRules : [],
                teacherRules: Array.isArray(res?.teacherRules) ? res.teacherRules : [],
                effectiveRules: Array.isArray(res?.effectiveRules) ? res.effectiveRules : [],
                sessionCap: res?.sessionCap ?? null,
                activityCaps: res?.activityCaps ?? {},
            };
        }
        catch {
            return {
                globalRules: [],
                teacherRules: [],
                effectiveRules: [],
                sessionCap: null,
                activityCaps: {},
            };
        }
    }
    async saveRewardRules(rules) {
        return this.request('/reward-rules', {
            method: 'PUT',
            body: JSON.stringify({ rules }),
        });
    }
    async resetRewardRules() {
        return this.request('/reward-rules/mine', {
            method: 'DELETE',
        });
    }
    // Chat & Trợ giúp GV <-> HS
    async sendChatMessage(sessionId, payload) {
        const res = await this.request(`/sessions/${sessionId}/chat/messages`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res.message;
    }
    async getChatMessages(sessionId) {
        try {
            const res = await this.request(`/sessions/${sessionId}/chat/messages`);
            return Array.isArray(res?.messages) ? res.messages : [];
        }
        catch {
            return [];
        }
    }
    async getChatStatus(sessionId) {
        try {
            return await this.request(`/sessions/${sessionId}/chat/status`);
        }
        catch {
            return { chatLocked: false, activeHandRaises: [] };
        }
    }
    async toggleChatLock(sessionId, locked) {
        const res = await this.request(`/sessions/${sessionId}/chat/lock`, {
            method: 'PATCH',
            body: JSON.stringify({ locked }),
        });
        return res.chatLocked;
    }
    async resolveHandRaise(sessionId, participantId) {
        await this.request(`/sessions/${sessionId}/chat/hand-raise/resolve`, {
            method: 'POST',
            body: JSON.stringify({ participantId }),
        });
    }
    // --- KHO LƯU VIDEO HỌC LIỆU YOUTUBE ---
    async getVideos(params) {
        const q = new URLSearchParams();
        if (params?.category && params.category !== 'all') {
            q.set('category', params.category);
        }
        if (params?.search && params.search.trim()) {
            q.set('search', params.search.trim());
        }
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request(`/videos${qs}`);
        return res?.videos ?? [];
    }
    async getVideoCategories() {
        const res = await this.request('/videos/categories');
        return res?.categories ?? [];
    }
    async createVideo(data) {
        const res = await this.request('/videos', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.video;
    }
    async updateVideo(id, data) {
        const res = await this.request(`/videos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return res.video;
    }
    async deleteVideo(id) {
        const res = await this.request(`/videos/${id}`, {
            method: 'DELETE',
        });
        return !!res?.success;
    }
    // --- QUẢN LÝ KỲ THI THEO CA & BÁO CÁO KỲ THI LÂU DÀI ---
    async getExams(params) {
        const q = new URLSearchParams();
        if (params?.classId) {
            q.set('classId', params.classId);
        }
        if (params?.status && params.status !== 'all') {
            q.set('status', params.status);
        }
        if (params?.folder && params.folder !== 'all') {
            q.set('folder', params.folder);
        }
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request(`/exams${qs}`);
        return res?.exams ?? [];
    }
    async cloneExam(id, data) {
        return this.request(`/exams/${id}/clone`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async getExamDetail(id) {
        const res = await this.request(`/exams/${id}`);
        return res.exam;
    }
    async createExam(data) {
        const res = await this.request('/exams', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res.exam;
    }
    async updateExam(id, data) {
        const res = await this.request(`/exams/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return res.exam;
    }
    async deleteExam(id) {
        const res = await this.request(`/exams/${id}`, {
            method: 'DELETE',
        });
        return !!res?.ok;
    }
    async startExamBatch(id, data) {
        const res = await this.request(`/exams/${id}/start-batch`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res;
    }
    async pauseExamBatch(id, data) {
        const res = await this.request(`/exams/${id}/pause-batch`, {
            method: 'POST',
            body: JSON.stringify(data ?? {}),
        });
        return res;
    }
    async finishExam(id, data) {
        const res = await this.request(`/exams/${id}/finish`, {
            method: 'POST',
            body: JSON.stringify(data ?? { confirm: true }),
        });
        return res;
    }
    async getExamEligibility(id) {
        return this.request(`/exams/${id}/eligibility`);
    }
    async downloadExamExcel(id, title) {
        if (!this.token) {
            await this.ensureAuthenticated();
        }
        const tokenParam = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
        const res = await fetch(`${API_BASE}/exams/${id}/export-excel${tokenParam}`, {
            method: 'GET',
            headers: {
                ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message ||
                'Không thể tải file báo cáo Excel');
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (title || id).replace(/[/\\?%*:|"<>]/g, '_');
        a.download = `BangDiem_${safeTitle}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }
    async downloadSessionExcel(sessionId) {
        if (!this.token) {
            await this.ensureAuthenticated();
        }
        const tokenParam = this.token ? `?token=${encodeURIComponent(this.token)}` : '';
        const res = await fetch(`${API_BASE}/sessions/${sessionId}/export-excel${tokenParam}`, {
            method: 'GET',
            headers: {
                ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message ||
                'Không thể tải file Excel phiên học');
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BaoCao_PhienHoc_${sessionId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }
    // ================= NGÂN HÀNG CÂU HỎI & MA TRẬN ĐỀ THI =================
    /**
     * Lấy cây phân cấp Khối -> Môn -> Chương -> Bài kèm số lượng câu hỏi
     */
    async getBankTree(params) {
        const q = new URLSearchParams();
        if (params?.grade !== undefined)
            q.set('grade', String(params.grade));
        if (params?.subject)
            q.set('subject', params.subject);
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request(`/bank/tree${qs}`);
        return Array.isArray(res) ? res : [];
    }
    /**
     * Lọc và tìm kiếm danh sách câu hỏi trong ngân hàng
     */
    async getBankQuestions(params) {
        const q = new URLSearchParams();
        if (params?.grade !== undefined)
            q.set('grade', String(params.grade));
        if (params?.subject)
            q.set('subject', params.subject);
        if (params?.chapter)
            q.set('chapter', params.chapter);
        if (params?.lesson)
            q.set('lesson', params.lesson);
        if (params?.difficulty)
            q.set('difficulty', params.difficulty);
        if (params?.type)
            q.set('type', params.type);
        if (params?.search)
            q.set('search', params.search);
        if (params?.limit !== undefined)
            q.set('limit', String(params.limit));
        if (params?.offset !== undefined)
            q.set('offset', String(params.offset));
        const qs = q.toString() ? `?${q.toString()}` : '';
        const res = await this.request(`/bank/questions${qs}`);
        return Array.isArray(res) ? res : [];
    }
    /**
     * Lấy chi tiết một câu hỏi ngân hàng
     */
    async getBankQuestionDetail(id) {
        return this.request(`/bank/questions/${id}`);
    }
    /**
     * Tạo câu hỏi mới vào ngân hàng
     */
    async createBankQuestion(data) {
        return this.request('/bank/questions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Tạo hàng loạt câu hỏi vào ngân hàng (sau khi phân tích Word)
     */
    async createBatchBankQuestions(questions) {
        return this.request('/bank/questions/batch', {
            method: 'POST',
            body: JSON.stringify({ questions }),
        });
    }
    /**
     * Cập nhật câu hỏi ngân hàng
     */
    async updateBankQuestion(id, data) {
        return this.request(`/bank/questions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    /**
     * Xóa câu hỏi ngân hàng và dọn ảnh mồ côi
     */
    async deleteBankQuestion(id) {
        return this.request(`/bank/questions/${id}`, {
            method: 'DELETE',
        });
    }
    /**
     * Thống kê số lượng câu sẵn có cho cấu hình ma trận
     */
    async getMatrixStats(data) {
        return this.request('/bank/matrix-stats', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Sinh bộ đề ngẫu nhiên từ ma trận câu hỏi và lưu vào kho đề thi
     */
    async generateSetFromMatrix(data) {
        return this.request('/bank/generate-set', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Bốc ngẫu nhiên câu hỏi theo ma trận để xem trước và đổi câu tương đương (Task 4.2)
     */
    async previewSetFromMatrix(data) {
        return this.request('/bank/preview-set', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Lấy cấu trúc toàn bộ nhóm trong lớp kèm thành viên
     */
    async getClassGroups(classId) {
        return this.request(`/classes/${classId}/groups`);
    }
    /**
     * Tạo một nhóm học sinh mới trong lớp
     */
    async createClassGroup(classId, data) {
        return this.request(`/classes/${classId}/groups`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Cập nhật thông tin nhóm (tên, thứ tự)
     */
    async updateClassGroup(groupId, data) {
        return this.request(`/groups/${groupId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
    /**
     * Chia đều ngẫu nhiên học sinh vào N nhóm tùy chỉnh
     */
    async randomizeClassGroups(classId, data) {
        return this.request(`/classes/${classId}/groups/randomize`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    /**
     * Gán hoặc chuyển học sinh sang nhóm mới (hoặc null để bỏ nhóm)
     */
    async assignStudentGroup(studentId, groupId) {
        return this.request(`/students/${studentId}/group`, {
            method: 'PUT',
            body: JSON.stringify({ groupId }),
        });
    }
    /**
     * Chỉ định hoặc thay đổi nhóm trưởng cho nhóm
     */
    async assignGroupLeader(groupId, studentId) {
        return this.request(`/groups/${groupId}/leader`, {
            method: 'PUT',
            body: JSON.stringify({ studentId }),
        });
    }
    /**
     * Xóa một nhóm
     */
    async deleteClassGroup(groupId) {
        return this.request(`/groups/${groupId}`, {
            method: 'DELETE',
        });
    }
}
export const api = new TeacherApiClient();
//# sourceMappingURL=client.js.map