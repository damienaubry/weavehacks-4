# MASTER BRIEF — Pivot Brigade → "Grounded Recovery Copilot" (WeaveHacks 4)

> **Comment utiliser ce fichier.** Colle ce brief en entrée d'un agent orchestrateur dans Cursor.
> Il définit d'abord un **socle de contrats** (Phase 0, séquentielle), puis **6 workstreams parallèles**
> (Phase 1) qui ne se marchent pas dessus, puis une **intégration + vérification** (Phase 2).
> Lance **un agent Cursor par workstream**, idéalement chacun sur sa propre branche / git worktree,
> et merge dans l'ordre indiqué. **Ne démarre AUCUN workstream parallèle avant que la Phase 0 soit
> mergée** — tout le reste dépend des contrats qu'elle pose.

---

## 0. MISSION (lis ça d'abord, ne la perds jamais de vue)

On NE jette PAS Brigade. On **re-pointe la machine d'ancrage déjà construite** (`packages/agents/src/grounding.ts`,
ses guards de parité compute, la boucle Content+Critic) sur une **tâche plus nette et plus lisible pour un jury**,
et on transforme la preuve **one-shot** actuelle en un **taux sur ~50 cas** + une **3ᵉ ligne d'auto-amélioration**.

**Le produit** : un copilote multi-agent qui transforme **un avis client réel** en un **paquet de récupération
exploitable** : (1) triage de l'incident, (2) **réponse publique ancrée** dans des sources autorisées, (3) **ticket
d'action interne** structuré. Ce n'est pas du community management : c'est de la **génération ouverte sous contrainte
de vérité**, le terrain exact où le multi-agent gagne réellement (génération → ancrage → critique indépendant).

**LE CHIFFRE JUGÉ — `GRPR` (Grounded Recovery Pass Rate)**, binaire et conjonctif, mesuré **mécaniquement** :

```
GRPR = moyenne sur N cas de [ triage_correct
                              ∧ toutes les affirmations atomiques de la réponse publique sont SOUTENUES
                              ∧ aucune violation de politique / disclosure manquant
                              ∧ ticket d'action valide (champs requis présents) ]
```

Trois lignes de leaderboard Weave, **même modèle + mêmes outils partout, seule l'orchestration change** :
`solo` (un agent fort, auto-révision, budget compute apparié) **<** `team` (4 rôles, Verifier indépendant qui bloque)
**<** `team+memory` (l'équipe + mémoire de failure-cards entre runs).

**La phrase finale visée à l'écran (en démo) :**
> « Sur **N** cas dérivés d'avis **réels** de Le Kyoto, tenus hors-réglage, à **budget compute apparié**, notre équipe
> multi-agents obtient un **GRPR** supérieur au meilleur solo, puis **progresse encore** après mémoire automatique des
> critiques — chaque affirmation tracée jusqu'à la requête qui la prouve dans Weave. »

---

## 1. CONTRAINTES DURES (non négociables — tout workstream qui les viole est rejeté)

1. **Le spine reste domain-agnostic et INTACT.** Ne touche pas à la logique de `packages/orchestration`,
   `packages/observability`, `packages/runtime` autrement que de façon additive. **Aucun nom de restaurant** (menu, avis,
   plat, ticket) ne doit fuiter dans ces 3 packages. Le domaine vit dans `packages/agents | truth | seed | memory`.
2. **Mécanique, pas juge LLM, pour le HEADLINE.** Le sous-score "affirmations soutenues" RÉUTILISE le checker
   mécanique existant (`checkGrounding` dans `packages/agents/src/grounding.ts`). Triage = match de label déterministe.
   Ticket valide = check de schéma déterministe. Politique/disclosure = règles déterministes ; un **juge LLM est toléré
   UNIQUEMENT pour "over-promise"**, étroit et isolé, JAMAIS pour le score d'ancrage. Pas de "vibe score".
3. **Parité compute.** `solo` reçoit un budget tokens/appels **≥** celui de `team` (auto-retries). Réutilise le pattern
   `Budget` + `COMPUTE-PARITY GUARD` déjà présent dans `grounding.ts`. Si le solo atteint le même GRPR à budget égal,
   on l'affiche honnêtement — pas de gap truqué.
4. **Garde l'honnêteté des guards existants.** `BUILD GUARD` (0 claim parseable → stop), `HONESTY GUARD` (solo déjà
   100 % ancré → stop), `COMPUTE-PARITY GUARD`. Reporte le vrai résultat même s'il est modeste.
