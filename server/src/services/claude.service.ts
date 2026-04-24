import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ContentType, Role, type CrisisOption } from 'agence-shared';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

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
