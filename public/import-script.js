// CleanSweep X — Browser Import Script
// Runs in the browser console on x.com to extract following list via GraphQL API
// v1.1 endpoints are fully deprecated; this script auto-discovers GraphQL query IDs

(async () => {
  // ── 1. Verify we're on x.com ──────────────────────────────────────────────────
  if (!location.hostname.includes('x.com') && !location.hostname.includes('twitter.com')) {
    alert('❌ Dieses Skript muss auf x.com ausgeführt werden!\n\nAktuell bist du auf: ' + location.hostname);
    return;
  }

  // ── 2. Get CSRF token (ct0) ───────────────────────────────────────────────────
  const ct0 = (document.cookie.match('(^|;)\\s*ct0\\s*=\\s*([^;]+)') || [])[2] || '';
  if (!ct0) {
    alert('❌ ct0 Cookie nicht gefunden.\nBitte stelle sicher dass du auf x.com eingeloggt bist und lade die Seite neu.');
    return;
  }
  console.log('🔑 ct0 gefunden. Suche GraphQL Query-IDs...');

  const BEARER = 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
  const baseHeaders = {
    'authorization': BEARER,
    'x-csrf-token': ct0,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'content-type': 'application/json'
  };

  // ── 3. Auto-discover GraphQL query IDs from x.com's JS bundles ────────────────
  // x.com embeds queryId mappings in its webpack JS chunks
  async function findGraphQLIds() {
    const ids = {};
    try {
      // Find the main JS bundle URLs from the page
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const bundleUrls = scripts
        .map(s => s.src)
        .filter(s => s.includes('abs.twimg.com') || s.includes('cdn.') || s.includes('/client-web'));

      console.log(`  Durchsuche ${bundleUrls.length} JS-Bundles...`);

      for (const url of bundleUrls) {
        try {
          const res = await fetch(url);
          const text = await res.text();

          // Pattern 1: queryId:"xxxxx",operationName:"Following"
          const matches = text.matchAll(/queryId:\s*"([^"]+)",\s*operationName:\s*"([^"]+)"/g);
          for (const m of matches) {
            ids[m[2]] = m[1];
          }

          // Pattern 2: {queryId:"xxxxx",operationName:"Following",operationType:"query"}
          const matches2 = text.matchAll(/"queryId"\s*:\s*"([^"]+)"\s*,\s*"operationName"\s*:\s*"([^"]+)"/g);
          for (const m of matches2) {
            ids[m[2]] = m[1];
          }

          // Pattern 3: e.exports={queryId:"xxx",operationName:"Following"
          const matches3 = text.matchAll(/exports\s*=\s*\{[^}]*queryId:\s*"([^"]+)"[^}]*operationName:\s*"([^"]+)"/g);
          for (const m of matches3) {
            ids[m[2]] = m[1];
          }

          if (Object.keys(ids).length > 5) break; // Found enough
        } catch (e) {
          // Skip failed script fetches
        }
      }
    } catch (e) {
      console.log('  ⚠️ Bundle-Analyse fehlgeschlagen:', e.message);
    }

    // Also try to intercept from performance entries
    try {
      const entries = performance.getEntriesByType('resource');
      for (const entry of entries) {
        const match = entry.name.match(/\/graphql\/([^/]+)\/(\w+)/);
        if (match) {
          ids[match[2]] = match[1];
        }
      }
    } catch (e) {}

    return ids;
  }

  const queryIds = await findGraphQLIds();
  console.log('📋 Gefundene GraphQL Query-IDs:', Object.keys(queryIds).join(', '));

  // ── 4. Get current user profile ───────────────────────────────────────────────
  let profile = null;

  // Method A: Try GraphQL Viewer query
  if (queryIds['Viewer']) {
    try {
      console.log('  → Versuche GraphQL Viewer...');
      const vars = encodeURIComponent(JSON.stringify({ withCommunitiesMemberships: false }));
      const features = encodeURIComponent(JSON.stringify({
        rweb_tipjar_consumption_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true
      }));
      const url = `/i/api/graphql/${queryIds['Viewer']}/Viewer?variables=${vars}&features=${features}`;
      const res = await fetch(url, { headers: baseHeaders, credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const viewer = data?.data?.viewer?.user_results?.result || data?.data?.viewer;
        if (viewer) {
          const legacy = viewer.legacy || viewer.result?.legacy || {};
          const handle = legacy.screen_name || viewer.screen_name || viewer.core?.screen_name || '';
          if (handle) {
            profile = {
              id_str: viewer.rest_id || legacy.id_str || 'id_' + handle,
              name: legacy.name || viewer.name || handle,
              screen_name: handle,
              profile_image_url_https: legacy.profile_image_url_https || '',
              profile_banner_url: legacy.profile_banner_url || '',
              description: legacy.description || '',
              friends_count: legacy.friends_count || 0,
              followers_count: legacy.followers_count || 0,
              created_at: legacy.created_at || '',
              verified: legacy.verified || viewer.is_blue_verified || false
            };
            console.log('  ✅ Viewer: @' + profile.screen_name);
          }
        }
      }
    } catch (e) {
      console.log('  ⚠️ Viewer query fehlgeschlagen:', e.message);
    }
  }

  // Method B: Extract from DOM as fallback
  if (!profile) {
    console.log('  → Extrahiere Profil aus der Seite...');
    try {
      const profileBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (profileBtn) {
        const spans = profileBtn.querySelectorAll('span');
        let name = '', handle = '';
        for (const span of spans) {
          const text = span.textContent.trim();
          if (text.startsWith('@')) handle = text.slice(1);
          else if (text && !handle && text !== '…') name = text;
        }
        if (handle) {
          profile = {
            id_str: 'dom_' + handle,
            name: name || handle,
            screen_name: handle,
            profile_image_url_https: '',
            description: '',
            friends_count: 0,
            followers_count: 0
          };
          // Try to get avatar
          const avatar = profileBtn.querySelector('img');
          if (avatar) profile.profile_image_url_https = avatar.src;
          console.log('  ✅ Profil aus DOM: @' + handle);
        }
      }
    } catch (e) {}
  }

  // Method C: Try UserByScreenName with handle from URL
  if (!profile && queryIds['UserByScreenName']) {
    try {
      const profileLink = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
      const handle = profileLink?.href?.split('/').pop();
      if (handle) {
        const vars = encodeURIComponent(JSON.stringify({ screen_name: handle, withSafetyModeUserFields: true }));
        const features = encodeURIComponent(JSON.stringify({
          hidden_profile_subscriptions_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
          responsive_web_graphql_timeline_navigation_enabled: true
        }));
        const url = `/i/api/graphql/${queryIds['UserByScreenName']}/UserByScreenName?variables=${vars}&features=${features}`;
        const res = await fetch(url, { headers: baseHeaders, credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const user = data?.data?.user?.result;
          if (user) {
            const legacy = user.legacy || {};
            profile = {
              id_str: user.rest_id,
              name: legacy.name,
              screen_name: legacy.screen_name,
              profile_image_url_https: legacy.profile_image_url_https,
              profile_banner_url: legacy.profile_banner_url,
              description: legacy.description,
              friends_count: legacy.friends_count,
              followers_count: legacy.followers_count,
              created_at: legacy.created_at,
              verified: legacy.verified || user.is_blue_verified
            };
            console.log('  ✅ UserByScreenName: @' + profile.screen_name);
          }
        }
      }
    } catch (e) {}
  }

  if (!profile) {
    alert('❌ Konnte Profil nicht ermitteln.\n\nBitte stelle sicher dass du auf x.com eingeloggt bist (nicht auf der Login-Seite).');
    return;
  }

  // ── 5. Fetch Following List (GraphQL + REST Fallback) ─────────────────────────
  console.log('📋 Lade Following-Liste für @' + profile.screen_name + '...');
  let allFollowing = [];

  const followingQueryId = queryIds['Following'];
  if (followingQueryId) {
    let cursor = null;
    let page = 0;

    while (page < 100) { // Safety limit
      page++;
      try {
        const variables = {
          userId: profile.id_str,
          count: 50,
          includePromotedContent: false
        };
        if (cursor) variables.cursor = cursor;

        const features = {
          rweb_tipjar_consumption_enabled: true,
          responsive_web_graphql_exclude_directive_enabled: true,
          verified_phone_label_enabled: false,
          creator_subscriptions_tweet_preview_api_enabled: true,
          responsive_web_graphql_timeline_navigation_enabled: true,
          responsive_web_graphql_skip_user_profile_image_extensions_enabled: false
        };

        const url = `/i/api/graphql/${followingQueryId}/Following?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
        const res = await fetch(url, { headers: baseHeaders, credentials: 'include' });

        if (!res.ok) {
          console.log('  ⚠️ GraphQL Following status:', res.status);
          break;
        }

        const data = await res.json();
        const userRes = data?.data?.user?.result;
        const timelineObj = userRes?.timeline?.timeline || userRes?.timeline || userRes?.timeline_v2?.timeline || data?.data?.user?.timeline?.timeline;
        const instructions = timelineObj?.instructions || [];

        let foundUsers = false;
        let nextCursor = null;

        for (const instruction of instructions) {
          const entries = instruction.entries || (instruction.entry ? [instruction.entry] : []);
          for (const entry of entries) {
            // User entries
            let userObj = entry.content?.itemContent?.user_results?.result || entry.itemContent?.user_results?.result;
            if (userObj) {
              if (userObj.result) userObj = userObj.result;
              const legacy = userObj.legacy || userObj.result?.legacy || {};
              const restId = userObj.rest_id || legacy.id_str || userObj.id_str;
              const name = legacy.name || userObj.name || '';
              const screen_name = legacy.screen_name || userObj.screen_name || '';

              if (screen_name || name) {
                const statusObj = legacy.status ||
                                  userObj.status ||
                                  userObj.pinned_tweet_results?.result?.legacy ||
                                  userObj.tweet_results?.result?.legacy ||
                                  null;

                allFollowing.push({
                  id_str: restId,
                  name: name || screen_name,
                  screen_name: screen_name || name,
                  profile_image_url_https: legacy.profile_image_url_https || userObj.avatar || '',
                  profile_banner_url: legacy.profile_banner_url || '',
                  description: legacy.description || '',
                  followers_count: legacy.followers_count || 0,
                  friends_count: legacy.friends_count || 0,
                  created_at: legacy.created_at || userObj.core?.created_at || '',
                  location: legacy.location || userObj.location || userObj.core?.location || '',
                  url: legacy.url || '',
                  verified: legacy.verified || userObj.is_blue_verified || false,
                  followed_by: legacy.followed_by || false,
                  status: statusObj,
                  entities: legacy.entities,
                  core: userObj.core || null
                });
                foundUsers = true;
              }
            }

            // Pagination Cursor
            const itemContent = entry.content || entry.itemContent || {};
            if (itemContent.cursorType === 'Bottom' || itemContent.value?.startsWith?.('scroll:') || entry.entryId?.includes('cursor-bottom')) {
              nextCursor = itemContent.value || itemContent.cursor?.value || entry.content?.value;
            }
          }
        }

        console.log(`  GraphQL Seite ${page}: ${allFollowing.length} Profile geladen`);

        if (!foundUsers || !nextCursor) break;
        cursor = nextCursor;

        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.log('  ❌ GraphQL Fehler:', e.message);
        break;
      }
    }
  }

  // ── 5b. REST v1.1 Fallback (Runs if GraphQL returns 0 or fails) ─────────────
  if (allFollowing.length === 0) {
    console.log('  🔄 Versuche REST-v1.1 Fallback für Following-Liste...');
    let restCursor = '-1';
    let restPage = 0;

    while (restPage < 30) {
      restPage++;
      try {
        const restUrl = `/i/api/1.1/friends/list.json?count=200&cursor=${encodeURIComponent(restCursor)}&skip_status=false&include_user_entities=true`;
        const restRes = await fetch(restUrl, { headers: baseHeaders, credentials: 'include' });
        if (!restRes.ok) {
          console.log('  ⚠️ REST Following Status:', restRes.status);
          break;
        }

        const restData = await restRes.json();
        const users = restData.users || [];
        if (users.length === 0) break;

        for (const u of users) {
          allFollowing.push({
            id_str: u.id_str,
            name: u.name,
            screen_name: u.screen_name,
            profile_image_url_https: u.profile_image_url_https,
            profile_banner_url: u.profile_banner_url,
            description: u.description,
            followers_count: u.followers_count || 0,
            friends_count: u.friends_count || 0,
            created_at: u.created_at,
            location: u.location,
            verified: u.verified || false,
            followed_by: u.followed_by || false,
            status: u.status || u.pinned_tweet || null,
            entities: u.entities
          });
        }

        console.log(`  REST Seite ${restPage}: Insgesamt ${allFollowing.length} Profile geladen`);

        if (!restData.next_cursor_str || restData.next_cursor_str === '0') break;
        restCursor = restData.next_cursor_str;

        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.log('  ❌ REST Fallback Fehler:', e.message);
        break;
      }
    }
  }

  // ── 5c. Tweet Auto-Enrichment (Fetches latest tweet for accounts missing status) ──
  const missingStatusAccounts = allFollowing.filter(a => !a.status);
  if (missingStatusAccounts.length > 0) {
    console.log(`⚡ Lade neueste Tweets für ${missingStatusAccounts.length} Accounts nach...`);
    const limitBatch = missingStatusAccounts.slice(0, 200); // Batch fetch top 200
    let enrichedCount = 0;

    for (let i = 0; i < limitBatch.length; i += 6) {
      const chunk = limitBatch.slice(i, i + 6);
      await Promise.all(chunk.map(async (acc) => {
        try {
          const twUrl = `/i/api/1.1/statuses/user_timeline.json?user_id=${encodeURIComponent(acc.id_str)}&count=1&trim_user=true&include_my_retweet=false`;
          const twRes = await fetch(twUrl, { headers: baseHeaders, credentials: 'include' });
          if (twRes.ok) {
            const twList = await twRes.json();
            if (twList && twList.length > 0 && twList[0].created_at) {
              acc.status = twList[0];
              enrichedCount++;
            }
          }
        } catch (err) {}
      }));
      await new Promise(r => setTimeout(r, 150));
    }
    console.log(`✅ ${enrichedCount} neueste Beitrags-Updates erfolgreich ergänzt!`);
  } else {
    console.log('  ⚠️ Following GraphQL Query-ID nicht gefunden. Versuche alternatives Abrufen...');

    // Fallback: Monkey-patch fetch, navigate to following page, capture responses
    alert('⚠️ Following-Query nicht automatisch gefunden.\n\nAlternativer Ansatz: Bitte öffne x.com/' + profile.screen_name + '/following in einem neuen Tab.\n\nDann führe dieses Skript erneut aus — es wird die Daten aus den Netzwerk-Anfragen abfangen.');
  }

  console.log('✅ ' + allFollowing.length + ' Following-Profile geladen!');

  // ── 6. Send / Export data ─────────────────────────────────────────────────────
  if (allFollowing.length === 0 && profile) {
    const proceed = confirm(
      '⚠️ Profil gefunden (@' + profile.screen_name + '), aber Following-Liste konnte nicht geladen werden.\n\n' +
      'Möchtest du trotzdem das Profil importieren? (Following-Liste kann später nachgeladen werden)'
    );
    if (!proceed) return;
  }

  const payload = {
    profile: profile,
    following: allFollowing,
    bearer: BEARER,
    auth_token: '',
    ct0: ct0,
    queryIds
  };

  const jsonString = JSON.stringify(payload);

  // Export via Clipboard (primary) and JSON File Download (backup)
  let copied = false;
  try {
    await navigator.clipboard.writeText(jsonString);
    copied = true;
  } catch (e) {
    console.log('  ⚠️ Zwischenablage-Zugriff eingeschränkt:', e.message);
  }

  // Trigger JSON file download
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `csx_import_${profile.screen_name || 'following'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.log('  ⚠️ Datei-Download fehlgeschlagen:', e.message);
  }

  alert(
    '🎉 ERFOLGREICH!\n\n' +
    '👥 ' + allFollowing.length + ' Profile von @' + (profile.screen_name || 'X-User') + ' geladen.\n\n' +
    (copied ? '📋 Daten wurden in deine ZWISCHENABLAGE kopiert!\n' : '') +
    '📁 Eine Datei (csx_import.json) wurde in deinen Downloads gespeichert.\n\n' +
    '👉 Wechsle zu CleanSweep X & klicke "Aus Zwischenablage importieren".\n' +
    '💡 TIPP: Lasse diesen X.com Tab geöffnet! Swipes & Entfolgen in CleanSweep X werden jetzt in Echtzeit live auf X.com ausgeführt!'
  );

  // ── 7. Start Live Bridge Daemon Loop on x.com ─────────────────────────────
  if (!window.__csx_daemon_active) {
    window.__csx_daemon_active = true;
    console.log('📡 CleanSweep X Live Unfollow Daemon gestartet. Lasse diesen Tab offen, um Swipes in Echtzeit auf X.com auszuführen!');

    const formatPreviewTweets = (rawTweets, handle) => {
      if (!Array.isArray(rawTweets)) return [];
      const lowerHandle = String(handle || '').replace(/^@/, '').toLowerCase();
      const parsed = rawTweets
        .filter((t) => t && (t.full_text || t.text))
        .map((t) => {
          let text = String(t.full_text || t.text).trim();
          const isRT = Boolean(t.retweeted_status || /^rt\s+@/i.test(text));
          const replyUser = String(t.in_reply_to_screen_name || '').replace(/^@/, '').toLowerCase();
          const isReply = Boolean(
            (t.in_reply_to_status_id_str || t.in_reply_to_status_id)
            && replyUser
            && replyUser !== lowerHandle
          );
          const isQuote = Boolean(t.is_quote_status || t.quoted_status);
          const created = t.created_at ? new Date(t.created_at) : null;
          const createdAt = created && !isNaN(created.getTime())
            ? created.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
            : '';
          return {
            id: t.id_str || String(t.id || ''),
            text,
            createdAt,
            likes: t.favorite_count || 0,
            retweets: t.retweet_count || 0,
            replies: t.reply_count || 0,
            image: t.entities?.media?.[0]?.media_url_https || '',
            isRT,
            isReply,
            isQuote,
            replyTo: isReply ? `@${t.in_reply_to_screen_name}` : null
          };
        })
        .filter((t) => !t.isRT && !t.isReply);
      return parsed.slice(0, 3);
    };

    setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3001/api/x/pending_unfollows');
        if (res.ok) {
          const data = await res.json();
          const tasks = data.tasks || [];
          for (const task of tasks) {
            console.log(`🚫 Führte Live-Entfolgen aus für @${task.handle} (${task.userId})...`);
            const ct0Token = document.cookie.match(/ct0=([^;]+)/)?.[1] || ct0;
            const unfollowRes = await fetch('https://x.com/i/api/1.1/friendships/destroy.json', {
              method: 'POST',
              headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'x-csrf-token': ct0Token,
                'x-twitter-active-user': 'yes',
                'x-twitter-auth-type': 'OAuth2Session'
              },
              body: 'user_id=' + encodeURIComponent(task.userId)
            });

            const isSuccess = unfollowRes.ok;
            let errText = '';
            if (!isSuccess) {
              errText = await unfollowRes.text();
            }

            try {
              await fetch('http://localhost:3001/api/x/unfollow_result', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ userId: task.userId, handle: task.handle, success: isSuccess, error: errText })
              });
            } catch (e) {}
          }
        }
      } catch (err) {}

      try {
        const tweetRes = await fetch('http://localhost:3001/api/x/pending_tweet_fetches');
        if (tweetRes.ok) {
          const tweetData = await tweetRes.json();
          const tweetTasks = tweetData.tasks || [];
          for (const task of tweetTasks) {
            try {
              const qs = task.userId && /^\d+$/.test(String(task.userId))
                ? `user_id=${encodeURIComponent(task.userId)}`
                : `screen_name=${encodeURIComponent(task.handle)}`;
              const twUrl = `/i/api/1.1/statuses/user_timeline.json?${qs}&count=100&include_rts=false&exclude_replies=true&tweet_mode=extended`;
              const twFetch = await fetch(twUrl, { headers: baseHeaders, credentials: 'include' });
              const raw = twFetch.ok ? await twFetch.json() : [];
              const tweets = formatPreviewTweets(raw, task.handle);
              await fetch('http://localhost:3001/api/x/tweet_fetch_result', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ handle: task.handle, tweets, requestId: task.requestId })
              });
            } catch (e) {
              try {
                await fetch('http://localhost:3001/api/x/tweet_fetch_result', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ handle: task.handle, tweets: [], requestId: task.requestId })
                });
              } catch (err2) {}
            }
          }
        }
      } catch (err) {}
    }, 1000);
  }
})();
