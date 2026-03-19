-- ============================================================
-- DEBUG : Désactivation de la RLS pour test de stabilité
-- ATTENTION : À NE PAS UTILISER EN PRODUCTION
-- Ce script permet de vérifier si la RLS est responsable de la
-- disparition des données après 10-40 secondes.
-- ============================================================

-- Désactiver la RLS sur les tables principales
ALTER TABLE public.agence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.guichet_service DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour éviter les conflits si on réactive
DROP POLICY IF EXISTS "agence_select_public_policy" ON public.agence;
DROP POLICY IF EXISTS "service_select_public_policy" ON public.service;
DROP POLICY IF EXISTS "guichet_service_select_public_policy" ON public.guichet_service;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;

-- Note : Les données seront maintenant visibles par TOUT LE MONDE (public/anon)
-- Cela permet de confirmer si le problème vient de la session Supabase qui expire.
