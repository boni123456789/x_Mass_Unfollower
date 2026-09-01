export const CURRENT_USER = {
  id: "user_me",
  name: "Marco Schneider",
  handle: "marcoschneider",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
  bio: "Tech Lead & Web Enthusiast. Building tools for the modern web 🚀 | Next.js, React, AI",
  followingCount: 482,
  followersCount: 1240,
  joined: "March 2018",
  verified: true
};

export const INITIAL_ACCOUNTS = [
  {
    id: "acc_1",
    name: "Dawood",
    handle: "dawoodkhan254",
    avatar: "https://pbs.twimg.com/profile_images/1690013444855902208/c7bS6Q-S_400x400.jpg",
    banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
    bio: "Founder at CrowdReply • AI agent & AEO systems",
    followersCount: 1230,
    followingCount: 341,
    joinedDate: "May 2017",
    location: "Lisbon",
    website: "",
    verified: true,
    verifiedType: "blue",
    followsYou: false,
    lastActive: "Heute (9 Std.)",
    lastActiveTimestamp: Date.now() - 9 * 60 * 60 * 1000,
    isFollowing: true,
    category: "AI & Growth",
    interactions: {
      likesCount: 2,
      retweetsCount: 1,
      repliesCount: 0,
      lastInteraction: "Heute"
    },
    tweets: [
      {
        id: "tw_d1",
        text: "Grok Bot + AEO is going to make more agencies millionaires in 2026 than crypto ever did.\n\n1. open Grok Bot\n2. paste these prompts\n3. rank inside ChatGPT and charge $10k/month for a single client\n4. automate everything with 6 bots\n\nsetup done.",
        createdAt: "Vor 9 Std.",
        likes: 15,
        retweets: 2,
        replies: 0
      },
      {
        id: "tw_d2",
        text: "agencies charging $10k/mo after pasting this article into Grok Bot:",
        createdAt: "Vor 10 Std.",
        likes: 28,
        retweets: 4,
        replies: 1,
        isReply: true,
        replyTo: "@grokbot_user"
      },
      {
        id: "tw_d3",
        text: "keep calling me delusional...but I will keep repeating this...\n\nGrok Bot + AI visibility is going to make more solo millionaires in 2026 than crypto ever did.\n\ndon't bookmark this if it crosses your timeline.\n\njust paste this entire article into Grok Bot.\n\nworth the read.",
        createdAt: "Vor 11 Std.",
        likes: 45,
        retweets: 7,
        replies: 3
      }
    ]
  },
  {
    id: "acc_2",
    name: "Crypto Alpha Bot",
    handle: "crypto_alpha_signals99",
    avatar: "https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=150&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1000&auto=format&fit=crop&q=80",
    bio: "⚡ 100x Potential Coins 📈 Daily Trading Signals 💎 DM for VIP Group Access | Not financial advice",
    followersCount: 8400,
    followingCount: 14200,
    joinedDate: "November 2023",
    location: "Metaverse",
    website: "t.me/cryptoalpha",
    verified: false,
    followsYou: false,
    lastActive: "Vor 7 Monaten (15. Jan 2026)",
    lastActiveTimestamp: Date.now() - 210 * 24 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Spam & Inactive",
    interactions: {
      likesCount: 0,
      retweetsCount: 0,
      repliesCount: 0,
      lastInteraction: "Never"
    },
    tweets: [
      {
        id: "tw_201",
        text: "🚀 $MOON token presale is LIVE now! Don't miss 500x return. Click link in bio to buy early!",
        createdAt: "Vor 7 Monaten (15. Jan 2026)",
        likes: 12,
        retweets: 4,
        replies: 1
      },
      {
        id: "tw_202",
        text: "📈 Next 100x gem loading... drop your wallet address below for early allocation access!",
        createdAt: "Vor 7 Monaten (12. Jan 2026)",
        likes: 8,
        retweets: 2,
        replies: 0
      },
      {
        id: "tw_203",
        text: "Bitcoin testing key resistance level. VIP group subscribers received signals 3 hours ago.",
        createdAt: "Vor 8 Monaten (02. Jan 2026)",
        likes: 15,
        retweets: 1,
        replies: 2
      }
    ]
  },
  {
    id: "acc_3",
    name: "Sarah Jenkins 🎨 UI Design",
    handle: "sarah_design",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80",
    bio: "Design System Lead @ Stripe. Crafting micro-interactions, Figma design systems & dark mode UIs.",
    followersCount: 45200,
    followingCount: 610,
    joinedDate: "March 2017",
    location: "London, UK",
    website: "sarahjenkins.design",
    verified: true,
    verifiedType: "blue",
    followsYou: true,
    lastActive: "Vor 1 Std. (31. Aug 2026)",
    lastActiveTimestamp: Date.now() - 60 * 60 * 1000,
    isFollowing: true,
    category: "Design & UX",
    interactions: {
      likesCount: 38,
      retweetsCount: 12,
      repliesCount: 5,
      lastInteraction: "Yesterday"
    },
    tweets: [
      {
        id: "tw_301",
        text: "Why smooth spring physics micro-animations improve perceived interface latency by over 30%. A detailed visual breakdown 🧵👇",
        createdAt: "Vor 1 Std. (31. Aug 2026)",
        likes: 1450,
        retweets: 380,
        replies: 64,
        image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: "tw_302",
        text: "Just dropped a free Figma library for modern dashboard design tokens. Hope it helps someone!",
        createdAt: "Vor 2 Tagen (29. Aug 2026)",
        likes: 890,
        retweets: 210,
        replies: 31
      },
      {
        id: "tw_303",
        text: "Typography tip: Always align line-height to a 4px baseline grid for crisp UI rendering across screen densities.",
        createdAt: "Vor 4 Tagen (27. Aug 2026)",
        likes: 1120,
        retweets: 195,
        replies: 42
      }
    ]
  },
  {
    id: "acc_4",
    name: "Alex Dev",
    handle: "alex_builds",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&auto=format&fit=crop&q=80",
    bio: "Fullstack Dev building open source developer tools. TypeScript, Rust, Vite & WebAssembly.",
    followersCount: 18900,
    followingCount: 490,
    joinedDate: "July 2019",
    location: "Berlin, Germany",
    website: "alexdev.sh",
    verified: true,
    verifiedType: "blue",
    followsYou: true,
    lastActive: "Vor 3 Std. (31. Aug 2026)",
    lastActiveTimestamp: Date.now() - 3 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Development",
    interactions: {
      likesCount: 22,
      retweetsCount: 4,
      repliesCount: 8,
      lastInteraction: "4 days ago"
    },
    tweets: [
      {
        id: "tw_401",
        text: "Vite + React is honestly unbeatable for instant local HMR. What developer setup are you using in 2026?",
        createdAt: "Vor 3 Std. (31. Aug 2026)",
        likes: 620,
        retweets: 78,
        replies: 112
      },
      {
        id: "tw_402",
        text: "Rewriting our core data parsing pipeline in Rust cut memory usage by 75%. WebAssembly bindings made integration seamless.",
        createdAt: "Vor 2 Tagen (29. Aug 2026)",
        likes: 1420,
        retweets: 310,
        replies: 54
      },
      {
        id: "tw_403",
        text: "Clean architecture tip: Keep component logic separate from API transport layers to make unit testing effortless.",
        createdAt: "Vor 5 Tagen (26. Aug 2026)",
        likes: 850,
        retweets: 140,
        replies: 28
      }
    ]
  },
  {
    id: "acc_5",
    name: "Mila Chervenkova 🍩",
    handle: "MilaChervenkova",
    avatar: "https://pbs.twimg.com/profile_images/1690013444855902208/c7bS6Q-S_400x400.jpg",
    banner: "",
    bio: "Solopreneur & SEO opportunist doing what i luv: run | row | lift | read | money 💰 Growing my portfolio of affiliate websites with AI+SEO while living slow.",
    followersCount: 2915,
    followingCount: 526,
    joinedDate: "November 2011",
    location: "AMA Consultations ➔",
    website: "milachervenkova.kit.com",
    verified: true,
    verifiedType: "blue",
    followsYou: false,
    lastActive: "Vor 2 Std. (Heute)",
    lastActiveTimestamp: Date.now() - 2 * 60 * 60 * 1000,
    isFollowing: true,
    category: "SEO & Solopreneur",
    interactions: {
      likesCount: 9,
      retweetsCount: 2,
      repliesCount: 0,
      lastInteraction: "Heute"
    },
    tweets: [
      {
        id: "tw_501",
        text: "Unless you are capable of doing it yourself, don't you ever start a home renovation...🥲",
        createdAt: "Vor 2 Std.",
        likes: 16,
        retweets: 0,
        replies: 5
      },
      {
        id: "tw_502",
        text: "Here is something juicy from my international affiliate website. The top 2 highest-paying customers are from 🇮🇱 Israel and 🇸🇦 Saudi Arabia, and the 🇺🇸 USA is not even in my top 10. I'll show you how I build these affiliate websites soon. Get notified here: milachervenkova.kit.com",
        createdAt: "31. Aug",
        likes: 17,
        retweets: 1,
        replies: 0
      },
      {
        id: "tw_503",
        text: "Phase 2: ✅. All 70 articles are indexed, I didn't have to do anything about it, except for submitting my sitemap to Bing and GSC. Next: 30 days of building parasite pages and backlinks. 😤\n\n✅ Phase 1: Bought and EMD .com + design and built-in templates ready\n✅ Phase 2:",
        createdAt: "30. Aug",
        likes: 24,
        retweets: 3,
        replies: 2
      }
    ]
  },
  {
    id: "acc_6",
    name: "Old Account (Inactive)",
    handle: "ghost_user_2014",
    avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png",
    banner: "",
    bio: "Just another twitter account created long ago.",
    followersCount: 14,
    followingCount: 430,
    joinedDate: "April 2014",
    location: "",
    website: "",
    verified: false,
    followsYou: false,
    lastActive: "Vor 3 Jahren (10. Aug 2023)",
    lastActiveTimestamp: Date.now() - 1000 * 24 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Inactive / Egg",
    interactions: {
      likesCount: 0,
      retweetsCount: 0,
      repliesCount: 0,
      lastInteraction: "Never"
    },
    tweets: [
      {
        id: "tw_601",
        text: "Testing out this Twitter app for the first time...",
        createdAt: "Vor 3 Jahren (10. Aug 2023)",
        likes: 1,
        retweets: 0,
        replies: 0
      },
      {
        id: "tw_602",
        text: "Hello Twitter world! Looking forward to exploring new accounts.",
        createdAt: "Vor 3 Jahren (02. Aug 2023)",
        likes: 2,
        retweets: 0,
        replies: 0
      },
      {
        id: "tw_603",
        text: "Setting up my original account profile details.",
        createdAt: "Vor 3 Jahren (15. Jul 2023)",
        likes: 0,
        retweets: 0,
        replies: 0
      }
    ]
  },
  {
    id: "acc_7",
    name: "Dr. Marcus Thorne",
    handle: "marcus_ai_lab",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1000&auto=format&fit=crop&q=80",
    bio: "AI Research Scientist @ Stanford. Studying autonomous agent architectures and alignment.",
    followersCount: 89400,
    followingCount: 420,
    joinedDate: "May 2015",
    location: "Palo Alto, CA",
    website: "stanford.edu/~mthorne",
    verified: true,
    verifiedType: "blue",
    followsYou: true,
    lastActive: "Vor 4 Std. (31. Aug 2026)",
    lastActiveTimestamp: Date.now() - 4 * 60 * 60 * 1000,
    isFollowing: true,
    category: "AI & Tech",
    interactions: {
      likesCount: 19,
      retweetsCount: 6,
      repliesCount: 3,
      lastInteraction: "5 days ago"
    },
    tweets: [
      {
        id: "tw_701",
        text: "The shift towards local-first browser subagents is dramatically changing how web applications interact with backend APIs.",
        createdAt: "Vor 4 Std. (31. Aug 2026)",
        likes: 950,
        retweets: 180,
        replies: 34
      },
      {
        id: "tw_702",
        text: "New paper on autonomous agent memory consolidation accepted at NeurIPS 2026. Pre-print available on arXiv.",
        createdAt: "Vor 3 Tagen (28. Aug 2026)",
        likes: 2100,
        retweets: 480,
        replies: 82
      },
      {
        id: "tw_703",
        text: "Evaluating reasoning trajectory efficiency across complex multi-step tool calls.",
        createdAt: "Vor 6 Tagen (25. Aug 2026)",
        likes: 740,
        retweets: 120,
        replies: 19
      }
    ]
  },
  {
    id: "acc_8",
    name: "NFT Daily Airdrops",
    handle: "free_nft_drop_now",
    avatar: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80",
    banner: "",
    bio: "🎁 CLAIM YOUR FREE SOLANA & ETH AIRDROP HERE! 100% Guaranteed ⬇️",
    followersCount: 320,
    followingCount: 9800,
    joinedDate: "January 2024",
    location: "Web3",
    website: "claim-free-air-drop.xyz",
    verified: false,
    followsYou: false,
    lastActive: "Vor 1 Jahr (20. Aug 2025)",
    lastActiveTimestamp: Date.now() - 365 * 24 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Spam & Inactive",
    interactions: {
      likesCount: 0,
      retweetsCount: 0,
      repliesCount: 0,
      lastInteraction: "Never"
    },
    tweets: [
      {
        id: "tw_801",
        text: "🔥 10,000 FREE PASSES LEFT! Retweet + drop your address below!",
        createdAt: "Vor 1 Jahr (20. Aug 2025)",
        likes: 5,
        retweets: 2,
        replies: 0
      },
      {
        id: "tw_802",
        text: "⚡ Final round of Solana mystery box giveaways ending in 2 hours!",
        createdAt: "Vor 1 Jahr (18. Aug 2025)",
        likes: 3,
        retweets: 1,
        replies: 0
      },
      {
        id: "tw_803",
        text: "Claiming window now open for whitelist members. Visit link in bio.",
        createdAt: "Vor 1 Jahr (10. Aug 2025)",
        likes: 8,
        retweets: 4,
        replies: 1
      }
    ]
  },
  {
    id: "acc_9",
    name: "Elena Rostova",
    handle: "elena_code",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&auto=format&fit=crop&q=80",
    bio: "Senior Frontend Engineer. Open source contributor. Talking CSS grid, animations and performance.",
    followersCount: 27400,
    followingCount: 340,
    joinedDate: "October 2018",
    location: "Amsterdam, NL",
    website: "elena.dev",
    verified: true,
    verifiedType: "blue",
    followsYou: true,
    lastActive: "Vor 6 Std. (31. Aug 2026)",
    lastActiveTimestamp: Date.now() - 6 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Development",
    interactions: {
      likesCount: 42,
      retweetsCount: 8,
      repliesCount: 11,
      lastInteraction: "2 days ago"
    },
    tweets: [
      {
        id: "tw_901",
        text: "Don't sleep on CSS `@container` queries! They change how component-based architecture is structured forever.",
        createdAt: "Vor 6 Std. (31. Aug 2026)",
        likes: 1240,
        retweets: 290,
        replies: 45
      },
      {
        id: "tw_902",
        text: "Optimizing Web Vitals tip: Preloading primary LCP images can shave 400ms off perceived page render time.",
        createdAt: "Vor 2 Tagen (29. Aug 2026)",
        likes: 980,
        retweets: 160,
        replies: 23
      },
      {
        id: "tw_903",
        text: "Vanilla CSS nesting is now baseline supported across all major modern browsers 🎉",
        createdAt: "Vor 4 Tagen (27. Aug 2026)",
        likes: 1560,
        retweets: 340,
        replies: 51
      }
    ]
  },
  {
    id: "acc_10",
    name: "Automated News Bot",
    handle: "autonews_feed_bot",
    avatar: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80",
    banner: "",
    bio: "Automated RSS aggregator posting technology headlines.",
    followersCount: 1200,
    followingCount: 4500,
    joinedDate: "August 2021",
    location: "Server 404",
    website: "",
    verified: false,
    followsYou: false,
    lastActive: "Vor 8 Monaten (01. Jan 2026)",
    lastActiveTimestamp: Date.now() - 240 * 24 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Spam & Inactive",
    interactions: {
      likesCount: 0,
      retweetsCount: 0,
      repliesCount: 0,
      lastInteraction: "Never"
    },
    tweets: [
      {
        id: "tw_1001",
        text: "[RSS Feed] Server infrastructure update completed: Build #4910 successful.",
        createdAt: "Vor 8 Monaten (01. Jan 2026)",
        likes: 0,
        retweets: 0,
        replies: 0
      },
      {
        id: "tw_1002",
        text: "[RSS Feed] Automated vulnerability patch deployed across all regional clusters.",
        createdAt: "Vor 8 Monaten (28. Dez 2025)",
        likes: 0,
        retweets: 0,
        replies: 0
      },
      {
        id: "tw_1003",
        text: "[RSS Feed] Monthly scheduled database index optimization finished.",
        createdAt: "Vor 9 Monaten (15. Dez 2025)",
        likes: 0,
        retweets: 0,
        replies: 0
      }
    ]
  },
  {
    id: "acc_11",
    name: "Klaus Weber",
    handle: "klaus_tech_de",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80",
    bio: "Software Architect & Cloud Specialist. Speaker at EuroPython & Cloud Native Conf.",
    followersCount: 15300,
    followingCount: 510,
    joinedDate: "June 2016",
    location: "Frankfurt, Germany",
    website: "klausweber.de",
    verified: true,
    verifiedType: "blue",
    followsYou: true,
    lastActive: "Gestern (30. Aug 2026)",
    lastActiveTimestamp: Date.now() - 24 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Development",
    interactions: {
      likesCount: 9,
      retweetsCount: 1,
      repliesCount: 2,
      lastInteraction: "2 weeks ago"
    },
    tweets: [
      {
        id: "tw_1101",
        text: "Kubernetes 1.32 brings huge latency improvements for microservice mesh networking. Worth testing in staging!",
        createdAt: "Gestern (30. Aug 2026)",
        likes: 310,
        retweets: 45,
        replies: 12
      },
      {
        id: "tw_1102",
        text: "Slide deck from my EuroPython talk on asynchronous event streaming is now live on my website.",
        createdAt: "Vor 4 Tagen (27. Aug 2026)",
        likes: 620,
        retweets: 110,
        replies: 18
      },
      {
        id: "tw_1103",
        text: "Zero-downtime database migrations require strict backward compatibility in API schemas.",
        createdAt: "Vor 1 Woche (24. Aug 2026)",
        likes: 490,
        retweets: 85,
        replies: 14
      }
    ]
  },
  {
    id: "acc_12",
    name: "Startup Grind Daily",
    handle: "startupgrind_co",
    avatar: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=150&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&auto=format&fit=crop&q=80",
    bio: "Global community educating & connecting 3.5M entrepreneurs across 600 cities.",
    followersCount: 520000,
    followingCount: 1200,
    joinedDate: "December 2012",
    location: "Global",
    website: "startupgrind.com",
    verified: true,
    verifiedType: "gold",
    followsYou: false,
    lastActive: "Vor 2 Tagen (29. Aug 2026)",
    lastActiveTimestamp: Date.now() - 48 * 60 * 60 * 1000,
    isFollowing: true,
    category: "Business & Startups",
    interactions: {
      likesCount: 3,
      retweetsCount: 0,
      repliesCount: 0,
      lastInteraction: "1 month ago"
    },
    tweets: [
      {
        id: "tw_1201",
        text: "The top 3 traits of founders who scaled past $10M ARR without venture debt. Thread 🧵",
        createdAt: "Vor 2 Tagen (29. Aug 2026)",
        likes: 1890,
        retweets: 420,
        replies: 58
      },
      {
        id: "tw_1202",
        text: "Customer retention is the ultimate growth cheat code. Build products your users cannot live without.",
        createdAt: "Vor 4 Tagen (27. Aug 2026)",
        likes: 2450,
        retweets: 610,
        replies: 74
      },
      {
        id: "tw_1203",
        text: "Join our annual virtual summit next week featuring 50+ keynote speakers from top global accelerators.",
        createdAt: "Vor 1 Woche (24. Aug 2026)",
        likes: 1150,
        retweets: 280,
        replies: 39
      }
    ]
  }
];
