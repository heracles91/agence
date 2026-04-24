import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import {
  ContentType, Role, type CrisisOption,
  type ArbitragePrompt, type BudgetPrompt, type PlanningPrompt,
  type ModerationPrompt, type RedactionPrompt, type UploadVisuelPrompt, type NegociationPrompt,
} from 'agence-shared';
import prisma from '../prisma';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

async function logAiCall(action: string, details: Record<string, unknown>): Promise<void> {
  prisma.auditLog.create({ data: { action, details: details as import('@prisma/client').Prisma.InputJsonValue } }).catch(() => {/* non-bloquant */});
}

interface ClientContext {
  name: string;
  companyName: string;
  sector: string;
  personality: string;
  initialBrief: string;
}

interface ScoreContext {
  dayNumber: number;
  score: number;
  delta: number;
}

interface DailyContentInput {
  dayNumber: number;
  client: ClientContext;
  recentScores: ScoreContext[];
  recentNews: string[];
}

export interface GeneratedPrivateContent {
  type: ContentType;
  content: string;
}

export interface DailyContentOutput {
  news: string[];
  privateContent: Partial<Record<Role, GeneratedPrivateContent>>;
}

const ROLE_DESCRIPTIONS_FR: Record<string, string> = {
  directeur_general: "Directeur Général — arbitre les conflits internes, porte la relation client au plus haut niveau",
  directeur_creatif: "Directeur Créatif — valide toutes les orientations artistiques, filtre créatif",
  directeur_financier: "Directeur Financier — seul à connaître l'état exact du budget",
  chef_de_projet: "Chef de Projet — gère les délais, coordonne entre équipes et client",
  social_media: "Responsable Social Media — gère la réputation publique de l'agence",
  copywriter: "Copywriter — rédige sous les ordres du DC, transforme les briefs en mots",
  designer: "Designer — produit les créations visuelles validées par le DC",
  commercial: "Responsable Commercial — gère la relation client au quotidien",
  consultant_externe: "Consultant Externe — intervient ponctuellement, regard extérieur",
};

interface CrisisContext {
  title: string;
  winningOption: string;
  aiConsequence: string | null;
}

export interface CrisisConsequenceInput {
  type: string;
  title: string;
  content: string;
  options: CrisisOption[];
  winningOption: string;
}

interface ScoreCommentInput {
  dayNumber: number;
  previousScore: number;
  newScore: number;
  delta: number;
  completedMissions: number;
  missedMissions: number;
  crises: { type: string; resolved: boolean; title: string }[];
  clientName: string;
}

