// ─── Enums ────────────────────────────────────────────────────────────────────

export enum Role {
  DIRECTEUR_GENERAL = 'directeur_general',
  DIRECTEUR_CREATIF = 'directeur_creatif',
  DIRECTEUR_FINANCIER = 'directeur_financier',
  CHEF_DE_PROJET = 'chef_de_projet',
  SOCIAL_MEDIA = 'social_media',
  COPYWRITER = 'copywriter',
  DESIGNER = 'designer',
  COMMERCIAL = 'commercial',
  CONSULTANT_EXTERNE = 'consultant_externe',
  ADMIN = 'admin',
}

export const GAME_ROLES = [
  Role.DIRECTEUR_GENERAL,
  Role.DIRECTEUR_CREATIF,
  Role.DIRECTEUR_FINANCIER,
  Role.CHEF_DE_PROJET,
  Role.SOCIAL_MEDIA,
  Role.COPYWRITER,
  Role.DESIGNER,
  Role.COMMERCIAL,
  Role.CONSULTANT_EXTERNE,
] as const;

export type GameRole = (typeof GAME_ROLES)[number];

export const ROLE_LABELS: Record<GameRole, string> = {
  [Role.DIRECTEUR_GENERAL]: 'Directeur Général',
  [Role.DIRECTEUR_CREATIF]: 'Directeur Créatif',
  [Role.DIRECTEUR_FINANCIER]: 'Directeur Financier',
  [Role.CHEF_DE_PROJET]: 'Chef de Projet',
  [Role.SOCIAL_MEDIA]: 'Responsable Social Media',
  [Role.COPYWRITER]: 'Copywriter',
  [Role.DESIGNER]: 'Designer',
  [Role.COMMERCIAL]: 'Responsable Commercial',
  [Role.CONSULTANT_EXTERNE]: 'Consultant Externe',
};

export const ROLE_DESCRIPTIONS: Record<GameRole, string> = {
  [Role.DIRECTEUR_GENERAL]:
    "Tu vois tout, tu décides en dernier recours. Ton rôle est d'arbitrer les conflits internes et de porter la relation client au plus haut niveau. Impact moyen sur la satisfaction client.",
  [Role.DIRECTEUR_CREATIF]:
    "Tu valides toutes les orientations artistiques. Rien ne part au client sans ton approbation. Tu es le filtre entre le chaos créatif et la réalité. Pas d'interaction directe client.",
  [Role.DIRECTEUR_FINANCIER]:
    "Tu es le seul à connaître l'état exact du budget. Tu sais ce qu'on peut se permettre — et ce qu'on fait semblant de pouvoir se permettre. Pas d'interaction directe client.",
  [Role.CHEF_DE_PROJET]:
    "Tu gères les délais, les retards et les excuses. Tu es entre le marteau créatif et l'enclume client. Impact moyen sur la satisfaction client.",
  [Role.SOCIAL_MEDIA]:
    "Tu gères la réputation publique de l'agence. Un faux pas et tout le monde le voit. Pas d'interaction directe client.",
  [Role.COPYWRITER]:
    "Tu reçois les briefs créatifs et tu transformes le vide en mots. Tu travailles sous les ordres du Directeur Créatif. Pas d'interaction directe client.",
  [Role.DESIGNER]:
    "Tu reçois les demandes visuelles et tu les matérialises. Ta production est validée par le Directeur Créatif. Pas d'interaction directe client.",
  [Role.COMMERCIAL]:
    "Tu gères la relation client au quotidien. Tu es le visage de l'agence. Forte influence sur la satisfaction client — dans les deux sens.",
  [Role.CONSULTANT_EXTERNE]:
    "Tu interviens ponctuellement selon les événements. Ton regard extérieur peut sauver ou condamner une situation. Rôle narratif à fort impact indirect.",
};

export enum GamePhase {
  PRELAUNCH = 'prelaunch',
  PLAYING = 'playing',
  VICTORY = 'victory',
  DEFEAT = 'defeat',
}

export enum CrisisType {
  VOTE_COLLECTIF = 'vote_collectif',
  SUBI = 'subi',
}

export enum ContentType {
  INFO = 'info',
  MISSION = 'mission',
}

export enum MiniGameType {
  ARBITRAGE = 'arbitrage',
  VALIDATION_DC = 'validation_dc',
  BUDGET = 'budget',
  PLANNING = 'planning',
  MODERATION = 'moderation',
  REDACTION = 'redaction',
  UPLOAD_VISUEL = 'upload_visuel',
  NEGOCIATION = 'negociation',
  ANALYSE = 'analyse',
}

