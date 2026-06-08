# Which AI engine will be invoked?

### So what’s the real situation June 2026?  
|Provider	      |Free?  	|Native MCP Tool‑Calling?	|Usable in CI?	|Notes              |  
|-----------------|---------|--------------------------|--------------|------------------|  
|OpenAI	         |❌ No	 |✅ Yes                   |✅ Yes       |Best option        |  
|Anthropic Claude |❌ No	 |✅ Yes	                   |✅ Yes	|Strong alternative       |  
|Mistral	         |🟡 Yes (limited)	|❌ No	|🟡 Yes (manual agent)	|Requires custom logic|  
|Ollama (local)	|🟢 Yes  |❌ No	                   |🟡 Yes (manual agent) |Free + offline|  
|GitHub Copilot	|❌ No   |🟡 Yes (IDE only)	       |❌ No	       |Not for CI        |  

  
Then only two providers support this today:
  
🟦 OpenAI Assistants API  
🟪 Anthropic Claude Messages API  

What happens when the test runs?  
Here’s the flow:  
GitHub Action  
   ↓  
Node.js script (your MCP client)  
   ↓  
OpenAI Assistants API (model you choose)  
   ↓  
AI discovers MCP tools exposed by your server  
   ↓  
AI invokes tools (openPage, click, fill, evaluate…)  
   ↓  
Your MCP server executes Playwright actions  
   ↓  
Browser automation happens in CI  
   ↓  
AI returns PASS/FAIL reasoning  
  

# Pipeline et exécution multiplateforme

Le pipeline s’exécute sous **Ubuntu**, mais le testeur peut exécuter le même test Playwright sur sa machine Windows.  
C’est possible parce que, dans les deux cas, l’environnement d’exécution est **Node.js**.  
![Capture d'écran: sans MCP](images/Test-de-Playwright-codé-en-dur.PNG)

---


# Exécution de tests pilotée par l'intention avec MCP et Playwright

Ce projet démontre un modèle d'exécution alternatif pour l'automatisation Playwright utilisant le Model Context Protocol (MCP).

Dans une approche Playwright traditionnelle, la logique d'interaction est codée directement dans les tests au moyen de sélecteurs et d'actions prédéfinis :

- await page.locator('#login').fill(user);
- await page.locator('#password').fill(password);
- await page.locator('#submit').click();

Avec l'intégration MCP, le scénario de test peut être décrit à un niveau d'abstraction plus élevé, en mettant l'accent sur le flux métier, les critères d'acceptation et les validations attendues. Un client IA connecté via MCP peut alors traduire ces objectifs en actions Playwright au moment de l'exécution.

## Flux d'exécution
- Le développeur définit le scénario métier, les contraintes et les assertions.
- Le client IA détermine quelles actions sont nécessaires pour atteindre l'objectif demandé.
- Le client IA invoque les outils exposés par le serveur MCP.
- Le serveur MCP exécute les opérations Playwright correspondantes.
- Les résultats sont renvoyés au client IA pour analyse, validation ou génération d'un rapport.
- Résolution dynamique des éléments

Dans ce modèle, la résolution des sélecteurs peut être effectuée dynamiquement.

Au lieu de dépendre exclusivement de localisateurs codés en dur, le client IA peut analyser le DOM courant, identifier les éléments pertinents et adapter les interactions à certaines modifications de l'interface sans nécessiter de changement du code de test.

Les opérations sous-jacentes restent des opérations Playwright standard. MCP fournit uniquement un protocole permettant à un client IA de demander leur exécution.

## Répartition des responsabilités
###Composant	Responsabilité
- Développeur	Définit le flux métier, les règles fonctionnelles, les assertions et les critères d'acceptation
- Client IA	Détermine quels outils et quelles actions doivent être exécutés
- Serveur MCP	Expose les capacités d'automatisation sous forme d'outils invocables
- Playwright	Réalise les interactions avec le navigateur et le DOM
- Navigateur	Exécute l'application sous test  
  
Architecture  
Développeur  
     │  
     ▼  
Description du scénario  
     │  
     ▼  
Client IA  
     │  
     ▼  
Serveur MCP  
     │  
     ▼  
Playwright  
     │  
     ▼  
Navigateur  

## Indépendance vis-à-vis du modèle d'IA

MCP est indépendant du modèle utilisé.

Tout client IA compatible MCP peut être employé, à condition qu'il prenne en charge l'invocation d'outils MCP. Le protocole ne dépend d'aucun fournisseur particulier et n'impose ni modèle de langage, ni stratégie de raisonnement, ni mécanisme spécifique de génération de tests.

## Exemples de clients compatibles :

- GitHub Copilot
- Claude Desktop
- OpenAI ChatGPT avec support MCP
- Applications internes compatibles MCP
Cas d'utilisation

Cette architecture est particulièrement adaptée aux scénarios suivants :

- ests exploratoires assistés par IA
- Investigation dynamique d'anomalies
- Génération assistée de tests Playwright
- Vérifications ponctuelles nécessitant une navigation déterminée à l'exécution
- Automatisation pilotée par des objectifs métier plutôt que par des sélecteurs prédéfinis
- Quand utiliser des tests Playwright classiques

Les tests Playwright classiques demeurent généralement préférables lorsque l'objectif principal est :

- l'exécution déterministe ;
- la reproductibilité stricte des scénarios ;
- la stabilité des suites de régression ;
- l'intégration CI/CD ;
- les validations fonctionnelles répétitives.

# Résumé
- Le développeur définit les objectifs et les validations.
- Le client IA décide quelles actions doivent être exécutées.
- Le serveur MCP expose les capacités d'automatisation.
- Playwright contrôle le navigateur.
- Le navigateur exécute l'application sous test.

MCP ne remplace pas Playwright. Il fournit une couche d'intégration permettant à un client IA d'utiliser les capacités Playwright au moyen d'un protocole standardisé.


## GitHub Copilot comprend et peut améliorer l'architecture du projet
![github-copilot-comprend-et-peut-améliorer-l'architecture-du-projet.PNG](images/github-copilot-comprend-et-peut-améliorer-l'architecture-du-projet.PNG)
