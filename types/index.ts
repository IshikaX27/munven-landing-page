export interface UserCreate {
  name: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  /** Signed up on their own (open sign-up), not added by a company admin */
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export type Discipline = "product" | "development" | "design" | "testing" | "management" | "other";
export type Role = "owner" | "admin" | "member";
export type DecisionKind = "decision" | "change" | "requirement" | "issue";

/** Feature/team link of a document or chat, and Gemini's pending suggestion */
export interface LinkFields {
  feature_id?: string | null;
  discipline?: Discipline | null;
  suggested_feature_id?: string | null;
  suggested_discipline?: Discipline | null;
  suggestion_reason?: string | null;
  /** The user resolved the link (accepted, changed or dismissed); no new suggestion will come */
  suggestion_dismissed?: boolean;
}

export interface DocumentItem extends LinkFields {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  error_message?: string;
  created_at: string;
  has_file: boolean;
  user_id: string;
  uploaded_by_name?: string | null;
}

export interface SourceCitation {
  source_index: number;
  document_name: string;
  document_id: string;
  chunk_id: string;
  snippet: string;
  file_type?: string | null;
  /** "page:3", "slide:2", "sheet:Sales" or "time:65" (seconds) */
  location?: string | null;
  discipline?: Discipline | null;
}

export interface DocumentQueryResponse {
  conversation_id: string;
  standalone_query: string;
  query: string;
  answer: string;
  citations: SourceCitation[];
  feature_id?: string | null;
}

export interface FileLink {
  url: string;
  expires_in: number;
}

export interface Conversation extends LinkFields {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  created_by_name?: string | null;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: SourceCitation[] | null;
  created_at: string;
  author_name?: string | null;
  feedback?: AnswerFeedback;
}

/** A reader's rating of an AI answer. */
export type AnswerFeedback = "up" | "down" | null;

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[];
}

export interface Workspace {
  id: string;
  name: string;
  is_personal: boolean;
  role: Role;
  member_count: number;
  created_at: string;
}

export interface Member {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  joined_at: string;
}

export interface Feature {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  document_count: number;
  conversation_count: number;
  decision_count: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  features: Feature[];
}

export interface Decision {
  id: string;
  feature_id: string;
  kind: DecisionKind;
  title: string;
  detail?: string | null;
  discipline?: Discipline | null;
  source_type?: "document" | "conversation" | null;
  source_id?: string | null;
  source_label?: string | null;
  source_location?: string | null;
  origin: "ai" | "manual";
  created_at: string;
}

export interface FeatureOverview {
  feature: Feature;
  project_id: string;
  project_name: string;
  documents: DocumentItem[];
  conversations: Conversation[];
  decisions: Decision[];
}

export interface RoomMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: SourceCitation[] | null;
  created_at: string;
  user_id?: string | null;
  author_name?: string | null;
  /** false = a message to the team only (no AI answer) */
  ask_ai?: boolean | null;
  /** For AI answers: the question they answer */
  reply_to?: string | null;
}

export interface RoomMember {
  user_id: string;
  name: string;
  role: Role;
}

export interface Room {
  conversation_id: string;
  group_name: string;
  members: RoomMember[];
  messages: RoomMessage[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  status: "active" | "invited" | "deactivated";
  invite_expires_at?: string | null;
  created_at: string;
}

export interface InviteResult {
  employee: Employee;
  /** One-time token; the invite link is <site>/invite/<token> */
  invite_token: string;
  invite_expires_at: string;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  email: string;
  status: "active" | "invited";
}
