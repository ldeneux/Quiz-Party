'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const LEVELS = [
  { id: 'CP', label: 'CP' },
  { id: 'CE1', label: 'CE1' },
  { id: 'CE2', label: 'CE2' },
  { id: 'CM1', label: 'CM1' },
  { id: 'CM2', label: 'CM2' },
  { id: 'ADO', label: 'Ado' },
  { id: 'ADULTE', label: 'Adulte' },
];

type Category = { id: string; name: string; emoji: string };
type Pack = { id: string; name: string; level_id: string; category_id: string; questionCount?: number };
type Profile = { id: string; name: string; is_favorite: boolean; is_default: boolean; packIds?: string[] };

export default function ParametragePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  const [selectedLevels, setSelectedLevels] = useState<string[]>(['CM1']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questionsPerPack, setQuestionsPerPack] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [genError, setGenError] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('❓');

  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePackIds, setNewProfilePackIds] = useState<string[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const loadAll = async () => {
    setLoadNotice(null);

    const { data: cats, error: catError } = await supabase.from('categories').select('*').order('name');
    if (catError) {
      setLoadNotice(`Erreur de chargement des catégories : ${catError.message}`);
    }
    setCategories((cats as Category[]) ?? []);
    if (!catError && (!cats || cats.length === 0)) {
      setLoadNotice(
        "Aucune catégorie trouvée. Si tu as déjà exécuté le script de seed, essaie 'Restart project' dans Supabase (Project Settings), sinon crée-en une ci-dessous."
      );
    }

    const { data: packRows } = await supabase.from('question_packs').select('*').order('created_at', { ascending: false });
    const { data: questionCounts, error: qcError } = await supabase.from('questions').select('pack_id');

    if (qcError) {
      setLoadNotice((prev) =>
        prev ? `${prev} | Erreur comptage questions : ${qcError.message}` : `Erreur comptage questions : ${qcError.message}`
      );
    }

    const countByPack: Record<string, number> = {};
    (questionCounts ?? []).forEach((q: any) => {
      if (q.pack_id) countByPack[q.pack_id] = (countByPack[q.pack_id] ?? 0) + 1;
    });

    setPacks(((packRows as Pack[]) ?? []).map((p) => ({ ...p, questionCount: countByPack[p.id] ?? 0 })));

    const { data: profileRows } = await supabase.from('quiz_profiles').select('*');
    const { data: profilePackRows } = await supabase.from('quiz_profile_packs').select('*');

    const packsByProfile: Record<string, string[]> = {};
    (profilePackRows ?? []).forEach((pp: any) => {
      packsByProfile[pp.profile_id] = [...(packsByProfile[pp.profile_id] ?? []), pp.pack_id];
    });

    const sortedProfiles = ((profileRows as Profile[]) ?? [])
      .map((p) => ({ ...p, packIds: packsByProfile[p.id] ?? [] }))
      .sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    setProfiles(sortedProfiles);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleLevel = (id: string) =>
    setSelectedLevels((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  const toggleCategory = (id: string) =>
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const toggleProfilePack = (id: string) =>
    setNewProfilePackIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  // --- Catégories ---
  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from('categories').insert({ name: newCatName.trim(), emoji: newCatEmoji || '❓' });
    if (error) {
      setLoadNotice(`Erreur création catégorie : ${error.message}`);
      return;
    }
    setNewCatName('');
    setNewCatEmoji('❓');
    loadAll();
  };

  const editCategory = async (cat: Category) => {
    const newName = window.prompt('Nom de la catégorie', cat.name);
    if (newName === null) return;
    const newEmoji = window.prompt('Emoji', cat.emoji) ?? cat.emoji;
    await supabase.from('categories').update({ name: newName.trim(), emoji: newEmoji }).eq('id', cat.id);
    loadAll();
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer la catégorie "${name}" ? Les packs qui l'utilisent perdront leur catégorie associée.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      setLoadNotice(`Erreur lors de la suppression de la catégorie : ${error.message}`);
      return;
    }
    loadAll();
  };

  // --- Packs ---
  const generatePacks = async () => {
    setGenError(null);
    if (selectedLevels.length === 0 || selectedCategories.length === 0) {
      setGenError('Choisis au moins un niveau et une catégorie.');
      return;
    }

    setGenerating(true);
    const combos = selectedLevels.flatMap((levelId) =>
      selectedCategories.map((categoryId) => ({ levelId, categoryId }))
    );

    for (let i = 0; i < combos.length; i++) {
      const { levelId, categoryId } = combos[i];
      const levelLabel = LEVELS.find((l) => l.id === levelId)?.label ?? levelId;
      const categoryName = categories.find((c) => c.id === categoryId)?.name ?? '';

      setGenProgress(`Génération ${i + 1}/${combos.length} : ${levelLabel} · ${categoryName}…`);

      const res = await fetch('/api/generate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId, levelLabel, categoryId, categoryName, count: questionsPerPack }),
      });
      const data = await res.json();

      if (data.error) {
        setGenError(`Erreur sur ${levelLabel} · ${categoryName} : ${data.error}`);
      }
    }

    setGenProgress('');
    setGenerating(false);
    loadAll();
  };

  const deletePack = async (id: string) => {
    const { error } = await supabase.from('question_packs').delete().eq('id', id);
    if (error) {
      setLoadNotice(`Erreur lors de la suppression du pack : ${error.message}`);
      return;
    }
    loadAll();
  };

  // --- Profils ---
  const startEditProfile = (p: Profile) => {
    setEditingProfileId(p.id);
    setNewProfileName(p.name);
    setNewProfilePackIds(p.packIds ?? []);
  };

  const cancelEditProfile = () => {
    setEditingProfileId(null);
    setNewProfileName('');
    setNewProfilePackIds([]);
  };

  const saveProfile = async () => {
    if (!newProfileName.trim() || newProfilePackIds.length === 0) return;

    if (editingProfileId) {
      await supabase.from('quiz_profiles').update({ name: newProfileName.trim() }).eq('id', editingProfileId);
      await supabase.from('quiz_profile_packs').delete().eq('profile_id', editingProfileId);
      await supabase
        .from('quiz_profile_packs')
        .insert(newProfilePackIds.map((packId) => ({ profile_id: editingProfileId, pack_id: packId })));
    } else {
      const { data: profile, error } = await supabase
        .from('quiz_profiles')
        .insert({ name: newProfileName.trim() })
        .select()
        .single();
      if (error || !profile) return;
      await supabase
        .from('quiz_profile_packs')
        .insert(newProfilePackIds.map((packId) => ({ profile_id: profile.id, pack_id: packId })));
    }

    cancelEditProfile();
    loadAll();
  };

  const toggleFavorite = async (p: Profile) => {
    await supabase.from('quiz_profiles').update({ is_favorite: !p.is_favorite }).eq('id', p.id);
    loadAll();
  };

  const setAsDefault = async (p: Profile) => {
    if (p.is_default) {
      // On peut retirer le défaut (revenir à "aucun profil par défaut")
      await supabase.from('quiz_profiles').update({ is_default: false }).eq('id', p.id);
    } else {
      // Un seul profil par défaut à la fois : on retire l'ancien puis on pose le nouveau
      await supabase.from('quiz_profiles').update({ is_default: false }).eq('is_default', true);
      await supabase.from('quiz_profiles').update({ is_default: true }).eq('id', p.id);
    }
    loadAll();
  };

  const deleteProfile = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer le profil "${name}" ?`)) return;
    const { error } = await supabase.from('quiz_profiles').delete().eq('id', id);
    if (error) {
      setLoadNotice(`Erreur lors de la suppression du profil : ${error.message}`);
      return;
    }
    if (editingProfileId === id) cancelEditProfile();
    loadAll();
  };

  return (
    <main style={{ fontFamily: 'Inter, sans-serif', background: '#f4f6fb', minHeight: '100vh', padding: '28px 40px' }}>
      <a href="/" style={{ color: '#7a819c', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>← Retour</a>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '16px 0 24px' }}>⚙️ Paramétrage</h1>

      {loadNotice && (
        <p style={{ color: '#ff7a68', fontSize: 13, marginBottom: 16, maxWidth: 600 }}>{loadNotice}</p>
      )}

      {/* ---- Création de packs (avec ajout de catégorie intégré) ---- */}
      <section style={card}>
        <h2 style={sectionTitle}>Créer des packs de questions</h2>
        <p style={{ color: '#7a819c', fontSize: 13, marginBottom: 16 }}>
          Un pack est créé pour chaque combinaison niveau × catégorie cochée, et rempli via Gemini.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={rowHeader}>
            <strong style={{ fontSize: 13.5 }}>Niveaux</strong>
            <span style={selectAllLink} onClick={() => setSelectedLevels(LEVELS.map((l) => l.id))}>Tout sélectionner</span>
            <span style={selectAllLink} onClick={() => setSelectedLevels([])}>Tout désélectionner</span>
          </div>
          <div style={chipsWrap}>
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => toggleLevel(l.id)} style={chip(selectedLevels.includes(l.id))}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={rowHeader}>
            <strong style={{ fontSize: 13.5 }}>Catégories à utiliser ({categories.length})</strong>
            <span style={selectAllLink} onClick={() => setSelectedCategories(categories.map((c) => c.id))}>Tout sélectionner</span>
            <span style={selectAllLink} onClick={() => setSelectedCategories([])}>Tout désélectionner</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={newCatEmoji}
              onChange={(e) => setNewCatEmoji(e.target.value)}
              style={{ width: 44, padding: 8, borderRadius: 10, border: '1px solid #eaedf6', textAlign: 'center' }}
            />
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ajouter une catégorie…"
              style={{ flex: 1, padding: 8, borderRadius: 10, border: '1px solid #eaedf6', fontSize: 13 }}
            />
            <button onClick={createCategory} style={primaryBtnSmall}>Ajouter</button>
          </div>

          <div style={{ ...chipsWrap, maxHeight: 220, overflowY: 'auto', padding: 4 }}>
            {categories.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button onClick={() => toggleCategory(c.id)} style={chip(selectedCategories.includes(c.id))}>
                  {c.emoji} {c.name}
                </button>
                <button onClick={() => editCategory(c)} title="Modifier" style={iconBtn}>✏️</button>
                <button onClick={() => deleteCategory(c.id, c.name)} title="Supprimer" style={iconBtn}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <label style={{ fontSize: 13.5, fontWeight: 700 }}>Questions par pack</label>
          <input
            type="number"
            min={1}
            max={20}
            value={questionsPerPack}
            onChange={(e) => setQuestionsPerPack(Number(e.target.value))}
            style={{ width: 60, padding: 6, borderRadius: 8, border: '1px solid #eaedf6' }}
          />
        </div>

        {selectedLevels.length > 0 && selectedCategories.length > 0 && (
          <p style={{ color: '#7a819c', fontSize: 12.5, marginBottom: 12 }}>
            → {selectedLevels.length * selectedCategories.length} pack(s) seront créés.
          </p>
        )}

        {genError && <p style={{ color: '#ff7a68', fontSize: 13, marginBottom: 12 }}>{genError}</p>}
        {genProgress && <p style={{ color: '#6c7bf7', fontSize: 13, marginBottom: 12 }}>{genProgress}</p>}

        <button onClick={generatePacks} disabled={generating} style={primaryBtn}>
          {generating ? 'Génération en cours…' : 'Générer les packs (Gemini)'}
        </button>
      </section>

      {/* ---- Liste des packs ---- */}
      <section style={card}>
        <h2 style={sectionTitle}>Packs existants ({packs.length})</h2>
        {packs.length === 0 ? (
          <p style={{ color: '#7a819c', fontSize: 13.5 }}>Aucun pack pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {packs.map((p) => (
              <div key={p.id} style={listRow}>
                <span>
                  <strong>{p.name}</strong>{' '}
                  <span style={{ color: '#7a819c', fontSize: 12.5 }}>({p.questionCount} question{p.questionCount !== 1 ? 's' : ''})</span>
                </span>
                <button onClick={() => deletePack(p.id)} style={deleteBtn}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Profils ---- */}
      <section style={card}>
        <h2 style={sectionTitle}>{editingProfileId ? 'Modifier le profil' : 'Créer un profil'}</h2>
        <input
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          placeholder="Nom du profil (ex. CM1 - Culture générale)"
          style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #eaedf6', marginBottom: 12 }}
        />
        <div style={{ ...chipsWrap, maxHeight: 180, overflowY: 'auto', padding: 4, marginBottom: 12 }}>
          {packs.map((p) => (
            <button key={p.id} onClick={() => toggleProfilePack(p.id)} style={chip(newProfilePackIds.includes(p.id))}>
              {p.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={saveProfile} style={primaryBtn}>
            {editingProfileId ? 'Mettre à jour' : 'Créer le profil'}
          </button>
          {editingProfileId && (
            <button onClick={cancelEditProfile} style={{ ...primaryBtn, background: '#eef0f8', color: '#1f2440' }}>
              Annuler
            </button>
          )}
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Profils existants ({profiles.length})</h2>
        {profiles.length === 0 ? (
          <p style={{ color: '#7a819c', fontSize: 13.5 }}>Aucun profil pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {profiles.map((p) => (
              <div key={p.id} style={listRow}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setAsDefault(p)}
                    title={p.is_default ? 'Retirer comme profil par défaut' : 'Définir comme profil par défaut'}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, padding: 0 }}
                  >
                    {p.is_default ? '🏠' : '⬜'}
                  </button>
                  <button
                    onClick={() => toggleFavorite(p)}
                    title="Favori"
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}
                  >
                    {p.is_favorite ? '⭐' : '☆'}
                  </button>
                  <strong>{p.name}</strong>
                  <span style={{ color: '#7a819c', fontSize: 12.5 }}>
                    ({p.packIds?.length ?? 0} pack{(p.packIds?.length ?? 0) !== 1 ? 's' : ''})
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEditProfile(p)} title="Modifier" style={iconBtn}>✏️</button>
                  <button onClick={() => deleteProfile(p.id, p.name)} style={deleteBtn}>✕</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  padding: 24,
  marginBottom: 20,
  maxWidth: 720,
  boxShadow: '0 10px 30px -16px rgba(31,36,64,0.15)',
};

const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 800, marginBottom: 10 };
const rowHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 };
const selectAllLink: React.CSSProperties = { fontSize: 12, color: '#6c7bf7', fontWeight: 700, cursor: 'pointer' };
const chipsWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };

const chip = (active: boolean): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: 999,
  border: active ? '2px solid #6c7bf7' : '2px solid #eaedf6',
  background: active ? '#eceeff' : '#fff',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
});

const primaryBtn: React.CSSProperties = {
  background: '#6c7bf7',
  color: '#fff',
  border: 'none',
  borderRadius: 999,
  padding: '12px 22px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const primaryBtnSmall: React.CSSProperties = { ...primaryBtn, padding: '8px 16px', fontSize: 13 };

const listRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#f4f6fb',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 13.5,
};

const deleteBtn: React.CSSProperties = {
  border: 'none',
  background: 'rgba(0,0,0,0.06)',
  borderRadius: '50%',
  width: 22,
  height: 22,
  fontSize: 11,
  cursor: 'pointer',
  color: '#7a819c',
};

const iconBtn: React.CSSProperties = {
  border: 'none',
  background: 'rgba(0,0,0,0.06)',
  borderRadius: '50%',
  width: 22,
  height: 22,
  fontSize: 11,
  cursor: 'pointer',
  color: '#7a819c',
};