export enum SubmissionStatus {
  PENDING = 'pending',
  PENDING_VALIDATION = 'pending_validation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum NotificationType {
  MISSION_NEW = 'mission_new',
  MISSION_VALIDATED = 'mission_validated',
  CRISIS_NEW = 'crisis_new',
  VOTE_CLOSED = 'vote_closed',
  SCORE_UPDATE = 'score_update',
  GAME_EVENT = 'game_event',
}

// ─── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface GameConfig {
  phase: GamePhase;
  currentDay: number;
  launchDate: string | null;
  dailyUpdateHour: number;
}

/** Client profile safe for the frontend — tolerance_threshold is NEVER included */
export interface ClientProfilePublic {
  id: string;
  name: string;
  companyName: string;
  sector: string;
  personality: string;
  initialBrief: string;
  createdAt: string;
}

export interface DailyNews {
  id: string;
  dayNumber: number;
  content: string;
  createdAt: string;
}

export interface CrisisOption {
  id: string;
  label: string;
}

export interface Crisis {
  id: string;
  dayNumber: number;
  type: CrisisType;
  title: string;
  content: string;
  options: CrisisOption[] | null;
  deadline: string | null;
  winningOption: string | null;
  resultApplied: boolean;
  aiConsequence: string | null;
  createdAt: string;
  voteCount?: Record<string, number>;
  userVote?: string;
}

export interface PrivateContent {
  id: string;
  dayNumber: number;
  type: ContentType;
  content: string;
  isRead: boolean;
  missionCompleted: boolean;
  createdAt: string;
}

export interface SatisfactionScore {
  id: string;
  dayNumber: number;
  score: number;
  delta: number;
  aiComment: string;
  calculatedAt: string;
}

export interface RoleVote {
  role: Role;
  count: number;
}

// ─── Mini-jeux: types de prompts ─────────────────────────────────────────────

export interface ArbitragePrompt {
  context: string;
  propositionA: { title: string; description: string };
  propositionB: { title: string; description: string };
}

export interface BudgetItem {
  id: string;
  label: string;
  min: number;
  max: number;
  recommended: number;
}

export interface BudgetPrompt {
  totalBudget: number;
  items: BudgetItem[];
  constraints: string;
}

export interface PlanningTask {
  id: string;
  label: string;
  duration: number;
  dependsOn: string[];
}

export interface PlanningPrompt {
  tasks: PlanningTask[];
  availableDays: number;
  context: string;
}

export interface ModerationPost {
  id: string;
  content: string;
  platform: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ModerationPrompt {
  posts: ModerationPost[];
  agencyContext: string;
}

export interface RedactionPrompt {
  brief: string;
  targetAudience: string;
  tone: string;
  constraints: string;
}

export interface UploadVisuelPrompt {
  brief: string;
  style: string;
  references: string;
  format: string;
}

export interface NegociationOption {
  id: string;
  label: string;
  requiresBudgetItem?: string;
}

export interface NegociationExchange {
  clientMessage: string;
  options: NegociationOption[];
}

export interface NegociationPrompt {
  context: string;
  clientPersonality: string;
  exchanges: NegociationExchange[];
  budgetConstraints?: Record<string, number>;
}

export interface AnalyseFragment {
  id: string;
  content: string;
}

export interface AnalysePrompt {
  fragments: AnalyseFragment[];
  question: string;
}

export type MinigamePrompt =
  | ArbitragePrompt
  | BudgetPrompt
  | PlanningPrompt
  | ModerationPrompt
  | RedactionPrompt
  | UploadVisuelPrompt
  | NegociationPrompt
  | AnalysePrompt;

export interface Minigame {
  id: string;
  dayNumber: number;
  role: Role;
  type: MiniGameType;
  title: string;
  prompt: MinigamePrompt;
  deadline: string;
  requiresValidationFrom: Role | null;
  scoreImpactSuccess: number;
  scoreImpactFailure: number;
  createdAt: string;
  submission?: MinigameSubmission;
}

export interface MinigameSubmission {
  id: string;
  minigameId: string;
  content: Record<string, unknown>;
  submittedAt: string;
  status: SubmissionStatus;
  validatedById: string | null;
  validatedAt: string | null;
  validatorComment: string | null;
}

export interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
}

// ─── Socket.io events ────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  crisis_new: (crisis: Crisis) => void;
  vote_update: (data: { crisisId: string; results: Record<string, number> }) => void;
  vote_closed: (data: { crisisId: string; winningOption: string; aiConsequence: string }) => void;
  score_update: (score: SatisfactionScore) => void;
  notification: (notification: Notification) => void;
  game_phase_change: (phase: GamePhase) => void;
  minigame_new: (minigame: Omit<Minigame, 'submission'>) => void;
  submission_validated: (data: { minigameId: string; status: SubmissionStatus; comment: string | null }) => void;
}

export interface ClientToServerEvents {
  join_game: () => void;
}
