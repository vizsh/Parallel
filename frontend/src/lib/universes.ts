/** The comedy layer's scripts: four beats and an archetype badge per universe, per ping type. */
export type Script = { a: string[]; aBadge: string; b: string[]; bBadge: string }

export const SCRIPTS: Record<string, Script> = {
  social_like: {
    a: ['You tap. “Just checking who liked it.”', 'Reel #1 is a cat. Reel #23 is a cat doing taxes.', 'You now know four sushi recipes and zero lines of your {task}.', 'Year 2047: undefeated national Thumb Athletics champion.'],
    aBadge: 'Professional Thumb Athlete',
    b: ['Ping held back. Phone goes quiet.', 'Your {task} block keeps its momentum. Something clicks.', 'You finish. The like is still there, waiting, unbothered.', 'Year 2047: flying your own jet over the Arabian Sea.'],
    bBadge: 'Main Character Energy',
  },
  video_reco: {
    a: ['“It’s only a 9-minute video.”', 'Autoplay. Autoplay. Autoplay.', 'You watched someone else do 24 hours of {task}. You did none.', 'Year 2047: YouTube sends you a plaque for loyalty.'],
    aBadge: 'Autoplay Survivor (barely)',
    b: ['Video saved to Watch Later. Forever later.', 'You stay in {task}. Your brain thanks you quietly.', 'You watch it tonight as a reward. It slaps harder.', 'Year 2047: you are the one making the 24-hour video.'],
    bBadge: 'Delayed Gratification Wizard',
  },
  social_dm: {
    a: ['“Bro did you see this 😂” — you did not, so you do.', '41 messages later the group chat is planning Goa.', 'Your {task} is now a distant memory from a past life.', 'Year 2047: Goa trip still in planning. You are the admin.'],
    aBadge: 'Group Chat Historian',
    b: ['DM queued for your next checkpoint.', 'You reply in one go later. Legend status preserved.', '{task} done before the meme even went stale.', 'Year 2047: you actually went to Goa. Twice.'],
    bBadge: 'Survived the Group Chat Apocalypse',
  },
  news: {
    a: ['“Breaking:” — your focus breaks too.', 'Thread. Quote tweet. A take on the take.', 'You have strong opinions on a country you just learned exists.', 'Year 2047: still refreshing. Still breaking.'],
    aBadge: 'Doomscroll Correspondent',
    b: ['Headline saved for the evening digest.', '{task} continues. The world keeps spinning without you.', 'Evening: you read one good summary in 3 minutes.', 'Year 2047: calm, informed, slightly smug.'],
    bBadge: 'Zen News Monk',
  },
  promo: {
    a: ['“70% off? I should just look.”', 'Cart: 1 keyboard, 2 plants, a hat for your cat.', 'Your {task} is out of stock.', 'Year 2047: owner of 312 things you never needed.'],
    aBadge: 'Cart Collector',
    b: ['Sale muted. It will be back. It always is.', 'You keep {task}-ing. Wallet sighs in relief.', 'Saved money, saved minutes, saved dignity.', 'Year 2047: you buy the jet. Not the cat hat.'],
    bBadge: 'Immune to Flash Sales',
  },
}

export const GENERIC: Script = {
  a: ['You open it “for a second”.', 'One tab becomes six.', 'You return to {task} and forget where you were.', 'Year 2047: still looking for that one tab.'],
  aBadge: 'Tab Hoarder',
  b: ['Held until your next natural break.', '{task} stays warm in your head.', 'You handle it in one calm minute later.', 'Year 2047: the calmest person in every room.'],
  bBadge: 'Flow Keeper',
}

/** Every collectible card: the two archetype badges of each scripted ping type, plus the generic pair. */
export const BADGES = [...Object.entries(SCRIPTS), ['other', GENERIC] as const].flatMap(([cat, sc]) => [
  { id: `${cat}:a`, name: sc.aBadge, side: 'a' as const, category: cat },
  { id: `${cat}:b`, name: sc.bBadge, side: 'b' as const, category: cat },
])
export function badgeFor(category: string, side: 'a' | 'b') {
  const key = category in SCRIPTS ? category : 'other'
  return BADGES.find((b) => b.id === `${key}:${side}`)!
}

