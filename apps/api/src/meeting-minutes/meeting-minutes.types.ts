export interface MeetingMinutesAudioAnalysisFileInput {
  name: string;
  mimeType?: string;
  dataUrl?: string;
  base64?: string;
  fileUrl?: string;
  storageKey?: string;
  sizeBytes?: number;
}

export interface MeetingMinutesAudioAnalysisInput {
  files: MeetingMinutesAudioAnalysisFileInput[];
  folderLabel: string;
  folderShortLabel: string;
  folderKind: string;
  title: string;
  meetingAt: string;
  createdBy: string;
  textHint?: string;
  previousMeeting?: {
    title: string;
    summary: string;
    carryOverItems: string[];
    openIssues: string[];
    actionItems: Array<{
      text: string;
      owner: string;
      dueLabel: string;
    }>;
  } | null;
  dryRun?: boolean;
  strictOpenai?: boolean;
}

export interface MeetingMinutesAudioAnalysisResult {
  ok: boolean;
  generationMode: "live" | "fallback" | "dry_run";
  transcriptionModel: string;
  model: string;
  transcript: string;
  translatedTranscript: string;
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    text: string;
    owner: string;
    dueLabel: string;
  }>;
  questions: string[];
  suggestions: string[];
  sourceLabel: string;
  analysisLabel: string;
  warnings: string[];
  processedFiles: Array<{
    name: string;
    status: "transcribed" | "fallback" | "failed";
    warning?: string;
  }>;
  createdAt: string;
}

export type MeetingMinutesAudioAnalysisTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface MeetingMinutesAudioAnalysisTaskPayload {
  id: string;
  status: MeetingMinutesAudioAnalysisTaskStatus;
  result: MeetingMinutesAudioAnalysisResult | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  inputMeta: {
    title: string;
    meetingAt: string;
    folderLabel: string;
    folderShortLabel: string;
    fileNames: string[];
  };
}

export interface MeetingMinutesOpenAiStatus {
  hasApiKey: boolean;
  baseUrlConfigured: boolean;
  proxyConfigured: boolean;
  baseUrl: string;
  responsesUrl: string;
  audioUrl: string;
  transcriptionModel: string;
  summaryModel: string;
  checkedAt: string;
}
