// Clone dialogue system — ambient character speech bubbles during combat.
// Pure data file. No runtime logic.

import type { CharacterId } from '@/types/roguelike';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DialogueLine {
  characterId: CharacterId;
  text: string;
}

export interface SquadIntroEntry {
  pair: [CharacterId, CharacterId];
  lines: [DialogueLine, DialogueLine];
}

export interface SingleLineEntry {
  characterId: CharacterId;
  lines: string[];
}

// ── Name → CharacterId resolver ──────────────────────────────────────────────

export function nameToCharId(name: string): CharacterId | null {
  if (name.includes('Napoleon'))  return 'napoleon';
  if (name.includes('Genghis'))   return 'genghis';
  if (name.includes('Vinci'))     return 'davinci';
  if (name.includes('Leonidas'))  return 'leonidas';
  if (name.includes('Sun-sin'))   return 'sunsin';
  if (name.includes('Beethoven')) return 'beethoven';
  if (name.includes('Huang'))     return 'huang';
  if (name.includes('Nelson'))    return 'nelson';
  if (name.includes('Hannibal'))  return 'hannibal';
  if (name.includes('Picasso'))   return 'picasso';
  if (name.includes('Teddy'))     return 'teddy';
  if (name.includes('Mansa'))     return 'mansa';
  if (name.includes("Vel'thar"))  return 'velthar';
  if (name.includes('Musashi'))   return 'musashi';
  if (name.includes('Cleopatra')) return 'cleopatra';
  if (name.includes('Tesla'))     return 'tesla';
  if (name.includes('Shaka'))     return 'shaka';
  return null;
}

// ── Character accent colors ──────────────────────────────────────────────────

export const CHARACTER_COLORS: Record<CharacterId, string> = {
  napoleon:  '#3b82f6',
  genghis:   '#ef4444',
  davinci:   '#a78bfa',
  leonidas:  '#f59e0b',
  sunsin:    '#06b6d4',
  beethoven: '#8b5cf6',
  huang:     '#d97706',
  nelson:    '#0ea5e9',
  hannibal:  '#16a34a',
  picasso:   '#ec4899',
  teddy:     '#78716c',
  mansa:     '#eab308',
  velthar:    '#7c3aed',
  musashi:   '#dc2626',
  cleopatra: '#d97706',
  tesla:     '#0891b2',
  shaka:     '#16a34a',
};

// Short display name for bubbles
export const CHARACTER_SHORT_NAMES: Record<CharacterId, string> = {
  napoleon:  'Napoleon',
  genghis:   'Genghis',
  davinci:   'Da Vinci',
  leonidas:  'Leonidas',
  sunsin:    'Sun-sin',
  beethoven: 'Beethoven',
  huang:     'Huang',
  nelson:    'Nelson',
  hannibal:  'Hannibal',
  picasso:   'Picasso',
  teddy:     'Teddy',
  mansa:     'Mansa',
  velthar:    "Vel'thar",
  musashi:   'Musashi',
  cleopatra: 'Cleopatra',
  tesla:     'Tesla',
  shaka:     'Shaka',
};

// ── Squad Intro (first fight, once per run) ──────────────────────────────────