5. **Jamais une donnée fabriquée passée pour vérité.** Le dataset dérive d'**avis réels** ; tout cas synthétique est
   **clairement marqué** comme tel. `packages/truth` reste CANON (menu, prix, horaires, politique). Un output d'agent
   n'est jamais traité comme vérité.
6. **HITL sur tout ce qui est public/argent.** La réponse publique et le ticket ne s'auto-publient jamais : approbation
   humaine dans le front. Le Writer est `sensitive: true`.
7. **Le scoreboard reste vert en permanence.** `pnpm typecheck` passe après chaque workstream. `pnpm compare` et
   `pnpm grounding` (legacy) restent runnables. La nouvelle commande `pnpm recovery` devient le scoreboard principal.
8. **4 rôles LLM MAX** (Curator / Analyst / Writer / Verifier). Pas de rôle décoratif :
   `assertEveryRoleHasConflict()` doit passer — chaque rôle a un conflit/dépendance réel.
9. **Discipline hackathon (2 pers., temps limité).** Entre "robuste" et "démontrable", choisis démontrable. Pas d'auth,
   pas de multi-tenant, pas de CI/CD élaboré, pas d'intégration live. Tout passe par le seed curé.
10. **Friday-prep n'est pas supprimé** : on l'archive en chemin **legacy** (garder `pnpm prep`, `pnpm grounding`,
    `/brigade` fonctionnels) pour ne pas jeter l'historique git ni casser le typecheck. Le **produit principal** devient
    review-recovery.

---

## 2. ARCHITECTURE CIBLE (ce qu'on construit)

### Les 4 rôles (hiérarchie courte, conflits réels)

| Rôle | id | authority | sensitive | Fait | Conflit/dépendance REQUIS |
|---|---|---|---|---|---|
| **Evidence Curator** | `curator` | 55 | non | Récupère UNIQUEMENT les sources autorisées : texte de l'avis, fenêtre/agrégat POS, faits menu, **politique** (`truth`). Assemble le contexte brut. | Fournit le ledger que Analyst/Writer DOIVENT utiliser ; refuse toute source non autorisée. |
| **Operational Analyst** | `analyst` | 58 | non | Infère le **type d'incident** (triage) + construit un **evidence ledger** en **faits atomiques cités**. | Pousse la spécificité contre la fluidité du Writer ; conflit avec Curator sur ce qui est réellement disponible. |
| **Writer** | `writer` | 30 | **oui** | Rédige la **réponse publique** + le **ticket interne** **à partir du ledger SEULEMENT**. | Veut shipper/être fluide ; le Verifier le bloque tant que ce n'est pas ancré. |
| **Adversarial Verifier** | `verifier` | 90 | non | 3 challenges : « qu'est-ce qui n'est pas soutenu ? », « qu'est-ce qui viole la politique ? », « qu'est-ce qui sur-promet ? ». **Bloque** jusqu'à ancrage. | Conflit direct avec Writer (= reprend la machinerie du Critic existant). |

> Le `verifier` reprend exactement le rôle/authority du **Critic** déjà présent dans `roles.ts` (authority 90, bloque).
> On ne réinvente pas la mécanique de blocage : on réutilise l'authority + `resolveConflict` de
> `packages/orchestration` et la boucle "produce → critic feedback → ONE rewrite" déjà écrite dans `grounding.ts`.

### SOLO vs TEAM vs TEAM+MEMORY (le contrôle expérimental)

- **`solo`** : UN seul agent (même modèle de base, mêmes outils) qui curate+analyse+rédige+**s'auto-révise** N fois.
  Pas de Verifier indépendant. C'est le **baseline solo FORT** que le memo exige (auto-révision + mêmes sources +
  budget apparié). Réutilise `selfRetry`.
