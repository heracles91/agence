---
name: Agence Design System
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#ffb4aa'
  on-secondary: '#690003'
  secondary-container: '#c5020b'
  on-secondary-container: '#ffd2cc'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4aa'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#930005'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
  surface-background: '#0A0A0A'
  surface-card: '#141414'
  surface-accent: '#1C1C1E'
  client-status-good: '#34C759'
  client-status-warning: '#FF9500'
  client-status-danger: '#FF3B30'
  border-muted: '#2C2C2E'
  text-dim: '#8E8E93'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  container-max: 1200px
  gutter: 24px
  margin: 48px
  card-padding: 32px
---

AGENCE — DOCUMENT DE CONCEPTION COMPLET
Pour Claude Code — lecture intégrale recommandée avant de commencer

========================================
VUE D'ENSEMBLE
========================================

"Agence" est un jeu de rôle interactif en ligne, accessible uniquement via navigateur desktop, conçu pour un groupe fermé de 9 joueurs (comptes créés manuellement par l'administrateur). Le jeu simule la vie d'une agence créative fictive pendant 30 jours. Une IA (Claude API) génère chaque jour des événements, des actualités, des crises et des missions privées pour chaque joueur. L'objectif collectif est de survivre 30 jours sans perdre le client principal. Si le client part, c'est game over pour tout le monde.

Le ton est dramatique mais avec de l'humour. Penser "Succession meets Kaamelott" : les enjeux sont réels dans l'univers du jeu, mais les situations peuvent être absurdes, les personnages excessifs, les retournements inattendus.

========================================
JOUEURS ET COMPTES
========================================

Il y a 9 joueurs. Les comptes sont créés manuellement par l'administrateur (pas d'inscription publique). Chaque compte est lié à un rôle unique dans l'agence. Un joueur = un rôle = un compte.

Les 9 rôles sont :
1. Directeur Général — voit tout, décide en dernier recours, influence moyenne sur la satisfaction client
2. Directeur Créatif — valide les orientations artistiques, pas d'interaction directe client
3. Directeur Financier — seul à voir l'état exact du budget, pas d'interaction directe client
4. Chef de Projet — reçoit les deadlines et les retards, influence moyenne sur la satisfaction client
5. Responsable Social Media — gère la réputation publique de l'agence, pas d'interaction directe client
6. Copywriter — reçoit les briefs créatifs, pas d'interaction directe client
7. Designer — reçoit les demandes visuelles, pas d'interaction directe client
8. Responsable Commercial — gère la relation client au quotidien, forte influence sur la satisfaction client
9. Consultant Externe (rôle Joker) — rôle narratif, intervient ponctuellement selon les événements de l'IA

Seuls 3 rôles interagissent directement avec le client et font bouger le compteur de satisfaction : le Responsable Commercial (impact fort), le Directeur Général (impact moyen), et le Chef de Projet (impact moyen). Les autres rôles influencent indirectement via des crises internes qui peuvent fuiter vers le client.

========================================
PHASE PRÉ-LANCEMENT (J-7 à J-1)
========================================

7 jours avant le lancement officiel du jeu, les joueurs peuvent se connecter et accéder à une page d'accueil spéciale "pré-lancement".

