import { createClient } from '@supabase/supabase-js';

// Renseigner ces deux valeurs dans les variables d'environnement Expo.
// Ne jamais intégrer la clé service_role dans l'application mobile.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url,anonKey) : null;

export async function checkCloudConfiguration() {
  return {configured: !!supabase, message: supabase ? 'Supabase configuré' : 'Synchronisation cloud à configurer'};
}

/* La synchronisation complète nécessite : 1. Un projet Supabase. 2. Authentification utilisateur activée. 3. Tables et politiques RLS définies dans supabase/schema.sql. 4. Une file d'attente locale des changements et une stratégie de résolution des conflits. Cette version conserve les données localement même si le cloud n'est pas configuré. */
