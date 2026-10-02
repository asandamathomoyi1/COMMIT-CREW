import React, { createContext, useContext, useState, useCallback } from 'react';

const CommunityContext = createContext(null);

const SEED_POSTS = [
  {
    id: 'p1',
    author: null,
    timeAgo: '12m ago',
    medication: { name: 'Metformin', color: '#7C3AED' },
    body:
      "Week 1 on metformin was rough — nausea every morning. Switched to taking it right after breakfast instead of before, and it went away completely. If you're starting out, eat first.",
    sameHere: 24,
    helpful: 41,
    comments: 8,
  },
  {
    id: 'p2',
    author: 'Thandi M.',
    timeAgo: '1h ago',
    medication: { name: 'Levetiracetam', color: '#D97706' },
    body:
      'Three years seizure-free today. Three whole years. I still remember being terrified to start this. To anyone at the beginning — it gets easier.',
    sameHere: 87,
    helpful: 132,
    comments: 34,
  },
  {
    id: 'p3',
    author: null,
    timeAgo: '3h ago',
    medication: { name: 'Salbutamol', color: '#A21CAF' },
    body:
      'Does anyone else get shaky hands after using their inhaler? It goes away in about 20 minutes for me but it\u2019s unsettling. My GP says it\u2019s normal but I want to hear from people who actually live with it.',
    sameHere: 19,
    helpful: 6,
    comments: 22,
  },
  {
    id: 'p4',
    author: 'Sipho K.',
    timeAgo: '5h ago',
    medication: null,
    body:
      'Not a medication tip, just a habit tip. I pair my morning dose with brushing my teeth. Same time, same trigger, same spot. Haven\u2019t missed a dose in four months and I used to miss 3\u20134 a week.',
    sameHere: 52,
    helpful: 98,
    comments: 11,
  },
  {
    id: 'p5',
    author: null,
    timeAgo: 'Yesterday',
    medication: { name: 'Vitamin D3', color: '#059669' },
    body:
      "Started D3 three months ago for a deficiency. Didn't expect much. My energy is genuinely different, and I stopped getting that 3pm crash. Worth asking your doctor to test your levels if you're always tired.",
    sameHere: 31,
    helpful: 67,
    comments: 14,
  },
  {
    id: 'p6',
    author: 'Nadia P.',
    timeAgo: 'Yesterday',
    medication: { name: 'Metformin', color: '#7C3AED' },
    body:
      'Reminder that grapefruit interacts with a LOT of medications, not just the famous ones. Ask your pharmacist. Mine caught an interaction my doctor missed.',
    sameHere: 45,
    helpful: 156,
    comments: 27,
  },
];

export function CommunityProvider({ children }) {
  const [posts, setPosts] = useState(SEED_POSTS);

  const addPost = useCallback((post) => {
    const withId = { ...post, id: post.id || `p${Date.now()}` };
    setPosts((prev) => [withId, ...prev]);
    return withId;
  }, []);

  const deletePost = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <CommunityContext.Provider value={{ posts, addPost, deletePost }}>
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    throw new Error('useCommunity must be used inside <CommunityProvider>');
  }
  return ctx;
}