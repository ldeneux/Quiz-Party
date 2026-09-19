'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getRandomPresets, TeamPreset } from '@/lib/teamPresets';

type Question = {
  id: string;
  prompt: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
};

export default function PlayScreen(props: { params: { gameId: string } }) {
  return (
    <Suspense fallback={null}>
      <PlayScreenInner {...props} />
    </Suspense>
  );
}

function PlayScreenInner({ params }: { params: { gameId: string } }) {
  const { gameId } = params;
  const searchParams = useSearchParams();
  const resumeTeamId = searchParams.get('team');

  const [team, setTeam] = useState<{ id: string; preset: TeamPreset } | null>(null);
  const [presets, setPresets] = useState<TeamPreset[]>([]);
  const [takenNames, setTakenNames] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<Question | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    setPresets(getRandomPresets('espace', 12));
  }, []);

  // Reprise directe via un lien de récupération (?team=<id>) — utile si
  // la page d'une équipe s'est fermée par erreur : cliquer sur sa tuile
  // dans la console donne un lien qui la reconnecte directement.
  useEffect(() => {
    if (!resumeTeamId) return;
    supabase
      .from('teams')
      .select('*')
      .eq('id', resumeTeamId)
      .eq('game_id', gameId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTeam({ id: data.id, preset: { name: data.name, avatar: data.avatar, color: data.color } });
        }
      });
  }, [resumeTeamId, gameId]);

  // Liste des noms déjà pris, pour griser les tuiles correspondantes
  // sur l'écran de choix — et les tenir à jour en direct.
  useEffect(() => {
    if (team) return; // pas besoin une fois l'équipe choisie

    supabase
      .from('teams')
      .select('name')
      .eq('game_id', gameId)
      .then(({ data }) => setTakenNames(new Set((data ?? []).map((t: any) => t.name))));

    const ch = supabase.channel(`taken-names:${gameId}`);
    ch.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => setTakenNames((prev) => new Set(prev).add((payload.new as any).name))
    );
    ch.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'teams', filter: `game_id=eq.${gameId}` },
      (payload) => {
        setTakenNames((prev) => {
          const next = new Set(prev);
          next.delete((payload.old as any).name);
          return next;
        });
      }
    );
    ch.subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [team, gameId]);

  // Détecte si l'hôte supprime cette équipe pendant la partie
  useEffect(() => {
    if (!team) return;

    const kickChannel = supabase.channel(`team-watch:${team.id}`);
    kickChannel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'teams', filter: `id=eq.${team.id}` },
      () => {
        setKicked(true);
        setTeam(null);
        setQuestion(null);
      }
    );
    kickChannel.subscribe();

    return () => {
      supabase.removeChannel(kickChannel);
    };
  }, [team]);


  useEffect(() => {
    if (!team) return;

    const channel = supabase.channel(`game:${gameId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'question:show' }, ({ payload }) => {
      setQuestion(payload.question);
      setQuestionStartedAt(payload.startedAt);
      setHasAnswered(false);
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team, gameId]);

  const joinAsTeam = async (preset: TeamPreset) => {
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({ game_id: gameId, name: preset.name, avatar: preset.avatar, color: preset.color })
      .select()
      .single();

    if (error || !newTeam) return;

    setTeam({ id: newTeam.id, preset });

    const channel = supabase.channel(`game:${gameId}`);
    await channel.subscribe();
    channel.send({
      type: 'broadcast',
      event: 'team:joined',
      payload: { team: { id: newTeam.id, name: preset.name, avatar: preset.avatar, color: preset.color, score: 0 } },
    });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitAnswer = async (choice: 'a' | 'b' | 'c' | 'd') => {
    if (!team || !question || hasAnswered) return;
    setSubmitError(null);

    const responseTimeMs = questionStartedAt ? Date.now() - questionStartedAt : null;

    const { error } = await supabase.from('answers').insert({
      game_id: gameId,
      question_id: question.id,
      team_id: team.id,
      choice,
      response_time_ms: responseTimeMs,
    });

    if (error) {
      setSubmitError(`Échec de l'envoi (${error.message}). Réessaie.`);
      return; // hasAnswered reste false : le bouton reste cliquable
    }

    setHasAnswered(true);

    const channel = supabase.channel(`game:${gameId}`);
    await channel.subscribe();
    channel.send({
      type: 'broadcast',
      event: 'answer:submitted',
      payload: { teamId: team.id }, // jamais le choix : pas de fuite avant révélation
    });
  };

  // --- Écran : équipe expulsée par l'hôte ---
  if (kicked) {
    return (
      <main style={{ textAlign: 'center', marginTop: 100, fontFamily: 'Inter, sans-serif', padding: 24 }}>
        <div style={{ fontSize: 36 }}>👋</div>
        <h2 style={{ fontWeight: 800 }}>Votre équipe a été retirée du jeu</h2>
        <p style={{ color: '#7a819c', marginBottom: 20 }}>L'hôte vous a déconnecté. Vous pouvez rejoindre à nouveau si besoin.</p>
        <button
          onClick={() => setKicked(false)}
          style={{
            background: '#6c7bf7',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '10px 24px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Choisir une nouvelle équipe
        </button>
      </main>
    );
  }

  // --- Écran 1 : choix du nom d'équipe ---
  if (!team) {
    return (
      <main style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>
          Choisissez votre équipe
        </h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {presets.map((p) => {
            const taken = takenNames.has(p.name);
            return (
              <button
                key={p.name}
                onClick={() => !taken && joinAsTeam(p)}
                disabled={taken}
                style={{
                  background: taken ? '#f0f1f5' : p.color + '22',
                  border: `2px solid ${taken ? '#dcdfe8' : p.color}`,
                  borderRadius: 16,
                  padding: 16,
                  fontWeight: 700,
                  cursor: taken ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  opacity: taken ? 0.5 : 1,
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 24 }}>{p.avatar}</div>
                {p.name}
                {taken && (
                  <div style={{ fontSize: 11, color: '#7a819c', marginTop: 2 }}>Déjà prise</div>
                )}
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  const leaveTeam = async () => {
    if (!team) return;
    await supabase.from('teams').delete().eq('id', team.id);
    setTeam(null);
    setQuestion(null);
  };

  // --- Écran 2 : en attente de question ---
  if (!question) {
    return (
      <main style={{ textAlign: 'center', marginTop: 100, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 36 }}>{team.preset.avatar}</div>
        <h2 style={{ fontWeight: 800 }}>{team.preset.name}</h2>
        <p style={{ color: '#7a819c' }}>En attente du démarrage…</p>
        <button
          onClick={leaveTeam}
          style={{
            marginTop: 20,
            background: 'none',
            border: '1px solid #eaedf6',
            borderRadius: 999,
            padding: '8px 18px',
            color: '#ff7a68',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Quitter la partie
        </button>
      </main>
    );
  }

  // --- Écran 3 : réponse ---
  return (
    <main style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <p style={{ textAlign: 'center', color: '#7a819c', marginBottom: 20 }}>
        {team.preset.avatar} {team.preset.name}
      </p>

      {submitError && (
        <p style={{ textAlign: 'center', color: '#ff7a68', fontSize: 13, marginBottom: 12 }}>{submitError}</p>
      )}

      {hasAnswered ? (
        <p style={{ textAlign: 'center', fontWeight: 800, fontSize: 18 }}>Réponse envoyée ✓</p>
      ) : (
        <>
          <p style={{ fontWeight: 800, fontSize: 19, lineHeight: 1.4, marginBottom: 20, textAlign: 'center' }}>
            {question.prompt}
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            {(['a', 'b', 'c', 'd'] as const).map((letter) => (
              <button
                key={letter}
                onClick={() => submitAnswer(letter)}
                style={{
                  padding: 20,
                  borderRadius: 16,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 16,
                  background: '#eef0f8',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <strong>{letter.toUpperCase()}.</strong> {question[`choice_${letter}` as const]}
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