export const SQUAD_INTROS: SquadIntroEntry[] = [
  {
    pair: ['napoleon', 'genghis'],
    lines: [
      { characterId: 'genghis',  text: 'Of course it\'s you.' },
      { characterId: 'napoleon', text: 'I wondered if you\'d be here.' },
    ],
  },
  {
    pair: ['napoleon', 'sunsin'],
    lines: [
      { characterId: 'napoleon', text: 'I\'ll take the center. You take the geometry.' },
      { characterId: 'sunsin',   text: 'I was going to suggest the same thing.' },
    ],
  },
  {
    pair: ['leonidas', 'hannibal'],
    lines: [
      { characterId: 'hannibal', text: 'Going left.' },
      { characterId: 'leonidas', text: 'I\'ll hold the center.' },
    ],
  },
  {
    pair: ['davinci', 'beethoven'],
    lines: [
      { characterId: 'davinci',   text: 'Change tempo?' },
      { characterId: 'beethoven', text: 'Already did.' },
    ],
  },
  {
    pair: ['teddy', 'mansa'],
    lines: [
      { characterId: 'teddy', text: 'BULLY! Best squad in the arena!' },
      { characterId: 'mansa', text: 'He is very loud. I am fond of him.' },
    ],
  },
  {
    pair: ['leonidas', 'napoleon'],
    lines: [
      { characterId: 'leonidas', text: 'I\'ll cover you.' },
      { characterId: 'napoleon', text: 'I know. You always do.' },
    ],
  },
  {
    pair: ['huang', 'davinci'],
    lines: [
      { characterId: 'huang',   text: 'You build things that move. I build things that last.' },
      { characterId: 'davinci', text: 'Imagine if we built something together.' },
    ],
  },
  {
    pair: ['nelson', 'sunsin'],
    lines: [
      { characterId: 'nelson', text: 'Another sea without water.' },
      { characterId: 'sunsin', text: 'The current is still here. You just have to feel it.' },
    ],
  },
  {
    pair: ['picasso', 'beethoven'],
    lines: [
      { characterId: 'picasso',   text: 'I see the composition. You hear it.' },
      { characterId: 'beethoven', text: 'Same thing. Different instrument.' },
    ],
  },
  {
    pair: ['hannibal', 'napoleon'],
    lines: [
      { characterId: 'hannibal', text: 'You would have been interesting to fight against.' },
      { characterId: 'napoleon', text: 'You would have lost.' },
    ],
  },
  // ── New pairs ──────────────────────────────────────────────────────────────
  {
    pair: ['beethoven', 'napoleon'],
    lines: [
      { characterId: 'napoleon', text: 'You opened with a march. I expected something louder.' },
      { characterId: 'beethoven', text: 'The Fifth opens with three notes and a pause. Patience, General.' },
    ],
  },
  {
    pair: ['teddy', 'leonidas'],
    lines: [
      { characterId: 'teddy',    text: 'They don\'t know what\'s coming! BULLY!' },
      { characterId: 'leonidas', text: 'They never do. That is the point.' },
    ],
  },
  {
    pair: ['mansa', 'picasso'],
    lines: [
      { characterId: 'mansa',   text: 'You see value in everything.' },
      { characterId: 'picasso', text: 'I learned it from your gold prices.' },
    ],
  },
  {
    pair: ['huang', 'hannibal'],
    lines: [
      { characterId: 'hannibal', text: 'The walls you build — do you trust them?' },
      { characterId: 'huang',    text: 'I trust what I built with my own hands.' },
    ],
  },
  {
    pair: ['genghis', 'leonidas'],
    lines: [
      { characterId: 'leonidas', text: 'I\'ve heard of you.' },
      { characterId: 'genghis',  text: 'Of course you have.' },
    ],
  },
  {
    pair: ['davinci', 'napoleon'],
    lines: [
      { characterId: 'davinci',  text: 'I have designed fourteen siege weapons for this arena.' },
      { characterId: 'napoleon', text: 'I know. I borrowed your notes.' },
    ],
  },
  // ── New character pairs ─────────────────────────────────────────────────────
  {
    pair: ['velthar', 'huang'],
    lines: [
      { characterId: 'huang',    text: 'Clone Zero. They say you were the first.' },
      { characterId: 'velthar',  text: 'Nor. And you also. Nor.' },
    ],
  },
  {
    pair: ['musashi', 'leonidas'],
    lines: [
      { characterId: 'leonidas', text: 'You fight with two swords.' },
      { characterId: 'musashi',  text: 'You fight behind a shield. Both work.' },
    ],
  },
  {
    pair: ['cleopatra', 'mansa'],
    lines: [
      { characterId: 'mansa',    text: 'Queen to queen. Shall we make the arena kneel?' },
      { characterId: 'cleopatra', text: 'I thought you\'d never ask.' },
    ],
  },
  {
    pair: ['tesla', 'davinci'],
    lines: [
      { characterId: 'davinci',  text: 'You went further than I did.' },
      { characterId: 'tesla',    text: 'You drew the blueprint. I just plugged it in.' },
    ],
  },
  {
    pair: ['shaka', 'genghis'],
    lines: [
      { characterId: 'genghis',  text: 'Bull horns. I like it.' },
      { characterId: 'shaka',    text: 'Cavalry wings. I approve.' },
    ],
  },
];

// ── On Kill (~20% chance) ────────────────────────────────────────────────────

