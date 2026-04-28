import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import {
  ContentType, Role, type CrisisOption,
  type ArbitragePrompt, type BudgetPrompt, type PlanningPrompt,
  type ModerationPrompt, type RedactionPrompt, type UploadVisuelPrompt, type NegociationPrompt,
} from 'agence-shared';
import prisma from '../prisma';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

// Supprime les balises markdown ```json ... ``` que Claude ajoute parfois malgré les consignes
function stripMarkdownJson(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

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
  missedMissions?: string[];
}

export interface GeneratedPrivateContent {
  type: ContentType;
  content: string;
}

export interface DailyContentOutput {
  news: string[];
  privateContent: Partial<Record<Role, GeneratedPrivateContent>>;
}

// Instruction de ton commune à tous les appels narratifs
const TONE = `TON — RÈGLE ABSOLUE :
Le jeu s'appelle AGENCE et son univers est "Succession rencontre Kaamelott".
Les enjeux sont réels et dramatiques dans l'univers du jeu, mais les personnages peuvent être excessifs,
les situations absurdes, les demandes client grotesques, les conflits internes comiquement disproportionnés.
Évite absolument le registre corporate neutre et lisse. Chaque phrase doit avoir du relief :
soit la gravité d'une série de prestige, soit l'absurdité d'une comédie française, souvent les deux en même temps.
Le client peut être à la fois terrifiant et ridicule. Les collègues peuvent être compétents ET catastrophiques.
Une réunion peut être à la fois existentielle et portant sur la couleur d'un bouton.`;

const ROLE_DESCRIPTIONS_FR: Record<string, string> = {
  directeur_general: "Directeur Général — arbitre les conflits internes, porte la relation client au plus haut niveau",
  directeur_creatif: "Directeur Créatif — fixe les orientations artistiques, valide les productions du Designer, filtre créatif",
  directeur_financier: "Directeur Financier — seul à connaître l'état exact du budget, ses choix débloquent les options du Commercial",
  chef_de_projet: "Chef de Projet — gère les délais, séquence les tâches, coordonne entre équipes et client",
  social_media: "Responsable Social Media — gère la réputation publique de l'agence",
  designer: "Designer — produit les créations visuelles soumises à validation du DC avant transmission",
  commercial: "Responsable Commercial — gère la relation client au quotidien, négocie selon le budget alloué",
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

  const prompt = `${TONE}

Tu es l'observateur omniscient du jeu AGENCE.
Génère UN commentaire interne (1 phrase, max 120 caractères) sur la satisfaction client du Jour ${input.dayNumber}.

Client : ${input.clientName}
Score : ${input.previousScore}% → ${input.newScore}% (${input.delta >= 0 ? '+' : ''}${input.delta}%)
Tendance : ${trend}
Missions accomplies : ${input.completedMissions} | Manquées : ${input.missedMissions}
${crisisCtx}

La phrase doit être cinglante, mémorable, jamais générique. Elle peut être dramatique, ironique, ou les deux.
Elle parle du client, de l'équipe, ou de la situation — jamais du score lui-même en termes abstraits.
Réponds UNIQUEMENT avec la phrase, sans guillemets.`;

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

  const prompt = `${TONE}

Tu es le narrateur du jeu AGENCE. Une crise vient de se résoudre — ou pas vraiment.
Écris la conséquence en 2-3 phrases.

Crise : "${input.title}"
Contexte : ${input.content}
${input.type === 'vote_collectif' ? `L'équipe a voté : "${winningLabel}"` : 'Personne n\'a pu voter — la crise s\'est imposée.'}