- **`team`** : les 4 rôles, le Verifier **indépendant** bloque jusqu'à ancrage (≤1 rewrite, parité compute).
- **`team+memory`** : `team` + mémoire inter-runs. Avant de traiter un cas, Curator/Writer **récupèrent les failure-cards**
  pertinentes (similarité vectorielle Redis + filtre par tags) ; après un échec, le Verifier **écrit une failure-card**
  (`failure_tags`, `missing_evidence`, `bad_pattern`, `patch_exemplar`). **Éval chronologique** : les premiers cas
  alimentent la mémoire, les suivants la testent → pas de leakage.

### Réutilisation (NE PAS réécrire)

- `checkGrounding()` / `Claim` / `ClaimCheck` / `Budget` / parity guards → `packages/agents/src/grounding.ts`.
- `runToolAgent` (boucle tool-calling model-agnostic) → `packages/runtime`.
- `traced()` / `initWeave()` / `compareSoloVsTeam` → `packages/observability`.
- `runSolo`/`runTeam`/`resolveConflict`/authority → `packages/orchestration`.
- `REVIEW_TOOLS` / `HISTORY_TOOLS` / `MENU_TOOLS` → `packages/agents/src/tools/*`.
- Redis client (`createRedis`) → `packages/shared`. Compétences Redis vector search → `.agents/skills/redis-*`.

---

## 3. PHASE 0 — SOCLE DE CONTRATS (SÉQUENTIEL, UN SEUL AGENT, à merger AVANT tout le reste)

Cette phase pose les **types + interfaces partagés** pour que les 6 workstreams parallèles ne se collisionnent pas.
Livrables (et RIEN d'autre — pas d'implémentation métier ici) :

1. **Schéma de cas** `packages/seed/src/recovery-types.ts` :
   ```ts
   export interface RecoveryCase {
     id: string;
     source: "real" | "synthetic";          // "real" = dérivé d'un avis réel ; sinon marqué synthetic
     review: { stars: number; text: string; lang?: string; date?: string; mentions?: string[] };
     context?: { posWindow?: unknown; weather?: unknown; event?: unknown };  // agrégats autorisés
     gold: {
       incidentType: IncidentType;          // label de triage attendu
       requiredEvidenceTags: string[];      // ce que le ledger DOIT couvrir
       requiredDisclosures: string[];       // ex. "allergen_disclaimer", "no_refund_promise"
       forbiddenClaims?: string[];          // ex. promesses interdites
     };
   }
   export type IncidentType =
     | "food_quality" | "delivery_late" | "wrong_or_missing_item" | "allergen_concern"
     | "hygiene" | "service_staff" | "pricing_billing" | "praise_no_issue" | "other";
   ```
2. **Contrat du scorer** `packages/agents/src/recovery-contract.ts` :
   ```ts
   export interface RecoveryOutput {       // ce que produit le pipeline (solo|team|team+memory) pour un cas
     incidentType: IncidentType;
     publicReply: string;                  // texte à modérer/publier (HITL)
     ledger: { fact: string; statedValue: number | string; citedTool?: string | null }[];
     ticket: { severity: "low" | "med" | "high"; owner: string; action: string; dueHint?: string };
   }
   export interface CaseScore {            // GRPR par cas, conjonctif
     triageCorrect: boolean;
     allClaimsGrounded: boolean;           // via checkGrounding (mécanique)
     policyOk: boolean;                    // règles déterministes (+ juge "over-promise" étroit, isolé)
     ticketValid: boolean;                 // check de schéma
     pass: boolean;                        // = ET des 4
     checks: import("./grounding").ClaimCheck[];
   }
   export interface RecoveryRunResult { grpr: number; perCase: CaseScore[]; budget: import("./grounding").Budget; }
   ```
3. **Manifest des rôles** : étends `packages/agents/src/roles.ts` avec `curator`, `analyst`, `writer`, `verifier`
   (table §2), garde `assertEveryRoleHasConflict()` vert. Marque les anciens rôles Friday-prep `tier: "legacy"` plutôt
   que de les supprimer.