export const ON_KILL_LINES: SingleLineEntry[] = [
  { characterId: 'napoleon',  lines: ['As expected.', 'Next objective.', 'The artillery does not lie.', 'Brilliant. Even for me.'] },
  { characterId: 'genghis',   lines: ['Next.', 'The steppe takes another.', 'They ran. The steppe is endless.', 'Strength is the only argument.'] },
  { characterId: 'leonidas',  lines: ['Hold.', 'The line holds.', 'For Sparta.', 'This is what warriors are made of.'] },
  { characterId: 'teddy',     lines: ['BULLY!', 'What a fight!', 'Dee-lighted!', 'Strenuous. Just how I like it.'] },
  { characterId: 'hannibal',  lines: ['They didn\'t see it coming.', 'The angle was there.', 'Rome will hear of this.', 'War is deception. And I never lose.'] },
  { characterId: 'nelson',    lines: ['England expects.', 'Signal: well done.', 'Trafalgar was easier.', 'One eye is enough to see victory.'] },
  { characterId: 'mansa',     lines: ['I take no joy in this.', 'A necessary cost.', 'Even my mercy has limits.', 'This victory was bought with something.'] },
  { characterId: 'picasso',   lines: ['The composition improves.', 'Better.', 'Every painting needs a void.', 'Destruction is also creation.'] },
  { characterId: 'beethoven', lines: ['Fortissimo.', 'The rhythm holds.', 'Da capo. From the top.', 'Even deaf, I hear this clearly.'] },
  { characterId: 'sunsin',    lines: ['The current takes them.', 'As the tide wills.', 'Yi Sun-sin does not lose.', 'They brought ships to a turtle fight.'] },
  { characterId: 'davinci',   lines: ['Fascinating. And unfortunate.', 'Noted.', 'I\'ll draw this from memory.', 'Science is occasionally violent.'] },
  { characterId: 'huang',     lines: ['This is how empires are built.', 'Another stone in the wall.', 'Centuries will remember this.', 'The empress does not fall.'] },
  { characterId: 'velthar',   lines: ['Kar-vol-zyn. The flame closes.', 'They fall. The tribe holds.', 'Another ash on the fire.', 'Dren. They did not.'] },
  { characterId: 'musashi',   lines: ['One stroke.', 'The sword does not hesitate.', 'Sixty-two.', 'Efficient.'] },
  { characterId: 'cleopatra', lines: ['Kneel. Or die. Your choice.', 'The serpent does not negotiate.', 'Caesar survived longer than you.', 'Another suitor, disappointed.'] },
  { characterId: 'tesla',     lines: ['Conducted.', 'Three. Six. Nine. Discharged.', 'The current found its path.', 'Edison could never.'] },
  { characterId: 'shaka',     lines: ['Impondo zankomo.', 'The bull horn closes.', 'USUTHU!', 'Another for the nation.'] },
];

// ── On Protect (heal/shield ally) ────────────────────────────────────────────