export async function generateScoreComment(input: ScoreCommentInput): Promise<string> {
  const trend = input.delta >= 5 ? 'positif' : input.delta <= -5 ? 'négatif' : 'stable';
  const crisisCtx = input.crises.length
    ? `Crises du jour : ${input.crises.map((c) => `"${c.title}" (${c.resolved ? 'résolue' : 'ignorée'})`).join(', ')}.`
    : 'Aucune crise ce jour.';

  const prompt = `Tu es l'observateur omniscient d'un serious game d'agence.
Génère un commentaire interne d'UNE seule phrase (max 120 caractères) sur la satisfaction client du Jour ${input.dayNumber}.

Client : ${input.clientName}
Score : ${input.previousScore}% → ${input.newScore}% (${input.delta >= 0 ? '+' : ''}${input.delta}%)
Tendance : ${trend}
Missions accomplies : ${input.completedMissions} | Manquées : ${input.missedMissions}
${crisisCtx}

Ton : factuel, légèrement dramatique, perspicace. Jamais générique. Une seule phrase courte.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_score_comment', { dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

export async function generateCrisisConsequence(input: CrisisConsequenceInput): Promise<string> {
  const winningLabel =
    input.options.find((o) => o.id === input.winningOption)?.label ?? input.winningOption;

  const prompt = `Tu es le narrateur d'un serious game d'agence de communication.
Une crise vient d'être résolue. Génère une courte conséquence narrative (2-3 phrases, ton dramatique).

Crise : "${input.title}"
Contexte : ${input.content}
${input.type === 'vote_collectif' ? `Option choisie par vote : "${winningLabel}"` : 'Crise subie, aucun vote possible.'}

Réponds UNIQUEMENT avec les 2-3 phrases de conséquence, rien d'autre.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_crisis_consequence', { title: input.title, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

export async function generateDailyContent(input: DailyContentInput & { resolvedCrises?: CrisisContext[] }): Promise<DailyContentOutput> {
  const lastScore = input.recentScores[input.recentScores.length - 1];
  const scoreContext = lastScore
    ? `Score actuel : ${lastScore.score}% (${lastScore.delta >= 0 ? '+' : ''}${lastScore.delta}% depuis hier)`
    : "Aucun score enregistré encore (jour 1)";

  const newsContext = input.recentNews.length
    ? `Actualités récentes :\n${input.recentNews.map((n) => `- ${n}`).join('\n')}`
    : "Pas d'actualités précédentes.";

  const crisesContext = input.resolvedCrises?.length
    ? `\nCRISES RÉSOLUES RÉCEMMENT :\n${input.resolvedCrises.map((c) =>
        `- "${c.title}" → ${c.winningOption}${c.aiConsequence ? ` — ${c.aiConsequence}` : ''}`
      ).join('\n')}`
    : '';

  const rolesBlock = Object.entries(ROLE_DESCRIPTIONS_FR)
    .map(([role, desc]) => `  "${role}": { "type": "mission" ou "info", "content": "..." }`)
    .join(',\n');

  const prompt = `Tu es le narrateur d'un serious game managérial appelé AGENCE.
L'agence travaille pour un client difficile. Les 9 joueurs ont chacun un rôle dans l'agence.
Tu dois générer le contenu narratif du Jour ${input.dayNumber}/30.

CONTEXTE CLIENT :
- Entreprise : ${input.client.companyName} (${input.client.sector})
- Contact : ${input.client.name}
- Personnalité : ${input.client.personality}
- Brief initial : "${input.client.initialBrief}"
- ${scoreContext}

${newsContext}${crisesContext}

RÔLES EN JEU :
${Object.entries(ROLE_DESCRIPTIONS_FR).map(([role, desc]) => `- ${role} : ${desc}`).join('\n')}

Génère exactement ce JSON (pas de markdown, juste le JSON brut) :
{
  "news": [
    "Première actualité commune (2-3 phrases, événement narratif qui affecte l'agence ou le client)",
    "Deuxième actualité commune (optionnelle, peut être vide string si une seule suffit)"
  ],
  "privateContent": {
    "directeur_general": { "type": "mission", "content": "Mission spécifique au DG (3-4 phrases, précise et actionnelle)" },
    "directeur_creatif": { "type": "info", "content": "Information confidentielle pour le DC" },
    "directeur_financier": { "type": "mission", "content": "..." },
    "chef_de_projet": { "type": "mission", "content": "..." },
    "social_media": { "type": "mission", "content": "..." },
    "copywriter": { "type": "info", "content": "..." },
    "designer": { "type": "mission", "content": "..." },
    "commercial": { "type": "mission", "content": "..." },
    "consultant_externe": { "type": "info", "content": "..." }
  }
}

Règles :
- Les actualités sont communes à tous, narratives, cohérentes avec l'historique
- Chaque contenu privé est visible UNIQUEMENT par le joueur concerné
- Les missions ("mission") sont précises et actionnables dans le jeu du jour
- Les infos ("info") révèlent des éléments confidentiels que seul ce rôle connaît
- Le contenu doit créer des tensions internes intéressantes entre les rôles
- Adapter le ton à l'évolution du score (${lastScore ? lastScore.score + '%' : 'neutral'})
- Répondre UNIQUEMENT avec le JSON, aucun texte avant ou après`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_daily_content', { dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const parsed = JSON.parse(text.trim()) as {
    news: string[];
    privateContent: Record<string, { type: string; content: string }>;
  };

  const privateContent: Partial<Record<Role, GeneratedPrivateContent>> = {};
  for (const [roleStr, data] of Object.entries(parsed.privateContent)) {
    const role = roleStr as Role;
    privateContent[role] = {
      type: data.type === 'mission' ? ContentType.MISSION : ContentType.INFO,
      content: data.content,
    };
  }

  return {
    news: parsed.news.filter((n) => n.trim().length > 0),
    privateContent,
  };
}

// ─── Génération des prompts mini-jeux ────────────────────────────────────────

export interface MinigamePromptsOutput {
  arbitrage: ArbitragePrompt;
  budget: BudgetPrompt;
  planning: PlanningPrompt;
  moderation: ModerationPrompt;
  redaction: RedactionPrompt;
  copywriter: RedactionPrompt;
  designer: UploadVisuelPrompt;
}

export async function generateMinigamePrompts(
  input: DailyContentInput & { resolvedCrises?: CrisisContext[] }
): Promise<MinigamePromptsOutput> {
  const lastScore = input.recentScores[input.recentScores.length - 1];
  const scoreCtx = lastScore ? `Score : ${lastScore.score}%` : 'Jour 1';
  const newsCtx = input.recentNews.slice(0, 2).join(' | ') || 'Démarrage de la mission.';

  const prompt = `Tu es le Game Master du serious game AGENCE — une agence de communication face à un client difficile.
Génère les mini-jeux du Jour ${input.dayNumber}/30 pour 5 rôles. Contexte : ${input.client.companyName} (${input.client.sector}), ${scoreCtx}. Actualités : ${newsCtx}.

Génère UNIQUEMENT ce JSON brut (pas de markdown) :
{
  "arbitrage": {
    "context": "Situation concrète à laquelle le DG doit arbitrer (2 phrases)",
    "propositionA": { "title": "Option courte (3-5 mots)", "description": "Conséquences en 2 phrases" },
    "propositionB": { "title": "Option courte (3-5 mots)", "description": "Conséquences en 2 phrases" }
  },
  "budget": {
    "totalBudget": 120000,
    "items": [
      { "id": "prod", "label": "Production créative", "min": 10000, "max": 60000, "recommended": 35000 },
      { "id": "media", "label": "Achat médias", "min": 15000, "max": 70000, "recommended": 45000 },
      { "id": "event", "label": "Événementiel", "min": 5000, "max": 30000, "recommended": 20000 },
      { "id": "conseil", "label": "Conseil & stratégie", "min": 5000, "max": 25000, "recommended": 15000 }
    ],
    "constraints": "Contraintes budgétaires liées au contexte du jour (1 phrase)"
  },
  "planning": {
    "tasks": [
      { "id": "t1", "label": "Kick-off & brief", "duration": 1, "dependsOn": [] },
      { "id": "t2", "label": "Recherche & analyse", "duration": 2, "dependsOn": ["t1"] },
      { "id": "t3", "label": "Création des maquettes", "duration": 3, "dependsOn": ["t2"] },
      { "id": "t4", "label": "Validation interne", "duration": 1, "dependsOn": ["t3"] },
      { "id": "t5", "label": "Présentation client", "duration": 1, "dependsOn": ["t4"] }
    ],
    "availableDays": 8,
    "context": "Mission de planning liée à l'actualité du jour (1 phrase)"
  },
  "moderation": {
    "posts": [
      { "id": "p1", "content": "Post social media (réel, 1-2 phrases)", "platform": "LinkedIn", "riskLevel": "low" },
      { "id": "p2", "content": "Post problématique lié au contexte", "platform": "Twitter", "riskLevel": "high" },
      { "id": "p3", "content": "Post ambigu à évaluer", "platform": "Instagram", "riskLevel": "medium" },
      { "id": "p4", "content": "Commentaire d'un concurrent", "platform": "Twitter", "riskLevel": "medium" }
    ],
    "agencyContext": "Contexte de modération spécifique au jour (1 phrase)"
  },
  "redaction": {
    "brief": "Demande de rédaction concrète liée à l'actualité du jour (2 phrases)",
    "targetAudience": "Public cible (ex: direction client, journalistes...)",
    "tone": "Ton demandé (ex: professionnel et factuel, percutant et engagé...)",
    "constraints": "Contrainte de format (ex: max 200 mots, 3 points clés obligatoires...)"
  },
  "copywriter": {
    "brief": "Brief copywriting spécifique au Copywriter — texte publicitaire, slogan, pitch (2 phrases)",
    "targetAudience": "Public cible du contenu à rédiger",
    "tone": "Ton attendu (ex: engagé et émotionnel, direct et percutant...)",
    "constraints": "Contrainte créative (ex: max 3 phrases, inclure le nom du client, accroche obligatoire...)"
  },
  "designer": {
    "brief": "Brief visuel pour le Designer — livrable graphique attendu (2 phrases précises)",
    "style": "Direction artistique (ex: minimaliste et corporate, coloré et dynamique...)",
    "references": "Références visuelles ou contraintes de charte graphique",
    "format": "Format du livrable (ex: bannière 1200x628px, identité visuelle A4, 3 variantes de logo...)"
  }
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_minigame_prompts', { dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(text.trim()) as MinigamePromptsOutput;
}

// ─── Négociation RC (généré à la volée après soumission DF) ──────────────────

export async function generateNegociationPrompt(input: {
  dayNumber: number;
  client: ClientContext;
  unlockedItems: string[];  // items avec budget ≥ recommandé
  budgetConstraints: Record<string, number>; // 1 = unlocked
  recentNews: string[];
}): Promise<NegociationPrompt> {
  const unlockedStr = input.unlockedItems.length
    ? `Budget disponible (axes débloqués) : ${input.unlockedItems.join(', ')}`
    : 'Budget très contraint — aucun axe ne dispose d\'un budget confortable.';

  const newsCtx = input.recentNews.slice(0, 2).join(' | ') || 'Situation standard.';

  const prompt = `Tu es le Game Master du serious game AGENCE.
Le Responsable Commercial doit négocier avec le client. Le budget a été alloué par le DF.
${unlockedStr}

Client : ${input.client.companyName} (${input.client.sector})
Personnalité client : ${input.client.personality}
Actualité du jour : ${newsCtx}

Génère UNIQUEMENT ce JSON brut (3 échanges de négociation) :
{
  "context": "Contexte de la négociation du jour (2 phrases)",
  "clientPersonality": "Résumé du style de négociation du client (1 phrase)",
  "exchanges": [
    {
      "clientMessage": "Le client exprime une demande ou objection (1-2 phrases directes)",
      "options": [
        { "id": "a1", "label": "Option standard toujours disponible (5-8 mots)" },
        { "id": "a2", "label": "Option premium nécessitant un bon budget média", "requiresBudgetItem": "media" },
        { "id": "a3", "label": "Troisième option de repli (5-8 mots)" }
      ]
    },
    {
      "clientMessage": "Deuxième demande client (1-2 phrases)",
      "options": [
        { "id": "b1", "label": "Réponse sans budget spécifique" },
        { "id": "b2", "label": "Option nécessitant budget prod", "requiresBudgetItem": "prod" }
      ]
    },
    {
      "clientMessage": "Troisième point de négociation (1-2 phrases)",
      "options": [
        { "id": "c1", "label": "Option conservative" },
        { "id": "c2", "label": "Option événementielle", "requiresBudgetItem": "event" },
        { "id": "c3", "label": "Option conseil stratégique", "requiresBudgetItem": "conseil" }
      ]
    }
  ],
  "budgetConstraints": ${JSON.stringify(input.budgetConstraints)}
}

Règles :
- Adapte les options au contexte narratif du client
- Les options avec requiresBudgetItem sont verrouillées si le budget est insuffisant
- Les labels doivent être actionnables et précis (5-10 mots)
- JSON pur, pas de markdown`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_negociation_prompt', { dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(text.trim()) as NegociationPrompt;
}

// ─── Narrative de fin (victoire / défaite) ────────────────────────────────────

export async function generateEndingNarrative(input: {
  phase: 'VICTORY' | 'DEFEAT';
  dayNumber: number;
  finalScore: number;
  clientName: string;
  companyName: string;
  totalCrises: number;
  resolvedCrises: number;
  bestScore: number;
  worstScore: number;
}): Promise<string> {
  const isVictory = input.phase === 'VICTORY';

  const prompt = `Tu es le narrateur omniscient du serious game AGENCE.
La partie vient de se terminer — ${isVictory ? 'VICTOIRE après 30 jours' : `DÉFAITE au Jour ${input.dayNumber}`}.

Client : ${input.companyName} (contact : ${input.clientName})
Score final de satisfaction : ${input.finalScore}%
${isVictory ? `Meilleur score : ${input.bestScore}%` : `Plus bas score atteint : ${input.worstScore}%`}
Crises traversées : ${input.totalCrises} au total, ${input.resolvedCrises} résolues activement

Écris un épilogue narratif de 3 paragraphes (ton dramatique, style roman noir contemporain).
${isVictory
  ? 'Célèbre la résilience de l\'équipe, la relation construite avec le client, l\'agence qui en sort grandie.'
  : 'Décris la désintégration progressive, le moment de rupture, ce qui a basculé. Pas de pathos — factuel et cinglant.'}

Pas de titre, pas de markdown. Juste les 3 paragraphes séparés par des sauts de ligne.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_ending_narrative', { phase: input.phase, dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}
