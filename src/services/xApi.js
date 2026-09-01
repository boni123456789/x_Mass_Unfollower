// Service to interact with local X Proxy backend (/api/x/*)

export async function verifyXCredentials(authToken, ct0) {
  const res = await fetch('/api/x/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authToken, ct0 })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify X credentials');
  }
  return data;
}

export async function fetchXFollowing(authToken, ct0, cursor = '-1') {
  const res = await fetch('/api/x/following', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authToken, ct0, cursor })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch following accounts');
  }
  return data;
}

export async function unfollowXUser(authToken, ct0, targetUserId) {
  const res = await fetch('/api/x/unfollow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authToken, ct0, targetUserId })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to unfollow account on X');
  }
  return data;
}