export const ON_PROTECT_LINES: SingleLineEntry[] = [
  { characterId: 'leonidas',  lines: ['Not today.', 'Behind me.', 'I have trained for this moment.', 'The shield is the weapon.'] },
  { characterId: 'mansa',     lines: ['Take this. It was never mine to keep.', 'What I have is yours.', 'Wealth means nothing if you fall.', 'I did not come this far to lose you.'] },
  { characterId: 'nelson',    lines: ['I have one eye and I see enough.', 'Every sailor under my command matters.', 'Not on my watch.', 'Signal: hold formation.'] },
  { characterId: 'napoleon',  lines: ['Stay behind me. That\'s an order.', 'I didn\'t come here to lose soldiers.', 'You are more valuable alive.', 'Move, and stay behind the cannon.'] },
  { characterId: 'genghis',   lines: ['The steppe protects its own.', 'No one is left behind on the ride.', 'You are mine to protect.', 'Ride together. That is the way.'] },
  { characterId: 'davinci',   lines: ['Hold still. I can fix this.', 'I designed something for exactly this.', 'Art is also medicine.', 'Don\'t move. I\'m working.'] },
  { characterId: 'teddy',     lines: ['Nobody dies on my watch!', 'FORWARD! I\'ll cover you!', 'A Rough Rider never retreats!', 'You\'re tougher than you know!'] },
  { characterId: 'beethoven', lines: ['Stay close. The music protects us.', 'I hear the danger before you do.', 'Rest. I will carry the melody.', 'Not yet. You are not done.'] },
  { characterId: 'sunsin',    lines: ['The turtle shields all who sail with her.', 'Get behind me. Now.', 'Formation holds as long as I breathe.', 'I have sailed worse waters. Hold on.'] },
  { characterId: 'hannibal',  lines: ['Survive. I need you for the second move.', 'Carthage does not abandon its own.', 'Stay. I have a plan for this.', 'Don\'t fall. The trap isn\'t sprung yet.'] },
  { characterId: 'picasso',   lines: ['Don\'t move. The frame needs you.', 'A painting without its subject is nothing.', 'Hold on. This is the interesting part.', 'Every composition needs contrast. Survive.'] },
  { characterId: 'huang',     lines: ['The empress does not lose her people.', 'China remembers those who stand firm.', 'I built walls to protect. Now I am the wall.', 'Not one more falls today.'] },
  { characterId: 'velthar',   lines: ['Behind me. Under the mountain.', 'Nol thar. Mother protects.', 'The fire does not let go.', 'I have done this for forty thousand years.'] },
  { characterId: 'musashi',   lines: ['Stay. I will handle this one.', 'Your blade is not needed here.', 'Rest. The duel is mine.', 'Niten Ichi — two swords. Enough for both of us.'] },
  { characterId: 'cleopatra', lines: ['Stay close. Queens protect their own.', 'The pharaoh watches over you.', 'Egypt does not lose her children.', 'Behind me, always.'] },
  { characterId: 'tesla',     lines: ['I\'ve calculated your odds. Let me help.', 'Stand back. High voltage.', 'The shield will hold. I designed it.', 'Grounded. You\'re safe.'] },
  { characterId: 'shaka',     lines: ['The nation does not fall.', 'Stand behind the shield.', 'You are Zulu. Zulu does not die alone.', 'Impondo — the horns protect the head.'] },
];

// ── On Low HP (<25%) — once per character per fight ──────────────────────────

export const ON_LOW_HP_LINES: SingleLineEntry[] = [
  { characterId: 'teddy',     lines: ['It takes more than that to kill a Bull Moose.', 'I was once shot mid-speech. I finished the speech.', 'Come on, then! I\'ve been in worse scrapes!', 'FORWARD! Always forward!'] },
  { characterId: 'leonidas',  lines: ['A position held long enough becomes sacred.', 'Sparta does not retreat. Sparta does not yield.', 'This is a good place to die. But not today.', 'Pain is a Spartan\'s oldest companion.'] },
  { characterId: 'napoleon',  lines: ['I have lost before. I learned.', 'Every great general has been at this point.', 'The cannon does not care if you\'re afraid.', 'A little blood and I think more clearly.'] },
  { characterId: 'hannibal',  lines: ['Cornered is where I do my best work.', 'Cannae looked worse than this.', 'Desperation is just creativity with urgency.', 'Rome couldn\'t finish me. Neither will you.'] },
  { characterId: 'genghis',   lines: ['I have survived worse winters.', 'The steppe starves you before it makes you.', 'The sky is still open above me.', 'Pain fades. The campaign does not.'] },
  { characterId: 'beethoven', lines: ['The music is not finished.', 'I composed the Ninth deaf. I can do this wounded.', 'Fortissimo. I am still here.', 'The symphony does not end until I say.'] },
  { characterId: 'sunsin',    lines: ['Twelve ships was enough. So is this.', 'I have bled into the sea before.', 'The admiral does not sink first.', 'I have faced three hundred ships. This is nothing.'] },
  { characterId: 'davinci',   lines: ['I have notes to finish.', 'I haven\'t finished the Vitruvian revisions.', 'Curiosity is a good reason to survive.', 'There is one more invention I want to try.'] },
  { characterId: 'huang',     lines: ['I was not built to fall here.', 'The wall was built with harder hands than these.', 'An empress falls last. I remember this.', 'Every stone was placed with blood. So can I hold.'] },
  { characterId: 'nelson',    lines: ['Not yet. The signal has not been given.', 'At Tenerife I lost my arm. I kept going.', 'England has not lost yet. So neither have I.', 'One more broadside. I can take it.'] },
  { characterId: 'picasso',   lines: ['The painting is not complete.', 'Guernica wasn\'t finished in a day.', 'Even the bleeding is a kind of color.', 'Art survives. So do I.'] },
  { characterId: 'mansa',     lines: ['There is still more to give.', 'Mali endured drought and war. So can I.', 'My pilgrimage was harder. I walked every step.', 'Wealth is nothing without the will to spend it.'] },
  { characterId: 'velthar',   lines: ['Toba did not kill me. This will not either.', 'I am older than your grave.', 'Ash. Winter. I remember. I survived.', 'Dren. Dren. Dren.'] },
  { characterId: 'musashi',   lines: ['A true swordsman does not flinch.', 'The Book of Five Rings does not end here.', 'Pain is a teacher.', 'I have bled before. I won before.'] },
  { characterId: 'cleopatra', lines: ['I have outlived empires. I will outlive this.', 'A queen does not flinch.', 'The Nile has not stopped flowing.', 'I charmed Caesar. I can charm death.'] },
  { characterId: 'tesla',     lines: ['The theorem is not yet proven.', 'I have eight more inventions.', 'They said I was mad. I am still here.', 'The current does not stop. Neither do I.'] },
  { characterId: 'shaka',     lines: ['A Zulu does not kneel.', 'The assegai is still in my hand.', 'Blood. Earth. I am still here.', 'Igazi lamaZulu — still flowing.'] },
];