La conséquence doit être narrative, ancrée dans le réel du jeu, avec du relief.
Elle peut être un soulagement précaire, un désastre avec une pointe d'ironie, ou les deux.
Les personnages réagissent de façon excessive et humaine. Rien ne se résout proprement.
Réponds UNIQUEMENT avec les 2-3 phrases, rien d'autre.`;

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

  const missedMissionsContext = input.missedMissions?.length
    ? `\nMISSIONS RATÉES HIER (Jour ${input.dayNumber - 1}) — à intégrer dans la narration d'aujourd'hui :
Ces missions privées n'ont pas été accomplies. Leurs conséquences doivent se sentir :
- Au moins une doit transparaître dans les actualités communes (sans nommer le coupable directement)
- Les missions privées du jour peuvent porter les traces de ces échecs
- Si une mission ratée touchait le client, c'est une amorce de crise probable
${input.missedMissions.map((m) => `→ ${m.slice(0, 180)}`).join('\n')}`
    : '';

  const prompt = `${TONE}

Tu es le narrateur du jeu AGENCE — Jour ${input.dayNumber}/30.
L'agence a 7 personnes, un seul client, et trop peu de temps pour tout gérer correctement.

CLIENT :
- ${input.client.companyName} (${input.client.sector}) — contact : ${input.client.name}
- Personnalité : ${input.client.personality}
- Brief : "${input.client.initialBrief}"
- ${scoreContext}

${newsContext}${crisesContext}${missedMissionsContext}

RÔLES :
${Object.entries(ROLE_DESCRIPTIONS_FR).map(([role, desc]) => `- ${role} : ${desc}`).join('\n')}

TENSIONS STRUCTURELLES à exploiter (varie selon les jours) :
- Commercial vs Directeur Financier : l'un veut tout promettre, l'autre veut tout couper
- Directeur Créatif vs Chef de Projet : vision artistique vs délais réels
- Social Media vs Directeur Général : image publique soignée vs vérité interne chaotique

Génère exactement ce JSON brut (pas de markdown) :
{
  "news": [
    "Actualité commune — événement narratif avec du relief, ancré dans la réalité du client et de l'agence (2-3 phrases). Peut être dramatique, absurde, ou les deux. Évite les formules corporate creuses.",
    "Deuxième actualité (optionnelle — string vide si une seule suffit)"
  ],
  "privateContent": {
    "directeur_general": { "type": "mission", "content": "Mission DG : concrète, à forts enjeux, avec une tension interne ou client. Peut impliquer un arbitrage difficile ou une information gênante à gérer. 3-4 phrases avec du relief narratif." },
    "directeur_creatif": { "type": "mission", "content": "Mission DC : brief de direction artistique à produire, avec une contrainte créative tendue ou absurde liée au contexte du jour. 3-4 phrases." },
    "directeur_financier": { "type": "info", "content": "Info confidentielle DF : une vérité budgétaire inconfortable que lui seul connaît. Peut être alarmante, embarrassante ou les deux. 2-3 phrases." },
    "chef_de_projet": { "type": "mission", "content": "Mission CDP : un problème de planning ou de coordination à gérer, avec une pression réelle. Quelque chose qui coincera si rien n'est fait. 3-4 phrases." },
    "social_media": { "type": "mission", "content": "Mission SM : situation sur les réseaux ou dans l'image publique de l'agence qui demande une décision rapide. Peut venir de l'extérieur ou d'un collègue imprudent. 3-4 phrases." },
    "designer": { "type": "mission", "content": "Mission Designer : brief visuel à produire ce jour, avec des contraintes ou une situation créative tendue. Le DC doit valider avant transmission. 3-4 phrases." },
    "commercial": { "type": "mission", "content": "Mission Commercial : situation relationnelle avec le client à gérer. Une demande, une tension, ou une information à manier avec soin. Fort impact potentiel sur la satisfaction. 3-4 phrases." }
  }
}

Règles absolues :
- Les actualités communes sont visibles par tous — elles doivent intriguer et créer des questions sans tout révéler
- Chaque contenu privé est UNIQUEMENT pour ce joueur — il peut contredire ou compléter les actualités communes
- Les tensions entre rôles doivent apparaître dans les missions (ex: la mission DF peut contredire la mission Commercial)
- Adapte la gravité au score actuel : ${lastScore ? `${lastScore.score}% (${lastScore.delta >= 0 ? '+' : ''}${lastScore.delta}% hier)` : 'neutre — Jour 1'}
- Répondre UNIQUEMENT avec le JSON, aucun texte avant ou après`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_daily_content', { dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const parsed = JSON.parse(stripMarkdownJson(text)) as {
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
  directeur_creatif: RedactionPrompt;
  designer: UploadVisuelPrompt;
}

