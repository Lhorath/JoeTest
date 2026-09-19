import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private instance: AxiosInstance;

  constructor(options: ApiClientOptions = {}) {
    let resolvedBaseUrl = options.baseURL;

    if (typeof window !== "undefined") {
      // In browser environment:
      // Default to same-origin relative '/api/v1' unless an explicit custom non-localhost:4000 URL is provided
      if (
        !resolvedBaseUrl ||
        resolvedBaseUrl.includes("localhost:4000") ||
        resolvedBaseUrl.includes("127.0.0.1:4000")
      ) {
        const publicUrl =
          typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL
            : undefined;

        if (
          publicUrl &&
          !publicUrl.includes("localhost:4000") &&
          !publicUrl.includes("127.0.0.1:4000")
        ) {
          resolvedBaseUrl = publicUrl;
        } else {
          resolvedBaseUrl = "/api/v1";
        }
      }
    } else {
      // In server environment (Node/Next.js SSR):
      if (
        !resolvedBaseUrl ||
        resolvedBaseUrl.includes("localhost:4000") ||
        resolvedBaseUrl.includes("127.0.0.1:4000")
      ) {
        resolvedBaseUrl =
          process.env.API_URL ||
          (process.env.PORT
            ? `http://127.0.0.1:${process.env.PORT}/api/v1`
            : "http://127.0.0.1:3000/api/v1");
      }
    }

    this.instance = axios.create({
      baseURL: resolvedBaseUrl,
      timeout: options.timeout || 10000,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Request interceptor to dynamically inject request tracking IDs
    this.instance.interceptors.request.use(
      (config) => {
        // If we are in the server environment (e.g. Next.js SSR), we can forward trace headers if they exist
        if (typeof window === "undefined") {
          // Server-side trace context can be fetched or generated if needed
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for unified error parsing
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        const parsedError = {
          message:
            error.response?.data?.message ||
            error.message ||
            "An unexpected error occurred",
          status: error.response?.status || 500,
          code: error.response?.data?.code || "INTERNAL_ERROR",
          details: error.response?.data?.details || null,
        };
        return Promise.reject(parsedError);
      },
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  public async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  // Health and readiness endpoints access
  public async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.get<{ status: string; timestamp: string }>("/health");
  }

  public async getReadiness(): Promise<{
    status: string;
    services: Record<string, string>;
  }> {
    return this.get<{ status: string; services: Record<string, string> }>(
      "/readiness",
    );
  }

  // Live Session API
  public liveSessions = {
    getPublic: () =>
      this.get<import("@platform/types").PublicLiveSessionSummary[]>(
        "/live-sessions/public",
      ),

    getPublicList: () =>
      this.get<import("@platform/types").PublicLiveSessionSummary[]>(
        "/live-sessions/public",
      ),

    getPublicById: (id: string) =>
      this.get<import("@platform/types").PublicLiveSessionDetail>(
        `/live-sessions/${id}/public`,
      ),

    getPublicQueue: (id: string) =>
      this.get<import("@platform/types").PublicQueueEntry[]>(
        `/live-sessions/${id}/queue/public`,
      ),

    getWeeklyTop3: (id: string, date?: string) =>
      this.get<import("@platform/types").WeeklyTop3Response>(
        `/live-sessions/${id}/weekly-top3${date ? `?date=${encodeURIComponent(date)}` : ""}`,
      ),

    getSubmissionEligibility: (id: string) =>
      this.get<import("@platform/types").SubmissionEligibilityResponse>(
        `/live-sessions/${id}/submission-eligibility`,
      ),

    createSubmission: (
      id: string,
      data: import("@platform/types").CreateSubmissionDto,
      idempotencyKey: string,
    ) =>
      this.post<import("@platform/types").CreateSubmissionResponse>(
        `/live-sessions/${id}/submissions`,
        data,
        {
          headers: {
            "idempotency-key": idempotencyKey,
          },
        },
      ),

    create: (data: {
      stationId: string;
      liveTitle: string;
      primaryStreamingPlatform: string;
      savedProfileUrlSnapshot: string;
    }) => this.post<any>("/live-sessions", data),

    get: (id: string) => this.get<any>(`/live-sessions/${id}`),

    start: (id: string, expectedQueueRevision?: number) =>
      this.post<any>(`/live-sessions/${id}/start`, { expectedQueueRevision }),

    pause: (id: string, expectedQueueRevision?: number) =>
      this.post<any>(`/live-sessions/${id}/pause`, { expectedQueueRevision }),

    resume: (id: string, expectedQueueRevision?: number) =>
      this.post<any>(`/live-sessions/${id}/resume`, { expectedQueueRevision }),

    end: (id: string, expectedQueueRevision?: number) =>
      this.post<any>(`/live-sessions/${id}/end`, { expectedQueueRevision }),

    getQueue: (id: string) => this.get<any[]>(`/live-sessions/${id}/queue`),

    playNext: (id: string, expectedQueueRevision?: number) =>
      this.post<{ success: boolean }>(`/live-sessions/${id}/queue/play-next`, {
        expectedQueueRevision,
      }),

    loadQueueEntry: (
      id: string,
      entryId: string,
      expectedQueueRevision?: number,
    ) =>
      this.post<{ success: boolean }>(
        `/live-sessions/${id}/queue/entries/${entryId}/load`,
        { expectedQueueRevision },
      ),

    clearPlayer: (id: string, expectedQueueRevision?: number) =>
      this.post<{ success: boolean }>(
        `/live-sessions/${id}/queue/player/clear`,
        { expectedQueueRevision },
      ),

    moveToNext: (id: string, entryId: string, expectedQueueRevision?: number) =>
      this.post<{ success: boolean }>(
        `/live-sessions/${id}/queue/entries/${entryId}/move-to-next`,
        { expectedQueueRevision },
      ),

    skipQueueEntry: (
      id: string,
      entryId: string,
      expectedQueueRevision?: number,
    ) =>
      this.post<{ success: boolean }>(
        `/live-sessions/${id}/queue/entries/${entryId}`,
        { expectedQueueRevision, action: "SKIP" },
      ),

    completeQueueEntry: (
      id: string,
      entryId: string,
      expectedQueueRevision?: number,
    ) =>
      this.post<{ success: boolean }>(
        `/live-sessions/${id}/queue/entries/${entryId}`,
        { expectedQueueRevision, action: "COMPLETE" },
      ),

    removeQueueEntry: (
      id: string,
      entryId: string,
      expectedQueueRevision?: number,
    ) =>
      this.delete<{ success: boolean }>(
        `/live-sessions/${id}/queue/entries/${entryId}${
          expectedQueueRevision !== undefined
            ? `?expectedQueueRevision=${expectedQueueRevision}`
            : ""
        }`,
      ),

    changeEntryTier: (
      id: string,
      entryId: string,
      data: { destinationType: "FREE" | "PRIORITY_TIER"; tierSnapshotId?: string },
    ) =>
      this.post<{ success: boolean; message?: string }>(
        `/live-sessions/${id}/queue/entries/${entryId}/tier`,
        data,
      ),

    updateConfiguration: (id: string, data: any) =>
      this.patch<{ success: boolean }>(`/live-sessions/${id}/configuration`, data),
  };

  // Submissions API
  public submissions = {
    getMine: () =>
      this.get<import("@platform/types").UserSubmissionSummary[]>(
        "/submissions/mine",
      ),

    upgrade: (
      submissionId: string,
      data: import("@platform/types").UpgradeSubmissionDto,
      idempotencyKey: string,
    ) =>
      this.post<import("@platform/types").UpgradeSubmissionResponse>(
        `/submissions/${submissionId}/upgrade`,
        data,
        {
          headers: {
            "idempotency-key": idempotencyKey,
          },
        },
      ),
  };

  // Tracks API
  public tracks = {
    list: () =>
      this.get<import("@platform/types").TrackSummary[]>("/tracks"),

    get: (trackId: string) =>
      this.get<import("@platform/types").TrackSummary>(`/tracks/${trackId}`),

    createUploadUrl: (dto: import("@platform/types").CreateTrackUploadUrlDto) =>
      this.post<import("@platform/types").CreateUploadUrlResponse>(
        "/tracks/upload-url",
        dto,
      ),

    completeUpload: (trackId: string, uploadIntentId: string) =>
      this.post<{ success: boolean }>(`/tracks/${trackId}/upload-complete`, {
        uploadIntentId,
      }),

    update: (trackId: string, data: Partial<import("@platform/types").TrackSummary>) =>
      this.patch<import("@platform/types").TrackSummary>(`/tracks/${trackId}`, data),

    delete: (trackId: string) =>
      this.delete<{ success: boolean }>(`/tracks/${trackId}`),

    download: (trackId: string, versionId?: string) =>
      this.post<{ downloadUrl: string; mimeType?: string }>(
        `/tracks/${trackId}/download`,
        { versionId },
      ),
  };

  // Auth API
  public auth = {
    getMe: () => this.get<{ user: import("@platform/types").UserProfile | null }>("/auth/me"),
    login: (data: { emailOrUsername?: string; email?: string; password?: string; passwordPlain?: string }) =>
      this.post<{ success: boolean; user?: import("@platform/types").UserProfile }>("/auth/login", {
        email: data.email || data.emailOrUsername,
        password: data.password || data.passwordPlain,
      }),
    register: (data: {
      email: string;
      username: string;
      displayName: string;
      password: string;
      passwordConfirmation?: string;
      confirmPassword?: string;
      acceptTerms?: boolean;
      termsVersion?: string;
    }) =>
      this.post<{
        success: boolean;
        message?: string;
        user?: import("@platform/types").UserProfile;
      }>("/auth/register", {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        password: data.password,
        passwordConfirmation:
          data.passwordConfirmation || data.confirmPassword || "",
        acceptTerms: data.acceptTerms ?? true,
        termsVersion: data.termsVersion,
      }),
    logout: () => this.post<{ success: boolean }>("/auth/logout"),
    verifyEmail: (data: { token: string }) =>
      this.post<{ success: boolean; message?: string }>("/auth/verify-email", data),
    requestPasswordReset: (data: { email: string }) =>
      this.post<{ success: boolean; message?: string }>("/auth/forgot-password", data),
    confirmPasswordReset: (data: { token: string; password: string }) =>
      this.post<{ success: boolean; message?: string }>("/auth/reset-password", data),
  };

  // User Account & Settings API
  public account = {
    getProfile: () =>
      this.get<import("@platform/types").UserProfile>("/account/profile"),
    updateProfile: (data: import("@platform/types").UpdateUserProfileDto) =>
      this.patch<import("@platform/types").UserProfile>("/account/profile", data),
    changePassword: (data: import("@platform/types").ChangePasswordDto) =>
      this.post<{ success: boolean; message?: string }>(
        "/account/change-password",
        data,
      ),
    getSessions: () =>
      this.get<import("@platform/types").UserSessionInfo[]>("/account/sessions"),
    revokeSession: (sessionId: string) =>
      this.delete<{ success: boolean }>(`/account/sessions/${sessionId}`),
    logoutAll: () =>
      this.post<{ success: boolean }>("/account/logout-all"),
    getSecurityLogs: () =>
      this.get<import("@platform/types").SecurityEventLog[]>(
        "/account/security-logs",
      ),
    getPreferences: () =>
      this.get<import("@platform/types").UserPreferencesDto>(
        "/account/preferences",
      ),
    updatePreferences: (data: Partial<import("@platform/types").UserPreferencesDto>) =>
      this.put<import("@platform/types").UserPreferencesDto>(
        "/account/preferences",
        data,
      ),
    getArtists: () =>
      this.get<import("@platform/types").ArtistIdentitySummary[]>("/account/artists"),
    createArtist: (data: import("@platform/types").CreateArtistIdentityDto) =>
      this.post<import("@platform/types").ArtistIdentity>("/account/artists", data),
    getArtist: (id: string) =>
      this.get<import("@platform/types").ArtistIdentity>(`/account/artists/${id}`),
    updateArtist: (id: string, data: import("@platform/types").UpdateArtistIdentityDto) =>
      this.patch<import("@platform/types").ArtistIdentity>(`/account/artists/${id}`, data),
    deleteArtist: (id: string) =>
      this.delete<{ success: boolean; message?: string }>(`/account/artists/${id}`),
  };

  // Artist Identities Top-Level API
  public artists = {
    list: () =>
      this.get<import("@platform/types").ArtistIdentitySummary[]>("/account/artists"),
    get: (id: string) =>
      this.get<import("@platform/types").ArtistIdentity>(`/account/artists/${id}`),
    create: (data: import("@platform/types").CreateArtistIdentityDto) =>
      this.post<import("@platform/types").ArtistIdentity>("/account/artists", data),
    update: (id: string, data: import("@platform/types").UpdateArtistIdentityDto) =>
      this.patch<import("@platform/types").ArtistIdentity>(`/account/artists/${id}`, data),
    delete: (id: string) =>
      this.delete<{ success: boolean; message?: string }>(`/account/artists/${id}`),
  };

  // Theme & Branding API
  public theme = {
    getPublic: () =>
      this.get<import("@platform/types").PublicThemeConfig>("/theme/public"),
  };

  // Public Profiles API
  public profiles = {
    get: (username: string) =>
      this.get<import("@platform/types").PublicUserProfile>(`/profile/${username}`),
  };

  // Host Overlays API
  public overlays = {
    getByStation: (hostname: string) =>
      this.get<{
        stationName: string;
        hostname: string;
        isLive: boolean;
        nowPlaying: import("@platform/types").PublicQueueEntry | null;
        theme: {
          style: string;
          accentColor: string;
        };
      }>(`/overlay/${hostname}`),
  };

  // Public Stations API
  public stations = {
    list: () =>
      this.get<import("@platform/types").StationSummary[]>("/stations"),

    getByHostname: (hostname: string) =>
      this.get<import("@platform/types").PublicStationDetail>(`/stations/${hostname}`),

    getWeeklyTop3: (hostname: string, date?: string) =>
      this.get<import("@platform/types").WeeklyTop3Response>(
        `/stations/${hostname}/weekly-top3${date ? `?date=${encodeURIComponent(date)}` : ""}`,
      ),
  };

  // Host Studio & Station Management API
  public host = {
    getWeeklyTop3: (date?: string) =>
      this.get<import("@platform/types").WeeklyTop3Response>(
        `/host/station/weekly-top3${date ? `?date=${encodeURIComponent(date)}` : ""}`,
      ),

    getOnboardingStatus: () =>
      this.get<import("@platform/types").HostOnboardingStatus>("/host/onboarding-status"),

    apply: (data: import("@platform/types").CreateHostApplicationDto) =>
      this.post<import("@platform/types").HostApplicationSummary>("/host/apply", data),

    createStripeConnectLink: () =>
      this.post<import("@platform/types").StripeConnectLinkResponse>("/host/stripe/connect"),

    getStripeStatus: () =>
      this.get<import("@platform/types").StripeConnectStatusResponse>("/host/stripe/status"),

    verifyStripeTest: () =>
      this.post<import("@platform/types").StripeConnectStatusResponse>("/host/stripe/status"),

    getStation: () =>
      this.get<import("@platform/types").StationSummary>("/host/station"),

    updateStation: (data: import("@platform/types").UpdateStationDto) =>
      this.patch<import("@platform/types").StationSummary>("/host/station", data),

    goLive: (data: import("@platform/types").GoLiveDto) =>
      this.post<import("@platform/types").PublicLiveSessionDetail>("/host/go-live", data),

    goOffline: () =>
      this.post<{ success: boolean; message: string }>("/host/go-offline"),

    getPriorityTiers: () =>
      this.get<import("@platform/types").StationPriorityTier[]>("/host/station/tiers"),

    createPriorityTier: (data: import("@platform/types").CreateStationPriorityTierDto) =>
      this.post<import("@platform/types").StationPriorityTier>("/host/station/tiers", data),

    updatePriorityTier: (tierId: string, data: import("@platform/types").UpdateStationPriorityTierDto) =>
      this.patch<import("@platform/types").StationPriorityTier>(`/host/station/tiers/${tierId}`, data),

    deletePriorityTier: (tierId: string) =>
      this.delete<{ success: boolean; message: string }>(`/host/station/tiers/${tierId}`),

    reorderPriorityTiers: (data: import("@platform/types").ReorderStationPriorityTiersDto) =>
      this.post<import("@platform/types").StationPriorityTier[]>("/host/station/tiers/reorder", data),
  };

  // Admin Customization & Management API
  public admin = {
    getCustomization: () =>
      this.get<import("@platform/types").AdminCustomizationConfig>(
        "/admin/customization",
      ),
    updateCustomization: (data: import("@platform/types").UpdateCustomizationDto) =>
      this.put<import("@platform/types").AdminCustomizationConfig>(
        "/admin/customization",
        data,
      ),
    resetCustomization: () =>
      this.post<import("@platform/types").AdminCustomizationConfig>(
        "/admin/customization/reset",
      ),
    createAssetUploadUrl: (data: { assetType: "logo" | "favicon" | "artwork"; mimeType: string }) =>
      this.post<{ uploadUrl: string; assetUrl: string }>(
        "/admin/customization/assets/upload-url",
        data,
      ),
    getHostApplications: (status?: string) =>
      this.get<import("@platform/types").HostApplicationSummary[]>(
        `/admin/host-applications${status ? `?status=${status}` : ""}`,
      ),
    approveHostApplication: (id: string) =>
      this.post<{ success: boolean; message: string; station?: import("@platform/types").StationSummary }>(
        `/admin/host-applications/${id}/approve`,
      ),
    rejectHostApplication: (id: string, data?: { reason?: string }) =>
      this.post<{ success: boolean; message: string }>(
        `/admin/host-applications/${id}/reject`,
        data,
      ),
    suspendHost: (id: string, data?: { reason?: string }) =>
      this.post<{ success: boolean; message: string }>(
        `/admin/host-applications/${id}/suspend`,
        data,
      ),
    getPlatformSettings: () =>
      this.get<import("@platform/types").PlatformSettingsDto>(
        "/admin/platform-settings",
      ),
    updatePlatformSettings: (data: import("@platform/types").UpdatePlatformSettingsDto) =>
      this.put<import("@platform/types").PlatformSettingsDto>(
        "/admin/platform-settings",
        data,
      ),

    // Dashboard & Metrics
    getDashboard: () =>
      this.get<import("@platform/types").AdminDashboardMetrics>("/admin/dashboard"),

    // Submissions
    getSubmissions: (query?: import("@platform/types").AdminSubmissionFilterDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ items: import("@platform/types").AdminSubmissionSummary[]; total: number; page: number; limit: number }>(
        `/admin/submissions${qs ? `?${qs}` : ""}`,
      );
    },
    getSubmission: (id: string) =>
      this.get<import("@platform/types").AdminSubmissionDetail>(`/admin/submissions/${id}`),
    moderateSubmission: (id: string, data: import("@platform/types").AdminSubmissionActionDto) =>
      this.post<{ success: boolean; message: string; submissionId: string }>(
        `/admin/submissions/${id}/action`,
        data,
      ),

    // Users
    getUsers: (query?: import("@platform/types").AdminUserFilterDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ items: import("@platform/types").AdminUserSummary[]; total: number; page: number; limit: number }>(
        `/admin/users${qs ? `?${qs}` : ""}`,
      );
    },
    getUser: (id: string) =>
      this.get<import("@platform/types").AdminUserDetail>(`/admin/users/${id}`),
    moderateUser: (id: string, data: import("@platform/types").AdminUserActionDto) =>
      this.post<{ success: boolean; message: string; userId: string }>(
        `/admin/users/${id}/action`,
        data,
      ),

    // Hosts & Stations
    getHosts: (query?: import("@platform/types").AdminHostFilterDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ items: import("@platform/types").AdminHostSummary[]; total: number }>(
        `/admin/hosts${qs ? `?${qs}` : ""}`,
      );
    },
    getStations: (query?: { search?: string }) => {
      const qs = query?.search ? `?search=${encodeURIComponent(query.search)}` : "";
      return this.get<{ items: import("@platform/types").AdminStationSummary[]; total: number }>(
        `/admin/stations${qs}`,
      );
    },
    updateStation: (id: string, data: { submissionsEnabled?: boolean; name?: string }) =>
      this.patch<{ success: boolean; message: string; station: import("@platform/types").AdminStationSummary }>(
        `/admin/stations/${id}`,
        data,
      ),

    // Live Sessions
    getLiveSessions: (query?: { status?: string; hostId?: string }) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ items: import("@platform/types").AdminLiveSessionSummary[]; total: number }>(
        `/admin/live-sessions${qs ? `?${qs}` : ""}`,
      );
    },
    getLiveSession: (id: string) =>
      this.get<import("@platform/types").AdminLiveSessionSummary & { queue: any[] }>(
        `/admin/live-sessions/${id}`,
      ),

    // Financial Ledger
    getLedger: (query?: { page?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ summary: import("@platform/types").AdminLedgerSummary; entries: import("@platform/types").AdminLedgerEntryDetail[]; total: number }>(
        `/admin/ledger${qs ? `?${qs}` : ""}`,
      );
    },
    createCompensatingLedgerEntry: (data: import("@platform/types").AdminCompensatingEntryDto) =>
      this.post<{ success: boolean; message: string; transactionId: string }>(
        "/admin/ledger/compensating",
        data,
      ),

    // Payments
    getPayments: (query?: import("@platform/types").AdminPaymentFilterDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ items: import("@platform/types").AdminPaymentSummary[]; total: number; page: number; limit: number }>(
        `/admin/payments${qs ? `?${qs}` : ""}`,
      );
    },
    getPayment: (id: string) =>
      this.get<import("@platform/types").AdminPaymentSummary & { allocations: any[]; ledgerEntries: any[] }>(
        `/admin/payments/${id}`,
      ),

    // Reconciliation
    getReconciliationReport: () =>
      this.get<import("@platform/types").AdminReconciliationReport>("/admin/reconciliation"),
    repairDiscrepancy: (data: import("@platform/types").AdminRepairDto) =>
      this.post<import("@platform/types").AdminRepairResult>("/admin/reconciliation/repair", data),

    // Reservations
    cleanupReservations: () =>
      this.post<{ success: boolean; expiredCount: number; message: string }>(
        "/admin/reservations/cleanup",
        {},
      ),

    // Audit Logs
    getAuditLogs: (query?: import("@platform/types").AdminAuditLogFilterDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ items: import("@platform/types").AdminAuditLogRecord[]; total: number; page: number; limit: number }>(
        `/admin/audit-logs${qs ? `?${qs}` : ""}`,
      );
    },

    // Media & Storage
    getMedia: (query?: import("@platform/types").AdminMediaFilterDto) => {
      const params = new URLSearchParams();
      if (query) {
        Object.entries(query).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            params.append(key, String(val));
          }
        });
      }
      const qs = params.toString();
      return this.get<{ items: import("@platform/types").AdminMediaSummary[]; total: number; page: number; limit: number }>(
        `/admin/media${qs ? `?${qs}` : ""}`,
      );
    },
    deleteMedia: (id: string, options?: { purgeS3?: boolean; reason?: string }) =>
      this.delete<{ success: boolean; message: string; trackId: string }>(
        `/admin/media/${id}`,
        { data: options },
      ),
    getStorageCleanupReport: () =>
      this.get<import("@platform/types").AdminStorageCleanupReport>("/admin/media/cleanup"),
    purgeStorageCandidates: (options?: { confirmed?: boolean }) =>
      this.post<{ success: boolean; purgedCount: number; message: string }>(
        "/admin/media/cleanup",
        options || {},
      ),

  };

  // Legal & Terms of Service API
  public legal = {
    getStatus: () =>
      this.get<import("@platform/types").LegalAcceptanceStatusResponse>(
        "/legal/status",
      ),
    recordAcceptance: (data: import("@platform/types").RecordLegalAcceptanceDto) =>
      this.post<{
        success: boolean;
        record: import("@platform/types").LegalAcceptanceRecord;
        currentVersion: string;
        isAccepted: boolean;
      }>("/legal/accept", data),
  };
}

export const createApiClient = (options?: ApiClientOptions): ApiClient => {
  return new ApiClient(options);
};