// ── On Ultimate Use ──────────────────────────────────────────────────────────

export const ON_ULTIMATE_LINES: SingleLineEntry[] = [
  { characterId: 'napoleon',  lines: ['Pour la France — pour nous.', 'The Grand Battery speaks!', 'Vive l\'Armée!', 'History turns. I turn it.'] },
  { characterId: 'genghis',   lines: ['The steppe remembers.', 'Tengri watches.', 'From the mountains to the sea — ALL OF IT.', 'Ride. Ride. RIDE.'] },
  { characterId: 'leonidas',  lines: ['MOLON LABE!', 'Three hundred held the pass. I need no three hundred!', 'Sparta! Sparta! SPARTA!', 'This is where we stand. This is where we win.'] },
  { characterId: 'beethoven', lines: ['Now — LISTEN.', 'Ode to Joy... was just the beginning.', 'The Fifth. Fate knocking at the door.', 'I am the symphony. And it does not stop.'] },
  { characterId: 'sunsin',    lines: ['열두 척. Twelve ships. Enough.', '이순신은 물러서지 않는다. I do not retreat.', 'The Turtle Ship was built for moments like this.', '신에게는 아직 열두 척의 배가 있사옵니다. To your oars!'] },
  { characterId: 'davinci',   lines: ['I theorized something like this in 1487.', 'Codex Atlanticus. Page forty-three.', 'Vitruvian Man... was a starting point.', 'Every machine has its moment. This is mine.'] },
  { characterId: 'huang',     lines: ['Rise. You were built to outlast me.', '始皇帝 commands!', 'A thousand li of wall... begins here.', 'The First Emperor does not bend.'] },
  { characterId: 'nelson',    lines: ['Signal: engage the enemy more closely.', 'England expects every person to do their duty. Mine is this.', 'Kiss me, Hardy — not yet. After this.', 'Trafalgar was just practice.'] },
  { characterId: 'hannibal',  lines: ['They think I\'m here. I\'m not.', 'Cannae. The pincer CLOSES.', 'Carthage never forgot how to fight.', 'Double envelopment. Textbook.'] },
  { characterId: 'picasso',   lines: ['Let me show you what I see.', 'Les Demoiselles d\'Avignon were just sketches.', 'I paint destruction and call it art.', 'Every angle. All at once. NOW.'] },
  { characterId: 'teddy',     lines: ['UP THE HILL!', 'ROUGH RIDERS — CHARGE!', 'I speak softly. But I carry a BIG STICK!', 'BULLY! BULLY! BULLY!'] },
  { characterId: 'mansa',     lines: ['Everything I have is yours.', 'The wealth of Mali flows through me.', 'Let the whole world remember this generosity.', 'I gave so much gold the markets crashed. What is this?'] },
  { characterId: 'velthar',   lines: ['The mountain speaks.', 'Humanity\'s last light — BURN.', 'Shul-orn. Fire from the sky.', 'KAR-DREN-THRAL!'] },
  { characterId: 'musashi',   lines: ['Earth. Water. Fire. Wind. Void.', 'Two heavens. One path.', 'The Book of Five Rings — opened.', 'I have studied this moment for thirty years.'] },
  { characterId: 'cleopatra', lines: ['Eternal Kingdom — rise.', 'I am Isis. I am Aphrodite. I am Egypt.', 'The last Pharaoh commands.', 'Even the stars kneel.'] },
  { characterId: 'tesla',     lines: ['Three. Six. Nine.', 'Wardenclyffe — reborn.', 'Every atom. Every pulsar. MINE.', 'I will light the cosmos.'] },
  { characterId: 'shaka',     lines: ['Impondo zankomo — CLOSE!', 'For the nation. For the blood.', 'BAYEDE!', 'The bull horns encircle.'] },
];

