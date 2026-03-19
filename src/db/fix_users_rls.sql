-- ============================================================
-- SCRIPT DE RÉPARATION DES DROITS (RLS) SUR LA TABLE USERS
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- 1. S'assurer que la table a bien RLS activé
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques si elles existent pour repartir à zéro
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_select_all_for_admins" ON public.users;

-- 3. Politique : Un utilisateur peut voir son PROPRE profil
CREATE POLICY "users_select_own_profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- 4. Politique : Le super_admin peut TOUT voir (pour la gestion des agents)
CREATE POLICY "users_select_all_for_admins"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- NOTE : SI VOUS AVEZ CRÉÉ UN UTILISATEUR MANUELLEMENT DANS L'INTERFACE SUPABASE,
-- IL N'EST PAS DANS LA TABLE 'public.users'. 
-- IL DOIT ÊTRE CRÉÉ VIA L'APPLICATION (RPC create_user_secure) 
-- OU AJOUTÉ MANUELLEMENT DANS LA TABLE 'public.users' AVEC LE MÊME ID.
