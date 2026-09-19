'use client';

import { useEffect, useState } from 'react';
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

export default function PlayScreen({ params }: { params: { gameId: string } }) {
  const { gameId } = params;

  const [team, setTeam] = useState<{ id: string; preset: TeamPreset } | null>(null);
  const [presets, setPresets] = useState<TeamPreset[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    setPresets(getRandomPresets('espace', 12));
  }, []);

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

  const submitAnswer = async (choice: 'a' | 'b' | 'c' | 'd') => {
    if (!team || !question || hasAnswered) return;
    setHasAnswered(true);

    const responseTimeMs = questionStartedAt ? Date.now() - questionStartedAt : null;

    await supabase.from('answers').insert({
      game_id: gameId,
      question_id: question.id,
      team_id: team.id,
      choice,
      response_time_ms: responseTimeMs,
    });

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
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => joinAsTeam(p)}
              style={{
                background: p.color + '22',
                border: `2px solid ${p.color}`,
                borderRadius: 16,
                padding: 16,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 24 }}>{p.avatar}</div>
              {p.name}
            </button>
          ))}
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

      {hasAnswered ? (
        <p style={{ textAlign: 'center', fontWeight: 800, fontSize: 18 }}>Réponse envoyée ✓</p>
      ) : (
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
      )}
    </main>
  );
}
