export function isInactiveAccount(acc) {
  if (!acc) return false;
  const str = [
    acc.lastActiveRelative,
    acc.lastActive,
    acc.lastActiveDate
  ].filter(Boolean).join(' ');

  if (!str || str.includes('Vorschau fehlt') || str.includes('Keine Beitrags-Vorschau')) return true;

  if (/monat|month|jahr|year/i.test(str)) return true;

  const daysMatch = str.match(/vor\s+(\d+)\s+tagen/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    if (days >= 30) return true;
  }

  if (acc.lastActiveTimestamp && acc.lastActiveTimestamp > 0) {
    const ageDays = (Date.now() - acc.lastActiveTimestamp) / (1000 * 60 * 60 * 24);
    if (ageDays >= 30) return true;
  }

  return false;
}

export function isNoFollowBack(acc) {
  return !!(acc && !acc.followsYou);
}