// ── On Victory ───────────────────────────────────────────────────────────────

export const ON_VICTORY_LINES: SingleLineEntry[] = [
  { characterId: 'napoleon',  lines: ['Another battlefield. Same result.', 'History does not remember the defeated.', 'The campaign continues tomorrow.', 'Vive la victoire.'] },
  { characterId: 'genghis',   lines: ['Wherever I go: that is nutag now.', 'The sky is blue everywhere. It is all mine.', 'They ran. They always run.', 'The steppe swallows armies. I just help.'] },
  { characterId: 'teddy',     lines: ['What a magnificent adventure!', 'That was BULLY! Absolutely bully!', 'The strenuous life, lived!', 'We gave them the Big Stick alright!'] },
  { characterId: 'mansa',     lines: ['We are richer than when we started.', 'Let the record show: Mali was here.', 'History will be kind to the generous.', 'I have more gold. But I also have this victory.'] },
  { characterId: 'leonidas',  lines: ['The position held.', 'Sparta endures. Sparta always endures.', 'We came. We stood. We won.', 'A Spartan victory looks like this.'] },
  { characterId: 'davinci',   lines: ['I have seventeen notes to write.', 'I must update the codex.', 'Survival was the more interesting outcome.', 'An experiment and a victory. Excellent.'] },
  { characterId: 'beethoven', lines: ['The final chord. Perfect.', 'The coda. Beautiful.', 'Music and victory are the same thing.', 'I composed this in my head during the fight.'] },
  { characterId: 'sunsin',    lines: ['The tide turns in our favor.', '승리! Victory belongs to the sea!', 'The fleet is intact. The enemy is not.', 'Every battle at sea ends the same way when I am there.'] },
  { characterId: 'huang',     lines: ['Another dynasty begins.', 'The empire stretches further.', '万岁! Ten thousand years!', 'Write this in the chronicles. The empress prevailed.'] },
  { characterId: 'nelson',    lines: ['Victory. Signal the fleet.', 'England expected. England received.', 'Strike the signal: battle won.', 'Trafalgar was grander. But this was satisfying.'] },
  { characterId: 'hannibal',  lines: ['They never saw the angle.', 'Cannae taught me: the perfect battle always looks messy from outside.', 'Carthage wins. As it should.', 'The flanks held. Of course they did. I designed them.'] },
  { characterId: 'picasso',   lines: ['A masterpiece.', 'I would paint this but it would take a lifetime.', 'Even destruction can be beautiful.', 'The composition was perfect. As I planned.'] },
  { characterId: 'velthar',   lines: ['Another day. The tribe continues.', 'Dren.', 'The fire did not go out.', 'Forty thousand more.'] },
  { characterId: 'musashi',   lines: ['One more duel. One more lesson.', 'The sword returns to its sheath.', 'Sixty-two. Undefeated.', 'The path continues.'] },
  { characterId: 'cleopatra', lines: ['As expected.', 'Another kingdom. Another crown.', 'Egypt endures.', 'Men always underestimate me. Men are always wrong.'] },
  { characterId: 'tesla',     lines: ['Conducted successfully.', 'Another experiment. Another success.', 'The future is electric.', 'The stars are listening.'] },
  { characterId: 'shaka',     lines: ['The nation grows.', 'Our blood holds the land.', 'USUTHU!', 'Kwakha isizwe. We build a nation.'] },
];
