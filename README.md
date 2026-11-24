# MON BUDGET — application mobile

Projet de démarrage React Native + Expo pour Android et iOS.

## Fonctionnalités présentes dans ce socle
- Stockage local SQLite persistant.
- Comptes avec soldes indépendants et création de comptes.
- Revenus et dépenses avec contrôle du solde.
- Transferts internes enregistrés comme deux écritures liées, exclus des revenus/dépenses.
- Budgets mensuels par catégorie.
- Création et consultation d'objectifs d'épargne.
- Structure Supabase avec politiques RLS proposée.

## Pré-requis
- Node.js LTS
- npm
- Expo Go sur Android/iPhone pour un premier test
- Un ordinateur pour lancer le projet

## Installation
```bash
npm install
cp .env.example .env
npx expo start
```
Scannez le QR code avec Expo Go. Pour iOS, certaines fonctions natives nécessitent un development build plutôt qu'Expo Go.

## Configuration Supabase
1. Créez un projet Supabase.
2. Activez l'authentification.
3. Exécutez `supabase/schema.sql` dans l'éditeur SQL.
4. Copiez l'URL et la clé `anon` dans `.env`.
5. Ne mettez jamais la clé `service_role` dans une application mobile.

**Important :** la synchronisation bidirectionnelle complète n'est pas encore implémentée. Le projet conserve les données dans SQLite et affiche l'état de configuration cloud. Avant d'activer le cloud pour de vraies données, il faut ajouter l'authentification, une file de synchronisation, les identifiants utilisateur, les règles de résolution de conflits et les tests de sécurité.

## Sécurité
Le module `src/security.ts` fournit les fonctions de stockage sécurisé du PIN et d'authentification biométrique. Il reste à intégrer l'écran de verrouillage et le parcours de récupération du PIN à l'interface. Un PIN seul ne remplace pas le chiffrement de la base de données.

## Limites de cette version
- Socle fonctionnel de développement, pas une application publiée ni un APK/IPA signé.
- Les contributions aux objectifs sont un suivi d'objectif ; elles ne déplacent pas encore de fonds entre comptes.
- Édition/suppression des comptes et transactions, export PDF/Excel, notifications, graphiques avancés et synchronisation cloud sont des étapes suivantes.
- Les montants sont des entiers en GNF pour éviter les erreurs d'arrondi.

## Scripts
- `npm start`
- `npm run android`
- `npm run ios`
- `npm run typecheck`