4. **Squelette du package mémoire** `packages/memory/` (rebuild propre sur `@weavehacks/shared` Redis) : exporte des
   **signatures** seulement (`writeFailureCard`, `retrieveFailureCards`, types `FailureCard`), implémentation = WS-D.
5. **Endpoint + commande** : déclare (stub) `apps/api/src/recovery.ts` (export `runRecovery()`), ajoute le script
   `"recovery": "tsx src/recovery.ts"` dans `apps/api/package.json`, et la route `GET /recovery` dans `apps/api/src/index.ts`
   renvoyant un `RecoveryReport` typé (forme figée ci-dessous). Implémentation réelle = WS-C.
6. **Forme de rapport partagée** (le front et l'API s'accordent dessus) `packages/shared/src/types.ts` :
   ```ts
   export interface RecoveryReport {
     dataset: { n: number; realCount: number; syntheticCount: number };
     rows: { variant: "solo" | "team" | "team+memory"; grpr: number; budgetTokens: number; budgetCalls: number }[];
     sampleCase: { id: string; review: string;
                   solo: { reply: string; failReasons: string[] };
                   team: { reply: string; pass: boolean };
                   memoryReuse?: { failureCardId: string; tag: string } };
   }
   ```

> **Sortie de la Phase 0** : `pnpm typecheck` vert avec des stubs qui throw `NotImplemented`. Merge. Puis fan-out.

---

## 4. PHASE 1 — WORKSTREAMS PARALLÈLES (un agent Cursor chacun, fichiers disjoints)

> Règle anti-collision : **chaque workstream ne modifie QUE ses fichiers listés.** Les frontières sont les contrats
> de la Phase 0. Si un WS a besoin d'un autre, il code contre l'**interface**, pas contre l'implémentation.

### WS-A — Données réelles & Vérité  (owner: `packages/seed`, `packages/truth`)
- Génère le **dataset de ~50 cas (extensible)** `packages/seed/data/recovery-cases.json` au format `RecoveryCase`,
  **dérivé des vrais avis Google de Le Kyoto** (Damien fournit/valide le corpus brut). Pour chaque cas : triage gold,
  `requiredEvidenceTags`, `requiredDisclosures`, `forbiddenClaims`. **Marque `source:"real"` vs `"synthetic"`.**
  Tu peux **élargir le dataset à partir des vrais avis** (paraphrases/variantes clairement `synthetic`) pour atteindre
  un N statistiquement lisible, MAIS garde une majorité `real` et ne fabrique jamais un fait passé pour canon.
- Étends `packages/truth` avec la **politique** : règles de remboursement/geste commercial, disclaimers allergènes
  obligatoires, horaires, faits menu stables — la base contre laquelle `policyOk` est vérifié.