export async function generateMinigamePrompts(
  input: DailyContentInput & { resolvedCrises?: CrisisContext[] }
): Promise<MinigamePromptsOutput> {
  const lastScore = input.recentScores[input.recentScores.length - 1];
  const scoreCtx = lastScore ? `Score : ${lastScore.score}%` : 'Jour 1';
  const newsCtx = input.recentNews.slice(0, 2).join(' | ') || 'Démarrage de la mission.';

  const prompt = `${TONE}

Tu es le Game Master du jeu AGENCE — Jour ${input.dayNumber}/30.
Client : ${input.client.companyName} (${input.client.sector}). ${scoreCtx}. Contexte : ${newsCtx}.

Génère 6 mini-jeux ancrés dans la réalité du jour — les situations doivent avoir du relief narratif,
pas être des exercices génériques. Chaque mini-jeu reflète la tension du moment.

CATÉGORIES :
- Simples (auto-validés) : DG (arbitrage), DF (budget), CDP (planning), SM (modération), DC (brief direction créative)
- Validation croisée : Designer → validé par le DC avant comptabilisation

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
  "directeur_creatif": {
    "brief": "Demande de brief de direction artistique pour le DC — quelle orientation créative fixer pour ce projet ce jour (2 phrases précises)",
    "targetAudience": "Destinataire interne du brief (ex: équipe créative, direction, client)",
    "tone": "Registre attendu pour la direction artistique (ex: exigeant et précis, inspirant et ambitieux, minimaliste et épuré...)",
    "constraints": "Contrainte formelle (ex: 3 axes créatifs max, cohérence avec la charte existante, 1 page, inclure références visuelles...)"
  },
  "designer": {
    "brief": "Brief visuel pour le Designer — livrable graphique attendu (2 phrases précises), sera validé par le DC",
    "style": "Direction artistique (ex: minimaliste et corporate, coloré et dynamique...)",
    "references": "Références visuelles ou contraintes de charte graphique",
    "format": "Format du livrable (ex: bannière 1200x628px, identité visuelle A4, 3 variantes de logo...)"
  }
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_minigame_prompts', { dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(stripMarkdownJson(text)) as MinigamePromptsOutput;
}

// ─── Génération du profil client fictif ──────────────────────────────────────

export interface GeneratedClientProfile {
  name: string;
  companyName: string;
  sector: string;
  personality: string;
  initialBrief: string;
  toleranceThreshold: number;
}

export async function generateClientProfile(): Promise<GeneratedClientProfile> {
  const prompt = `${TONE}

Tu es le Game Master du jeu AGENCE. Génère LE client de cette session — celui qui va tyranniser l'agence pendant 30 jours.

Il doit être mémorable. Pas un client générique "difficile" — un personnage à part entière.
Il peut être : un perfectionniste qui change d'avis toutes les 48h, un visionnnaire qui ne comprend pas ses propres idées,
un patron old-school qui veut "du moderne mais comme avant", un fondateur traumatisé par une agence précédente,
quelqu'un de charmant en réunion et ingérable par mail, etc.

Critères :
- Secteur varié et inattendu (luxe kitsch, agroalimentaire prétentieux, fintech qui se prend pour Apple, sport de niche, institution culturelle en crise...)
- Personnalité excessive et mémorable — pas juste "exigeant". Il doit avoir des tics, des obsessions, des contradictions
- Brief avec de vraies contraintes, un vrai enjeu, et au moins une exigence absurde ou contradictoire
- Prénom et nom français ou européens réalistes
- toleranceThreshold entre 25 et 55 (seuil en % — plus il est bas, plus il supporte le chaos)

Génère UNIQUEMENT ce JSON brut (pas de markdown) :
{
  "name": "Prénom Nom du contact client",
  "companyName": "Nom de l'entreprise (peut être pompeux, absurde ou les deux)",
  "sector": "Secteur précis et savoureux (ex: Eau minérale de luxe, Fromages AOP nouvelle génération, SaaS RH qui se rêve en startup...)",
  "personality": "3-4 phrases concrètes et vivantes — comment il se comporte en réunion, ce qui le met hors de lui, ses contradictions, ses petites phrases caractéristiques",
  "initialBrief": "3-4 phrases — objectif de la campagne avec au moins une exigence tendue ou incohérente, cibles, budget indicatif, deadline serrée",
  "toleranceThreshold": 35
}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_client_profile', { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(stripMarkdownJson(text)) as GeneratedClientProfile;
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

  const prompt = `${TONE}

Tu es le Game Master du jeu AGENCE.
Le Responsable Commercial est en négociation avec le client. Le budget a été alloué par le DF — avec les contraintes que ça implique.
${unlockedStr}

Client : ${input.client.companyName} (${input.client.sector})
Personnalité client : ${input.client.personality}
Contexte du jour : ${newsCtx}

Le client parle DIRECTEMENT — ses messages doivent avoir la saveur de sa personnalité.
Pas de formules génériques. Les demandes peuvent être déraisonnables, mal formulées, ou parfaitement raisonnables
mais posées au pire moment.

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
  return JSON.parse(stripMarkdownJson(text)) as NegociationPrompt;
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

  const prompt = `${TONE}

Tu es le narrateur omniscient du jeu AGENCE.
La partie se termine — ${isVictory ? 'VICTOIRE. Ils ont tenu 30 jours.' : `DÉFAITE. Ça s'est arrêté au Jour ${input.dayNumber}.`}

Client : ${input.companyName} (${input.clientName})
Score final : ${input.finalScore}%
${isVictory ? `Meilleur score atteint : ${input.bestScore}%` : `Score plancher : ${input.worstScore}%`}
Crises : ${input.totalCrises} au total, ${input.resolvedCrises} affrontées activement

Écris un épilogue de 3 paragraphes.
${isVictory
  ? `VICTOIRE — mais une victoire à l'arraché, fatiguée, avec des égratignures. L'équipe a survécu mais pas indemne.
Le client est satisfait — à sa façon, avec ses réserves et ses petites phrases.
Le ton : soulagement mêlé d'ironie, fierté un peu absurde d'avoir tenu, humour noir sur ce que ça a coûté.`
  : `DÉFAITE — le client est parti. Décris comment c'est arrivé : la dégradation progressive, le moment exact où ça a basculé.
Ne pas édulcorer. Le client a envoyé un message de rupture — cite-le ou évoque-le dans le style de sa personnalité.
Le ton : cinglant, avec une précision presque cruelle sur les petites choses qui ont tout fait déraper.`}

Pas de titre, pas de markdown. 3 paragraphes séparés par des sauts de ligne. Du style, pas du compte-rendu.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_ending_narrative', { phase: input.phase, dayNumber: input.dayNumber, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

// ─── Message de rupture du client (défaite uniquement) ────────────────────────

export async function generateClientBreakupMessage(input: {
  clientName: string;
  companyName: string;
  personality: string;
  dayNumber: number;
  finalScore: number;
}): Promise<string> {
  const prompt = `${TONE}

Tu joues le rôle de ${input.clientName}, dirigeant de ${input.companyName}.
Sa personnalité : ${input.personality}

Il vient de décider de rompre avec l'agence au Jour ${input.dayNumber}.
Score de satisfaction final : ${input.finalScore}%.

Écris le message de rupture qu'il envoie à l'agence. RÈGLES ABSOLUES :
- À la PREMIÈRE PERSONNE, dans SON style exact — ses mots, ses tics, ses formulations
- 3 à 5 phrases. Pas une de plus. Pas de "Madame, Monsieur"
- Commence directement par ce qu'il a à dire
- Selon sa personnalité : froid et juridique, émotionnel et excessif, poli mais cinglant, ou les trois à la fois
- Ce message doit être MÉMORABLE — pas un boilerplate de rupture contractuelle
- Pas de markdown. Juste le message brut.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  logAiCall('claude_breakup_message', { clientName: input.clientName, dayNumber: input.dayNumber, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens });
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
}