Sur cette page d'accueil pré-lancement :
- Les 9 rôles sont affichés comme des cartes flottantes (animation flottante légère, CSS).
- Chaque carte affiche le nom du rôle sur le recto.
- Au clic sur une carte, elle se retourne avec une animation CSS 3D flip pour révéler le dos de la carte, qui contient la description du rôle (responsabilités, pouvoirs, tensions avec d'autres rôles).
- Les joueurs peuvent voter pour le rôle qu'ils souhaitent obtenir.
- Sous chaque carte, un indicateur affiche le nombre de joueurs intéressés par ce rôle, avec un message du type : "2 personnes veulent ce rôle — changer ou tenter sa chance ?"
- Un joueur peut changer de vote autant de fois qu'il le souhaite pendant la période pré-lancement.
- À J0 (lancement), l'administrateur attribue les rôles définitivement (manuellement ou avec une logique de tirage au sort automatique si plusieurs joueurs veulent le même rôle).

========================================
LANCEMENT DU JEU (JOUR 1)
========================================

Au lancement officiel, l'IA génère de toutes pièces le client fictif de l'agence. Ce client est généré une seule fois et reste le même pendant les 30 jours.

Le client généré par l'IA comprend :
- Un nom (personne physique ou nom d'entreprise)
- Un secteur d'activité
- Une personnalité forte et détaillée (ex : exigeant, lunatique, imprévisible, généreux mais capricieux, etc.)
- Un brief initial : la campagne que l'agence doit livrer d'ici la fin des 30 jours
- Un niveau de tolérance caché (seuil en dessous duquel il quitte l'agence — inconnu des joueurs)

Le profil complet du client est visible par tous les joueurs sur le dashboard. Sa personnalité doit être suffisamment marquée pour créer des situations dramatiques ou comiques.

========================================
BOUCLE QUOTIDIENNE (JOURS 1 À 30)
========================================

Chaque jour, l'IA génère automatiquement du contenu pour tous les joueurs.

CONTENU COMMUN (visible par tous) :
- 1 actualité générale de l'agence (ex : "Le client a vu une campagne concurrente ce matin et il est furieux", "Une journaliste veut interviewer l'agence pour un article sur la publicité éthique")
- 0 ou 1 événement de crise (pas tous les jours — la fréquence doit varier pour créer de la surprise)

CONTENU PRIVÉ (visible uniquement par le joueur concerné) :
- 1 info privée liée au rôle (ex : pour le Directeur Financier : "La facture du prestataire externe est impayée depuis 15 jours et le prestataire menace d'arrêter", pour le Copywriter : "Le brief que tu as reçu contredit celui du Designer — quelqu'un a merdé en amont")
- 0 ou 1 mission privée discrète à accomplir dans la narration (ex : pour le Responsable Commercial : "Convaincs le DG d'accepter une réunion exceptionnelle avec le client cette semaine sans révéler que le client a menacé de partir")

Les joueurs peuvent partager librement leurs infos privées entre eux dans la vraie vie (messages, appels, discussions), car le jeu n'a pas de chat interne. Le partage ou non-partage d'une info fait partie de la stratégie.

TENSIONS STRUCTURELLES ENTRE RÔLES (l'IA doit en tenir compte) :
- Responsable Commercial vs Directeur Financier : l'un veut signer et satisfaire à tout prix, l'autre veut couper les coûts
- Directeur Créatif vs Chef de Projet : vision artistique vs respect des délais
- Responsable Social Media vs Directeur Général : image publique vs vérité interne
Ces tensions doivent apparaître régulièrement dans les missions privées et les événements.

========================================
ÉVÉNEMENTS DE CRISE
========================================

Les crises sont des événements spéciaux générés par l'IA, plus intenses que les actualités quotidiennes. Elles peuvent arriver n'importe quel jour, de manière imprévisible.

Il existe deux types de crises :

TYPE A — VOTE COLLECTIF :
Tout le monde voit la crise. Une question est posée avec plusieurs options. Les joueurs votent. La décision majoritaire est appliquée et l'IA en tient compte pour la suite de la narration.
Exemple : "Le client demande à rencontrer toute l'équipe en urgence demain. Que fait-on ?" avec les options : "On accepte et on se prépare", "On repousse en invoquant une surcharge", "On envoie seulement le Commercial et le DG".

TYPE B — ÉVÉNEMENT SUBI :
La crise tombe sans vote, tout le monde la subit. L'IA en tient compte pour les prochains jours.
Exemple : "Un ancien employé de l'agence a posté un thread sur les réseaux sociaux critiquant vos méthodes de travail. Le client l'a vu."

L'IA doit varier les deux types et éviter la prévisibilité. Certaines crises doivent être directement liées à des missions privées non accomplies.

========================================
SATISFACTION CLIENT
========================================

Le compteur de satisfaction client est un score entre 0 et 100, visible par tous les joueurs sur le dashboard. Il démarre à 70 au jour 1.

Le score est mis à jour une fois par jour, à heure fixe (ex : 20h), sous forme de bilan journalier. L'IA génère également un court commentaire narratif qui accompagne l'évolution du score (ex : "Le client a apprécié la réactivité de l'équipe mais reste nerveux concernant les délais").

Ce qui fait monter le score :
- Livrer dans les délais
- Bien gérer une crise sans que le client le sache
- Prendre de bonnes décisions lors des votes collectifs
- Accomplir les missions privées liées au client

Ce qui fait descendre le score :
- Rater une deadline
- Un scandale ou une tension interne qui remonte au client
- Un vote collectif mal géré
- Des missions privées non accomplies qui dégénèrent

Le seuil de game over est caché. Les joueurs ne savent pas à partir de quel score le client part. Il peut partir à 30, à 20, ou même à 40 si plusieurs mauvais événements s'accumulent. L'IA décide de manière narrative et cohérente.

Si le score atteint 0 ou si l'IA juge narrativement que le client en a assez, une séquence de game over est déclenchée : le client envoie un message de rupture (généré par l'IA, dans le style de sa personnalité), et le jeu se termine pour tout le monde.

========================================
FIN DE PARTIE
========================================

VICTOIRE : Survivre 30 jours sans perdre le client. Le jour 30, l'IA génère une séquence de fin narrative : la livraison de la campagne, la réaction du client, et un bilan de la partie avec les moments clés.

DÉFAITE : Le client part avant le jour 30. L'IA génère la séquence de rupture et un post-mortem narratif expliquant ce qui a conduit à l'échec.

Dans les deux cas, un récapitulatif des 30 jours est affiché : les crises traversées, les décisions prises, les scores de satisfaction jour par jour.

========================================
INTERFACE ET DESIGN
========================================

RESTRICTION MOBILE ET TABLETTE :
Les actions du jeu sont interdites sur mobile et tablette. La détection se fait via user-agent et/ou taille d'écran (breakpoint à définir, recommandé : moins de 1024px de large = mode lecture seule).
Sur mobile/tablette, les joueurs peuvent UNIQUEMENT consulter :
- Le score de satisfaction client du jour
- Les KPIs et indicateurs généraux
- L'historique des événements passés
Toutes les actions interactives (vote, lecture des missions privées, accès au dashboard complet) sont désactivées avec un message explicatif du type : "Pour jouer, connecte-toi depuis un ordinateur. Sur mobile, tu peux consulter les scores et l'actualité."
L'objectif est d'encourager une expérience "au bureau", sur ordinateur, pour renforcer l'immersion dans le rôle.

STRUCTURE DES PAGES :
1. Page d'accueil pré-lancement (J-7 à J-1) : cartes flottantes avec flip au clic, vote pour les rôles, compteur d'intérêt par rôle
2. Dashboard principal (J1 à J30) : fil d'actualités commun, boîte de missions privées, compteur de satisfaction client, bilan du jour
3. Profil du client : page dédiée avec le profil complet généré par l'IA au jour 1
4. Historique : tous les événements passés, les votes et leurs résultats, les scores jour par jour
5. Page de game over ou de victoire : séquence narrative finale générée par l'IA

========================================
ARCHITECTURE TECHNIQUE RECOMMANDÉE
========================================

FRONTEND : Application web responsive avec restriction d'accès sur mobile/tablette. Framework au choix (React recommandé). Animations CSS pour les cartes flottantes et le flip.

BACKEND : Serveur Node.js ou équivalent. Base de données pour stocker les comptes joueurs, les événements générés, les votes, l'historique des scores, et le profil du client.

AUTHENTIFICATION : Système de comptes simple avec login/mot de passe. Pas d'inscription publique — les comptes sont créés par l'administrateur. Un compte admin séparé pour gérer les joueurs et déclencher le lancement.

IA (CLAUDE API) :
- Modèle : claude-sonnet-4-20250514
- Utilisé pour : générer le profil du client au jour 1, générer les actualités quotidiennes, générer les infos privées par rôle, générer les missions privées, générer les crises, calculer et commenter l'évolution du score de satisfaction, générer les séquences de fin de partie
- L'IA doit recevoir en contexte : le profil du client, l'historique des événements des jours précédents, le score de satisfaction actuel, les rôles des joueurs, et les missions privées en cours
- Le prompt système de l'IA doit inclure : le ton (dramatique + humour), les tensions structurelles entre rôles, la personnalité du client, et les règles du jeu

GÉNÉRATION QUOTIDIENNE : Un job automatique (cron) se déclenche chaque jour à heure fixe pour appeler l'API Claude et générer le contenu du jour. Le contenu est stocké en base et affiché aux joueurs quand ils se connectent.

VOTES : Système de vote en temps réel ou asynchrone. Deadline de vote à définir (ex : 24h après l'apparition d'une crise). Résultat visible par tous après clôture.

========================================
NOTES IMPORTANTES POUR LE DÉVELOPPEMENT
========================================

- Le jeu est conçu pour un groupe de 9 amis, pas pour le grand public. La scalabilité n'est pas une priorité.
- La qualité narrative de l'IA est le facteur clé du succès. Les prompts doivent être soignés, contextuels, et tenir compte de l'historique.
- Le secret est fondamental : les infos privées ne doivent JAMAIS être accessibles par d'autres joueurs côté serveur.
- Le seuil de game over ne doit jamais apparaître dans le code frontend ni être devinable par inspection du réseau.
- La page pré-lancement et la page principale sont deux états distincts du jeu, contrôlés par l'administrateur.
- Prévoir un panneau admin minimal : créer/gérer les comptes joueurs, attribuer les rôles, déclencher le lancement du jeu, visualiser les logs IA.