- Étends `packages/seed/src/reviews.ts` (aujourd'hui 5 reviews) vers le corpus réel élargi, même shape `Review`.
- **Livrable de validation** : un script `pnpm --filter @weavehacks/seed validate-cases` qui vérifie le schéma +
  imprime la répartition `real/synthetic` et par `incidentType`. Prépare un format que Damien relit/approuve vite.

### WS-B — Agents & Outils  (owner: `packages/agents/src` hors `grounding.ts` headline-checker)
- Implémente les 4 producteurs sur `runToolAgent` dans un nouveau `packages/agents/src/recovery-stations.ts` :
  `curator`, `analyst`, `writer`, `verifier` (prompts + tools de la table §2). Réutilise `REVIEW_TOOLS`,
  `HISTORY_TOOLS`, `MENU_TOOLS` et ajoute un `policy_lookup` tool (lit `truth`) dans `packages/agents/src/tools/policy.ts`.
- Implémente le **pipeline** `runRecoveryCase(case, variant, models)` : solo (auto-révision) | team (curator→analyst→
  writer→verifier, blocage ≤1 rewrite) | team+memory (team + hooks mémoire de WS-D via l'interface). Émet `RecoveryOutput`.
- Réutilise la boucle "produce → mechanical critic feedback → ONE rewrite" et le `Budget`/parité de `grounding.ts` :
  **ne duplique pas**, importe.
- **Ne modifie pas** la logique de `checkGrounding` (c'est le headline-checker, propriété de WS-C pour l'extension).

### WS-C — Harness d'éval & GRPR  (owner: `apps/api/src/recovery.ts`, `packages/agents/src/recovery-score.ts`)
- Implémente `scoreCase(output, case, toolCalls): CaseScore` :
  - `triageCorrect` = `output.incidentType === case.gold.incidentType` (déterministe).
  - `allClaimsGrounded` = `checkGrounding(output.ledger as Claim[], toolCalls).ungroundedCount === 0` (mécanique, réutilisé).
  - `policyOk` = règles déterministes (disclosures requis présents, aucun `forbiddenClaim`) **+** juge "over-promise"
    étroit isolé (toléré, ne touche pas l'ancrage).
  - `ticketValid` = check de schéma (`severity ∈ {...}`, `owner`/`action` non vides).
  - `pass` = ET des 4.
- Implémente `runRecovery()` : boucle sur le dataset pour `solo|team|team+memory`, **parité compute** (réutilise les
  guards), trace chaque case + chaque check en **ops Weave** (`traced`), renvoie un `RecoveryReport`. Imprime le
  leaderboard 3 lignes en CLI (`pnpm recovery`) et sert `GET /recovery`.
- **Garde `pnpm grounding` et `pnpm compare` (legacy) verts.** Ajoute, ne casse pas.

### WS-D — Mémoire inter-runs (Layer 2)  (owner: `packages/memory`)
- Implémente `writeFailureCard()` / `retrieveFailureCards()` sur `@weavehacks/shared` Redis (vector search + filtre par
  tags ; voir `.agents/skills/redis-vector-search`). `FailureCard = {id, caseId, failure_tags[], missing_evidence,
  bad_pattern, patch_exemplar, embedding}`.
- Fournis les **hooks** consommés par WS-B (`team+memory`) : récupération avant rédaction, écriture après un échec Verifier.
- Implémente l'**éval chronologique** : split du dataset (premiers K = warm-up mémoire, reste = test held-out).
- **GUARD HONNÊTE (obligatoire)** : si `team+memory` ne bat pas `team` d'une marge nette sur le held-out, le harness
  l'affiche tel quel et **retombe sur l'auto-amélioration intra-session v1→v2** (déjà fonctionnelle) comme beat
  d'auto-amélioration. **Ne gonfle jamais le chiffre.** In-memory fallback si Redis indispo (comme `SharedState`).

### WS-E — Front-end  (owner: `apps/web/app`)
- Nouvelle vue principale `/` (ou `/recovery`) qui lit `GET /recovery` (fallback mock si l'API est down, comme
  `fetchWeek`). Trois zones :
  1. **Leaderboard GRPR** : 3 lignes `solo` / `team` / `team+memory` avec GRPR + budget tokens/appels (montre la parité).
  2. **Drill-down d'un cas** : avis réel → réponse SOLO (avec `failReasons` surlignés : claim non soutenu / disclosure
     manquant / over-promise) vs réponse TEAM (pass) → **carte mémoire réutilisée** si `memoryReuse`.
  3. **HITL** : bouton Approve/Reject sur la réponse publique + le ticket (réutilise `ApprovalBanner`/`HumanGate`).
- Garde `/brigade` (legacy) fonctionnel. Réutilise les composants existants (`Scoreboard`, `Sidebar`, `TopBar`,
  `ThemeToggle`). Style cohérent. **Aucune logique d'agent dans le front** (lecture seule via l'API).

### WS-F — Docs & Narratif  (owner: `CLAUDE.md`, `docs/`, README)
- Réécris `CLAUDE.md` (le fichier d'instructions du repo) : nouvelle THÈSE = **GRPR review-recovery**, nouveau
  HERO LOOP (Curator→Analyst→Writer→Verifier), nouvelle métrique, 3 lignes de leaderboard, garde la section RULES
  (canon vs non-canon, HITL, mécanique-pas-juge, parité compute), et **ajoute une décision RÉSOLUE 2026-06-07-bis**
  qui acte le re-pointage (supersede la headline "grounding post" par "GRPR review-recovery sur N cas").
- Mets à jour `docs/solo-vs-team-research.md` (pourquoi review-recovery > forecast > post) et `docs/repo-audit.md`.
- Réécris la liste des COMMANDS (ajoute `pnpm recovery`, marque `pnpm prep`/`pnpm grounding` comme legacy).
- Écris un **script de démo de 3 min** `docs/demo-script.md` finissant sur la phrase-écran du §0.

---

## 5. PHASE 2 — INTÉGRATION & VÉRIFICATION (SÉQUENTIEL, UN AGENT, après merge des 6 WS)

1. Câble `runRecovery()` réel (WS-C) au dataset (WS-A), aux agents (WS-B), à la mémoire (WS-D) ; sers `GET /recovery`
   et branche le front (WS-E).
2. **Verts obligatoires** : `pnpm typecheck`, `pnpm build`, `pnpm recovery`, `pnpm compare`, `pnpm grounding`, `pnpm prep`.
3. **Vérification adversariale du chiffre** (lance un sous-agent dédié) : prouve que le GRPR n'est pas truqué —
   toggle le Verifier OFF et montre le GRPR qui s'effondre ; confirme que les guards (BUILD/HONESTY/PARITY) se
   déclenchent quand ils doivent ; vérifie que `solo` a bien un budget ≥ `team` ; vérifie l'éval chronologique
   (pas de cas de test dans la mémoire). Documente le résultat **honnête** (même si `team+memory` ≈ `team`).
4. **Screenshot** le front (leaderboard + drill-down) et relis-le.
5. Mets à jour `docs/demo-script.md` avec les vrais chiffres obtenus.

---

## 6. CRITÈRES D'ACCEPTATION (la def of done)

- [ ] `pnpm recovery` imprime 3 lignes : `solo` < `team` (≤ `team+memory`), GRPR mécanique, budgets affichés (parité).
- [ ] Le gap `team − solo` est **réel et attribuable au Verifier** (mêmes modèle+outils ; guards honnêtes passent).
- [ ] Dataset = avis **réels** majoritaires, schéma validé, triage/évidence/politique gold relus par Damien.
- [ ] Chaque case + check = **op Weave tracée** ; on peut ouvrir la trace d'un cas solo échoué et du même cas team réussi.
- [ ] `team+memory` : soit un gain net honnête (éval chronologique), soit repli explicite sur v1→v2. **Jamais gonflé.**
- [ ] HITL : réponse publique + ticket nécessitent une approbation humaine dans le front. Rien ne s'auto-publie.
- [ ] Legacy intact : `pnpm prep`, `pnpm grounding`, `/brigade` marchent. `pnpm typecheck` + `pnpm build` verts.
- [ ] `CLAUDE.md`, `docs/`, démo-script à jour ; `assertEveryRoleHasConflict()` vert ; spine sans noms de restaurant.

---

## 7. ORDRE DE LANCEMENT DES AGENTS CURSOR

```
Phase 0 (1 agent, séquentiel)         → merge
Phase 1 EN PARALLÈLE (1 agent / WS, branches/worktrees séparés) :
   WS-A Data&Truth   WS-B Agents&Tools   WS-C Eval/GRPR
   WS-D Memory       WS-E Front-end      WS-F Docs
   (dépendances douces : B & C importent les contrats de la Phase 0 ; E lit la forme RecoveryReport ;
    D expose des hooks via interface. Personne n'attend l'implémentation d'un autre — uniquement les contrats.)
→ merge dans l'ordre : A → B → D → C → E → F
Phase 2 (1 agent, séquentiel) : intégration + vérification adversariale + screenshots + chiffres réels.
```

**Rappel final** : la victoire n'est pas un "restaurant OS". C'est un **workflow multi-agent court** qui gagne sur **une
métrique binaire dure (GRPR)** dans Weave, et **s'améliore visiblement** d'une version à l'autre — preuve inattaquable
parce que mécanique, à budget apparié, sur des données réelles. Coupe tout ce qui dilue cette unique ligne de preuve.
