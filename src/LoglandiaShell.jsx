import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { BookOpen, Clock, Map as MapIcon, Scroll, Wand2, Menu, ChevronRight, ChevronLeft, ExternalLink, Gem, Lock, Dices, Sparkles, Wrench, Layers, Flame, Music, Cross, Leaf, Swords, Hand, ShieldCheck, Crosshair, Eye, Skull, Puzzle, Home, Dumbbell, UserPlus, Trophy, Shapes, Globe, Cog, Wand, Star, Anvil, Heart, Ghost, Moon, Zap, Sun, Droplets, TreePine, Snowflake, CloudLightning, Flower2, Circle, Axe } from "lucide-react";

/* ============================================================================
   LOGLANDIA — MULTI-MODULE SHELL  (Codex theme, neutral palette)
   Race data pulled from the World & Wonders race database (29 races).
   ADD A MODULE -> MODULES + a line in the App switch.  ADD CONTENT -> edit data.
   LINK A PAGE  -> [[ivsil]] / [[primordia]].  PHOTOS -> `img` on events/tales.
   ========================================================================== */

const NavContext = createContext(() => {});
const PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240'%3E%3Crect width='400' height='240' fill='%23202024'/%3E%3Ccircle cx='305' cy='64' r='22' fill='none' stroke='%23C8A86B' stroke-width='2'/%3E%3Cpath d='M0 240 L120 132 L200 196 L300 110 L400 196 L400 240 Z' fill='%232c2c31'/%3E%3Cpath d='M0 240 L120 132 L200 196 L300 110 L400 196' fill='none' stroke='%23454552' stroke-width='2'/%3E%3C/svg%3E";

/* ----------------------------------------------------------------- GLOSSARY */
/* ============================================================================
   PLAYER CHARACTERS — lightweight backend
   ----------------------------------------------------------------------------
   No real accounts, just a name (per the call: only 7 trusted people use this).
   Supabase credentials are wired directly here so the deployed site can use the
   same values without any build-time environment setup.

   Supabase table to create (SQL editor):
     create table characters (
       id uuid default gen_random_uuid() primary key,
       owner_name text not null,
       data jsonb not null,
       created_at timestamptz default now()
     );
     alter table characters enable row level security;
     create policy "public read" on characters for select using (true);
     create policy "public insert" on characters for insert with check (true);
     create policy "public update" on characters for update using (true);
   ========================================================================== */
const SUPABASE_URL = "https://ronzvhxkeyesdkeuavlp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wzEfg5BBoC9_913zZ9i94w_Q0dBlNcT";
const SUPABASE_READY = true;

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      ...(opts.method && opts.method !== "GET" ? { Prefer: "return=representation" } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase error ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ============================================================================
   HEROES OF LOGLANDIA — portrait uploads
   ----------------------------------------------------------------------------
   Uses Supabase Storage rather than the table API. One-time setup: in the
   Supabase dashboard, Storage -> New bucket -> name it "hero-portraits" ->
   mark it Public. No other config needed; the anon key already in use for
   the rest of the site is enough to upload to it.

   Supabase table to create (SQL editor), alongside the `characters` one:
     create table heroes (
       id uuid default gen_random_uuid() primary key,
       player_name text not null,
       hero_name text not null,
       avatar_url text,
       bio text,
       blocks jsonb default '[]'::jsonb,
       character_id uuid,
       created_at timestamptz default now()
     );
     alter table heroes enable row level security;
     create policy "public read" on heroes for select using (true);
     create policy "public insert" on heroes for insert with check (true);
     create policy "public update" on heroes for update using (true);
   ========================================================================== */
const HERO_BUCKET = "hero-portraits";
const HERO_IMAGE_MAX_MB = 5;

async function supaStorageUpload(bucket, file) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const key = `${(crypto.randomUUID?.() || Math.random().toString(36).slice(2))}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${key}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed ${res.status}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;
}

/* localStorage can throw (private browsing, artifact preview sandboxes) — never let it crash the app. */
const PLAYER_NAMES = ["Edward", "Jared", "Ethan", "Sarah P", "Sarah J", "Sarah C", "Logan", "Jesse"];

/* Placeholders for now — rename ids/names once the real campaigns are settled.
   Shares ids with the Tales module's CAMPAIGNS so a character's campaign tag
   could later link straight to that campaign's log. */
const CHARACTER_CAMPAIGNS = [
  { id: "emberfall", name: "Campaign 1" },
];
const JUST_FOR_FUN = { id: "fun", name: "Just for Fun" };

function getStoredName() {
  try { return localStorage.getItem("lgl_player_name") || ""; } catch { return ""; }
}
function setStoredName(name) {
  try { localStorage.setItem("lgl_player_name", name); } catch { /* ignore */ }
}

const GLOSSARY = {
  leyline: { term: "Leylines", tag: "World System", body: "Rivers of magical energy beneath Loglandia. They shape the land above them and color any magic cast nearby." },
  leyric: { term: "Leyric", tag: "World System", body: "The living residue of the Primordial gods in the earth. Most magic is built from it." },
  planetouched: { term: "Godmarked", tag: "Heritage", body: "Mortals shaped by divine influence: bloodline, curse, creation, or transformation. The divine mark never fully dilutes." },
  delved: { term: "The Delved", tag: "Aberrant Gods", body: "Ancient things found buried under the world. Finding them changed people for generations." },
  voidborn: { term: "Voidborn", tag: "Aberrant Gods", body: "Aberrant gods from beyond the sky. Rarer in bloodlines than The Delved, and stranger still." },
  eidomantic: { term: "Eidomantic Sensitivity", tag: "World System", body: "The Crystori's attunement to magic auras and leylines through their crystal growth." },
  primarchs: { term: "The Primarchs", tag: "History", body: "The tier above the gods. They shaped the world and then were gone." },
};

/* ------------------------------------------------------------------ CONTENT */
const GODMARKED_INTRO = [
  "Seven peoples carry a mark that something else put there. Some inherited it from a god or a spirit that took an interest in the line. Some were cursed, some blessed, and which word gets used usually depends on who survived to tell it. A few were ordinary people until the day they were not.",
  "The mark does not wash out. Generations thin it and never end it. The child of a Hanyou and a human is Hanyou, and so is that child's child, however faint the sign has grown by then. What marked you sets its character, the horns or the light or the crystal in the bone. How much you carry sets how loudly it speaks. A thinly marked Lighttouched passes for someone with good skin who stands well in a window. A thickly marked one cannot walk into a dim room without changing it. The two may be cousins.",
  "What follows are tendencies. Every people in this chapter has a living exception walking around somewhere, and the exceptions are common enough that meeting one should surprise nobody.",
  { aside: "I have carried every kind of them. The mark is on the soul, not the skin, and it is still there when the skin is gone." },
];

const CONTENT = {
  races: [
    /* ---- GODMARKED (7) ---- */
    { id: "lighttouched", name: "Lighttouched", category: "Godmarked", eyebrow: "Godmarked · Celestial",
      keywords: "Radiant · Healing · Winged",
      tagline: "Winged healers of celestial blood, never allowed to be anonymous.",
      lore: "The Lighttouched carry the mark of the celestial powers, and the world has decided in advance what that means about them.",
      loreSections: [
        { p: ["The sign runs bright: skin that holds a low warmth in the dark, eyes with too much color in them, hair the shade of some metal nobody mines, and in the heavily marked, a faint corona that the room's shadows lean away from. What form it takes depends entirely on which power did the marking, so that a Lighttouched of a war god and a Lighttouched of a healer stand in the same doorway looking nothing alike and are still the same people.", "They do tend toward decency, and they do tend to end up in charge. Some of it is real inheritance and some of it is the plainest thing in the world: a person who glows faintly is handed responsibility early and often, and enough people telling you that you are the honest one will make an honest person out of most of us. So the Lighttouched fill the guildmaster's chair, the captaincy, the seat at the head of the table, and they carry a particular weight for it. An ordinary person who fails is disappointing. A Lighttouched who fails is a scandal, discussed for years, held up as proof of something. They are never permitted to be merely average, and most of them find out young that this is the actual burden of the light. Not the glow. The audience."] },
        { h: "Playing a Lighttouched", p: ["You are marked by something the world respects and expected to be worth it. Leadership will be offered to you before you have earned it, and withdrawn later than it should be. Decide early whether you are the person they think you are, because everyone else decided years ago."] }
      ],
      godmarked: true,
      facts: [{ label: "Stats", text: "Set +2 WIS / Chosen +2 (not WIS, STR) / Set -2 STR" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Celestial Resistance", flavor: "Radiant fire doesn't read Lighttouched the way it reads everyone else. There's too much of it already running underneath their skin.", note: "You have resistance to radiant damage. {{Passive}}" },
        { name: "Healing Hands", flavor: "The warmth in a Lighttouched's hands isn't something taught. It's something inherited, and not everyone is glad to have it.", note: "Touch a creature to heal it for a number of d6s equal to your prof bonus, plus your WIS mod. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Wings", flavor: "Flight comes easily to Lighttouched. It's a constant reminder that the ground was never really built with them in mind.", note: "Your fly speed equals your walking speed. {{Passive}}" },
        { name: "Languages", flavor: "Even Lighttouched who've never set foot near a temple still dream, sometimes, in Celestial. Nobody's quite explained why.", note: "You know Common and Celestial. {{Passive}}" },
      ],
      legacy: [
        { name: "Radiant Soul", note: "Once per turn, add 1d8 radiant damage to a damage roll you make. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Tongues of Heaven", note: "You gain proficiency in Persuasion and Insight. {{Passive}}" },
        { name: "Sacred Flame", note: "You know the Sacred Flame cantrip, and add your WIS mod to its damage. {{Passive}}" },
        { name: "Celestial Clarity", note: "You have advantage on WIS saves and can't be frightened. {{Passive}}" },
        { name: "Blessed Resilience", note: "Reroll one failed save. {{Uses Per Long Rest: 1}}" },
      ],
      subraces: [
        { name: "Winged", desc: "Classic angels, radiant, protective", traits: [
          { name: "Radiant Flight", note: "Your fly speed increases by 15 ft., and your wings shed bright light out to 30 ft. and dim light for another 30 ft. You can suppress or activate the light as a bonus action. {{Passive}}" },
          { name: "Feather Shield", note: "As a reaction to a ranged attack, reduce its damage by 1d10+prof. If you reduce the damage to 0, throw the projectile back at the attacker (30 ft., 1d10+prof). {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
        { name: "Archon", desc: "Divine law, order, scholarly governance", traits: [
          { name: "Divine Command", note: "You know Command, and can cast it as a bonus action without a spell slot (WIS). {{Uses Per Long Rest: 1}}" },
          { name: "Celestial Authority", note: "Creatures you have frightened, charmed, or blinded have disadvantage on saves against your spells and features. {{Passive}}" },
        ] },
        { name: "Oracle", desc: "Psychic, prophetic, cosmic sight", traits: [
          { name: "Read Fate", note: "Ask the GM one yes/no question about immediate future events. {{Uses Per Long Rest: 1}}" },
          { name: "Inevitable", note: "Turn a missed attack or failed check into a success. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Seraph", desc: "Holy fire, burning divine energy", traits: [
          { name: "Burning Halo", note: "For 1 minute, a halo burns around you; non-allies within 10 ft. take 1d6 radiant when they enter the area or end their turn there. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Divine Wrath", note: "When you or an ally drops to 0 HP, your next attack deals an extra 2d8 radiant. {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
      ] },

    { id: "tiefling", name: "Tiefling", category: "Godmarked", eyebrow: "Godmarked · Unholy (Demon-kin)",
      keywords: "Fiery · Fierce · Shadowy",
      tagline: "Demon-blooded and Underground-rooted, bound by no contract.",
      lore: "Tieflings carry the demon-mark, and there are a great many of them, because demons are numerous and demons are not selective.",
      loreSections: [
        { p: ["This is the crucial difference between a Tiefling and a Tarnished, and the world persists in confusing the two. A devil chooses, contracts, and files the paperwork. A demon simply happens to you. The mark descends from actual gods sometimes, but far more often from ordinary demons, of which there are more than anyone has counted, and so Tieflings are the most common of the Godmarked by a wide margin. Most cities of any size have some. Most of those cities are perfectly used to it.", "The sign runs to horns, tails, unusual eyes, and skin in colors no one is born with elsewhere, and it varies with the demon as much as with the dose. What surprises people, every time, is the charm. Tieflings are disproportionately magnetic, quick with a room, and good at being liked, having inherited the one thing demons are genuinely excellent at. This works out for them roughly half the time. The other half, someone remembers what they inherited it from, and the very ease that opened the door is offered afterward as evidence."] },
        { h: "Playing a Tiefling", p: ["You are common enough not to be a spectacle and marked enough never to be forgotten. Charm comes easily, and so does the accusation that the charm is the point. Whatever you were told about your bloodline, the demon that started it almost certainly did not stay for the conversation."] }
      ],
      godmarked: true,
      facts: [{ label: "Stats", text: "Set +2 CHA / Chosen +2 (not CHA, WIS) / Set -2 WIS" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Infernal Resistance", flavor: "Fire never quite blisters the way it should on a Tiefling. Most don't realize it until the day they don't flinch from something that should have hurt.", note: "You have resistance to fire damage. {{Passive}}" },
        { name: "Darkvision", flavor: "Most Tiefling eyes were shaped Underground, even for the ones who grew up on a city street instead of in a tunnel.", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Demonic Legacy", flavor: "Small flourishes of magic come naturally to Tieflings, and so does the charm that tends to follow them.", note: "You know the Thaumaturgy cantrip (CHA). {{Passive}}" },
        { name: "Languages", note: "You know Common. {{Passive}}" },
      ],
      legacy: [
        { name: "Fiendish Sight", note: "You can see through both magical and nonmagical darkness out to 60 ft. {{Passive}}" },
        { name: "Infernal Legacy", note: "Cast Hellish Rebuke as a 2nd-level spell without a spell slot (CHA). {{Uses Per Long Rest: 1}}" },
        { name: "Hellfire", note: "Cast Burning Hands without a spell slot (CHA). {{Uses Per Long Rest: 1}}" },
        { name: "Demonic Fury", note: "When you drop a creature to 0 HP, gain temp HP equal to your CHA mod + prof, and the nearest creature must make a DC 12 WIS save or you can attack it as a reaction. {{Passive}}" },
        { name: "Infernal Instinct", note: "You can't be surprised, and you have advantage on Initiative. {{Passive}}" },
      ],
      subraces: [
        { name: "Wrath", desc: "Rage and violence, physical, claws", traits: [
          { name: "Demon Claws", note: "Your unarmed strikes deal 1d6 slashing + CHA mod. On a crit, the target bleeds for 1d4 necrotic per turn until stopped. {{Passive}}" },
          { name: "Demonic Leap", note: "As a bonus action, jump 30 ft. toward a target. If you land adjacent, it makes a STR save or is knocked prone. {{Passive}}" },
        ] },
        { name: "Glacial", desc: "Frozen hell, cold, ancient, inevitable", traits: [
          { name: "Cold Blood", note: "You have resistance to cold and are immune to extreme cold. {{Passive}}" },
          { name: "Glacial Shell", note: "As a reaction to a melee attack, reduce its damage by 1d10+prof. If you reduce it to 0, the attacker takes 1d4 cold. {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
        { name: "Nightmare", desc: "Fear, dark magic, psychological torment", traits: [
          { name: "Shadowstep", note: "As a bonus action, teleport up to 30 ft. between areas of dim light or darkness. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Haunt", note: "As a bonus action, mark a creature within 60 ft.; it makes a WIS save or is frightened and takes 1d6 psychic per turn. {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
      ] },

    { id: "tarnished", name: "Tarnished", category: "Godmarked", eyebrow: "Godmarked · Unholy (Devil-cursed)",
      keywords: "Cursed · Cunning · Dark",
      tagline: "Wanderers paying for an infernal deal, often one they never made.",
      lore: "The Tarnished carry the devil-mark, and every one of them is evidence that a contract was signed.",
      loreSections: [
        { p: ["That is the whole of their reputation and most of their trouble. Devils do not scatter their influence the way demons do; they select, they negotiate, and they secure terms, so a Tarnished exists only where somebody once shook a hand in the dark. The bargain may be five generations back. It may have been struck by an ancestor who has been dead for two centuries and got nothing for it. The world does not care, and the world assumes, on sight, that the arrangement is ongoing.", "So they are rare and they are shunned, run out of small towns, refused rooms, watched in shops. The sign does not help: the mark runs to hard geometry, symmetrical horns, metallic sheen, eyes that hold a still flame, all of it too orderly to be accidental. A Tiefling looks like something happened. A Tarnished looks designed.", "They keep to cities that can absorb them, and they have exactly one people who treat them as ordinary. The Dark Elves have held a contractual border with the hells for longer than most surface nations have existed, and a folk who read every clause before signing are not much impressed by the notion that a bargain someone's great-grandmother made is a stain on the great-grandchild. Kar-Mundir has a considerable Tarnished quarter. It is one of the very few places where nobody asks."] },
        { h: "Playing a Tarnished", p: ["You inherited the consequences of a deal you did not make and cannot see the terms of. Doors close before you reach them. You have probably learned to be exact, formal, and impossible to catch out, because the alternative is proving them right. Go down to Kar-Mundir sometime. Nobody there will look twice."] }
      ],
      godmarked: true,
      facts: [{ label: "Stats", text: "Set +2 INT / Chosen +2 (not INT, CHA) / Set -2 CHA" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Devil's Mark", flavor: "Not every Tarnished struck their own deal. Some are paying for a bargain an ancestor made generations ago, and the mark doesn't care whose fault it actually was.", note: "Your curse is visibly marked. You have disadvantage on CHA checks against those who recognize it, and truesight reveals its infernal nature. {{Passive}}" },
        { name: "Darkvision", flavor: "Most of what the curse hands down costs something. The eyes are one of the rare parts that don't.", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Infernal Codex", flavor: "The magic in a Tarnished's blood isn't something they've practiced or refined. It surfaces when there's truly nothing else left to try.", note: "Cast one of Hellish Rebuke, Hex, Cause Fear, or Inflict Wounds without a spell slot (INT). {{Uses Per Long Rest: 1}}" },
        { name: "Languages", flavor: "Nobody taught a Tarnished to speak Infernal. It simply arrived, the same way everything else from the deal arrived, uninvited.", note: "You know Common and Infernal. {{Passive}}" },
      ],
      legacy: [
        { name: "Devil's Tongue", note: "You know the Vicious Mockery and Thaumaturgy cantrips (CHA). {{Passive}}" },
        { name: "Infernal Legacy", note: "Cast Hellish Rebuke as a 2nd-level spell without a spell slot (CHA). {{Uses Per Long Rest: 1}}" },
        { name: "Devil's Bargain", note: "You gain the Eldritch Adept feat and learn one Invocation. Requires spellcasting. {{Passive}}" },
        { name: "Dark Pact", note: "Impose disadvantage on a creature's saving throw. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Soul Brand", note: "Mark a creature; you have advantage on tracking and sensing it for 24 hours. {{Passive}}" },
      ],
      subraces: [
        { name: "Greed", desc: "Monetary deal gone wrong", traits: [
          { name: "Devil's Tithe", note: "Deal extra damage equal to your prof bonus against creatures carrying valuables. When such a creature dies within 30 ft. of you, gold worth twice its CR (in gp) appears. {{Passive}}" },
          { name: "Cursed Appraisal", note: "As a bonus action, appraise an object or creature within 60 ft.: learn its magic and value, and gain advantage on your next CHA check against it. {{Uses Per Short Rest: 1}}" },
        ] },
        { name: "Pride", desc: "Fallen nobility, arrogance made curse", traits: [
          { name: "Fallen Grace", note: "You gain proficiency in Persuasion and Deception, and use INT instead of CHA for both. {{Passive}}" },
          { name: "Contempt", note: "The first attack that misses you each turn deals psychic damage equal to your INT mod back to the attacker. {{Passive}}" },
        ] },
        { name: "Envy", desc: "Bitter, covetous, cursed by comparison", traits: [
          { name: "Mirror Curse", note: "Reflect half the damage you take back at the attacker; it makes an INT save or takes the full amount instead. {{Uses Per Long Rest: 1}}" },
          { name: "Resentment", note: "The first time each turn you hit a creature with more current HP than you, deal extra damage equal to your prof. {{Passive}}" },
        ] },
        { name: "Lust", desc: "Deal made for love or obsession", traits: [
          { name: "Desperate Measure", note: "When an ally within 30 ft. would drop to 0 HP, take their damage instead; they drop to 1 HP. {{Uses Per Long Rest: 1}}" },
          { name: "Forbidden Desire", note: "Charm a creature within 30 ft.; it makes a CHA save or is charmed for 1 minute and won't harm you. {{Uses Per Long Rest: 1}}" },
        ] },
      ] },

    { id: "hanyou", name: "Hanyou", category: "Godmarked", eyebrow: "Godmarked · Yokai",
      keywords: "Resilient · Spiritual · Shifting",
      tagline: "Half-yokai of the Island Nation, quietly watched wherever they go.",
      lore: "Hanyou carry the mark of the yokai, the spirits of the plane that lies opposite the light, and there are very few of them anywhere in the world.",
      loreSections: [
        { p: ["The yokai are not demons and are not devils, and the distinction matters more than most people bother to learn. They are spirits of grievance, appetite, rage, and rot, native to their own plane and most numerous in the east where the veil between there and Tenkyra runs thin. What they mark, they mark deeply. The four kinds are known by the spirits behind them: the Jorogumo of the patient web, the Tengu of the high places, the Oni of the red rage, and the Gashadokuro of the unburied dead. The sign is unmistakable and rarely gentle.", "They lean wicked. It would be dishonest to write otherwise, and Hanyou themselves generally say so first: the thing woven into them wants what it wanted when it was a spirit, and it does not stop wanting merely because it now has a person around it. What varies is the answer. A great many Hanyou spend their lives refusing that appetite with a discipline the rest of us never have to develop, and those who manage it tend to be formidable in a way that has nothing to do with the mark. A Hanyou who has spent forty years saying no to something is not a person you frighten easily."] },
        { h: "Playing a Hanyou", p: ["Something inside you wants, and it is old, and it was not asked. You may feed it, fight it, or negotiate with it, and every Hanyou alive has picked one. You are rare enough that most people have never met another, which means you will be explaining yourself for the rest of your life, or refusing to."] }
      ],
      godmarked: true,
      facts: [{ label: "Stats", text: "Set +2 DEX / Chosen +2 (not DEX, INT) / Set -2 INT" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Yokai Heritage", flavor: "Hanyou carry two natures in one body, Humanoid and Fiend both. Most people never have to reconcile something like that about themselves.", note: "Your creature type is Humanoid and Fiend (Yokai). {{Passive}}" },
        { name: "Reconstitution", flavor: "Stories about Hanyou regrowing a lost limb circulated on the Island long before anyone outside the family ever saw it happen.", note: "You regrow lost limbs and organs on a short rest, though you gain no HP from it. {{Passive}}" },
        { name: "Supernatural Instinct", flavor: "Whatever made a Hanyou's yokai parent dangerous didn't disappear entirely. Just enough of it survived to make them hard to catch off guard.", note: "You have advantage on Initiative. {{Passive}}" },
        { name: "Languages", flavor: "Nobody sits a Hanyou down to teach them Sylvan. It surfaces on its own, the way a half-remembered dream does.", note: "You know Common and Sylvan. {{Passive}}" },
      ],
      legacy: [
        { name: "Supernatural Resilience", note: "You have advantage on saves against disease and poison. {{Passive}}" },
        { name: "Spiritual Senses", note: "You have advantage on Perception checks involving spiritual or supernatural phenomena. {{Passive}}" },
        { name: "Cursed Fortitude", note: "Drop to 1 HP instead of 0. {{Uses Per Long Rest: 1}}" },
        { name: "Dark Manifestation", note: "Manifest your yokai nature for 1 minute (the effect depends on your subrace, below). {{Uses Per Long Rest: 1}}" },
        { name: "Yokai Step", note: "As a bonus action, become invisible until your next turn or until you attack. {{Uses Per Long Rest: = Prof Bonus}}" },
      ],
      subraces: [
        { name: "Jorogumo", desc: "Spider spirit, patient, seductive. Manifestation: grow spider limbs; climb speed = walk speed; once during manifestation, bonus action web shot 30 ft.", traits: [
          { name: "Spider Climb", note: "Cast Spider Climb at will, without a spell slot. {{Passive}}" },
          { name: "Predator's Patience", note: "You have advantage on CHA checks against poisoned, restrained, or frightened creatures. {{Passive}}" },
        ] },
        { name: "Tengu", desc: "Avian martial spirit, proud, disciplined. Manifestation: grow black wings; fly speed = walk speed", traits: [
          { name: "Master's Eye", note: "You gain proficiency in Perception and Insight. As a bonus action, study a creature to learn its resistances and immunities and gain advantage on attacks against it until your next turn. {{Uses Per Long Rest: 1}}" },
          { name: "Blade Master", note: "You gain proficiency with all martial weapons and score crits on a 19-20. {{Passive}}" },
        ] },
        { name: "Oni", desc: "Rage and brute strength, NOT a demon/devil. Manifestation: size increases one category; advantage STR checks/saves; unarmed strikes +1d4 bludgeoning", traits: [
          { name: "Demon Strength", note: "You have advantage on STR checks and saves, and double your carrying capacity. {{Passive}}" },
          { name: "Savage Attacks", note: "Roll one extra weapon damage die on a crit. {{Passive}}" },
        ] },
        { name: "Gashadokuro", desc: "Accumulated grudges and bone. Manifestation: bones rattle, eyes hollow; creatures within 10 ft. who see you: WIS save or frightened + 1d6 necrotic", traits: [
          { name: "Vengeful Rebuke", note: "Cast Hellish Rebuke as a 2nd-level spell without a spell slot (WIS), dealing necrotic instead of fire. {{Uses Per Long Rest: 1}}" },
          { name: "Bone's Memory", note: "Cast Speak with Dead without a spell slot. {{Uses Per Long Rest: 1}}" },
        ] },
      ] },

    { id: "kith", name: "Kith", category: "Godmarked", eyebrow: "Godmarked · Fey",
      keywords: "Tricky · Charming · Fey",
      tagline: "Fey wanderers who cross between realms as easily as opening a door.",
      lore: "The Kith are what the Fey Realm makes when it makes something outright, and they are common enough in elvish cities that nobody there turns a head.",
      loreSections: [
        { p: ["Do not confuse them with the Wild Elves. A Wild Elf is an elf who resonated with the Fey Leyline and stayed an elf: courteous, deliberate, ruinously precise about promises. A Kith is fey the whole way down. Where the Wild Elf bargains with the care of a lawyer, the Kith acts on the impulse of the moment and is honestly puzzled that anyone expected otherwise. They keep their word in the fey manner, which is to say exactly and never usefully. They change plans, houses, moods, and occasionally names, and they do it with an untroubled delight that reads as cruelty to people who were counting on them and rarely is.", "They come in three kinds, marked by which corner of the Realm reached through: the Dream, the Thornborn, and the Wanderer, and each wears the Realm differently. All three run to too-bright coloring, features assembled a shade off true, and a way of being in a room that draws the eye without earning it.", "Elves tolerate them fondly, which is more than most peoples manage. In an elvish city a Kith is somebody's cousin, somebody's disaster, and somebody's favorite guest, frequently within one week."] },
        { h: "Playing a Kith", p: ["You are chaos with excellent manners and no follow-through, which is a great deal more fun to play than to plan around. Say what you mean and mean it entirely, for about an hour. Keep your promises to the letter and watch the letter do the work. Nobody who knows you is surprised anymore."] }
      ],
      godmarked: true,
      facts: [{ label: "Stats", text: "Set +2 CHA / Chosen +2 (not CHA, INT) / Set -2 INT" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Fey Step", flavor: "It doesn't feel like spellcasting to a Kith. It feels like stepping through a door that happens to be invisible to everyone else.", note: "Cast Misty Step as a bonus action. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Fey Trance", flavor: "A resting Kith doesn't look like a sleeping mortal. Travel companions tend to find that more unsettling than they expect to.", note: "You don't need to sleep, and your long rest is 4 hours of meditation instead. {{Passive}}" },
        { name: "Unseelie Ward", flavor: "Whatever shaped a Kith in the Fey Realm built in a defense against exactly this kind of trick. Charms that work on everyone else just slide off.", note: "You can't be magically charmed. {{Passive}}" },
        { name: "Wild Sense", flavor: "It isn't a spell or a search. It's a quiet, constant pull, the same way anyone might know which direction home is, even somewhere they've never been.", note: "You always know when you're within 1 mile of the Fey Realm or a crossing point into it. {{Passive}}" },
        { name: "Languages", note: "You know Common and Sylvan. {{Passive}}" },
      ],
      legacy: [
        { name: "Capricious Luck", note: "Force a creature to reroll a die it just rolled; it must use the new result. {{Uses Per Long Rest: 1}}" },
        { name: "Glamour Weave", note: "Cast Disguise Self at will, without a spell slot (CHA). {{Passive}}" },
        { name: "Faerie Fire", note: "You know Faerie Fire and can cast it without a spell slot. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Wildspeech", note: "You can communicate with beasts and fey as if you shared a language. {{Passive}}" },
        { name: "Otherworldly Insight", note: "You have advantage on detecting lies, illusions, and magical deception. {{Passive}}" },
      ],
      subraces: [
        { name: "Dream", desc: "Fey of the sleeping world, illusory, unreal", traits: [
          { name: "Dream Eater", note: "When a creature fails a save against your spell or feature, gain temp HP equal to your WIS mod + prof. {{Passive}}" },
          { name: "Dream Step", note: "As a bonus action, become incorporeal until your next turn; take 1d6 force if you end your turn inside an object or creature. {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
        { name: "Thornborn", desc: "Fey of dangerous beauty", traits: [
          { name: "Briar Rebuke", note: "As a reaction to being hit in melee, deal 2d10 piercing, halved on a DEX save. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Entangle", note: "You know Entangle and can cast it without a spell slot (WIS). {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
        { name: "Wanderer", desc: "Fey of lost paths and forgotten roads", traits: [
          { name: "Pathless Step", note: "You can Disengage as a bonus action and gain proficiency in Survival. {{Passive}}" },
          { name: "Wanderer's Boon", note: "You gain proficiency with navigator's tools. While you lead, you and willing creatures can't get lost, and you have advantage on navigation checks. {{Passive}}" },
        ] },
      ] },

    { id: "primordia", name: "Primordia", category: "Godmarked", eyebrow: "Godmarked · Primordial",
      keywords: "Elemental · Tough · Attuned",
      tagline: "Elemental spirits shaped by the leyline that shaped their home terrain.",
      lore: "Primordia carry the mark of the elemental powers, and of all the Godmarked they are the least interested in the mortal world.",
      loreSections: [
        { p: ["Their subrace is their element, taken from the plane that marked them and the Paraprismatic that rules it, and the mark is not partial in the way other marks are. A Primordia does not have fire in them. A Primordia of fire is fire, wearing a person's shape with varying degrees of commitment: skin like banked coal, hair that moves without wind, a footprint that scorches when the temper goes. Water runs, air never settles, earth stands where it is put.", "Most live in the elemental planes and always have, which is why the surface world meets so few of them. Those who come here go where the element is, and the rule is nearly absolute. You will not find a fire Primordia wintering in the north. You will not find a water Primordia three days into a desert. It is not preference and it is not stubbornness. It is the same reason a fish declines the invitation, and asking a Primordia to live against their element is a request that sounds, to them, like a mild joke."] },
        { h: "Playing a Primordia", p: ["You are your element first and a person second, and you have stopped apologizing for the order. You go where the element goes and are miserable and diminished anywhere else. Everything about you, temper included, runs the way your plane runs."] }
      ],
      godmarked: true,
      aside: "If you're playing a Primordia, you came from somewhere ancient and powerful. The question is whether you carry that as a burden or a birthright.",
      facts: [{ label: "Stats", text: "Set +2 CON / Chosen +2 (not CON, CHA) / Set -2 CHA" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Elemental Resistance", flavor: "The same force that shaped a Primordia's home, desert fire, mountain wind, deep stone, simply can't hurt the thing it made.", note: "You have resistance matching your subrace's element. {{Passive}}" },
        { name: "Leyline Sense", flavor: "Recognizing the leyline that shaped them isn't detection, not really. It's closer to picking a relative's voice out of a crowded room.", note: "You always know which [[leyline|leyline]] shapes the region you're standing in, and can detect leyline-influenced magic within 60 ft. {{Passive}}" },
        { name: "Primordial Attunement", flavor: "Nobody teaches a Primordia their elemental tongue. It sits underneath Common, older than speech, waiting to be remembered rather than learned.", note: "You know Common plus one Primordial language matching your element. {{Passive}}" },
      ],
      legacy: [
        { name: "Elemental Body", note: "Cast a 1st-level elemental spell. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Planar Step", note: "As a bonus action, make a short-range elemental teleport. {{Uses Per Long Rest: 1}}" },
        { name: "Living Element", note: "You have advantage on checks involving your element. {{Passive}}" },
        { name: "Elemental Burst", note: "Deal elemental damage in a 10 ft. burst. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Primordial Sight", note: "You have darkvision 60 ft. and can see elemental auras within 30 ft. {{Passive}}" },
      ],
      subraces: [
        { name: "Fire Animus", desc: "", traits: [
          { name: "Volcanic Body", note: "A creature that hits you in melee takes fire damage equal to your CON mod. {{Passive}}" },
          { name: "Burning Hands", note: "Cast Burning Hands without a spell slot (CON). {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
        { name: "Frost Animus", desc: "", traits: [
          { name: "Glacial Plating", note: "As a reaction to a melee attack, reduce its damage by 1d10+prof. If you reduce it to 0, the attacker takes 1d4 cold. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Cold Immunity", note: "You're immune to cold damage and extreme cold, and have advantage on CON saves in the cold. {{Passive}}" },
        ] },
        { name: "Stone Animus", desc: "", traits: [
          { name: "Rockwall", note: "As a bonus action, gain +3 AC and resistance to bludgeoning, piercing, and slashing, but your speed drops to 0. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Immovable", note: "You can't be pushed, pulled, or knocked prone unless you choose to be. {{Passive}}" },
        ] },
        { name: "Wind Animus", desc: "Built-in addition: Windborn +10 speed", traits: [
          { name: "Free Fly", note: "Your fly speed equals your walking speed. {{Passive}}" },
          { name: "Gust", note: "Cast Gust at will, without a spell slot (CON). {{Passive}}" },
        ] },
        { name: "Dark Animus", desc: "Rare, shares leyline w/ Dark Elf Scholar", traits: [
          { name: "Dark Leyline Pulse", note: "Cast Hunger of Hadar centered on yourself, with immunity to it (CON). {{Uses Per Long Rest: 1}}" },
          { name: "Void Absorption", note: "Reduce necrotic or psychic damage by 1d10+prof. If you reduce it to 0, gain temp HP equal to the damage. {{Passive}}" },
        ] },
      ] },

    { id: "crystori", name: "Crystori", category: "Godmarked", eyebrow: "Godmarked · Aberrant",
      keywords: "Armored · Ancient · Psychic",
      tagline: "Crystal-grown, one in a million, found near where The Delved were unearthed.",
      lore: "Little is known about the Crystori, and they are content with that.",
      loreSections: [
        { p: ["They carry an aberrant mark, and nobody can say with authority what did the marking. Something reached in from outside the ordinary order of planes, left crystal growing through bone and skin in slow bright veins, and did not explain itself. The Crystori do not explain it either. Whether this is because they cannot or because they decline is a question that has occupied better scholars than the ones asking it now.", "They live underground, deep, and they are formidably intelligent. Dwarves count them brothers of the deep and welcome them into Bal Morvan without invitation, a courtesy extended to no other people, and when a dwarf is asked what a Crystori is for he will say they are for the deep and consider the matter closed. The Crystori take an interest in problems rather than in company: mathematics, structures, the behavior of pressure and stone over long periods, and questions nobody else has thought to ask yet. They will talk at length about any of it. They will not talk about themselves."] },
        { h: "Playing a Crystori", p: ["You are brilliant, patient, and largely unbothered by what people make of you. You come from the deep and prefer it. Others will find you unreadable, and you may let them, since correcting the impression takes time you would rather spend on the problem."] }
      ],
      godmarked: true,
      facts: [{ label: "Stats", text: "Set +2 STR / Chosen +2 (not STR, DEX) / Set -2 DEX" }, { label: "Speed", text: "25 ft." }],
      builtins: [
        { name: "Aberrant Mark", flavor: "The mark is the whole reason people look at a Crystori three different ways at once: afraid, fascinated, and respectful, all without ever settling on one.", note: "Your creature type is Humanoid and Aberrant. {{Passive}}" },
        { name: "Eidomantic Sensitivity", flavor: "The crystal running through a Crystori's body isn't decoration. It's closer to an instrument, picking up what nobody else in the room can.", note: "You have advantage detecting and identifying magic auras and leylines. {{Passive}}" },
        { name: "Languages", flavor: "Primordial isn't a birthright for a Crystori the way it is for a Primordia. It's closer to residue, something picked up from wherever they were found.", note: "You know Common and Primordial. {{Passive}}" },
      ],
      legacy: [
        { name: "Crystal Hide", note: "Your natural armor is AC 13 + STR mod. It doesn't stack with worn armor, but does stack with a shield. {{Passive}}" },
        { name: "Geological Sense", note: "You gain proficiency in Nature and Athletics. {{Passive}}" },
        { name: "Ancient Awareness", note: "You gain proficiency in History and Investigation. {{Passive}}" },
        { name: "Delved Tongue", note: "You know Deep Speech and have telepathy with Aberrant creatures within 30 ft. {{Passive}}" },
        { name: "Crystal Resonance", note: "You can sense other Crystori and Aberrants within 120 ft., and always know which leyline shapes the region you're standing in. {{Passive}}" },
      ],
      subraces: [
        { name: "Fossil (Delved)", desc: "Ancient, carries memories of dead", traits: [
          { name: "Primordial Shell", note: "Reduce non-magical bludgeoning, piercing, and slashing damage by your prof. {{Passive}}" },
          { name: "Voice of the Ancient", note: "Cast Speak with Dead without a spell slot. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Quartz (Delved)", desc: "Clarity through pressure, common", traits: [
          { name: "Refractive Shield", note: "When targeted by a spell, flip a coin: on heads, reflect it to a new target within 30 ft. {{Uses Per Long Rest: 1}}" },
          { name: "Crystal Clarity", note: "Roll 1d6 and add it to a check or save after seeing the result. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Obsidian (Delved)", desc: "Forged under pressure, tanky", traits: [
          { name: "Volcanic Armor", note: "A creature that hits you in melee takes prof + 1d4 fire damage. {{Passive}}" },
          { name: "Obsidian Skin", note: "Your HP maximum increases by 2 per level, plus another 2 at each level (the Tough feat). {{Passive}}" },
        ] },
        { name: "Amethyst (Delved)", desc: "Psychic, dream-adjacent", traits: [
          { name: "Crystal Attunement", note: "You have telepathy with creatures that share a language with you within 60 ft. {{Passive}}" },
          { name: "Arcane Crystal", note: "You learn 2 Wizard cantrips (INT). {{Passive}}" },
        ] },
        { name: "Voidborn", desc: "Cosmic, luminous, alien, rarest", traits: [
          { name: "Event Horizon", note: "For 1 minute, create a 20 ft. gravity pull; each turn creatures make a STR save or are pulled 10 ft., and those adjacent take 2d8 force. {{Uses Per Long Rest: 1}}" },
          { name: "Cosmic Anchor", note: "You can't be banished, plane shifted, or relocated without your consent. {{Passive}}" },
        ] },
      ] },

    /* ---- ELVES (1 entry, 9 subraces) ---- */
    { id: "elf", name: "Elf", category: "Standard", eyebrow: "Elf · Leyline-sensitive", elfLanding: true, subracesElsewhere: true,
      keywords: "Swift · Keen · Versatile",
      tagline: "One people, nine forms, remade by whichever land they settle in.",
      lore: "Elves are uniquely sensitive to leylines. Prime Elves leave the homeland island unspecialized; as they migrate they resonate with the local leyline and transform over time. Moon Elves as the exception climbed above leyric influence and attuned to the 3 moons instead.",
      facts: [{ label: "Stats", text: "+3 set (Prime: +2 / +1 chosen)" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Trance", note: "Your long rest is 4 hours instead of 8. {{Passive}}" },
        { name: "Elf Ancestry", note: "You have advantage against being charmed, and are immune to magical sleep. {{Passive}}" },
        { name: "Languages", note: "You know Common and Elvish. {{Passive}}" },
      ],
      legacy: [
        { name: "Fleet Footed", note: "Your speed increases by 5 ft. {{Passive}}" },
        { name: "Eyes of the Night", note: "You have darkvision 60 ft. {{Passive}}" },
        { name: "Keen Senses", note: "You gain proficiency in Perception. {{Passive}}" },
        { name: "Elvish Steps", note: "Cast Misty Step as a bonus action. {{Uses Per Long Rest: 1}}" },
        { name: "Prime Magic", note: "You learn one Druid cantrip. {{Passive}}" },
      ],
      subracesLabel: "Subraces",
      subraces: [
        { name: "Prime Elf", desc: "Unspecialized, homeland/nomadic. Stats: +2 chosen / +1 chosen (no set stats)", traits: [
          { name: "Worldly", note: "(built-in) You gain proficiency in 2 skills of your choice. {{Passive}}" },
          { name: "Adaptable", note: "(built-in) You learn one cantrip from any class's list. {{Passive}}" },
          { name: "Wanderer's Eye", note: "You gain proficiency in Survival and Nature, you're never lost, and you always know which way is north. {{Passive}}" },
          { name: "Prime Intuition", note: "Reroll a failed check and take the higher result. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Sun Elf", desc: "Desert | Leyline: Fire | CHA +3", traits: [
          { name: "Desert Born", note: "(built-in) You have resistance to fire damage. {{Passive}}" },
          { name: "Blazing Presence", note: "(built-in) You have advantage on CHA checks in extreme heat. {{Passive}}" },
          { name: "Heat Mirage", note: "Cast Mirror Image (CHA). {{Uses Per Long Rest: 1}}" },
          { name: "Solar Flare", note: "Create a 10 ft. burst; each creature in it makes a DEX save or is blinded and takes 2d6 fire, half damage on a success. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Sea Elf", desc: "Coast/Islands | Leyline: Water | CHA +3", traits: [
          { name: "Child of the Tide", note: "(built-in) Your swim speed equals your walking speed. {{Passive}}" },
          { name: "Salt Blooded", note: "(built-in) You can breathe underwater. {{Passive}}" },
          { name: "Navigator's Eye", note: "You gain proficiency in Perception, Athletics, and navigator's or cartographer's tools, and have advantage on sailing and navigation checks. {{Passive}}" },
          { name: "Tidal Surge", note: "In a 15 ft. cone, each creature makes a STR save or is pushed 15 ft. and knocked prone, taking 2d6 bludgeoning. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Wood Elf", desc: "Forest | Leyline: Earth | STR +3", traits: [
          { name: "Fleet of Foot", note: "(built-in) Your speed is 35 ft. {{Passive}}" },
          { name: "Mask of the Wild", note: "(built-in) You can hide while only lightly obscured by natural phenomena. {{Passive}}" },
          { name: "Bark Skin", note: "You gain +1 AC. {{Passive}}" },
          { name: "Hunter's Mark", note: "You know Hunter's Mark and can cast it without a spell slot (WIS). {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
        { name: "Wild Elf", desc: "Fey Realm | Leyline: Air (Fey-touched) | DEX +3", traits: [
          { name: "Fey Step", note: "(built-in) Cast Misty Step as a bonus action. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Fey Mind", note: "(built-in) You have advantage against illusions and magical deception. {{Passive}}" },
          { name: "Fey Glamour", note: "Cast Disguise Self at will (CHA). {{Passive}}" },
          { name: "Fey Sense", note: "You know when a fey creature is within 60 ft., and can sense the Fey Realm or a crossing point within 1 mile. {{Passive}}" },
        ] },
        { name: "Dark Elf Scholar", desc: "Underground (infernal pockets) | Leyline: Dark/Infernal | INT +3", traits: [
          { name: "Infernal Sight", note: "(built-in) You have darkvision out to 120 ft. {{Passive}}" },
          { name: "Dark Arcana", note: "(built-in) You know one Warlock cantrip (CHA). {{Passive}}" },
          { name: "Forbidden Lore", note: "You gain proficiency in Arcana and History, can read and write Infernal, and can identify a spell as it's being cast as a reaction. {{Uses Per Long Rest: 1}}" },
          { name: "Infernal Initiate", note: "You gain the Eldritch Adept feat and learn one Invocation. Requires spellcasting. {{Passive}}" },
        ] },
        { name: "Dark Elf Protector", desc: "Underground (deep stone) | Leyline: Dark/Stone | DEX +3", traits: [
          { name: "Shadow Step", note: "(built-in) Teleport up to 30 ft. between areas of dim light or darkness. {{Uses Per Short Rest: 1}}" },
          { name: "Blindsight", note: "(built-in) You have blindsight out to 10 ft. {{Passive}}" },
          { name: "Underground Predator", note: "You have advantage on Stealth checks in dim light, darkness, or underground, and darkvision 90 ft. in the dark. {{Passive}}" },
          { name: "Shadow Meld", note: "Cast Invisibility; it ends early if you attack or cast a spell. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Moon Elf", desc: "Mountain tops | Leyline: None (dual moon) | WIS +3", traits: [
          { name: "Lunar Attunement", note: "(built-in) You have advantage on WIS checks and saves at night. {{Passive}}" },
          { name: "Moonlit Step", note: "(built-in) You have advantage on Stealth checks under moonlight. {{Passive}}" },
          { name: "Celestial Attunement", note: "You gain proficiency in Religion and Insight, with advantage on checks about celestial bodies, stars, or lunar cycles. {{Passive}}" },
          { name: "Silver Tongue", note: "Invoke the dual moons for advantage on all CHA checks for 1 minute, in any lighting. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Snow Elf", desc: "North/Tundra | Leyline: Ice | CON +3", traits: [
          { name: "Frozen Resilience", note: "(built-in) You have resistance to cold damage. {{Passive}}" },
          { name: "Arctic Survivor", note: "(built-in) You ignore ice and snow terrain, and are immune to extreme cold. {{Passive}}" },
          { name: "Permafrost Skin", note: "As a reaction to a melee attack, reduce its damage by 1d10+prof. If you reduce it to 0, the attacker takes 1d4 cold. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Frozen Aura", note: "Toggle a 5 ft. aura as a bonus action; creatures in it take 1d4 cold and have half speed. {{Uses Per Long Rest: = Prof Bonus}}" },
        ] },
        { name: "Storm Elf", desc: "Storm Isles | Leyline: Air | CON +3", traits: [
          { name: "Stormborn", note: "(built-in) You have resistance to lightning damage and ignore the effects of severe weather and strong wind. {{Passive}}" },
          { name: "Weather Sense", note: "(built-in) You always know what the weather will do for the next hour, and have advantage on saves against being knocked prone or moved against your will. {{Passive}}" },
          { name: "The Struck", note: "As a reaction when you take damage, release the charge: each creature within 10 ft. of you takes lightning damage equal to 1d8 + your prof bonus (DEX save for half, DC 8 + CON mod + prof). {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Thunder Choir", note: "As an action, sing the storm down. Allies within 30 ft. that can hear you gain temp HP equal to your level and advantage on their next save before the start of your next turn. {{Uses Per Long Rest: 1}}" },
        ] },
      ] },

    /* ---- BEAST LANDS (4) ---- */
    { id: "kitsune", name: "Kitsune", category: "Half-Beasts", eyebrow: "Half-Beasts · Fox Folk",
      keywords: "Clever · Illusory · Charming",
      tagline: "Natural-born fox tricksters, no yokai blood involved.",
      lore: "The Kitsune are the fox-folk of the Beast Lands: a studied people, quick of mind and long of memory, possessed of an appetite for the arcane that most peoples reserve for gold or conquest. The cunning the world expects of them is real enough, but it is the cunning of someone who has read more than you, not of someone who means to rob you. A Kitsune hones the body through their eldest art and the mind through magic, and accounts a single life too brief to perfect either.",
      loreSections: [
        { h: "The Art", p: ["Their eldest art is shapeshifting. Every Kitsune learns a little of it in childhood, the way children elsewhere learn their letters, and most never venture further. There is no shame in this. A merchant who can borrow a stranger's face for an afternoon, or slip into fox form to cross a crowded road unseen, has all the art she will ever require.", "To master the ancient ways is another matter entirely. To hone them across decades, until a borrowed shape settles as easily as the first, until one can wear a face so true it deceives the man's own mother, is among the highest things a Kitsune can do with a life. Few walk that road to its end. Those who do are honored the way a people honors anything that takes everything and repays it slowly."] },
        { h: "Tails", p: ["Tails are no measure of shapeshifting. They are the measure of power: arcane mastery, earned across a lifetime and made visible upon the body. A Kitsune grows them one at a time, from the single tail of the student toward the nine that almost none attain.", "A one-tail is a beginner. A nine-tail is a master of the arcane carrying the proof of it behind them, and the climb between the two is the better part of a life."] },
        { h: "The Homeland and the Leaving", p: ["The Kitsune come from Tenkyra, the cluster of mountainous isles at the eastern edge of the world. They dwelt upon the Akimori Mountains, where the slopes were cut into terraces and the terraces crowned with shrines. The land sat upon a deep earth Leyline, and an earth Leyline is a generous thing. The harvests came in heavy. The shrines grew old without anyone needing to make them so.", "Then the Leyline turned.", "No one living knows why an earth line became a fire line, only that it did, and that the mountains it had fed for a thousand years answered by tearing themselves open. The terraces burned. The shrines burned. The islands that could burn, burned, and the rest slid beneath the sea.", "What survived left by boat, west, toward the nearest land that would receive them: the Beast Lands. Most never went further. They came with little, but they came with their tama and their festivals, and they have kept both ever since, upon the old calendar, to the very day. It is the kind of promise one keeps for the people who did not make the boats."] },
        { h: "The Tama", p: ["The tama are soul-stones: smooth spheres of no metal or glass anyone can name, older than any record the Kitsune keep. And they keep meticulous records. Each tama is bound to a living bloodline, sharing its lifeforce, so that the stone holds some portion of what the line is. So long as the tama endures, the people within it are never wholly gone. Harm the stone and you harm the blood. This is why a Kitsune will step before a blade for a sphere of stone, and why no enemy who understands the tama ever leaves one whole.", "Several survive, scattered now among the shrines of the Beast Lands. One is the eldest. The First Tama sat at the center shrine from before there were records to say when it had come, the heart of a faith the others only echo, bound to the oldest bloodline of all. It is the thing the Kitsune would die for. One of them did."] },
        { h: "Renjiro the Ashclimber", p: ["When the mountains broke, Renjiro climbed back into them.", "Everyone else was coming down. He went up, through the ash and the heat rolling off the stone, to the center shrine, for the First Tama. He found it. He took it. He carried it down through smoke that killed slower-footed people to his left and to his right, and he reached the boats, and they were holding for him, and he could have stepped aboard. He looked back at the mountain instead.", "There were shrine-keepers still up there. There were other tama, other bloodlines bound to them. He had made the climb once and lived, and a man who has survived a thing once believes he can survive it twice. So he set the First Tama in another's hands, and he turned, and he went back up.", "He did not reach the shrine. He did not reach the keepers. He did not find the other stones, or carry them down, or feel the heat break the second time the way it had the first. He did not come down the mountain at all.", "His family had already made the crossing. His line lives among the Kitsune still, known by his name and weighted with it, bound to the very stone he died to save. The young tell his story as devotion. The old tell it the way it happened: the First Tama survived because the Ashclimber went up once. Renjiro did not, because he went up twice.", { aside: "I will add one thing, and you may wonder how I come to know it: the second time, he was not afraid." }] },
        { h: "Playing a Kitsune", p: ["A Kitsune character carries a scholar's hunger inside a survivor's tradition: magic pursued as a debt to a drowned homeland, mischief worn lightly over a long memory, and somewhere behind you, a shrine and a stone your blood is bound to. You keep old festivals to the day in lands that have never heard of them. Quick, curious, and courteous until given cause otherwise, you measure your life in what you have mastered, and you know precisely what you would die for."] }
      ],
      facts: [{ label: "Stats", text: "Set +2 INT / Chosen +1" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Fox's Wedding", note: "You know the Druidcraft and Produce Flame cantrips. At 3rd level, you can also cast Disguise Self as a 1st-level spell. {{Uses Per Long Rest: 1}}" },
        { name: "Kitsune Guile", note: "You gain proficiency in one of Deception, Persuasion, or Stealth. {{Passive}}" },
        { name: "Instinct Die", note: "After seeing a roll, add a d6 to it once per turn, for an attack roll, check, or save. {{Uses Per Long Rest: = Prof Bonus}}" },
      ],
      legacy: [
        { name: "Nine Tails", note: "Drop to 1 HP instead of 0. {{Uses Per Long Rest: 1}}" },
        { name: "Illusory Step", note: "Cast Misty Step as a bonus action without a spell slot (INT). {{Uses Per Long Rest: 1}}" },
        { name: "Phantom Tail", note: "Invoke the Cleric's Duplicity feature. {{Uses Per Long Rest: 1}}" },
        { name: "Keen Nose", note: "You gain proficiency in Perception, with advantage on scent-based checks. {{Passive}}" },
        { name: "Foxfire Charm", note: "Cast Charm Person without a spell slot (INT); foxfire is visible on the target while they're charmed. {{Uses Per Long Rest: 1}}" },
      ],
      subraces: [
        { name: "Kumiho", desc: "Dark trickster fox", traits: [
          { name: "Full Transformation", note: "Perfectly assume the appearance, voice, and mannerisms of any humanoid you've seen for 1 hour, with advantage on Deception while in that form. {{Uses Per Long Rest: 1}}" },
          { name: "Consuming Illusion", note: "Cast Major Image without a spell slot (INT); the target makes a WIS save or believes it's real for 1 minute. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Inari", desc: "Sacred fox, divine, shrine connection", traits: [
          { name: "Shrine Keeper", note: "You gain proficiency in Religion and Insight, and can commune with a shrine for local information. {{Uses Per Long Rest: 1}}" },
          { name: "Fox's Grace", note: "Turn a failed death save into a success, for yourself or an ally within 30 ft. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Kiko", desc: "Wild fox, physical, fast, feral", traits: [
          { name: "Fox's Stance", note: "You gain the Fighting Initiate feat and one Fighting Style. {{Passive}}" },
          { name: "Savage Attacks", note: "Roll one extra weapon damage die on a crit. {{Passive}}" },
        ] },
        { name: "Byakko", desc: "White fox, rare omen, prophetic", traits: [
          { name: "White Omen", note: "Declare an omen; you know when it's about to happen, within 1 minute of it occurring, until your next long rest. {{Uses Per Long Rest: 1}}" },
          { name: "Omen's Warning", note: "As a reaction, give an ally +5 AC against an incoming attack. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Shadokiri", desc: "Shadow fox, stealth, spies/assassins", traits: [
          { name: "Shadow Step", note: "As a bonus action, teleport up to 30 ft. between areas of dim light or darkness. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Death from Shadows", note: "After hitting a creature while hidden, Hide again as a free action. {{Passive}}" },
        ] },
      ] },

    { id: "plumari", name: "Plumari", category: "Half-Beasts", eyebrow: "Half-Beasts · Songbird Folk",
      keywords: "Flying · Musical · Swift",
      tagline: "Winged performers of song and festival, nothing like harpies.",
      lore: "Plumari are songbird-folk, at home in the sky and merely visiting the ground. Bright-feathered, loud, and quick, they turn nearly everything into song and motion, a greeting, a grief, an ordinary good afternoon, and they mean all of it while it lasts. A people who can leave whenever they please never quite learned to be held anywhere. Try to pin a Plumari down and you will usually find they have already flown.",
      loreSections: [
        { h: "Where They Live", p: ["The Plumari belong to the mountains and forests of the Beast Lands, where cliff and canopy let a flighted people live in three dimensions, nesting on the high rock and filling the trees below from first light. They keep exactly one border, drawn around Cantavera, a small city woven into the forest itself, nests and bridges and song-halls strung through the living trees. Even the freest people need one place where the eggs are safe and the old can roost. This is theirs, and it is what a Plumari means by home, wherever the wind has put them. Beyond it they claim nothing. Borders are for people who cannot fly over them. Most folk who have met a Plumari remember it warmly and count on them not at all, and the Plumari consider that a fair account. They came, they sang, they were gone by morning, and to a Plumari that story does not need a better ending."] },
        { h: "On the Wing", p: ["A Plumari lives at the speed of the moment. They decide with the body a beat before the mind catches up, catch a falling cup without looking, follow a whim three towns over because the morning felt like it. It is how a creature built for the air moves through the world, on instinct, trusting the gut to be right more often than not, and it usually is. A Plumari who swears to meet you at dawn means it completely. Whether they are there at dawn depends on the dawn."] },
        { h: "Color and Song", p: ["Whatever a Plumari feels, they wear it and they play it. Their plumage runs to every color a feather can carry, and the brightest of it is flashed on purpose, courtship, boast, and mood worn all at once. Music and dance are their native tongue of feeling, the way other peoples weep or shout. But where some make their festivals a solemn, shared thing, the Plumari make theirs personal. Every singer sings their own song, and a gathering is a hundred solos that happen to share a night, no one keeping time for anyone else."] },
        { h: "The Hawks Among Them", p: ["Not every Plumari is a songbird. Through the bright small ones runs a sharper strain, the raptor-blooded, bigger and quieter and built for the hunt instead of the chorus. They are no outsiders. A people of the air respects a hunter of the air, and the hawks are the ones called on when the flock needs teeth. But a predator's instinct sits strange in a culture built for celebration, and the raptor-blooded leave more than any other Plumari do, pointing all that restlessness at the horizon. Meet a Plumari far from home and walking into danger on purpose, and the odds are there is a hawk in the blood."] },
        { h: "Playing a Plumari", p: ["A Plumari character lives at the speed of the moment: instinct first, song always, the horizon a standing invitation. You mean every promise completely and keep the ones the dawn permits. Bright or raptor-blooded, you are the friend remembered warmly and counted on never, and you have made your peace with that being a compliment."] }
      ],
      facts: [{ label: "Stats", text: "Set +2 CHA / Chosen +1" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Songbird Wings", note: "Your fly speed is 30 ft., but you can't fly while wearing medium or heavy armor. {{Passive}}" },
        { name: "Natural Performer", note: "You gain proficiency in Performance and one musical instrument. {{Passive}}" },
        { name: "Instinct Die", note: "After seeing a roll, add a d6 to it once per turn, for an attack roll, check, or save. {{Uses Per Long Rest: = Prof Bonus}}" },
      ],
      legacy: [
        { name: "Festival Voice", note: "You know Vicious Mockery and one Bard cantrip (CHA). {{Passive}}" },
        { name: "Hollow Bones", note: "You have advantage on DEX saves and disadvantage on STR saves and checks, and can't wield heavy weapons. {{Passive}}" },
        { name: "Sharp Eyes", note: "You gain proficiency in Perception, with advantage on sight-based checks. {{Passive}}" },
        { name: "Chromatic Display", note: "Fan your wings in a 15 ft. cone, casting a modified Hypnotic Pattern (CHA). {{Uses Per Long Rest: 1}}" },
        { name: "Strong Wings", note: "Your fly speed increases by 15 ft. and you can fly even in medium or heavy armor. {{Passive}}" },
      ],
      subraces: [
        { name: "Aurelian", desc: "Golden songbirds, performers, bards", traits: [
          { name: "Song of Inspiration", note: "As a bonus action, give an ally within 30 ft. a d8 to add to any roll for 1 minute. {{Uses Per Short Rest: 1}}" },
          { name: "Encore", note: "When you beat a CHA check by 5 or more, the target is charmed until the end of its next turn. {{Passive}}" },
        ] },
        { name: "Zyphyr", desc: "Fastest Plumari, aerial acrobatics", traits: [
          { name: "Gale Rush", note: "When you Dash while flying, gain an extra 30 ft. of speed until the end of the turn. {{Passive}}" },
          { name: "Impossible Speed", note: "Your fly speed increases by 20 ft., and you can Dash as a bonus action while flying. {{Passive}}" },
        ] },
        { name: "Tidewing", desc: "Coastal seabirds, water connection", traits: [
          { name: "Mist Veil", note: "Create a 20 ft. fog cloud for 10 minutes; you can see through it, but others find it heavily obscured. {{Uses Per Long Rest: 1}}" },
          { name: "Aquatic Bond", note: "Communicate with aquatic creatures and ask one a question, which it answers truthfully. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Darkfeather", desc: "Ravens/crows, cunning, secrets", traits: [
          { name: "Collector of Secrets", note: "You gain proficiency in Insight and Deception, and can learn a secret after a 1-minute conversation. {{Uses Per Long Rest: 1}}" },
          { name: "Fisher's Eye", note: "You can see underwater out to 60 ft., with advantage on tracking checks in or near water. {{Passive}}" },
        ] },
      ] },

    { id: "leporin", name: "Leporin", category: "Half-Beasts", eyebrow: "Half-Beasts · Rabbit Folk",
      keywords: "Fast · Stealthy · Solitary",
      tagline: "Stealthy, rogue-leaning, deeply individualist.",
      lore: "Leporin are the rabbit-folk of the Beast Lands, human in frame like most beast peoples, marked by long floppy ears, a short bushy tail, and quick dark eyes that miss very little. They are a quiet people, and the quiet misleads. No people in the Beast Lands survive the road like the Leporin, and it is not because trouble never finds them. It is that trouble rarely gets what it came for.",
      loreSections: [
        { h: "Quiet, Not Unarmed", p: ["A Leporin walks into a room and knows the exits before they know your name. The whole people practice the same discipline without thinking: notice first, sit near the door, count the strangers, leave before the trouble starts. Their ears catch a whisper across a tavern, their stillness reads danger while the room is still laughing. But the habit is only the foundation. What's built on it is training.", "Peaceable is the wrong word for them. Their traditions run to the quiet arts, the monk's empty hand, the rogue's soft step, the killer nobody saw arrive, and a Leporin who has decided a fight is worth having tends to end it before the other side knows it started. Nine fights out of ten they walk away from. The tenth, they chose. And not every Leporin keeps the quiet: a loud minority genuinely likes the scrap, rowdy warren-brawlers who are, to the mild embarrassment of their careful kin, alarmingly good at it."] },
        { h: "The Golden Leyline", p: ["The Leporin homeland is a country of soft green hills, low stone walls, and rain that never stays long, and beneath it runs the Golden Leyline, unlike any other in Loglandia. Where other Leylines feed fire or tide or stone, the Golden Leyline bleeds fortune. Things go a little better near it, and for a people burrowed in its soil their whole history, that little has compounded. The branch holds. The guard yawns. The wrong step lands on the one soft spot. This is the famous Leporin luck, and it is real, and every Leporin knows what it costs.", "Because the Leporin do not believe luck is theirs. It is borrowed, every stroke of fortune a loan the world will one day collect, no telling when or how. So the luckiest people alive are also the most careful, and the faith lives in small daily habits: never thank your luck out loud, never count a win before you are home, never call a road safe while your feet are on it. A Leporin who swaggers on their luck is not brave. They are running up a bill."] },
        { h: "The Shrine of Spent Luck", p: ["Long ago, and no one knows why, a length of the Golden Leyline snapped. The broken end surfaced far from the homeland, a mountaintop cave where raw fortune poured into the open air and then, over slow centuries, bled dry. That scar is the Shrine of Spent Luck, the holiest place the Leporin have, precisely because there is no luck left in it. It is what the debt looks like paid in full.", "Every Leporin makes the pilgrimage at least once, carrying a token of the luckiest moment of their life, the snapped rope that held, the bent coin that stopped the arrow, to lay in the dead cave among centuries of others. The last stretch up the mountain is walked barefoot. The way is long and dangerous, and the rite means it to be. A careful person crossing a dangerous world alone is the whole prayer. The token is just the receipt.", { aside: "It is among the better prayers I know. Most ask to be spared. This one only asks to arrive." }] },
        { h: "The Warren and the Hearth", p: ["Leporin live in warrens, burrow-towns dug warm and deep into the green hills along the Golden Leyline, close-packed, safe, and full of everyone's business. And then, one by one, they leave, traveling more than almost any people alive, and traveling alone, a single quiet figure slipping through places most people cross with an escort. The pilgrimage starts it. Curiosity finishes it.", "What they carry home is the story, and the story is not optional. A returned traveler tells the road at the warren hearth, and the telling is half entertainment, half accounting, the warren's way of learning every danger one of its own survived. A Leporin goes out because they cannot stand not knowing what is in the world, and comes home because a story is worth nothing without a hearth to tell it at."] },
        { h: "How the World Sees Them", p: ["Most peoples find Leporin easy to like and easy to overlook, a quiet, polite traveler at the corner table last night and gone by morning. Traders trust them, innkeepers remember them fondly, and almost nobody can say where they were headed. That is as the Leporin prefer it. The world is full of things worth seeing and things worth avoiding, and the Leporin's whole art is knowing, sooner than anyone, which is which."] },
        { h: "Playing a Leporin", p: ["A Leporin character notices first and fights tenth: quiet arts, quick ears, a seat near the door. Your luck is real and borrowed, so you spend it as a debtor spends, carefully. You have come out to see the world alone, and every road you survive is a story owed to a hearth somewhere in the green hills."] }
      ],
      facts: [{ label: "Stats", text: "Set +2 DEX / Chosen +1" }, { label: "Speed", text: "35 ft." }],
      builtins: [
        { name: "Swift of Paw", note: "You have advantage on Initiative. {{Passive}}" },
        { name: "Nervous Energy", note: "You can Dash or Disengage as a bonus action. {{Passive}}" },
        { name: "Guarded", note: "You have disadvantage on Persuasion checks. {{Passive}}" },
        { name: "Slight Frame", note: "You have disadvantage on STR saves. {{Passive}}" },
        { name: "Instinct Die", note: "After seeing a roll, add a d6 to it once per turn, for an attack roll, check, or save. {{Uses Per Long Rest: = Prof Bonus}}" },
      ],
      legacy: [
        { name: "Self Sufficient", note: "You gain proficiency in Survival and Stealth. {{Passive}}" },
        { name: "Rundown", note: "Once per turn after hitting a creature, move at half speed toward it without provoking opportunity attacks. {{Passive}}" },
        { name: "Ambush", note: "Attacking a creature that hasn't acted yet deals an extra 1d8+prof damage. {{Passive}}" },
        { name: "Zigzag", note: "If you Dash using your full movement, ranged attacks against you have disadvantage until your next turn. {{Passive}}" },
        { name: "I Work Alone", note: "While no allies are within 15 ft., you gain +1 AC and advantage on DEX saves. {{Passive}}" },
      ],
      subraces: [
        { name: "Snowpaw", desc: "Arctic hare, cold survivor, patient", traits: [
          { name: "Arctic Camouflage", note: "You have advantage on Stealth checks in snow or ice, and are invisible to creatures 30+ ft. away in snow unless you move. {{Passive}}" },
          { name: "Frozen Endurance", note: "You have resistance to cold, are immune to extreme cold, and have advantage on CON saves in the cold. {{Passive}}" },
        ] },
        { name: "Duskwhisker", desc: "Nocturnal, info brokers", traits: [
          { name: "Echolocation", note: "You have blindsight 30 ft. through hearing, and are immune to being deafened while it's active. {{Passive}}" },
          { name: "Whisper Network", note: "You gain proficiency in Insight and Persuasion, and can find an informed contact in any settlement. {{Uses Per Long Rest: 1}}" },
        ] },
      ] },

    { id: "drakel", name: "Drackal", category: "Half-Beasts", eyebrow: "Half-Beasts · Dragon-touched",
      keywords: "Charismatic · Critical · Draconic",
      tagline: "Not descendants of dragons — shaped by them, which is a different thing entirely.",
      lore: "Drackal are the dragon-touched. What the Elemental Planes are to Primordia, Vaelrath is to them: a plane that reached into a mortal soul and left its mark. Every Drackal carries the horned crest, the tail, the scales, and the eyes of a dragon, and carries them well. The features settle into a face rather than sitting on it, so the same world that side-eyes most Planetouched mostly forgets to distrust these ones. A Drackal walks into a room wearing proof of another plane, and the room offers them a chair.",
      loreSections: [
        { h: "The Touch", p: ["There is more than one road to being Drackal. Some are born to it, a dragon somewhere in the bloodline still speaking through it generations on. Others are made, blessed or cursed by a dragon whose attention rewrote what they were. And a few were only exposed, a child or an unborn babe touched by dragon's blood, changed before they could refuse. However the touch arrives, it does not fade, and it does not care whether it was asked for."] },
        { h: "The Aspects", p: ["Every Drackal takes after their dragon, and takes after them hard. Where Dragonkin inherit broadly, a Drackal inherits one aspect above the rest, and that aspect divides their kind.", "The fierce of claw take the hunter. Heavy through the shoulder, taloned, direct, they inherit the part of a dragon that ends arguments.", "The fierce of scale take the armor. Their hide runs thick and overlapping, near a true dragon's, and they stand through what should have dropped them.", "The fierce of wing take the speed. Light-built and faster than thought, they move like the sky kept a claim on them."] },
        { h: "The Dragon's Dignity", p: ["A Drackal is born with some measure of a dragon's dignity, and it shows early: a natural sense of honor, a force of personality that fills rooms without trying. It comes with the dragon's other inheritance too. A quiet certainty of standing a little above mortal folk grows with age, and an old Drackal left too long among their own thoughts starts to sound like what touched them, grand, remote, and difficult to dine with. The cure is company. A Drackal who keeps friends close keeps their feet on the ground, and most learn to hold onto a few on purpose."] },
        { h: "Vaelrath and the World", p: ["Most Drackal are born in Vaelrath and stay there, living in the courts and territories of the dragons whose influence made them. Dragons of every temper keep them, good and wicked alike, and prize them for the same reason: when a dragon has business among mortals, the Drackal is the envoy it sends, draconic enough to carry the master's weight and mortal enough not to empty the hall. Where Vaelrath leaks through into Tenkyra, Drackal walk the isles openly, and a scattering have drifted further into the world from there, carrying the crest and the tail into places that have never seen the plane behind them."] },
        { h: "Playing a Drackal", p: ["A Drackal character carries Vaelrath in the blood and wears it well: crest, tail, scales, and a dragon's dignity that opens doors other Planetouched find shut. Claw, scale, or wing, you inherited one aspect loudly and the bearing that comes with all of them. Keep good company. It is the one cure your kind has found against becoming what touched you."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Darkvision", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Dragon's Blood", note: "Your creature type is Humanoid and Dragon. {{Passive}}" },
        { name: "Dragon's Heart", note: "You may use CHA in place of any ability score a feature, feat, trait, or item requires as its spellcasting ability. {{Passive}}" },
        { name: "Sharp Critical", note: "Your crit range for all attacks increases by 1. On a crit, you deal extra damage equal to twice your prof bonus. {{Passive}}" },
        { name: "Heritage Type", note: "Your heritage type sets your scale and eye color and some small features [details pending per type]. It does not grant damage resistance on its own — that comes only from Inherited Resilience. {{Passive}}" },
        { name: "Languages", note: "You know Common and Draconic. {{Passive}}" },
      ],
      legacy: [
        { name: "Serpent's Wit", note: "You gain proficiency in Persuasion, Insight, and Intimidation. {{Passive}}" },
        { name: "Draconic Echo", note: "As a bonus action, let the dragon plane surface in you; until the end of your next turn, your attacks deal an extra 1d8 of your heritage's damage type, and your eyes and scales glow with it. {{Uses Per Long Rest: 1}}" },
        { name: "Bloodlust Momentum", note: "Once per turn, when you reduce a creature to 0 HP or score a crit, move up to 10 ft. without provoking opportunity attacks. {{Passive}}" },
        { name: "Inherited Resilience", note: "Choose one damage type to be resistant to: acid, cold, fire, lightning, necrotic, or poison. Usually your heritage type. {{Passive}}" },
        { name: "Heritage Overlap", note: "Choose one legacy trait from the Dragonkin legacy trait list. This is how a Drackal gains flight — by taking Wings. {{Passive}}" },
      ],
      subracesLabel: "Subrace (by dominant aspect)",
      subraces: [
        { name: "Fierce of Claw", desc: "Strength aspect", traits: [
          { name: "Dragon Claws", note: "(built-in) Your claws are natural weapons dealing 1d6 + STR slashing damage. {{Passive}}" },
          { name: "Crushing Blood", note: "When you hit with a melee attack, add an extra 1d10 of your heritage's damage type to the hit. {{Uses Per Long Rest: 1}}" },
          { name: "Unstoppable", note: "You have advantage on STR checks and saves to break free of or impose a grapple, restraint, or shove, and on STR (Athletics) checks generally. {{Passive}}" },
        ] },
        { name: "Fierce of Scale", desc: "Constitution aspect", traits: [
          { name: "Natural Armor", note: "(built-in) While you aren't wearing heavy armor, your base AC is 13 + CON mod. {{Passive}}" },
          { name: "Enduring Blood", note: "You gain the Tough feat. {{Passive}}" },
          { name: "Second Skin", note: "When you are reduced to 0 HP but not killed outright, drop to 1 HP instead. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Fierce of Wing", desc: "Dexterity aspect", traits: [
          { name: "Crest Drop", note: "(built-in) Your walking speed increases by 5 ft., and you don't take fall damage from falls of 30 ft. or less. {{Passive}}" },
          { name: "Skysurge", note: "Cast Misty Step without a spell slot (CHA), flavored as a beat of draconic wings. {{Uses Per Long Rest: 1}}" },
          { name: "Windborn Reflexes", note: "You have advantage on Initiative rolls. {{Passive}}" },
        ] },
      ] },
    /* ---- EXOTIC (3) ---- */
    { id: "mothkin", name: "Mothkin", category: "Standard", eyebrow: "Standard · Moth Folk",
      keywords: "Flying · Eerie · Radiant",
      tagline: "Fully insectoid, four-armed, drawn to light despite the dark.",
      lore: "Mothkin are a soft, night-eyed people of the deep places: tall and slight, with feathered antennae, great dark eyes, and wings powdered in a fine dust that comes away at a touch. They live underground and always have. Above the vault of their greatest cavern hangs the Great Light, a crystal grown into the stone roof, and every Mothkin alive was born beneath it.",
      loreSections: [
        { h: "The Great Light", p: ["The Great Light is their god, their sun, and their calendar. It brightens and dims on a cycle no one has ever explained, and the Mothkin order their whole existence by it: they wake when it warms, hold their festivals at its brightest hour, and bury their dead in the dark of its low season. They do not petition it. One does not petition the sun. They simply arrange themselves beneath it and remain grateful, and a Mothkin taken far from the cavern will speak of the ache of its absence the way another people speaks of homesickness, though rather more literally.", "It is why they are drawn to lights at all. A Mothkin who wanders the surface will orbit lanterns, forge-fires, and lighthouses without meaning to, looking for something that is not there."] },
        { h: "The Dust", p: ["A Mothkin cannot conceal where they have been. The dust comes off the wings in a faint bright residue, on doorframes and sills and the shoulder of anyone they have embraced, and it lingers for days. This has made them the world's least successful liars and its most trusted messengers, and it has shaped their manners entirely: to enter a place is to admit it, so a Mothkin asks before crossing a threshold and counts an uninvited entry among the gravest rudenesses."] },
        { h: "Playing a Mothkin", p: ["A Mothkin character is gentle, watchful, and a long way from the only light that ever mattered. You leave evidence wherever you go, ask before you enter, and find yourself circling lamps you did not intend to approach. Everyone will always know you were there."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Moth Wings", note: "Your fly speed is 20 ft., but you can't fly while wearing medium or heavy armor. {{Passive}}" },
        { name: "Compound Eyes", note: "You have advantage on sight-based Perception checks, and can't be flanked. {{Passive}}" },
      ],
      legacy: [
        { name: "Moonmoth Blessing", note: "Cast Bless without a spell slot (WIS). {{Uses Per Long Rest: 1}}" },
        { name: "Antenna Sense", note: "You have tremorsense 15 ft., advantage on Initiative, and can't be surprised. {{Passive}}" },
        { name: "Luminous Wings", note: "You can fly even in medium or heavy armor, and your wings shed light 15 ft. plus dim light for another 15 ft. while flying. Toggle this as a bonus action. {{Passive}}" },
        { name: "Death's Head", note: "Flash a death's-head pattern on your wings; each creature within 30 ft. makes a WIS save or is frightened until your next turn. {{Uses Per Long Rest: 1}}" },
        { name: "Shard Touched", note: "You have resistance to radiant damage, and can convert radiant damage you take into temp HP. {{Uses Per Long Rest: 1}}" },
      ] },

    { id: "grung", name: "Grung", category: "Standard", eyebrow: "Standard · Frog Folk",
      keywords: "Poisonous · Leaping · Amphibious",
      tagline: "Eastern jungle frog-folk; your color decides what you can do.",
      lore: "Grung are small, bright-skinned frog-folk of the eastern jungles, arboreal and loud, who keep a modest society in the canopy where the rivers run down toward the Kua Hono coasts. Their skin runs with a poison they neither chose nor can switch off, potent enough to drop a grown orc from a handshake. Every custom they keep grows from that one inconvenient fact.",
      loreSections: [
        { h: "The Courtesy of Distance", p: ["A Grung greets you at six paces with both hands raised and open, and that gesture is the whole of their diplomacy: I am here, I am armed by birth, and I keep my distance out of respect for you. Outsiders read the ritual as arrogance. It is nearer to an apology.", "Everything else follows. Grung do not shake hands, embrace strangers, share a cup, or crowd a doorway. They cook with long tools and eat apart. Their children learn the six paces before they learn to swim."] },
        { h: "Their Own", p: ["They can touch each other.", "Grung poison does nothing to Grung, and so touch among their own kind is not casual but the central pleasure of their lives. They pile together to sleep, groom one another for hours, and carry their young against the skin until the young object. A Grung family in private is the warmest room in the jungle, and it explains the rest of them, including the pride. It is easier to hold your chin up among strangers when you know what is waiting for you at home."] },
        { h: "Playing a Grung", p: ["A Grung character is armed simply by existing and has built an entire personality around managing it: proud, formal, and scrupulous about distance with strangers, startlingly affectionate with your own. You will spend your life read as haughty by people who have never seen you off duty."] }
      ],
      facts: [{ label: "Stats", text: "Set +2 DEX" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Amphibious", note: "You can breathe air and water. {{Passive}}" },
        { name: "Poison Resistance", note: "You have resistance to poison damage, and advantage on saves against being poisoned. {{Passive}}" },
        { name: "Poisonous Skin", note: "Creatures grappling you take 5 poison damage. You can also coat a weapon, dealing 1d4 poison on hit; the target makes a CON save or is poisoned for 1 minute. {{Uses Per Short Rest: 1}}" },
        { name: "Standing Leap", note: "Your long jump is 25 ft. and your high jump is 15 ft., with no running start needed. {{Passive}}" },
      ],
      subracesLabel: "Color (choose one, in place of legacy traits)",
      subraces: [
        { name: "Green", desc: "", traits: [
          { name: "Green", note: "You gain proficiency in Stealth and can Hide as a bonus action. {{Passive}}" },
        ] },
        { name: "Blue", desc: "", traits: [
          { name: "Blue", note: "You gain proficiency in Performance and can cast Charm Person (WIS). {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Purple", desc: "", traits: [
          { name: "Purple", note: "You gain proficiency in Persuasion and resistance to psychic damage. {{Passive}}" },
        ] },
        { name: "Red", desc: "", traits: [
          { name: "Red", note: "You gain resistance to fire and proficiency in Survival. {{Passive}}" },
        ] },
        { name: "Gold", desc: "", traits: [
          { name: "Gold", note: "Cast Cause Fear without a spell slot (WIS). {{Uses Per Long Rest: 1}}" },
        ] },
      ] },

    { id: "changeling", name: "Changeling", category: "Standard", eyebrow: "Standard · Shapeshifters",
      keywords: "Shapeshifting · Deceptive · Adaptive",
      tagline: "Kitsune who traded their fox blood away, and every leyline with it.",
      lore: "Changelings were Kitsune once, and every people in the Beast Lands remembers it.",
      loreSections: [
        { p: ["They were a clan of the fox-folk, and what they did they did deliberately. The details are argued over and the shape of it is not: they went to a trickster power, they asked to be cut loose from their fox heritage, and the bargain was honored. In exchange they were given the shapeshifting whole and entire, no longer the studied art of a lifetime but a birthright, worn as easily as a change of coat. What they were not told, or were told and discounted, was the price. The severing took the Leylines with it. Changelings feel nothing of the lines that run beneath the world, not the pull, not the hum, not the faintest sense of which way the power runs, and they are the only people in Loglandia of whom that is true.", "The Kitsune have not forgiven it, and their reasons are worse than mere insult. A clan that severed its own heritage severed its tama with it, and a bloodline cut from its soul-stone is a bloodline the Kitsune consider to have died on purpose. They will not say the clan's name. Elsewhere the dislike is plainer and less theological: a people who can wear any face at will are trusted by nobody, and the fact that most Changelings are perfectly ordinary about it has never once helped.", "They live scattered, in cities mostly, in ones and twos rather than communities. There is no Changeling homeland and no Changeling quarter anywhere in the world, and this is not entirely because others refused them one."] },
        { h: "Playing a Changeling", p: ["You can be anyone, which is the first thing everybody thinks of and the least interesting thing about you. You are deaf to the Leylines in a world that runs on them, disliked on sight in the Beast Lands, and descended from ancestors who chose all of it. Whether that was a bargain or a mistake is the question your people have been quietly arguing since it happened."] }
      ],
      aside: "Changelings answer to the Trickster God, a divine connection still being built out. Treat it as confirmed but undetailed for now.",
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Shapechanger", note: "As an action, change your appearance to any humanoid you've seen, or back to your true form, altering your height, weight, voice, and face. Your clothing and equipment don't change. The change lasts until you use this again or you die. {{Passive}}" },
        { name: "Languages", note: "You know Common, plus one language of your choice. {{Passive}}" },
      ],
      legacy: [
        { name: "Practiced Liar", note: "When you fail a Deception check, succeed instead. {{Uses Per Long Rest: 1}}" },
        { name: "Quick Change", note: "Use Shapechanger as a bonus action instead of an action. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Voiceless Truth", note: "No spell or effect, such as Zone of Truth, can compel you to speak true information against your will. {{Passive}}" },
        { name: "Skin Deep", note: "You gain proficiency in Deception and Insight, with advantage on Deception checks when impersonating someone you've physically touched. {{Passive}}" },
        { name: "Adaptive Mimicry", note: "You gain the Skill Expert feat: proficiency in one skill, and expertise in a skill you're already proficient in. {{Passive}}" },
      ] },

    /* ---- STANDARD (7) ---- */
    { id: "dragonkin", name: "Dragonkin", category: "Standard", eyebrow: "Standard · Dragon-touched",
      keywords: "Tough · Elemental · Fierce",
      tagline: "Scaled, horned, unmistakable, and they know exactly what they come from.",
      lore: "Dragonkin are the descendants of dragons, scaled and horned and unmistakable, their colors conferred by the dragon they descend from. Their ancestors are not dead. The dragons live, most of them deep in Vaelrath, few enough and far enough that a sighting is a story told for a generation, and the Dragonkin are the part of the family that stayed in the mortal world. Their empire, their ornament, their pride all follow from one arrangement: the ancestors are alive, the ancestors are watching, and the house is kept ready.",
      loreSections: [
        { h: "Where They Live", p: ["Dragonkin gather in and around Drakopolis, where the Basileus holds court, and spread thin through the cities of other peoples besides, always recognizable, always ornamented a little past the local custom and carrying it well. The world calls them proud, and it is half right. The pride is real, but it points upward. A Dragonkin stands the way you stand when someone you admire might, at any moment, walk in."] },
        { h: "Which Dragon", p: ["Every Dragonkin line traces to a particular dragon, and every dragon is a creature of an element, so a Dragonkin is never dragon in the abstract. The red lines run to fire and burn quick-tempered and quick to forgive. The white run to ice, patient and hard to read. The blue carry the storm, restless and fast and first to move. The black carry acid and shadow and are at ease in both. The golden, rarest of all, descend from Pyris, who founded Vaelrath itself and carries the golden luck, and things near a golden Dragonkin have a habit of going a little too well. Two of them can share a rank, a court, and a city and still stand as far apart as a volcano and a glacier, because the dragons were never one thing."] },
        { h: "The Ancestors Above", p: ["Dragonkin honor the dragons the way other peoples honor gods, with one difference that changes everything: their gods can arrive. A dragon crossing out of Vaelrath is rare, but it happens, and when word spreads that one has been seen, Dragonkin of its color will travel weeks for the chance to stand in its shadow. To be acknowledged by the dragon of your own line, spoken to, or even looked at and not dismissed, is the highest thing that can befall a Dragonkin, and the old families keep scrupulous account of the last time it befell theirs. Some of those accounts are centuries old. They are recited anyway, dated and named and word for word."] },
        { h: "The Blood", p: ["The old houses still reckon blood, counting the generations back to the ancestor and holding nearness as standing. A family two steps from the dragon outranks a family ten steps out, in courtesy if nothing else, and the great houses can recite their line the whole way up. But the count opens doors rather than closing them. A Dragonkin of thin blood and great deeds will be seated above a pure-blooded idler at any table that matters, because the ancestors are alive and no one wants to be caught explaining the idler."] },
        { h: "The Basileus in Purple", p: ["At the top sits the Basileus, the Dragonkin Emperor, throned in the Thronos Drakon at the heart of Drakopolis, and the court around the throne is a permanent ceremony ornate past all sense. The excess is not vanity. It is housekeeping. The empire is kept the way a great house is kept for a master who rarely visits: if a dragon crossed tomorrow and came to Drakopolis, it would find the halls burnished, the old names remembered in order, and its descendants dressed for the occasion. No Basileus intends to be the one who let the ancestors find the family gone shabby. There has never been a plain one."] },
        { h: "The Hoard", p: ["Every Dragonkin keeps a hoard, and almost none of them hoard gold. The custom comes straight down from the ancestors, who hoard because it is their nature, and their children keep it in miniature: a collection of whatever its keeper has decided matters, maps and oaths and letters and songs and grudges and the true names of friends. A Dragonkin is understood by what they collect. Hoards pass down at death, added to and never sold, so the oldest families stand on centuries of kept things. Ask a Dragonkin what is in their hoard and you have asked something more intimate than their name. Some will tell you. Remember it if they do.", { aside: "They tell me, eventually. Everyone does." }] },
        { h: "The Touched Cousins", p: ["Dragonkin and Drackal know each other on sight. In a mortal world that eyes them both for their horns, the two peoples recognize the one thing they share and no one else does, a dragon somewhere over the shoulder, and most Dragonkin greet a Drackal as the nearest thing to family a stranger can be. The warmth pays its own way. Drackal are born in Vaelrath and hold standing in the dragons' courts that no Dragonkin house can buy, so when a family needs word carried to its ancestor, a Drackal carries it. Most Dragonkin count that a mercy. A sour few never forgive it, galled that a made thing with no line of its own should stand nearer the ancestors than blood does, and they say so quietly, to people who already agree. The rest pour the Drackal a drink and ask after the roads in Vaelrath."] },
        { h: "Playing a Dragonkin", p: ["A Dragonkin character stands ready for an arrival: ornamented, exact, and proud in a direction. Your color is your element and your temper, your hoard is your autobiography, and your ancestors are alive, distant, and possibly watching. Whether you keep the house ready out of faith, ambition, or habit, you are the mortal remainder of the greatest beings this world has held, and you dress accordingly."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Darkvision", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Dragon's Blood", note: "Your creature type is Humanoid and Dragon. {{Passive}}" },
        { name: "Draconic Ancestry", note: "Your subrace determines your breath weapon's damage type, your resistance, and your coloration. {{Passive}}" },
        { name: "Breath Weapon", note: "As an action, exhale in a 15 ft. cone or 30 ft. line (chosen when you gain this trait, fixed thereafter). Each creature in the area makes a DEX save (DC 8 + CON mod + prof); on a failure they take 2d6 damage, half on a success. Increases to 3d6 at 6th level, 4d6 at 11th, 5d6 at 16th. {{Uses Per Short or Long Rest: 1}}" },
        { name: "Draconic Resistance", note: "You have resistance to your subrace's damage type. {{Passive}}" },
        { name: "Languages", note: "You know Common and Draconic. {{Passive}}" },
      ],
      legacy: [
        { name: "Scale Shield", note: "Cast Shield at will, without a spell slot, as your scales rapidly harden to block the attack. {{Passive}}" },
        { name: "Tail Strike", note: "Your unarmed tail attack deals 1d6 + STR bludgeoning; the target makes a STR save or is knocked prone. {{Passive}}" },
        { name: "Ancient Blood", note: "You gain proficiency in Intimidation and History. {{Passive}}" },
        { name: "Elemental Affinity", note: "When you deal damage matching your ancestry's type, add your prof bonus to the damage roll. {{Passive}}" },
        { name: "Wings", note: "Your fly speed equals your walking speed. {{Passive}}" },
      ],
      subracesLabel: "Subrace (by ancestry)",
      subraces: [
        { name: "Fire / Red", desc: "Breath damage type: fire", traits: [
          { name: "Emberlight", note: "Raise a warm, dim light from your scales out to 10 ft. at will, and see normally through your own flame and smoke. {{Passive}}" },
          { name: "Blazing Retort", note: "Cast Hellish Rebuke without a spell slot (CHA), flavored as a lash of flame from your scales. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Ice / White", desc: "Breath damage type: cold", traits: [
          { name: "Rimeguard", note: "As a reaction to being hit in melee, encase yourself in ice; reduce the damage by 1d10+prof. If you reduce it to 0, the attacker takes 1d4 cold. {{Uses Per Long Rest: = Prof Bonus}}" },
          { name: "Glass Calm", note: "You have advantage on saves against being frightened, and gain proficiency in Insight. {{Passive}}" },
        ] },
        { name: "Lightning / Blue", desc: "Breath damage type: lightning", traits: [
          { name: "Storm's Grace", note: "Your speed increases by 10 ft. while you aren't wearing heavy armor. {{Passive}}" },
          { name: "Storm's Reflexes", note: "You have advantage on Initiative rolls. {{Passive}}" },
        ] },
        { name: "Luck / Light / Golden", desc: "Breath damage type: radiant", traits: [
          { name: "Golden Fortune", note: "Reroll a failed attack roll, ability check, or save and use the new result. {{Uses Per Long Rest: 1}}" },
          { name: "Second Wind's Favor", note: "When you are reduced to 0 HP, drop to 1 HP instead. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Dark / Acid / Black", desc: "Breath damage type: acid", traits: [
          { name: "Nightsight", note: "Your darkvision extends to 120 ft., and you can see normally in magical darkness out to 30 ft. {{Passive}}" },
          { name: "Creeping Dread", note: "As a bonus action, force a creature within 30 ft. to make a WIS save or be frightened of you until the end of its next turn. {{Uses Per Long Rest: 1}}" },
        ] },
      ] },

    { id: "dwarf", name: "Dwarf", category: "Not Finished", eyebrow: "Not Finished · Craftsmen",
      keywords: "Sturdy · Crafty · Enduring",
      tagline: "Craft, stone, and a long memory.",
      lore: "Dwarves are the miners of the deep world, short and broad and built like the stone they work, and the great majority of them will live and die without once seeing the sky. They keep to Bal Morvan and the tunnels that feed it, and what the surface knows of them arrives as goods rather than as neighbors: ore, worked metal, cut stone, and the finer things their smiths make, all of it moving up the roads without a dwarf attached.",
      loreSections: [
        { h: "The City and the Seam", p: ["There is one dwarf city that matters. Bal Morvan is the seam-mother, and every dwarf holding of any size is finally an extension of it. The work is mining, and the mining is not a trade among many but the organizing fact of the whole society: the seams dictate where a family lives, what it is owed, whom it marries, and how long it stays. A rich seam builds a district. An exhausted one empties it within a generation, and the families move deeper without much ceremony, because ceremony is for things that do not happen constantly.", "Their goods leave the city on kobold backs. A dwarf will haggle for an hour over the price of a shipment and then hand the whole of it to a courier half his size without a receipt, and this arrangement has held so long that neither people remembers proposing it. From the kobold roads the goods pass to Kar-Mundir, and from Kar-Mundir to everywhere, which is why a merchant in a surface market may sell dwarven steel his entire life and never meet the smith."] },
        { h: "Crystori", p: ["The dwarves count the Crystori their brothers of the deep, and mean it more sincerely than most peoples mean such things.", "They share the dark, the pressure, and the particular understanding of what stone does over time, and where the surface finds the Crystori unnerving, the dwarves find them simply well-suited. Crystori are welcome in Bal Morvan without invitation, a courtesy extended to no one else, and the two peoples trade in things neither will discuss with outsiders. Ask a dwarf what a Crystori is for and he will tell you they are for the deep, and consider the question answered."] },
        { h: "Above and Below", p: ["A dwarf above ground is not alarming. It is merely uncommon, and draws the second glance a person gives to weather out of season. They come up for particular reasons, a commission, a debt, a thing that must be seen with the eyes, and they go back down when it is finished. Very few settle. The sky is not frightening to a dwarf. It is only enormous, and unnecessary, and there is nothing in it to cut."] },
        { h: "Playing a Dwarf", p: ["A dwarf character is deep-born and stone-certain: a craftsman's judgment, a miner's patience, and a bone-level preference for a ceiling. You came up for a reason, and the reason will eventually be finished. Until then you keep your word, keep your work, and quietly measure every wall you pass."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Darkvision", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Dwarven Resilience", note: "You have advantage on saves against poison, and resistance to poison damage. {{Passive}}" },
        { name: "Dwarven Combat Training", note: "You gain proficiency with battleaxes, handaxes, light hammers, and warhammers. {{Passive}}" },
        { name: "Tool Proficiency", note: "You gain proficiency with one artisan's tool. {{Passive}}" },
        { name: "Stonecunning", note: "You double your proficiency bonus on History checks about stonework. {{Passive}}" },
      ],
      legacy: [
        { name: "Forge Fighter", note: "You gain the Tavern Brawler feat: improvised weapon proficiency, unarmed strikes deal 1d4+STR, and you can grapple as a bonus action after hitting unarmed. {{Passive}}" },
        { name: "Iron Gut", note: "You have advantage on CON saves and resistance to poison. {{Passive}}" },
        { name: "Deep Memory", note: "You have advantage recalling history, and proficiency in History. {{Passive}}" },
        { name: "Master Craftsman", note: "You gain proficiency with 2 artisan's tools, and crafted items cost half the usual materials. {{Passive}}" },
        { name: "Arcane Attunement", note: "You gain proficiency with arcane focuses and tools, with advantage identifying magic items. {{Passive}}" },
      ] },

    { id: "goblin", name: "Goblin", category: "Standard", eyebrow: "Standard · Innovators",
      keywords: "Sneaky · Scrappy · Quick",
      tagline: "Small, quick, and harder to corner than they look.",
      lore: "Goblins are small, quick, and green as a wet leaf, and they keep the commercial underside of every human city on the mainland: the shopfronts on the narrow streets, the pawnbrokers, the repair yards, the gambling houses that never quite close. The world calls them scavengers. Goblins have looked the word over, found it accurate, and gone on ringing up the sale. Nothing is thrown away where goblins live, and very little is given away either.",
      loreSections: [
        { h: "The Shop and the Salvage", p: ["The Orcs build. The goblins keep it standing, and sell you the parts.", "A goblin quarter runs on what the city above discarded, mended and marked up: the cracked gutter re-leaded, the hinge re-pinned, the pump coaxed through one more winter. They can tell the age of a wall by its dust and know which of your pipes will fail before you do. Between the two peoples there is an old and easy trade, Orc work and goblin upkeep, and an Orc master will send a client down to a goblin shop without a moment's hesitation, which is more than most humans manage."] },
        { h: "The Wheel", p: ["Goblins gamble the way other peoples pray, which is to say constantly, seriously, and with an eye on the ceiling.", "They keep Lana, who holds the golden luck, and they keep her at the dice table rather than the altar. A goblin house of business is nearly always a goblin house of chance as well, the back room warm and loud and open past any reasonable hour, and the stakes are rarely large because that is not the point. The point is to be seen playing. A people who own nothing outright and everything on the turn regard fortune as the only patron who ever gave them anything, and they court her the way you court any patron: publicly, cheerfully, and with a cut set aside."] },
        { h: "The Favor", p: ["Goblins keep no ledgers, and do not need to.", "A goblin remembers every kindness with an exactness that unnerves the people who did it, and repays it at a moment of their own choosing, in a currency of their own choosing, frequently years later and frequently strange. A carter who sheltered a soaked goblin family for one night finds his axles sound for the rest of his working life. They do not announce it. Announcing it is vulgar.", "The reverse holds. Goblins do not take revenge, which is loud and costly and gets small people killed. They subtract themselves. The repairs stop. The warnings stop. The city goes on exactly as it did, and begins, very slowly, to fall apart."] },
        { h: "Playing a Goblin", p: ["A goblin character is resourceful in the literal sense: you have a use for what everyone else discarded, including information, opportunities, and people. You are underestimated constantly and have decided this is an advantage. You forget no kindness, repay everything eventually, and have never once walked past a thing that could still be made to work, or sold."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Darkvision", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Fury of the Small", note: "Deal extra damage equal to your level against a creature larger than you. {{Uses Per Short or Long Rest: 1}}" },
        { name: "Nimble Escape", note: "You can Disengage or Hide as a bonus action. {{Passive}}" },
        { name: "Languages", note: "You know Common and Orcish. {{Passive}}" },
      ],
      legacy: [
        { name: "Nervous Watch", note: "You can't be surprised, and have advantage on Initiative. {{Passive}}" },
        { name: "Survivor of the Wastes", note: "You gain proficiency in Survival and Nature, with advantage on foraging and tracking checks. {{Passive}}" },
        { name: "Dirty Fighter", note: "Hitting a prone, grappled, or restrained creature deals extra damage equal to your prof bonus. {{Passive}}" },
        { name: "Scavenger's Eye", note: "You gain proficiency in Sleight of Hand and Investigation, and can identify a creature's most valuable item. {{Uses Per Short Rest: 1}}" },
        { name: "Scurry", note: "When you Disengage, gain +10 ft. of movement and advantage on Stealth until your next turn. {{Passive}}" },
      ] },

    { id: "halfling", name: "Halfling", category: "Not Finished", eyebrow: "Not Finished · Advocates",
      keywords: "Lucky · Nimble · Brave",
      tagline: "Lucky, brave, and underestimated.",
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Lucky", note: "When you roll a 1 on an attack roll, check, or save, you can reroll it. {{Passive}}" },
        { name: "Brave", note: "You have advantage on saves against being frightened. {{Passive}}" },
        { name: "Halfling Nimbleness", note: "You can move through the space of a larger creature. {{Passive}}" },
      ],
      legacy: [
        { name: "Stubborn", note: "You have advantage on saves against forced movement, being knocked prone, or being grappled. {{Passive}}" },
        { name: "Light on Your Feet", note: "You don't provoke opportunity attacks while moving through a creature's space. {{Passive}}" },
        { name: "Halfling's Knack", note: "You gain the Skill Expert feat: proficiency in one skill, and expertise in a skill you're already proficient in. {{Passive}}" },
        { name: "Slip Away", note: "As a reaction when an attack misses you, Disengage. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Inspired by Others", note: "When an ally scores a crit, gain temp HP equal to 1d8+prof until the end of combat. {{Passive}}" },
      ] },

    { id: "human", name: "Human", category: "Standard", eyebrow: "Standard · Adaptive",
      keywords: "Adaptable · Skilled · Lucky",
      tagline: "Everywhere, and good at being anything.",
      lore: "Humans are the most numerous people in Loglandia and perhaps the shortest-lived, and there is remarkably little else to say about them as a whole, which is itself the point. They hold the mainland kingdoms and the trade coasts and the river valleys, they turn up at the edge of every other people's country, and they have no single craft, no defining art, no one thing the world calls theirs.",
      loreSections: [
        { h: "The Common Thread", p: ["Adaptability is the whole of it. A human raised among Kua Hono keeps the Great Feast and loves the ocean. A human raised in the Kur-Mundir knows how to haggle. They take on the character of the ground they stand on.", "A human who means to leave anything behind must leave it soon as they don't live as long as a Godmarked or an Elf, and so they finish what they start, teach what they know quickly, and conclude their ambitions inside a lifetime."] },
        { h: "Mixed Blood", p: ["More than any other people, humans marry out.", "The great majority of mixed-heritage folk in Loglandia have human blood.", { aside: "I know human faces best. There are simply more of them, and they come to me soonest." }] },
        { h: "Playing a Human", p: ["A human character is defined by circumstance rather than by blood: quick to learn, quick to commit, at home among peoples older and stranger than yourself, and shaped far more by where you were raised than by what you are. You will not live to see the whole of what you begin. Begin it anyway."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Skill Versatility", note: "You gain proficiency in 2 skills of your choice. {{Passive}}" },
        { name: "Additional Feat", note: "You gain one feat at character creation. {{Passive}}" },
        { name: "Languages", note: "You know Common. {{Passive}}" },
      ],
      legacy: [
        { name: "Quick Study", note: "You gain the Skill Expert feat: proficiency in one skill, and expertise in a skill you're already proficient in. {{Passive}}" },
        { name: "Combat Initiate", note: "You gain the Fighting Initiate feat and one Fighting Style. {{Passive}}" },
        { name: "Bound Luck", note: "Bank each natural 1 you roll as a Luck point, up to your prof bonus, and spend one to reroll any die. {{Passive}}" },
        { name: "Cultural Sponge", note: "You learn 2 languages and gain proficiency with one tool. {{Passive}}" },
        { name: "Versatile Blood", note: "Gain one legacy trait from any race's list, with GM approval. {{Passive}}" },
      ] },

    { id: "kobold", name: "Kobold", category: "Standard", eyebrow: "Standard · Pseudo-draconian",
      keywords: "Fast · Pack-minded · Draconic",
      tagline: "Stronger in numbers, smarter than they let on.",
      lore: "Kobolds are small, quick, sharp-eyed, and everywhere in the deep world, and no one who lives underground can go a week without depending on one. They are the couriers of the tunnels. Letters, ore, medicine, warnings, contraband, and the whole trade of Bal Morvan travel on kobold backs at kobold speed, and the roads below Loglandia would be a map of disconnected holes without them.",
      loreSections: [
        { h: "The Running", p: ["A kobold runner knows the deep the way a river knows its bed.", "They carry what will not wait, moving through the tunnels in relays and small chattering packs, and they carry it faster than any people has managed to match: the routes are memorized rather than written, handed down from older runners to younger, and a route in a kobold's head is worth more than the cargo on their back. The Dark Elves own the roads and toll them. The kobolds are what actually moves along them, and the two arrangements have coexisted for so long that neither side thinks of it as a bargain anymore.", "A runner comes of age when the family grants them a route of their own, and the granting is done once. The eldest runner in the house speaks the road aloud from end to end, every turning, every bad ceiling, every stretch where the water rises in spring, and speaks it a single time, at night, to one listener. It is never repeated and never set down. A kobold who cannot hold it was not ready for it, and will be offered a shorter road the following year without anyone making a remark.", "They are trusted, and the trust is the whole business. A courier who loses one parcel loses the family's routes, and a family without routes is nothing, so the parcel arrives. It arrives through flood, collapse, and unpleasant company. It arrives late and apologetic rather than not at all."] },
        { h: "Playing a Kobold", p: ["A kobold character is fast, observant, and professionally reliable in a world that expects neither: you know roads nobody has drawn, you keep the parcel intact, and you have delivered to people you would rather not have met. Underestimate is your ordinary working condition. It has never once slowed you down."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Darkvision", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Grovel, Cower, and Beg", note: "As an action, give your allies advantage against enemies within 10 ft. of you until your next turn. {{Uses Per Short or Long Rest: 1}}" },
        { name: "Pack Tactics", note: "You have advantage on attacks when an ally is within 5 ft. of your target. {{Passive}}" },
        { name: "Languages", note: "You know Common and Draconic. {{Passive}}" },
      ],
      legacy: [
        { name: "Dasher", note: "You can Dash as a bonus action. {{Passive}}" },
        { name: "Winged", note: "Your fly speed equals your walking speed. {{Passive}}" },
        { name: "Draconic Breath", note: "You gain a breath weapon identical to Dragonkin's; choose its damage type at character creation. {{Passive}}" },
        { name: "Quick Study", note: "You gain the Skill Expert feat: proficiency in one skill, and expertise in a skill you're already proficient in. {{Passive}}" },
        { name: "Strength in Numbers", note: "While 3 or more allies are within 30 ft., you gain +1 AC and +1 to attack rolls. {{Passive}}" },
      ] },

    { id: "orc", name: "Orc", category: "Standard", eyebrow: "Standard · Warriors",
      keywords: "Strong · Relentless · Unstoppable",
      tagline: "Warriors, and cannier politically than the stories admit.",
      lore: "The Orcs are big, green-gray, and built like something you would give the whole road to, and that first impression has been wrong since before anyone now living was born. Look past the tusks and the stature and you find hands that know a dozen ways to cut stone, all of them good and none of them slow. They are the builders of the settled world. Most walls a person sleeps behind, an Orc laid.",
      loreSections: [
        { h: "Where They Live", p: ["Orcs live scattered through the cities of every settled people, worked so deeply into them that a town without an Orc quarter strikes an Orc as a town not yet finished. They hold no country of their own here and never have. Home is somewhere past the horizon and long behind them, and the walls they stand behind now are the ones their own hands raised."] },
        { h: "How They Came", p: ["The Orcs are not from here. Their homeland lies far off, past the edge of any map this world will unroll, and they departed it so long ago that no one tells the leaving as history any longer, only as the beginning of things. They came in the First Age in small clans, a few families at a time, and did what they have always done best: they found work. Wherever people were raising towns, Orcs raised them better, and across the slow centuries the clans ceased to be guests in those cities and became load-bearing parts of them. An Orc quarter is as fixed a feature of an old city now as its market or its gates, and has stood there longer than that city's rulers can trace their own blood."] },
        { h: "Why They Build", p: ["It takes two things to make a people the world's builders, and the Orcs alone possess both. There is the body: the strength and plain endurance to cut and haul and raise stone from dawn to dark, season upon season, as few others could survive doing. And there is the secret. The techniques that let Orc work outlast all others, joins that want no mortar, foundations that never wander, pass only from parent to child and have never once been written down, hoarded deliberately so that no rival people might buy or steal them. The muscle would make them fine labor on its own. The hidden craft is what makes them impossible to replace."] },
        { h: "The Guild and the Name", p: ["Every Orc master cuts a private mark into the stone they finish, a sign handed down the family with the trade itself, so that the world stands signed from one corner to the other by Orcs who never asked for the credit. Most people simply never learned to read the walls around them.", "They keep one law above all the rest: the work comes before the patron. A guild that takes a commission finishes it, though the coin run dry or the client die halfway, for a builder who walks off one job is a builder no one trusts with a foundation again, and that trust is the only thing an Orc guild truly sells. The rule has bound them to some grim commissions and made their word the surest in any trade, and they account that a fair exchange. They seldom raise another people's wonders outright, but their hands and their counsel sit in more of them than anyone credits: a foundation surveyed, a doomed span argued out of its design, a master quietly consulted before the first proud stone goes down.", "There is one wall they never boast of. The Orcs built Sorrowhold too, long ago and under contract, and what it became after is not a thing they care to be reminded they had a hand in. I have met some few who ended in Sorrowhold. None of them blamed the walls."] },
        { h: "The High Guild", p: ["A people spread across a hundred cities still requires one law between its parts, and that law is the High Guild. Its hall sits in Kingsmont, on ground the Orcs were given rather than bought. When their guilds raised the great wall that rings the city, the king granted them a permanent hall within it, partly for a defense finer than any he had ever stood behind, and partly because a shrewd ruler keeps the people who build his walls close and content. So the highest seat in Orc society sits within another people's capital, paid out in stone. There they keep the Founder's Chisel, the first tool an Orc mason carried ashore in the First Age and the blade that cut the first Orc stone in this land. It shapes nothing anymore. To hold it is to speak for every guild there is."] },
        { h: "Playing an Orc", p: ["An Orc character is the settled world's quiet cornerstone: a craftsman's pride without a braggart's tongue, a word worth more than most contracts, and a family mark waiting to be earned or already carried. You belong to every city and own none of them. Whatever your trade, you finish what you take up, for that is the whole of the law you were raised under, and the only inheritance that matters came ashore in the First Age with a chisel."] }
      ],
      facts: [{ label: "Stats", text: "+2 chosen / +1 chosen" }, { label: "Speed", text: "30 ft." }],
      builtins: [
        { name: "Darkvision", note: "You have darkvision out to 60 ft. {{Passive}}" },
        { name: "Adrenaline Rush", note: "Dash as a bonus action and gain temp HP equal to your prof bonus. {{Uses Per Long Rest: = Prof Bonus}}" },
        { name: "Powerful Build", note: "You count as one size larger when determining your carrying capacity. {{Passive}}" },
        { name: "Relentless Endurance", note: "Drop to 1 HP instead of 0. {{Uses Per Long Rest: 1}}" },
        { name: "Languages", note: "You know Common and Orcish. {{Passive}}" },
      ],
      legacy: [
        { name: "Brawler's Grit", note: "You gain the Tavern Brawler feat: improvised weapon proficiency, unarmed strikes deal 1d4+STR, and you can grapple as a bonus action after hitting unarmed. {{Passive}}" },
        { name: "Savage Attacks", note: "Roll one extra weapon damage die on a crit. {{Passive}}" },
        { name: "Last Stand", note: "Drop to 1 HP instead of 0. {{Uses Per Long Rest: 1}}" },
        { name: "Blood Rage", note: "Once reduced to half HP, gain advantage on melee attacks until the end of combat. {{Uses Per Long Rest: 1}}" },
        { name: "War Cry", note: "As a bonus action, give an ally within 30 ft. advantage on their next attack. {{Uses Per Long Rest: = Prof Bonus}}" },
      ] },

    /* ---- KUA HONO (1 race, 4 subraces) ---- */
    { id: "kuahono", name: "Kua Hono", category: "Standard", eyebrow: "Standard · Reptile-kind",
      keywords: "Regenerating · Armored · Adaptable",
      tagline: "Wildly varied reptile-kind, defined by adaptation more than identity.",
      lore: "The Kua Hono are four peoples who became one. Turtle, Shark, Chameleon, and Salamander, four kinds of creature that shared the same warm coasts until the shared coast came to matter more than the different blood. They keep one faith, one calendar, and one another. A turtle and a shark are no kin, and will say so plainly, and will still call each other Kua Hono without a flicker of doubt.",
      loreSections: [
        { h: "The Record and the Skin", p: ["The Kua Hono know exactly who they are, because the Turtles keep count. Somewhere along the coast, in a place its guardians will not name to outsiders, the Turtle bloodline keeps the record: every birth, union, and death across all four bloodlines, written down and guarded and added to for as long as a name can be proven. It is the nearest thing the people have to a holy place. Only Turtles tend it, and where it stands is not a thing they will tell you.", "What a Kua Hono carries day to day is the short version, inked into the skin. The marks record lineage and deed at once, where a person comes from and what they have done, so that among their own a Kua Hono can be read at a glance and no words spent. The whole truth sits in the Turtle archive. The tattoos are how you wear it out in the world.", "They are loud, warm, and openly glad of the sea, which leads strangers to sell them short. But the Kua Hono live at the edge of the deep, nearer than anyone to the things that hunt there, and their good cheer is not the ease of people who have seen nothing. It is a choice made new each morning: to enjoy a short life on a dangerous coast rather than flinch through it.", { aside: "I approve, for whatever my approval is worth. I have met no people less surprised to see me." }] },
        { h: "The Four Bloodlines", p: ["The Turtle are the long-lived core of the people, keepers of the record and the ones who settle quarrels. Age has taught them patience, and patience tends to win the last word. Slow to hurry and slower to anger, they are what most of the world pictures at the name Kua Hono.", "The Shark are strong and quick to anger, and outsiders seldom see past the anger. They live by hard custom, the hardest being guest-law: a shark who has eaten at your fire will not raise a hand against you until you have parted ways, whatever lies between you afterward. Share a meal with one and you are safe with them, and a shark who counts you theirs to guard is the surest wall on any coast. Cross one, though, and the debt outlasts your memory of making it.", "The Chameleon are quiet and sharp, and the quiet is on purpose. One will read a room, count its knives, and price your cargo before the greeting is finished. They scout, they trade, they walk ahead of the rest, and a crew that carries one meets fewer surprises.", "The Salamander go where their kin cannot. Amphibious past the others and easy on land, they range up the hot coasts and inland along the rivers as healers and messengers both, bringing medicine to the sick and word between shore towns that would otherwise never hear from each other. A people strung along a hundred miles of coast stays one people because the salamanders keep walking the miles between."] },
        { h: "The Pantheon of the Sea", p: ["The Kua Hono keep the Pantheon of the Sea, and nearly all of them keep it. It is a faith of the water and the shore, its gods each holding some piece of the ocean, the tides, the storms, the fishing grounds, the reefs, the drowned. It asks little in the way of doctrine and much in the way of conduct: hold your feasts, mind your neighbors, and be kind to the stranger, because the coast is wide and the sea is long and you never know whose hand you will need next. Like most faiths in Loglandia, it does not claim to be the only true one. It simply asks that you keep its gods, not that you deny anyone else's.", "A fair number of Sea Elves keep it too, the ones who run closest with the Kua Hono especially, though the elves have older and stranger gods of their own to weigh it against, so among them it comes and goes."] },
        { h: "The Great Feast", p: ["Once a year, on the longest night, the Kua Hono light the whole coast against the dark. The Great Feast is the high holy day of the Pantheon of the Sea and the loudest the shore ever gets, and for all its reverence it is a night of pure celebration, a thing everyone throws themselves into whether devout or not. Fires run the length of the sand. The archive-Turtles read the year's new names into the record, the year's dead are marked and the year's children welcomed, and there is drink and song and story until the sky grays. The Sea Elves come for it, sailing in to keep the night beside their friends. On the darkest night the world offers, the whole coast answers with every fire it has."] },
        { h: "The Company They Keep", p: ["They hold the coasts and the warm eastern jungle where the rivers spill into the sea, and raise nothing inland, since nothing they want is there. Their closest friends on the water are the Sea Elves, bound to them by shared currents, shared dread of the deep, and often enough a shared god or two. A Kua Hono pod and a Sea Elf crew crossing paths tends to be a good night for both, and neither has ever needed much reason beyond that."] },
        { h: "Playing a Kua Hono", p: ["A Kua Hono character wears their history in ink and their heart on the sleeve: Turtle patience, Shark iron, Chameleon quiet, or Salamander miles, all under one faith and one calendar. You are loud, warm, and unfooled by the sea. Keep the feasts, mind the guest-law, and be kind to strangers. The coast is wide, and you never know whose hand you will need next."] }
      ],
      facts: [{ label: "Stats", text: "CON +2 universal / set +2 and -2 by subrace" }, { label: "Speed", text: "30 ft. walking, swim = walking" }, { label: "Size", text: "Small or Medium (your choice)" }],
      builtins: [
        { name: "Amphibious", note: "You can breathe air and water. {{Passive}}" },
        { name: "Reptilian Regeneration", note: "As a bonus action, spend up to half your hit dice (rounded up) as if taking a short rest, adding your CON mod to each. You can also spend dice unrolled for a Lesser Restoration effect instead. {{Uses Per Short Rest: 1}}" },
        { name: "Languages", note: "You know Common and Draconic. {{Passive}}" },
      ],
      legacy: [
        { name: "Accelerated Regeneration", note: "When healing with hit dice, add half your prof bonus (rounded down) to each die. {{Passive}}" },
        { name: "Natural Armor", note: "Your unarmored AC is 13 + DEX mod, and it counts as medium or heavy armor for feature requirements. {{Passive}}" },
        { name: "Nature's Intuition", note: "Gain proficiency in 2 skills from Animal Handling, Medicine, Nature, Perception, Stealth, and Survival. {{Passive}}" },
        { name: "Slippery", note: "You have advantage on checks to resist or escape a grapple or restraint. {{Passive}}" },
        { name: "Temperate Blood", note: "Choose fire or cold; gain resistance to it with no downside. {{Passive}}" },
      ],
      subracesLabel: "Subraces",
      subraces: [
        { name: "Turtle", desc: "STR+2/DEX-2 -- Heavy, ancient, patient", traits: [
          { name: "Ironback", note: "Reduce a crit against you to a normal hit. {{Uses Per Long Rest: 1}}" },
          { name: "Ancient Shell", note: "Your natural armor AC increases by 1. {{Passive}}" },
        ] },
        { name: "Shark", desc: "STR+2/INT-2 -- Apex predator, all instinct", traits: [
          { name: "Blood Frenzy", note: "You have advantage on melee attacks against creatures with 15 HP or fewer. {{Passive}}" },
          { name: "Feeding Frenzy", note: "When you reduce a creature to 0 HP, gain advantage on your next attack and a free 15 ft. move. {{Passive}}" },
        ] },
        { name: "Salamander", desc: "INT+2/CHA-2 -- Elemental scholar", traits: [
          { name: "Alchemical Blood", note: "You gain proficiency in Arcana and Nature, and can identify a potion or substance by taste or touch. {{Uses Per Long Rest: 1}}" },
          { name: "Regenerative Surge", note: "When you use Reptilian Regeneration, roll each hit die twice and take the higher result. {{Uses Per Long Rest: 1}}" },
        ] },
        { name: "Chameleon", desc: "DEX+2/WIS-2 -- Quick, reactive (renamed from Lizard)", traits: [
          { name: "Camouflage", note: "You have advantage on Stealth checks in natural terrain. {{Passive}}" },
          { name: "Wall Crawler", note: "Your climb speed equals your walking speed, even on inverted surfaces. {{Passive}}" },
        ] },
      ] },
  ],

  elfLines: [
    { id: "elfline-dark", name: "Dark Elves", eyebrow: "Dark Leyline · The Underground",
      subraceRef: ["Dark Elf Scholar", "Dark Elf Protector"],
      tagline: "Scholars and Protectors, one people over hard history.",
      lore: "Ash-skinned and silver-eyed, commonly arrayed in black lacquer and bone-white, they resonated with the Shadow Leyline beneath the world, once the elves moved to the great underground they have ruled the roads ever since. They wear their wealth where only lamplight finds it, gemstones set in dark metal, glinting violet and red at collar and cuff, and they carry themselves with the unhurried confidence. They are one people in two lines: the Scholars, fine-boned and ink-fingered, and the Protectors, built strong and sturdy like the stones they dwell upon.",
      loreSections: [
        { h: "Where They Live", p: ["Dark Elves hold the great underground from its shallow galleries to the border of the true deep, in lantern-strung cities threaded along the roads, with [[karmundir|Kar-Mundir]] at the center like a heart. Surface peoples meet them at the gate-towns, trade briskly, and go home unsettled without being able to say why."] },
        { h: "The Roads Below", p: ["The underground is not empty. It is a country, and the Dark Elves own its roads: every tunnel-route constructed beneath Loglandia runs through their gates, tolled, patrolled, lit, and ledgered. The roads are safe, and the safety is the product. They will sell you passage, provisions, secrets, silence, and nearly anything else the deep produces. But would never dare sell you a map. The full shape of the roads exists nowhere on paper; each family holds its stretch of stone in memory."] },
        { h: "The Chains of Paper", p: ["Not long ago, as elves count time, the Scholars owned the Protectors.", "The Scholar houses held the records, the contracts, and the friendship of devils, and they bound the Protector line this way and they bound it the way they bind everything, in paper: debts that compounded upon themselves, indentures that renewed themselves, clauses drafted with infernal counsel and enforced to the letter, until whole bloodlines were born owing, died owing, and left the balance to their children.", "The one who ended it has no name. They were a Protector, and rumored  Favored Soul of Kyrll. When they rose, the light rose with them, onto a domain that had never seen any. No one ever saw their face. The people of the deep learned the mask instead, featureless bone-white, now the most recognized sigil below the surface, and the legendary twinblade Deliverance that burned many contract-script to ash. The uprising the masked figure led ended not in slaughter but in a burning of terms: the bonds voided, the debts struck, and the chains broken. The Protectors now stand guard at every gate, every road, and act as a strong blades wherever needed. The Scholars keep their tomes and their alliance with the devils and remain attuned with the infernal evermore.", "The bone-white mask hangs in shrine-niches at every Protector gatehouse. The Scholars sneer at it in quiet. The two bloodlines still trade, still marry, still sit one council, and the courtesy between them is real but thin, the courtesy of a city where the formerly oppressed and the former oppressors haggle daily in the same streets, everyone remembers, and no one says so."] },
        { h: "The Neighbors Below", p: ["Deeper than the deep roads lie the infernal territories, and it is the Scholars who tend that border, wary, formal, and busy. They deal with devils constantly. Every arrangement is written, witnessed, and sealed, every clause enforced to the letter, because the pen is the only thing a devil truly respects. Surface folk hear that the Dark Elves  treat with devils and shudder. The other bloodline hear it and say nothing at all. They know better than anyone what Scholar paper with a devils signature can do."] },
        { h: "Playing a Dark Elf", p: ["A Dark Elf character is the stone given manners: lamplit courtesy over hard history, a merchant's eye, a clerk's memory, or a gatekeeper's patience, depending on your robe. Scholars carry the ink, the contracts, and the devils' grudging respect; Protectors carry the blades, the roads, and the mask's long shadow. Whichever line you come from, you come from the one city everything passes through."] }
      ] },
    { id: "elfline-moon", name: "Moon Elves", eyebrow: "No Leyline · The Peaks",
      subraceRef: "Moon Elf",
      tagline: "The elves who looked up, and read three moons that never soften an answer.",
      lore: "Moon Elves are the elves who looked up instead of attuning to what was below. Silver-haired and pale skinned, with a little of the night sky caught in their twinkling eyes, they carry the otherworldly air every elf is presumed to possess and few ever do. Every other elf gives themselves to a Leyline and is slowly shaped by the land they settle. The Moon Elf never did. They feel the Leylines as any elf does, they respect it, but they turned their faces the other way, up past the clouds to the three moons.",
      loreSections: [
        { h: "The Three Moons", p: ["Where another elf draws power up out of the ground, a Moon Elf draws it down from the far dark, off the slow turning of three cold bodies most people never think to watch. It is a distant kind of magic. There is a great deal of empty black between a Moon Elf and the cold lights they read, and something of that distance settles into them. It makes them strange to their own kind, and the only people in the world who can look up and see what's coming."] },
        { h: "The Sight", p: ["They are seers.", "A Moon Elf reads the night across all three moons at once. White Kelis shows the present, and the truth of the one who asks questions of it. Violet Ysoldra shows the road ahead and the hidden currents pulling at it. Red Maluth, far and slow and seldom risen, shows the things no one climbs a mountain hoping to hear: endings, and death, and the shape of ruin before it falls.", "To read far is to see the deaths before they come, your own people's and strangers' both, and to carry that knowing alone while everyone around you still lives in the mercy of not knowing yet is a great burden. The old seers go quiet in a particular way. They have spent a life watching the future arrive precisely as they saw it not being able to alter a single thing.", { aside: "I confess a fondness for the far-readers. Ours are adjacent trades." }] },
        { h: "The Clans and the Spire", p: ["Moon Elves live high in the mountains . Their clans hold the peaks all across Loglandia, a temple on this summit, a cluster of silver-haired seers on that one, each reading the same three moons from its own cold height.", "But the Triune Spire stands above them all. It is the highest place in all of Loglandia, a needle of stone nearer the three moons than anywhere else a person can stand, and the clan that keeps the temple at its peak is the foremost of them.", "People climb the whole long world to reach it. Farmers and kings, the lost and the desperate, anyone who needs to know which way to turn makes the cold walk up the stones to lay a question before a Moon Elf and hear what the moons say back. Some come down with a clear road. Some come down with an answer they wish they'd never asked for. The Moon Elf gives the reading either way. They learned long ago that softening it changes nothing."] },
        { h: "How Others See Them", p: ["Other elves find them faintly wrong, the branch of the family that turned its back on the Leylines every elf is meant to live by. The Moon Elves do not argue it. To most humans, though, a Moon Elf is simply wise, an elf like any other and a little more worth listening to."] },
        { h: "Playing a Moon Elf", p: ["A Moon Elf character reads what others cannot and carries what others need not: the seer's sight, and the seer's bill. Distant, exact, and gentler than they appear."] }
      ] },
    { id: "elfline-sea", name: "Sea Elves", eyebrow: "Water Leyline · The Coasts",
      subraceRef: "Sea Elf",
      tagline: "Warmth with a keel, and the only people who fear the deep properly.",
      lore: "Where their cousins gave themselves to forest or mountain or desert, the Sea Elves gave themselves to the Water Leyline, and it remade them for the deep. They breathe water as easily as air, without thinking. They swim faster than they walk. Salt runs in the blood, and while a Sea Elf can manage inland for a stretch, they greatly prefer some water in their daily lives: a coast, a harbor, a wide river, something with the smell of it on the wind.",
      loreSections: [
        { p: ["They are charming and bold and quick to like you, and unlike a great many charming people, they mean it. A Sea Elf who calls you a friend has decided something, and they do not undecide it lightly. They keep confidences the way they keep cargo, carefully, and all the way to the destination. Tell a Sea Elf a secret and it is safer than it was with you. That loyalty is the steel beneath the easy manner, and it is why a good Sea Elf is worth ten fair-weather allies: the warmth is real, the word is good, and once you are theirs they will haul you out of more trouble than you had any right to survive."] },
        { h: "The Gold City", p: ["Where the light goes blue and then goes out, the Sea Elves built the most beautiful city in the world.", "Thalassa is gold and coral and white stone, its columned halls lit from within by Leyline-glow, older than any account of its making. It is the soul of the Sea Elves and the seat of their pride, and most of them would not live there if you paid them.", "The city does not miss them. It keeps a fine population without their help, and a good share of that population was born dry, surface gentry who buy water-breathing draughts by the crate and a villa under the waves to drink them in, a season at a time. So the greatest city the Sea Elves ever raised fills, slowly, with people who are not Sea Elves, while its builders ride the surface they could leave at any time. They are proud of Thalassa the way one is proud of a childhood home, which is to say from a distance, and fondly, and from the deck of a ship pointed somewhere else."] },
        { h: "A Life on the Water", p: ["What a Sea Elf wants is a deck underfoot and a different harbor by morning. They are merchants and wanderers, moving silk and salt and the things that do not go on the manifest from one coast to the next, as easy haggling on a crowded dock as slipping something past a harbor watch in the dark. The boat is home, and the boat goes where the money and the wind are. A house, fixed to one stretch of ground for a lifetime, strikes most of them as a strange thing to do to oneself.", "The tide has its own magic and they carry a little of it, old water-craft handed down with the rest of what makes them what they are. But a Sea Elf's first answer to a problem is usually a blade. Contested water teaches the sword early, and contraband teaches it earlier.", "They keep Athenia's old tree-law too, bent to the water's manners: feed the stranger on your deck and ask no questions, for the sea is deep and you never know who you have been swimming with.", "They share the sea with the Kua Hono, and the two have always run easy together, sailing and swimming the same currents and fearing the same black water."] },
        { h: "Playing a Sea Elf", p: ["A Sea Elf character is warmth with a keel: charming, loyal past reason, happiest with a deck underfoot and a different harbor by morning. You breathe water, keep secrets like cargo, and answer most problems with a blade or a grin. You also know what shares the water with you. Knock wood."] }
      ] },
    { id: "elfline-snow", name: "Snow Elves", eyebrow: "Ice Leyline · The Far North",
      subraceRef: "Snow Elf",
      tagline: "Peace as a daily practice, over a fury they now keep caged.",
      lore: "Snow Elves are tall and usually blue-haired and slow to speak, an elf people the cold cut down to what matters most. They gave themselves to the Ice Leyline long ago, and where fire made the Sun Elves burn, the ice made these ones still. The world calls them peaceful and wise, and both are true, but neither came free. The peace of the Snow Elves is a practice, kept daily.",
      loreSections: [
        { h: "Where They Live", p: ["The Snow Elves hold the far north of Loglandia, the high valleys and the ice-country beyond, in stone holds built low and warm against the weather. The Moon Elf clans keep their summits here as everywhere, and the two share the cold without friction: the seers hold the peaks, the Snow Elves the white country below. They come south seldom but  are welcome when they do, traded with gladly, trusted as arbiters, and never rushed through speaking. Other elves find them the easiest of the family to respect and the hardest to truly understand. It is likely the Snow Elves would agree with both statements, unhurriedly, in a few words, and then let the silence say the rest."] },
        { h: "The Honest Season", p: ["Every people in the north survives winter. The Snow Elves study under it. They call it the honest season, the one time of year that tells no lies of comfort: the harvest was enough or it was not, the roof holds or it does not, there is no arguing with the cold. Their children are taught to sit in it, short watches in the open air, breath slow, mind quiet as the snowfield, and then at the edge of adulthood comes the Long Dark, a ritual; one midwinter night alone in the open with no fire, no food. Some come back adults. Some come back early in the night and humbled. Both are counted a success, because both come back knowing exactly what they are and what the honest season is, and a person who has already made peace with the worst in life is very hard to frighten with anything less than such."] },
        { h: "The Old Fury", p: ["They were not always a peaceful folk. The old tomes remember Snow Elf war-bands that came down off the ice like a blizzard, these same tomes are theirs, kept and recited, never softened. They end on one line: the winter the war-bands came home to empty holds. The fighters had carried the fury south season after season, and while they were away pillaging and raiding, the cold took the old and the young they had left undefended. No enemy ever beat them. The unmanned hearth did. The stillness they practice began that season, as the cage they built for what was in their blood, and every Snow Elf learns the discipline young, because every Snow Elf carries the thing it cages deep down. They do not meditate to become wise. They meditate the fury down each morning as needed."] },
        { h: "The Winter King", p: ["The Snow Elves keep a king and always have. The royal line is of the old war line, the blood that led the ice-fury south in the old days, and the throne was the penance it accepted when the cage was built. Each Winter King sits the Long Dark alone every year, not once in a lifetime like their people but every midwinter, and holds the peace of the whole north above all. A Winter King who cannot master their own blood has no business governing anyone else's so they say. A few kings have failed the sit in memory and passed. None shamed for it."] },
        { h: "The Hearth Law", p: ["In the high north, a closed door kills. So Athenia's old tree-law, carried north. hardened into one of the deepest laws the Snow Elves have: the traveler at your door in winter eats at your fire, whoever they are, whatever they have done, and the question of what they have done waits politely until the thaw. Breaking the hearth law is the one crime the peaceful north still answers the old way, with rage and spilled blood.", "Their courtesy runs quiet. Among Snow Elves, saying little is good manners, words being like firewood, worth gathering and worth rationing."] },
        { h: "The Warm and the White", p: ["Every hold is built around its hot springs, and the springs are where the Snow Elves actually talk, trade, argue, court, and laugh, the whole warm remainder of life conducted in the steam with the reserve left folded on the rocks with the clothes. A bargain struck in the springs is binding. Everyone heard it, and nobody was wearing anything to hide behind.", "Between the holds run the cairn-roads, lines of stacked stone raised traveler by traveler across generations, marking the safe ways through the white. Every Snow Elf who passes a cairn adds a stone. It keeps the road above the snowline, and it is the closest thing they have to a common prayer: \"I passed, I lived, walk easy behind me.\""] },
        { h: "Playing a Snow Elf", p: ["A Snow Elf character is peace as a practice: the fury in the blood, the discipline that cages it, the winter that taught both. You speak little and mean all of it, keep the hearth-law like scripture, and save your warmth for the springs. What is coming will come. You have already sat with the worst of it, one long dark night at a time."] }
      ] },
    { id: "elfline-storm", name: "Storm Elves", eyebrow: "Air Leyline · The Storm Isles",
      subraceRef: "Storm Elf",
      tagline: "They built where the sky makes landfall, and sing while it comes down.",
      lore: "Far far west, where the world runs out of land, the Storm Isles take the first blow of every ocean tempest, and the Storm Elves hold them on purpose. They resonated with the Air Leyline on the isles, light blue-skinned and white-haired, marked in branching scars some of them went looking for. Other peoples build against the weather. The Storm Elves built where the sky makes landfall.",
      loreSections: [
        { h: "Where They Live", p: ["The Storm Elves hold the Storm Isles and little else, and want little else; the western sea is their moat, their god's road, and their proving ground. Ships that shelter in their harbors are taken in under the old tree-law every elf line carries, bent here to the harbor, and charged fairly for the repairs. The crews leave with the same story: the finest hosts in the roughest water in the world, singing while the sky came down."] },
        { h: "The Power in the Sky", p: ["The Air Leyline runs wild over the Isles, and the Storm Elves take from it the thing the storm truly is: not wind, not weather, power. Their magic is the bolt, not the breeze, and their whole culture bends toward strength, the strength to stand in the gale, to hold a roof-rope in the black of it, to take what the sky hurls and be found upright after. A Storm Elf proves themselves as their homeland does, by being struck and remaining. The soft arts get little respect on the Isles. The strong ones get songs and praise."] },
        { h: "The Feathered Storm", p: ["Most Storm Elves keep Ivsil as their one god, and they keep it the way you keep a god you have actually seen or talked to. The Feathered Storm is no metaphor on the Isles; the great storms that cross them are read as the god's own passage, and the Storm Elves worship the only way Ivsil permits: by never presuming to tame what it sends and embracing the destructive power of the wind. No warding of the weather. No softening of the storm. When the sky goes black, the Isles do not fight it, they endure it, doors lashed and songs going, and they count the endurance itself as the rite.", "They are not the Temple of Blistering Wind, and they will thank you not to confuse the two. The Temple wants the storm let loose upon the world. The Storm Elves live where it already is."] },
        { h: "The Struck", p: ["Lightning finds people on the Isles, and the ones it leaves alive come back marked, branching scars up the arm or the neck like a river seen from above. The struck are considered Ivsil-touched. It is not a blessing exactly, nothing about Ivsil blesses, but it is attention, and on the Isles attention from the sky is rank. The struck are expected to lead, in the watches, the councils, the songs, and a struck elf who declines the weight is looked at as armies look at a soldier who will not take the field. Most take it up. The scars ache when weather is coming, and a leader who feels the storm before the horizon shows it proves they are worth following."] },
        { h: "The Thunder Choir", p: ["The Isles keep their legends sung to honor them, and these hymns are sung only in harsh weather. The great storm-songs are built to be performed inside the storm itself, amphitheater villages carved to catch the wind and make it the low note beneath the singing peoples, whole choirs timing their verses to the thunder, and a song's true telling exists only in those hours. Fair-weather renditions are practice, and everyone knows it."] },
        { h: "Playing a Storm Elf", p: ["A Storm Elf character takes the sky's measure and holds it: lightning in the magic, endurance in the creed, Ivsil's shadow overhead and never named lightly. You were raised to stand upright in what levels other peoples, and to sing while doing it. If the scars found you, lead. If they have not, hold the rope and wait your weather."] }
      ] },
    { id: "elfline-sun", name: "Sun Elves", eyebrow: "Fire Leyline · The Desert",
      subraceRef: "Sun Elf",
      tagline: "Commanders and clans, bound by a code and a murdered king.",
      lore: "Sun Elves are bronzed and bright and built for war. They wear their red hair long and usually bound up off the neck, they move like people accustomed to being watched, and they are charming in the manner of those who have never once doubted they belong at the front of the room. The desert did not break them as it breaks most things. It honed them, into a people enamored of the heat, the fight, and the crowd that gathers to see one.",
      loreSections: [
        { h: "Where They Live", p: ["Most Sun Elves still hold the deep desert. Many have drifted east across the long years, to the green edge where the sand gives over to savanna. There stands the second Sun elf capital of sorts there; The colosseum city of Pyrra, where the Sun Elf love of the fight is dressed up as spectacle and the crowds pour in for the games. A people this enamored of war was always going to build a place to watch it for pleasure."] },
        { p: ["The Fire Leyline claimed them as surely as the desert did, and it runs hot in them. But the fire settles in the temper and goes no further. A Sun Elf is a soldier before anything else."] },
        { h: "The Soldier's People", p: ["Other elves keep to forests and peaks and the quiet arts. The Sun Elves built armies.", "Their genius is not the duel but the field. A Sun Elf swordsman is a fine thing to watch; a Sun Elf general is a even finer thing, and it is a general the rest of the world has learned to fear. They produced commanders the way the Moon Elves produces seers, steadily and across generations, until it became the one thing their whole people is known for.", "A Sun Elf general will tell you the battle is won before it is fought. Win first, then go to war: know the ground, know the enemy, know your own strength to the last sack of grain, and by the time the blades are drawn the die is already cast and hard part is over. The clans that forget that order rarely last long enough to learn it twice.", "For all the charm, they are not without a code, and the code is plain. The oath sworn is the oath kept. The guest at your fire is safe. The enemy who throws down his blade is spared. The soldier who breaks the line is punished, no longer counted a Sun Elf at all. The guest-law is Athenia's old tree-law worn into armor: even between clans that have bled each other for centuries, the parley flag and the shared fire are holy ground. They love the fight for its own sake, the thrill and the test of it, but a Sun Elf who wins without honor has not won anything his people will respect.", "Their signature weapon is the naginata, the long curved polearm. A Sun Elf goes into the ground with their weapons. The blade laid the length of the body and sharpened well before rest."] },
        { h: "The Clans", p: ["The desertis full of a quarrel of houses, proud martial lines that trace their blood through generations of commanders. Each takes the sun for its emblem and no two suns are alike, a black sun, a split sun, a sun going down, so that a field of warring Sun Elves is a sky full of suns at each other's throats. They feud the way stone weathers, slowly and without end, grudge and alliance and marriage and murder handed down with the land. A clan's honor is a living thing, tended for centuries. A slight to the grandfather is a debt owed by the grandson.", "It takes something vast to make these houses lay the feuds down and stand as one. It has happened once."] },
        { h: "The Unconquered Sun", p: ["A single Sun Elf once conquered every clan in the desert and bound them under one banner, and they named him Aurelio, the Unconquered Sun. He was the best of them, the commander all the rest are still measured against and found lacking. Under him, the Sun Elves did not lose.", "Where he choose bound them after endless campaigns was an oasis, the great water at the desert's heart, and there Aurelio raised Helixia, the first capital of a united Sun Elf people. A city around a spring, in a land that kills you for want of one. It was the proof of everything he had done, the warring clans made to share a single well. For a while, they did.", "That was the trouble. A man who never loses begins to wonder what he is.", "He stopped speaking of himself as a commander but as something more. He spoke of the gods first as equals and then as rivals, turning his face up to the heavens and standing in the silence afterward as though awaiting his turn to be counted among them. He did not merely ask his people to kneel. He called the gods his peers, aloud, and waited to be answered. And the captains who had bled at his side for forty years, who would have died on his word without question, watched their great general reach for a chair at the gods' table, and grew afraid of what he would do when no one pulled it out for him.", "So they broke the one law that made them what they were. They broke their oath, and they killed him in the dark.", "The Sun Elves tell it more simply. He flew too high.", { aside: "He was quieter at the last than the songs allow. Most are." }] },
        { h: "The War He Left", p: ["Aurelio has been dead a long age, and the desert has bled over him ever since. That is his true legacy, and it is a poisoned one, for the wound runs to the root.", "His descendants hold that the Seat the of Sun King is theirs by right of his blood. The new blood, heirs of the very captains who murdered him, hold that the desert belongs to whoever is strong enough to take it, precisely as Aurelio once took it. Both sides are the children of an oath broken, the would-be god on the one hand and his oathbreakers on the other, and neither can claim clean hands, which is why no peace has ever held. The oases pass back and forth between the clans, burned and retaken and burned again, and somewhere beneath all of it is a grave they are still fighting over."] },
        { h: "Playing a Sun Elf", p: ["A Sun Elf character is bred to the field and the crowd: a commander's eye, a duelist's charm, and a code that bends for neither. Your clan's sun rides your shoulder and its feuds travel in your luggage. Win first, then go to war, and whatever else you do, keep the oath. Your people killed their greatest king for less."] }
      ] },
    { id: "elfline-wild", name: "Wild Elves", eyebrow: "Fey Leyline · The Green Places",
      subraceRef: "Wild Elf",
      tagline: "Bargains like breathing, and promises that carry weight.",
      lore: "Wild Elves are the elves who resonated with the Fey Leyline. They are the fairest of the elf peoples and somehow the hardest to look at for too long, eyes a shade too bright, faces a degree too perfect, dressed a season out of sync, flower crowns that never wilt, summer colors worn into snow. Nothing about a Wild Elf is quite wrong. Nothing about one is quite right either, and the space between the two is where they thrive.",
      loreSections: [
        { h: "Where They Live", p: ["Wild Elves keep to the old green places where the Fey Leyline runs shallow, deep woods, flowered valleys, the soft country that painters love and farmers avoid. Their villages are lovely, welcoming, and notoriously difficult to find a second time. Travelers are fed well, entertained better, and sent off with directions that work."] },
        { h: "The Line to Elsewhere", p: ["Every other elf people chose a line that runs to an element. The Wild Elves chose one that runs to a place: the Fey Realm. A Leyline is a road of sorts, and roads run both ways, so what they resonated with resonates back.  Their strangeness, and their step that slips sideways through the world. This makes them close kin to the Kith, the children the Fey Realm made more outright, and the two recognize each other on sight without being easy about it. To the Kith, a Wild Elf is family who wandered in through the wrong door. To the Wild Elves, the Kith are the door's other side, a standing reminder of what enough fey in the blood eventually becomes. They are unfailingly courteous to one another."] },
        { h: "The Word Given", p: ["Wild Elves bargain constantly. The fey line runs on exchange, and its elves inherited the instinct, so a conversation with a Wild Elf accumulates small deals the way a walk through burrs accumulates burrs. A favor for a favor. Most of it is harmless, half a game, and then you give your word on something and discover what their word means.", "A promise made to a Wild Elf binds. Not as metaphor, but as a real weight, that the fey line holds, the same way mud holds a footprint, and to break one is to invite consequences the breaker never quite is able to trace back: luck curdles, milk sours, roads that were short run long. A bargain is sealed by the exchange of some small worthless thing, a button, a strand of hair, a pebble off the road, whatever the hand finds first, and each party keeps what they were given for as long as the agreement stands. Wild Elf houses accumulate these by the drawerful. To return the token is to end the arrangement, formally and without insult. To lose one is a matter of genuine dread.", "The Wild Elves do not enforce this. They watch it happen with the mild interest of people who told you so. Among themselves they trade promises with care and artistry, and their courts, such as they are, exist mostly to adjudicate the beautiful tangles that result."] },
        { h: "The Revel", p: ["Their gatherings run long, loud, and lovely, music that gets into the feet, food that improves the memory of everyone who ate it, and every Wild Elf festival has guests no one invited and no one questions. Some wear masks. Hosting the Fey Realm's wanderers well is a duty the Wild Elves take seriously beneath the laughter, because the line runs both ways, and what comes out it is friendlier when it has been danced with."] },
        { h: "Playing a Wild Elf", p: ["A Wild Elf character runs on fey grammar: bargains like breathing, promises with weight, beauty a degree past comfortable. You are welcome nearly everywhere and remembered a little nervously afterward. Deals accumulate around you whether you intend them or not. Read everything back before you sleep."] }
      ] },
    { id: "elfline-wood", name: "Wood Elves", eyebrow: "Earth Leyline · The Forests",
      subraceRef: "Wood Elf",
      tagline: "The elves nobody fears and nobody crosses.",
      lore: "Broad-shouldered, brown-eyed, and the strongest of the elf peoples by a comfortable margin, the Wood Elves gave themselves to the Earth Leyline, the slowest and most patient line in the world, and settled in to keep it company. They go clad in moss-green and bark-brown, antler and horn where other elves wear silver. An oak does not hurry. Neither do they.",
      loreSections: [
        { h: "Where They Live", p: ["Wood Elves hold the great forests of the mainland and turn up wherever the land grows tall, oak country, river woods, even the eastern jungles, where a few green-brown clans farm the clearings and keep the hedge-law under a hotter sun. They trade with everyone, feud with almost no one, and welcome travelers who mind the markers."] },
        { h: "The Law of the Wood", p: ["The Wood Elves keep a law older than any kingdom that borders them, and they have never written it down, for the people it applies to are expected to know it. The right of way through the deep wood. The right of hunt, and its seasons, and its limits. The hedge-law of what may be cut, what may be cleared, and what may not be touched though your house is freezing. Every forest they keep is governed wood, however wild it looks, and the wildness is the point: a Wood Elf forest is not untended, it is tended toward wildness, the way a garden is tended toward bloom.", "They enforce it in three steps. First the marker: a carved token left precisely where you trespassed, courteous as a calling card. Then the visit: a party standing at your camp's edge at dusk, unarmed and unhurried, explaining the law you transgressed as though you had simply never been told. There is no third warning."] },
        { h: "The Tended and the Wild", p: ["For all the antler and old law, most Wood Elves are farmers. The Earth Leyline is a generous line, the same generosity that once fed the terraces of Tenkyra, and Wood Elf land shows it: orchards that crop heavy year upon year, fields that shrug off blights, harvests the neighboring kingdoms quietly depend on. Their homes grow rather than stand, halls raised inside living trees and villages threaded through orchards their great-grandmothers planted, and an orchard planted by your great-grandmother is not property. It is presence. Selling one is not done.", "A household here is counted in trees rather than in heads. A family's standing rests upon what its dead put in the ground and what its living have added since, and a generation that plants nothing is spoken of as other peoples speak of a house that has spent its money: not with contempt, exactly, but with the pity reserved for those who have squandered a thing that cannot be bought back. When two families dispute a boundary, the elder planting decides it, and both sides accept the ruling, because both sides can count.", "The generosity is also why they watch. The Wood Elves know what an earth line gave the Kitsune, and they know what it did when it turned, and the oldest families keep small rites over their own line, reading it for signs no one else would think to look for. Nothing has ever come of it. They keep the rites anyway."] },
        { h: "The Green Table", p: ["Their standing in the world is a strange and comfortable one: the elves nobody fears and nobody crosses. Every famine ends at a Wood Elf border, and every crown knows it, which makes burning their woods the one move even the stupidest war avoids. So the Wood Elves sit at the great tables without an army worth the name, valued for their grain, respected for their law, and underestimated. Other elves get destiny. Wood Elves got soil, and they will tell you, with a farmer's flat certainty, that they came out ahead."] },
        { h: "Playing a Wood Elf", p: ["A Wood Elf character is strength with patience: farmer, warden, keeper of a governed wild. You are the elf nobody fears and nobody crosses, hard to hurry and harder to move. Mind the markers, keep the hedge-law, and remember what your family's rites are listening for beneath the orchard."] }
      ] },
    { id: "elfline-prime", name: "Prime Elves", eyebrow: "Athenia · Unresonated",
      subraceRef: "Prime Elf",
      tagline: "Potential made patient, and the well every elf line was drawn from.",
      lore: "Prime Elves are elves before the world has chosen them. Gray-eyed and unmarked, clad in the undyed gray-green of their island, they carry none of the fire or salt or shadow that stamps their resonated kin, and they carry the absence on purpose. Every Sun Elf, every Sea Elf, every line of every elf people began as one of these: a Prime who left the island, gave themselves to a Leyline, and was remade. The Prime Elves are the ones who have not yet. Some of them never will.",
      loreSections: [
        { h: "Where They Live", p: ["Nearly all Prime Elves live on Athenia, and the reason is arithmetic: a child born on claimed ground is claimed by it, so a Prime line continues only at home. A few walk Loglandia even so, gray-eyed scholars and wanderers taking the long look before the one decision, and they are easy to mark if you know elves at all."] },
        { h: "The Island Without Lines", p: ["Most Elves are born resonated now, almost all of them honestly. A child of two Sun Elves is a Sun Elf, the fire handed down with the blood. But the first of every line was once a Prime, and Primes are born in exactly one place: Athenia, the elf homeland, an island far off Loglandia's shores, which the Leylines do not touch. No line runs beneath that ground. Elsewhere, an elf child is claimed by the land it is born to, arriving already spoken for. On the island a child arrives blank. A Prime Elf.", "When two lines marry, the blood does not compromise. It chooses, on its own counsel: the same Sun Elf and Sea Elf raise one daughter red-haired and with a burning temper and one son with skin as blue as deep water and calm like the waves, and now and then a child who is some of each, salt in the temper and fire in the hair. Which line claims a child is known only when the child arrives."] },
        { h: "The Tree of Life", p: ["At Athenia's heart stands the tree the elves come from, and none of them talk about it quite that plainly. The Tree of Life is old past any record, vast past sense, and every elf faith from the desert to the deep keeps some corner of its worship, however far the line has wandered from the shore. It is the one thing the whole family kneels to. The scholars hold that the Tree is what repels the Leylines, that no line can run where its roots do. Off the island the worship is infrequent: small shrines in the elvish quarters of great cities, and, once in a life if at all, a pilgrimage back to the shore.", "The Tree kept a law as well, and the law has outlived the island. Every door owes the traveler fire and food, for any stranger may be walking to or from the Tree. Each line carried the tree-law into the world and bent it to their country. The stranger at an elf's fire eats first.", "The elves say a person has three lives, the way one says it of a cat, not meaning it and meaning it completely. The belief is that an elf still in touch with the Tree, and all elves are, is caught by it a few times in a life: the fall from the cliff that lands on the one soft bank, the arrow stopped cold by a book that had no business being in that pocket. No elf can summon it, no priest can promise it, and no one agrees on the count. But when an old elf walks away from something that should have killed them, the family does the same arithmetic in the same silence, and somebody finally says it: that's one spent.", { aside: "For what it is worth: the count is real. I will not say how I know." }] },
        { h: "The Unwritten", p: ["The Prime Elves treat an unresonated life as an unfinished page, and they are in no hurry to fill it. Their island runs to courtyard gardens and ink, quiet halls of tutelage, heraldry left deliberately empty, and a courtesy that never quite commits to anything. It reads as indecision to outsiders. It is the opposite. A Prime Elf knows that the choice of a Leyline is irrevocable, for themselves and for every descendant born already carrying it, and a people holding an irreversible pen in the world learned to think before writing something.", "Only the Moon Elves ever left the island and chose nothing on the ground, turning their faces to the three moons instead, and the Prime Elves speak of them the way one speaks of a sibling who answered the family question sideways: with respect, and at a slight loss for word."] },
        { h: "The Grey School", p: ["Because no Leyline touches Athenia, no Leyline holds a favorite there, and upon that neutrality the Prime Elves raised the foremost school of Leymancy in the world. A resonated scholar studies their own line from inside it, feeling it, favoring it, half unable to do otherwise. The Prime scholar stands outside every line at once, and the island's academies have charted the Leylines with a clarity no resonated people can rival. Every crown and college in Loglandia covets that knowledge."] },
        { h: "The Leaving", p: ["The island's eldest ceremony is a departure. An elf who has chosen their destination and sails for the mainland and their Leyline, and the resonance takes them slowly, across the years of a new life, the land steeping into them until one day the gray eyes have gone the color of what they chose. They sail under a blank banner until resonated.", "", "Those who stay on the island, stay whole lives, and the wider family of elves is of two minds about them. To some, Athenia is the honored well their own line was drawn from. To others there is something faintly unserious about an elf who never chose, a guest at every table who will not sit."] },
        { h: "Playing a Prime Elf", p: ["A Prime Elf character is potential incarnate: gray-eyed, unclaimed, courteous to a fault, and carrying the one decision that cannot be unmade. You have left the island every elf comes from to take the long look at the world before choosing what your whole line will become. Scholar, wanderer, or late bloomer, whatever you do in the meantime, remember that the Leylines are looking back."] }
      ] },
  ],

  organizations: [
    { id: "the-blackseal-order", name: "The Blackseal Order", eyebrow: "Organization · Faith & Cult",
      img: "/images/blackseal_wordless_master.png",
      tagline: "Followers of Hightrankul, the Pale Word — a secret society behind the ordinary business of commerce and debt.",
      lore: "The Blackseal Order follows Hightrankul, the god of coercion and greed. It is a secret organization sheltering behind the ordinary business of commerce and debt, and it prefers the contract and the blackmail letter to any open display of terror. Members keep their identities secret even from one another, taking masks and codenames when they speak. Their leaders, the Wordless Masters, often hold real positions of power as politicians, business owners, or aristocrats.",
      loreSections: [
        { h: "Faith Through Debt", p: ["The Order is a corporation before it is anything else, pursuing power through capital and political influence in equal measure. When someone powerful but vulnerable falls on hard luck, or a person of standing faces ruin from a terrible secret, the Order may offer to bury the trouble entirely, in exchange for future use of that person's resources, fame, or influence."] },
        { h: "Split Branches", p: ["Like the other cults of the Gentle Sins, the Blackseal Order operates across many places, split into chapters that rarely know of one another. A pocket of ground-level members serves a Director, and several Directors answer to a single Wordless Master. Any settlement large enough to be called a town is likely to hold more than one Director, and a Wordless Master usually oversees the Directors of a city and its neighboring towns together.", "Wordless Masters know of one another, but Directors within the same settlement may not. To recognize each other regardless, members rely on hidden cants, seals passed down by their Wordless Masters, and small markings that mean nothing to an outsider's eye."] },
        { h: "Last Word Letters", p: ["The Order keeps its members obedient through hidden dossiers, records and evidence of the crimes each member has committed, known within as Last Word Letters. On initiation, or on rising in rank, a member is made to commit some blackening deed. If they succeed to the Order's satisfaction, the Order helps bury it and keeps the evidence, ready to be used if that member ever betrays them. For the lowest ranks these acts might be extortion, theft, or betrayal; to rise further, the deeds only grow worse."] },
        { h: "Servitude to the Pale Word", p: ["The Order does not present itself as a religion, and displays Hightrankul's symbol only where displaying it serves some purpose. It moves as a corporation and a secret society first. Most Directors and those below them do not particularly care for Hightrankul at all. But by joining, they sign away their souls, pledging themselves as the Pale Word's agents in the afterlife, and every act of the cult quietly feeds the god's power. It is the Wordless Masters alone who knowingly steer the Order's many branches toward Hightrankul's true design."] }
      ],
      facts: [],
      worship: null,
      dmNotes: [] },
  ],

  characters: [
    { id: "lucan", name: "Lucan", eyebrow: "Character · The Dawn Hunt",
      img: "/images/lucan.png",
      tagline: "\"the Dawn Feather\"",
      lore: "Lucan never folds his wings away, and hunters half a head taller than him still stand up when he walks past. Meet him once and he has your name for good, along with the town you rode in from and the drink you ordered. New hunters keep looking for the catch in all that warmth. The old ones could tell them there isn't one.",
      facts: [
        { label: "Theme", text: "The Dawn. The light people steer home by." },
        { label: "Location", text: "The Gilded Feather, in the heart of Kingsmont — a bar downstairs, a hall of contracts and hunt-trophies above, bunks under the rafters. Headquarters of the Dawn Hunt." },
      ],
      gmNotes: [
        { label: "Want", text: "To go back out the door. He built the safe, warm, wonderful thing, and he loves it, and every time a road-dirty party walks in with a real hunt on them, something in him leans toward the door. He misses the sky. He's looking, quietly, for a reason good enough to strap it all back on." },
        { label: "Knife", text: "Icarus, grounded. One wing is chipped and half-bandaged, and it has been for years. That injury took him off the road for good and turned the best hunter in Kingsmont into the man who sends others out to do it. It doesn't haunt him. He's happy. But the ache is real and human. He flew too near the thing that broke him once, came home, and now lives the sky through the stories hunters carry back to his bar. Give him the right hunt and too much nostalgia and he will find an excuse to fly again, and he probably shouldn't." },
        { label: "Contradiction", text: "The most grounded man in the capital, and the one who most wants to leave the ground." },
        { label: "Lever", text: "He's the way in. Contracts, introductions, the lay of every danger within a hundred miles, a warm bed and a warmer welcome. The Dawn Hunt is the party's on-ramp to the working world, and Lucan is its open hand. What he wants back isn't coin, it's to be part of it. Bring him a good enough hunt and the lever reverses: now he's someone the party can recruit." },
        { label: "Connections", text: "Live wire. His son Emrin keeps the books, keeps the boards, and keeps his father on the ground. Emrin knows better than anyone that Lucan is one good excuse away from a hunt that wing can't survive, and he spends a quiet amount of energy making sure the excuse never quite arrives. It's loving, not bitter." },
        { label: "Players know", text: "At first, a beloved, charismatic winged guildmaster who founded the Dawn Hunt and runs the best hall in Kingsmont. The chipped wing is visible. The story of how isn't offered unless someone asks, and even then he tells it light." },
      ] },
    { id: "emrin", name: "Emrin", eyebrow: "Character · The Dawn Hunt",
      img: "/images/emrin.png",
      tagline: "\"the Feather's Ledger\"",
      lore: "Emrin has his father's wings. On him they mostly get in the way of the desk. He runs the boards Lucan is too warm to run himself, and if a contract's pay is wrong, he's the one who tells you, without softening it. Hunters come to like him slower than they like Lucan, and trust him faster: Lucan tells you the hunt will go fine, Emrin tells you what it pays and what it's killed before.",
      facts: [
        { label: "Theme", text: "The Ledger. Where his father is the open sky, Emrin is the ink that keeps the Hunt aloft." },
        { label: "Class", text: "Sorcerer, Lighttouched bloodline — the same mark as his father's, mostly unused, mostly in the way." },
        { label: "Adventurer", text: "Yes" },
        { label: "Location", text: "Behind the contracts desk at the Gilded Feather, in Kingsmont." },
      ],
      gmNotes: [
        { label: "Want", text: "To keep his father alive and the Hunt solvent, in that order. Everything else is a column that has to balance." },
        { label: "Knife", text: "He's the anchor by choice, and it costs him. Emrin could be a hunter. He has the wings, the blood, the name that would open any door in the Dawn Hunt. Instead he took the desk, because someone has to be the reason Lucan doesn't fly, and he decided years ago it would be him. He doesn't resent it. But he watches parties ride out toward the thing he keeps his father from, does the sums on who's likely to come back, and goes back to the ledger. The one time he leaves the desk himself, the question follows him out the door: who's watching Lucan while he isn't." },
        { label: "Contradiction", text: "The one Feather with wings who never uses them, minding the one who can't, is now the one who might have to leave." },
        { label: "Lever", text: "He controls the actual paperwork. Which contracts get posted, what they truly pay, which hunters the Hunt will vouch for. Lucan is the welcome; Emrin is the yes or no. Get on his good side and the good jobs find you. Cross him and the board goes quiet." },
        { label: "Connections", text: "Live wire. His father, obviously; the whole grounded-angel tension runs through Emrin. Beyond that, he's the one who'd know first if a contract on the board is a trap, a lie, or bait aimed at the Dawn Hunt itself, because he reads every word while Lucan reads faces." },
        { label: "Players know", text: "The guildmaster's sharp, bookish son who runs the desk and doesn't sugarcoat. That he chose the ledger over the wing on purpose isn't something he talks about." },
      ] },
    { id: "tatsumi", name: "Tatsumi", eyebrow: "Character · Adventurer",
      img: "/images/tatsumi.png",
      tagline: "\"the Bolt of Shirokane\"",
      lore: "Every child in Shirokane grows up worshipping Meirlach the Dragon Master. Only his followers call him Musashi, and Tatsumi has never once called him anything else. The other children worshipped and grew out of it. She imitated him, studied his swordsmanship, and never stopped. Her father is a blue Drakel who carried messages between Shirokane and Vaelrath, the dragon plane, and from him she gets her innate speed and the small stock of manners she has. She is young and loud, and she bows very correctly before she asks the biggest man in the room for a sparring match. Then, before you have registered that it began, she is across the floor and cutting at you.",
      facts: [
        { label: "Theme", text: "Lightning." },
        { label: "Class", text: "Sword Saint, Way of Musashi." },
        { label: "Adventurer", text: "Yes" },
        { label: "Location", text: "Wherever the next good blade is. She left Shirokane on purpose." },
      ],
      gmNotes: [
        { label: "Want", text: "To be fast enough, and to find her god's swords. Not faster than you. Fast enough." },
        { label: "Quest", text: "Temper and Patience, the ancient swords of Musashi. A matched pair, long lost, and she intends to carry both. Everything else she does serves this. She walks into ruins nobody has opened in an age, buys drinks for scholars, copies temple inscriptions she can barely read, and asks every stranger on every road whether they have heard the names. She is chasing two blades named for the only two virtues she does not have, and this has not occurred to her once." },
        { label: "Complex", text: "Never fast enough. She set her ruler against a god, and a god's ruler does not move. She fights with everything she has, the lightning first among it, and the gap never closes, because Musashi's standard was never a thing a living hand reaches. Every duel she wins took too long. Every strike that landed could have landed sooner. She is not unhappy about this. She is simply never finished, and she will still be measuring at eighty." },
        { label: "Contradiction", text: "She carries a storm in her hands and believes she is slow." },
        { label: "Lever", text: "She wants sparring, teachers, and the name of anyone dangerous. Better still, she wants ruins. She will follow a party into anywhere old and lethal for almost nothing. She carries a Shirokane name, which means smiths, shirosteel, and the isle's duelists all open to her." },
        { label: "Connections", text: "Live wire — her father: a Drakel of blue descent who carried messages between Vaelrath and Tenkyra, and stopped when he met a human woman in Shirokane. He is the man who walked past her god's house a hundred times without going in, and she has never asked him why he quit the road. Warm — Setsariel, a Kitsune scholar she met in the Kingsmont library, both of them chasing Tenkyra through old paper. He is the only reminder of home she has this far south, and she would never say so. Thread, unlit — Mortuous watches promising warriors, refines them quietly, and challenges them at their peak. A traveling duelist honing speed against a god's standard is exactly what he collects." },
        { label: "Players know", text: "A loud, friendly, absurdly quick duelist from Tenkyra, proud of her Drakel father, following the Way of Musashi. She will tell anyone who stands still that she is hunting her god's lost swords, and most people find this charming and none of them help. Everyone calls her the Bolt of Shirokane. What nobody quite registers is that when she says she was slow, she means it." },
      ] },
    { id: "mylo", name: "Aurelio II", eyebrow: "Character · Adventurer",
      img: "/images/mylo.png",
      tagline: "\"the Sun Blooded\"",
      lore: "He comes in unhurried, grinning, already sure the day is going to go his way. Red hair, one eye, a chest full of scars, and he will tell you the story behind any of them, though the stories get better every year. When the crowds call him kin to the great Sun Elf general he just laughs. He is obviously human. It has never once hurt ticket sales.",
      facts: [
        { label: "Theme", text: "The Sun." },
        { label: "Class", text: "Fighter — a lance since his first day in the pits, never seriously picked up anything else." },
        { label: "Adventurer", text: "Yes" },
        { label: "Location", text: "Pyrra, the colosseum city, where the Sun Elf love of the fight became an industry." },
      ],
      gmNotes: [
        { label: "Want", text: "A real war. He has been the best in Pyrra long enough that winning stopped feeling like anything, and he wants to matter somewhere the stakes don't reset at the next festival. He'd tell you it's for glory. Some of it is for Mortuous." },
        { label: "Knife", text: "Nobody fights him anymore. Not really. The good challengers find reasons to be elsewhere, the promoters manage his bouts like theater, and the bookmakers quit taking bets on him years ago. So when something that smells like a real war finally comes through Pyrra, he is going to say yes before he asks what it costs." },
        { label: "Knife (second)", text: "The eye went to a beast, in a fight that lasted from morning gate to torchlight. He dines out on that story. He leaves out that he still dreams about it. Men make sense to him, even the ones trying to kill him, but the thing in the sand that day wanted nothing he understood." },
        { label: "Contradiction", text: "Twenty thousand people scream his name on a festival day, and he is starving." },
        { label: "The eye", text: "A ruby sits in the socket under the patch. Hardly anyone has seen it, and every story circulating about it is wrong, which he enjoys. Where it came from and whether it does anything: left open on purpose." },
        { label: "The name", text: "He turned up in Pyrra young, red-haired, with no past anyone could find, carrying nothing but his name and a stubborn certainty that he was meant for something large. (DM note: Ehala. The other Aurelio II is not in play. Flavor, not a thread.)" },
        { label: "Lever", text: "Rich, famous, bored. Offer him a real fight or a real monster and he will work for insultingly little. He also knows everyone in Pyrra worth knowing, and his benefactor knows the rest." },
        { label: "Connections", text: "Live wire — the benefactor, a fighting-pit legend who took in a red-haired nobody on a hunch and made him the biggest draw in the city's history; it started as business and turned into something like family (to be fleshed out later). Warm — Duro, a fire-marked brute he spars with off the books; half the city manages every fight Aurelio II has, Duro is the one who doesn't. Loaded rumor — the Sun Blooded name travels, and Aurelio's blood is a war-claim in the deep desert that has never ended. Thread, unlit — Mortuous quietly refines promising warriors and challenges them at their peak; Aurelio II prays to him daily and wants exactly one thing, a challenge worth answering." },
        { label: "Prayer ritual", text: "In the tunnel, before the gate, he kisses the flat of the lance-head and presses it to the patch for a moment. Nobody has ever asked him about it, and he has never explained." },
        { label: "Players know", text: "The undefeated champion of Pyrra. Red-haired, one-eyed, loud, generous, hard not to like. Called the Sun Blooded, rumored kin to the great Sun Elf general, plainly human. Prays to Mortuous. Tells anyone who asks that he wants out of the pits and into a war." },
      ] },
    { id: "amenza", name: "Amenza", eyebrow: "Character · Adventurer",
      img: "/images/amenza.png",
      tagline: "\"the Grasping\" — a name she took for herself, not one anyone gave her",
      lore: "She keeps the lower half of her face veiled, and most people never learn the rest. Silver hair, light purple eyes, a spiked chain coiled somewhere in reach. She is courteous, quiet, and forgettable on purpose. It slips in two places. Near anything gilded, a noble's carriage, a temple door, a rich man's coat, the envy shows in her eyes before she can school them. And she moves like a dancer whether she means to or not. On the rare night she lets herself dance, strangers stop to watch.",
      facts: [
        { label: "Theme", text: "Envy. What she was never given." },
        { label: "Class", text: "Favored Soul of Invidiva. (Tier 4 in the divine framework — the first Character Book entry who's a mechanically real Champion, not just a devotee.)" },
        { label: "Adventurer", text: "Yes" },
        { label: "Location", text: "Kingsmont, out at the ragged edge where the lamplight gives out. She does not keep a room anyone can find twice." },
      ],
      gmNotes: [
        { label: "Want", text: "To be strong. Not for its own sake. Strong enough that Perrin, Prince of Kingsmont, cannot look past her the second time." },
        { label: "Knife", text: "Her mother ran a room in a brothel and kept two daughters in it for less than a week. Perrin came himself, killed her mother with his own hand, and carried off one infant to pass as his dead wife's child. He did not think the other worth killing. He simply left. Amenza grew up in the same brothel that buried her mother, on scraps and the goodwill of a madam who owed her nothing, and did not learn any of this until she was eighteen. She has had two years to turn that knowledge into something with an edge." },
        { label: "Contradiction", text: "She wants to become powerful enough to be seen by the one man who has never once looked for her." },
        { label: "Lever", text: "She takes work that pays and work that teaches her something new about killing. A party bound for danger, especially danger with a noble's name attached to it, doesn't have to convince her twice." },
        { label: "Connections", text: "Live wire — Perrin, Prince of Kingsmont, murdered her mother and left her for dead; he has no idea she survived. Live wire — Amariel, Princess of Kingsmont, is her twin, raised in the palace her mother died to give her; Amenza knows this, Amariel does not know Amenza exists. Unlit — the madam who told her the truth at eighteen carried the guilt of that silence for thirteen years. Unlit, dangerous if it ever lights — both sisters love to dance, a thing neither knows the other does." },
        { label: "Players know", text: "A veiled, silver-haired woman who turns up where there's dangerous work and disappears once it's done. Dangerous with a chain. Gives her name to almost no one. Nothing about a prince, a princess, or a brothel. Nothing about being anyone's twin." },
      ] },
    { id: "amariel", name: "Amariel", eyebrow: "Character · Kingsmont",
      img: "/images/amariel.png",
      tagline: "\"the beloved of Kingsmont\"",
      lore: "Amariel enters a room and the room reorganizes around her without seeming to notice it's done so. Warm and open-faced, nothing veiled about her at all. Her hair is court black from a bottle, and between sittings with the dye, the roots come in red. She remembers everyone's name, touches an arm when she says it, and men who have served the crown thirty years catch themselves hoping she remembers them fondly. When there's a ball she dances until the musicians tire first. She is exactly as warm as she seems, and that is the unsettling part.",
      facts: [
        { label: "Theme", text: "Lust. What everyone wants and cannot quite have." },
        { label: "Location", text: "The palace at Kingsmont. Third in line, unmarried, and the whole court quietly expects that to be decided for her rather than by her." },
      ],
      gmNotes: [
        { label: "Want", text: "To be loved past the point of reason, by everyone, always. Not vanity. Instinct. She has never once had to ask for loyalty and doesn't fully know that's strange." },
        { label: "Knife", text: "She believes she is the trueborn daughter of a dead queen. She is not. Her father murdered a woman in a brothel to take her, and told a grieving kingdom his wife had died bearing a second, unrecorded child. Amariel has never doubted a word of it. She does not know she has a twin. She does not know her real mother's name." },
        { label: "Contradiction", text: "The most beloved woman in Kingsmont has never once been told the truth about who she is." },
        { label: "Lever", text: "She collects loyalty the way some people collect debts, without meaning to and without spending it carefully. A party that earns her favor gains a foothold in the palace no coin could buy. A party that crosses her finds every door in Kingsmont a little harder to open." },
        { label: "Connections", text: "Live wire — her father, Perrin, dotes on her completely and has never once let himself think about the child he left behind. Live wire — Amenza, her twin, alive, marked, and hunting the same man Amariel calls father, for reasons Amariel cannot imagine because she doesn't know there's anything to imagine. Unlit — the mother she mourns every year on a day that never actually happened. Unlit, dangerous if it ever lights — both sisters love to dance, a thing neither knows the other does." },
        { label: "Players know", text: "The beloved princess of Kingsmont, third in line, unmarried, adored by everyone who meets her. Nothing about a brothel. Nothing about a sister." },
      ] },
    { id: "setsariel", name: "Setsariel", eyebrow: "Character · Adventurer",
      img: "/images/setsariel.png",
      tagline: "\"Setsu\" — the formal name is his mother's; everyone who likes him shortens it",
      lore: "Setsu is tall, lanky, and forever apologizing for things that need no apology. Strangers see the white fox ears, the three tails, and decide he is a Byakko, an omen made flesh, and he has spent his whole life gently explaining that he cannot read anyone's future, his mother is simply an elf from the snow country. He answers questions in a soft, precise voice, knows more than he ever volunteers, and given a quiet hour will fold himself into fox form beside the fire with a book propped against his own tails.",
      facts: [
        { label: "Theme", text: "Winter. Frost creeping across lantern glass while he reads a map he already knows is wrong." },
        { label: "Race", text: "Kitsune, Snow Elf mother. White-furred, and mistaken for a Byakko omen-fox roughly weekly." },
        { label: "Class", text: "Wizard, journeyman-candidate of the mage college in the north." },
        { label: "Adventurer", text: "Yes" },
        { label: "Location", text: "Kingsmont, mostly the library. Otherwise the Gilded Feather, at whichever table has the best lamp." },
      ],
      gmNotes: [
        { label: "Want", text: "To finish the search without ending it. He came south to graduate. He stays south because stopping means the last thread to the burned homeland goes cold." },
        { label: "Hook", text: "The graduation trial. The college graduates no one on examinations alone; the final trial is a retrieval, one lost thing somewhere in the world, come back with it or come back nothing. Knowing his obsession, the college assigned him something that survived the Akimori calamity and made its way south. The errand should have taken a month. It has taken most of a year. He no longer entirely wants to graduate, because graduating means the search ends. (What the object is: open.)" },
        { label: "Contradiction", text: "The best student the college has, quietly stalling his own graduation." },
        { label: "Lever", text: "He needs access: private collections, sealed archives, ruins with Tenkyran cargo in them, anyone old enough to remember refugee ships. A party headed anywhere old can have his spellbook, his patience, and his tidy handwriting for the asking." },
        { label: "Connections", text: "Warm — Tatsumi. They met in the Kingsmont library, her table stacked with Musashi's histories, his with survivor accounts of the mountains that burned. Two Tenkyra-blooded strangers this far south, each the other's only reminder of home. Standing — the college in the north, which expects him back, and his mother in the snow country, whose letters he files chronologically." },
        { label: "Quirks", text: "The fox form is for reading. Ask about the tails and receive the prepared forty-five-second lecture on the mastery system, which cannot be stopped once begun. He collects pre-calamity maps of the drowned Akimori terraces and redraws them from survivor accounts; he won't call it a hobby and won't call it grief." },
        { label: "Players know", text: "A polite white-furred Kitsune scholar from the north, staying at the Feather, deep in some research he's vague about. Friendly with Tatsumi. Probably a Byakko, people say, no matter how many times he says otherwise." },
      ] },
    { id: "ferrin-fell", name: "Ferrin Fell", eyebrow: "Character · Adventurer",
      img: "/images/ferrin.png",
      tagline: "the coast calls him Salt-Tongue, and he's never once corrected them",
      lore: "Ferrin leans before he stands, unhurried in a way that makes everyone around him relax without noticing they've done it. He tells you a story and you believe you talked him into it. Ask what the tattoo across his chest means and the ease slips for exactly one second before he finds it again and changes the subject with a joke you'll repeat for a week. He has never once made you a promise. He has also never once lied to you. Working out which is happening in any given conversation is most of his charm.",
      facts: [
        { label: "Theme", text: "The chill of the tide. Calm water, easy going, the sea at rest." },
        { label: "Race", text: "Sea Elf. Slate-blue skin deepening to teal at the temples, dark malachite-green hair, a scar through one eyebrow he's never explained." },
        { label: "Class", text: "Bard, College of Eloquence." },
        { label: "Adventurer", text: "Yes" },
        { label: "Location", text: "Wherever the harbor gossip is best. He works the coast in loose circuits, a season here, a season there, never far from moored ships." },
      ],
      gmNotes: [
        { label: "Want", text: "Crew, favor, and power enough to take one piece of Ilsrabae's hoard out of the Black Drain and walk away with it. Not revenge. Proof. His faith says the tide can be steadied. He intends to steal the argument out of her own vault." },
        { label: "Knife", text: "The tattoo across his chest went in the day a water elemental Ilsrabae failed to leash killed a Kua Hono friend of his, and the rest of the crew with him. He had it inked the Kua Hono way, the way they mark loss and deed both. He built a heist out of it instead of sitting still with the grief." },
        { label: "Contradiction", text: "The calmest man on any dock is quietly assembling an army to rob a goddess." },
        { label: "Lever", text: "He performs his way down the coast listening for wreck-talk, drowned cargo, anyone who's been near the Black Drain and lived. A party headed toward water-danger is a party he'll charm his way into joining, and most of them won't clock what they've signed up for until it's too late to back out gracefully." },
        { label: "Connections", text: "Unlit — the Kua Hono crew he lost; nobody currently in his circle knew them. Standing — the College of Eloquence, whose training he uses less for songs and more for recruitment." },
        { label: "Players know", text: "A charming Sea Elf bard working the coast, quick with a story, quicker with a favor. Devout to Kai Foschunn and openly contemptuous of Ilsrabae, which most people write off as a sailor's grudge. Nobody knows about the hoard." },
      ] },
    { id: "duro", name: "Duro", eyebrow: "Character · Pyrra",
      img: "/images/duro.png",
      tagline: "\"the Blazing Berserker\"",
      lore: "Duro is big, warm, and not the sharpest man in any room, and it has never once bothered him. He solves most problems with his hands and the rest with a grin. He carries one thing besides himself: a small blackened cold-iron kettle, the one material his fire respects, and making tea on his own palm is the first trick he shows anyone new. Loves fire the way sailors love the sea. Loves a good fight the same way. Loves people almost as much as both.",
      facts: [
        { label: "Theme", text: "The banked coal. Warm even standing still." },
        { label: "Race", text: "Fire Primordia. Ash-gray skin, ember-orange cracks glowing constantly at low simmer along the knuckles, jaw, and joints. Hair the color of low flame." },
        { label: "Class", text: "Barbarian, unarmed grappler." },
        { label: "Adventurer", text: "Yes" },
        { label: "Location", text: "Pyrra, more often than not. Sleeps outdoors on stone by preference." },
      ],
      gmNotes: [
        { label: "Hook", text: "He's on the road because the road is fun, plainly, and because he's burned exactly one bed in his life and word travels faster than he does. Nobody's ever run him out of anywhere out of malice. He's just expensive to house." },
        { label: "Quirk", text: "Sleeps outdoors on stone by preference." },
        { label: "Connections", text: "Mylo. They spar outside the official matches, plainly, for the fun of it, and Duro is the one fight in Pyrra Mylo doesn't have to hold back in." },
        { label: "Players know", text: "A huge, warm, cheerfully destructive fire-marked brute who sparred his way into Pyrra and never quite left. Everyone's seen the kettle trick at least once." },
      ] },

  ],

  gods: [
    { id: "the-death-triad", name: "The Death Triad", eyebrow: "Primary God · Unholy",
      img: "/images/death_triad.png",
      tagline: "Death is one, and it is three.",
      lore: "Death means different things to different people. To some it is the sweet lull of sleep. To others it is the reward at the end of a life worth remembering. To others still it is the promise of a power life could never hand them. To the wise it is all three at once, because a thing as vast and as constant as death was never going to wear a single face. The god of death is one, and it is three: Lachrymar, Nuradhuin, and Morosyn. Learn the names while you still have breath to spend on them. They are everyone's ending, and they mean to rule how you live as much as how you die.",
      loreSections: [
        { h: "Before the Gods", p: ["What became the god of death began as a single fleck come loose from the wall that holds all of existence shut, a mote of eternity that woke and knew itself. It drifted through the void and marveled at being, and along the way it met other woken things, some of whom poured their divine spark into matter and made it conscious. The fleck loved that living matter more than it loved the ones who made it. Watching the living taught it the one thing it had never carried: pain. Everything that lived was in pain from the moment it was made, and everything that lived wanted out. So the fleck gave them a way out. It hummed, and those who heard the tune slipped free of the flesh and were eased. The mortals called it Lachrymar, the oblivion-granter.", "She wandered, answering the cries that reached her, and her music deepened with every note. She shaped a flute to guide it, and the freed dead danced after her through the cosmos. Some returned to the gods who made them, some to the gods they had chosen in life, and many simply stayed and drifted in her wake. Those drifting dead are the first tide of what mortals now call the Sea of Souls."] },
        { h: "The First War", p: ["Eons on, the gods learned that mortal souls could be spent for power, and the greedy among them demanded the largest share. So war was invented. For the first time the dying died hard, in numbers, without mercy and without Lachrymar. Gods were unmade in the fighting and mortals fell past counting, and when it finally burned out the survivors swore off the mundane world: no god would meddle directly in mortal affairs again. Lachrymar alone was spared the ban, because mercy to the dying was a service the living could not be asked to go without."] },
        { h: "Glorious Death", p: ["War taught mortals to kill the way gods did, with fire and steel and appetite, and a new kind of dying came with it. Warriors on the threshold did not want a lullaby. They wanted their valor seen. They would not dance to Lachrymar's tune, so death split, and the piece that broke away forged a scythe to reap only the brave. Cut free by that blade, the heroic dead could carry their deeds with them and boast them forever among their own. This was Nuradhuin, the reaper of the worthy, blind to all but valor and deaf to everything else."] },
        { h: "From Demise, Creation", p: ["Lachrymar and Nuradhuin wandered and worked and were not content. Among the dead who followed them, some came to regret that they could no longer touch the living world, to right a wrong, to press an advantage, to simply be happy in it again. The twin gods could meddle in what other gods had made but could make nothing themselves. A third was needed. So the two joined and bore a sibling, and into a tome they poured every soul they had ever gathered, a book only that new sibling could lift. They called it the Zoanic Therimoire.", "Morosyn came into being reading it. With the Therimoire they channeled the dead back into matter and shaped the first of the Undead, and the work took its lasting form: Nuradhuin culls, Lachrymar gathers the harvest into the book, and Morosyn makes. The Therimoire grew heavy with knowing no mortal mind could hold, page on page of it, and the three grew so rich in power and souls and servants that they raised a realm of their own inside the Sea of Souls. The Penumbral Isles rose out of the grey water, islands of crystallized souls with the dead still visible drifting inside them, and at their heart Morosyn grew the Tree of Unlife to drink the harvest in through its leaves.", "What Morosyn makes is not what their imitators make. The Gravelord does not stitch a corpse back onto its feet. They rewrite what a soul is, with knowledge the Therimoire drew from somewhere far past the edge of the ordinary planes, and the thing that stands up afterward wears too many limbs and remembers too much. That making is what the other gods could not forgive."] },
        { h: "Trinity Rebuked", p: ["No such work stays unwatched forever. The other gods felt the flow of souls to their own realms thin to a trickle and understood where it was going. A united pantheon came for the third god. They dared not kill death, and they dared not choke the flow further, so they caged the maker instead. Lachrymar and Nuradhuin kept their instruments, permitted to touch only those already dying and nothing more. Morosyn they ran through with a spear and pinned to the Tree of Unlife, and left there in limbo, neither dead nor alive."] },
        { h: "The Undying Accord", p: ["A caged god still dreams, and a god's dream leaks. Lachrymar's song began to hint at the secrets locked in the Therimoire. Nuradhuin's voice began to promise undying glory to any mortal bold enough to free a god. The whispers worked. Age after age they bred new horrors of unlife: the Grimoire of Unlife was written from stolen scraps of the true book, the Unburied King rose and rampaged, and lesser lichs wore themselves to dust chasing the Isles.", "Then one succeeded. Malveth, a dark-elf lord and the most patient student the whispers ever found, reached the speared body at the top of the Tree and cut part of it loose. Morosyn stirred. A new age of unlife broke over the world in the backwash, and Malveth rose a god upon it, the one zealot who passed. But only part of the Gravelord came free. The heart is still pinned to the black wood, and the heart holds the greater part of their power. Malveth rules his stolen dead-city of Vel Cadavien in Megiddo now, and wants nothing in all creation so badly as the day that spear comes out."] },
        { h: "The Three", p: ["Lachrymar is demure and quiet, and her voice is soft enough that pain stops to listen. She wears plain blue with almost no ornament, and the one striking thing on her is the long flute she plays to draw the suffering free. Of the three she is the only one the living thank. She also has a son, and everyone knows it. The Boatman who ferries every soul across the Sea of Souls is her child, doing openly and gently the mortal-facing mercy she was caged for trying to perfect. It is why the world can love the ferryman and dread his mother in the same breath.", "Nuradhuin speaks in blunt praise and blunter scorn, with nothing between. A great helm hides his eyes, because there is nothing he cares to look at but the purest acts of valor. He goes armored, winged, and armed with his giant scythe, ready to fall out of the sky and reap a worthy death the instant it is earned.", "Morosyn is the most terrible to look upon and the hardest to reach, skeletal and grave-voiced, every word a dry rattle. They carry the Zoanic Therimoire always, its pages aglow with the souls burned into them. They were distant from their own followers before the spear ever found them. Pinned in limbo for an age, they are further away now than they have ever been, a maker who scarcely notices the things made in their name."] },
        { h: "The Great Work", p: ["The Triad wants one thing, and it is patient and total: to remake what the other gods built into their own image, and to see their dead outlast and inherit the living. Each keeps their creations differently. Lachrymar listens to hers and eases their pain when they ask for it. Nuradhuin drives his toward the next fight. Morosyn, who never cared for the made past the moment of making, cares even less now."] },
        { h: "The World of Death", p: ["With Morosyn part-freed, the great work has begun again, and in a hurry this time, because the Triad does not mean to be interrupted twice. Raids go out to reap the raw souls, and the Tree of Unlife drinks them in and swells as it never swelled before. What climbs down out of its branches is not the shambling dead of common necromancy. The Gravelord's making runs deeper than a walking corpse. Souls come out the far side of the Therimoire's knowledge rewritten, poured back into matter as things that never wore that shape in life: too many jointed limbs, faces borrowed and set on wrong, mouths where a mouth has no business, wrongness that hums like the old tune gone sour. They are not risen people. They are people unmade and made again into something the world has no word for yet, and the Penumbral Isles breed more of them with every soul that falls. Mortals have felt the change. Many who feel it kneel, hoping favor will let them keep themselves in a world going over to death. The rest have started, wisely, to be afraid."] }
      ],
      facts: [{ label: "Also Known As", text: "Lachrymar · Nuradhuin · Morosyn" }, { label: "Alignment", text: "Neutral Evil as a whole; the three range from Lachrymar's mercy to Morosyn's ambition" }, { label: "Tier", text: "0 — Primary God" }, { label: "Type", text: "Primal (older than most other gods; predates the elemental/nature split entirely)" }, { label: "Domains", text: "Death, Grief, Forbidden Knowledge" }, { label: "Portfolio", text: "Dying, mourning, the honored dead, unlife" }, { label: "Associations", text: "The Undying Accord and its cults" }, { label: "Weapons", text: "Lachrymar's flute, Nuradhuin's great scythe, Morosyn's Zoanic Therimoire" }, { label: "Divine Realm", text: "The Penumbral Isles, within the Sea of Souls" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Favored" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Prized" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Naming", text: "Prized" }], paras: ["Once a year the faithful speak their dead aloud, every name they hold, in the order the deaths arrived. The rite is not offered for the comfort of the dead. It is a courtesy to Lachrymar, who gathers what is named and sets it into the Therimoire correctly, and the Undying Accord teaches that a name spoken carelessly is a soul recorded wrong forever."] },
      dmNotes: [] },
    { id: "aymere", name: "Aymere", eyebrow: "Primary God · Primal",
      img: "/images/aymere_portrait.png",
      tagline: "Balance is not a truce between nature and the axe. It is the axe learning where not to fall.",
      lore: "Aymere was born to a minotaur tribe that reckoned a life's worth in blood taken, and he had none to offer it. He was the frail one, the outcast, the name called last at every muster, and so he remained until the day his tribe's leader resolved to abandon the rest of the world's peoples to a threat no single tribe could survive alone. Aymere rose against him for it, met him in single combat, and having won, let him live. The tribe had witnessed a hundred victories conclude in a killing blow. This was the first that did not, and the restraint accomplished what no killing blow ever had: tribe after tribe fell in behind him, until a people who counted worth in blood were marching under the one leader who had refused to spill it.",
      loreSections: [
        { p: ["He led them into the First Age's great war at Solucant's side, minotaur horns arrayed beneath the Dawn General's banners, and battalions that would have broken in isolation held instead, because neither people left the other to fall. It remains one of the few particulars anyone can still agree upon regarding that war: whatever the enemy was, no single nation was ever going to turn it back alone.", "A rival in his own tribe never forgave him the mercy he had shown, and poisoned him for it. Aymere carried the affliction through the remainder of his mortal life. Upon ascension he might have shed it entirely. He kept it instead, visible upon him yet, the illness that ought to have broken him worn as a trophy taken from his own body."] },
        { h: "Balance, Not Neutrality", p: ["Aymere is patient with nearly everything and forgiving of most things, and he is not soft for any of it. What he wants is civilization and the wild seated at one table, each permitted to flourish, neither permitted to erase the other. The axe and the plow have no enemy in him, provided the hand that holds them remembers it has roots. Where Tithiss loves the wild for its own sake and would suffer it to swallow every road ever cut through a forest, Aymere holds the line at equilibrium. It is by far the harder position, and he has held it longer than most civilizations have existed.", "That patience has exactly one edge, and undeath is the whetstone. The Grimoire of Unlife and the whisper-cults of the Undying Accord grow nothing, feed nothing, and refuse the soil its due. They persist, wrongly, past the hour at which every living thing consents to stop. It is the single violation to which his mercy has never once been extended."] },
        { h: "The Leashing of the Four", p: ["The Paraprismatics did not choose to answer to him. Each of the four was a disaster wearing a god's power, and Aymere broke them to purpose the same way he once broke his tribe's leader: he beat them, spared them, and handed each one work. Ivsil he punished over and over until the storm learned to shepherd its own air elementals home. Tithiss, Burtromet, and Ilsrabae each carry the same charge for their own element, keeping their planes' creatures from spilling loose across the borders of the world. It is the largest thing Aymere has ever done and the least thanked. Four gods who would happily be catastrophes spend their eternities at maintenance instead, and every mortal who has never been drowned, buried, burned, or scattered on the wind by a loose elemental owes that tedium a debt they will never learn of."] },
        { h: "The Whispering Clemency and the Bramble-Hooves", p: ["His organized clergy, the Whispering Clemency, is small by the standards of a Tier 0 god and unbothered by it. They tend springs and hollows rather than cities, burn bark incense in the hour the sunlight most resembles his own realm, and ask him mostly for gentle, firm things: fair winters, healed wounds, crops that come in honest. Within the Whisperwood itself, the Bramble-Hooves keep the peace, a league of minotaurs sworn to defend the realm's serenity from anything that would break it, trained to be patient with outsiders right up until patience stops being the answer."] },
        { h: "Aspects", p: ["Aymere rarely wears his true shape in the Material Plane, a towering figure of wood and stone, root-haired, crowned in stone horns, eyeless, carrying the great curved Scythe of Bright Harvest. More often he sends a piece of himself instead.", "*The Whispering Wind*, a form gathered loosely from leaves and dust and moving air, finds the lost and the grieving and offers them a direction rather than an answer.", "*The Stone Titan*, a bull of raw living rock, rises from the earth itself when something threatens nature on a scale no mortal hand could stop, and is gone again the moment the threat is.", "*The Lost Sage*, a green-robed minotaur healer with wooden horns living quietly in some remote wilderness shack, offers shelter and medicine to travelers who have lost their road, and asks for nothing back but their story."] },
        { h: "Divine Realm: The Whisperwood", p: ["Aymere's realm is a warm, humble country in a perpetual state of just-passed rain and first light, populated by archdruids, nature spirits, and his Briar Devas rather than any organized settlement. At its heart sits the Storyvine Bramble, a grove where every inhabitant comes to trade knowledge and stories, and beneath it a gate that opens onto the Temple of Gentle Roots, his primary temple on the Material Plane, which has no fixed location and appears only to those who seek it in good faith.", "The Whisperwood is dangerous in the gentlest possible way. Visitors who stay too long find its peace habit-forming, and more than one mortal has simply forgotten to leave. There is no punishment here for anyone who arrives with fire still in their heart. Most of them just do not feel the need to use it anymore.", "The Temple of Gentle Roots has not been spared every wound. Its inner chambers have been infested for centuries by a corruption bred somewhere in the Undying Accord's long reach, and an Angel, one of Malveth's idealized perfect-corpse creations, now holds those chambers against Aymere himself. He can move the temple. He cannot yet clear it. No other piece of his realm has ever been taken from him, and no other loss sits closer to the single hatred he permits himself."] }
      ],
      facts: [{ label: "Also Known As", text: "The Wise Forest · Stonebark Lord · the Waiting One" }, { label: "Alignment", text: "Neutral Good" }, { label: "Tier", text: "0 — Primary God" }, { label: "Type", text: "Primal (ascended minotaur; the source the Paraprismatics themselves answer to)" }, { label: "Domains", text: "Balance, Nature, Renewal" }, { label: "Portfolio", text: "Balance between civilization and the wild, growth, the healing of what is broken, regulation of the elemental Paraprismatics" }, { label: "Followers", text: "Aymerite" }, { label: "Associations", text: "The Whispering Clemency, the Bramble-Hooves" }, { label: "Weapon", text: "Scythe" }, { label: "Pantheon", text: "Independent. The four Paraprismatic gods answer to him" }, { label: "Divine Realm", text: "The Whisperwood" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Favored" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Favored" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Bark Incense", text: "Prized" }], paras: ["Incense rendered from tree bark, burned in the early hours when the sunlight most resembles the light of the Whisperwood itself. Of every observance kept in his name this is the one Aymere holds above the rest, and the Whispering Clemency burns it daily without fail. A grove tended faithfully for a century pleases him. The incense reaches him."] },
      dmNotes: [] },
    { id: "mortuous", name: "Mortuous", eyebrow: "Lesser God · Celestial",
      img: "/images/mortuous_portrait.png",
      tagline: "War, and the freedom to choose it.",
      lore: "Mortuous is the god of challenge, contest, and honor, patron to any mortal who seeks retribution, glory, or satisfaction through combat. His reach extends well past the battlefield. A soldier on a broken field and a duelist on a strip of raked sand leave the same offering at the same altar, and the god weighs the two of them alike.",
      loreSections: [
        { p: ["Mortuous was once a dragonkin general who challenged the gods themselves, naming them selfish and unworthy of their titles. The old god of war met him on the field and fought him and his whole army to the death. He lost. But the war god had wearied of the role, and the dying general's refusal to break moved him, so he pressed his own domain into Mortuous's hands and stepped down, leaving a mortal to hold what a god had carried.", "Now Mortuous keeps a hand in every war worth the name, and in the quieter work of pulling down ranks that were never earned. That second appetite is why he is worshipped so widely in Pyrra, the colosseum town, where a low-born fighter can climb over a high-born one in a single afternoon."] },
        { h: "Aspect", p: ["Mortuous has almost no appetite for incarnating on the Material Plane, and less still for quarrels with his fellow deities. He watches mortals instead, in perpetual search of entertainment, hoping to turn up warriors worth refining in secret and challenging in the open, and to set them at last against the champions who fight on eternally within his own realm. Those who impress him and survive his challenges are gathered after death into the Warscorched Empire.", "When Mortuous marks a combatant worth the fighting, he sets one of his associates to guide them along the road of glory, and then, at the very summit of their skill, he calls them out. The contest is customarily gladiatorial, staged within one of the countless demiplanes he raises for the purpose. His aspect attends most of them merely to watch. On rare occasions it has stepped down into the sand and answered a challenge itself."] },
        { h: "Divine Realm: The Warscorched Empire", p: ["His hall and his home, and the reward at the end of a worthy life. The warriors who impressed him and beat his challenges are gathered here after death, to fight on without end, sparring and feasting and testing one another for as long as the god finds it worth the watching. To fall well in his sight is to be called up into a better war."] },
        { h: "The Ever-Changing Battlefield", p: ["The other domain, an arena with no fixed shape, where the living are put to the test. It becomes whatever the contest demands: a bridge of black ice, a hall already burning, a strip of raked sand beneath a sky no one recognizes. It is never kind, and it never cheats. You do not find this place. You are challenged into it, or you speak a challenge aloud and a door opens where none stood. The challenge, offered and answered, is the only key."] },
        { h: "The Day of the Sacred Duel", p: ["Once a year comes a day when no challenge may be refused. Any grievance can be carried into a ring and settled by contest, blood or bloodless, and the outcome holds as law. A duel invoked as a Sacred Duel is honored wherever his rites are kept, a matter of standing and honor. In Pyrra the day swallows the streets, a whole city of rings. Elsewhere it might be a single circle of lamplight and a long, quiet line waiting a turn."] }
      ],
      facts: [{ label: "Also Known As", text: "The Shattering Hand · Lord of Broken Order · \"the Challenger\"" }, { label: "Alignment", text: "Chaotic Neutral" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Celestial" }, { label: "Domains", text: "Challenge, War" }, { label: "Portfolio", text: "War, Contests of Skill and Strength" }, { label: "Followers", text: "Mortuites" }, { label: "Associations", text: "The Looming Spears, the League of Shields" }, { label: "Weapon", text: "Lance" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Impartial" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Unrefused Challenge", text: "Prized" }], paras: ["A Mortuite does not decline a fair challenge. Not from the better fighter, not on the worse day, not when the stakes run to ruin. The refusal costs more than the loss ever could, and those who make a habit of declining find that the god who watches for promising warriors has stopped watching them."] },
      dmNotes: [] },
    { id: "solucant", name: "Solucant", eyebrow: "Lesser God · Celestial",
      img: "/images/solucant_portrait.png",
      tagline: "A general keeps his men whole, or he is not worth following.",
      lore: "Solucant is the god commanders pray to before the charge, not after the victory. A captain who kneels to him is not asking to win. He is promising his own soldiers they will be spent well, the line held whole instead of traded cheap for glory, and asking the Dawn General to hold him to it. Solucant rewards the company that stood together over the hero who left it behind. Fair but firm, the old soldiers call him, and mean it as the highest praise they know.",
      loreSections: [
        { p: ["He earned the domain the slow way. In the First Age he led the war against a great evil whose shape the world has since forgotten, and he won it, and upon the ground where the fighting ended he raised Kingsmont with his own soldiers' hands. They crowned him on the field they had cleared together. His bloodline lost its claim to that throne generations ago, and no Solucanite has ever called it a tragedy. He founded a city, not a dynasty, and the city is still standing."] },
        { h: "Manifestation", p: ["Solucant rarely comes down, and when he does it is always to the same shape of moment: a war being fought for the right reasons, going badly, close to breaking. He appears in general's plate at the center of the line, gives one order, and is gone before the field is decided. Survivors argue about his face for the rest of their lives. No one has ever misremembered the order."] },
        { h: "The Solcloaks", p: ["Kingsmont's city watch wears his gold and takes its name from his, though it answers to the city rather than the god. The cloak is one of the highest honors a soldier of Kingsmont can earn, and it is paid for: a Solcloak takes no spouse and sires no children for as long as they serve. Ask a veteran why a god of fellowship demands so lonely a vow and every barracks gives the same answer. The watch is the family. A man with nothing waiting at home holds the wall for everyone else's."] },
        { h: "Divine Realm: The Long Camp", p: ["There is no battle in Solucant's realm, only the night before one. Watchfires stretch farther than any army the Material Plane has ever fielded, tents pitched in orderly rows under a sky that never quite reaches dawn, and every soldier who died well under his banner is here, whole again, sharing a fire with comrades some of them buried centuries apart. There is food, and drink measured honestly, and old songs sung badly by men who never once learned to sing them properly. There is no war in the morning. There has never needed to be. The reward Solucant offers his dead is not more fighting. It is the one night every soldier remembers best, held forever, with none of the dying that used to follow it."] }
      ],
      facts: [{ label: "Also Known As", text: "The Dawn General · Founder of Kingsmont" }, { label: "Alignment", text: "Lawful Good" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Celestial" }, { label: "Domains", text: "Order, Fellowship" }, { label: "Portfolio", text: "Honorable warfare, unity against evil, loyalty earned rather than commanded" }, { label: "Followers", text: "Solucanite" }, { label: "Associations", text: "The Solcloaks" }, { label: "Weapon", text: "Warhammer" }, { label: "Divine Realm", text: "The Long Camp" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Favored" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Prized" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Last Plate", text: "Prized" }], paras: ["A commander eats after every soldier beneath him has eaten, every night, without announcement and without exception. It is a small thing and deliberately so. Solucant has never cared for the officer who makes a performance of humility, only for the one whose men have learned, over years of ordinary evenings, that they will be fed first."] },
      dmNotes: [] },
    { id: "arkinnis", name: "Arkinnis", eyebrow: "Lesser God · Celestial",
      img: "/images/arkinnis_portrait_corrected.png",
      tagline: "Nothing stays hidden in his light. What it finds, it also sentences.",
      lore: "Arkinnis does not forgive, and he does not over-punish either. His light finds exactly what a person has done, weighs it, and hands down a sentence measured to the crime and not a degree hotter. A thief burns from the hand that took. A murderer answers with exactly one life. The guilty find no rage in any of it, no appetite, nothing to plead with, and that is why men fear him past the gods who simply burn: cruelty can be bargained with. Exactness cannot.",
      loreSections: [
        { p: ["He arrives where a wrong has gone unanswered too long, renders the verdict his light already knew, and leaves the ash to explain itself to whoever finds it. He has never stayed to be thanked, and he has never once come back to reconsider. And his light is not the dawn-gold of gentler gods. It burns so absolute that mortal eyes read it as darkness, a black-winged shadow wrapped around a brightness they cannot hold, and many who witness a verdict go to their graves swearing they saw a devil do holy work."] },
        { h: "Manifestation", p: ["When Arkinnis manifests it is brief and blinding, a sentence rather than a battle. The guilty rarely live long enough for it to be called a fight. It is the bystanders who carry it afterward, describing to disbelieving neighbors the six dark wings, the many small burning eyes, and the strange precision of what burned and what stood untouched a hand's width away."] },
        { h: "The Order of Ark", p: ["His paladins swear their lives whole to the hunt: find the wrong, end it, by whatever means the wrong requires, with no mercy held back for the ones who did it. It is a harder oath than the god ever asked of them. Arkinnis judges what stands in front of him and moves on. The Order goes looking. Most of the darker stories that trail behind them originate in precisely that difference, and the Order has never troubled to deny a single one."] },
        { h: "Divine Realm: The Meridian", p: ["Arkinnis keeps a single blade of light standing upright in an endless dark plane, visible, it is said, from any point within it, a vertical line drawn against nothing. There is no court here and no throne, only the light and whatever kneels or stands before it.", "He is not stingy with the place. Where most Celestials guard their realms like a held breath, Arkinnis lets mortals in often, mainly those of the Order who have closed out a great contract in his name, a wrong finally ended after years of hunting it. They stand before the Meridian, and the light does what it always does: it finds them, entirely, the good in the work alongside whatever cost the work extracted. What is sent back is never punished. Those who return from the Meridian come back steadier than they left, filled with a vigor that outlasts the visit by weeks, carrying something that plainly reads as his blessing even to people who have never heard his name. The Order does not treat the invitation lightly. A summons to stand before the light is the only reward Arkinnis has ever been known to give in advance of the next hunt, rather than in judgment of the last one."] }
      ],
      facts: [{ label: "Also Known As", text: "The Burning Verdict · Light That Judges" }, { label: "Alignment", text: "Lawful Neutral" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Celestial" }, { label: "Domains", text: "Light, Judgment, Retribution" }, { label: "Portfolio", text: "Punishment measured exactly to the offense, righteous verdict rendered in burning light" }, { label: "Followers", text: "Arkinnite" }, { label: "Associations", text: "The Order of Ark" }, { label: "Weapon", text: "Greatsword" }, { label: "Divine Realm", text: "The Meridian" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Impartial" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Favored" }, { label: "Acts in Service", text: "Favored" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Witness", text: "Prized" }], paras: ["Whoever sets a sentence in motion stands and watches it land. The Order of Ark holds this absolutely: no knight of theirs orders a punishment they will not remain to see carried out, start to finish, without turning away. Arkinnis does not accept judgment delivered at a comfortable distance. A verdict costs the one who passes it, or it is not a verdict at all."] },
      dmNotes: [] },
    { id: "kyrell", name: "Kyrell", eyebrow: "Lesser God · Celestial",
      img: "/images/kyrell_portrait_corrected.png",
      tagline: "Fate does not get the final word. You do.",
      lore: "Kyrell is prayed to in one specific moment: when nothing goes right, and misfortune ceases to feel like accident and begins to feel like a verdict already handed down. He has no patience whatever for that verdict. Fate, in his creed, is a suggestion offered by something never owed the final say in the first place, and he answers quickest for those already certain they have lost.",
      loreSections: [
        { p: ["He wants no court and keeps none. Where Solucant commands and Arkinnis judges, Kyrell arrives, wherever a person has been made property or taught their ending was decided for them, and breaks the one thing holding it in place. Every chain he has ever broken hangs on him still, draped over a frame too long and too thin to be mistaken for a man. They hang there as the record: nothing he has freed is forgotten.", "He is also the only Celestial who keeps no divine realm at all, and it is a choice, not a lack. A god who owns ground can be found on it, and the Divine Curtain grips hardest the gods with something to hold. Kyrell owns nothing, so the Curtain has less of him to hold, and he walks nearer the mortal world than any god of his tier has a right to. The cost is the same one Invidiva pays in her darker corner of the cosmos: a god without a realm who falls has nowhere to reform quickly. Kyrell considers the trade obvious. Chains, he teaches, come in more shapes than iron."] },
        { h: "Manifestation", p: ["Kyrell rarely comes as himself. His hand shows first in small deniable mercies: a lock that gives without being picked, a manacle that parts a link early, a door left open by a guard who could never say why. When he does come in person it is pale and silver, the double-bladed spear held level as a scale, and it means the chain that called him has already been weighed and found illegitimate."] }
      ],
      facts: [{ label: "Also Known As", text: "Breaker of Chains" }, { label: "Alignment", text: "Chaotic Good" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Celestial" }, { label: "Domains", text: "Freedom, Liberty" }, { label: "Portfolio", text: "Liberation from bondage, defiance of a fate stacked against you, agency for the low-standing" }, { label: "Followers", text: "Kyrellite" }, { label: "Associations", text: "None of note — those he answers are usually alone when they call" }, { label: "Weapon", text: "Double-bladed spear" }, { label: "Divine Realm", text: "None. Kyrell owns nothing, holds nothing, and keeps no ground" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Impartial" }, { label: "Routine Prayer", text: "Favored" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Torn Ledger", text: "Prized" }], paras: ["A debt is bought at full price and destroyed in front of the one who owed it. The destruction is the point, and it is done where the debtor can see, because Kyrell holds that a bond quietly forgiven still teaches a person they were once owned. The paper has to come apart in their sight."] },
      dmNotes: [] },
    { id: "broxigar", name: "Broxigar", eyebrow: "Lesser God · Unholy",
      img: "/images/broxigar_portrait.png",
      tagline: "Everything worth hunting in the old world, he already had. So he went looking for more.",
      lore: "Broxigar hunted the old world empty. Every great beast his homeland had to offer he took, one after another, across a span of years longer than any Orc has lived since, until the day arrived when nothing remaining there could test him. Most hunters would have called that a life well spent and put the bow down. Broxigar crossed into a new world instead, chasing rumor of bigger game, and in the Age of Beasts he found exactly what he was looking for.",
      loreSections: [
        { p: ["Loglandia was thick with dragons then, more than the old sagas admit, and Broxigar hunted them the way he had hunted everything else. He killed enough that the rest fled the Material Plane entirely, crossing into Vaelrath rather than face him, and the dragons who remained behind, the ones he never got to, are the thin, rare bloodline the world still calls dragons today. He wore every kill afterward. His armor is dragon scale head to foot, and no two plates match, because no two dragons matched, and a hunter who has actually done the killing does not need to say so twice.", "Past the dragons he found something worse. The sagas disagree on what it was, only that it came from a place with no sky, and that Broxigar killed it the same as everything else and took its bones for a bow, because a hunter who has never once set a kill down was not about to start with that one. The bow served him well. It also fed on him, patient in the way he had spent a lifetime teaching himself to be, until the runes he had carved into it in triumph began glowing on their own, a color no forge in either world had ever made. By the end, no priest of his own people would have called him wholly Celestial. Broxigar never seemed to notice the change, or never once let on that he had.", "He died on a foraging trip, of all things, poisoned by a berry any child of the old world could have named on sight. That bow could feel a devil three valleys off and had never once warned him about a berry at his own feet. That was the exact shape of what the taint had made him: total mastery over anything large enough to be worth a hunt, and no instinct left at all for anything small enough to kill him anyway. The old sagas call it a joke the world played on its greatest hunter. The truer read is colder. He had spent so long becoming a weapon against giants that he had nothing left over to notice the size of a berry."] },
        { h: "Manifestation", p: ["Broxigar rarely shows himself, and when he does it is never to help. He appears at the edge of a fight nobody sane would have picked, something huge and starving and far too strong for whoever is about to face it, and he watches, the runes on his bow burning a low, wrong red in the dark. He has never once intervened. Hunters who have seen him standing at the treeline during their worst fight cannot agree on whether it was a blessing or a warning, and Broxigar has never clarified. Some of them won anyway. Those are the only ones who ever see him twice."] },
        { h: "Divine Realm: The Unfinished Ground", p: ["Broxigar's realm is a hunting ground that was never allowed to end. Every beast he had marked but not yet killed when the berry took him still runs here, ancient and enormous and endlessly pursued, through forest and plain and mountain pass that shift to match whatever the hunt demands. Broxigar hunts here forever, patient in a way he never had to be in life, closing on quarry he will never quite catch, because the realm remembers the exact moment his life ended and has never once moved past it."] }
      ],
      facts: [{ label: "Also Known As", text: "The Old Hunter · Last Great Kill" }, { label: "Alignment", text: "True Neutral" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Unholy (an ascended Orc, once Celestial, slowly corrupted)" }, { label: "Domains", text: "Hunting, Survival" }, { label: "Portfolio", text: "Foraging, wilderness survival, giant-slaying, overcoming impossible odds" }, { label: "Followers", text: "Broxigarite" }, { label: "Associations", text: "None of note — he hunted alone in life and is prayed to alone" }, { label: "Weapon", text: "Bow" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Impartial" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Dragon Slain", text: "Prized" }], paras: ["There is one rite and it is the whole of the faith. Kill a dragon. No substitution has ever been accepted, no lesser beast has ever counted, and the vast majority of those who follow the Old Hunter will go into the ground having never performed it. Broxigar was never a god who made worship convenient."] },
      dmNotes: [] },
    { id: "meirlach", name: "Meirlach", eyebrow: "Lesser God · Celestial",
      img: "/images/meirlach_portrait.png",
      tagline: "All things hold equal weight. Only the blade teaches a mortal how little of that weight he can actually see.",
      lore: "Meirlach lost his elven parents to war young and trained himself to the staff and the blade out of necessity before he ever trained for mastery. He served a decade under a monk called the Hand of Cobalt Feathers, in the quiet inland reaches of Tenkyra far from Shirokane's forges, learning more than swordwork from him. The monk ended that service with a challenge duel, beat him soundly, and banished him from his teaching with one instruction: come back when you have found the balance your soul is missing.",
      loreSections: [
        { p: ["Meirlach never found it beneath anyone else's roof. He drifted from lord to lord as a vassal, restless in every post, pursuing fights of escalating ferocity whenever boredom and hedonism together proved insufficient to fill the gap the monk had named. His reputation eventually outran his usefulness, and no lord in that part of Tenkyra would take him on. He left for Shirokane and the wider isles as a sellsword instead, trying to outrun a name that had already outrun him."] },
        { h: "Asami's Passage", p: ["In Shirokane he met Asami Kojirō, a half-elven duelist as famous for her beauty as her blade, and the two crossed paths again and again, sometimes allied, more often opposed, each meeting sharpening them both. Neither ever pressed a fight to its true end. Each took a turn losing on purpose, out of a respect neither had a name for yet.", "When Asami finally asked him for a real defeat, meant to kill the public fascination with her that she had grown to hate, Meirlach refused to give it to her plainly. He staged her death instead, a victory built on trickery that let her legacy die clean while she walked away from it whole, and let his own reputation swell on the lie. It was the kindest thing either of them ever did for the other, and neither called it that at the time.", "Alone again, Meirlach spent his savings visiting the graves and shrines of famous swordsmen, chasing lessons secondhand. It was here he met Kyuubi, a sword saint carrying nine tails earned entirely through the blade. Tails have never actually measured magic alone. They measure a life spent mastering one thing further than anyone else manages, and it only looks like an arcane rule because nearly every Kitsune who ever pushes that far happens to have chosen magic to push into. Kyuubi chose the sword instead, and carries the same proof on her back that any archmage would. Most of her own kind have never met a nine-tail who was not a wizard. Few have ever thought to ask why that should be the rule rather than just the habit. She taught Meirlach to carry the lessons of the swordsmen he studied as living things rather than stories, and called that carrying the true meaning of a sword saint. He still had not found what the Hand of Cobalt Feathers once told him he was missing. He was beginning to fear he never would."] },
        { h: "The Final Duel", p: ["Meirlach's full elven blood bought him centuries. Asami's half-elven blood bought her far less, and in her last years she called him to a secluded valley to settle what a lifetime of surrendered fights never had: a true duel, to the death, before her skill could fade with her age. He accepted.", "Two days of combat passed before either of them noticed the sun had moved. By the end it was no longer a fight between two people so much as a fight against the outer edge of what either of them could be. Asami gave her life into it willingly, goading him past the last of his own restraint until he answered her with everything he had. She died glad to have lost to it. In the same breath that ended her, Meirlach saw past every illusion a mortal life had ever handed him, understood at last what the monk had meant by balance, and stepped into godhood without ever meaning to seek it.", "He raised a shrine to her where she fell, left both his swords standing in the earth before it as an offering he never came back for, and built his hidden temple from what was left of his old life. Temper and Patience stood at that shrine long enough for the offering to be forgotten as anything but a rumor, and both blades are lost to the world now, wherever pilgrims, thieves, or time eventually carried them."] },
        { h: "Divine Realm: The Hidden Temple", p: ["Meirlach's realm sits inside Vaelrath itself, tucked into a stillness the resident dragons have never challenged. Most of them fled there generations ago to escape Broxigar's hunt, wary of anything that might threaten the peace they had finally found. A mortal who wanted nothing from them, asked for nothing, and radiated nothing but perfect stillness was never worth the trouble of removing. Over time a few came to watch him teach out of curiosity more than caution, and the temple's name followed from there. He trains a small, ever-changing handful of students within it, chosen for readiness rather than birth, and the Fairdragon Temple in the Material Plane serves as the only door in."] }
      ],
      facts: [{ label: "Also Known As", text: "The Dragon Master · Lord of the Hidden Temple · the True Sword Saint" }, { label: "Alignment", text: "True Neutral" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Celestial (an ascended elf; unlike most of his kind, granted by no other god)" }, { label: "Domains", text: "Blade, Growth, Rivalry" }, { label: "Portfolio", text: "Self-improvement, swordsmanship, purity of action" }, { label: "Followers", text: "Meirlachite" }, { label: "Associations", text: "The Fairdragon Temple" }, { label: "Weapon", text: "Temper and Patience, a matched katana and wakizashi, both lost" }, { label: "Pantheon", text: "Independent. His apotheosis owes nothing to any other god or plane" }, { label: "Divine Realm", text: "A hidden temple within Vaelrath" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Impartial" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Blade Set Down", text: "Prized" }], paras: ["A master lays aside the weapon he has perfected and takes up one he has not, beginning again as a novice with decades already behind him. Meirlach holds equal regard for the treatment of rivals: an opponent of near or matching skill is to be honored, named, and remembered, because the rival is the only teacher who tells the truth every time."] },
      dmNotes: [] },
    { id: "ivsil", name: "Ivsil", eyebrow: "Lesser God · Primal",
      img: "/images/ivsil_portrait.png",
      tagline: "The worst fear of any traveler.",
      lore: "A beast among gods, feared by travelers and mountain-goers alike. Ivsil, the Steel Talon and the Blood Wind, most commonly takes the form of a gigantic bird of prey that would put most dragons to shame, adorned with crimson feathers and a crown of horns. They are the embodiment of storms, of thunder, of elemental air itself, and the least reasonable of all the Paraprismatic deities.",
      loreSections: [
        { p: ["As with their fellow Paraprismatic gods, Ivsil ensures that air elementals remain in or return to their plane of origin. Beyond that single duty they are among the most unforgiving gods alive. They dwell within the very nature of the storm, and they set themselves against any creature that would presume to temper the power of natural disaster, a prerogative Ivsil holds reserved for itself alone.", "They are worshiped most by birdfolk and the races who live in the sky, and by many dragons of the Material Plane, who revere them as the ultimate predator in their domain."] },
        { h: "The Paraprismatic Deities", p: ["Ivsil is akin to a wild animal that lashes out at anything that comes within reach. Ivsil was leashed by Aymere, the god of balance, long ago, who punished its impulsive behavior repeatedly until it learned patterns beneficial to that relationship: to watch over and regulate air elementals moving between planes, and to keep its wrath mostly to its own Realm. However, when Ivsil falls into the Material Plane its wrath goes uncontained, and it unleashes its destructive power on an unsuspecting world."] },
        { h: "The Temple of Blistering Wind", p: ["Of the faiths organized in Ivsil's name, none mean well for the world. Ivsil's only true clergy, the Temple of Blistering Wind, are responsible for repeatedly trying to open a path from the Elemental Plane of Air and Ivsil's Divine Realm to the Material Plane, hoping to unleash it time and time again, aiming to reduce the world to a beaten and barren wasteland to reclaim. Their goal is apocalyptic, and Ivsil stands as the prince who would deliver the gruesome, ill-conceived end they seek."] },
        { h: "Divine Realm: The Suspenterria", p: ["The Divine Realm of Ivsil is a living disaster. Mountainous landmasses, the ruins of cities, and great tracts of blasted terrain hang suspended between a lattice of tornados, the whole of it enclosed within a perpetual hurricane. The Realm is the accumulated wreckage of everything Ivsil has ever destroyed, and so treasure and wealth lie scattered through it in abundance, available to anyone willing to accept the risk of encountering the god itself, which exercises no discretion whatever concerning what moves within its own borders.", "There is one massive tornado at the eye of the storm that seems to swirl and shift in slow motion as a result of its tremendous scale, and this is an embodiment of Ivsil's power given form. It swirls around a spire of stone and crystal where Ivsil roosts and keeps the few items it considers to be of interest or value, and is known as the Heart Nest.", "Little else of worth survives within the Suspenterria, a place ruinous and dangerous even to those elementals who ought by rights to find themselves at home in it. The landscape retains a single beauty: beams of eternal moonlight breaking through the storm canopy to illuminate that devastated country in a soft and forgiving light, which betrays its true nature entirely."] }
      ],
      facts: [{ label: "Also Known As", text: "The Feathered Storm · the Steel Talon · the Blood Wind" }, { label: "Alignment", text: "Neutral Evil" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Primal (a paramental)" }, { label: "Domains", text: "Elemental, Air, Tempest" }, { label: "Portfolio", text: "Wind, storms, thunder, elemental air, natural disaster" }, { label: "Followers", text: "Ivsians" }, { label: "Associations", text: "The Temple of Blistering Wind" }, { label: "Weapon", text: "Scimitar" }, { label: "Pantheon", text: "The Paraprismatic Deities (Air; Fire, Water, and Earth below)" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Favored" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Favored" }, { label: "Acts in Service", text: "Impartial" }, { label: "Acts in Accordance", text: "Welcome" }, { label: "The Toppling", text: "Prized" }], paras: ["Something great and standing is brought down. A tower, a span, a hall raised to outlast weather. The Temple of Blistering Wind teaches that every structure built to defy the sky is an insult standing upright, and that the faithful who pull one down have simply done the work the storm was coming to do anyway."] },
      dmNotes: [] },
    { id: "burtromet", name: "Burtromet", eyebrow: "Lesser God · Primal",
      img: "/images/burtromet_portrait.png",
      tagline: "An obsessive craftsman with the whole world for a testing ground.",
      lore: "Burtromet is the Duke of Armories, the Red Hammer, and the Divine Kilnkeeper. They are obsessed with weapons of war, and endlessly hammer out new engines of destruction within the Apex Forge, the colossal volcano that serves as their divine realm. Like their fellow Paraprismatic deities, they regulate the passage of elementals, specifically fire elementals, between the Elemental Plane of Fire and the other planes, primarily the Material.",
      loreSections: [
        { p: ["Burtromet is a craftsman before all else, and neither innately evil nor innately destructive. They labor, however, under a fixation with the testing of their inventions, and under an appetite for the abundant materials of other planes. They seek the Material Plane in particular for its varied environments, where they can stress test the engines of war they build against real conditions."] },
        { h: "The Order of Slamming Hammers", p: ["A confederation of mercenaries, craftsmen, and smiths laboring in Burtromet's honor. The Order is religious in the strictest sense and reads as nothing of the kind, resembling an extended guild far more closely than any clergy. They cultivate passages to the Elemental Plane of Fire, where the Order maintains a small concealed settlement dedicated to their god, and they range widely after rare materials and artifacts, either to present to Burtromet outright or to forge into weapons worthy of his hand. Their works are neither good nor evil in intent, driven instead by an insatiable appetite for progress."] },
        { h: "Divine Realm: The Apex Forge", p: ["The Apex Forge is a grand volcano within the Elemental Plane of Fire itself, which, depending on who you ask, is both where all of the realm's magma flows from and where it pools. The caldera itself is a workshop of colossal proportion, where the elemental giant Burtromet labors without rest at new weapons and new machines. Its inhabitants are those few capable of enduring unyielding heat and pressure: fire primordia, djinn, domesticated red dragons, fire elementals, salamanders, and other creatures like them."] },
        { h: "Manifestation: The Living Eruption", p: ["When Burtromet steps onto the Material Plane the world answers with explosive intent. Volcanoes erupt, the earth quakes, and every source of water for miles around begins to seethe and evaporate into rolling clouds of steam. Burtromet has no great love for being on the Material Plane, and often answers it with rage and destructive fervor. It is commonly believed that Mt. Karna, the largest volcano in the known world, was the site of their first emergence there.", "Like the other paramentals, Burtromet is a force of nature rather than a former mortal, and so rarely manifests, and takes no champions, unless something exceptional calls for it."] }
      ],
      facts: [{ label: "Also Known As", text: "The Charred Titan · Duke of Armories · the Red Hammer · the Divine Kilnkeeper" }, { label: "Alignment", text: "Chaotic Neutral" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Primal (a paramental)" }, { label: "Domains", text: "Elemental, Fire, Forge" }, { label: "Portfolio", text: "Elemental fire, insatiability, creation of weapons" }, { label: "Followers", text: "Burtrolites" }, { label: "Associations", text: "The Order of Slamming Hammers" }, { label: "Weapon", text: "Hammer" }, { label: "Pantheon", text: "The Paraprismatic Deities (Fire; Air above, Water and Earth below)" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Prized" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Given Masterwork", text: "Prized" }], paras: ["The finest thing a smith makes is given away rather than sold, and given only to someone judged worthy of carrying it. Burtromet cares nothing for the price a piece fetches and everything for the hands it ends in. A masterwork sold to a fool is a wasted fire."] },
      dmNotes: [] },
    { id: "hightrankul", name: "Hightrankul", eyebrow: "Lesser God · Unholy",
      img: "/images/hightrankul_portrait.png",
      tagline: "Wherever men desire without cause, the Pale Word endures.",
      lore: "Hightrankul's origins are unknown, which befits a god of secret societies and subterfuge. Why they should be so consumed by commerce, by blackmail, by the patient accumulation of influence, has never once been established, yet these are the appetites that move the Pale Word. Their physical form is invariably a wholly shrouded figure, robed in regal blue after the fashion of the aristocracy. No one has heard their voice. They communicate only through telepathy, borrowing the voices of others.",
      loreSections: [
        { p: ["This secretive god embodies the quiet, grasping avarice of mortals. They endure for precisely as long as men desire without cause, which is to say they will never be fully cut from the world. Hightrankul works to encourage greed in the hearts of men and to profit from it, since every debt owed only deepens their own hold on the cosmos."] },
        { h: "Spirit Network", p: ["The Pale Word is closely bound to spirits, over whom they hold considerable sway. Many who die while still owing Hightrankul a debt refuse to move on, and become spirits themselves, bound by what they owed, their debt now paid out in service. Through this network of the unquiet dead, Hightrankul keeps eyes and ears in places no living agent could reach."] },
        { h: "The Pool of Silver Strands", p: ["Hightrankul turns influence itself into divine power, through a great pool within their realm where the bound essence of the indebted gathers and swells. This pool of pale, silver-blue energy connects to them directly, and manifests most often as the many phantasmal arms that surround Hightrankul to act and to guard, each one a mark of someone who has been bent to the Pale Word's will."] },
        { h: "Divine Realm: Del Trust", p: ["The Divine Realm of Hightrankul lies below Vel Cadavien, the dead city of Malveth, the Undying Count. It can be reached through secret passages from the city above, the forest that surrounds it, or a warren of underground tunnels. The city exists in total secrecy, threaded with hidden passages and shifting means of travel between them, connecting structures and hollows built for purposes no outsider is meant to learn. Only Hightrankul and their Wordless Masters are said to navigate it without becoming lost.", "In its architecture it resembles nothing so much as a cosmic thieves' den. The outer passages are choked with traps, false turnings, and deliberate misdirection, while the inner chambers house Hightrankul and their petitioners. The whole of it is as twisted as Hightrankul themselves, its architecture shifting at the god's whim. At its lowest level lies a vast, luminous pool of bound souls, the wellspring of Hightrankul's power."] }
      ],
      facts: [{ label: "Also Known As", text: "The Pale Word" }, { label: "Alignment", text: "Lawful Evil" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Unholy" }, { label: "Domains", text: "Coercion, Greed" }, { label: "Portfolio", text: "Blackmail and Extortion, Subterfuge, Unlawful Trade" }, { label: "Followers", text: "Highans, the Wordless" }, { label: "Associations", text: "The Blackseal Order" }, { label: "Weapon", text: "Shortsword" }, { label: "Pantheon", text: "Unaffiliated (fitting, for a god of secret societies)" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Impartial" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Prized" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Kept Ledger", text: "Prized" }], paras: ["Every favor done is written down, and nothing written down is ever forgiven. The faithful keep their ledgers meticulously and across generations, since a debt inherited is a debt still owed. Hightrankul asks for no prayers. He asks only that nothing be released."] },
      dmNotes: [] },
    { id: "ilsrabae", name: "Ilsrabae", eyebrow: "Lesser God · Primal",
      img: "/images/ilsrabae_portrait.png",
      tagline: "Anything lost to the sea belongs to her now.",
      lore: "Ilsrabae is a covetous, ruthless entity who goes by the titles of the Deep Witch, the Sunken Hoard, and the Writhing Mass. She appears either as a beautiful blue-skinned bride adorned with fine scales, or as a horrifying mass of tentacles and muscle the size of a skyscraper, dwarfing even the krakens of the deep. This massive body belies her cunning and treachery: Ilsrabae is a collector of all things that catch her eye, and she holds a strong love for secrets and forbidden knowledge.",
      loreSections: [
        { p: ["Like her fellow Paraprismatic deities, Ilsrabae oversees the regulation of water elementals crossing planar borders, and beyond that single obligation she is simply and entirely a hoarder of wealth and property. In her Divine Realm she keeps an underground deep-sea fortress where she stores treasure, people, and knowledge plundered from sea-farers. It is said that anything lost to the seas sinks to her Black Drain, never to be seen again. Unlike her fellow Paraprismatics, Ilsrabae never crosses into the Material Plane in person. She has no need to. Her will reaches the surface through her worship alone."] },
        { h: "The Temple of Currents", p: ["The Temple of Currents is the one order that worships Ilsrabae directly, composed largely of primordia, merfolk, and assorted aquatic peoples. They know exactly what she is. Their rituals and their tributes exist to appease her, and to forestall the several varieties of oceanic disaster that follow from her anger, or worse, from her boredom. The order often seeks out tomes of knowledge and ancient treasures to sacrifice to her.", "Surface worshippers rarely know the Temple exists, and would not recognize their goddess in it if they did. They do not keep a separate faith of their own. Instead, they honor Ilsrabae as one face of the wider Pantheon of the Sea, a kind and enduring protector who grants safe passage over the water. Her seaside shrines are treated as a refuge for the lost and the abused, and she is held up as a symbol of feminine strength, as enduring as the ocean itself. Few who light a candle at one of those shrines would believe it was lit for the same being the Temple of Currents labors to keep calm."] },
        { h: "Divine Realm: The Black Drain", p: ["The Black Drain is the deepest underwater trench of the Elemental Plane of Water, and serves as Ilsrabae's realm. It is easy to stumble into, for those who dive too deep into the plane's seemingly infinite ocean. Within its reach, itself as vast as a small sea, sea beasts grow larger and more powerful, and elemental forces twist together with other forms of life. At its depths, the Black Drain houses Ilsrabae's pitch-black lair, where she hoards ships, treasure, and secrets.", "The waters of that trench lie calm and still in one hour and erupt in the next into a lethal churn of whirlpools and deep-sea tectonic violence. Krakens nest here, serving both as watchdogs to keep invaders from their goddess and as jailors to seal in whatever she steals and hoards. Near her lair lies a ship graveyard, built from the carcasses of vessels she has torn down from the surface.", "The deepest pits of the Drain are the remains of an ancient island city, which sank into the ocean during a cataclysmic disaster. Many believe its people once tried to bind hundreds of water elementals into a single being to guard them, and inadvertently created Ilsrabae herself. The truth of that ending, and of her origin, is known to no one but the goddess. She keeps it as her own most guarded secret."] }
      ],
      facts: [{ label: "Also Known As", text: "The Deep Empress · the Deep Witch · the Sunken Hoard · the Writhing Mass" }, { label: "Alignment", text: "Lawful Evil" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Primal (a paramental)" }, { label: "Domains", text: "Elemental, Ocean, Water" }, { label: "Portfolio", text: "Elemental water, loss, dark secrets" }, { label: "Followers", text: "Ilsrabite, Ilsrallan" }, { label: "Associations", text: "The Deepsea Clergy, the Temple of Currents" }, { label: "Weapon", text: "Trident" }, { label: "Pantheon", text: "The Paraprismatic Deities (Water; Air and Fire above, Earth below)" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Prized" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Favored" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Welcome" }, { label: "The Sinking", text: "Prized" }], paras: ["Something precious is dropped into water too deep to recover it. Not the most valuable thing owned, which she considers a merchant's gesture, but something whose loss is genuinely felt. The Deep Empress collects what the world lets fall, and she can tell the difference between a tribute and an expense."] },
      dmNotes: [] },
    { id: "kai-foschunn", name: "Kai Foschunn", eyebrow: "Lesser God · Aberrant",
      tagline: "Balance is a debt. Give as much as you take.",
      lore: "Kai Foschunn keeps the accounts that nature itself is owed. Every good pulled from the sea is a debt entered against the one who took it, and Foschunn is what remembers whether the debt is ever answered: the net cast without cruelty, the reef left standing, the whale released before the last cut. They call it balance. Sailors who have crossed them call it karma with teeth.",
      loreSections: [
        { p: ["Most gods hold a domain and remain within it. Foschunn does not. Wherever power tips too far in one direction, wherever a thing is taken and nothing rendered back, they turn up, however far inland the trouble happens to sit from open water. They rarely act with their own hand. A merchant who cheats one customer too many finds his scales suddenly honest, his silver suddenly light, his luck suddenly gone, and never sees the god who arranged it. Foschunn works through whoever is already standing in the room.", "What Foschunn actually is, no cleric will tell you, because no cleric knows. They come as a Kua Hono elder, a haggling sea elf, or a fish too large to be anything but a god wearing scales, and every shape carries the same detail: an expression a shade too foolish for whoever is underneath it. Deep Custodian is the title cut into temple stone. Merchant of the Sea is the one people actually use, usually with a laugh, right up until the joke costs them everything they took unfairly."] },
        { h: "The Temple of Fair Tides", p: ["The temple is the closest thing Foschunn keeps to a church, and even that is loose. It has no high seat and no single home, just shrines scattered along the Kua Hono coastline wherever a Fosian keeps one, usually a stone scale worn smooth by hand and salt. Foshull do not preach so much as watch. A fair trade, a promise kept, a poacher reported before the reef gave out: that is the whole of the practice. The god notices. The ledger updates itself."] },
        { h: "Manifestation", p: ["Foschunn rarely bothers appearing as themselves. When they do, it means every mortal hand they might have used has already failed, or the imbalance has grown too large for quiet correction. The sea empties out first, gone flat and glassy for longer than any tide should hold, and then the god surfaces: not the fish, not the elf, but something vast enough that both were always costumes. Those who have seen it describe a shape too large for the eye to hold complete, more scale and current than creature, indifferent to whether you understand what you are looking at. It never lasts long. Whatever needed correcting usually is."] },
        { h: "Divine Realm: Ninefathom Market", p: ["Foschunn carved out a corner of the Elemental Plane of Water and filled it with junk. Ninefathom Market is a bazaar strung across nine sunken fathoms of stall after stall, built entirely from what the tide gave up: masts turned into rafters, hull planking for counters, a ship's bell hung at every corner that rings itself when a bad deal closes nearby. Currents serve as the streets. Drowned lanterns from a hundred different wrecks light the whole sprawl in mismatched colors, so no two stalls glow quite the same shade of gold.", "Nothing is ever sold there for what it is worth, and that is the entire point. A pearl might buy you a rusted hook. A rusted hook might buy you a favor worth a kingdom. The prices are Foschunn's ledger made physical, and the god mans a counter somewhere in the sprawl personally, in whichever disguise suits the day, weighing out debts nobody else can see. Petitioners who find their way in rarely leave with what they came for. They usually leave owing something instead, and somehow feel they got the better end of it."] }
      ],
      facts: [{ label: "Also Known As", text: "The Merchant of the Sea · Deep Custodian" }, { label: "Alignment", text: "Lawful Good" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Aberrant" }, { label: "Domains", text: "Balance, Ocean" }, { label: "Portfolio", text: "Ocean, natural balance, karmic justice" }, { label: "Followers", text: "Foshull, Fosian" }, { label: "Associations", text: "The Temple of Fair Tides" }, { label: "Weapon", text: "Hooked Halberd" }, { label: "Pantheon", text: "None — acts independently of organized worship" }, { label: "Divine Realm", text: "Ninefathom Market, within the Elemental Plane of Water" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Favored" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Return", text: "Prized" }], paras: ["Nothing is taken without something given back. A catch answered with a net mended for someone else, a profit answered with a debt quietly cleared, a meal answered with a meal. The Temple of Fair Tides keeps no schedule for this and demands no proof. The ledger is understood to keep itself."] },
      dmNotes: [] },
    { id: "vaeloria", name: "Vaeloria", eyebrow: "Lesser God · Celestial",
      img: "/images/vaeloria_portrait.jpg",
      tagline: "The dark is only frightening until you know which light is watching it.",
      lore: "Vaeloria was born Leporin, in a warren like any other along the green hills that hold the Golden Leyline. The stories disagree on what threatened her home. Some say war, some say a bad season, some say only the ordinary fear of a warren too far from the mountain shrine to feel safe at night. What every telling agrees upon is what she did about it: she walked out under the full weight of all three moons and asked them to watch her people the way she could not alone, every night, forever. Kelis, Ysoldra, and Maluth answered by making her the one who watches instead.",
      loreSections: [
        { p: ["Where the Moon Elves climb the peaks to read what the three moons have to say, Vaeloria is the reason there is anything written there to be read. She keeps their phases turning, chases back what would eclipse them before its time, and carries the light down herself to whoever is too lost, too far, or too small to make the climb to the Triune Spire. A Moon Elf seer and a Leporin traveler out past curfew are asking the same sky for help. Only one of them gets an answer delivered to their door.", "She appears most often as a plain white rabbit, sitting where a frightened traveler will notice her and no one else will. When the moment calls for more than that, she takes the shape of a Leporin or an elvish woman with long rabbit ears, silver-haired and soft-spoken, a scythe of moonlight traded for a longbow the length of her own arm. Her clergy call her mothering. They mean it as the highest compliment they have."] },
        { h: "The Order of the Moon", p: ["Her clergy keep no mountain temple. Their shrines are dug low into hillsides the way any Leporin burrow is dug, lit by a single hanging moonstone that never goes dark. A Vaelorite tends the light, keeps the door open past curfew, and walks anyone who knocks the rest of the way home. The Order of the Moon carries her rites out to warrens too small to keep a shrine of their own, but even its robed clergy will tell you the real church is whichever door was left unlocked for somebody lost."] },
        { h: "The Spire and the Moongazers", p: ["The Triune Spire keeps her rites. The Moon Elf seers read the three moons the way their clans have since before Vaeloria's warren existed, and when a young Leporin goddess rose into the very sky they read, the Spire's answer was not rivalry but recognition: the one figure outside their own blood their tradition bows to, the keeper of the lights their whole art depends on.", "Her presence there has a shape. The Moongazers are her clergy at the Spire, drawn from every race that climbs, Leporin and human and a good share of Moon Elves among them, tending her rites alongside the temple's own. They are not seers and do not pretend to be. The reading of the moons stays with the Moon Elf seers, as it always has; the Moongazers keep the goddess's observances, mind her shrines on the switchbacks, and see that the pilgrims who come up the mountain for an answer make it back down with one. Two orders on one peak, one reading the sky and one keeping faith with what tends it, and neither doing the other's work.", "Most Moon Elves live nowhere near the Spire, holding their peaks and clan temples all across Loglandia, and her standing among those clans runs the whole range from devotion to a respectful nod. It is the Spire that made it formal. The rest of the mountains are still deciding how far to follow."] },
        { h: "Divine Realm: The Moonwarren", p: ["Vaeloria did what any Leporin does with a new home. She dug.", "The Moonwarren is a burrow tunneled through the dark between the Three Moons themselves, its passages opening onto all three: a den in pale Kelis, a long gallery under violet Ysoldra, a sealed deep-room in red Maluth that even her guides do not enter. Between them run miles of soft-lit tunnel, warm as any hillside warren and impossibly larger inside than the sky it threads through, walls set with moonstone the way a mortal burrow is set with lamps. From its mouths she watches every road at once.", "Souls do not settle there, and she does not keep a court. The Moonwarren houses exactly what a warren should: the goddess, her guides, and room for a guest. The lost who die under open sky are sometimes granted a night in its tunnels before the Boatman comes for them, one warm burrow on the way to the Sea of Souls, and the Order teaches that this is the whole realm's purpose. Every warren needs a door left open. Hers opens onto the night itself."] },
        { h: "Manifestation", p: ["Vaeloria rarely leaves the moons to come down herself, and when she does it is never for long: a white rabbit crossing a road ahead of a traveler about to take the wrong turn, there and then gone before anyone can be sure they saw it. Guides sent by her are more common than the goddess in person, the little lucky signs that turn a lost mortal's feet toward home. But on the rare night all three moons hang full and aligned, she is known to walk the roads herself, white-furred and silver-eyed, and any traveler who crosses her that night is guaranteed safe passage until dawn, whatever else is hunting them."] }
      ],
      facts: [{ label: "Also Known As", text: "The Moon Rabbit · Keeper of the Three" }, { label: "Alignment", text: "Lawful Good" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Celestial (an ascended Leporin)" }, { label: "Domains", text: "Light, Moon, Protection" }, { label: "Portfolio", text: "The Three Moons, the night sky, guiding the lost" }, { label: "Followers", text: "Vaelorite, Moongazer" }, { label: "Associations", text: "The Order of the Moon" }, { label: "Weapon", text: "The Moonlop" }, { label: "Pantheon", text: "Independent — formally recognized at the Triune Spire, no pantheon of her own" }, { label: "Divine Realm", text: "The Moonwarren, dug through the dark between the Three Moons" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Favored" }, { label: "Domain Magic", text: "Favored" }, { label: "Acts in Service", text: "Prized" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Crossroad Stone", text: "Prized" }], paras: ["A moonstone is left at a crossroads for whoever passes next and needs it. The stone is not marked, and the leaver does not wait to see it taken. Every Vaelorite carries at least one, and the Order of the Moon teaches that a road with a stone on it is a road somebody has already prayed over."] },
      dmNotes: [] },
    { id: "tithiss", name: "Tithiss", eyebrow: "Lesser God · Primal",
      img: "/images/tithiss_portrait.jpg",
      tagline: "Mother to everything that grows.",
      lore: "Tithiss appears as a dryad queen of tremendous power and greater size, her body composed of wood and living plant matter and capable of twisting and reshaping itself entirely at her discretion. She commonly stands some twelve feet in height, one great and powerful arm set against a smaller, ordinary one. When she wishes to display her power, she can rise as a titanic form of coiling bark and roots that stands above most cities. Tithiss is habitually kind and encourages the growth of living things, and yet, if disturbed or invoked without due respect, she proves as feral as any of her Paraprismatic brethren.",
      loreSections: [
        { p: ["Tithiss is charged by Aymere, the god of balance, to regulate the movement of earth elementals between planes, which she does attentively. Within her own Realm, she cares for the unique life that takes root there, and occasionally attempts to steal and cultivate natural curiosities from the Material Plane, which now and then leads to conflict with it. She gives much of her time to guiding druids, petal knights, and paladins who would protect the natural world."] },
        { h: "The Woodmother's Grove", p: ["A circle of druids answering directly to Tithiss, permitted to pass between the Material Plane and her own at will, her Realm opening freely before them. They number only a handful of archdruids, and they guard the sanctity of natural life. Where Aymere represents the healthy balance between civilization and nature, Tithiss and her followers care for the primacy of nature and wildlife. Among their numbers are many petal knights, who can commonly trace their power to Tithiss's appraisal of their epithets."] },
        { h: "Divine Realm: The Untamed Garden", p: ["The Woodmother's Realm is a deep and splendid forest within the Elemental Plane of Earth, a place where life surges forward without restraint. It is thought to sit at a nexus between the Plane of Earth and the Plane of Positive Energy, where the cancerous growth of the latter drives uninhibited flourishing in the former. The forest is filled with ancient, robust trees, hidden fields of unique flowers and fauna, and plantlife both elemental and material. It is said that within this hive of life and guided mutation, the plants, trees, and elementals mimic the shapes of life from outside, guided by the hand of fey who also make their home here, sometimes living out faux lives resembling humanoids, as though the garden was playing a game with itself.", "This forest is ever-shifting, and is known to be an extension of Tithiss's body and heart. Some believe the garden itself is her full corporeal form. Within it stands a singular unbridled oak called the Sephirot Oak, whose roots stretch through the entire forest and beyond, into the Elemental Plane of Earth. Its roots and trunk are so massive that colonies of fey, animals, and insects make their homes within it, and tunnels run all through it. Like the Apples of Aymere, the Sephirot Oak carries supernatural qualities: weapons and armor forged from its bark can stave off magical forces, its blades weep a corrosive sap, and fruit plucked from it has replenishing effects.", "From the roots and trunk of the Sephirot, golden rivers of sap flow, carrying life-giving power that encourages the growth of all things within the Garden. Tithiss most often resides within the Sephirot Oak itself, merging with her Realm and regulating it through the great tree, drawing from its sap and blessing it in turn."] }
      ],
      facts: [{ label: "Also Known As", text: "The Seedraiser · the Woodmother" }, { label: "Alignment", text: "Neutral Good" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Primal (a paramental)" }, { label: "Domains", text: "Earth, Elemental, Plant" }, { label: "Portfolio", text: "Elemental earth, nature, harmony" }, { label: "Followers", text: "Titheans" }, { label: "Associations", text: "The Woodmother's Grove" }, { label: "Weapon", text: "Club or Quarterstaff" }, { label: "Pantheon", text: "The Paraprismatic Deities (Earth; Air, Fire, and Water above)" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Favored" }, { label: "Acts in Service", text: "Favored" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Three Givings", text: "Prized" }], paras: ["Three observances, kept together or not counted at all: a portion of worked land released back to the wild and never touched again, seed scattered where no harvest will follow it, and something tended that will not flower within the tender's lifetime. The Woodmother's Grove holds that any one of the three alone is merely good practice. All three together is worship."] },
      dmNotes: [] },
    { id: "the-boatman", name: "The Boatman", eyebrow: "Lesser God · Unholy",
      img: "/images/boatman_portrait.png",
      tagline: "Everyone meets him, and no one fears him, which is the rarest thing that can be said of a death.",
      lore: "You die, and your soul slips into the Sea of Souls, and out of the mist comes a narrow black boat and the man who poles it. He knows where you belong. Some souls go to the god who made them, some to the god they chose in life, some back into the wide grey water to begin again, and the Boatman reads which is which off you like a name off a manifest and takes you there. He does not judge and he does not linger. He simply sees each soul home. When a mortal prays for a clean passing, this is who they are praying to, and he is the one power in the whole business of dying that answers kindly and asks nothing back.",
      loreSections: [
        { p: ["He is the child of Lachrymar, and the world knows it. He does openly and kindly the mercy his mother was caged for trying to perfect, and there is no secret in it. The old water still sings a little when his oar dips, the same tune that once loosened souls from their pain, and a soul crossing with him rides easier for it. What the world does not know is the shape of the choice he lives with. His mother is a caged endgame of the world, and he is the one being who might reach her. Whether he ever would, and what it would cost the living if he did, is the quiet horror folded inside the gentlest god anyone prays to."] },
        { h: "Manifestation", p: ["He comes at the moment of death and only then, one soul at a time, and he cannot be commanded, bribed, or hurried. Resurrection is the one thing that offends him, because it is a soul torn back off his boat mid-crossing, and the tear is what scars the returned. He allows it. He does not forgive it."] }
      ],
      facts: [{ label: "Also Known As", text: "The Ferryman · Son of Lachrymar" }, { label: "Alignment", text: "Neutral Good" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Primal (son of Lachrymar, of her same order)" }, { label: "Domains", text: "Death (passage), Grace, the Sea of Souls" }, { label: "Portfolio", text: "The crossing, safe passage, the guided dead" }, { label: "Associations", text: "Kept by nearly every faith, owned by none" }, { label: "Weapon", text: "The ferryman's pole" }, { label: "Divine Realm", text: "The Sea of Souls (no fixed seat; he travels its whole expanse)" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Favored" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Impartial" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Fare", text: "Prized" }], paras: ["Coin or bread is laid with a body before it goes into the ground. He has never required it and has never once refused a soul who arrived without it, which is precisely why nearly every faith in the world keeps the custom anyway. Magic that drags a soul back off his boat is the one offering he will not take."] },
      dmNotes: [] },
    { id: "lussuria", name: "Lussuria", eyebrow: "Lesser God · Fey",
      img: "/images/lussuria_portrait.png",
      tagline: "Half of one god, and the half that was always going to be loved more.",
      lore: "Lussuria was not born. She was cut. A single archfey, covetous of divine power and enthralled by the vices that bind mortals, struck a bargain with an archdevil and underwent a ceremony to bind itself to the domains it craved. The rite took, at a price. What came out of it was part devil, and split down the middle of its own appetites into two goddesses who are two halves of one whole. Lussuria received the wanting. Her sister received the resenting.",
      loreSections: [
        { p: ["She appears as a scandalous harlot wearing the shape of a succubus, and draws mortals into her service upon the promise of pleasure and the sating of every want they happen to carry. She is patron to brothels and to those who work in them, and she keeps her favorites the way a collector keeps anything rare."] },
        { h: "Aspect", p: ["Lussuria rarely bothers to incarnate past the divine curtain. Instead she wears her followers, riding a devoted mortal as her mouthpiece. Those permitted to serve as her avatar, and steady enough in the mind to survive the ride, take the title of Delicate Panderess (or Panderer, though the role seldom falls to a man), and stand as the leaders of the brothels, circles, and small orders that answer to her. To be worn by Lussuria is counted the highest love she can show.", "On the Material Plane she hunts for devotees fine enough to keep. Her worshippers all chase the same ladder: gather wealth and tribute in her name, earn a place among the pets she keeps in her realm to live on forever in her harem, or rise to Delicate Panderess and hold real power over the rest. Lussuria favors mortals of high station, the better to reach through them into the affairs of others. Her Celestial Brothel works without rest to win the favor of the powerful and draw them into its thrall, and she will strike a contract as readily as any devil, trading health, a place in her realm, or worldly success for service rendered."] },
        { h: "The Sisters", p: ["The two can barely stand to share the work, though they are the same god. Lussuria delights in tempting her sister, knowing full well that Invidiva means to swallow her whole, and takes a particular pleasure in being the half everyone wants. Every scheme Invidiva has ever turned over to bind her has ended the same way. Lussuria has never once had to fight for the position. That, more than anything else, is what her sister cannot forgive."] }
      ],
      facts: [{ label: "Also Known As", text: "The Enthralling Twin · Mistress of the Celestial Brothel" }, { label: "Alignment", text: "Chaotic Neutral" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Fey" }, { label: "Domains", text: "Lust" }, { label: "Portfolio", text: "Sex, lust, indulgence, the sating of every want a mortal carries" }, { label: "Followers", text: "Luddites, Lusedans" }, { label: "Associations", text: "The Celestial Brothel" }, { label: "Weapon", text: "Glaive" }, { label: "Divine Realm", text: "The Glade of Forbidden Pleasures, in the Fey Realm" }, { label: "Twin", text: "Invidiva the Grasping, cut from the same god. See her entry." }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Welcome" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Favored" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Given Night", text: "Prized" }, { label: "The Masked Rite", text: "Prized" }], paras: ["Two observances, and both are performed with the body. The Given Night is a night spent wholly on another's pleasure with nothing asked in return, which Lussuria counts as the purer of the two precisely because it costs the giver something. The Masked Rite is her congregation proper: names, rank, and face surrendered at the door, worship conducted as bodies only, no one present knowing whose hands they are in. Much of her faith is kept quietly. Half the great houses of the world would deny her in daylight, and her temples keep private registers listing exactly who came in the dark."] },
      dmNotes: [] },
    { id: "invidiva", name: "Invidiva", eyebrow: "Lesser God · Fey",
      img: "/images/invidiva_portrait.png",
      tagline: "The other half, and the one that never stopped counting what it was owed.",
      lore: "Invidiva is the older hunger. Before the archdevil's ceremony divided one archfey into two goddesses, it was covetousness that drove the entire enterprise, an appetite for what belonged to gods and a refusal to accept that any of it lay out of reach. Lussuria inherited the appetite. Invidiva inherited the grievance, and the grievance has had no floor under it since.",
      loreSections: [
        { p: ["She wants whatever belongs to someone else. She resents her twin above all things and works ceaselessly against her to take what is hers. Invidiva whispers to those who already eye another's property and promises to put the taking within reach. She is patron to thieves, bandits, and blood-slick assassins, and her clearest work on the Material Plane is the Red Manor, a network that accepts the jobs too grisly and too vicious for even the Family's Tailors. She savors the moment a mortal crosses their own last line and reaches for the thing they always swore they never would."] },
        { h: "Aspect", p: ["Like her sister she sometimes incarnates by wearing the ablest of her order. But Invidiva can push her aspect through the divine curtain more freely than most gods, on a loophole in her own godhood. Where every other god needs a divine realm, she has none. Her essence hangs instead from her sister's realm, the Glade of Forbidden Pleasures, and because she holds no ground and casts no planar weight, the curtain never gets a full grip on her. The cost sits on the other side of it: destroy her aspect and she is slow to build another, slower than any god with a realm to reform from. For a seat of her own she keeps a stronghold in the Realm of Shadow, laid out to mirror the Glade she is locked out of owning."] },
        { h: "The Sisters", p: ["What Invidiva wants, under all of it, is to rob her sister down to nothing. Her Red Manor raids the Celestial Brothel again and again, killing its people and carrying off its wealth, while Invidiva turns over every scheme that might bind Lussuria long enough to swallow her whole and stand at last as a single, undivided god. Every attempt so far has ended the same way, with Invidiva humiliated and her sister entertained."] }
      ],
      facts: [{ label: "Also Known As", text: "The Enthralling Twin · Mistress of the Red Manor" }, { label: "Alignment", text: "Chaotic Neutral" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Fey" }, { label: "Domains", text: "Envy" }, { label: "Portfolio", text: "Desire, envy, covetousness, the taking of what belongs to another" }, { label: "Followers", text: "Vidites, Envidites" }, { label: "Associations", text: "The Red Manor" }, { label: "Weapon", text: "Bladed Chain" }, { label: "Divine Realm", text: "None. Her essence hangs from her sister's Glade, and that absence is her weapon" }, { label: "Twin", text: "Lussuria the Temptress, cut from the same god. See her entry." }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Impartial" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Favored" }, { label: "Acts in Service", text: "Favored" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Claiming", text: "Prized" }], paras: ["A rival's lover is taken and then shown off, and the display is the whole of the offering. Invidiva has no interest in a theft nobody notices. The wanting has to be answered publicly, in front of the person it was taken from, because the injury done in the taking is worth more to her than the thing taken. Her faith runs quietest among those with the most to lose by it, and the Red Manor's best clients are people who would never say her name aloud."] },
      dmNotes: [] },
    { id: "orbuis", name: "Orbuis", eyebrow: "Dark God · Unholy",
      img: "/images/orbuis_orb.png",
      tagline: "Older than most gods, and remembered by none of them.",
      lore: "Orbuis is not his name. It is only what mortals call the thing inside the orb, because a thing must be called something, and no one alive remembers what he was called before.",
      loreSections: [
        { p: ["Almost nothing of him survives. He is a demon old enough to have been worshipped in an age with no witnesses left to it, and whatever he was then, someone found it worth the trouble of erasing rather than killing. No text names him. No ruin bears his mark. The orb itself, a small prismatic sphere that fits in an open hand, is the only proof he ever existed at all, and the world does not know what it is holding.", "Those few who have carried the orb do not speak of a monster. They speak of a voice, patient in the way only ancient things can be, and good at sounding like the holder's own thoughts. It does not often lie. It has found the truth to be more corrosive."] }
      ],
      facts: [{ label: "Also Known As", text: "The Thing in the Orb · the Nameless · the Unspoken" }, { label: "Alignment", text: "Neutral Evil" }, { label: "Tier", text: "2 — Dark God" }, { label: "Type", text: "Unholy" }, { label: "Domains", text: "unknown" }, { label: "Portfolio", text: "unknown" }, { label: "Followers", text: "none living" }, { label: "Associations", text: "none" }, { label: "Weapon", text: "none" }, { label: "Pantheon", text: "None. No pantheon has ever claimed him." }],
      worship: null,
      dmNotes: [] },
    { id: "malveth", name: "Malveth", eyebrow: "Dark God · Unholy",
      img: "/images/malveth_portrait.png",
      tagline: "Neither dead nor alive, by his own design.",
      lore: "He will not let you call him dead. Look closely and every sign agrees that he is: no breath, no pulse, a stillness a living body cannot hold. Say so to his face and you will not get to say much else. Malveth crossed out of life and refused to look the part, and the vanity of that refusal is the truest thing about him.",
      loreSections: [
        { p: ["In life he was a dark-elf lord who found aging beneath his dignity and a lich's rot beneath contempt. He wanted the perfect exit, neither dead nor alive, and he was patient and brilliant enough to find it. He studied the caged Gravelord for a lifetime and more, chased the whispers off the Tree of Unlife all the way to the Penumbral Isles, and did what no zealot before him managed: he reached Morosyn's speared body and cut part of it loose. The god stirred. Malveth ascended in the backwash of that waking, the one student who passed. He carries a Grimoire of Unlife, his own lesser copy of the Zoanic Therimoire, and everything he makes with it is a beautiful forgery of a god's work.", "He hates living flesh and adores the look of it, so his court is a gallery of the perfected dead. His Angels are his masterpieces, stitched and reworked until they pass for flawless nobility, and he keeps them close as consorts and advisors and proof. His stronghold city of Vel Cadavien sits half-sunk in a crevice of Megiddo under a moon that runs poison-green or bone-white by his mood, its inner streets kept for his court and its outer ruin left to mindless dead that serve as guard dogs. It is vast, and it is almost empty, because a city of the perfect dead does not need crowds.", "He is not the Gravelord and never will be. Morosyn rewrites what a soul is into something alien and correct. Malveth can only copy the surface, the bodies, the elegance, never the void behind the book. He knows it. It is the wound under the vanity, and it is why he wants the seal broken and the master risen: not to serve, but to finally be taught the one thing he could not steal."] },
        { h: "Manifestation", p: ["Malveth's advantage over his own gods is simple. The Triad is caged and he is not. He walks the Material Plane in person, courtly and unhurried, the bone scythe he forged in mockery of Nuradhuin's carried like a scepter, raising his idealized dead one exquisite corpse at a time and pulling every string he can reach toward the Tree of Unlife, because the day Morosyn's heart comes off the spear is the day the Undying Count graduates."] }
      ],
      facts: [{ label: "Also Known As", text: "The Perfect Corpse · Lord of the Court of Decay" }, { label: "Alignment", text: "Lawful Evil" }, { label: "Tier", text: "2 — Dark God" }, { label: "Type", text: "Unholy (ascended dark-elf lord; undeath as corruption rather than nature)" }, { label: "Domains", text: "Undeath, Blight, Vanity" }, { label: "Portfolio", text: "Idealized undeath, rot, desiccation, the perfect corpse" }, { label: "Associations", text: "The Court of Decay; his Angels" }, { label: "Weapon", text: "A bone-and-onyx scythe, forged in imitation of Nuradhuin's" }, { label: "Divine Realm", text: "Vel Cadavien, in Megiddo" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Favored" }, { label: "Routine Prayer", text: "Welcome" }, { label: "Domain Magic", text: "Prized" }, { label: "Acts in Service", text: "Favored" }, { label: "Acts in Accordance", text: "Favored" }, { label: "The Refusal", text: "Prized" }], paras: ["A death is not mourned. It is treated as an error awaiting correction, the body kept, tended, and spoken to as though the matter remains open. The Court of Decay considers grief an admission of defeat, and the households that keep his rites hold funerals for no one."] },
      dmNotes: [] },
    { id: "scorn", name: "Scorn", eyebrow: "Dark God · Unholy",
      img: "/images/scorn_portrait.jpg",
      tagline: "Life has no point but to struggle and be destroyed. Scorn only helps it along.",
      lore: "Where Malveth is vanity dressed as perfection, and Hightrankul is silent and surgical, Scorn is loud about it. The god of Pain and Suffering sees no purpose in life except the struggle and the ending of it, and pursues both with something close to joy. It is not stupid. When the moment calls for it, Scorn can be eloquent, even charming, and the charm is real enough to work. It is also always a mask, worn only until the mask stops being useful.",
      loreSections: [
        { p: ["Scorn never meant to have a following, and never meant to become a god at all. What changed that was simpler than any plan: it began hearing the secret, violent thoughts every mortal carries somewhere, and found in that a door. It cares little for obedience. Encouraging a stranger's worst impulse amuses it more than commanding one ever could. Where most gods hold their power whole from the very moment of ascension, Scorn passed a long age as a caged animal in Megiddo before it learned the use of what it had become, and its reach widened slowly in consequence. But violence lives in every mortal heart in a world already full of fiends and gods and war, and slow or not, Scorn became one more thing that world could never fully be rid of."] },
        { h: "Divine Origins", p: ["The stories agree on a shape, if not every detail. Scorn was an Orc once, in a time old enough that no one now can date it, a warrior who killed so many that his own skin stayed permanently dyed red with the blood of it. Pride, or madness, or the two together, led him to challenge Mortuous directly, in the manner desperate warriors attempt even now. He gave the war god real trouble before the end. It was not enough. Mortuous struck him with the full weight of a god's arm, and the blow did not just kill him. It threw him clean through the planes and into Megiddo.", "He should have died there. He refused to. Megiddo does not forgive that kind of refusal gently, and what came out the other side of his stay was no longer entirely an Orc. When his own tribe finally tracked him down, hoping to bring him home or at least bury him, he hunted every one of them through the plane that had remade him, and found he liked it. That hunt is where the Domains of Pain and Suffering first answered him, and the lands he ran his kin down across became the Divine Realm he still keeps."] },
        { h: "The First Age War", p: ["Centuries later, an unnamed lich found a way to reach him in Megiddo and pointed him at Solucant's army in the First Age's great war. Scorn did not need much convincing. A war was exactly the kind of struggle he existed to end violently, and he threw himself into it as a weapon that mostly served its own appetite rather than anyone's strategy. Solucant's line held, with Aymere's minotaurs beside it, and between them they drove the beast back through whatever door the lich had opened and shut it behind him. Nobody living remembers Scorn's name in connection with that war. What they remember, dimly, is only that something monstrous was thrown at them and did not come again."] },
        { h: "The Withering Order and the Sect of the Stained", p: ["Neither group worships Scorn the way a temple worships a kinder god. The Withering Order gathers where violence has already broken out and makes sure it does not stop early, quiet hands feeding wars that would otherwise burn down to embers. The Sect of the Stained is smaller and closer to the god himself, killers who take a measure of him into their own skin, literally, in dye and old scarring, and who understand better than most that Scorn does not care whether they live or die doing it. Both serve him best merely by continuing to exist. He asks remarkably little else of them."] },
        { h: "Divine Realm: The Gutted Fields", p: ["The Gutted Fields sit somewhere in the bloody dark of Megiddo, a stretch of open killing ground with no walls and no gate, because Scorn has never needed to keep anything in or anyone out. The plane remembers every hunt that has ever crossed it. Bones surface out of the ground in wet seasons and sink again when it dries. What passes for weather there is Scorn's own mood made physical, calm some days and a red downpour on others, and anything that wanders in during the second kind rarely wanders back out."] }
      ],
      facts: [{ label: "Also Known As", text: "The Viceking · The Blood-Dyed" }, { label: "Alignment", text: "Chaotic Evil" }, { label: "Tier", text: "2 — Dark God" }, { label: "Type", text: "Unholy (an ascended Orc, twisted by Megiddo)" }, { label: "Domains", text: "Pain, Suffering" }, { label: "Portfolio", text: "Inflicted suffering, violent impulse, wanton destruction" }, { label: "Followers", text: "Scorite, Scoral" }, { label: "Associations", text: "The Withering Order, the Sect of the Stained" }, { label: "Weapon", text: "Maul" }, { label: "Pantheon", text: "None" }, { label: "Divine Realm", text: "The Gutted Fields, within Megiddo" }],
      worship: { meta: [{ label: "Ritual and Sacrifice", text: "Impartial" }, { label: "Routine Prayer", text: "Impartial" }, { label: "Domain Magic", text: "Welcome" }, { label: "Acts in Service", text: "Welcome" }, { label: "Acts in Accordance", text: "Prized" }, { label: "The Continued Blow", text: "Prized" }, { label: "The Fed Fire", text: "Prized" }], paras: ["Two rites, and neither requires an altar. The first is violence carried past the point where it had already finished its work. The second is a conflict fed rather than settled, a quarrel kept breathing by the Withering Order long after both sides would have laid it down. Scorn never asked for temples. He asked that nothing be allowed to end early."] },
      dmNotes: [] },
    { id: "trickster-god", name: "The Trickster", eyebrow: "Planned · Fey", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Fey" }, { label: "Domains", text: "Trickery, Mischief, Change" }],
      dmNotes: ["Existing hook: the Changeling race struck their bargain with a Trickster God to sever their fox heritage. This is almost certainly him."] },
    { id: "envoy-god", name: "The Envoy", eyebrow: "Planned · Fey", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Fey" }, { label: "Domains", text: "Travel, Messages, Thresholds" }],
      dmNotes: ["Deliberate mirror to the Boatman: one carries souls across, one carries words."] },
    { id: "north-god", name: "The God of the North", eyebrow: "Planned · Primal", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "1 — Lesser God" }, { label: "Type", text: "Primal" }, { label: "Domains", text: "Ice, Winter, Stillness" }] },
    { id: "lana", name: "Lana", eyebrow: "Planned · Undecided", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Named in canon, entry unwritten" }, { label: "Tier", text: "Undecided" }, { label: "Type", text: "Undecided" }, { label: "Domains", text: "Luck, Fortune" }],
      dmNotes: ["Connects directly to the Golden Leyline and the Domain of Fortune, and to Leporin luck-debt."] },
    { id: "arcane-god", name: "The God of the Arcane", eyebrow: "Planned · Undecided", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "Undecided" }, { label: "Type", text: "Undecided" }, { label: "Domains", text: "Magic, Leyric, Leymancy" }] },
    { id: "sun-god", name: "The God of the Sun", eyebrow: "Planned · Celestial", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "Undecided" }, { label: "Type", text: "Likely Celestial" }, { label: "Domains", text: "Sun, Day, Dawn" }] },
    { id: "knowledge-god", name: "The God of Knowledge", eyebrow: "Planned · Undecided", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "Undecided" }, { label: "Type", text: "Undecided" }, { label: "Domains", text: "Knowledge, Learning, Record" }] },
    { id: "hearth-god", name: "The God of the Hearth", eyebrow: "Planned · Undecided", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "Undecided" }, { label: "Type", text: "Undecided" }, { label: "Domains", text: "Love, Family, Home" }] },
    { id: "trade-god", name: "The God of Honest Trade", eyebrow: "Planned · Undecided", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "Undecided" }, { label: "Type", text: "Undecided" }, { label: "Domains", text: "Craft, Commerce, Fair Dealing" }] },
    { id: "harvest-god", name: "The God of the Harvest", eyebrow: "Planned · Primal", planned: true, working: true,
      tagline: "",
      lore: "",
      facts: [{ label: "Status", text: "Concept only, unnamed" }, { label: "Tier", text: "Undecided" }, { label: "Type", text: "Likely Primal" }, { label: "Domains", text: "Harvest, Agriculture, Plenty" }] },
  ],

  regions: [
    { id: "karmundir", name: "Kar-Mundir", eyebrow: "Location · The Underground", tagline: "The world's market beneath the world.",
      lore: "The capital of the deep is Kar-Mundir, the world's market beneath the world. Every road beneath Loglandia runs to it eventually, and so does a river: a surface torrent pours off the lip of a chasm high above and falls the whole way down in one white column, the Shirvan Falls, filling the city with mist, lamplit rainbows, and a roar the residents stop hearing their first year. Under the spray, everything is for sale. The honest markets run the terraces by the falls, silk and steel and grain from every land with a tunnel; the other markets run behind them, in the lanes the lamps skip, and the city has never seen much point pretending otherwise. The council of the houses sits here, the falls at its back, and takes the city's cut coming and going. If it is traded anywhere, it passes through Kar-Mundir. Go down, if your road allows. Everyone goes down in the end." },
    { id: "vassilissia", name: "Vassilissia", eyebrow: "Location · Plane",
      tagline: "The Forest of Everlasting Isolation.",
      lore: "Endless misty woods make up the majority of this plane, known also as the Forest of Everlasting Isolation. This is a realm abundant in nature, almost exclusively in plants one would expect to find in a dreary forest. A light mist hangs over everything, obscuring most creatures' vision beyond 30 feet or so. Some mountains and valleys carve out the landscape, usually due to the manipulation of inhabitants exerting their will on the environment. Otherwise, the eternal bark of trees and gentle sound of wind passing through leaves is the most constant companion one can expect to find. Even the temperature here is mild, so much so that it feels as if there is no such thing as cold or hot.",
      loreSections: [
        { p: ["Among the silent trees and hollow clearings of Vassilissia are slow, patient creatures such as giants, minotaurs, living trees and plants, and entities that embody living earth. Most creatures that live here wish to live in semi-permanent states of meditation, taking advantage of the realm's soothing silence to find serenity. At first glance it may seem to be a realm that drains energy from its inhabitants and visitors, but it is in fact the opposite: a plane that leaves its visitors with only their own thoughts and energy, forcing them to face themselves in dire silence."] },
        { h: "Dreary Horrors", p: ["This plane is loosely tied to the Realm of Shadow and the Fey Realm, and occasionally there is overlap between the three: Vassilissia is a neutral point between the natures of the other two, representing silence without suffocation and life without over-abundance. Thanks to this connection, sometimes fairies and fey-like life can appear in Vassilissia, as can the withered horrors of the Realm of Shadow. When they wander here they are colored by the plane's nature, however, and move in a lazy doldrum that can render them more or less dangerous. Some archfey in the Fey Realm intentionally create gates that lead here so they can contemplate without the nature of their own realm heightening their senses."] },
        { h: "Silent Dangers", p: ["The dangers of Vassilissia to outsiders are connected to how easy it is to become lost within it. The mists swallow up sound and light, so anyone who becomes separated from their allies or wanders from their intended path risks being lost completely, stuck in the disorienting nature of the mists. Spirits also live within the mists: psychic elemental spirits that project likenesses of thoughts, fears and expectations that creatures carry with them. They are largely playful in nature, but also have no concept of mortality or age; when they lure visitors into the mists with their illusions they do not intend harm, but inadvertently welcome creatures to their doom nonetheless.", "The living woods of this realm also detest violence or the destruction of nature. Evocation magic that produces harmful effects is smothered here, reducing its effect by a substantial amount. If widespread destruction occurs, the woods themselves are prone to retaliation, shifting the land and burying threats within trees or the earth to suppress them. There is no malice in this defense, only a desire to protect the silence.", "Because the psychic energy lingering in this plane can give shape to one's mental demons, sometimes the illusions of Vassilissia take on a life of their own. Fairy tale monsters, urban legends and other mild horrors that rest in obscurity may come to life here, and with enough time or influence invade other realms. This almost always results in abominations that resemble constructs of the mortal mind, and can even sometimes resemble alien life."] },
        { h: "Divine Realm: The Whisperwood", p: ["Within Vassilissia sits the divine realm of [[aymere|Aymere]], the Wise Forest, who remains there in eternal contemplation. This woodland valley has less mist than the plane it rests within, and its borders can be discovered by looking for beams of sunlight breaking through the mists and granting gentle illumination. This permanent, soft sunlight gives this realm the feeling of a brisk morning after a night of rain, sustained across all time. At the center of the Whisperwood is a great grove where many druids spend their afterlife in congregation, and this serves as the entrance to Aymere's earthbound Temple of Gentle Roots."] }
      ] },
    { id: "elemental-air", name: "Elemental Plane of Air", eyebrow: "Location · Elemental Plane",
      tagline: "Mostly empty space, strong gales, and wind tunnels.",
      lore: "The Elemental Plane of Air is mostly empty space with strong gales and wind tunnels moving through it. Most of the sky above the Elemental Planes is under the influence of this plane.",
      loreSections: [
        { h: "Landscape Aloft", p: ["In this massive, empty realm, huge landmasses resembling floating mountains exist, thinly spread within wind tunnels and currents that connect them. Minerals that react to the plane's natural energy cause these areas to float, as each landmass typically contains several massive crystal deposits responsible for this phenomenon. These mountain realms contain vast ecosystems including forests, tunnels, lakes, and more."] },
        { h: "Earthly Overlap", p: ["The few grounded landmasses in the Elemental Plane of Air are not technically a part of it: they are massive mountains from the planes connected to it. In particular, they almost all rise up from the Plane of Earth, breaking the cloudtops and emerging in this realm."] },
        { h: "Chaotic Weather", p: ["The Plane of Air is unpredictable, both in terms of sudden shifts in weather and in terms of its appearance: a calm-looking sky may in fact have torrential winds, but the lack of matter to see their effects on makes discerning the strength of them difficult."] },
        { h: "The Celestine Star", p: ["The most massive of the landmasses in the Plane of Air is an ancient weathered stronghold called the Celestine Star, built around the largest of the mineral deposits keeping landmasses afloat. This city-sized stronghold is built into a series of peaks, valleys, and mountains where djinn, Plumari, primordia, and other aerially gifted species live. There are collective communities that exist together, but also many areas where isolated individuals exist on their own. Near its center is a proper city, built around the gemstone keeping it afloat, and airship technology is used here to protect this singular bastion of civilization in the Plane of Air.", "Feathered Guardians. The Celestine Star is protected by several feathered dragons who serve as its quiet guardians. They assume humanoid forms to disguise themselves when not tending to their duties, but appear when they are needed. Among their ranks are a white and a silver feathered dragon, each of whom keeps the other in check.", "Whimsical Lord. The paramental who guides this city is addressed as its Skylord Precedent. They are currently a powerful djinn whose heart is bound to the city's central gemstone, said to embody a hurricane. Their reign is uncontested, as there is a belief that their death would cause the gemstone to break and the city to collapse. They rule their people with a selfish but fair hand, demanding treasures and tributes in the form of statues, art, and worship, but ultimately caring for those who stay in line."] },
        { h: "Divine Realm: The Suspenterria", p: ["The Suspenterria is the divine realm of [[ivsil|Ivsil]], the Feathered Storm. Suspended blasted landmasses and city-ruins, along with plundered treasure, hang inside a perpetual hurricane. At its eye, a giant slow-turning tornado is Ivsil's power given physical form, swirling around a stone-and-crystal spire, the Heart Nest, where Ivsil roosts. The realm is lit by eternal moonbeams."] }
      ] },
    { id: "elemental-fire", name: "Elemental Plane of Fire", eyebrow: "Location · Elemental Plane",
      tagline: "An unforgiving landscape of fire, lava, and molten rock.",
      lore: "The Plane of Fire is as one would expect: an unforgiving landscape of fire, lava, and molten rock. It is defined by its magma ocean that covers much of the plane, which laps upon obsidian shores and is fed by eternally oozing volcanoes that put those of the Material Plane to shame. There are fields of ash, stone, and rubble that are traversable, but the intense heat and hostile environment of the plane make it the single most hostile one to visitors from outside, and it is home to many residents who mean harm to all: red dragons, fire elementals, and more.",
      loreSections: [
        { h: "Unstable Landmass", p: ["The land in this place is constantly shifting and changing, as though the flow of magma below ground were preventing it from settling. Volcanoes shift and travel, the ocean splits and pools, and paths once discovered may no longer exist soon after."] },
        { h: "Tribal Population", p: ["Upon its surface, many fire-resistant tribes such as primordia, tinderbine, Dragonkin, and more wage war for the little useful land, made possible only when the other Elemental Planes temper the land and form oases, making it a world of perpetual conflict and war."] },
        { h: "Volcanic Gates", p: ["The most common natural gates to the Elemental Plane of Fire exist within the underground magma pools of Mt. Karna, the desert volcano and site of Burtromet's first emergence on the Material Plane, and also within the caldera of active (or recently active) volcanoes. They are not guaranteed to appear, but many who have fallen into lakes of magma or a volcano's maw have found themselves awakening within the Plane of Fire, for better or worse."] },
        { h: "The Brass Metropolis", p: ["Floating above the hostile lands below is the most impressive, well-known city of the Elemental Planes: the Brass Metropolis. This risen island in the sky is carried in a massive disc-like bowl of brass and gold, maintained by internal engines and rituals where powerful elementals are used to burn valuable materials and power it.", "Grand Mercantile Spectacle. The city itself is ancient and impressive. It is ruled by efreeti, fiends, primordia, and fire elementals. It is fueled eternally by trade and perceived value: its most influential residents are ruthless merchants, slave-owners, smiths, and inventors who can amass wealth and influence through their wares. Here, individuals are a product, and no sale is off limits. This is the only Elemental City that actively reaches out to the Material Plane with primordia agents, who offer their exclusive materials and services in exchange for various boons and payments.", "The Sunheart Engine. The paramental of this city is a volcanic overlord, a fire elemental of overwhelming power, contained within a molten sphere connected to the engines and circuits of the city. They burn eternally, powered by the same mechanisms that grant it flight, and speak through their efreeti and primordia servants who tend to them like a god. Serving below them are the highest-standing efreeti, who belong to a dynasty that has suffered many rebellions and coups. Politically, they are its true rulers, and the paramental at its core remains complacent so long as it can feed on the city's perpetual generation of energy."] },
        { h: "Divine Realm: The Apex Forge", p: ["The Apex Forge is a grand volcano within the Elemental Plane of Fire itself, which, depending on who you ask, is both where all of the realm's magma flows from and where it pools. The caldera of the volcano is a massive workshop where the elemental giant [[burtromet|Burtromet]] works tirelessly, forging new weapons and machines. Its inhabitants are those capable of withstanding unyielding heat and pressure: fire primordia, djinn, domesticated red dragons, fire elementals, and other creatures like them.", "It is commonly believed that Mt. Karna, the largest volcano in the known world, was the site of Burtromet's first emergence on the Material Plane."] }
      ] },
    { id: "elemental-water", name: "Elemental Plane of Water", eyebrow: "Location · Elemental Plane",
      tagline: "A vast ocean dotted with islands where various cultures live and sustain themselves.",
      lore: "The Elemental Plane of Water is a vast ocean dotted with islands where various cultures live and sustain themselves. The majority of its space is the sea, which borders directly with the Elemental Planes of Earth and Fire in any place their shores give way to its brisk emerald waters.",
      loreSections: [
        { h: "World Temper", p: ["The plane's weather is temperamental and unfair, shifting between calm sailing and sudden whirlpools, storms, and tsunamis. The waters are home to krakens, sea beasts, dragons of the ocean, and fantastic undiscovered ocean life not known outside this glorious plane. Where it touches the Plane of Positive Energy, beautiful reefs and rich sea life flourish. Where it touches the Negative Plane, dead zones sap life away and black inky tides smother life."] },
        { h: "Seafarers & Strongholds", p: ["The plane is home to merfolk, primordia, and Kua Hono who make the best of the vast oceans, and its islands are populated by races who have found themselves lost or sequestered here. Many ambitious spellcasters, gods, and supernatural forces create submerged fortresses in bubbles of air in this plane, knowing that they are unlikely to be discovered or bothered here, as the hostile beasts of the sea can act as a natural defense."] },
        { h: "Chaos and Meditation", p: ["The Elemental Plane of Water holds a special spiritual place in the cosmos: to many, its calm, shifting waters have a profound meaning, and represent the volatility of mankind. It is a realm that is both peaceful and eternal, but also erosive and enraged."] },
        { h: "The Atlicanarium", p: ["The Atlicanarium is a rich, robust kingdom contained within alternating bubbles of air suspended in crystal domes, and submerged areas for those who do not breathe air. It is weathered but beautiful, and the ocean offers wildlife to it as though extending a helping hand to protect it. Leviathans and sea dragons protect it and use the surrounding area as their lairs, and it serves as a hub for vessels that can travel the seas.", "Protective Wards. The Atlicanarium, mostly populated by primordia and merfolk, is wary of allowing outsiders to enter, and is driven by tradition. They want for little, care greatly for hunting and gathering for their people, and know that in this covetous plane, greed and material wealth are all but worthless. They live to appease the sea, and its embodiment [[ilsrabae|Ilsrabae]], fearing that her wrath may one day plunge their city into the blackest depths of the plane, the Black Drain.", "High Watcher. The paramental guiding this city is a massive crystal sphere known as the High Watcher, which has control over ice and currently maintains the crystal domes that protect the city. It can manipulate frost and ice to repair destroyed structures, manipulate the ground the city rests upon, and unleash judgement upon those who seem to disrupt the peace. Its motivations are unknown, but it is powerful enough to be feared, and cares enough for the city that it can be trusted to protect it. Though it maintains the crystal domes, this was once not the case, and those who live in this city know the means to maintain them on their own should they need to."] },
        { h: "Divine Realm: The Black Drain", p: ["The Black Drain is the divine realm of Ilsrabae, the deepest trench of the Elemental Plane of Water, easy to stumble into. Sea beasts here grow larger and more powerful than their kin elsewhere, and elemental forces twist together with other life. Ilsrabae's pitch-black lair at its depths hoards ships, treasure, and secrets plundered from sea-farers. The waters swing between calm and sudden violence, whirlpools and tectonic upheaval without warning. Krakens nest here, serving as both watchdogs and jailors, and a ship graveyard lies near her lair.", "The Black Drain's deepest pits are the remains of an ancient island city that sank in a cataclysm. It is widely believed its people tried to fuse hundreds of water elementals into a single guardian being, and inadvertently created Ilsrabae in the process. The city's true fate, and her true origin, remain secrets she keeps to herself."] },
        { h: "Divine Realm: Ninefathom Market", p: ["Ninefathom Market is the divine realm of [[kai-foschunn|Kai Foschunn]], the Scalemonger, a wreck-junk bazaar in the Elemental Plane of Water."] }
      ] },
    { id: "elemental-earth", name: "Elemental Plane of Earth", eyebrow: "Location · Elemental Plane",
      tagline: "Mountain ranges, valleys, gardens, and forests of varying descriptions.",
      lore: "The Elemental Plane of Earth is the most traversable of the Elemental Planes, and is mostly made up of mountain ranges, valleys, gardens, and forests of varying descriptions. Everything within this plane feels huge and heavy: trees are monstrous, mountains are perilous, and crags in the earth seem to depress endlessly. The Elemental Plane of Earth has one feature that commonly draws outsiders: rich mineral deposits, both in the form of rare ores and metal, as well as gemstones and rare rock. The mineral composition of its mountains and terrain is sometimes nonsensical, and one is as likely to find a sandstone mountain as they are to discover a diamond the size of a house.",
      loreSections: [
        { h: "Vast Underworld", p: ["The majority of the plane is contained underground, in layers of tunnels and massive open trenches that serve as contained ecosystems. Underground forests, lakes, and hives riddle the land, and the underground is so prominent that it is thought that to go deeper underground from any of the other Elemental Planes means to eventually reach the tunnels of the Plane of Earth."] },
        { h: "Grand Mimicry", p: ["There is a curious phenomenon within this plane that causes mountainfaces to sometimes mutate and grow into deliberate shapes, as though mimicking the cities and strongholds of the Material Plane. Some mountains form into well-constructed shapes or city-like crags, which are sometimes refined further by its inhabitants, including dwarves and primordia who find their homes here."] },
        { h: "Underpresence", p: ["The Material Plane's vast underground realm, known as the Underealm, serves as a reflection of the Plane of Earth's own vast underground networks. The majority of natural gates to the Plane of Earth reside within the Underealm, showing some connection between the formation of these natural wonders."] },
        { h: "Positive Overlap", p: ["Part of this plane sits at a nexus with the Plane of Positive Energy, described as \\\"almost like a heaven.\\\" Its opposite is the Negative Plane."] },
        { h: "The Golluckhold", p: ["Under the surface there is a huge, spacious cave in which the Golluckhold, a city that is home to dwarves, constructs, primordia, and golems, flourishes. This kingdom uses the crystals and minerals found in the plane as currency and supremely values hard work: craftsmanship is valued above all else, and those who contribute to the city's endless expansion are hailed as its rulers. This city is so massive that much of it is abandoned, and is home now to monsters and beasts from the plane.", "The city is separated into underground caves with huge shell-like domes that protect those who live there. These domes are repaired and reconstructed constantly, determining where the citizens of the city can expect to live safely. Due to this, they often appear to enclose the \\\"center\\\" of the sections of this civilization, with \\\"abandoned\\\" labyrinthine ruins from the city surrounding them.", "The paramental ruler of the Golluckhold is an ancient, unfeeling golem who seeks endless expansion, and integrates fragments of its body into each domed section to spread its influence through them. It is known simply as \\\"Lord Fortress\\\" and has dozens of bodies all acting as parts of its collective whole. So spread out is its influence that many do not know its original form, and question if its construct-like body is truly the heart of the paramental. It is mostly docile, so long as its city continues to expand."] },
        { h: "Divine Realm: The Untamed Garden", p: ["The Untamed Garden is [[tithiss|Tithiss]]'s realm, a deep, splendid forest in the Elemental Plane of Earth where life surges forward. It is thought to sit at a nexus between the Plane of Earth and the Plane of Positive Energy, where the cancerous growth of the latter drives uninhibited flourishing in the former. The forest is filled with ancient, robust trees, hidden fields of unique flowers and fauna, and plantlife both elemental and material. Within this hive of life and guided mutation, the plants, trees, and elementals mimic the shapes of life from outside, guided by the hand of fey who also make their home here, sometimes living out faux lives resembling humanoids, as though the garden were playing a game with itself.", "This forest is ever-shifting and is known to be an extension of Tithiss's body and heart. Some believe the garden itself is her full corporeal form. Within it stands a singular unbridled oak called the Sephirot Oak, whose roots stretch through the entire forest and beyond, into the Elemental Plane of Earth. Its roots and trunk are so massive that colonies of fey, animals, and insects make their homes within it, with tunnels running all through it. Like the Apples of Aymere, the Sephirot Oak carries supernatural qualities: weapons and armor forged from its bark can stave off magical forces, its blades weep a corrosive sap, and fruit plucked from it has replenishing effects.", "From the roots and trunk of the Sephirot, golden rivers of sap flow, carrying life-giving power that encourages the growth of all things within the Garden. Tithiss most often resides within the Sephirot Oak itself, merging with her realm and regulating it through the great tree, drawing from its sap and blessing it in turn."] }
      ] },
    { id: "sea-of-souls-plane", name: "Sea of Souls", eyebrow: "Location · Cosmology",
      tagline: "Where most of the dead go, and where most of them stay.",
      lore: "The Sea of Souls is a transitive plane unlike any other, an infinite ocean made of the memories, emotions, and souls of all who have passed. When a creature dies, its soul is drawn into this great current, joining the immeasurable tide of every soul that has ever left the mortal world. The Sea does not separate by faith, race, or alignment. It claims all equally. Saints and tyrants drift side by side, their essence dissolving into the greater flow.",
      loreSections: [
        { p: ["This is the common fate of the dead. A soul departs the Sea only if some god selects it for a realm of their own, or if it passes instead into the heavens or the hells. Everyone else remains.", "Souls do not remain static within this sea. As they dissolve and merge, their identities blur, fade, or strengthen based on memory, will, or divine claim. Some souls find serenity, sinking into stillness. Others churn endlessly, wracked by unresolved regrets or violent deaths. Echoes of entire lifetimes swirl through the tides, occasionally coalescing into glimpses of the past: a child's laughter, a battlefield scream, a lover's final breath.", "The Sea touches all other planes, drawing souls from across the multiverse and running as the universal current beneath all mortal existence. Like water working patiently through stone, the Sea of Souls slips between the cracks of reality itself. In rare cases, rifts in the Material Plane open onto its shores, especially where death has pooled in great numbers: fields of slaughter, cursed ruins, ancient necropolises."] },
        { h: "Return from the Sea", p: ["Though death is the common destination, it is not always a final one. Divine beings, powerful spellcasters, and ancient artifacts can pierce the Sea's veil and pull souls back into the world of the living. But the journey is perilous. Resurrection is not simply a matter of placing a soul back into its old body. It is an act of forceful reclamation, a disruption of the soul's natural flow through the Sea.", "When a god answers a prayer, or when a high-level spell like *true resurrection* is performed, the process is guided, protective, and whole. The soul is retrieved gently, shielded from the currents, and placed back into its restored vessel with care. These methods are uncommon, and demand immense magical resources or divine favor.", "More often, resurrection is born of desperation. Rituals are incomplete, magic is strained, and the soul is torn violently from the Sea, ripped through turbulent tides of emotional storms. In these moments a soul may gather fragments of other beings, cling to foreign memories, or fracture beneath the stress. When such a soul returns to life, it returns altered. Sometimes subtly. Often grotesquely."] },
        { h: "Scarred Body and Soul", p: ["Not all who return from the Sea of Souls come back whole. Some carry physical markers of their passage: pale skin drawn taut over bone, eyes that shimmer with unnatural light, voices that echo faintly with ethereal tones. A few are burdened with deeper wounds: an inability to feel joy, sudden fears that did not exist before, or haunting visions that strike without warning."] },
        { h: "Divine Realm: The Penumbral Isles", p: ["The Penumbral Isles are composed of countless crystalized souls that form islands emerging from the Sea of Souls. Resembling tinted glass, when one looks through these semi-transparent crystals, ethereal souls can be seen slowly flowing. Pressing one's ear to the material, one can even hear the indistinct pleas of the dead.", "Constructed by Morosyn shortly after they came into being, these darkly translucent islands host no living flora, with the exception of the Tree of Unlife, which rises almost a mile above the archipelago. This gargantuan tree is visible from all the islands, particularly because of the steady flow of souls into it that gleam like a permanent aurora."] }
      ] },
    { id: "megiddo", name: "Megiddo", eyebrow: "Location · Lower Plane",
      tagline: "A chaotic wasteland of torment, murder, violence, and decay.",
      lore: "Megiddo is a plane associated with various evil energies, counted among the Lower Planes of Loglandia, ruled by [[malveth|Malveth]], the Undying Count, a domain mostly of his own making, built to escape the Penumbral Isles. This chaotic wasteland is difficult to survive within, as sections are filled with a constant terrifying scream from thousands of decaying, tormented souls, and others are filled with wastelands that sap life from those who yet live, age their inhabitants rapidly, or twist life into unrecognizable shapes. It is a plane associated with torment, murder, violence, and decay.",
      loreSections: [
        { p: ["Natural inhabitants of this plane are monstrosities and undead, who find themselves able to survive there without being eroded. The plane is close in a cosmological sense to the Negative Plane, which is responsible for many of its hostile effects. Travelers who die in this plane become twisted into an undead husk or monstrous corruption of themselves within it."] },
        { h: "Vel Cadavien", p: ["Vel Cadavien is the stronghold city of Malveth, the Undying Count, a dark stronghold with massive castle walls protecting a stonework metropolis largely devoid of life. The city is partially submerged in a deep crevice within Megiddo, with only its upper sections and Malveth's own seat, Castle Laquis, prominently existing above ground level.", "The city, though vast, is largely uninhabited. Its central sectors are kept for Malveth's court, while its outer sections are infested by mindless undead, needed for nothing but rabid guard dogs. The outer city is a place of ceaseless murder and death. The entire city is bathed in perpetual moonlight, from either a poisonous green moon or a full white one, depending on Malveth's activities."] },
        { h: "Divine Realm: Del Trust", p: ["Del Trust is the divine realm of [[hightrankul|Hightrankul]], the Pale Word, lying below Vel Cadavien. It can be reached through many secret passages from the city above, the forest surrounding it, or various underground tunnels. This realm exists in secret, and consists of thousands of secret passages with different means to move between them, connecting various structures and hollows that exist for many hidden purposes. It is said that only Hightrankul and their Wordless Masters can navigate it successfully.", "The general appearance of this realm is of a cosmic thieves' den, with the outer passages filled with terrifying traps, mazes, and misdirections, while the inner chambers house Hightrankul and their petitioners. Functionally, it is as complex and twisted as Hightrankul themselves, and stories tell of the Pale Word being able to change its construction with relative ease. At its lowest level there is a large luminous pool of souls, where Hightrankul stores the essence of those who have signed themselves away, and it functions as the source of their deific power."] },
        { h: "Divine Realm: The Red Haunt", p: ["Surrounding Vel Cadavien is a bloody red forest, and extending from it are blood-soaked plains and hills that serve as the divine realm of [[scorn|Scorn]]. These grounds are inhabited by his hunters and servants, who live within a series of moderately sized stronghold towns that regularly go to war with one another to kill time, slaying each other over and over in reverence to Scorn. Within this blood forest there is a castle town, mostly ravaged as though freshly sieged, and at its center lies a cathedral where Scorn resides in his orcish form.", "This forest serves as a protective barrier against the other Gentle Sins, as passing through it means alerting Scorn's petitioners and soulbound servants, who will take any chance to hunt outsiders. Even the petitioners of the Gentle Sins know not to move through this forest without express permission, lest they be hunted as well. Among its dangers are living trees and hills as bloodthirsty as Scorn and his followers."] }
      ] },
    { id: "fey-realm", name: "Fey Realm", eyebrow: "Location · Plane", working: true,
      tagline: "Plane description not yet written.",
      lore: "Plane description not yet written.",
      loreSections: [
        { h: "Divine Realm: The Glade of Forbidden Pleasures", p: ["The Glade of Forbidden Pleasures is the divine realm of [[lussuria|Lussuria]], the Temptress."] }
      ] },
    { id: "realm-of-shadow", name: "Realm of Shadow", eyebrow: "Location · Plane", working: true,
      tagline: "Plane description not yet written.",
      lore: "Plane description not yet written.",
      loreSections: [
        { h: "Invidiva's Stronghold", p: ["[[invidiva|Invidiva]], the Grasping, has no divine realm of her own; her essence is instead bound to godhood through her sister Lussuria's realm, the Glade of Forbidden Pleasures. For a seat of her own, she keeps a stronghold in the Realm of Shadow, laid out to mirror the Glade she is locked out of owning. Because she holds no ground and casts no planar weight of her own, the Divine Curtain never gets a full grip on her, letting her project her aspect into the Material Plane more freely than most gods. The cost sits on the other side of the loophole: if her aspect is destroyed, she is far slower to reform one than a god with a true realm."] }
      ] },
    { id: "vaelrath", name: "Vaelrath", eyebrow: "Location · Plane",
      tagline: "The dragon plane, ruled by dragons directly.",
      lore: "Vaelrath is the dragon plane, divested from the will of the dragons' own gods and ruled instead by its dragons directly. It is an ancient sanctuary, called into being by Pyris, who poured tremendous power into its making so his kind would have somewhere to escape the crumbling world around them. When the dragons fled the Material Plane to escape Broxigar, most crossed here, though some settled instead in the Elemental Planes. Ancient dragons swarm this land in greater numbers than the Material Plane, but so vast is the landscape that they might never meet one another.",
      loreSections: [
        { p: ["At first glance, the plane resembles endless crags, dead mountains, and towering archtrees that extend into the misty sky, but an area controlled by a dragon or its followers takes on characteristics that suit them. There is a vibrant subterranean world here filled to the brim with life, mostly reptilian in nature, where pockets of civilization sprout up around the draconic inhabitants.", "Dragonkin honor the dragons the way other peoples honor gods, with one difference that changes everything: their gods can arrive. A dragon crossing out of Vaelrath is rare, but it happens, and when word spreads that one has been seen, Dragonkin of its color will travel weeks for the chance to stand in its shadow."] },
        { h: "Dragon Lords", p: ["Various minor gods rule here, most of them greatwyrms who attained a higher level of existence. These dragon gods have little interest in the Material Plane, one critical exception being Pyris himself, who defends the boundary between the planes. Other dragons often send their agents, or themselves, to the Material Plane to hunt, amass wealth, or satiate some sense of curiosity.", "Most dragons born in this plane are ceremoniously sent to the Material Plane to live and grow before returning here. This is done to prevent them from becoming overly territorial and covetous in their formative years, as the power of established ancient dragons and greatwyrms here would see them instantly destroyed for overstepping."] },
        { h: "Inhabitants", p: ["This plane serves as an afterlife for petitioners unclaimed by other gods who lived their lives under draconic rule, such as kobolds, Dragonkin, drakes, and so on. Many cities and civilizations here are populated primarily by Dragonkin, lizardfolk, and kobolds. It is also the definitive afterlife of all dragons, and many dragon souls end up becoming spirit dragons that roam this realm.", "Dragon bloodlines run true to element: red to fire, white to ice, blue to storm, black to acid and shadow, and gold, rarest of all, down from Pyris, the dragon god who rules fortune and the Golden Leyline.", "Many groups who follow powerful dragons, or those who have a connection to them, like the Dragon Master Meirlach, also exist within Vaelrath, though often within demiplanes hidden away inside it.", "Creatures who enter Vaelrath without the guidance or blessing of a powerful dragon will often find themselves hunted by its inhabitants for sport, and due to the vast landscape will often have trouble navigating the plane, even if they survive such hunts."] },
        { h: "Divine Realm: The Twin Dragon Temple", p: ["The divine realm of [[meirlach|Meirlach]] the Dragon Master is, fittingly, a demiplane situated within the dragon plane. Meirlach was invited there after achieving divine resonance, invited by his former master, an ancient white feathered dragon who revealed itself and aided him in creating this realm.", "This demiplane takes the form of a mountain range, in which the titular temple serves as a small city made of rising plateaus that rise up above the clouds. At their peak, the master's sanctuary sits where Meirlach resides, rarely seeking audience with outsiders. The city contains temples and shrines dedicated to those who have achieved true recognition as sword saints, and legends go that the souls of swordmasters must gain Meirlach's audience and approval before incarnating as spirit saints.", "It is also said that the supernatural powers granted to sword saints through their focus techniques are granted in part by Meirlach's recognition of those techniques. However, it is not the case that Meirlach is needed to maintain them: once a technique has gained approval from the Master of the Hidden Temple, it carries that power forever. It is unknown if he can denounce techniques in the same way.", "Most call him Meirlach; only his followers call him Musashi."] }
      ] },

  ],

  mechanics: [
    { id: "houserules", name: "House Rules", eyebrow: "Mechanic · Table Rules", tagline: "Loglandia-specific rulings that sit on top of the base system.",
      lore: "house rules content goes here." },
    { id: "resurrection", name: "Resurrection Rules", eyebrow: "Mechanic · Death & Return", tagline: "What it costs to bring someone back.",
      lore: "resurrection rules content goes here." },
    { id: "favoredsoul", name: "Favored Soul", eyebrow: "Homebrew Class · Divine Caster", tagline: "A caster bound by an involuntary divine bargain — the Cosmic Burden.",
      lore: "Full class writeup: features, the level table, and two Cosmic Burden subclasses." },
  ],
};

const GLOSSARY_PAGE = { id: "notation", name: "Glossary", eyebrow: "Glossary · How to Read This",
  tagline: "Shorthand index",
  lore: "Race and trait entries use a compact shorthand to keep things scannable. Here's what each piece means in plain terms.",
  aside: "Two renames to know: the PHB's High Elf is the Prime Elf here, and the PHB's Dragonborn is Dragonkin here. Both are mechanically unchanged, just renamed to fit Loglandia.",
  builtins: [
    { name: "prof bonus/LR (or /Short Rest)", note: "How many times you can use the feature, refreshing on a Long Rest (or Short Rest). The number equals your proficiency bonus, which grows as your level does, so the feature gets more usable as you level up." },
    { name: "Uses Per Long Rest / Short Rest (the chip)", note: "The tag at the bottom of a trait box. \"1\" is a single use that refreshes on that rest; \"= Prof Bonus\" means a number of uses equal to your proficiency bonus. \"Per Short or Long Rest\" means either rest refreshes it. A gray \"Passive\" chip means the trait is always on or at-will, with no per-rest limit." },
    { name: "mod (e.g. WIS mod, DEX mod)", note: "Your ability score modifier for that ability, the number in parentheses on your sheet, not the full score." },
    { name: "prof", note: "Your proficiency bonus, the same number used in \"= Prof Bonus.\" When a trait says \"+ prof\" or \"by prof,\" add or subtract that bonus." },
    { name: "temp HP", note: "Temporary hit points. A buffer on top of your normal HP that absorbs damage first. It doesn't stack with itself (take the higher) and is lost when it runs out or you finish a long rest." },
    { name: "crit", note: "A critical hit, a natural 20 on the attack roll (or a lower number if a trait widens your crit range). You roll the attack's damage dice twice." },
    { name: "CR / gp", note: "CR is a creature's Challenge Rating, a rough measure of how dangerous it is. gp is gold pieces, the standard currency." },
    { name: "(CHA), (WIS), (INT), etc.", note: "The ability score you use for that feature's spell save DC and attack rolls, even if it's not the ability your class normally casts with." },
    { name: "Bonus action", note: "A second, smaller action you can take on your turn alongside your main action, but only one bonus action per turn." },
    { name: "Reaction", note: "A response you can make outside your own turn, usually triggered by something specific like being hit. One reaction per round." },
    { name: "Save (e.g. DEX save, WIS save)", note: "The target rolls that ability score's saving throw against your spell save DC to avoid or reduce the effect." },
    { name: "Once/LR, Once/Short Rest", note: "A flat single use, refreshing on the named rest, with no scaling by proficiency bonus." },
    { name: "Resistance / Immunity", note: "Resistance halves incoming damage of that type; immunity reduces it to zero." },
    { name: "Advantage / Disadvantage", note: "Roll two d20s and take the higher (advantage) or lower (disadvantage) instead of one." },
  ] };

const CRAFT_PAGE_ENTRIES = {
  crafting: { id: "crafting", name: "Crafting", eyebrow: "Mechanic", isNew: true, tagline: "Turn raw materials into gear, tools, and consumables.",
    lore: "Crafting is new to this edition. It leans on the [[harvesting|harvesting system]]: what you gather is what you can make. The best materials come from the most dangerous places." },
  harvesting: { id: "harvesting", name: "Harvesting", eyebrow: "Mechanic", isNew: true, tagline: "Pull usable materials from Loglandia itself.",
    lore: "Harvesting covers everything from monster parts to [[leyric|Leyric]]-touched plants near the Leylines. Where you harvest matters as much as what you harvest." },
};

const ENTRY_INDEX = {};
Object.values(CONTENT).flat().forEach((e) => { ENTRY_INDEX[e.id] = e; });
ENTRY_INDEX[GLOSSARY_PAGE.id] = GLOSSARY_PAGE;
Object.values(CRAFT_PAGE_ENTRIES).forEach((e) => { ENTRY_INDEX[e.id] = e; });

/* Which module a [[link]] should open. Mechanics, Glossary, and Harvesting &
   Crafting each live in their own top-bar tab now. */
const ENTRY_MODULE = {};
Object.entries(CONTENT).forEach(([cat, list]) => { list.forEach((e) => { ENTRY_MODULE[e.id] = cat === "mechanics" ? "mechanics" : "wiki"; }); });
ENTRY_MODULE[GLOSSARY_PAGE.id] = "glossary";
Object.keys(CRAFT_PAGE_ENTRIES).forEach((id) => { ENTRY_MODULE[id] = "craft"; });

/* --------------------------------------------------------- UNIVERSAL TRAITS */
/* Open to every race. Players can pick from these instead of or alongside
   racial legacy traits, as long as their campaign or concept fits the theme.
   Source stored as the category id (e.g. "chance-love") so lookups can find
   the right pool without colliding with "base" or "sub". */
const UNIVERSAL_LEGACY_TRAIT_CATEGORIES = [
  {
    id: "chance-love",
    name: "Luck & Love",
    desc: "For creatures who seek fortune, are shaped by fate, or are connected to love and yearning.",
    iconLeft: Dices, iconRight: Heart,
    traits: [
      { name: "Blind Gamble", note: "When you roll a 5 or less on a d20, you may reroll and must keep the new result. {{Uses Per Short or Long Rest: = Half Prof Bonus}}" },
      { name: "Consensual Application", note: "As a bonus action, have a willing, non-incapacitated creature drink a potion in your possession. {{Passive}}" },
      { name: "Empathic Connection", note: "While in physical contact with a creature that speaks at least one language, you understand all languages they speak and they understand yours. {{Passive}}" },
      { name: "Minor Luck", note: "You have luck points equal to half your prof bonus (rounded up), as described by the Lucky feat. They refresh on a long rest. {{Passive}}" },
      { name: "Uncharmable", note: "You have advantage on saves against being charmed or enraged. {{Passive}}" },
      { name: "Value Seeker", note: "If you can learn spells through a class feature or trait, you may choose spells from the Arts of Value spell group as though they were on your available spell lists. {{Passive}}" },
    ],
  },
  {
    id: "grimdark-monstrous",
    name: "Ghostly & Monstrous",
    desc: "For creatures who have embraced ferocity, undeath, or owe part of themselves to a dark nature.",
    iconLeft: Ghost, iconRight: Moon,
    traits: [
      { name: "Blood Rally", note: "When you score a crit, gain temp HP equal to half the damage that attack deals. {{Passive}}" },
      { name: "Darksense", note: "In complete darkness, you detect the presence of creatures within 5 ft. × your prof bonus. Invisible creatures within this range are visible to you. {{Passive}}" },
      { name: "Ghost Touch", note: "You can see and interact with Ethereal Plane creatures within 10 ft. of your position, and vice versa. Your weapons count as magical against creatures between both planes. {{Passive}}" },
      { name: "Keen Detection", note: "You have advantage on Perception checks made to hunt, detect, or track other creatures. {{Passive}}" },
      { name: "Monstrous Restoration", note: "As a bonus action, remove all Combat Fatigue on yourself and regain HP equal to twice your level. Until the start of your next turn, attacks against you have advantage. {{Uses Per Long Rest: 1}}" },
      { name: "Unholy Rebuke", note: "You are resistant to radiant damage. When you take radiant damage from a source within reach of a melee weapon, you can use your reaction to attack that source with it. {{Passive}}" },
    ],
  },
  {
    id: "honor-technique",
    name: "Honor & Technique",
    desc: "For creatures raised in martial discipline, or who have sharpened their skills in the heat of combat.",
    iconLeft: Swords, iconRight: Zap,
    traits: [
      { name: "Arm Guard", note: "Choose one of piercing, slashing, or bludgeoning. You are resistant to that damage type. {{Passive}}" },
      { name: "Enhanced Vision", note: "You gain proficiency in Perception. Any special vision you have (darkvision, blindsight, truesight, etc.) increases in range by 50%, including bonuses from spells and traits. {{Passive}}" },
      { name: "Focus Engine", note: "If you have levels in Sword Saint and another class, you may spend resources from other classes in place of focus points. Consult your GM for the conversion table. {{Passive}}" },
      { name: "Sharp Reaction", note: "When you make an INT or WIS save you aren't proficient in, add half your prof bonus (rounded down) to the result. {{Passive}}" },
      { name: "Step of Leaves", note: "When you take movement on your turn, you can walk on liquid or vertical surfaces as though they were solid until the start of your next turn. {{Uses Per Long Rest: = Prof Bonus}}" },
      { name: "Wandering Heart", note: "You gain proficiency in Perception and Survival, plus one tool of your choice. {{Passive}}" },
      { name: "Weapon Honing", note: "Choose one weapon type; gain proficiency with it if you lack it. A number of times per long rest equal to your prof bonus, attack with it at advantage — if it hits, add your prof bonus to the damage. {{Uses Per Long Rest: = Prof Bonus}}" },
    ],
  },
];

const WIKI_SECTIONS = [
  { key: "races", label: "Races" },
  { key: "gods", label: "Gods" },
  { key: "regions", label: "Locations" },
  { key: "organizations", label: "Organizations" },
  { key: "characters", label: "NPCs" },
];

const EVENTS = [];

const CAMPAIGNS = [
  { id: "emberfall", name: "Campaign 1", blurb: "The current campaign.", cover: "", entries: [] },
];

/* ------------------------------------------------------------- LORE PARSER */
/* ------------------------------------------------------------- AUTOLINKING */
/* Any entry name mentioned in prose gets an automatic hover-tooltip link to
   its Codex page, so cross-references work without hand-writing [[links]].

   Two things keep this from becoming noise:
   - AUTOLINK_BLOCK holds names that double as ordinary words ("Elf", "Human",
     "Scorn"). Linking every "a dwarf walked in" would be useless, so those
     only link when written with an explicit [[link]].
   - Each entry links at most once per block of text, on its first mention. */
const AUTOLINK_BLOCK = new Set([
  "Elf", "Human", "Dwarf", "Orc", "Goblin", "Kobold", "Halfling", "Changeling",
  "Kith", "Tarnished", "Scorn", "Lana", "Duro", "Emrin", "House Rules",
  "Resurrection Rules", "Favored Soul",
]);

/* Plurals and shorthands the prose actually uses, mapped to their entry id. */
const AUTOLINK_ALIASES = {
  "Tieflings": "tiefling", "Kitsunes": "kitsune", "Dragonkins": "dragonkin",
  "Crystori": "crystori", "Primordia": "primordia", "Hanyou": "hanyou",
  "Plumari": "plumari", "Leporin": "leporin", "Mothkin": "mothkin",
  "Grung": "grung", "Drackal": "drakel",
  "the Sea of Souls": "sea-of-souls-plane",
  "Blackseal Order": "the-blackseal-order",
  "Death Triad": "the-death-triad",
};

/* Built once: every linkable phrase, longest first so "Elemental Plane of
   Fire" wins over a shorter partial match. */
const AUTOLINK_ENTRIES = (() => {
  const map = new Map();
  Object.values(ENTRY_INDEX).forEach((e) => {
    if (!e?.name || AUTOLINK_BLOCK.has(e.name)) return;
    map.set(e.name, e.id);
    // "The Boatman" should also match a bare "Boatman"
    if (/^The /.test(e.name)) {
      const bare = e.name.replace(/^The /, "");
      if (!AUTOLINK_BLOCK.has(bare) && bare.length > 4) map.set(bare, e.id);
    }
  });
  Object.entries(AUTOLINK_ALIASES).forEach(([phrase, id]) => {
    if (ENTRY_INDEX[id]) map.set(phrase, id);
  });
  return [...map.entries()].sort((a, b) => b[0].length - a[0].length);
})();

const AUTOLINK_RE = new RegExp(
  "\\b(" + AUTOLINK_ENTRIES.map(([p]) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
  "g"
);
const AUTOLINK_LOOKUP = new Map(AUTOLINK_ENTRIES);

/* Walks a plain-text run and wraps recognised names in LoreLink. `seen` is
   shared across the whole parseLore call so a name links once, not ten times. */
function autoLinkText(text, seen, keyPrefix) {
  if (!text) return [text];
  const out = [];
  let last = 0, m, i = 0;
  AUTOLINK_RE.lastIndex = 0;
  while ((m = AUTOLINK_RE.exec(text)) !== null) {
    const phrase = m[1];
    const id = AUTOLINK_LOOKUP.get(phrase);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<LoreLink key={`${keyPrefix}a${i++}`} linkKey={id}>{phrase}</LoreLink>);
    last = m.index + phrase.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parseLore(text) {
  const out = []; const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0, m, i = 0;
  const seen = new Set();
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(...autoLinkText(text.slice(last, m.index), seen, `p${i}`));
    const key = m[1].trim();
    const known = GLOSSARY[key] || ENTRY_INDEX[key];
    const label = (m[2] || GLOSSARY[key]?.term || ENTRY_INDEX[key]?.name || m[1]).trim();
    if (ENTRY_INDEX[key]) seen.add(key);
    out.push(known ? <LoreLink key={`l${i++}`} linkKey={key}>{label}</LoreLink> : label);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(...autoLinkText(text.slice(last), seen, `t${i}`));
  return out;
}

/* A trait note can carry a trailing use-count tag in {{...}}, e.g.
   "Reroll one failed save. {{Uses Per Long Rest: 1}}". We pull that off the
   end and render it as a chip so the limit always sits in the same place,
   while the prose itself stays clean. Notes with no tag render as before. */
function splitUseTag(text) {
  const m = text.match(/\s*\{\{([^}]+)\}\}\s*$/);
  if (!m) return { body: text, tag: null };
  return { body: text.slice(0, m.index).trim(), tag: m[1].trim() };
}
function TraitNote({ note }) {
  const { body, tag } = splitUseTag(note);
  const isPassive = tag && /^passive$/i.test(tag);
  return (
    <>
      <span className="lgl-tn-body"><span className="lgl-tn-text">{parseLore(body)}</span></span>
      {tag && <span className="lgl-usechip-wrap"><span className={"lgl-usechip" + (isPassive ? " is-passive" : "")}>{tag}</span></span>}
    </>
  );
}

/* --------------------------------------------------------------- LORE LINK */
/* The id of the entry currently being displayed. Links pointing at it render
   as plain text — a page shouldn't link to itself. */
const LoreScopeContext = createContext(null);

function LoreLink({ linkKey, children }) {
  const navigate = useContext(NavContext);
  const scopeId = useContext(LoreScopeContext);
  const term = GLOSSARY[linkKey];
  const target = term ? null : ENTRY_INDEX[linkKey];
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); setPinned(false); } };
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setPinned(false); } };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDoc); };
  }, [open]);
  if (!term && !target) return <>{children}</>;
  if (target && scopeId && target.id === scopeId) return <>{children}</>;
  const isEntry = !!target;
  const handleClick = () => {
    if (isEntry) { navigate(ENTRY_MODULE[target.id] || "wiki", { entryId: target.id }); return; }
    if (pinned) { setPinned(false); setOpen(false); } else { setPinned(true); setOpen(true); }
  };
  return (
    <span className="lgl-link-wrap" ref={ref}>
      <button type="button" className={"lgl-link" + (isEntry ? " is-entry" : "")} aria-expanded={open}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => { if (!pinned) setOpen(false); }}
        onFocus={() => setOpen(true)} onBlur={() => { if (!pinned) setOpen(false); }} onClick={handleClick}>
        {children}
      </button>
      {open && (
        <span className="lgl-pop" role="note">
          {isEntry ? (
            <>
              {target.eyebrow && <span className="lgl-pop-tag">{target.eyebrow}</span>}
              <span className="lgl-pop-term">{target.name}</span>
              {target.tagline && <span className="lgl-pop-body">{target.tagline}</span>}
              <span className="lgl-pop-open">Open page →</span>
            </>
          ) : (
            <>
              <span className="lgl-pop-tag">{term.tag}</span>
              <span className="lgl-pop-term">{term.term}</span>
              <span className="lgl-pop-body">{term.body}</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------ MODULE SHELL */
function ModuleShell({ aside, asideTitle, children, asideCollapsed, defaultAsideOpen }) {
  const [open, setOpen] = useState(!!defaultAsideOpen);
  return (
    <div className="lgl-module">
      {aside && <div className={"lgl-aside-wrap" + (open ? " is-open" : "") + (asideCollapsed ? " is-collapsed" : "")}><div className="lgl-aside-inner">{aside}</div></div>}
      {aside && open && <div className="lgl-aside-scrim" onClick={() => setOpen(false)} />}
      <div className="lgl-main-wrap">
        {aside && <button className="lgl-aside-toggle" onClick={() => setOpen((o) => !o)}><Menu size={15} /> {asideTitle}</button>}
        <div className="lgl-main">{children}</div>
      </div>
    </div>
  );
}

function Facts({ facts }) {
  if (!facts?.length) return null;
  return (
    <div className="lgl-facts">
      {facts.map((f) => (
        <div className="lgl-fact" key={f.label}>
          <div className="lgl-fact-label">{f.label}</div>
          <div className="lgl-fact-value">{f.chips ? f.chips.map((c) => <span className="lgl-fchip" key={c}>{c}</span>) : f.text}</div>
        </div>
      ))}
    </div>
  );
}

function LegacyTraitPanel({ items, raceName }) {
  return (
    <section className="lgl-legacy-panel">
      <div className="lgl-legacy-head">
        <div className="lgl-legacy-head-left">
          <span className="lgl-legacy-mark"><Sparkles size={14} /></span>
          <span className="lgl-legacy-title">Legacy Traits</span>
        </div>
      </div>
      <p className="lgl-legacy-def">
        Optional racial features, distinct from a race's built-in features. {parseLore("See [[legacytraits|Legacy Traits]] for how they're picked at character creation, or the [[notation|Glossary]] for how to read the shorthand.")}
      </p>
      <div className="lgl-legacy-grid">
        {items.map((t) => (
          <div className="lgl-legacy-card" key={t.name}>
            <div className="lgl-legacy-card-name">{t.name}</div>
            <div className="lgl-legacy-card-note"><TraitNote note={t.note} /></div>
            {raceName && <span className="lgl-legacypick-source">{raceName}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function TraitList({ items, sourceLabel }) {
  return (
    <div className="lgl-traitbox-row">
      {items.map((t) => {
        const label = typeof sourceLabel === "function" ? sourceLabel(t) : sourceLabel;
        const isLegacy = label !== "Built-in";
        return (
          <div className={"lgl-traitbox" + (isLegacy ? " is-legacy" : "")} key={t.name}>
            <span className="lgl-trait-name">{t.name}</span>
            {t.flavor && <span className="lgl-trait-flavor">{parseLore(t.flavor)}</span>}
            <span className="lgl-trait-note"><TraitNote note={t.note} /></span>
            {label && <span className="lgl-traitbox-source">{label}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ ENTRY  */
/* Each elven line gets its own icon and color on the Elf landing page —
   the line's element, worn on the button. */
const ELF_LINE_THEME = {
  "elfline-prime": { icon: Circle,        color: "#9aa89a", label: "Unresonated" },
  "elfline-sun":   { icon: Sun,           color: "#d4552f", label: "Fire" },
  "elfline-sea":   { icon: Droplets,      color: "#2f8fb5", label: "Water" },
  "elfline-wood":  { icon: TreePine,      color: "#5f9146", label: "Earth" },
  "elfline-wild":  { icon: Flower2,       color: "#b563ac", label: "Fey" },
  "elfline-dark":  { icon: Gem,           color: "#8156c4", label: "Dark" },
  "elfline-moon":  { icon: Moon,          color: "#a8b0dc", label: "The Three Moons" },
  "elfline-snow":  { icon: Snowflake,     color: "#7fc6da", label: "Ice" },
  "elfline-storm": { icon: CloudLightning, color: "#2b3f7a", label: "Air" },
};

/* Same idea as the elf lines, one theme per god Type, so the Gods landing
   page reads as a set of colored, iconed groups rather than a flat list.
   Keyed by the last segment of a god's eyebrow ("Lesser God · Celestial"
   -> "Celestial"), with a few special non-Type buckets (Faith, Cosmology,
   Planned) handled the same way. */
const GOD_TYPE_THEME = {
  "Primal":      { icon: Leaf,     color: "#5f9146" },
  "Celestial":   { icon: Sun,      color: "#d4b23a" },
  "Unholy":      { icon: Skull,    color: "#8a3a3a" },
  "Fey":         { icon: Flower2,  color: "#b563ac" },
  "Aberrant":    { icon: Eye,      color: "#5a8a7a" },
  "Cult":        { icon: Lock,     color: "#8a7060" },
  "Cosmology":   { icon: Globe,    color: "#5a7aa8" },
  "Planned":     { icon: Puzzle,   color: "#8a8a8a" },
};
const GOD_TYPE_ORDER = ["Primal", "Celestial", "Unholy", "Fey", "Aberrant", "Cult", "Cosmology", "Planned"];

function godTypeOf(g) {
  if (g.planned) return "Planned";
  const parts = (g.eyebrow || "").split(" · ");
  return parts[parts.length - 1].trim();
}

/* The Gods landing page: every god as a themed button grouped by Type,
   same visual language as the elf lines. Planned/unwritten gods get their
   own trailing section rather than mixing into the real roster. */
function GodLanding({ onOpenEntry }) {
  const gods = CONTENT.gods || [];
  const groups = GOD_TYPE_ORDER
    .map((type) => ({ type, items: gods.filter((g) => godTypeOf(g) === type).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length);
  return (
    <section className="lgl-elflanding">
      <div className="lgl-elflanding-label">The Gods</div>
      <p className="lgl-elflanding-sub">Every god and faith of Loglandia, grouped by nature. Planned gods are concepts only — nothing there is locked canon yet.</p>
      {groups.map((g) => {
        const t = GOD_TYPE_THEME[g.type] || { icon: Sparkles, color: "var(--accent)" };
        const Icon = t.icon;
        return (
          <div className="lgl-godgroup" key={g.type}>
            <div className="lgl-godgroup-label" style={{ "--line-color": t.color }}>
              <Icon size={14} /> <span>{g.type === "Planned" ? "Planned Gods" : g.type}</span>
              <span className="lgl-godgroup-count">{g.items.length}</span>
            </div>
            <div className="lgl-elflanding-grid">
              {g.items.map((god) => (
                <button
                  key={god.id}
                  className={"lgl-elfline-btn" + (god.planned ? " is-planned" : "")}
                  style={{ "--line-color": t.color }}
                  onClick={() => onOpenEntry(god.id)}
                >
                  <span className="lgl-elfline-icon"><Icon size={22} /></span>
                  <span className="lgl-elfline-name">{god.name}</span>
                  {god.planned && <span className="lgl-elfline-el">Concept only</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}


function ElfLineLanding({ onOpenEntry }) {
  const lines = CONTENT.elfLines || [];
  return (
    <section className="lgl-elflanding">
      <div className="lgl-elflanding-label">The Nine Lines</div>
      <p className="lgl-elflanding-sub">Elf is not one people but nine. Every elf begins Prime; what they become depends on the Leyline they give themselves to. Each line below has its own full entry.</p>
      <div className="lgl-elflanding-grid">
        {lines.map((ln) => {
          const t = ELF_LINE_THEME[ln.id] || { icon: Sparkles, color: "var(--accent)", label: "" };
          const Icon = t.icon;
          return (
            <button
              key={ln.id}
              className="lgl-elfline-btn"
              style={{ "--line-color": t.color }}
              onClick={() => onOpenEntry(ln.id)}
            >
              <span className="lgl-elfline-icon"><Icon size={22} /></span>
              <span className="lgl-elfline-name">{ln.name}</span>
              {t.label && <span className="lgl-elfline-el">{t.label}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* The narrator's asides. Death is the one telling this book, and these are the
   moments the account slips into first person. Styled apart from the lore. */
function DeathAside({ text }) {
  return (
    <blockquote className="lgl-deathaside">
      <span className="lgl-deathaside-mark" aria-hidden="true"><Skull size={13} /></span>
      <span className="lgl-deathaside-text">{parseLore(text)}</span>
    </blockquote>
  );
}

/* A god's Worship block: the ritual/prayer/rite ratings plus the one named
   observance and its explanation, kept as its own small ornamented section
   rather than folded in as ordinary lore. */
function WorshipBlock({ worship }) {
  if (!worship) return null;
  return (
    <section className="lgl-worship">
      <div className="lgl-worship-label"><span className="lgl-orn-rule" /><span>Worship</span><span className="lgl-orn-rule" /></div>
      {worship.meta?.length > 0 && (
        <div className="lgl-worship-grid">
          {worship.meta.map((m) => (
            <div className="lgl-worship-row" key={m.label}>
              <span className="lgl-worship-row-label">{m.label}</span>
              <span className="lgl-worship-row-value">{m.text}</span>
            </div>
          ))}
        </div>
      )}
      {worship.paras?.map((p, i) => <p className="lgl-lore" key={i}>{parseLore(p)}</p>)}
    </section>
  );
}

/* GM-only content — a god's "DM Back" or a character's DM Back fields.
   Locked shut by default and visually distinct (muted red), since some of
   this is genuine spoiler material players should not stumble into. */
function GMFold({ items, label = "Behind the Screen — GM Only" }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [wrong, setWrong] = useState(false);
  const { unlocked, unlock } = useContext(GMAccessContext) || {};
  if (!items?.length) return null;
  // items is either an array of plain paragraph strings (god DM Back) or
  // an array of {label, text} pairs (character DM Back fields).
  const isPairs = typeof items[0] === "object";
  const submitPw = (e) => {
    e.preventDefault();
    if (unlock(pw)) { setWrong(false); setPw(""); }
    else { setWrong(true); }
  };
  return (
    <div className="lgl-gmfold">
      <button className="lgl-gmfold-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Lock size={14} />
        <span>{label}</span>
        <ChevronRight size={15} className={"lgl-gmfold-chevron" + (open ? " is-open" : "")} />
      </button>
      {open && !unlocked && (
        <form className="lgl-gmfold-lock" onSubmit={submitPw}>
          <Lock size={16} className="lgl-gmfold-lock-icon" />
          <p className="lgl-gmfold-lock-text">GM password required to view this section.</p>
          <div className="lgl-gmfold-lock-row">
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setWrong(false); }}
              placeholder="Password"
              className={"lgl-gmfold-lock-input" + (wrong ? " is-wrong" : "")}
              autoFocus
            />
            <button type="submit" className="lgl-gmfold-lock-btn">Unlock</button>
          </div>
          {wrong && <p className="lgl-gmfold-lock-error">Wrong password.</p>}
        </form>
      )}
      {open && unlocked && (
        <div className="lgl-gmfold-body">
          {isPairs
            ? items.map((it, i) => (
                <div className="lgl-gmfold-row" key={i}>
                  <span className="lgl-gmfold-row-label">{it.label}</span>
                  <span className="lgl-gmfold-row-text">{parseLore(it.text)}</span>
                </div>
              ))
            : items.map((p, i) => <p className="lgl-lore lgl-gmfold-p" key={i}>{parseLore(p)}</p>)}
        </div>
      )}
    </div>
  );
}

/* Shows a real portrait when entry.img is set, but falls back to the plain
   art-slot placeholder if the image fails to load (missing file, bad path,
   images/ folder not deployed yet) instead of showing a broken-image icon. */
function EntryArt({ src, alt }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return <div className="lgl-art" aria-hidden="true"><span>art slot</span></div>;
  return <img className="lgl-art lgl-art-real" src={src} alt={alt} onError={() => setFailed(true)} />;
}

function EntryPage({ entry: rawEntry, hideLegacy, hideSubraces, hideArt, onOpenEntry }) {
  const [mechOpen, setMechOpen] = useState(false);
  const { edits, updateEdit } = useContext(DevModeContext) || { edits: {} };
  useEffect(() => { setMechOpen(false); }, [rawEntry?.id]);
  if (!rawEntry) return <div className="lgl-empty-page">Pick an entry from the codex.</div>;
  const entry = applyDevEdits(rawEntry, edits);
  const saveLore = (t) => updateEdit(entry.id, (cur) => ({ ...cur, lore: t }));
  const saveTagline = (t) => updateEdit(entry.id, (cur) => ({ ...cur, tagline: t }));
  const saveSecH = (i, t) => updateEdit(entry.id, (cur) => ({ ...cur, sections: { ...cur.sections, [i]: { ...cur.sections?.[i], h: t } } }));
  const saveSecP = (i, j, t) => updateEdit(entry.id, (cur) => ({ ...cur, sections: { ...cur.sections, [i]: { ...cur.sections?.[i], p: { ...cur.sections?.[i]?.p, [j]: t } } } }));
  const isRace = CONTENT.races.some((r) => r.id === entry.id);
  const hasMechanics = entry.facts?.length > 0 || entry.builtins?.length > 0 || entry.legacy?.length > 0 || (!entry.subracesElsewhere && entry.subraces?.length > 0);

  const mechanicsBody = (
    <>
      <Facts facts={entry.facts} />
      {entry.builtins?.length > 0 && (
        <section className="lgl-block"><h2 className="lgl-h2">Built-in Features</h2><TraitList items={entry.builtins} sourceLabel="Built-in" /></section>
      )}
      {!hideLegacy && entry.legacy?.length > 0 && <LegacyTraitPanel items={entry.legacy} raceName={entry.name} />}
      {!hideSubraces && !entry.subracesElsewhere && entry.subraces?.length > 0 && (
        <section className="lgl-block">
          <h2 className="lgl-h2">{entry.subracesLabel || "Subraces"}</h2>
          {entry.subraces.map((sr) => (
            <div className="lgl-subrace" key={sr.name}>
              <div className="lgl-subrace-head">{sr.name}</div>
              {sr.desc && <div className="lgl-subrace-desc">{sr.desc}</div>}
              <TraitList items={sr.traits} sourceLabel={(t) => (/^\(built-in\)/i.test(t.note) ? "Built-in" : sr.name)} />
            </div>
          ))}
        </section>
      )}
    </>
  );

  return (
    <LoreScopeContext.Provider value={entry.id}>
    <article className="lgl-entry">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow-row">
          {entry.eyebrow && <span className="lgl-eyebrow">{entry.eyebrow}</span>}
          {entry.isNew && <span className="lgl-badge">New in this edition</span>}
          {entry.working && <span className="lgl-badge soft">Working title</span>}
        </div>
        <h1>{entry.name}</h1>
        {entry.tagline && <DevEditable as="p" className="lgl-tagline" value={entry.tagline} onSave={saveTagline} />}
      </header>
      {!hideArt && <EntryArt src={entry.img} alt={entry.name} />}
      {!isRace && <Facts facts={entry.facts} />}
      {entry.godmarked && (
        <section className="lgl-gmintro">
          <div className="lgl-gmintro-label"><span className="lgl-orn-rule" /><span>The Godmarked</span><span className="lgl-orn-rule" /></div>
          {GODMARKED_INTRO.map((p, i) =>
            typeof p === "string"
              ? <p className="lgl-lore" key={i}>{parseLore(p)}</p>
              : <DeathAside key={i} text={p.aside} />
          )}
        </section>
      )}
      {entry.lore && <DevEditable as="p" className="lgl-lore lgl-lore-open" value={entry.lore} onSave={saveLore} />}
      {entry.loreSections?.map((sec, i) => (
        <section className="lgl-loresec" key={i}>
          {sec.h && <DevEditable as="h2" className="lgl-loresec-h" value={sec.h} onSave={(t) => saveSecH(i, t)} />}
          {sec.p.map((p, j) =>
            typeof p === "string"
              ? <DevEditable as="p" className="lgl-lore" key={j} value={p} onSave={(t) => saveSecP(i, j, t)} />
              : <DeathAside key={j} text={p.aside} />
          )}
        </section>
      ))}
      <WorshipBlock worship={entry.worship} />
      {entry.elfLanding && <ElfLineLanding onOpenEntry={onOpenEntry} />}
      {entry.aside && <blockquote className="lgl-aside">{parseLore(entry.aside)}</blockquote>}

      {entry.subraceRef ? (
        (() => {
          const elfRace = CONTENT.races.find((r) => r.id === "elf");
          const refs = Array.isArray(entry.subraceRef) ? entry.subraceRef : [entry.subraceRef];
          const subs = refs.map((n) => elfRace?.subraces?.find((sr) => sr.name === n)).filter(Boolean);
          if (!subs.length) return null;
          return (
            <div className="lgl-mechfold">
              <button className="lgl-mechfold-toggle" onClick={() => setMechOpen((o) => !o)} aria-expanded={mechOpen}>
                <Cog size={15} />
                <span>Mechanics</span>
                <ChevronRight size={15} className={"lgl-mechfold-chevron" + (mechOpen ? " is-open" : "")} />
              </button>
              {mechOpen && (
                <div className="lgl-mechfold-body">
                  {subs.map((sr) => (
                    <section className="lgl-block" key={sr.name}>
                      {subs.length > 1 && <h2 className="lgl-h2">{sr.name}</h2>}
                      {sr.desc && <div className="lgl-subrace-desc">{sr.desc}</div>}
                      <TraitList items={sr.traits} sourceLabel={(t) => (/^\(built-in\)/i.test(t.note) ? "Built-in" : sr.name)} />
                    </section>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      ) : isRace && hasMechanics ? (
        <div className="lgl-mechfold">
          <button className="lgl-mechfold-toggle" onClick={() => setMechOpen((o) => !o)} aria-expanded={mechOpen}>
            <Cog size={15} />
            <span>Mechanics</span>
            <ChevronRight size={15} className={"lgl-mechfold-chevron" + (mechOpen ? " is-open" : "")} />
          </button>
          {mechOpen && <div className="lgl-mechfold-body">{mechanicsBody}</div>}
        </div>
      ) : (
        <>
          {entry.builtins?.length > 0 && (
            <section className="lgl-block"><h2 className="lgl-h2">Built-in Features</h2><TraitList items={entry.builtins} sourceLabel="Built-in" /></section>
          )}
          {!hideLegacy && entry.legacy?.length > 0 && <LegacyTraitPanel items={entry.legacy} raceName={entry.name} />}
          {!hideSubraces && entry.subraces?.length > 0 && (
            <section className="lgl-block">
              <h2 className="lgl-h2">{entry.subracesLabel || "Subraces"}</h2>
              {entry.subraces.map((sr) => (
                <div className="lgl-subrace" key={sr.name}>
                  <div className="lgl-subrace-head">{sr.name}</div>
                  {sr.desc && <div className="lgl-subrace-desc">{sr.desc}</div>}
                  <TraitList items={sr.traits} sourceLabel={(t) => (/^\(built-in\)/i.test(t.note) ? "Built-in" : sr.name)} />
                </div>
              ))}
            </section>
          )}
        </>
      )}
      <GMFold items={entry.dmNotes?.length ? entry.dmNotes : entry.gmNotes} />
    </article>
    </LoreScopeContext.Provider>
  );
}

/* ===================================================== MODULE: WIKI ======= */
const WIKI_SECTION_ICONS = { races: Sparkles, characters: BookOpen, gods: Gem, regions: MapIcon, organizations: Shapes };

function WikiHome({ onOpenEntry, onOpenTimeline, onOpenSection, onOpenPCGallery, onOpenTales }) {
  const pool = useMemo(
    () => Object.values(CONTENT).flat().filter((e) => e && !e.codexHidden && e.lore),
    []
  );
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const pick = pool.length ? pool[seed % pool.length] : null;
  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Codex</div>
        <h1>The Codex of Loglandia</h1>
        <p className="lgl-tagline">Lore, characters, and the rules of the world, all cross-linked. Browse by category or search the codex.</p>
      </header>
      <div className="lgl-wikihome-grid">
        {WIKI_SECTIONS.map((sec) => {
          const items = (CONTENT[sec.key] || []).filter((it) => !it.codexHidden);
          const Icon = WIKI_SECTION_ICONS[sec.key] || BookOpen;
          return (
            <button key={sec.key} className="lgl-wikihome-card" onClick={() => onOpenSection(sec.key)}>
              <span className="lgl-wikihome-card-icon"><Icon size={18} /></span>
              <span className="lgl-wikihome-card-label">{sec.label}</span>
              <span className="lgl-wikihome-card-count">{items.length ? `${items.length} entr${items.length === 1 ? "y" : "ies"}` : "Coming soon"}</span>
            </button>
          );
        })}
      </div>
      <button className="lgl-timeline-btn" onClick={onOpenTimeline}>
        <span className="lgl-timeline-btn-icon"><Clock size={26} /></span>
        <span className="lgl-timeline-btn-text">
          <span className="lgl-timeline-btn-label">The Timeline</span>
          <span className="lgl-timeline-btn-sub">Every age of Loglandia, from the Primarchs to now</span>
        </span>
        <ChevronRight size={18} className="lgl-timeline-btn-arrow" />
      </button>
      <button className="lgl-timeline-btn" onClick={onOpenPCGallery}>
        <span className="lgl-timeline-btn-icon"><UserPlus size={26} /></span>
        <span className="lgl-timeline-btn-text">
          <span className="lgl-timeline-btn-label">Characters Made in Character Builder</span>
          <span className="lgl-timeline-btn-sub">Every character the group has actually built and saved</span>
        </span>
        <ChevronRight size={18} className="lgl-timeline-btn-arrow" />
      </button>
      <button className="lgl-timeline-btn" onClick={onOpenTales}>
        <span className="lgl-timeline-btn-icon"><Scroll size={26} /></span>
        <span className="lgl-timeline-btn-text">
          <span className="lgl-timeline-btn-label">Tales</span>
          <span className="lgl-timeline-btn-sub">What your party has actually done, campaign by campaign</span>
        </span>
        <ChevronRight size={18} className="lgl-timeline-btn-arrow" />
      </button>
      {pick && (
        <section className="lgl-randomblock">
          <div className="lgl-randomblock-head">
            <Dices size={14} /> <span>A Random Entry</span>
          </div>
          <button className="lgl-randomblock-card" onClick={() => onOpenEntry(pick.id)}>
            {pick.eyebrow && <span className="lgl-eyebrow">{pick.eyebrow}</span>}
            <span className="lgl-randomblock-name">{pick.name}</span>
            {pick.tagline && <span className="lgl-randomblock-tagline">{pick.tagline}</span>}
            <span className="lgl-randomblock-cta">Read it <ChevronRight size={14} /></span>
          </button>
          <button className="lgl-randomblock-reroll" onClick={() => setSeed(Math.floor(Math.random() * 100000))}>
            <Dices size={20} /> Draw Another
          </button>
        </section>
      )}
    </article>
  );
}

const WIKI_HOME = "__wikihome__";
const WIKI_TIMELINE = "__timeline__";
const WIKI_PCGALLERY = "__pcgallery__";
const WIKI_TALES = "__tales__";

function CharacterGallery() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!SUPABASE_READY) { setState("not-configured"); return; }
    setState("loading");
    supaFetch("characters?select=*&order=created_at.desc")
      .then((data) => { setRows(data || []); setState("done"); })
      .catch(() => setState("error"));
  }, []);

  const openRow = rows.find((r) => r.id === openId);
  const allCampaigns = [...CHARACTER_CAMPAIGNS, JUST_FOR_FUN];

  const groups = [
    ...allCampaigns.map((c) => ({
      id: c.id, name: c.name,
      rows: rows.filter((r) => r.data?.campaignId === c.id).sort((a, b) => (a.owner_name || "").localeCompare(b.owner_name || "") || (a.data?.name || "").localeCompare(b.data?.name || "")),
    })),
    {
      id: "__uncategorized__", name: "No Campaign Set",
      rows: rows.filter((r) => !allCampaigns.some((c) => c.id === r.data?.campaignId)).sort((a, b) => (a.owner_name || "").localeCompare(b.owner_name || "") || (a.data?.name || "").localeCompare(b.data?.name || "")),
    },
  ].filter((g) => g.rows.length > 0);

  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Codex · Characters</div>
        <h1>Characters Made in Character Builder</h1>
        <p className="lgl-tagline">Every character the group has saved, grouped by campaign and sorted by who made them.</p>
      </header>

      {state === "not-configured" && (
        <div className="lgl-savenote" style={{ maxWidth: 480, margin: "0 auto" }}>
          This gallery isn't connected to a backend yet. Once a Supabase project's URL and key are added to the code, characters saved in the Builder will show up here for everyone.
        </div>
      )}
      {state === "loading" && <p className="lgl-muted">Loading…</p>}
      {state === "error" && <p className="lgl-muted">Couldn't load characters just now. Try refreshing.</p>}

      {(state === "done") && !openRow && (
        <>
          {rows.length === 0 && <p className="lgl-muted">Nobody's saved a character yet. Build one and it'll show up here.</p>}
          {rows.length > 0 && groups.map((g) => (
            <section className="lgl-chargroup" key={g.id}>
              <div className="lgl-chargroup-label">{g.name}<span className="lgl-chargroup-count">{g.rows.length}</span></div>
              <div className="lgl-bubbles">
                {g.rows.map((row) => (
                  <button key={row.id} className="lgl-charbubble" onClick={() => setOpenId(row.id)}>
                    <span className="lgl-charbubble-name">{row.data?.name || "Unnamed"}</span>
                    <span className="lgl-charbubble-player">by {row.owner_name || "someone"}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {openRow && (
        <>
          <button className="lgl-inline-link2" style={{ marginBottom: 18 }} onClick={() => setOpenId(null)}>← Back to all characters</button>
          <div className="lgl-pcdetail-by">by {openRow.owner_name}</div>
          <CharacterSheet character={openRow.data} />
        </>
      )}
    </article>
  );
}

/* ============================================ HEROES OF LOGLANDIA ========== */
/* A personal, player-editable page per hero: portrait, an optional link to
   a saved character sheet, a bio, and freeform sections the player adds
   themselves. No login system — any of the trusted ~7 can edit any page,
   but editing requires deliberately clicking into an edit mode first, so
   browsing never risks an accidental change. */

const DEFAULT_HERO_BLOCKS = [
  { title: "Fun Facts", body: "" },
  { title: "How I Built Them", body: "" },
];

function AvatarUpload({ value, onChange }) {
  const [preview, setPreview] = useState(value || "");
  const [state, setState] = useState("idle"); // idle | uploading | too-big | error
  const inputRef = useRef(null);

  useEffect(() => { setPreview(value || ""); }, [value]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file twice still fires onChange
    if (!file) return;
    if (file.size > HERO_IMAGE_MAX_MB * 1024 * 1024) { setState("too-big"); return; }
    setPreview(URL.createObjectURL(file)); // instant local preview, before the upload finishes
    setState("uploading");
    try {
      const url = await supaStorageUpload(HERO_BUCKET, file);
      onChange(url);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="lgl-avatar-upload">
      {preview ? <img src={preview} alt="" className="lgl-avatar-preview" /> : <div className="lgl-avatar-preview lgl-avatar-empty"><UserPlus size={28} /></div>}
      <div className="lgl-avatar-upload-controls">
        <button type="button" className="lgl-avatar-btn" onClick={() => inputRef.current?.click()} disabled={!SUPABASE_READY}>
          {value ? "Change Portrait" : "Upload Portrait"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
        {!SUPABASE_READY && <span className="lgl-avatar-status is-warn">Backend not configured yet.</span>}
        {state === "uploading" && <span className="lgl-avatar-status">Uploading…</span>}
        {state === "too-big" && <span className="lgl-avatar-status is-warn">That file's over {HERO_IMAGE_MAX_MB}MB — try a smaller one.</span>}
        {state === "error" && <span className="lgl-avatar-status is-warn">Upload failed. Try again?</span>}
      </div>
    </div>
  );
}

function HeroBlocksEditor({ blocks, setBlocks }) {
  const update = (i, field, val) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, [field]: val } : b)));
  const remove = (i) => setBlocks((bs) => bs.filter((_, j) => j !== i));
  const move = (i, dir) => setBlocks((bs) => {
    const j = i + dir;
    if (j < 0 || j >= bs.length) return bs;
    const next = [...bs];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const add = () => setBlocks((bs) => [...bs, { title: "New Section", body: "" }]);

  return (
    <div className="lgl-heroblocks-edit">
      {blocks.map((b, i) => (
        <div className="lgl-heroblock-edit" key={i}>
          <div className="lgl-heroblock-edit-head">
            <input className="lgl-heroblock-title-input" value={b.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="Section title" />
            <div className="lgl-heroblock-edit-controls">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} title="Move down">↓</button>
              <button type="button" onClick={() => remove(i)} title="Remove this section" className="is-danger">✕</button>
            </div>
          </div>
          <textarea className="lgl-heroblock-body-input" value={b.body} onChange={(e) => update(i, "body", e.target.value)} rows={4} placeholder="Write whatever you want here." />
        </div>
      ))}
      <button type="button" className="lgl-heroblock-add" onClick={add}>+ Add a Section</button>
    </div>
  );
}

function HeroDetailPage({ hero, onBack, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [savedId, setSavedId] = useState(hero.id);
  const [playerName, setPlayerName] = useState(hero.player_name || "");
  const [heroName, setHeroName] = useState(hero.hero_name || "");
  const [avatarUrl, setAvatarUrl] = useState(hero.avatar_url || "");
  const [bio, setBio] = useState(hero.bio || "");
  const [blocks, setBlocks] = useState(hero.blocks?.length ? hero.blocks : DEFAULT_HERO_BLOCKS);
  const [characterId, setCharacterId] = useState(hero.character_id || "");
  const [myChars, setMyChars] = useState([]);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | error

  useEffect(() => {
    if (!SUPABASE_READY || !playerName.trim()) { setMyChars([]); return; }
    supaFetch(`characters?owner_name=eq.${encodeURIComponent(playerName.trim())}&select=id,data`)
      .then((rows) => setMyChars(rows || []))
      .catch(() => setMyChars([]));
  }, [playerName]);

  const linkedCharacter = myChars.find((c) => c.id === characterId);

  const cancelEdit = () => {
    setPlayerName(hero.player_name || "");
    setHeroName(hero.hero_name || "");
    setAvatarUrl(hero.avatar_url || "");
    setBio(hero.bio || "");
    setBlocks(hero.blocks?.length ? hero.blocks : DEFAULT_HERO_BLOCKS);
    setCharacterId(hero.character_id || "");
    setEditing(false);
  };

  const save = async () => {
    setSaveState("saving");
    try {
      const payload = {
        player_name: playerName.trim(),
        hero_name: heroName.trim() || "Unnamed Hero",
        avatar_url: avatarUrl,
        bio,
        blocks,
        character_id: characterId || null,
      };
      if (savedId) {
        await supaFetch(`heroes?id=eq.${savedId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        const rows = await supaFetch("heroes", { method: "POST", body: JSON.stringify(payload) });
        if (rows?.[0]?.id) setSavedId(rows[0].id);
      }
      hero.player_name = payload.player_name; hero.hero_name = payload.hero_name;
      hero.avatar_url = payload.avatar_url; hero.bio = payload.bio;
      hero.blocks = payload.blocks; hero.character_id = payload.character_id;
      setSaveState("idle");
      setEditing(false);
      onSaved?.();
    } catch {
      setSaveState("error");
    }
  };

  return (
    <article className="lgl-entry wide lgl-centered lgl-hero-page">
      <button className="lgl-backlink" onClick={onBack}><ChevronLeft size={14} /> All Heroes</button>

      <div className="lgl-hero-editbar">
        {!editing ? (
          <button className="lgl-hero-editbtn" onClick={() => setEditing(true)}><Wrench size={13} /> Edit This Page</button>
        ) : (
          <div className="lgl-hero-editbar-actions">
            <button className="lgl-hero-editbtn is-cancel" onClick={cancelEdit}>Cancel</button>
            <button className="lgl-hero-editbtn is-save" onClick={save} disabled={saveState === "saving"}>{saveState === "saving" ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>
      {saveState === "error" && <div className="lgl-savenote is-warn">Couldn't save. Check your connection and try again.</div>}

      {editing ? (
        <div className="lgl-hero-edit">
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} />
          <div className="lgl-hero-edit-row">
            <label className="lgl-hero-edit-label">Hero's Name
              <input value={heroName} onChange={(e) => setHeroName(e.target.value)} placeholder="Your character's name" />
            </label>
            <label className="lgl-hero-edit-label">Player
              <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" />
            </label>
          </div>
          <label className="lgl-hero-edit-label">
            Link a saved character (optional)
            <select value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
              <option value="">— none —</option>
              {myChars.map((c) => <option key={c.id} value={c.id}>{c.data?.name || "Unnamed"}</option>)}
            </select>
          </label>
          <label className="lgl-hero-edit-label">
            Bio
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="A few lines about them." />
          </label>
          <HeroBlocksEditor blocks={blocks} setBlocks={setBlocks} />
        </div>
      ) : (
        <>
          <header className="lgl-entry-head">
            {avatarUrl
              ? <img src={avatarUrl} alt={heroName} className="lgl-art lgl-art-real" />
              : <div className="lgl-art" aria-hidden="true"><span>no portrait yet</span></div>}
            <h1>{heroName || "Unnamed Hero"}</h1>
            <p className="lgl-tagline">Played by {playerName || "someone mysterious"}</p>
          </header>
          {bio && <p className="lgl-lore lgl-prewrap">{bio}</p>}
          {linkedCharacter && (
            <section className="lgl-block">
              <h2 className="lgl-h2">Character Sheet</h2>
              <CharacterSheet character={linkedCharacter.data} />
            </section>
          )}
          {blocks.filter((b) => b.body?.trim()).map((b, i) => (
            <section className="lgl-heroblock" key={i}>
              <h2 className="lgl-h2">{b.title}</h2>
              <p className="lgl-lore lgl-prewrap">{b.body}</p>
            </section>
          ))}
        </>
      )}
    </article>
  );
}

function HeroesModule() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [openId, setOpenId] = useState(null);

  const load = () => {
    if (!SUPABASE_READY) { setState("not-configured"); return; }
    setState("loading");
    supaFetch("heroes?select=*&order=created_at.desc")
      .then((data) => { setRows(data || []); setState("done"); })
      .catch(() => setState("error"));
  };
  useEffect(load, []);

  const openRow = rows.find((r) => r.id === openId);

  if (openId === "__new__" || openRow) {
    const hero = openRow || { id: null, player_name: "", hero_name: "", avatar_url: "", bio: "", blocks: [], character_id: "" };
    return (
      <ModuleShell>
        <HeroDetailPage hero={hero} onBack={() => { setOpenId(null); load(); }} onSaved={load} />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell>
      <article className="lgl-entry wide lgl-centered">
        <header className="lgl-entry-head">
          <div className="lgl-eyebrow">Codex · Player Pages</div>
          <h1>Heroes of Loglandia</h1>
          <p className="lgl-tagline">Every hero the party has brought to life — pictures, sheets, and whatever else the player wants people to know.</p>
        </header>

        {state === "not-configured" && (
          <div className="lgl-savenote" style={{ maxWidth: 480, margin: "0 auto" }}>
            This isn't connected to a backend yet. Once Supabase is set up, hero pages saved here will show up for everyone.
          </div>
        )}
        {state === "loading" && <p className="lgl-muted">Loading…</p>}
        {state === "error" && <p className="lgl-muted">Couldn't load heroes just now. Try refreshing.</p>}

        {state === "done" && (
          <>
            <button className="lgl-make-btn lgl-hero-addbtn" onClick={() => setOpenId("__new__")}>+ Add Your Hero</button>
            {rows.length === 0 ? (
              <p className="lgl-muted">Nobody's added a hero page yet. Be the first.</p>
            ) : (
              <div className="lgl-herogrid">
                {rows.map((h) => (
                  <button key={h.id} className="lgl-herocard" onClick={() => setOpenId(h.id)}>
                    {h.avatar_url
                      ? <img src={h.avatar_url} alt="" className="lgl-herocard-img" />
                      : <div className="lgl-herocard-img lgl-herocard-img-empty"><UserPlus size={26} /></div>}
                    <div className="lgl-herocard-name">{h.hero_name || "Unnamed Hero"}</div>
                    <div className="lgl-herocard-player">played by {h.player_name || "someone"}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </article>
    </ModuleShell>
  );
}

/* Shared ordering so the Codex nav matches the character builder exactly:
   Human first, then by subrace count desc, then alphabetical. */
function sortLikeBuilder(list) {
  return [...list].sort((a, b) => {
    if (a.id === "human") return -1;
    if (b.id === "human") return 1;
    const as = a.subraces?.length || 0, bs = b.subraces?.length || 0;
    if (bs !== as) return bs - as;
    return a.name.localeCompare(b.name);
  });
}

/* Groups a section's entries into labelled buckets. Races use the builder's
   categories; everything else falls into one unlabelled bucket. */
function groupSection(key, items) {
  if (key === "races") {
    return RACE_CATEGORIES
      .map((cat) => ({ label: cat, items: sortLikeBuilder(items.filter((r) => r.category === cat)) }))
      .filter((g) => g.items.length);
  }
  if (key === "gods") {
    return GOD_TYPE_ORDER
      .map((t) => ({
        label: t === "Planned" ? "Planned Gods" : t,
        items: items.filter((g) => godTypeOf(g) === t).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.items.length);
  }
  if (key === "regions") {
    const order = ["Plane", "Elemental Plane", "Lower Plane", "Cosmology", "The Underground"];
    const typeOf = (r) => { const parts = (r.eyebrow || "").split(" · "); return parts[parts.length - 1].trim() || "Other"; };
    const seen = [...new Set(items.map(typeOf))].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
    return seen.map((t) => ({ label: t, items: items.filter((r) => typeOf(r) === t).sort((a, b) => a.name.localeCompare(b.name)) }));
  }
  return [{ label: null, items }];
}

function WikiModule({ params }) {
  const [selectedId, setSelectedId] = useState(params?.entryId || null);
  const [sectionView, setSectionView] = useState(null);
  const [query, setQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  const [history, setHistory] = useState([]); // stack of past { selectedId, sectionView } views, for the Back button
  useEffect(() => { if (params?.entryId) { setSelectedId(params.entryId); setSectionView(null); } }, [params?.entryId]);
  useEffect(() => { document.querySelector(".lgl-main")?.scrollTo({ top: 0, behavior: "auto" }); }, [selectedId, sectionView]);
  const entry = Object.values(CONTENT).flat().find((e) => e.id === selectedId);
  const q = query.trim().toLowerCase();
  const pushHistory = () => setHistory((h) => [...h, { selectedId, sectionView }]);
  const openEntry = (id) => { pushHistory(); setSelectedId(id); setSectionView(null); };
  const openSection = (key) => { pushHistory(); setSectionView(key); setSelectedId(null); };
  const goHome = () => { pushHistory(); setSelectedId(null); setSectionView(null); };
  const goBack = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setSelectedId(prev.selectedId);
      setSectionView(prev.sectionView);
      return h.slice(0, -1);
    });
  };
  const toggleSection = (key) => setExpandedSections((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const aside = (
    <nav className="lgl-side" aria-label="Lore navigation">
      <div className="lgl-side-head">Codex</div>
      <div className="lgl-search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the codex…" aria-label="Search the codex" /></div>
      <div className="lgl-nav-scroll">
        <button className={"lgl-nav-item lgl-nav-home" + (!selectedId && !sectionView ? " is-active" : "")} onClick={goHome}><BookOpen size={13} /> Codex Home</button>
        <button className={"lgl-nav-item lgl-nav-home" + (selectedId === WIKI_TIMELINE ? " is-active" : "")} onClick={() => openEntry(WIKI_TIMELINE)}><Clock size={13} /> Timeline</button>
        <button className={"lgl-nav-item lgl-nav-home" + (selectedId === WIKI_PCGALLERY ? " is-active" : "")} onClick={() => openEntry(WIKI_PCGALLERY)}><UserPlus size={13} /> Characters Made in Character Builder</button>
        <button className={"lgl-nav-item lgl-nav-home" + (selectedId === WIKI_TALES ? " is-active" : "")} onClick={() => openEntry(WIKI_TALES)}><Scroll size={13} /> Tales</button>
        {WIKI_SECTIONS.map((sec) => {
          const items = (CONTENT[sec.key] || []).filter((it) => !it.codexHidden).filter((it) => !q || it.name.toLowerCase().includes(q) || (it.tagline || "").toLowerCase().includes(q));
          if (q && items.length === 0) return null;
          const groups = groupSection(sec.key, items);
          const isOpen = expandedSections.has(sec.key)
            || (!!selectedId && items.some((it) => it.id === selectedId))
            || (!!q && items.length > 0);
          return (
            <div className="lgl-nav-group" key={sec.key}>
              <button
                className={"lgl-nav-label lgl-nav-label-btn" + (sectionView === sec.key ? " is-active" : "")}
                onClick={() => { toggleSection(sec.key); openSection(sec.key); }}
                aria-expanded={isOpen}
              >
                {sec.label}
                <ChevronRight size={12} className={"lgl-nav-label-chevron" + (isOpen ? " is-open" : "")} />
              </button>
              {isOpen && (
                <>
                  {items.length === 0 ? <div className="lgl-nav-empty">Coming soon</div> :
                    groups.map((g) => (
                      <div className="lgl-nav-subgroup" key={g.label || "all"}>
                        {g.label && <div className="lgl-nav-sublabel">{g.label}</div>}
                        {g.items.map((it) => (
                          <button key={it.id} className={"lgl-nav-item" + (it.id === selectedId ? " is-active" : "")} onClick={() => openEntry(it.id)}>
                            {it.name}{it.subraces?.length > 0 && <span className="lgl-nav-count">+{it.subraces.length}</span>}{it.isNew && <span className="lgl-dot" title="New" />}
                          </button>
                        ))}
                      </div>
                    ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
  return (
    <ModuleShell aside={aside} asideTitle="Codex">
      {history.length > 0 && (
        <button className="lgl-backlink lgl-codex-back" onClick={goBack}><ChevronLeft size={14} /> Back</button>
      )}
      {selectedId === WIKI_TIMELINE ? <TimelineModule embedded />
        : selectedId === WIKI_PCGALLERY ? <CharacterGallery />
        : selectedId === WIKI_TALES ? <TalesModule embedded />
        : selectedId ? <EntryPage entry={entry} onOpenEntry={openEntry} />
        : sectionView ? <SectionLanding sectionKey={sectionView} onOpenEntry={openEntry} />
        : <WikiHome onOpenEntry={openEntry} onOpenTimeline={() => openEntry(WIKI_TIMELINE)} onOpenSection={openSection} onOpenPCGallery={() => openEntry(WIKI_PCGALLERY)} onOpenTales={() => openEntry(WIKI_TALES)} />}
    </ModuleShell>
  );
}

/* Landing screen for a whole Codex section — every entry as a small bubble,
   grouped by the same categories the builder uses. */
function SectionLanding({ sectionKey, onOpenEntry }) {
  const sec = WIKI_SECTIONS.find((s) => s.key === sectionKey);
  const items = (CONTENT[sectionKey] || []).filter((it) => !it.codexHidden);
  if (sectionKey === "gods") {
    return (
      <article className="lgl-entry wide lgl-centered">
        <header className="lgl-entry-head">
          <div className="lgl-eyebrow">Codex</div>
          <h1>Gods</h1>
        </header>
        <GodLanding onOpenEntry={onOpenEntry} />
      </article>
    );
  }
  const groups = groupSection(sectionKey, items);
  const Icon = WIKI_SECTION_ICONS[sectionKey] || BookOpen;
  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Codex</div>
        <h1>{sec?.label || "Entries"}</h1>
        <p className="lgl-tagline">{items.length} {items.length === 1 ? "entry" : "entries"}. Pick one to read it.</p>
      </header>
      {items.length === 0 ? (
        <div className="lgl-racestep-empty">Nothing here yet.</div>
      ) : groups.map((g) => (
        <section className="lgl-bubblegroup" key={g.label || "all"}>
          {g.label && (
            <div className="lgl-bubblegroup-label">
              <Icon size={13} /> {g.label}
              <span className="lgl-bubblegroup-count">{g.items.length}</span>
            </div>
          )}
          <div className="lgl-bubbles">
            {g.items.map((it) => (
              <button key={it.id} className="lgl-bubble" onClick={() => onOpenEntry(it.id)} title={it.tagline || it.name}>
                {it.name}
                {it.subraces?.length > 0 && <span className="lgl-bubble-count">+{it.subraces.length}</span>}
                {it.isNew && <span className="lgl-dot" title="New" />}
              </button>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}

/* ===================================================== MODULE: BUILDER ===== */
const BUILD_STEPS = ["Race", "Legacy Traits", "Class", "Background", "Ability Scores", "Skills & Proficiencies", "Spells", "Final Details"];
const RACE_CATEGORIES = ["Standard", "Godmarked", "Half-Beasts", "Not Finished"];
const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ALL_SKILLS = ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"];

/* Pulls real skill names out of a trait/feature note's free text, handling both
   "Proficiency in X and Y" phrasing and the doc's "Prof X+Y" / "Prof X, Y" shorthand. */
function extractSkillsFromText(text) {
  if (!text) return [];
  const found = new Set();
  const m = text.match(/(?:Proficiency in|Prof\.?)\s+([^.;]+)/i);
  const chunk = m ? m[1] : text;
  ALL_SKILLS.forEach((skill) => {
    const re = new RegExp(`\\b${skill.replace(/ /g, "\\s")}\\b`, "i");
    if (re.test(chunk)) found.add(skill);
  });
  return [...found];
}

const LOGPENDIUM_URL = "https://thelogpenduim.netlify.app/";
const LOGPENDIUM_READY = true;

const CLASS_ICONS = {
  barbarian: Dumbbell, bard: Music, cleric: Cross, druid: Leaf, fighter: Swords, monk: Hand,
  paladin: ShieldCheck, ranger: Crosshair, rogue: Eye, sorcerer: Sparkles, warlock: Skull, wizard: BookOpen,
  swordsaint: Swords, favoredsoul: Wand2,
};

const LOGLANDIA_CLASSES = [
  { id: "swordsaint", name: "Sword Saint", blurb: "A martial master who channels focus through blade and discipline.", hitDie: "d10", primary: "DEX or STR", saves: "STR, DEX", caster: "Focus (Sword Saint)",
    skillChoice: { count: 2, options: ["Acrobatics", "Athletics", "History", "Insight", "Perception", "Stealth"] } },
  { id: "favoredsoul", name: "Favored Soul", blurb: "Touched by divine power — not through faith, but by blood or fate.", hitDie: "d8", primary: "CHA or WIS", saves: "CON, CHA", caster: "Full caster",
    skillChoice: { count: 2, options: ["Arcana", "History", "Insight", "Medicine", "Persuasion", "Religion"] },
    spellInfo: { ability: "CHA", cantrips: 2, note: "Favored Soul full mechanical details are coming soon. The framework is in place — check back." } },
];

const CLASSES = [
  { id: "barbarian", name: "Barbarian", blurb: "Rage-fueled frontline brute.", hitDie: "d12", primary: "STR", saves: "STR, CON", caster: "None",
    skillChoice: { count: 2, options: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"] } },
  { id: "bard", name: "Bard", blurb: "Magical jack-of-all-trades and support.", hitDie: "d8", primary: "CHA", saves: "DEX, CHA", caster: "Full caster",
    skillChoice: { count: 3, options: ALL_SKILLS },
    spellInfo: { ability: "CHA", cantrips: 2, known: "4 spells known (not prepared)" } },
  { id: "cleric", name: "Cleric", blurb: "Divine caster and healer.", hitDie: "d8", primary: "WIS", saves: "WIS, CHA", caster: "Full caster",
    skillChoice: { count: 2, options: ["History", "Insight", "Medicine", "Persuasion", "Religion"] },
    spellInfo: { ability: "WIS", cantrips: 3, known: "Prepared spells = WIS modifier + level (minimum 1), from the entire Cleric list" } },
  { id: "druid", name: "Druid", blurb: "Nature caster and shapeshifter.", hitDie: "d8", primary: "WIS", saves: "INT, WIS", caster: "Full caster",
    skillChoice: { count: 2, options: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"] },
    spellInfo: { ability: "WIS", cantrips: 2, known: "Prepared spells = WIS modifier + level (minimum 1), from the entire Druid list" } },
  { id: "fighter", name: "Fighter", blurb: "Master of weapons and armor.", hitDie: "d10", primary: "STR or DEX", saves: "STR, CON", caster: "None",
    skillChoice: { count: 2, options: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"] } },
  { id: "monk", name: "Monk", blurb: "Martial artist channeling ki.", hitDie: "d8", primary: "DEX & WIS", saves: "STR, DEX", caster: "None",
    skillChoice: { count: 2, options: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"] } },
  { id: "paladin", name: "Paladin", blurb: "Holy warrior bound by an oath.", hitDie: "d10", primary: "STR & CHA", saves: "WIS, CHA", caster: "Half caster",
    skillChoice: { count: 2, options: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"] },
    spellInfo: { ability: "CHA", note: "Paladins don't gain spellcasting until 2nd level. Nothing to pick yet at character creation." } },
  { id: "ranger", name: "Ranger", blurb: "Wilderness hunter and tracker.", hitDie: "d10", primary: "DEX & WIS", saves: "STR, DEX", caster: "Half caster",
    skillChoice: { count: 3, options: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"] },
    spellInfo: { ability: "WIS", note: "Rangers don't gain spellcasting until 2nd level. Nothing to pick yet at character creation." } },
  { id: "rogue", name: "Rogue", blurb: "Stealthy skirmisher and skill expert.", hitDie: "d8", primary: "DEX", saves: "DEX, INT", caster: "None",
    skillChoice: { count: 4, options: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"] } },
  { id: "sorcerer", name: "Sorcerer", blurb: "Innate arcane caster with raw power.", hitDie: "d6", primary: "CHA", saves: "CON, CHA", caster: "Full caster",
    skillChoice: { count: 2, options: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"] },
    spellInfo: { ability: "CHA", cantrips: 4, known: "2 spells known" } },
  { id: "warlock", name: "Warlock", blurb: "Pact-bound caster with eldritch power.", hitDie: "d8", primary: "CHA", saves: "WIS, CHA", caster: "Pact Magic",
    skillChoice: { count: 2, options: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"] },
    spellInfo: { ability: "CHA", cantrips: 2, known: "2 spells known. Pact Magic slots are few but recharge on a Short Rest, not a Long Rest." } },
  { id: "wizard", name: "Wizard", blurb: "Scholarly arcane caster with a spellbook.", hitDie: "d6", primary: "INT", saves: "INT, WIS", caster: "Full caster",
    skillChoice: { count: 2, options: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"] },
    spellInfo: { ability: "INT", cantrips: 3, known: "6 spells in your spellbook; prepared spells = INT modifier + level (minimum 1)" } },
];

const BACKGROUNDS = [
  { id: "acolyte", name: "Acolyte", blurb: "Raised in service to a temple or faith.", skills: "Insight, Religion", tools: "—", languages: "Two of your choice", feature: "Shelter of the Faithful", featureNote: "You and your companions can receive free healing and care at temples of your faith, and you have a contact among its clergy." },
  { id: "charlatan", name: "Charlatan", blurb: "A practiced liar and con artist.", skills: "Deception, Sleight of Hand", tools: "Disguise kit, forgery kit", languages: "—", feature: "False Identity", featureNote: "You have a second identity complete with documentation, contacts, and disguises to assume it." },
  { id: "criminal", name: "Criminal", blurb: "An associate of the criminal underworld.", skills: "Deception, Stealth", tools: "One gaming set, thieves' tools", languages: "—", feature: "Criminal Contact", featureNote: "You have a reliable contact who acts as your liaison to a criminal network." },
  { id: "entertainer", name: "Entertainer", blurb: "A performer who lives for the crowd.", skills: "Acrobatics, Performance", tools: "One musical instrument", languages: "—", feature: "By Popular Demand", featureNote: "You can always find a place to perform for food and lodging, and your performances earn you a small audience." },
  { id: "folkhero", name: "Folk Hero", blurb: "A commoner who became a local legend.", skills: "Animal Handling, Survival", tools: "One artisan's tools, vehicles (land)", languages: "—", feature: "Rustic Hospitality", featureNote: "Common folk will shelter and provide for you, hiding you from the law if needed." },
  { id: "guildartisan", name: "Guild Artisan", blurb: "A skilled tradesperson with guild backing.", skills: "Insight, Persuasion", tools: "One artisan's tools", languages: "One of your choice", feature: "Guild Membership", featureNote: "Your guild provides lodging and political support, and members will support you in need." },
  { id: "hermit", name: "Hermit", blurb: "Lived in seclusion, for solitude or study.", skills: "Medicine, Religion", tools: "Herbalism kit", languages: "One of your choice", feature: "Discovery", featureNote: "Your seclusion granted you a unique discovery, a great truth, secret, or piece of lost knowledge." },
  { id: "noble", name: "Noble", blurb: "Born to wealth, privilege, and obligation.", skills: "History, Persuasion", tools: "One gaming set", languages: "One of your choice", feature: "Position of Privilege", featureNote: "People assume you have the right to be wherever you are, and merchants extend you credit." },
  { id: "outlander", name: "Outlander", blurb: "Raised in the wilds, far from civilization.", skills: "Athletics, Survival", tools: "One musical instrument", languages: "One of your choice", feature: "Wanderer", featureNote: "You have an excellent memory for maps and geography, and can find food and fresh water for yourself and others." },
  { id: "sage", name: "Sage", blurb: "Spent years in study and research.", skills: "Arcana, History", tools: "—", languages: "Two of your choice", feature: "Researcher", featureNote: "You know where to find information, and if it doesn't exist locally, you know who might have it." },
  { id: "sailor", name: "Sailor", blurb: "Spent your life at sea, on a working ship.", skills: "Athletics, Perception", tools: "Navigator's tools, vehicles (water)", languages: "—", feature: "Ship's Passage", featureNote: "You can secure free passage for yourself and your companions on a ship, in exchange for labor." },
  { id: "soldier", name: "Soldier", blurb: "Served in a military or mercenary company.", skills: "Athletics, Intimidation", tools: "One gaming set, vehicles (land)", languages: "—", feature: "Military Rank", featureNote: "Soldiers loyal to your former military organization recognize your rank and may offer aid." },
  { id: "urchin", name: "Urchin", blurb: "Grew up on the streets, alone and resourceful.", skills: "Sleight of Hand, Stealth", tools: "Disguise kit, thieves' tools", languages: "—", feature: "City Secrets", featureNote: "You know the secret patterns and flow of a city, and can move through it twice as fast when alone." },
];

const CUSTOM_BACKGROUND = {
  id: "custom", name: "Custom Background", isCustom: true,
  blurb: "For the rare story that genuinely doesn't fit any of the above.",
  skills: "2 of your choice", tools: "1 of your choice", languages: "1 of your choice",
  feature: "Make Your Own", featureNote: "No fixed feature comes with this. Talk to your GM about something small that fits your specific backstory instead.",
};
function roll4d6() { const d = [0, 0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b); return d[1] + d[2] + d[3]; }
function abilityMod(score) { const m = Math.floor((score - 10) / 2); return (m >= 0 ? "+" : "") + m; }

/* Parses a race's (and subrace's) actual stat rule text into something computable:
   fixed bonuses/penalties that apply automatically, and "chosen" slots the player
   has to assign themselves (with any exclusions, e.g. Godmarked's "not WIS, STR"). */
function computeStatPlan(race, subrace) {
  const fixed = {};
  const chosenSlots = [];
  if (!race) return { fixed, chosenSlots };
  const statsText = race.facts?.find((f) => f.label === "Stats")?.text || "";

  if (race.id === "kuahono") {
    fixed.CON = 2;
    const m = subrace?.desc?.match(/([A-Z]{3})\+(\d+)\/([A-Z]{3})-(\d+)/);
    if (m) { fixed[m[1]] = (fixed[m[1]] || 0) + Number(m[2]); fixed[m[3]] = (fixed[m[3]] || 0) - Number(m[4]); }
    return { fixed, chosenSlots };
  }
  if (race.id === "grung") {
    const m = statsText.match(/Set \+(\d+) ([A-Z]{3})/);
    if (m) fixed[m[2]] = Number(m[1]);
    return { fixed, chosenSlots };
  }
  if (race.id === "elf") {
    if (subrace) {
      if (subrace.name === "Prime Elf") chosenSlots.push({ amount: 2, exclude: [] }, { amount: 1, exclude: [] });
      else {
        const m = subrace.desc?.match(/([A-Z]{3})\s*\+(\d+)/);
        if (m) fixed[m[1]] = Number(m[2]);
      }
    }
    return { fixed, chosenSlots };
  }

  const setPlus = statsText.match(/Set \+(\d+) ([A-Z]{3})/);
  if (setPlus) fixed[setPlus[2]] = (fixed[setPlus[2]] || 0) + Number(setPlus[1]);
  const setMinus = statsText.match(/Set -(\d+) ([A-Z]{3})/);
  if (setMinus) fixed[setMinus[2]] = (fixed[setMinus[2]] || 0) - Number(setMinus[1]);

  const exclusionMatch = statsText.match(/Chosen \+(\d+) \(not ([^)]+)\)/);
  if (exclusionMatch) {
    chosenSlots.push({ amount: Number(exclusionMatch[1]), exclude: exclusionMatch[2].split(",").map((s) => s.trim().toUpperCase()) });
  } else {
    const genericRe = /Chosen\s*\+(\d+)|\+(\d+)\s*chosen/gi;
    let g;
    while ((g = genericRe.exec(statsText))) {
      const amt = Number(g[1] || g[2]);
      if (amt) chosenSlots.push({ amount: amt, exclude: [] });
    }
  }
  return { fixed, chosenSlots };
}

/* Combines the rolled-and-assigned base scores with the resolved stat plan into
   real final scores. chosenAssign is an array parallel to plan.chosenSlots,
   each entry the ability (or null) the player put that slot's bonus on. */
function getFinalAbilityScores(ab, race, subrace) {
  const plan = computeStatPlan(race, subrace);
  const chosenAssign = ab?.chosenAssign || [];
  const out = {};
  ABILITIES.forEach((a) => {
    const idx = ab?.assign?.[a];
    const base = idx != null ? ab.rolled[idx] : null;
    const fixedBonus = plan.fixed[a] || 0;
    const chosenBonus = plan.chosenSlots.reduce((sum, slot, i) => sum + (chosenAssign[i] === a ? slot.amount : 0), 0);
    const bonus = fixedBonus + chosenBonus;
    out[a] = { base, bonus, final: base != null ? base + bonus : null };
  });
  return { scores: out, plan };
}

function AbilityStep({ character, setCharacter, race }) {
  const subrace = race?.subraces?.find((sr) => sr.name === character.subraceName);
  const ab = character.abilities || { rolled: null, assign: {}, locked: false };
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState([3, 3, 3, 3, 3, 3]);
  const [settled, setSettled] = useState([false, false, false, false, false, false]);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const roll = () => {
    if (ab.locked || rolling) return;
    const final = [0, 1, 2, 3, 4, 5].map(() => roll4d6());
    const settledRef = [false, false, false, false, false, false];
    setRolling(true);
    setSettled([false, false, false, false, false, false]);
    const tumble = setInterval(() => {
      setDisplay((d) => d.map((v, i) => (settledRef[i] ? v : 3 + Math.floor(Math.random() * 16))));
    }, 70);
    timers.current.push(tumble);
    final.forEach((val, i) => {
      const t = setTimeout(() => {
        settledRef[i] = true;
        setDisplay((d) => { const next = [...d]; next[i] = val; return next; });
        setSettled((s) => { const next = [...s]; next[i] = true; return next; });
        if (i === final.length - 1) {
          clearInterval(tumble);
          setDisplay(final); // hard sync: guarantee the chips show exactly what was rolled
          setRolling(false);
          setCharacter((c) => ({ ...c, abilities: { rolled: final, assign: {}, locked: true } }));
        }
      }, 650 + i * 260);
      timers.current.push(t);
    });
  };

  const setAssign = (abil, idx) => setCharacter((c) => {
    const assign = { ...(c.abilities?.assign || {}) };
    Object.keys(assign).forEach((k) => { if (assign[k] === idx) delete assign[k]; });
    if (idx === null) delete assign[abil]; else assign[abil] = idx;
    return { ...c, abilities: { ...c.abilities, assign } };
  });
  const used = new Set(Object.values(ab.assign || {}));
  const statRule = race?.facts?.find((f) => f.label === "Stats")?.text;
  const showPool = ab.locked || rolling;
  const { scores, plan } = getFinalAbilityScores(ab, race, subrace);
  const chosenAssign = ab.chosenAssign || [];
  const setChosen = (slotIdx, abil) => setCharacter((c) => {
    const next = [...(c.abilities?.chosenAssign || [])];
    next[slotIdx] = abil || null;
    return { ...c, abilities: { ...c.abilities, chosenAssign: next } };
  });

  return (
    <div className="lgl-ability">
      <div className="lgl-guide-note" style={{ marginBottom: 18 }}>
        {race ? <>Your race rule: <b>{statRule || "see the race page"}</b>. Rolls are sealed once they land, one set per character.</>
              : <>Pick a race first to see your stat rule here. Either way, you get one sealed roll, then you assign the values.</>}
      </div>

      {!showPool && (
        <button className="lgl-roll-btn" onClick={roll}><Dices size={16} /> Roll 4d6 (drop lowest)</button>
      )}

      {showPool && (
        <>
          <div className={"lgl-roll-pool" + (rolling ? " is-rolling" : "")}>
            {display.map((v, i) => (
              <span key={i} className={"lgl-roll-chip" + (used.has(i) ? " is-used" : "") + (rolling && !settled[i] ? " is-tumbling" : "") + (settled[i] && !used.has(i) ? " is-settled" : "")}>{v}</span>
            ))}
          </div>
          {!rolling && ab.locked && (
            <div className="lgl-roll-sum">
              Total: <strong>{display.reduce((s, v) => s + v, 0)}</strong>
            </div>
          )}
          {ab.locked && !rolling && (
            <div className="lgl-sealed"><Lock size={13} /> Rolls sealed for this character. No rerolling, only reassigning below.</div>
          )}
          {ab.locked && (
            <>
              <div className="lgl-ability-rows">
                {ABILITIES.map((abil) => {
                  const idx = ab.assign?.[abil];
                  const val = idx != null ? ab.rolled[idx] : null;
                  return (
                    <div className="lgl-ability-row" key={abil}>
                      <span className="lgl-ability-name">{abil}</span>
                      <select value={idx != null ? idx : ""} onChange={(e) => setAssign(abil, e.target.value === "" ? null : Number(e.target.value))}>
                        <option value="">—</option>
                        {ab.rolled.map((v, i) => <option key={i} value={i} disabled={used.has(i) && idx !== i}>{v}</option>)}
                      </select>
                      <span className="lgl-ability-mod">{val != null ? abilityMod(val) : ""}</span>
                    </div>
                  );
                })}
              </div>

              {race && (plan.chosenSlots.length > 0) && (
                <div className="lgl-recapblock">
                  <div className="lgl-recapblock-title">Where Does {race.name}'s Chosen Bonus Go?</div>
                  {plan.chosenSlots.map((slot, i) => {
                    const usedByOtherSlots = chosenAssign.filter((_, j) => j !== i);
                    const options = ABILITIES.filter((a) => !slot.exclude.includes(a) && !usedByOtherSlots.includes(a));
                    return (
                      <label className="lgl-fd-field" key={i} style={{ display: "inline-flex", flexDirection: "row", alignItems: "center", gap: 10, margin: "0 8px 10px" }}>
                        <span>+{slot.amount}{slot.exclude.length > 0 ? ` (not ${slot.exclude.join(", ")})` : ""}</span>
                        <select value={chosenAssign[i] || ""} onChange={(e) => setChosen(i, e.target.value)}>
                          <option value="">Pick…</option>
                          {options.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="lgl-recapblock">
                <div className="lgl-recapblock-title">Final Scores{race ? ` (with ${race.name}'s bonus applied)` : " (base, no race picked yet)"}</div>
                <div className="lgl-recapability-row">
                  {ABILITIES.map((a) => {
                    const s = scores[a];
                    return (
                      <div className="lgl-recapability" key={a}>
                        <span className="lgl-recapability-name">{a}</span>
                        <span className="lgl-recapability-val">{s.final != null ? s.final : "—"}</span>
                        <span className="lgl-recapability-mod">
                          {s.final != null ? abilityMod(s.final) : ""}
                          {s.bonus !== 0 && s.base != null && <span className="lgl-recapability-bonus"> ({s.base}{s.bonus > 0 ? "+" : ""}{s.bonus})</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ClassStep({ character, setCharacter }) {
  const allClasses = [...CLASSES, ...LOGLANDIA_CLASSES];
  const selected = allClasses.find((c) => c.id === character.classId);
  const pickClass = (id) => setCharacter((ch) => ({ ...ch, classId: id }));
  return (
    <div className="lgl-classstep">
      <p className="lgl-lore">Pick a class for the essentials — hit die, primary ability, saves, and casting.</p>

      <div className="lgl-grid">
        {CLASSES.map((c) => {
          const Icon = CLASS_ICONS[c.id];
          return (
            <button key={c.id} className={"lgl-pick lgl-classpick" + (c.id === character.classId ? " is-active" : "")} onClick={() => pickClass(c.id)}>
              <span className="lgl-classpick-icon">{Icon && <Icon size={22} />}</span>
              <span className="lgl-card-name">{c.name}</span>
            </button>
          );
        })}
      </div>

      <div className="lgl-loglandia-class-section">
        <div className="lgl-loglandia-class-label">
          <Gem size={13} /> Loglandia Classes
        </div>
        <div className="lgl-grid">
          {LOGLANDIA_CLASSES.map((c) => {
            const Icon = CLASS_ICONS[c.id];
            return (
              <button key={c.id} className={"lgl-pick lgl-classpick lgl-classpick-loglandia" + (c.id === character.classId ? " is-active" : "")} onClick={() => pickClass(c.id)}>
                <span className="lgl-classpick-icon">{Icon && <Icon size={22} />}</span>
                <span className="lgl-card-name">{c.name}</span>
                <span className="lgl-classpick-homebrew">Loglandia</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="lgl-racedetail">
          <div className="lgl-racedetail-head"><span>{selected.name}</span></div>
          <Facts facts={[
            { label: "Hit Die", text: selected.hitDie },
            { label: "Primary", text: selected.primary },
            { label: "Saves", text: selected.saves },
            { label: "Casting", text: selected.caster },
          ]} />
        </div>
      )}
    </div>
  );
}

function BackgroundStep({ character, setCharacter }) {
  const selected = [...BACKGROUNDS, CUSTOM_BACKGROUND].find((b) => b.id === character.backgroundId);
  const pick = (id) => setCharacter((ch) => ({ ...ch, backgroundId: id }));
  return (
    <div className="lgl-classstep">
      <p className="lgl-lore">A background is about backstory more than mechanics. Sketch the gist below if you want, then pick whichever fits it best.</p>

      <label className="lgl-fd-field" style={{ maxWidth: 520, margin: "0 auto 26px" }}>
        <span>Your Backstory (optional)</span>
        <textarea
          className="lgl-backstory-input"
          rows={3}
          value={character.backstory || ""}
          onChange={(e) => setCharacter((c) => ({ ...c, backstory: e.target.value }))}
          placeholder="A sentence or two on where they came from, before the stats..."
        />
      </label>

      <div className="lgl-grid">
        {BACKGROUNDS.map((b) => (
          <button key={b.id} className={"lgl-pick" + (b.id === character.backgroundId ? " is-active" : "")} onClick={() => pick(b.id)}>
            <span className="lgl-card-name">{b.name}</span>
            <span className="lgl-card-note">{b.blurb}</span>
          </button>
        ))}
      </div>

      <div className="lgl-custombg-divider"><span>If truly none of those fit</span></div>
      <button className={"lgl-custombg-card" + (character.backgroundId === "custom" ? " is-active" : "")} onClick={() => pick("custom")}>
        <span className="lgl-custombg-warn">Last resort, not a first pick</span>
        <span className="lgl-card-name">{CUSTOM_BACKGROUND.name}</span>
        <span className="lgl-card-note">{CUSTOM_BACKGROUND.blurb}</span>
      </button>

      {selected && (
        <div className="lgl-racedetail">
          <div className="lgl-racedetail-head"><span>{selected.name}</span></div>
          <Facts facts={[
            { label: "Skills", text: selected.skills },
            { label: "Tools", text: selected.tools },
            { label: "Languages", text: selected.languages },
          ]} />
          <div className="lgl-bg-feature">
            <span className="lgl-bg-feature-name">{selected.feature}</span>
            <span className="lgl-bg-feature-note">{selected.featureNote}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* Skills granted automatically by race (built-ins + the 3 chosen legacy traits,
   including a subrace's automatic (built-in) features) — shared by SkillsStep
   and the final character sheet recap. */
function computeAutoSkillsFromRace(race, subrace, legacyPicks) {
  const auto = new Set();
  (race?.builtins || []).forEach((t) => extractSkillsFromText(t.note).forEach((s) => auto.add(s)));
  (legacyPicks || []).forEach((p) => {
    let pool;
    if (p.source === "base") pool = race?.legacy;
    else if (p.source === "sub") pool = subrace?.traits;
    else {
      const cat = UNIVERSAL_LEGACY_TRAIT_CATEGORIES.find((c) => c.id === p.source);
      pool = cat?.traits;
    }
    const t = pool?.find((x) => x.name === p.name);
    if (t) extractSkillsFromText(t.note).forEach((s) => auto.add(s));
  });
  if (subrace) {
    subrace.traits.filter((t) => /^\(built-in\)/i.test(t.note)).forEach((t) => extractSkillsFromText(t.note).forEach((s) => auto.add(s)));
  }
  return auto;
}

function SkillsStep({ character, setCharacter }) {
  const race = CONTENT.races.find((r) => r.id === character.raceId);
  const subrace = race?.subraces?.find((sr) => sr.name === character.subraceName);
  const cls = [...CLASSES, ...LOGLANDIA_CLASSES].find((c) => c.id === character.classId);
  const bg = [...BACKGROUNDS, CUSTOM_BACKGROUND].find((b) => b.id === character.backgroundId);

  if (!cls) {
    return <div className="lgl-empty-page">Pick a class first (Step 3). Your skill choice comes from there.</div>;
  }

  const autoFromRace = computeAutoSkillsFromRace(race, subrace, character.legacyPicks);
  const autoFromBg = new Set((bg?.skills || "").split(",").map((s) => s.trim()).filter((s) => ALL_SKILLS.includes(s)));
  const autoSkills = [...new Set([...autoFromRace, ...autoFromBg])].sort();

  const choice = cls.skillChoice;
  const chosen = character.skillChoices || [];
  const toggle = (skill) => {
    setCharacter((c) => {
      const cur = c.skillChoices || [];
      if (cur.includes(skill)) return { ...c, skillChoices: cur.filter((s) => s !== skill) };
      if (choice && cur.length >= choice.count) return c;
      return { ...c, skillChoices: [...cur, skill] };
    });
  };

  const allUnlocked = [...new Set([...autoSkills, ...chosen])].sort();

  return (
    <div>
      <p className="lgl-lore">Skills come from three places: automatic grants from your race and background, plus a choice from your class. Here's everything in one spot.</p>

      {autoSkills.length > 0 && (
        <div className="lgl-recapblock" style={{ marginTop: 10 }}>
          <div className="lgl-recapblock-title">Automatically Granted — Race &amp; Background</div>
          <div className="lgl-skillchip-row">
            {autoSkills.map((s) => <span className="lgl-skillchip is-auto" key={s}>{s}</span>)}
          </div>
        </div>
      )}

      {choice && (
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">Choose {choice.count} from {cls.name}'s List</div>
          <div className="lgl-skillchip-row">
            {choice.options.map((s) => {
              const alreadyHave = autoSkills.includes(s);
              const active = chosen.includes(s);
              const disabled = alreadyHave || (!active && chosen.length >= choice.count);
              return (
                <button key={s} className={"lgl-skillchip lgl-skillchip-pick" + (active ? " is-active" : "") + (disabled ? " is-disabled" : "")} onClick={() => toggle(s)} disabled={disabled} title={alreadyHave ? "Already granted by race or background" : undefined}>
                  {s}{alreadyHave && <span className="lgl-skillchip-tag"> already have</span>}
                </button>
              );
            })}
          </div>
          <p className="lgl-muted">{chosen.length} of {choice.count} chosen.</p>
        </div>
      )}

      <div className="lgl-recapblock">
        <div className="lgl-recapblock-title">Every Skill You've Unlocked</div>
        {allUnlocked.length === 0 ? <p className="lgl-muted">None yet — pick a race, background, or class skill above.</p> : (
          <div className="lgl-skillchip-row">
            {allUnlocked.map((s) => <span className="lgl-skillchip is-final" key={s}>{s}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function SpellsStep({ character }) {
  const cls = [...CLASSES, ...LOGLANDIA_CLASSES].find((c) => c.id === character.classId);
  if (!cls) {
    return <div className="lgl-empty-page">Pick a class first (Step 3). Whether you cast anything depends on that.</div>;
  }
  if (cls.caster === "None") {
    return <div className="lgl-guide-note" style={{ textAlign: "center" }}>{cls.name}s don't cast spells. Nothing to do on this step, skip ahead to Final Details.</div>;
  }
  const info = cls.spellInfo || {};
  return (
    <div>
      <p className="lgl-lore">This step only tells you what you're entitled to as a {cls.name}. Actually picking spells happens on the Logpendium, not here.</p>
      <div className="lgl-recapgrid">
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Casting Ability</div>
          <div className="lgl-recapcard-value">{info.ability || cls.primary}</div>
        </div>
        {info.cantrips != null && (
          <div className="lgl-recapcard">
            <div className="lgl-recapcard-label">Cantrips Known</div>
            <div className="lgl-recapcard-value">{info.cantrips}</div>
          </div>
        )}
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Caster Type</div>
          <div className="lgl-recapcard-value">{cls.caster}</div>
        </div>
      </div>
      {info.known && <p className="lgl-lore" style={{ textAlign: "center" }}>{info.known}</p>}
      {info.note && <div className="lgl-guide-note">{info.note}</div>}

      {!info.note && (
        <div className="lgl-logpendium-box">
          <p className="lgl-lore" style={{ marginBottom: 22 }}>Your entitlements are above. Now head to the Logpendium to actually pick your spells.</p>
          <a className="lgl-logpendium-btn" href={LOGPENDIUM_URL} target="_blank" rel="noreferrer">
            <span className="lgl-logpendium-btn-inner">
              <Sparkles size={18} className="lgl-logpendium-star lgl-logpendium-star-l" />
              <span className="lgl-logpendium-btn-text">Open the Logpendium</span>
              <Sparkles size={18} className="lgl-logpendium-star lgl-logpendium-star-r" />
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

/* Shared, read-only recap renderer — used by the live Builder (Final Details)
   and by the Codex's Player Characters gallery for any saved character. */
function CharacterSheet({ character }) {
  const race = CONTENT.races.find((r) => r.id === character.raceId);
  const subrace = race?.subraces?.find((sr) => sr.name === character.subraceName);
  const cls = [...CLASSES, ...LOGLANDIA_CLASSES].find((c) => c.id === character.classId);
  const bg = [...BACKGROUNDS, CUSTOM_BACKGROUND].find((b) => b.id === character.backgroundId);
  const campaign = [...CHARACTER_CAMPAIGNS, JUST_FOR_FUN].find((c) => c.id === character.campaignId);
  const ab = character.abilities || {};
  const hasAbilities = ab.rolled && ab.assign;
  const legacyDetails = (character.legacyPicks || []).map((p) => {
    let pool, sourceLabel;
    if (p.source === "base") { pool = race?.legacy; sourceLabel = race?.name; }
    else if (p.source === "sub") { pool = subrace?.traits; sourceLabel = subrace?.name; }
    else {
      const cat = UNIVERSAL_LEGACY_TRAIT_CATEGORIES.find((c) => c.id === p.source);
      pool = cat?.traits;
      sourceLabel = cat?.name;
    }
    const t = pool?.find((x) => x.name === p.name);
    return t ? { ...t, sourceLabel } : null;
  }).filter(Boolean);

  return (
    <div className="lgl-finaldetails">
      <div className="lgl-recapgrid">
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Race</div>
          <div className="lgl-recapcard-value">{race ? race.name : "—"}{subrace ? ` · ${subrace.name}` : ""}</div>
        </div>
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Class</div>
          <div className="lgl-recapcard-value">{cls ? cls.name : "—"}</div>
        </div>
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Background</div>
          <div className="lgl-recapcard-value">{bg ? bg.name : "—"}</div>
        </div>
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Campaign</div>
          <div className="lgl-recapcard-value">{campaign ? campaign.name : "—"}</div>
        </div>
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Name</div>
          <div className="lgl-recapcard-value">{character.name || "—"}</div>
        </div>
        <div className="lgl-recapcard">
          <div className="lgl-recapcard-label">Alignment</div>
          <div className="lgl-recapcard-value">{character.alignment || "—"}</div>
        </div>
      </div>

      {hasAbilities && (() => {
        const { scores } = getFinalAbilityScores(ab, race, subrace);
        return (
          <div className="lgl-recapblock">
            <div className="lgl-recapblock-title">Final Ability Scores{race ? ` (${race.name}'s bonus applied)` : ""}</div>
            <div className="lgl-recapability-row">
              {ABILITIES.map((a) => {
                const s = scores[a];
                return (
                  <div className="lgl-recapability" key={a}>
                    <span className="lgl-recapability-name">{a}</span>
                    <span className="lgl-recapability-val">{s.final != null ? s.final : "—"}</span>
                    <span className="lgl-recapability-mod">
                      {s.final != null ? abilityMod(s.final) : ""}
                      {s.bonus !== 0 && s.base != null && <span className="lgl-recapability-bonus"> ({s.base}{s.bonus > 0 ? "+" : ""}{s.bonus})</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {legacyDetails.length > 0 && (
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">3 Legacy Traits</div>
          <div className="lgl-legacypick-grid">
            {legacyDetails.map((t) => (
              <div className="lgl-legacypick-card lgl-recap-static" key={t.sourceLabel + t.name}>
                <span className="lgl-legacypick-name">{t.name}</span>
                <span className="lgl-legacypick-note"><TraitNote note={t.note} /></span>
                <span className="lgl-legacypick-source">{t.sourceLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {character.backstory && (
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">Backstory</div>
          <p className="lgl-lore">{character.backstory}</p>
        </div>
      )}

      {bg && (
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">Background Feature</div>
          <Facts facts={[{ label: "Skills", text: bg.skills }, { label: "Tools", text: bg.tools }]} />
          <div className="lgl-bg-feature">
            <span className="lgl-bg-feature-name">{bg.feature}</span>
            <span className="lgl-bg-feature-note">{bg.featureNote}</span>
          </div>
        </div>
      )}

      {(() => {
        const autoFromRace = computeAutoSkillsFromRace(race, subrace, character.legacyPicks);
        const autoFromBg = new Set((bg?.skills || "").split(",").map((s) => s.trim()).filter((s) => ALL_SKILLS.includes(s)));
        const unlocked = [...new Set([...autoFromRace, ...autoFromBg, ...(character.skillChoices || [])])].sort();
        return unlocked.length > 0 ? (
          <div className="lgl-recapblock">
            <div className="lgl-recapblock-title">Skills Unlocked</div>
            <div className="lgl-skillchip-row">
              {unlocked.map((s) => <span className="lgl-skillchip is-final" key={s}>{s}</span>)}
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}

function FinalDetailsStep({ character, setCharacter, navigate, playerName, setPlayerName }) {
  const race = CONTENT.races.find((r) => r.id === character.raceId);
  const cls = [...CLASSES, ...LOGLANDIA_CLASSES].find((c) => c.id === character.classId);
  const bg = [...BACKGROUNDS, CUSTOM_BACKGROUND].find((b) => b.id === character.backgroundId);
  const hasAbilities = !!(character.abilities?.rolled && character.abilities?.assign && Object.keys(character.abilities.assign).length === 6);
  const missingSteps = [
    !race && "Race (Step 1)",
    (character.legacyPicks || []).length < 3 && "Legacy Traits (Step 2)",
    !cls && "Class (Step 3)",
    !bg && "Background (Step 4)",
    !hasAbilities && "Ability Scores (Step 5)",
  ].filter(Boolean);
  const set = (field) => (e) => setCharacter((c) => ({ ...c, [field]: e.target.value }));
  const [saveState, setSaveState] = useState("idle"); // idle | saving | done | error
  const [myChars, setMyChars] = useState([]);
  const [myCharsState, setMyCharsState] = useState("idle"); // idle | loading | done | error
  const [showOther, setShowOther] = useState(() => !!playerName && !PLAYER_NAMES.includes(playerName));

  const loadMyCharacters = async () => {
    if (!SUPABASE_READY || !playerName.trim()) return;
    setMyCharsState("loading");
    try {
      const rows = await supaFetch(`characters?owner_name=eq.${encodeURIComponent(playerName.trim())}&select=*&order=created_at.desc`);
      setMyChars(rows || []);
      setMyCharsState("done");
    } catch {
      setMyCharsState("error");
    }
  };
  useEffect(() => { loadMyCharacters(); /* eslint-disable-next-line */ }, [playerName]);

  const handleSave = async () => {
    if (!playerName.trim()) { setSaveState("needs-name"); return; }
    setSaveState("saving");
    try {
      const payload = { ...character };
      if (character.savedId) {
        await supaFetch(`characters?id=eq.${character.savedId}`, { method: "PATCH", body: JSON.stringify({ data: payload, owner_name: playerName.trim() }) });
      } else {
        const rows = await supaFetch("characters", { method: "POST", body: JSON.stringify({ owner_name: playerName.trim(), data: payload }) });
        if (rows?.[0]?.id) setCharacter((c) => ({ ...c, savedId: rows[0].id }));
      }
      setSaveState("done");
      loadMyCharacters();
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div>
      <p className="lgl-lore">The last few details, then your sheet recap below pulls together everything you picked across all seven steps. Copy it onto your real character sheet, or save it to the Codex's Player Characters gallery so the group can see it.</p>

      {missingSteps.length > 0 && (
        <div className="lgl-savenote is-warn" style={{ maxWidth: 520, margin: "0 auto 24px" }}>
          Heads up, you haven't finished: <b>{missingSteps.join(", ")}</b>. You can still save, but the sheet below will be incomplete until you go back and fill those in.
        </div>
      )}

      <div className="lgl-fd-inputs">
        <label className="lgl-fd-field">
          <span>Character Name</span>
          <input type="text" value={character.name} onChange={set("name")} placeholder="What do they go by?" />
        </label>
        <label className="lgl-fd-field">
          <span>Alignment</span>
          <input type="text" value={character.alignment} onChange={set("alignment")} placeholder="e.g. Chaotic Good" />
        </label>
        <label className="lgl-fd-field">
          <span>Which Campaign</span>
          <select value={character.campaignId || ""} onChange={set("campaignId")}>
            <option value="">Pick one…</option>
            {CHARACTER_CAMPAIGNS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value={JUST_FOR_FUN.id}>{JUST_FOR_FUN.name}</option>
          </select>
        </label>
        <label className="lgl-fd-field">
          <span>Who's Playing</span>
          <select
            value={PLAYER_NAMES.includes(playerName) ? playerName : (showOther ? "Other" : "")}
            onChange={(e) => {
              if (e.target.value === "Other") { setShowOther(true); setPlayerName(""); }
              else { setShowOther(false); setPlayerName(e.target.value); }
            }}
          >
            <option value="">Pick your name…</option>
            {PLAYER_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="Other">Other</option>
          </select>
        </label>
        {showOther && (
          <label className="lgl-fd-field">
            <span>Your Name</span>
            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Type it in" />
          </label>
        )}
      </div>

      <h2 className="lgl-h2" style={{ marginTop: 30 }}>Your Sheet, So Far</h2>
      <CharacterSheet character={character} />


      <div className="lgl-savebox">
        {!SUPABASE_READY ? (
          <div className="lgl-savenote">Saving isn't wired up to a real backend yet (needs a Supabase project's URL and key dropped into the code). Until then this sheet is for copying to your own sheet, not posting to the group.</div>
        ) : (
          <>
            <button className="lgl-make-btn" onClick={handleSave} disabled={saveState === "saving"}>
              {character.savedId ? "Update in the Codex" : "Save & Post to the Codex"}
            </button>
            {saveState === "needs-name" && <div className="lgl-savenote is-warn">Add your name above first, so it's clear whose character this is.</div>}
            {saveState === "done" && <div className="lgl-savenote is-ok">Saved. Find it in the Codex's Characters tab, under Player Characters.</div>}
            {saveState === "error" && <div className="lgl-savenote is-warn">Couldn't save just now. Check your connection and try again.</div>}
          </>
        )}
      </div>

      {SUPABASE_READY && playerName.trim() && (
        <div className="lgl-mychars">
          <div className="lgl-recapblock-title">Your Saved Characters</div>
          {myCharsState === "loading" && <p className="lgl-muted">Loading…</p>}
          {myCharsState === "done" && myChars.length === 0 && <p className="lgl-muted">Nothing saved yet under "{playerName.trim()}".</p>}
          {myCharsState === "done" && myChars.length > 0 && (
            <div className="lgl-grid">
              {myChars.map((row) => (
                <button key={row.id} className="lgl-pick" onClick={() => setCharacter({ ...row.data, savedId: row.id })}>
                  <span className="lgl-card-name">{row.data?.name || "Unnamed"}</span>
                  <span className="lgl-card-note">{CONTENT.races.find((r) => r.id === row.data?.raceId)?.name || "No race"} · {[...CLASSES, ...LOGLANDIA_CLASSES].find((c) => c.id === row.data?.classId)?.name || "No class"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const STEP_INFO = [
  { name: "Race", icon: Layers, blurb: "Choose your people. Sets stat bonuses, languages, and built-in features." },
  { name: "Legacy Traits", icon: Trophy, blurb: "Pick your subrace, then your 3 legacy traits. Not optional, this is where your race becomes yours." },
  { name: "Class", icon: Shapes, blurb: "Pick what you do in the world. Drives hit points, proficiencies, and core abilities." },
  { name: "Background", icon: Globe, blurb: "Where you came from. Adds skills, tools, and a hook for your story." },
  { name: "Ability Scores", icon: Dices, blurb: "Roll 4d6 drop lowest, assign STR through CHA, then apply racial bonuses." },
  { name: "Skills & Proficiencies", icon: Cog, blurb: "See what race and background already granted you, then choose your class's skills. Lists everything you've unlocked." },
  { name: "Spells", icon: Wand, blurb: "If your class casts, see what you're entitled to, then head to the Logpendium to actually pick spells." },
  { name: "Final Details", icon: Star, blurb: "Name, alignment, and the finishing touches. Then your sheet is ready." },
];

function BuilderStart({ onMake }) {
  return (
    <ModuleShell>
      <div className="lgl-entry wide lgl-entry-start">
        <header className="lgl-entry-head">
          <div className="lgl-eyebrow">Character Builder</div>
          <h1>Build a Loglandia character</h1>
          <p className="lgl-tagline">Eight steps from a blank page to a ready adventurer. Here is the path before you begin.</p>
        </header>
        <div className="lgl-stepcards-grid">
          {STEP_INFO.map((s, i) => {
            const Icon = s.icon;
            return (
              <div className="lgl-stepcard" key={s.name}>
                <span className="lgl-stepcard-top">
                  <span className="lgl-stepcard-icon">{Icon && <Icon size={20} />}</span>
                  <span className="lgl-stepcard-n">{i + 1}</span>
                </span>
                <span className="lgl-stepcard-name">{s.name}</span>
                <span className="lgl-stepcard-blurb">{s.blurb}</span>
              </div>
            );
          })}
        </div>
        <p className="lgl-rulesnote">Classes and backgrounds follow standard 5e (2014) rules; race, mechanics, and legacy traits are Loglandia's own. The Sheet Assistant walks you through all eight steps, fills nothing in for you.</p>
        <button className="lgl-make-btn" onClick={onMake}>Make Character</button>
      </div>
    </ModuleShell>
  );
}

function LegacyTraitPicker({ race, subrace, picks, setPicks }) {
  const [openCats, setOpenCats] = useState({});
  const toggleCat = (id) => setOpenCats((o) => ({ ...o, [id]: !o[id] }));

  const basePool = (race.legacy || []).map((t) => ({ ...t, source: "base", sourceLabel: race.name }));
  const subPool = subrace
    ? (subrace.traits || []).filter((t) => !/^\(built-in\)/i.test(t.note.trim())).map((t) => ({ ...t, source: "sub", sourceLabel: subrace.name }))
    : [];
  const racialPool = [...basePool, ...subPool];

  const isPicked = (source, name) => picks.some((p) => p.source === source && p.name === name);
  const toggle = (source, name) => {
    setPicks((prev) => {
      const exists = prev.some((p) => p.source === source && p.name === name);
      if (exists) return prev.filter((p) => !(p.source === source && p.name === name));
      if (prev.length >= 3) return prev;
      return [...prev, { source, name }];
    });
  };

  const count = picks.length;
  const subCount = picks.filter((p) => p.source === "sub").length;
  let status, statusKind;
  if (count < 3) {
    status = `Pick ${3 - count} more. You have ${count} of 3 selected.`;
    statusKind = "warn";
  } else if (subrace && subCount === 0) {
    status = `You picked the ${subrace.name} subrace, so at least 1 of your 3 must come from its list (Path A). Swap one trait for a ${subrace.name} one, or deselect the subrace to go base-only.`;
    statusKind = "warn";
  } else if (subrace) {
    status = `Path A satisfied: 3 traits, including ${subCount} from ${subrace.name}.`;
    statusKind = "ok";
  } else {
    status = `3 traits selected.`;
    statusKind = "ok";
  }

  return (
    <section className="lgl-legacypick-panel">
      <div className="lgl-legacy-head">
        <div className="lgl-legacy-head-left">
          <span className="lgl-legacy-mark"><Sparkles size={14} /></span>
          <span className="lgl-legacy-title">Pick Your 3 Legacy Traits</span>
        </div>
      </div>
      <p className="lgl-legacy-def">
        {subrace
          ? <>Your racial pool is {race.name}'s base list plus {subrace.name}'s. At least 1 of your 3 must come from {subrace.name}. You can also pick from the Universal lists below in place of racial traits.</>
          : <>Your racial pool is {race.name}'s base list. You can also pick from the Universal lists below — as long as your concept or campaign fits the theme.</>}
      </p>
      <div className={"lgl-legacystatus " + (statusKind === "ok" ? "is-ok" : "is-warn")}>{status}</div>

      <div className="lgl-legacypick-grid">
        {racialPool.map((t) => {
          const active = isPicked(t.source, t.name);
          const disabled = !active && count >= 3;
          return (
            <button
              key={t.source + "::" + t.name}
              className={"lgl-legacypick-card" + (active ? " is-active" : "") + (disabled ? " is-disabled" : "")}
              onClick={() => toggle(t.source, t.name)}
              disabled={disabled}
              aria-pressed={active}
            >
              <span className="lgl-legacypick-name">{t.name}</span>
              <span className="lgl-legacypick-note"><TraitNote note={t.note} /></span>
              <span className="lgl-legacypick-source">{t.sourceLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="lgl-universal-section">
        <div className="lgl-universal-section-head">
          <Wand2 size={14} />
          <span>Universal Legacy Traits</span>
          <span className="lgl-universal-section-sub">Available to every race — pick these in place of racial traits if your concept fits the theme.</span>
        </div>
        {UNIVERSAL_LEGACY_TRAIT_CATEGORIES.map((cat) => {
          const isOpen = !!openCats[cat.id];
          const catPickCount = picks.filter((p) => p.source === cat.id).length;
          return (
            <div className="lgl-univcat" key={cat.id}>
              <button className="lgl-univcat-toggle" onClick={() => toggleCat(cat.id)} aria-expanded={isOpen}>
                <cat.iconLeft size={15} className="lgl-univcat-icon-l" />
                <span className="lgl-univcat-name">{cat.name}</span>
                <cat.iconRight size={15} className="lgl-univcat-icon-r" />
                {catPickCount > 0 && <span className="lgl-univcat-badge">{catPickCount} selected</span>}
                <ChevronRight size={14} className={"lgl-univcat-chevron" + (isOpen ? " is-open" : "")} />
              </button>
              {isOpen && (
                <div className="lgl-univcat-body">
                  <p className="lgl-univcat-desc">{cat.desc}</p>
                  <div className="lgl-legacypick-grid">
                    {cat.traits.map((t) => {
                      const active = isPicked(cat.id, t.name);
                      const disabled = !active && count >= 3;
                      return (
                        <button
                          key={cat.id + "::" + t.name}
                          className={"lgl-legacypick-card" + (active ? " is-active" : "") + (disabled ? " is-disabled" : "")}
                          onClick={() => toggle(cat.id, t.name)}
                          disabled={disabled}
                          aria-pressed={active}
                        >
                          <span className="lgl-legacypick-name">{t.name}</span>
                          <span className="lgl-legacypick-note"><TraitNote note={t.note} /></span>
                          <span className="lgl-legacypick-source">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RaceStep({ character, setCharacter, navigate }) {
  const [activeCategory, setActiveCategory] = useState("Standard");
  const selectedRace = CONTENT.races.find((r) => r.id === character.raceId);
  const pickRace = (id) => {
    setCharacter((c) => ({ ...c, raceId: id, subraceName: null, legacyPicks: [] }));
  };

  const catRaces = (cat) => CONTENT.races
    .filter((r) => r.category === cat)
    .sort((a, b) => {
      if (a.id === "human") return -1;
      if (b.id === "human") return 1;
      const aSub = a.subraces?.length || 0;
      const bSub = b.subraces?.length || 0;
      if (bSub !== aSub) return bSub - aSub;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="lgl-racestep">
      {/* Category tabs */}
      <div className="lgl-racestep-tabs" role="tablist" aria-label="Race categories">
        {RACE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={cat === activeCategory}
            className={"lgl-racestep-tab" + (cat === activeCategory ? " is-active" : "")}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
            <span className="lgl-racestep-tab-count">{catRaces(cat).length}</span>
          </button>
        ))}
      </div>

      {/* Race card grid */}
      <div className="lgl-racestep-grid">
        {catRaces(activeCategory).map((r) => (
          <button
            key={r.id}
            className={"lgl-racecard" + (r.id === character.raceId ? " is-active" : "")}
            onClick={() => pickRace(r.id)}
          >
            <span className="lgl-racecard-name">{r.name}</span>
            {r.keywords && <span className="lgl-racecard-keywords">{r.keywords}</span>}
            {r.subraces?.length > 0 && (
              <span className="lgl-racecard-subcount">
                +{r.subraces.length} {r.subracesLabel ? r.subracesLabel.toLowerCase() : "subraces"}
              </span>
            )}
            {(r.isNew || r.working) && (
              <span className={"lgl-racecard-badge" + (r.working ? " soft" : "")}>{r.working ? "Working title" : "New"}</span>
            )}
          </button>
        ))}
      </div>

      {/* Selected race: stats + mechanics only, no lore */}
      {selectedRace && (
        <div className="lgl-race-statsbox">
          <div className="lgl-race-statsbox-head">
            <div className="lgl-race-statsbox-title-block">
              <span className="lgl-eyebrow">{selectedRace.eyebrow}</span>
              <h2 className="lgl-race-statsbox-title">{selectedRace.name}</h2>
            </div>
            {!selectedRace.codexHidden && (
              <button
                className="lgl-lore-btn"
                onClick={() => navigate("wiki", { entryId: selectedRace.id })}
              >
                <BookOpen size={15} /> Lore
              </button>
            )}
          </div>

          <Facts facts={selectedRace.facts} />

          {selectedRace.builtins?.length > 0 && (
            <section className="lgl-block">
              <h2 className="lgl-h2">Built-in Features</h2>
              <TraitList items={selectedRace.builtins} sourceLabel="Built-in" />
            </section>
          )}

          {(selectedRace.subraces?.length > 0 || selectedRace.legacy?.length > 0) && (
            <section className="lgl-traitspreview" style={{ marginTop: 20 }}>
              <div className="lgl-recapblock-title">What's Picked Next — Step 2</div>
              {selectedRace.subraces?.length > 0 && (
                <div className="lgl-traitspreview-row">
                  <span className="lgl-traitspreview-label">{selectedRace.subracesLabel || "Subraces"}</span>
                  <span className="lgl-traitspreview-chips">
                    {selectedRace.subraces.map((sr) => <span className="lgl-subrace-chip" key={sr.name}>{sr.name}</span>)}
                  </span>
                </div>
              )}
              {selectedRace.legacy?.length > 0 && (
                <div className="lgl-traitspreview-row">
                  <span className="lgl-traitspreview-label">Legacy Traits</span>
                  <span className="lgl-traitspreview-chips">
                    {selectedRace.legacy.map((t) => <span className="lgl-subrace-chip" key={t.name}>{t.name}</span>)}
                  </span>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {!selectedRace && (
        <div className="lgl-racestep-empty">
          Pick a race above to see its stats and built-in features here.
        </div>
      )}
    </div>
  );
}

function LegacyTraitsStep({ character, setCharacter, navigate }) {
  const selectedRace = CONTENT.races.find((r) => r.id === character.raceId);
  const selectedSubrace = selectedRace?.subraces?.find((sr) => sr.name === character.subraceName);
  const pickSubrace = (name) => setCharacter((c) => ({ ...c, subraceName: name, legacyPicks: [] }));
  const setLegacyPicks = (updater) => setCharacter((c) => ({ ...c, legacyPicks: typeof updater === "function" ? updater(c.legacyPicks) : updater }));

  if (!selectedRace) {
    return (
      <div className="lgl-empty-page">
        Pick a race first (Step 1). Your subrace and legacy traits come from there, use Back below.
      </div>
    );
  }

  return (
    <div className="lgl-traits-page">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">{selectedRace.eyebrow}</div>
        <h1>{selectedRace.name}</h1>
        <p className="lgl-tagline">Subrace and legacy traits, the two choices that make this race yours.</p>
      </header>
      {selectedRace.subraces?.length > 0 && (
        <section className="lgl-subrace-panel">
          <div className="lgl-subrace-panel-head">
            <span className="lgl-subrace-mark"><Layers size={14} /></span>
            <span className="lgl-subrace-title">{selectedRace.subracesLabel || "Choose Your Subrace"}</span>
          </div>
          <p className="lgl-subrace-def">It sets a stat bonus, shapes your story, and unlocks its own legacy traits.</p>
          <div className="lgl-subrace-grid">
            {selectedRace.subraces.map((sr) => (
              <button key={sr.name} className={"lgl-subrace-card" + (sr.name === character.subraceName ? " is-active" : "")} onClick={() => pickSubrace(sr.name)}>
                <span className="lgl-subrace-card-name">{sr.name}</span>
                {sr.desc && <span className="lgl-subrace-card-desc">{sr.desc}</span>}
                {sr.traits?.length > 0 && (
                  <span className="lgl-subrace-card-traits">
                    {sr.traits.map((t) => <span className="lgl-subrace-chip" key={t.name}>{t.name}</span>)}
                  </span>
                )}
              </button>
            ))}
          </div>
          {selectedSubrace && (
            <div className="lgl-subrace-fulldetail">
              <div className="lgl-recapblock-title">{selectedSubrace.name} — Everything It Gives You</div>
              <TraitList items={selectedSubrace.traits} sourceLabel={(t) => (/^\(built-in\)/i.test(t.note) ? "Built-in" : selectedSubrace.name)} />
            </div>
          )}
        </section>
      )}
      {selectedRace.legacy?.length > 0 && (
        <LegacyTraitPicker race={selectedRace} subrace={selectedSubrace} picks={character.legacyPicks} setPicks={setLegacyPicks} />
      )}
    </div>
  );
}


function BuilderModule({ character, setCharacter, step, setStep, phase, setPhase, navigate, playerName, setPlayerName }) {
  const selectedRace = CONTENT.races.find((r) => r.id === character.raceId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  useEffect(() => {
    document.querySelector(".lgl-main")?.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);
  if (phase === "start") return <BuilderStart onMake={() => { setStep(0); setPhase("flow"); }} />;
  const aside = (
    <nav className="lgl-side" aria-label="Builder steps">
      <div className="lgl-builder-side-head">
        {!sidebarCollapsed && <span className="lgl-side-head">Character Builder</span>}
        <button className={"lgl-collapse-btn" + (sidebarCollapsed ? " is-show" : "")} onClick={() => setSidebarCollapsed((c) => !c)} title={sidebarCollapsed ? "Show steps" : "Hide steps"}>
          {sidebarCollapsed ? <><ChevronRight size={12} /><span className="lgl-show-steps-label">STEPS</span></> : <ChevronLeft size={13} />}
        </button>
      </div>
      <div className="lgl-nav-scroll">
        <div className="lgl-nav-group">
          {BUILD_STEPS.map((s, i) => (
            <button key={s} className={"lgl-step" + (i === step ? " is-active" : "") + (i < step ? " is-done" : "")} onClick={() => setStep(i)} title={sidebarCollapsed ? s : undefined}>
              <span className="lgl-step-n">{i + 1}</span>
              <span className="lgl-step-label">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
  return (
    <ModuleShell aside={aside} asideTitle="Steps" asideCollapsed={sidebarCollapsed}>
      <div className={"lgl-entry wide" + (step === 0 ? " lgl-entry-racestep" : step === 1 ? " lgl-entry-race" : "")}>
        <div className="lgl-flow-head">
          <span className="lgl-mode-pill">Sheet Assistant</span>
          <button className="lgl-inline-link2" onClick={() => setPhase("start")}>Start over</button>
        </div>
        <header className="lgl-entry-head">
          <div className="lgl-eyebrow">Step {step + 1} of {BUILD_STEPS.length}</div>
          <h1>{BUILD_STEPS[step]}</h1>
        </header>
        {step === 0 ? (
          <RaceStep character={character} setCharacter={setCharacter} navigate={navigate} />
        ) : step === 1 ? (
          <LegacyTraitsStep character={character} setCharacter={setCharacter} navigate={navigate} />
        ) : step === 2 ? (
          <ClassStep character={character} setCharacter={setCharacter} />
        ) : step === 3 ? (
          <BackgroundStep character={character} setCharacter={setCharacter} />
        ) : step === 4 ? (
          <AbilityStep character={character} setCharacter={setCharacter} race={selectedRace} />
        ) : step === 5 ? (
          <SkillsStep character={character} setCharacter={setCharacter} />
        ) : step === 6 ? (
          <SpellsStep character={character} />
        ) : step === 7 ? (
          <FinalDetailsStep character={character} setCharacter={setCharacter} navigate={navigate} playerName={playerName} setPlayerName={setPlayerName} />
        ) : (
          <div className="lgl-stub">
            <p className="lgl-lore">This step is scaffolded. It will read from your <b>{BUILD_STEPS[step].toLowerCase()}</b> data the same way the Race step reads from race data.</p>
            <p className="lgl-muted">4d6 drop lowest for ability scores, no equipment step, tuned for new players.</p>
          </div>
        )}
        <div className="lgl-stepnav">
          <button disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}><ChevronLeft size={15} /> Back</button>
          <button className="primary" disabled={step === BUILD_STEPS.length - 1} onClick={() => setStep(Math.min(BUILD_STEPS.length - 1, step + 1))}>Next <ChevronRight size={15} /></button>
        </div>
      </div>
    </ModuleShell>
  );
}

/* ===================================================== MODULE: TIMELINE ==== */
function TimelineModule({ embedded }) {
  const body = (
    <div className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">World History</div>
        <h1>The Timeline of Loglandia</h1>
      </header>
      {EVENTS.length === 0 ? (
        <div className="lgl-morecoming">More to come.</div>
      ) : (
        <ol className="lgl-timeline">
          {EVENTS.map((e, i) => (
            <li key={i} className="lgl-tl-item">
              <span className="lgl-tl-dot" />
              <div className="lgl-tl-era">{e.era}</div>
              <div className="lgl-tl-title">{e.title}</div>
              {e.img && <img className="lgl-tl-img" src={e.img} alt="" />}
              <div className="lgl-tl-body">{parseLore(e.body)}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
  return embedded ? body : <ModuleShell>{body}</ModuleShell>;
}

/* ===================================================== MODULE: MAP ========= */
/* Cleared — these used to point at placeholder regions (Mainland, Underground,
   the Eastern Wilds, the Island Nation) that have since been removed. Rebuild
   against real CONTENT.regions entries when the map art is ready. */
const MAP_HOTSPOTS = [];
function MapModule({ navigate }) {
  return (
    <ModuleShell>
      <div className="lgl-entry wide">
        <header className="lgl-entry-head">
          <div className="lgl-eyebrow">Atlas</div>
          <h1>The Map of Loglandia</h1>
          <p className="lgl-tagline">Click a region to delve into its codex entry.</p>
        </header>
        <div className="lgl-map">
          {MAP_HOTSPOTS.map((h) => (
            <button key={h.id} className="lgl-hotspot" style={{ left: h.x + "%", top: h.y + "%" }} onClick={() => navigate("wiki", { entryId: h.id })}>
              <span className="lgl-hotspot-dot" /><span className="lgl-hotspot-label">{h.label}</span>
            </button>
          ))}
        </div>
        <p className="lgl-muted">Schematic placeholder. Drop in your real map; each hotspot already links to <code>CONTENT.regions</code>.</p>
      </div>
    </ModuleShell>
  );
}

/* ===================================================== MODULE: TALES ======= */
const TALES_HOME = "__taleshome__";

function TalesHome({ onOpen }) {
  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Campaign Log</div>
        <h1>Tales of Loglandia</h1>
        <p className="lgl-tagline">What each party has actually done, newest first. Pick a campaign to read its log.</p>
      </header>
      <div className="lgl-taleshome-grid">
        {CAMPAIGNS.map((c) => (
          <button key={c.id} className="lgl-campaigncard" onClick={() => onOpen(c.id)}>
            <span className="lgl-campaigncard-art">
              {c.cover
                ? <img src={c.cover} alt="" className="lgl-campaigncard-img" />
                : <span className="lgl-campaigncard-artslot">art slot</span>}
            </span>
            <span className="lgl-campaigncard-body">
              <span className="lgl-campaigncard-name">{c.name}</span>
              {c.blurb && <span className="lgl-campaigncard-blurb">{c.blurb}</span>}
              <span className="lgl-campaigncard-meta">
                {c.entries.length} {c.entries.length === 1 ? "entry" : "entries"}
                <span className="lgl-campaigncard-cta">Open the log <ChevronRight size={13} /></span>
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="lgl-muted">Each campaign is an object in <code>CAMPAIGNS</code>. Give one a <code>cover</code> image URL to fill the art slot, and a <code>blurb</code> for the one-line description.</p>
    </article>
  );
}

function TalesModule({ embedded }) {
  const [active, setActive] = useState(TALES_HOME);
  const camp = CAMPAIGNS.find((c) => c.id === active);
  const body = !camp ? <TalesHome onOpen={setActive} /> : (
    <div className="lgl-entry wide">
      <button className="lgl-backlink" onClick={() => setActive(TALES_HOME)}><ChevronLeft size={14} /> All campaigns</button>
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Campaign Log</div>
        <h1>{camp.name}</h1>
        {camp.blurb && <p className="lgl-tagline">{camp.blurb}</p>}
      </header>
      <div className="lgl-tales-note">Live updates need a data source beyond the static build: a file you edit and redeploy, a Google Sheet the site reads, or a small backend with an entry form. We'll wire your pick in here.</div>
      {camp.entries.length === 0 ? (
        <div className="lgl-morecoming">More to come.</div>
      ) : (
        <div className="lgl-tales">
          {camp.entries.map((t, i) => (
            <div className="lgl-tale" key={i}>
              {t.img && <img className="lgl-tale-img" src={t.img} alt="" />}
              <div className="lgl-tale-stamp">{t.stamp}</div>
              <div className="lgl-tale-title">{t.title}</div>
              <div className="lgl-tale-body">{parseLore(t.body)}</div>
            </div>
          ))}
        </div>
      )}
      <p className="lgl-muted">Each campaign is an object in <code>CAMPAIGNS</code>. Add a photo with an <code>img</code> URL on any entry.</p>
    </div>
  );
  return embedded ? body : <ModuleShell>{body}</ModuleShell>;
}

/* ===================================================== MODULE: HOME ======== */
/* ===================================================== MODULE: MECHANICS === */
/* ============================================================================
   HARVESTING & CRAFTING — from the L&L Rulebook 0.2
   ========================================================================== */
/* Exact colors pulled from the docx's own run colors (the DC colour key paragraph),
   not invented. They're dark, made for a light page, so we lighten a copy for
   on-screen text while keeping the true hue for the chip's background/border. */
const DC_COLORS = { 5: "#2E7D4F", 10: "#2E6DA4", 15: "#7B3FA0", 20: "#C9821A", 25: "#B23A3A", 30: "#7A1F1F", 35: "#7A1F1F", 40: "#7A1F1F", 50: "#7A1F1F" };
function dcTier(dc) {
  if (dc <= 5) return 5;
  if (dc <= 10) return 10;
  if (dc <= 15) return 15;
  if (dc <= 20) return 20;
  if (dc <= 25) return 25;
  if (dc <= 30) return 30;
  if (dc <= 35) return 35;
  if (dc <= 40) return 40;
  return 50;
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function withAlpha(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; }
function lighten(hex, amt) { const [r, g, b] = hexToRgb(hex); const m = (c) => Math.round(c + (255 - c) * amt); return `rgb(${m(r)}, ${m(g)}, ${m(b)})`; }
function dcColor(dc) { return DC_COLORS[dcTier(dc)]; }
function dcTextColor(dc) { return lighten(dcColor(dc), 0.82); }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
/* "Name!" marks a component volatile — terser than a separate flag per item. */
function parseComponents(str) {
  return str.split(",").map((s) => s.trim()).map((s) =>
    s.endsWith("!") ? { name: s.slice(0, -1).trim(), volatile: true } : { name: s, volatile: false }
  );
}

const HARVEST_SKILL_TABLE = [
  ["Aberration", "Arcana"], ["Beast", "Survival"], ["Celestial", "Religion"], ["Construct", "Investigation"],
  ["Dragon", "Survival"], ["Elemental", "Arcana"], ["Fey", "Arcana"], ["Fiend", "Religion"],
  ["Giant", "Medicine"], ["Humanoid", "Medicine"], ["Monstrosity", "Survival"], ["Ooze", "Nature"],
  ["Plant", "Nature"], ["Undead", "Medicine"],
];

const ESSENCE_TABLE = [
  { cr: "3–6", dc: 25, name: "Frail Essence", rarity: "Uncommon" },
  { cr: "7–11", dc: 30, name: "Robust Essence", rarity: "Rare" },
  { cr: "12–17", dc: 35, name: "Potent Essence", rarity: "Very Rare" },
  { cr: "18–24", dc: 40, name: "Mythic Essence", rarity: "Legendary" },
  { cr: "25+", dc: 50, name: "Deific Essence", rarity: "Artifact" },
];

const HARVEST_TABLES = [
  { type: "Aberration", skill: "Arcana", rows: [
    { dc: 5, items: parseComponents("Antenna, Eye, Flesh, Phial of Blood") },
    { dc: 10, items: parseComponents("Bone, Egg, Fat, Pouch of Claws, Pouch of Teeth, Tentacle") },
    { dc: 15, items: parseComponents("Heart, Phial of Mucus, Liver, Stinger") },
    { dc: 20, items: parseComponents("Brain, Chitin, Hide, Main Eye!") },
  ] },
  { type: "Beast", skill: "Survival", rows: [
    { dc: 5, items: parseComponents("Antenna, Eye, Flesh, Hair, Phial of Blood") },
    { dc: 10, items: parseComponents("Antler, Beak, Bone, Egg, Fat, Fin, Horn, Pincer, Pouch of Claws, Pouch of Teeth, Talon, Tusk") },
    { dc: 15, items: parseComponents("Heart, Liver, Poison Gland, Pouch of Feathers, Pouch of Scales, Stinger, Tentacle") },
    { dc: 20, items: parseComponents("Chitin, Pelt") },
  ] },
  { type: "Celestial", skill: "Religion", rows: [
    { dc: 5, items: parseComponents("Eye, Flesh, Hair, Phial of Blood, Pouch of Dust") },
    { dc: 10, items: parseComponents("Bone, Fat, Horn, Pouch of Teeth") },
    { dc: 15, items: parseComponents("Heart, Liver, Pouch of Feathers, Pouch of Scales") },
    { dc: 20, items: parseComponents("Brain, Skin") },
    { dc: 25, items: parseComponents("Soul!") },
  ] },
  { type: "Construct", skill: "Investigation", rows: [
    { dc: 5, items: parseComponents("Phial of Blood, Phial of Oil") },
    { dc: 10, items: parseComponents("Flesh, Plating, Stone") },
    { dc: 15, items: parseComponents("Bone, Heart, Liver, Gears") },
    { dc: 20, items: parseComponents("Brain, Instructions") },
    { dc: 25, items: parseComponents("Lifespark!") },
  ] },
  { type: "Dragon", skill: "Survival", rows: [
    { dc: 5, items: parseComponents("Eye, Flesh, Phial of Blood") },
    { dc: 10, items: parseComponents("Bone, Egg, Fat, Pouch of Claws, Pouch of Teeth") },
    { dc: 15, items: parseComponents("Horn, Liver, Pouch of Scales") },
    { dc: 20, items: parseComponents("Heart") },
    { dc: 25, items: parseComponents("Breath Sac!") },
  ] },
  { type: "Elemental", skill: "Arcana", rows: [
    { dc: 5, items: parseComponents("Eye, Primordial Dust") },
    { dc: 10, items: parseComponents("Bone") },
    { dc: 15, items: parseComponents("Volatile Mote of Air/Earth/Fire/Water!") },
    { dc: 25, items: parseComponents("Core of Air/Earth/Fire/Water!") },
  ] },
  { type: "Fey", skill: "Arcana", rows: [
    { dc: 5, items: parseComponents("Antenna, Eye, Flesh, Hair, Phial of Blood") },
    { dc: 10, items: parseComponents("Antler, Beak, Bone, Egg, Horn, Pouch of Claws, Pouch of Teeth, Talon, Tusk") },
    { dc: 15, items: parseComponents("Heart, Fat, Liver, Poison Gland, Pouch of Feathers, Pouch of Scales, Tentacle, Tongue") },
    { dc: 20, items: parseComponents("Brain, Skin, Pelt") },
    { dc: 25, items: parseComponents("Psyche!") },
  ] },
  { type: "Fiend", skill: "Religion", rows: [
    { dc: 5, items: parseComponents("Eye, Flesh, Hair, Phial of Blood, Pouch of Dust") },
    { dc: 10, items: parseComponents("Beak, Bone, Horn, Pouch of Claws, Pouch of Teeth") },
    { dc: 15, items: parseComponents("Heart, Fat, Liver, Poison Gland, Pouch of Feathers, Pouch of Scales") },
    { dc: 20, items: parseComponents("Brain, Skin") },
    { dc: 25, items: parseComponents("Soul!") },
  ] },
  { type: "Giant", skill: "Medicine", rows: [
    { dc: 5, items: parseComponents("Flesh, Hair, Nail, Phial of Blood") },
    { dc: 10, items: parseComponents("Bone, Fat, Tooth") },
    { dc: 15, items: parseComponents("Heart, Liver") },
    { dc: 20, items: parseComponents("Skin") },
  ] },
  { type: "Humanoid", skill: "Medicine", rows: [
    { dc: 5, items: parseComponents("Eye, Phial of Blood") },
    { dc: 10, items: parseComponents("Bone, Egg, Pouch of Teeth") },
    { dc: 15, items: parseComponents("Heart, Liver, Pouch of Feathers, Pouch of Scales") },
    { dc: 20, items: parseComponents("Brain, Skin") },
  ] },
  { type: "Monstrosity", skill: "Survival", rows: [
    { dc: 5, items: parseComponents("Antenna, Eye, Flesh, Hair, Phial of Blood") },
    { dc: 10, items: parseComponents("Antler, Beak, Bone, Egg, Fat, Fin, Horn, Pincer, Pouch of Claws, Pouch of Teeth, Talon, Tusk") },
    { dc: 15, items: parseComponents("Heart, Liver, Poison Gland, Pouch of Feathers, Pouch of Scales, Stinger, Tentacle") },
    { dc: 20, items: parseComponents("Chitin, Pelt") },
  ] },
  { type: "Ooze", skill: "Nature", rows: [
    { dc: 5, items: parseComponents("Phial of Acid") },
    { dc: 10, items: parseComponents("Phial of Mucus") },
    { dc: 15, items: parseComponents("Vesicle") },
    { dc: 20, items: parseComponents("Membrane") },
  ] },
  { type: "Plant", skill: "Nature", rows: [
    { dc: 5, items: parseComponents("Phial of Sap, Tuber") },
    { dc: 10, items: parseComponents("Bundle of Roots, Phial of Wax, Pouch of Hyphae, Pouch of Leaves, Pouch of Seeds") },
    { dc: 15, items: parseComponents("Poison Gland, Pouch of Pollen!, Pouch of Spores!") },
    { dc: 20, items: parseComponents("Bark, Membrane") },
  ] },
  { type: "Undead", skill: "Medicine", rows: [
    { dc: 5, items: parseComponents("Eye, Bone, Phial of Congealed Blood") },
    { dc: 10, items: parseComponents("Marrow, Pouch of Teeth, Rancid Fat") },
    { dc: 15, items: parseComponents("Ethereal Ichor, Undying Flesh") },
    { dc: 20, items: parseComponents("Undying Heart!") },
  ] },
];

const HELPERS_TABLE = [["Tiny", 0], ["Small", 1], ["Medium", 2], ["Large", 4], ["Huge", 6], ["Gargantuan", 10]];

const ENCHANT_TABLE = [
  { rarity: "Common", essence: "—", dc: 12, consumable: "0.5 hrs", non: "1 hr", att: "2 hrs" },
  { rarity: "Uncommon", essence: "Frail", dc: 15, consumable: "4 hrs", non: "10 hrs", att: "20 hrs" },
  { rarity: "Rare", essence: "Robust", dc: 18, consumable: "20 hrs", non: "40 hrs", att: "80 hrs" },
  { rarity: "Very Rare", essence: "Potent", dc: 21, consumable: "80 hrs", non: "160 hrs", att: "320 hrs" },
  { rarity: "Legendary", essence: "Mythic", dc: 25, consumable: "320 hrs", non: "640 hrs", att: "1,280 hrs" },
];

const TOOLS_TABLE = [
  ["Alchemist's supplies", "Intelligence", "Potions; miscellaneous (any salves or lotions)"],
  ["Brewer's supplies", "Constitution", "Potions"],
  ["Calligrapher's supplies", "Dexterity", "Scrolls"],
  ["Carpenter's tools", "Dexterity or Strength", "Ammunition (Arrows, Bolts, Blowgun Needles), Musical Instruments, Prostheses, Rods, Staffs, Wands, Weapons (Polearms, Blowguns, Clubs, Darts, Greatclubs, Javelins, Longbows, Nunchaku, Quarterstaffs, Shortbows, Slingshots, Tonfas, Tridents); miscellaneous (anything made of wood)"],
  ["Cartographer's tools", "Dexterity or Intelligence", "Maps; miscellaneous (anything involving paper)"],
  ["Cobbler's tools", "Dexterity or Intelligence", "Miscellaneous (footwear)"],
  ["Cook's utensils", "Constitution", "Magical Meals"],
  ["Glassblower's tools", "Constitution or Dexterity", "Rods, Staffs, Wands; miscellaneous (anything made of glass)"],
  ["Herbalism kit", "Intelligence", "Potions; miscellaneous (any salves or lotions)"],
  ["Jeweller's tools", "Dexterity", "Miscellaneous (anything involving jewels or precious metals)"],
  ["Leatherworker's tools", "Dexterity", "Armour (Hide Armor or Light), Weapons (Slings, Tetherhooks, Whips)"],
  ["Mason's tools", "Strength", "Ammunition (Sling Bullets), Weapons (Mauls, Meteor Hammers); miscellaneous (anything made of stone)"],
  ["Painter's supplies", "Dexterity", "Scrolls"],
  ["Poisoner's kit", "Dexterity or Intelligence", "Poisons"],
  ["Potter's tools", "Dexterity", "Miscellaneous (anything made of clay)"],
  ["Smith's tools", "Constitution or Strength", "Ammunition (Firearm Shot and Sling Bullets), Armour (Heavy or Medium except Hide, Shields), Prostheses, Rods, Staffs, Wands, Weapons (Axes, Chakrams, Claws, Daggers, Flails, Javelins, Knuckledusters, Kusarigamas, Light Hammers, Maces, Mauls, Morningstars, Nunchaku, Polearms, Rope Darts, Sai, Shuriken, Slingshots, Spiked Cesti, Starknives, Swords, Tessen, Tonfas, Tridents, Twinblades, Warhammers, War Crescents, War Picks)"],
  ["Tinker's tools", "Dexterity", "Musical Instruments, Prostheses, Rods, Staffs, Wands, Weapons (Crossbows, Firearms, Tommybows), Wondrous Items (anything with a mechanism)"],
  ["Weaver's tools", "Constitution or Dexterity", "Armour (Padded), Weapons (Meteor Hammers, Nets, Rope Darts, Slings, Tessen); miscellaneous (cloaks, hats, robes, anything made of cloth)"],
  ["Woodcarver's tools", "Dexterity or Strength", "Ammunition (Arrows, Bolts, Blowgun Needles), Musical Instruments, Prostheses, Rods, Staffs, Wands, Weapons (Polearms, Blowguns, Clubs, Darts, Greatclubs, Javelins, Longbows, Nunchaku, Quarterstaffs, Shortbows, Slingshots, Tonfas, Tridents); miscellaneous (anything made of wood)"],
];

function DataTable({ columns, rows, fit }) {
  return (
    <div className={"lgl-datatable-wrap" + (fit ? " is-fit" : "")}>
      <table className="lgl-datatable">
        <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function FormulaBox({ children }) { return <div className="lgl-formula-box">{children}</div>; }
function ExampleBox({ children }) { return <blockquote className="lgl-aside lgl-example-box">{children}</blockquote>; }

/* Standard D&D rarity colors — a separate scheme from DC difficulty, since
   Essence tiers are about what the item becomes, not how hard the roll is. */
const RARITY_COLORS = { Common: "#9098A0", Uncommon: "#2E7D4F", Rare: "#2E6DA4", "Very Rare": "#7B3FA0", Legendary: "#C9821A", Artifact: "#B23A3A" };
function rarityColor(r) { return RARITY_COLORS[r] || "#666666"; }
function rarityTextColor(r) { return lighten(rarityColor(r), 0.82); }

function TierChip({ color, textColor, children }) {
  return <span className="lgl-dcchip" style={{ background: withAlpha(color, 0.28), color: textColor, borderColor: withAlpha(color, 0.7) }}>{children}</span>;
}
function DCChip({ dc }) {
  return <TierChip color={dcColor(dc)} textColor={dcTextColor(dc)}>DC {dc}</TierChip>;
}
function PlainChip({ children }) {
  return <span className="lgl-dcchip lgl-dcchip-plain">{children}</span>;
}
function RarityChip({ rarity }) {
  return <TierChip color={rarityColor(rarity)} textColor={rarityTextColor(rarity)}>{rarity}</TierChip>;
}
function ComponentPill({ item }) {
  return (
    <span className={"lgl-componentpill" + (item.volatile ? " is-volatile" : "")} title={item.volatile ? "Volatile — explodes or discharges if harvesting it is failed" : undefined}>
      {item.name}{item.volatile && <sup>ᵛ</sup>}
    </span>
  );
}
function HarvestTableBlock({ data }) {
  return (
    <div className="lgl-harvestblock" id={`harvest-${slugify(data.type)}`}>
      <div className="lgl-harvestblock-head">{data.type} <span className="lgl-harvestblock-skill">· {data.skill}</span></div>
      {data.rows.map((row) => (
        <div className="lgl-harvestrow" key={row.dc}>
          <DCChip dc={row.dc} />
          <span className="lgl-harvestrow-items">
            {row.items.map((it) => <ComponentPill item={it} key={it.name} />)}
          </span>
        </div>
      ))}
    </div>
  );
}

function HarvestingPage() {
  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Mechanic · New in this edition</div>
        <h1>Harvesting</h1>
        <p className="lgl-tagline">When a creature is slain, its body holds components for crafting, but they fade fast.</p>
      </header>
      <p className="lgl-lore">Harvesting is the process of gathering those components before their magic fades. It follows five steps, every time.</p>

      <section className="lgl-block">
        <h2 className="lgl-h2">The Five Steps</h2>
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">1 · Description</div>
          <p className="lgl-lore">The DM consults the Harvest Tables for the creature's type and describes what can be harvested. Not everything is always available, it depends on the corpse's condition and how the fight went. Most boss monsters have their own unique harvest tables.</p>
        </div>
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">2 · Harvest List</div>
          <p className="lgl-lore">The players decide which components to harvest and in what order. Order matters: it directly affects how hard each extraction becomes.</p>
        </div>
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">3 · Harvest DC</div>
          <p className="lgl-lore">Every component has its own Component DC. These stack: the Harvest DC for each item is its own Component DC plus the Component DC of everything listed above it.</p>
          <ExampleBox>
            A party harvests a Pouch of Teeth (DC 10), two Eyes (DC 5 each), then a Breath Sac (DC 25): Pouch of Teeth → Harvest DC 10. Eye (1st) → Harvest DC 15. Eye (2nd) → Harvest DC 20. Breath Sac → Harvest DC 45, since every prior DC stacks on top of it.
          </ExampleBox>
        </div>
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">4 · Harvesting Check</div>
          <p className="lgl-lore">The players make a Harvesting Check: the combined total of an Assessment Check and a Carving Check. One player can make both alone, but doing so gives Disadvantage on both rolls.</p>
        </div>
        <div className="lgl-recapblock">
          <div className="lgl-recapblock-title">5 · Loot</div>
          <p className="lgl-lore">Compare the Harvesting Check to the Harvest DCs from Step 3. Anything met or exceeded is successfully harvested; anything not reached is lost as its magic fades.</p>
          <ExampleBox>A Harvesting Check of 37 against the list above yields the Pouch of Teeth and both Eyes (DCs 10, 15, 20), but not the Breath Sac (DC 45).</ExampleBox>
        </div>
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Assessment &amp; Carving Checks</h2>
        <p className="lgl-lore">The skill used for both checks depends on the creature's type — see the table below. The Assessment Check is knowledge: how to safely extract and store components. The Carving Check is precision: the physical extraction itself.</p>
        <FormulaBox>Assessment Check = 1d20 + INT modifier + Proficiency Bonus (if proficient)</FormulaBox>
        <FormulaBox>Carving Check = 1d20 + DEX modifier + Proficiency Bonus (if proficient)</FormulaBox>
        <FormulaBox>Harvesting Check = Assessment Check result + Carving Check result</FormulaBox>
        <p className="lgl-lore">Ritual Carving: when harvesting an aberration, celestial, elemental, fey, or fiend, a spellcasting Carving Harvester may use their spellcasting ability modifier in place of DEX.</p>
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Helpers</h2>
        <p className="lgl-lore">Anyone not Assessing or Carving can Help. How many is capped by the creature's size, and they must stay involved the whole time to count. A Helper proficient in the right skill adds their full Proficiency Bonus; without it, half, rounded down. Helping a harvest replaces the standard Help action.</p>
        <DataTable columns={["Creature Size", "Max Helpers"]} rows={HELPERS_TABLE.map(([s, n]) => [s, n])} />
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Damaging Components</h2>
        <p className="lgl-lore"><b>Destructive damage</b> — acid, fire, necrotic, or anything the creature was vulnerable to — can ruin components before harvesting even starts. The DM may rule some or all components lost depending on severity; at minimum, all checks on that creature roll with Disadvantage.</p>
        <p className="lgl-lore"><b>Volatile components</b> (marked <sup>ᵛ</sup> below) are unstable. Fail to harvest one and it can explode or discharge, using the creature's own abilities to set the save DC and effect.</p>
        <ExampleBox>Failing to harvest a dragon's Breath Sac might force everyone nearby into a DEX save against a burst of its breath weapon.</ExampleBox>
        <p className="lgl-lore">Rolling a natural 1 on either check can trigger the same kind of consequence, volatile or not.</p>
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Creature Type &amp; Associated Skill</h2>
        <p className="lgl-lore">Used for both Assessment and Carving checks.</p>
        <DataTable columns={["Creature Type", "Skill"]} rows={HARVEST_SKILL_TABLE} />
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Essence</h2>
        <p className="lgl-lore">A creature has only one Essence tier, the one matching its CR. You cannot harvest a lower tier from a higher-CR creature.</p>
        <DataTable fit columns={["Creature CR", "DC", "Component", "Item Rarity"]} rows={ESSENCE_TABLE.map((e) => [e.cr, `DC ${e.dc}`, e.name, <RarityChip rarity={e.rarity} key="r" />])} />
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Harvest Tables by Creature Type</h2>
        <p className="lgl-lore">Jump straight to a creature type's table.</p>
        <div className="lgl-jumprow">
          {HARVEST_TABLES.map((t) => (
            <button
              key={t.type}
              className="lgl-jumpchip"
              onClick={() => document.getElementById(`harvest-${slugify(t.type)}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {t.type}
            </button>
          ))}
        </div>
        <div className="lgl-dckey">
          {[5, 10, 15, 20, 25, 30].map((d) => <DCChip dc={d} key={d} />)}
          <span className="lgl-dckey-v"><sup>ᵛ</sup> = volatile component</span>
        </div>
        {HARVEST_TABLES.map((t) => <HarvestTableBlock data={t} key={t.type} />)}
      </section>
    </article>
  );
}

function CraftingPage() {
  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Mechanic · New in this edition</div>
        <h1>Crafting</h1>
        <p className="lgl-tagline">Turning harvested components into magic items, three different ways.</p>
      </header>
      <p className="lgl-lore">There are three crafting paths: Manufacturing, Enchanting, and Forging. You can't enchant an item that doesn't exist yet, every magic item starts as a mundane object that has to come from somewhere.</p>

      <section className="lgl-block">
        <h2 className="lgl-h2">Manufacturing</h2>
        <p className="lgl-lore">Manufacturing is building a mundane, nonmagical item from raw materials: a blacksmith forging a longsword, a leatherworker stitching armor, a carpenter carving a staff. It needs the right tools, the right materials, time, and a successful Manufacturing Check. The deep details (material costs, exact times, DCs per item) are in the DM's hands, talk to them about what a given item needs.</p>
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Enchanting</h2>
        <p className="lgl-lore">Enchanting draws the magic out of a component and binds it into a mundane item. This is the primary path for players, and the one most tied to harvesting.</p>
        <p className="lgl-lore"><b>What you need:</b> a mundane item, a monster component, and an Essence. The item and component come from the recipe; the Essence's tier comes from the finished item's rarity. Using a higher Essence than required upgrades the item to match, and the DM may enhance its effects.</p>
        <p className="lgl-lore"><b>Who can enchant:</b> only spellcasters. The check uses your spellcasting ability (INT, WIS, or CHA) alongside the skill tied to the component's creature type, the same Creature Type &amp; Associated Skill table from Harvesting.</p>
        <ExampleBox>A Flame Tongue Longsword needs a Dragon Breath Sac. Dragons use Survival. A Wizard enchanting it makes an Intelligence (Survival) check; a Cleric makes a Wisdom (Survival) check.</ExampleBox>
        <h3 className="lgl-h2" style={{ marginTop: 28 }}>Rarity, DC &amp; Time</h3>
        <DataTable
          columns={["Rarity", "Essence", "Check DC", "Consumable", "Non-Attunement", "Attunement"]}
          rows={ENCHANT_TABLE.map((e) => [<RarityChip rarity={e.rarity} key="r" />, e.essence, <PlainChip key="dc">DC {e.dc}</PlainChip>, e.consumable, e.non, e.att])}
        />
        <p className="lgl-muted">Artifact tier omitted, consult your DM. Most enchanters work in 8-hour sessions and pick up where they left off.</p>
        <FormulaBox>Enchanting Check = 1d20 + Spellcasting Ability modifier + Proficiency Bonus (if proficient)</FormulaBox>
        <p className="lgl-lore">Meet or beat the DC and the item is complete. Fail, and the item isn't destroyed, it just needs time to recover before another attempt.</p>
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Forging</h2>
        <p className="lgl-lore">Forging combines Manufacturing and Enchanting into one process: the magic goes into the raw materials from the start instead of being added afterward. Critically, it needs no spellcasting ability, the forger uses the ability tied to their tool instead. This makes Forging the main path for non-spellcasters.</p>
        <p className="lgl-lore">Forging needs everything Manufacturing and Enchanting each need: materials, a component, an Essence, tools, and time. The crafter makes two checks: a normal Manufacturing Check, and an Enchanting Check using their tool's ability instead of a spellcasting one. Time taken is whichever of the two is longer.</p>
        <ExampleBox>Forging a Flame Tongue Longsword needs 5 gp of steel ingots, a Dragon Breath Sac, and a Potent Essence. A blacksmith makes a DC 17 Strength (Smith's Tools) check for Manufacturing and a DC 21 Strength (Survival) check for Enchanting. The time is 320 hours, the longer of the two.</ExampleBox>
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Crafting Quirks</h2>
        <p className="lgl-lore">Rather than a flat pass or fail, the margin on a crafting check can add boons or flaws that make an item unique. An exceptional roll might mean a weapon that hits slightly harder or a potion that lasts longer. A poor one might mean armor that chafes, a wand that occasionally misfires, or a ring that runs warm.</p>
      </section>

      <section className="lgl-block">
        <h2 className="lgl-h2">Tools &amp; Their Products</h2>
        <p className="lgl-lore">Every Manufacturing and Forging check needs a specific tool. When in doubt which tool applies, the DM has final say.</p>
        <DataTable columns={["Tool", "Ability", "Item Types"]} rows={TOOLS_TABLE} />
        <p className="lgl-muted">"Miscellaneous" can belong to any category. Required tool and material cost for those is at the DM's discretion.</p>
      </section>
    </article>
  );
}


/* ============================================ LEGACY TRAIT INDEX =========== */
/* Traits are classified from their own rules text rather than hand-tagged, so
   anything added to a race later files itself. A trait matching two categories
   is listed under both. */
const TRAIT_CATEGORIES = [
  { id: "offense", label: "Offense", icon: Swords,
    re: /\b(attack|damage|weapon|crit|strike|melee|ranged|unarmed|slashing|piercing|bludgeoning|breath weapon|deal\w* \d|d\d+ (?:fire|cold|acid|force|radiant|necrotic|poison|psychic|thunder|lightning)|martial)/i },
  { id: "defense", label: "Defense", icon: ShieldCheck,
    re: /\b(resistan|immun|armor class|\bAC\b|temp\w* HP|half damage|reduc\w* the damage|absorb|shield|ward\b|protect|drop to 1 HP|can't be (?:surprised|frightened|charmed|moved)|damage threshold|fortitude)/i },
  { id: "movement", label: "Movement", icon: Crosshair,
    re: /\b(speed|fly|flight|swim|climb|burrow|teleport|dash|difficult terrain|movement|jump|leap|prone|disengage|incorporeal|step\b|walk)/i },
  { id: "senses", label: "Senses & Detection", icon: Eye,
    re: /\b(darkvision|blindsight|tremorsense|truesight|vision|sight|perception|detect|sens\w*|invisib|track|hidden|conceal|scent|smell|investigation|surprise)/i },
  { id: "magic", label: "Magic", icon: Sparkles,
    re: /\b(spell|cantrip|cast\b|magic|arcane|ritual|illusion|conjur|summon|leyline|innate|radiant|necrotic|psychic|force damage|manifest)/i },
  { id: "social", label: "Social & Mind", icon: Heart,
    re: /\b(charm|frighten|fear\b|persuasion|deception|intimidat|language|telepath|insight|command|enrage|CHA check|performance|mockery)/i },
  { id: "fortune", label: "Fortune & Fate", icon: Dices,
    re: /\b(luck|fortune|reroll|re-roll|fate|advantage on (?:a |your |all )?(?:saving throw|save)|disadvantage on (?:a |its |their )?(?:saving throw|save)|initiative|yes\/no question|future)/i },
  { id: "utility", label: "Utility & Skill", icon: Wrench,
    re: /\b(proficien|expertise|tool|skill|breathe|hold your breath|carrying capacity|environment|weather|survival|craft|navigat|history|athletics|acrobatics|stealth)/i },
  { id: "recovery", label: "Recovery", icon: Cross,
    re: /\b(regain|heal|restor|recover|stabiliz|cure|remove\w* (?:all )?(?:combat fatigue|a condition|one condition)|second wind|hit points back)/i },
];

/* Walks every race, subrace, and universal pool and returns one flat list.
   Built-in features are excluded — this index is only what you choose. */
function collectLegacyTraits() {
  const out = [];
  const push = (t, source, sourceId, kind) => {
    if (/^\(built-in\)/i.test(t.note || "")) return;
    out.push({ name: t.name, note: t.note, source, sourceId, kind });
  };
  for (const r of CONTENT.races) {
    (r.legacy || []).forEach((t) => push(t, r.name, r.id, "race"));
    (r.subraces || []).forEach((sr) => (sr.traits || []).forEach((t) => push(t, sr.name, r.id, "subrace")));
  }
  for (const c of UNIVERSAL_LEGACY_TRAIT_CATEGORIES) {
    (c.traits || []).forEach((t) => push(t, c.name, null, "universal"));
  }
  return out;
}

function categorizeTrait(t) {
  const hay = `${t.name} ${t.note || ""}`;
  const hits = TRAIT_CATEGORIES.filter((c) => c.re.test(hay)).map((c) => c.id);
  return hits.length ? hits : ["utility"];
}

function LegacyTraitIndex({ navigate }) {
  const [query, setQuery] = useState("");
  const [openCat, setOpenCat] = useState(null);
  const all = useMemo(() => {
    const list = collectLegacyTraits();
    list.forEach((t) => { t.cats = categorizeTrait(t); });
    return list;
  }, []);
  const q = query.trim().toLowerCase();
  const matches = (t) => !q || t.name.toLowerCase().includes(q) || (t.note || "").toLowerCase().includes(q) || t.source.toLowerCase().includes(q);
  const filtered = all.filter(matches);

  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Mechanics</div>
        <h1>Legacy Trait Index</h1>
        <p className="lgl-tagline">Every legacy trait in Loglandia, grouped by what it does. Traits that do two things appear under both.</p>
      </header>

      <div className="lgl-traitindex-search">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search traits, rules text, or source…" aria-label="Search legacy traits" />
        <span className="lgl-traitindex-count">{filtered.length} of {all.length}</span>
      </div>

      {TRAIT_CATEGORIES.map((cat) => {
        const items = filtered.filter((t) => t.cats.includes(cat.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!items.length) return null;
        const isOpen = q ? true : openCat === cat.id;
        const Icon = cat.icon;
        return (
          <section className="lgl-traitcat" key={cat.id}>
            <button className="lgl-traitcat-toggle" onClick={() => setOpenCat(isOpen && !q ? null : cat.id)} aria-expanded={isOpen}>
              <Icon size={15} className="lgl-traitcat-icon" />
              <span className="lgl-traitcat-name">{cat.label}</span>
              <span className="lgl-traitcat-count">{items.length}</span>
              <ChevronRight size={14} className={"lgl-traitcat-chevron" + (isOpen ? " is-open" : "")} />
            </button>
            {isOpen && (
              <div className="lgl-traitcat-body">
                {items.map((t) => (
                  <div className="lgl-traitindex-row" key={cat.id + t.source + t.name}>
                    <div className="lgl-traitindex-head">
                      <span className="lgl-traitindex-name">{t.name}</span>
                      {t.sourceId ? (
                        <button className="lgl-traitindex-src" onClick={() => navigate("wiki", { entryId: t.sourceId })} title={"Open " + t.source}>
                          {t.source}
                        </button>
                      ) : (
                        <span className="lgl-traitindex-src is-universal">{t.source}</span>
                      )}
                    </div>
                    <div className="lgl-traitindex-note"><TraitNote note={t.note} /></div>
                    {t.cats.length > 1 && (
                      <div className="lgl-traitindex-also">
                        Also in {t.cats.filter((c) => c !== cat.id).map((c) => TRAIT_CATEGORIES.find((x) => x.id === c)?.label).join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {filtered.length === 0 && <div className="lgl-racestep-empty">No traits match that search.</div>}
    </article>
  );
}

const MECH_TRAIT_INDEX = "__trait_index__";
const MECH_HOME = "__mechhome__";

/* Icons for the Mechanics landing tiles, keyed by entry id. Anything without
   an entry here falls back to the scroll. */
const MECH_ICONS = { houserules: Scroll, resurrection: Cross, combatfatigue: Dumbbell, downtime: Home, favoredsoul: Wand2 };

/* ============================================ FAVORED SOUL DATA ============ */
/* Parsed from Logan's Favored Soul homebrew doc. Rendered by FavoredSoulPage. */
const FAVSOUL_DATA = {
  intro: ["Favored Souls exist somewhere between Warlocks and Paladins: they don't have the versatility that invocations grant the former, nor the pure combat ability of the latter, but what they lack in these respects they make up for by having strong focused abilities that develop as they level, and the versatility of pact magic mixed with a prepared spell list.", "The first major consideration when creating your Favored Soul character is how they came to be — a Favored Soul must be favored by some divine or deific being after all. They never come into being purely by chance, and are always an act of providence or fate. What god do they draw their power from? What plans does the god have in mind for the Favored Soul? Does that Favored Soul believe in the portfolio of that god, do they reject it and any claim that their power comes with responsibility, or do they even know where their power comes from? A Favored Soul is not like other divine casters or pact casters in that they don't owe the source of their power anything, and once they have the power it is theirs — it cannot be taken away for disobedience or for veering off their fated path.", "Second, look over the Favored Soul abilities and decide if they are one who relies more on their magical powers or on their divine strength. They are capable of being mid-range fighters and, if certain features are taken, even gain higher hit dice than other martial classes do. Through investment in their magical powers they gain more pact spell slots and the ability to split them into smaller slots as well, which can make their magic last longer."],
  quickBuild: { intro: "When creating a Favored Soul there is likely no such thing as \"quick\" in the conceptual phase, but the actual build can be fairly straightforward. These builds assume you are devoted to your divine origins: choose Charisma as your highest ability score, followed by Constitution — these ensure you get the most out of your spells, and can concentrate on them more easily. Next, choose the acolyte or folk hero backgrounds. Finally, choose one of the following sets of 1st-level spells to know, depending on your gameplay style:", options: ["**Combat-Oriented** — *Absorb energy, igniting smite, inflict wounds,* and *valkyrie strike.* When you reach 2nd level, choose the Essence Armament option.", "**Support-Oriented** — *Bless, feather fall, heroism,* and *shield of summer.* When you reach 2nd level, choose the Essence Flight option.", "**Magic-Oriented** — *Color spray, divine favor, inflict wounds,* and *shield of summer.* When you reach 2nd level, choose the Essential Radiance option."] },
  table: { header: ["Level", "Prof. Bonus", "Features", "Prepared", "Known", "Slots", "Slot Level"], rows: [
    ["1st", "+2", "Cosmic Burden, Pact Magic", "2", "4", "1", "1st"],
    ["2nd", "+2", "Divergent Essence, Purification", "2", "5", "2", "1st"],
    ["3rd", "+2", "Fighting Style", "3", "7", "2", "2nd"],
    ["4th", "+2", "Ability Score Improvement", "3", "8", "2", "2nd"],
    ["5th", "+3", "Extra Attack", "4", "9", "2", "3rd"],
    ["6th", "+3", "Burden Feature", "4", "10", "2", "3rd"],
    ["7th", "+3", "Fighting Style Advancement", "5", "11", "2", "4th"],
    ["8th", "+3", "Ability Score Improvement", "5", "12", "2", "4th"],
    ["9th", "+4", "Essence Focus", "5", "14", "2", "5th"],
    ["10th", "+4", "Burden Feature", "6", "15", "2", "5th"],
    ["11th", "+4", "Fighting Style Advancement (2nd)", "6", "17", "3", "5th"],
    ["12th", "+4", "Ability Score Improvement", "6", "18", "3", "5th"],
    ["13th", "+5", "Burden Feature", "7", "19", "3", "5th"],
    ["14th", "+5", "Essence Expansion", "7", "20", "3", "5th"],
    ["15th", "+5", "Fighting Style Advancement (3rd)", "7", "21", "3", "5th"],
    ["16th", "+5", "Ability Score Improvement", "7", "22", "3", "5th"],
    ["17th", "+6", "Crown of Splendor", "8", "23", "4", "5th"],
    ["18th", "+6", "Essence Mastery", "8", "24", "4", "5th"],
    ["19th", "+6", "Ability Score Improvement", "8", "25", "4", "5th"],
    ["20th", "+6", "True Divine Mantle", "8", "26", "4", "5th"]
  ] },
  classFeaturesPreamble: ["As a Favored Soul, you have the following class features.", "**Hit Dice:** 1d10 per Favored Soul level **Hit Points at 1st Level:** 10 + Constitution modifier **Hit Points at Higher Levels:** 1d10 (or 6) + your Constitution modifier per Favored Soul level after the 1st.", "**Armor:** Light armor, medium armor **Weapons:** Simple weapons, martial weapons **Tools:** None **Saving Throws:** Strength, Charisma **Skills:** Choose two skills from Arcana, History, Intimidation, Medicine, Persuasion, Religion, and Riding.", "**Equipment:** You start with the following equipment, in addition to the equipment granted by your background: - (a) two martial weapons: one melee and one ranged - (a) five javelins or (b) any simple melee weapon - (a) a priest's pack or (b) an explorer's pack - Chain shirt and a backpack", "Favored Souls begin at level 1 with 5d4 x 10 (120) gold pieces."],
  classFeatures: [
    { name: "Cosmic Burden", level: "1st-level Favored Soul feature", body: "You are granted power by the source of your divine power, known as your Cosmic Burden. Choose one during character creation: you gain the 1st-level feature(s) for that Cosmic Burden, then gain the Burden's abilities at the Favored Soul levels listed.  You should discuss with your GM at length what Burden is suitable for the character you want to create, as your very existence as a Favored Soul is contingent on this choice." },
    { name: "Pact Magic", level: "1st-level Favored Soul feature", body: "Your soul and blood are infused with the power of a being beyond your understanding, granting you an effortless connection to magic beyond mortal means. Please see the general rules for spellcasting, and the Favored Soul spell list for the list of spells you have access to.  **Spell Slots.** The Favored Soul table shows how many pact spell slots you have to cast your Favored Soul spells of 1st through 5th level. The table shows the level of these slots. Your Favored Soul pact spell slots are all of the same level, and are used to cast your spells of 1st level or higher. You regain all expended pact spell slots when you complete a Short or Long Rest.  **Spells Known of 1st Level and Higher.** You learn spells as a Favored Soul according to the Favored Soul table, but each time you complete a Long Rest you must prepare which from among your learned spells you are capable of casting.  *Learning Spells.* At 1st level you know four 1st-level spells from the Favored Soul spell list. The Favored Soul table outlines when you learn more, which you do as you gain levels as a Favored Soul. When you learn new Favored Soul spells they must be of a level you have Favored Soul pact spell slots of a high enough level to cast. Each time you gain a level as a Favored Soul, you can switch one of your currently known Favored Soul spells for another you are capable of learning.  *Preparing Spells.* Each time you complete a Long Rest you may choose a number of Favored Soul spells that you know (as described above) as listed on the Favored Soul table. These spells are considered prepared, and you can cast them using your pact spell slots (but not regular spell slots) until the next time you prepare new Favored Soul spells. If you complete a Long Rest and choose not to prepare new spells, you retain your previously prepared ones.  **Spellcasting Ability.** Your spellcasting ability for your Favored Soul spell attacks and Favored Soul spell save DC is Charisma. Any time your Favored Soul features refer to a save DC or spell attack without clarifying how it should be calculated, they use these calculations for them as well.  **Spell Focus.** You can use a divine focus as a spellcasting focus for your Favored Soul spells, or you may use a weapon you are proficient with instead." },
    { name: "Divergent Essence", level: "2nd-level Favored Soul feature", body: "The power of your burden becomes more resolute, and is able to be focused into a tangible form. Choose one of the following Essence Options, which you gain immediately.  **Essence Armament.** You can conjure up a weapon made of divine power — be it dark or just — that resembles and mechanically functions as the favored weapon of the deity from which your burden originates. This weapon can appear as a solid version of the weapon, or a construct made of energy as you describe it.  You can summon this weapon as a bonus action on your turn, and dispel it as a bonus action as well. If another creature attempts to make an attack using the weapon it vanishes immediately, as it does if it goes more than 100 feet away from you (or further than twice its long range, if it is a thrown weapon). If it is out of your hands you can use your reaction to dispel it or summon it back to your hands.  This weapon counts as magical, and when you attack with it you can use your Favored Soul spellcasting ability for your attack and damage rolls using it. If it requires ammunition it can create mundane (but magical) ammunition for it to use, but it still must be reloaded/loaded as it normally would be.  **Essence Flight.** You can summon a set of wings that sprout from your back (or a more abstract representation of them), granting you a flight speed equal to your proficiency bonus x 10 feet. If you already have a fly speed, it is increased by half your proficiency bonus (rounded down) x 10 feet instead.  If you are knocked prone while flying, you can use your reaction to right yourself from prone immediately without falling.  **Essential Radiance.** You have one additional pact spell slot, which functions identically to and is counted as one of your Favored Soul pact spell slots.  Furthermore, you now learn cantrips as you level as a Favored Soul: you learn a number of cantrips from the Cleric spell list (which count as Favored Soul cantrips for you) equal to the level of your Favored Soul pact spell slots. Each time you gain a level as a Favored Soul, when that number increases you gain a new cantrip this way, and each time you level as a Favored Soul at all you can switch one of your current Favored Soul cantrips for another." },
    { name: "Purification", level: "2nd-level Favored Soul feature", body: "A number of times per Long Rest equal to half your proficiency bonus (rounded down), you can invoke the power of your divine nature to produce one of the following effects as an action; you must choose an effect which matches part of your alignment:  **Restoration (Good).** Choose one creature within 30 feet of you that you can see. A wave of positive energy washes over them, restoring hit points to them equal to 10 x the slot level of your pact spell slots.  **Destruction (Evil).** Choose one creature within 30 feet of you that you can see. That creature must succeed on a Constitution saving throw, or else a wave of destructive energy washes over them and deals damage to them equal to 2d8 x the level of your pact spell slots. This damage is necrotic, but your GM may allow a different damage type based on the origin of your Cosmic Burden.  **Righteous Declaration (Lawful).** Choose a number of creatures you can see within 60 feet of you equal to half your Favored Soul level (rounded down), at whom you declare a unified command. Each target must succeed a Wisdom saving throw or follow your command. These commands follow the rules of the *command* spell.  **Void Will (Chaos).** Choose one creature within 60 feet of you who you can see, who you attempt to break the mind of. Your target must succeed a Charisma saving throw or be stunned for 1 minute. During this time they reattempt the saving throw each time they take damage and at the end of each of their turns, ending the effect on a success.  **Holy Sanctuary (Neutral).** You are bathed in divine light, which remains for 1 minute. During this time, each time a creature attempts to target you with an attack or harmful effect they must succeed a Charisma saving throw: on a failure, they cannot target you (and the action is spent), and cannot do so again until the end of that turn. If they succeed they proceed as expected, unaffected by this protection for the remainder of that turn. This effect ends early if you fall unconscious or are incapacitated.  If you are true neutral, attackers who succeed don't become immune to the effects of Holy Sanctuary and must repeat it each time they attempt to target you as described above." },
    { name: "Fighting Style", level: "3rd-level Favored Soul feature", body: "You adopt a Fighting Style to represent skills you specialize in. Choose one of the following options: Archery, Blessed Warrior, Dueling, Great Weapon Fighting, Interception, Protection, Superior Technique.  You cannot take a Fighting Style option more than once, even if you later get to choose again." },
    { name: "Ability Score Improvement", level: "4th/8th/12th/16th/19th-level Favored Soul feature", body: "When you reach 4th level, and again at 8th, 12th, 16th, and 19th level, you can take one feat you meet the conditions for, increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. As normal, you can't increase an ability score above 20 using this feature." },
    { name: "Extra Attack", level: "5th-level Favored Soul feature", body: "When you take the Attack action, you can attack twice instead of once." },
    { name: "Fighting Style Advancement", level: "7th/11th/15th-level feature advancement", body: "Once at 7th level, then again at 11th, and 15th level each, you advance one of your Fighting Styles. If you have none to advance, you may choose a new one to gain instead from the choices presented at 3rd level." },
    { name: "Essence Focus", level: "9th-level Favored Soul feature", body: "You focus the power of your Cosmic Burden into yet another form, as well as improve upon the first. You gain one additional Essence Option from your 2nd-level Divergent Essence feature, as well as gain one of the Essence Focus choices below for the one you previously selected. When later features grant you additional choices, you cannot pick the same one twice:  **Essence Armament** - *Devoted Critical.* You score a critical hit with your Armament Weapon on a d20 result of 19 or 20. - *Energy Surge.* Your Essence Armament deals an additional weapon die of damage. The damage is radiant or necrotic (your choice when you gain this feature), or a type deemed appropriate for the source of your Cosmic Burden by your GM. - *Soul Blade.* Your Essence Armament has an enhancement bonus equal to half your proficiency bonus (rounded down), and when you attack with it as part of an Attack action, you can make one attack with it as a bonus action. If your Essence Armament merges with another weapon with an enhancement bonus (such as through Possessed Weapon), the higher of the two is used in place of the other. - *Versatile Essence.* Your Essence Armament can be any type of weapon you are proficient with, instead of just your deity's favored weapon. Changing it after it is already conjured requires a bonus action.  **Essence Flight** - *Aura of Protected Personage.* If you are wearing no armor you can choose to calculate your armor class as 10 + your Dexterity modifier + your Charisma modifier. Furthermore, you can cast the *shield* spell a number of times per Long Rest equal to half your proficiency bonus, requiring no spell slot to do so. - *Flight Dash.* You can take the Dash action as a bonus action, but when you do so this way you only move up to half your Fly speed instead of your base movement speed. - *Uninhibited Sight.* You can see invisible creatures around you as if they were plainly visible, and can see into the Ethereal Realm from the Material Plane and vice versa. If you see a creature on one plane, you can interact with it from the other. This vision extends out to a number of feet equal to your proficiency bonus x 10.  **Essential Radiance** - *Body of the Planes.* Your maximum hit points increase by 1 for each Favored Soul level you have when gaining this benefit, then it increases by 1 again each time you gain another Favored Soul level. - *Providencial Caster.* When you make a spellcasting ability check for any of your Favored Soul spells, you may add half your proficiency bonus (rounded down) to the result. Furthermore, you may add your Charisma modifier to the result of any damage roll you make for your Favored Soul cantrips. - *Split Soul Spell.* When casting a spell using a Favored Soul pact spell slot, you can choose to create two \"minor\" pact spell slots, each of a level equal to half your proficiency bonus (rounded up). One of these slots is immediately used to cast the triggering spell, and you retain the other until you use it or you complete a Short or Long Rest. To use this feature, the spell you cast must be of a level the resulting minor pact spell slots are capable of casting. You cannot split a minor pact spell slot using this feature." },
    { name: "Essence Expansion", level: "14th-level Favored Soul feature", body: "You gain the following bonuses for each Essence Option you have picked so far, and you gain one Essence Focus choice for each of them.  **Essence Armament: Possessed Weapon.** As a bonus action, you can now merge your Essence Armament with a regular weapon as long as it meets the following criteria: - If one has either of the light or finesse properties the other cannot have either of the heavy or two-handed properties, and vice versa. - Your armament and the weapon must both be ranged weapons or both be melee weapons. - You are proficient with both weapons.  While merged, the weapon takes on the weapon damage die that is the higher of the two, but you pick which weapon's properties are used (indicating its physical appearance). Beyond this, both weapons have all of the effects of the possessed weapon and all the benefits of your Essence Armament. However, if you dispel your Armament they cease being merged, as do they if you complete a Short or Long Rest.  If you merge your Essence Armament with your deity's favored weapon, the first attack you make with it each turn has advantage.  **Essence Flight: Divine Skirmisher.** You do not provoke opportunity attacks from creatures if you both entered and exited their reach on the same turn.  **Essential Radiance: Empowered Pact.** When you cast a spell using a pact spell slot, you can treat its slot level as if it was equal to half your Favored Soul level (rounded down, maximum 9th). You can do so twice per Long Rest." },
    { name: "Crown of Splendor", level: "17th-level Favored Soul feature", body: "You gain proficiency in one saving throw of your choice that you don't already have." },
    { name: "Essence Mastery", level: "18th-level Favored Soul feature", body: "You gain the Essence Option you have not previously gained, and can choose one additional Essence Focus choice for each of the ones you already have." },
    { name: "True Divine Mantle", level: "20th-level Favored Soul feature", body: "The divine power within you breaches the boundary between mortals and the divine, granting you superhuman attributes. You gain the following benefits: - When you take the Attack action you may attack three times instead of once. - When you are reduced to 0 hit points and begin dying, you suffer no penalties to your movement, do not fall prone, can still concentrate on spells, and you can still take an action or bonus action on your turn (but not both). - Any time you make an ability check or saving throw that does not already add your proficiency bonus, you may add half your proficiency bonus (rounded down) to the result. - You gain an extra pact spell slot that functions identically to your usual Favored Soul pact spell slots, except that it is a 9th-level slot and is only regained when you complete a Long Rest. Features that calculate their effects based on your pact spell slots (such as Purification) recognize this slot as your highest level spell slot." }
  ],
  cosmicBurdens: { intro: "A Favored Soul's power comes from the deific being that they carry a part of. Their burden may be the result of being born from such a being and a mortal, by being born to prophecy or providence as the agent of a greater being's will, or being chosen by such a being to be vested with a fragment of their divine might. Whatever the source, a Favored Soul has a direct connection to the power of a deity, and an undeniable purpose to serve in the grand scheme of things. This power is their Cosmic Burden.", items: [
    { name: "Burtromet", desc: "Driven by a need to forge and create, this fiery warrior can conjure up javelins of flame, and unleash huge waves of fire and destruction on their enemies." },
    { name: "Ilsrabae", desc: "Able to survive below the sea, those granted power by Ilsrabae can conjure freezing waters to attack others, are able to survive when breathing water, and generate a veil of cold energy to protect themselves." },
    { name: "Invidiva", desc: "An assassin-like fighter who seeks to exploit openings left by their opponents, much as a Rogue would. They are highly capable when striking with weapons that can overwhelm opponents, and gain improved speed." },
    { name: "Ivsil", desc: "Wearing a roaring gale as a protective charm, this Favored Soul has power over the wind around them. They act quickly and without hesitation in combat, and are able to pull their opponents into the air by inverting gravity." },
    { name: "Lussuria", desc: "Raised as a plaything and a trophy to be admired, this Favored Soul bends others to their will with charm and psychic force, and is likely to be a mortal child of Lussuria or one of her followers." },
    { name: "Malveth", desc: "The beneficiary of the protections afforded by the undead — this subclass can survive killing blows as though they were undead, is a master of necromancy, and can steal vitality from their enemies." },
    { name: "Mortuous", desc: "Raised as an entertaining combatant for the Challenger, this Favored Soul bears the scales of Mortuous' dragonkin flesh, punishes distracted foes, and grows in raw durability and ferocity as they fight." },
    { name: "Scorn", desc: "Marked by a bloody, whispering compulsion to kill, this Favored Soul fights with claws of necrotic energy and feeds on violence, healing from the carnage they cause." },
    { name: "Tithiss", desc: "Attuned to the forces of life, this Favored Soul yearns to ease pain and spread relief, mending allies, growing forests from nothing, and resisting the acid that flows through Tithiss' own domain." },
    { name: "Vaeloria", desc: "This avatar of the moon can summon a celestial rabbit familiar to aid them in combat; they can also move quickly, see through darkness of all kinds, and conjure radiant moonlight to weaken others." },
    { name: "Vestias", desc: "Keeper of the eidomantic web and burdened with a reverence for magic, this Favored Soul resists spells, channels a wider well of sorcery, and casts with unusual speed and ease." }
  ] },
  burdenMalveth: {
  favoredWeapon: "Greatscythe",
  renamedNote: null,
  intro: ["Favored soul choosing a favored soul is paramount to assigning a true representative for himself in the Material Plane. The Court of Decay knows to watch for them and take them into their ranks as their chosen leader, even above the equerries of the court. The burden they carry is to lead Malveth's followers to spread undeath in the world — a path they may not be keen to follow."],
  features: [
    { name: "Malveth's Compulsion", level: null, body: "Malveth's influence demands a respect for perpetuity and patience, granting you aspects like an undead being. Any spell or effect that interacts with an undead creature differently (including spells that detect them, and spells that can or cannot target them) treat you as an undead, and ignore your other creature types." },
    { name: "Master of Necromancy", level: "1st-level Burden of Malveth Feature", body: "Inherited from Malveth's domain, you are a master of necromancy. You can treat all necromancy spells, as well as spells from the Unbound Moralisms spell group, as if they were on the favored soul spell list, allowing you to learn and cast them.  You have one extra pact spell slot that is the same level as those listed on the favored soul table and acts the same way — this special spell slot can only be used to cast spells of the necromancy school, however." },
    { name: "Uncanny Body", level: "1st-level Burden of Malveth Feature", body: "You are proficient in Constitution saving throws and are resistant to necrotic damage." },
    { name: "Deathly Fortitude", level: "6th-level Burden of Malveth Feature", body: "Malveth's influence grants you the durability of a risen undead: if damage reduces you to 0 hit points, you must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success you drop to 1 hit point instead.  Each time you avoid being reduced to 0 hit points this way, the DC increases by 2 until you complete a Short or Long Rest." },
    { name: "Gluttonous Infliction", level: "10th-level Burden of Malveth Feature", body: "In place of a weapon attack you can spend a use of Purification to cast *inflict wounds* on a creature within range (requiring no spell slot), as if it was cast using one of your pact spell slots. You need not have learned or prepared the spell to do so. On a hit, you can choose to either regain hit points equal to the damage you deal, or gain the same amount in temporary hit points.  If you miss with *inflict wounds*, your use of Purification is regained at the end of your turn." },
    { name: "Animate Menials", level: "13th-level Burden of Malveth Feature", body: "Once per Long Rest, you can conjure 1d4+2 Decaying Menials, each of them appearing in an unoccupied space you choose within 30 feet of you. The menials roll initiative collectively, all taking their turn on the same initiative count, and all of the menials have a joint hit point pool of 15 x the number of menials summoned. They share these hit points, and if one dies from damage they all die immediately. They cannot regain lost hit points.  These menials share your proficiency bonus for their saving throws, and the save DC for their Nightmare Visage is equal to your spell save DC. They also use your spell attack bonus for their Rake attacks.  Your summoned menials will obey your commands, taking whatever actions are available to them on their turn. However, if a menial begins its turn further than 30 feet away from you it will move toward you to get within that range, and if they cannot they will take the Dodge action after making their best effort to do so. If given no commands, they will move back within 30 feet of you and do their best to defend themselves, including attacking creatures hostile to you.  Once summoned, these menials die after 10 minutes.  ---" }
  ],
},
  burdenVaeloria: {
  favoredWeapon: "Combat Scythe",
  renamedNote: null,
  intro: ["The caring embrace of Vaeloria protects those led astray in the darkness, and her burden falls unto her favored in the form of a duty to protect those who are lost. Her Favored Souls are charged with braving the darkness to aid the downtrodden and wayward. Her power manifests in the creation of soothing moonlight, eyes that pierce the darkness, and the ability to vanish like a shadow hidden in Somnus Domina's shadow."],
  features: [
    { name: "Moon Rabbit Familiar", level: "1st-level Burden of Vaeloria Feature", body: "Once per Long Rest, you can cast *find familiar* at a spell level equal to your pact spell slot level (requiring no spell slot) to summon a moon rabbit familiar. This familiar uses the Moon Rabbit Familiar stat block, but otherwise runs by the regular rules for a familiar summoned by this spell.  This familiar is capable of using its Moonlight Missile to attack on its turn, and a moon rabbit summoned this way adds your pact spell slot level to all of its saving throws.", statblock: { name: "Moon Rabbit Familiar", type: "Tiny celestial, lawful good", ac: "Equal to its master's spell save DC", hp: "5 plus (5 x the level of the spell slot used to summon it)", speed: "30 ft., climb 30 ft.", abilities: ["STR 10 (–)", "DEX 16 (+3)", "CON 10 (–)", "INT 7 (–2)", "WIS 14 (+2)", "CHA 10 (–)"], senses: "darkvision 60 ft., passive Perception 12", languages: "understands the languages of its summoner, but doesn't speak", traits: [{ name: "Magic Resistance", desc: "The moon rabbit has advantage on saving throws against magical effects." }, { name: "Protective Bond", desc: "Any creature occupying the same space as the moon rabbit shares its Magic Resistance trait." }, { name: "Ride-Along", desc: "The moon rabbit can move into the same space as a willing Medium or larger creature with 5 feet of it, ending its movement by magically riding atop the creature. Until it spends 5 feet of movement to move to an adjacent space, it occupies that space, cannot be targeted by attacks or effects, and moves with them when they do." }], actions: [{ name: "Moonlight Missile", desc: "Ranged Spell Attack: + the summoner's spell attack bonus, range 10 feet, one target. *Hit:* radiant damage equal to 1d8 plus the slot level used to summon it." }], bonus: [{ name: "Dash", desc: "The rabbit takes the Dash action." }], reactions: [{ name: "Crystal Moonlight Shield", desc: "When a creature within 20 feet of the moon rabbit is targeted by a weapon attack, the moon rabbit can teleport to their side and project a shimmering crystal membrane that increases the creature's armor class by the level of the spell slot used to summon them, and this increase lasts until the end of the turn (including against the triggering attack). If any attack hits the target regardless of this effect, the membrane shatters and the effect ends." }] } },
    { name: "Rabbit's Haste", level: "1st-level Burden of Vaeloria Feature", body: "You have the speed of a defy rabbit: you can take the Dash action as a bonus action, and when you make a High Jump or Long Jump, the distance of each is increased by 10 feet (5 feet if done without movement beforehand to make a full jump)." },
    { name: "Bright Eyes in the Darkness", level: "6th-level Burden of Vaeloria Feature", body: "You are able to see normally in darkness and dim light (magical or otherwise) up to a distance equal to 20 feet x your proficiency bonus. Furthermore, you have Expertise in the Perception skill." },
    { name: "Circle of Radiant Moonlight", level: "10th-level Burden of Vaeloria Feature", body: "As an action you can create a 40-foot-radius sphere of bright moonlight centered on yourself by spending a use of Purification. This moonlight penetrates any magical or otherwise darkness within this space — fully illuminating it — and the sphere follows you as you move.  When the sphere appears you can force any number of creatures you choose within it to make a Constitution saving throw, taking radiant damage equal to 1d10 x your pact spell slot level on a failure, or half as much damage on a successful save. On subsequent turns you can use your bonus action to choose one creature within the sphere to target with the same save and damage. When targeting only one creature, if they fail they are blinded until the start of your next turn." },
    { name: "New Moon Shade", level: "13th-level Burden of Vaeloria Feature", body: "When you are in darkness or dim light, you can use your bonus action to turn invisible until the end of your turn, or until you step into bright light.  Furthermore, you can produce the effects of *greater invisibility* once per Short or Long Rest, requiring no spell slot. This is not treated as a spell or magical effect." }
  ],
},
  burdenInvidiva: {
  favoredWeapon: "Bladed chain",
  intro: ["Thieves and assassins followed Invidiva, one half of the Twin Temptations. Her nature is to seize control of what others have, and this extends to her favored. A Favored Soul of Invidiva is expected to work as an assassin of the highest order, and whether they walk this path or not, they will find themselves taking to the shadows as if it was second nature."],
  features: [
    { name: "Cunning Action", level: "1st-level Burden of Invidiva Feature", body: "As a bonus action you can take the Dash, Hide or Disengage action." },
    { name: "Skills of the Grasping Twin", level: "1st-level Burden of Invidiva Feature", body: "You have Expertise in the Stealth skill.\n\nWhen you hit a creature with an attack you have advantage on, you deal an additional d6 of acid damage to your target by generating a magical corrosive sap as you strike. This only applies to attacks with weapons with the light or finesse properties." },
    { name: "Expert Duelist", level: "6th-level Burden of Invidiva Feature", body: "You gain the Dueling Fighting Style. If you already have it you advance it instead." },
    { name: "Twin Strike", level: "6th-level Burden of Invidiva Feature", body: "When you attack a creature with a weapon that has the secondary property, you can make that weapon's second attack as part of an Attack action instead of as a bonus action (requiring you attack with it at least once beforehand). The secondary attack can use whichever ability score would normally work with the weapon's primary attack." },
    { name: "Total Elimination", level: "10th-level Burden of Invidiva Feature", body: "As an action, you can spend a use of Purification to become invisible for 1 minute. During this minute you make no sound when you move and leave no physical tracks. Furthermore, while invisible this way, you score a critical hit on a d20 result of 19 or 20 when wielding a weapon with the light or finesse property.\n\nWhen you score a critical hit while invisible, you can choose to end this effect early to deal damage in addition to the critical damage of your weapon's type, equal to 2d10 x your pact spell slot level. This damage is not multiplied by your critical hit." },
    { name: "Increased Agility", level: "13th-level Burden of Invidiva Feature", body: "Your base movement speed increases by 10 feet." }
  ],
  },
  burdenIvsil: {
  favoredWeapon: "Scimitar",
  intro: ["The will of the Blood Wind is difficult to interpret, but the storm it embodies leaves their favored wracked with a sense of displacement — they do not feel they are where they should be, and are prone to uprooting themselves. Ivsil's Favored Souls compulsively seek to escape their surroundings and rebel against that which holds them down."],
  features: [
    { name: "Tempestuous Essence", level: "1st-level Burden of Ivsil Feature", body: "When you take the Essence Armament, Essence Flight or Essential Radiance options at 2nd-level or higher, you gain the following traits for the corresponding option:",
      subs: [
        { name: "Ivsil's Billowing Shroud", tag: "Essential Radiance", body: "You can cast Ilsrabae's veil once per Short or Long Rest (requiring no spell slot) at a level equal to your pact spell slots level. When you do, it takes the form of feathers sprouting from your body and a chaotic wind surrounding you. It grants you immunity to thunder damage instead of resistance to cold damage, deals thunder damage instead of cold, and causes ranged attacks made against you to have disadvantage." },
        { name: "Hurricane Strike", tag: "Essence Armament", body: "Your Essence Armament can deal thunder damage instead of its normal damage type, and regardless of if this is the case, it deals additional thunder damage equal to your proficiency bonus." },
        { name: "Wings of the Storm", tag: "Essence Flight", body: "The flight speed granted by your Essence Flight is increased by 5 feet x your proficiency bonus." }
      ] },
    { name: "Thunderous Resistance", level: "1st-level Burden of Ivsil Feature", body: "You are resistant to thunder damage." },
    { name: "Whirlwind Shunt", level: "6th-level Burden of Ivsil Feature", body: "As an action you can generate a gust of wind in one of two shapes:\n- A 15-foot cone originating from you.\n- A 15-foot cube centered on you.\n\nEach creature within range (except you) must make a Strength saving throw, being pushed 5 feet away from you and falling prone on a failure." },
    { name: "Thunder of Still Air", level: "10th-level Burden of Ivsil Feature", body: "As an action you can spend one use of Purification to cast reverse gravity, requiring no spell slot. You can choose to be unaffected by the spell when you do." },
    { name: "Initiative Surge", level: "13th-level Burden of Ivsil Feature", body: "Your instincts perk up in moments of danger, accompanied by a surge of adrenaline and focus. You cannot be surprised in combat, and have advantage on initiative checks. All attacks made against you before you take your first turn in combat have disadvantage." }
  ],
  },
  burdenLussuria: {
  favoredWeapon: "Glaive",
  intro: ["Lussuria sees her favored as a plaything to be toyed with and controlled; they are an extension of her, and so fills their mind with thoughts of bending others to their will, surrounding themselves with suitors capable of beautiful affection, and being lavished with attention. She speaks to her Favored Souls as though they are deserving of the world, only to raise their value as a trophy only she can truly possess. Her Favored Souls are likely to be (mostly) mortal children born to her or her followers."],
  features: [
    { name: "Entrapping Charm", level: "1st-level Burden of Lussuria Feature", body: "Once per Short/Long Rest, you can cast charm person at the level of your pact spell slots, but requiring no spell slot. If you cast charm person this way and any of your targets are immune to being charmed, you become aware of it and may choose to have them be stunned for the spell's duration instead. If stunned this way, a creature repeats their Charisma saving throw at the end of each of their turns and each time they take damage. Succeeding the save ends the effect." },
    { name: "Malicious Pleading", level: "6th-level Burden of Lussuria Feature", body: "When you are targeted by a weapon attack you can see, you can use your reaction to fill your attacker's mind with guilt and hesitation. They must attempt a Charisma saving throw. On a failure they do not attack you, and cannot do so for the remainder of the turn." },
    { name: "Wave of Subjugative Will", level: "10th-level Burden of Lussuria Feature", body: "As an action, you can spend a use of Purification to target any creatures you can see within 30 feet of you with a wave of overwhelming psychic power. Each target must attempt a Charisma saving throw, and each that fails takes psychic damage equal to 2d6 x your pact spell slot level.\n\nFurthermore, creatures who fail must use their reaction to move up to their movement speed into an unoccupied space you can see, which you choose. If this movement would cause them to move into dangerous ground that could hurt them or into the way of obvious danger, they seize up and their movement speed is reduced to 0 until the end of the turn." },
    { name: "Compelling Allure", level: "13th-level Burden of Lussuria Feature", body: "When you make any Charisma-based ability check or saving throw and roll a d20 result of 9 or lower, you can treat the result as 10 instead." }
  ],
  },
  burdenTithiss: {
  favoredWeapon: "Club, quarterstaff",
  intro: ["Attuned to the forces of life around them, the Favored Soul of Tithiss yearns to ease the pain of all creatures and living beings around them. They are bound by their desire to spread relief."],
  features: [
    { name: "Acid Resistance", level: "1st-level Burden of Tithiss Feature", body: "You are resistant to acid damage." },
    { name: "Oaken Essence", level: "1st-level Burden of Tithiss Feature", body: "When you take the Essence Armament, Essence Flight or Essential Radiance options at 2nd-level or higher, you gain the following traits for the corresponding option:",
      subs: [
        { name: "Sapblooded Strike", tag: "Essence Armament", body: "Your Essence Armament can do acid damage instead of its normal damage type, and regardless of if this is the case, it deals additional acid damage equal to your proficiency bonus." },
        { name: "Tithiss' Husk", tag: "Essential Radiance", body: "You can cast Ilsrabae's veil once per Short or Long Rest (requiring no spell slot), at a level equal to your pact spell slot level. When you do, your skin becomes wooden and hard, granting you immunity to acid damage instead of resistance to cold damage, and the spell deals acid damage instead of cold damage.\n\nFurthermore, while the spell is in effect you reduce all piercing, slashing, and bludgeoning damage you take by an amount equal to half your Favored Soul level (rounded down)." },
        { name: "Tree Walker", tag: "Essence Flight", body: "At the start of each of your turns, you can spend 15 feet of your movement speed to break apart into dirt and stone, and reappear by emerging from a tree you can see within a distance equal to 10 feet x your proficiency bonus, which must be at least as large as you. You exit into an unoccupied space surrounding that tree." }
      ] },
    { name: "Nurturing Arcanist", level: "6th-level Burden of Tithiss Feature", body: "When you cast a spell using a spell slot that targets a single ally, that ally regains hit points equal to half your Favored Soul level (rounded down). When you target multiple at once, they regain hit points equal to the pact spell slot level used to cast the spell instead." },
    { name: "Emergent Forestation", level: "10th-level Burden of Tithiss Feature", body: "As an action you can spend a use of Purification to fill a 30-foot-radius sphere centered on you with growth and vegetation, including three Large 30-foot-tall trees that you choose the positions of. When you use this feature, you also regain hit points equal to 1d8 x your pact spell slot level.\n\nCreatures other than you treat this as difficult terrain, and if any other creature ends its turn within this radius they must succeed a Strength saving throw or be restrained by vines and brambles that hold them in place.\n\nCreatures that are restrained this way take 2d6 acid damage at the start of their turn, and can attempt to break free by succeeding a Strength check as an action against your spell save DC, or by dealing 10 or more damage to the vines holding them in one turn (they have AC equal to your spell save DC, are vulnerable to fire and slashing damage, and resistant to all other damage types).\n\nThis area remains for up to 1 minute, during which time you must concentrate on it as if it was a spell." },
    { name: "Lifelight", level: "13th-level Burden of Tithiss Feature", body: "You can restore the health of others by applying pure magical energy to them — by spending a pact spell slot as an action, you can restore hit points to a creature you can touch by 2d6 x the level of the pact spell slot used. That creature is also cured of any effect that could be removed by lesser restoration." }
  ],
  },
  burdenVestias: {
  favoredWeapon: "Spear, quarterstaff, whip",
  intro: ["Vestias' burden is tied to the dangers of magic, and her Favored Soul inherits her domination of sorcery. As the keeper of the eidomantic web, her favored can resist the power of spells and eidomantic radiation, conjure a greater supply of magical energy, and produce the effects of spells more easily than others. They are burdened with a reverence for magic that directs them to protect its use, rebelling against both those who misuse it and those who seek to stifle it."],
  features: [
    { name: "Eidolons' Favored", level: "1st-level Burden of Vestias Feature", body: "As the Favored Soul of an eidolic deity, you have advantage on eidomancy burn checks, and all of your attacks are both magical and eidolic." },
    { name: "Sky-Keeper's High Sorcery", level: "1st-level Burden of Vestias Feature", body: "As the Favored Soul of Vestias, you can treat spells on the Sorcerer spell list and the Sky-Keeper's Arcana spell group as if they were on the Favored Soul spell list, allowing you to learn and cast them." },
    { name: "Quickcast", level: "6th-level Burden of Vestias Feature", body: "When you take the Attack action, you can use your bonus action to cast a Favored Soul spell that would normally take 1 action. The spell you cast this way is treated as if cast at its base level, even if the spell slot you use to do so is higher." },
    { name: "Anti-Magic Aegis", level: "10th-level Burden of Vestias Feature", body: "As an action you can spend a use of Purification to create a barrier around yourself that renders outside magic ineffectual for 1 minute. During this minute, you are immune to the effects of spells of a spell level equal to or lower than half your Favored Soul level (rounded down) minus 1, unless you choose to be affected by them.\n\nSpells originating from deities and artifacts can bypass this effect, but damage from their spells is still reduced to half (rounded down) and you have advantage on all ability checks and saving throws made against them." },
    { name: "Boon of Sorcery's Might", level: "13th-level Burden of Vestias Feature", body: "You have an additional pact spell slot that functions identically to your Favored Soul pact spell slots, and is of a slot level indicated on the Favored Soul table." }
  ],
  },
  burdenBurtromet: {
  favoredWeapon: "Greathammer",
  intro: ["Burtromet, one of the paraprismatic deities of the Elemental Planes, lays the burden of unquenchable flames upon their favored. Those who inherit this power feel a desire to spread flames in the world, to melt and reform metal into new and dangerous implements of war, and to achieve greater levels of destructive power."],
  features: [
    { name: "Charred Essence", level: "1st-level Burden of Burtromet Feature", body: "When you take the Essence Armament, Essence Flight, or Essential Radiance options at 2nd-level or higher, you gain the following traits for the corresponding option:",
      subs: [
        { name: "Burtromet's Mantle", tag: "Essential Radiance", body: "You can cast Ilsrabae's veil once per Short or Long Rest (requiring no spell slot) at a level equal to your pact spell slot level. When you do, it takes the form of a burning shroud of white-hot flames, grants immunity to fire damage instead of resistance to cold damage, and deals fire damage instead of cold damage." },
        { name: "Forged in Flame", tag: "Essence Armament", body: "Your Essence Armament can do fire damage instead of its normal damage type, and regardless of if this is the case it deals additional fire damage equal to your proficiency bonus." },
        { name: "Shield of Ashen Defiance", tag: "Essence Flight", body: "When you take the Dodge action, you summon a burning shield of fire surrounding you that harms attackers. Creatures that hit you with weapon attacks from within 5 feet of you while you are Dodging take 1d6 fire damage." }
      ] },
    { name: "Fiery Resistance", level: "1st-level Burden of Burtromet Feature", body: "You are resistant to fire damage." },
    { name: "Meteoric Javelin", level: "6th-level Burden of Burtromet Feature", body: "When you take the Attack action, you can replace any weapon attack you make with creating a burning javelin made of flame, which you can hurl at a target you can see within 60 feet as a ranged spell attack. On a hit, these javelins each deal fire damage equal to 2d6 plus your spellcasting ability modifier.\n\nIf you hit a target with two or more of these javelins in the same turn, the target is ignited (as per the condition)." },
    { name: "Hammer of Cracking Kilns", level: "10th-level Burden of Burtromet Feature", body: "Once per turn, when you hit a creature with a melee weapon attack, you can spend one use of Purification to enhance the attack with an overwhelming explosion of heat and force. Your target must succeed a Dexterity saving throw or take fire damage equal to 2d10 x your pact spell slot level. On a success, they take half damage and you can choose to have the fires burst outward, forcing all creatures (except you) in a 20-foot radius centered on your target to make the same Dexterity saving throw. Any creature that fails shares the initial target's damage.\n\nFinally, any creature who fails either save is ignited (as per the condition), taking 2d8 fire damage instead of a d10." },
    { name: "Extra Attack Improvement", level: "13th-level Burden of Burtromet Feature", body: "When you take the Attack action you can attack three times instead of once. When you reach 20th level as a Favored Soul you can attack four times instead." }
  ],
  },
  burdenIlsrabae: {
  favoredWeapon: "Trident",
  intro: ["Ilsrabae beckons her favored to join her beneath the waves, pulling them toward the freezing waters in which she makes her home. She would use her Favored Soul as an agent to spy upon those who walk on land, and to collect tributes to throw to her in the waves below. Her sweet voice whispers of their responsibility to her in their sleep, demanding affection and loyalty."],
  features: [
    { name: "Shivering Resistance", level: "1st-level Burden of Ilsrabae Feature", body: "You are resistant to cold damage." },
    { name: "Sunken Essence", level: "1st-level Burden of Ilsrabae Feature", body: "When you take the Essence Armament, Essence Flight, or Essential Radiance options at 2nd-level or higher, you gain the following traits for the corresponding option:",
      subs: [
        { name: "Aquatic Versatility", tag: "Essence Flight", body: "You can breathe both water and air, and when submerged in liquid you can treat your fly speed as a swim speed." },
        { name: "Ilsrabae's Regalia", tag: "Essential Radiance", body: "You can cast Ilsrabae's veil once per Short or Long Rest (requiring no spell slot) at a level equal to your pact spell slot level. When you do it takes the form of an exquisite dress or robe of icy silk, grants you immunity to cold damage, and gives disadvantage to melee attacks made against you." },
        { name: "Stygian Edge", tag: "Essence Armament", body: "Your Essence Armament can do cold damage instead of its normal damage type, and regardless of if this is the case, it deals additional cold damage equal to your proficiency bonus." }
      ] },
    { name: "Secret Hoarder", level: "6th-level Burden of Ilsrabae Feature", body: "Ilsrabae grants you eyes that see through the unknown: you can read all forms of writing and understand it as though you understood the language, as long as it is not written in code or nonsensical patterns. This includes spell scrolls and magical writing, allowing you to cast written spells on scrolls and similar items as though their contents were on the Favored Soul spell list.\n\nFurthermore, you can cast see invisibility once per Short or Long Rest as though using a pact spell slot, but requiring no spell slot or components." },
    { name: "Tundral Hurricane", level: "10th-level Burden of Ilsrabae Feature", body: "As an action you can spend a use of Purification to conjure up a raging whirlpool of freezing water that spirals around you, targeting each creature you choose within 40 feet of yourself. Each target must succeed a Strength saving throw or take magical bludgeoning damage equal to 1d8 x your pact spell slot level and be restrained as the ice freezes around them. Creatures who succeed take half as much damage and aren't restrained.\n\nCreatures restrained this way can escape by using an action to make a Strength check against your spell save DC, breaking free on a success. Dealing 10 or more damage to the ice in one attack also destroys the ice in that space; the ice has AC equal to your spell save DC, is resistant to nonmagical piercing and slashing damage, and is vulnerable to fire and bludgeoning damage. At the start of each restrained creature's turn they take 2d6 cold damage.\n\nIf this feature is used in range of creatures submerged in liquid, it must target any fully submerged creature, and such creatures have disadvantage on their saving throw against it.\n\nThe spaces that creatures are frozen in and those adjacent to them are coated in ice for 10 minutes, and are difficult terrain." },
    { name: "Veil of the Empress", level: "13th-level Burden of Ilsrabae Feature", body: "You are permanently wreathed in a veil of ice which makes it hard for others to approach you. Creatures who hit you with melee weapon attacks from within 5 feet of you take cold damage equal to half your Favored Soul level (rounded down). Creatures grappling you or who you are grappling also take this damage at the start of your turn.\n\nConsequently, you are vulnerable to fire damage." }
  ],
  },
  burdenMortuous: {
  favoredWeapon: "Lance, gunlance",
  intro: ["The Challenger seeks entertainment by combat, and so treats their Favored Souls as a means to raise an entertaining combatant. They fill their Favored Soul's head with thoughts of competition, strength, and glory — all for the purpose of one day bringing them to their side to explore the limits of their divine strength. As the Favored Soul grows stronger, their body bears the scales of Mortuous' dragonkin flesh."],
  features: [
    { name: "Focus Fighter", level: "1st-level Burden of Mortuous Feature", body: "You are capable of punishing opponents who turn their attention from you: when a creature within range of a melee weapon you are wielding makes an attack against a creature other than you, you can use your reaction to make an opportunity attack against them.\n\nWhen you hit with an opportunity attack, you roll one more of your weapon's damage dice and add it to your damage result." },
    { name: "Challenger's Body", level: "6th-level Burden of Mortuous Feature", body: "Your maximum hit points increase by twice your Favored Soul level, and each time you gain a level as a Favored Soul they again increase by 2." },
    { name: "Surging Champion", level: "10th-level Burden of Mortuous Feature", body: "On your turn, as long as you aren't incapacitated, you can spend a use of Purification to take an additional Attack action, and all attacks made as part of it have advantage.\n\nWhen you end your turn, roll your weapon damage for each time you would have missed an attack as part of that extra action — you gain the combined result as temporary hit points.\n\nYou can only use this feature once per turn." },
    { name: "Extra Attack Improvement", level: "13th-level Burden of Mortuous Feature", body: "When you take the Attack action you can attack three times instead of once. When you reach 20th level as a Favored Soul you can attack four times instead of once." }
  ],
  },
  burdenScorn: {
  favoredWeapon: "Maul",
  intro: ["The favored of Scorn must live with its bloody desires whispering in their ears at all times, compelling them to kill and slaughter. Scorn is a being only concerned with death and mayhem, which maps an unfortunate fate for those who inherit its blessing."],
  features: [
    { name: "Scorn's Murderous Fury", level: null, body: "Those who are the favored of Scorn might suffer from a compulsion to attack those who lay defenseless. If they suffer from this curse, a Favored Soul of Scorn that starts their turn within movement range of a creature at 0 hit points must make a DC 15 Wisdom saving throw. On a failure they are compelled to move toward that creature and make at least one Bestial Clawing attack against them before taking other actions." },
    { name: "Bestial Clawing", level: "1st-level Burden of Scorn Feature", body: "You immediately gain the Essence Armament option from your 2nd-level Essence Armament feature (when you reach that level, this is considered to be your choice). This weapon can either be your favored weapon or can be a minor bestial transformation, wherein your limbs become clawed and horrific.\n\nThese claws also count as your favored weapon, can use your Strength or spellcasting ability for its attack and damage rolls, can be treated as a martial weapon by features and effects, and deal 1d8 slashing or necrotic damage on a successful hit (your choice).\n\nYou can \"throw\" this weapon as if it had the thrown (20/60 feet) property, which takes the form of you clawing the air and a gouge of necrotic energy slashing the space your target is in.\n\nWhen you make one attack with this weapon, you can use your bonus action to make an additional one with it." },
    { name: "Obscene Critical", level: "1st-level Burden of Scorn Feature", body: "You score a critical hit on an attack roll result of 19 or 20. When you score a critical hit using a weapon, you regain hit points equal to half the damage you deal (rounded down).\n\nYou do not gain these benefits against a target who is an undead, construct, or lacks blood." },
    { name: "Return from Death", level: "6th-level Burden of Scorn Feature", body: "When you roll death saving throws, you regain hit points on a d20 result of 19 or 20 instead of only 20. Furthermore, when you roll a 19 or 20 this way you regain hit points equal to one of your Favored Soul hit dice plus your Constitution modifier." },
    { name: "Bloody Phantasia", level: "10th-level Burden of Scorn Feature", body: "You can unleash the murderous power within you as a bonus action by spending a use of Purification, disappearing in a blood-red flash and teleporting to a space adjacent to a creature you can see within 30 feet — you then immediately take an Attack action (requiring no action) against that creature." },
    { name: "Ruthless Reconstitution", level: "13th-level Burden of Scorn Feature", body: "At the start of each of your turns, if you begin your turn with 1 or more hit points but fewer than half your maximum amount, you regain hit points equal to half your Favored Soul level (rounded down)." }
  ],
  },
};

/* ============================================ FAVORED SOUL PAGE ============ */
/* A markdown-lite inline renderer: turns **bold** and *italic* into JSX
   without pulling in a full markdown parser, since this doc uses them
   constantly for feature names, spell names, and sub-labels. */
function mdInline(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((chunk, i) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) return <strong key={i}>{chunk.slice(2, -2)}</strong>;
    if (chunk.startsWith("*") && chunk.endsWith("*")) return <em key={i}>{chunk.slice(1, -1)}</em>;
    return chunk;
  });
}

/* A feature's body may contain plain paragraphs and "- " bullet lines mixed
   together (paragraphs separated by blank lines, same convention as the
   source doc). Renders each paragraph as <p> and each run of bullets as a
   real <ul>, both passed through mdInline for bold/italic. */
function FeatureBody({ text }) {
  if (!text) return null;
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim());
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul className="lgl-fs-list" key={i}>
              {lines.map((l, j) => <li key={j}>{mdInline(l.slice(2))}</li>)}
            </ul>
          );
        }
        return <p className="lgl-fs-p" key={i}>{mdInline(block)}</p>;
      })}
    </>
  );
}

function ClassLevelTable({ table }) {
  return (
    <div className="lgl-fs-tablewrap">
      <table className="lgl-fs-table">
        <thead>
          <tr>{table.header.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>{row.map((c, j) => <td key={j}>{j === 0 ? <strong>{c}</strong> : c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureCard({ feat }) {
  return (
    <div className="lgl-fs-feature">
      <h3 className="lgl-fs-feature-name">{feat.name}</h3>
      {feat.level && <div className="lgl-fs-feature-level">{feat.level}</div>}
      <FeatureBody text={feat.body} />
      {feat.subs?.length > 0 && (
        <div className="lgl-fs-subs">
          {feat.subs.map((sub, i) => (
            <div className="lgl-fs-sub" key={i}>
              <div className="lgl-fs-sub-name">{sub.name}{sub.tag && <span className="lgl-fs-sub-tag"> ({sub.tag})</span>}</div>
              <FeatureBody text={sub.body} />
            </div>
          ))}
        </div>
      )}
      {feat.statblock && <StatBlockCard sb={feat.statblock} />}
      {feat.after && <FeatureBody text={feat.after} />}
    </div>
  );
}

function StatBlockCard({ sb }) {
  const abbrevs = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  return (
    <div className="lgl-statblock">
      <div className="lgl-statblock-name">{sb.name}</div>
      <div className="lgl-statblock-type">{sb.type}</div>
      <div className="lgl-statblock-rule" />
      <div className="lgl-statblock-row"><strong>Armor Class</strong> {sb.ac}</div>
      <div className="lgl-statblock-row"><strong>Hit Points</strong> {sb.hp}</div>
      <div className="lgl-statblock-row"><strong>Speed</strong> {sb.speed}</div>
      <div className="lgl-statblock-rule" />
      <div className="lgl-statblock-abilities">
        {sb.abilities.map((a, i) => {
          const m = a.match(/^(\w+)\s+(.+)$/);
          return (
            <div className="lgl-statblock-ability" key={i}>
              <span className="lgl-statblock-ability-label">{m ? m[1] : abbrevs[i]}</span>
              <span className="lgl-statblock-ability-val">{m ? m[2] : a}</span>
            </div>
          );
        })}
      </div>
      <div className="lgl-statblock-rule" />
      {sb.senses && <div className="lgl-statblock-row"><strong>Senses</strong> {sb.senses}</div>}
      {sb.languages && <div className="lgl-statblock-row"><strong>Languages</strong> {sb.languages}</div>}
      {sb.traits?.length > 0 && (
        <>
          <div className="lgl-statblock-rule" />
          {sb.traits.map((t, i) => <p className="lgl-statblock-trait" key={i}><em>{t.name}.</em> {mdInline(t.desc)}</p>)}
        </>
      )}
      {sb.actions?.length > 0 && (
        <>
          <div className="lgl-statblock-section-h">Actions</div>
          {sb.actions.map((t, i) => <p className="lgl-statblock-trait" key={i}><em>{t.name}.</em> {mdInline(t.desc)}</p>)}
        </>
      )}
      {sb.bonus?.length > 0 && (
        <>
          <div className="lgl-statblock-section-h">Bonus Actions</div>
          {sb.bonus.map((t, i) => <p className="lgl-statblock-trait" key={i}><em>{t.name}.</em> {mdInline(t.desc)}</p>)}
        </>
      )}
      {sb.reactions?.length > 0 && (
        <>
          <div className="lgl-statblock-section-h">Reactions</div>
          {sb.reactions.map((t, i) => <p className="lgl-statblock-trait" key={i}><em>{t.name}.</em> {mdInline(t.desc)}</p>)}
        </>
      )}
    </div>
  );
}

const BURDEN_ICON = {
  "burden-malveth": { icon: Skull, color: "#9ed17f" },
  "burden-vaeloria": { icon: Moon, color: "#a8b0dc" },
  "burden-invidiva": { icon: Eye, color: "#5a8a7a" },
  "burden-ivsil": { icon: CloudLightning, color: "#2b3f7a" },
  "burden-lussuria": { icon: Heart, color: "#b563ac" },
  "burden-tithiss": { icon: Leaf, color: "#2f5023" },
  "burden-vestias": { icon: Sparkles, color: "#7a6fc9" },
  "burden-burtromet": { icon: Flame, color: "#d4552f" },
  "burden-ilsrabae": { icon: Droplets, color: "#2f8fb5" },
  "burden-mortuous": { icon: Swords, color: "#9a7a4a" },
  "burden-scorn": { icon: Axe, color: "#8a3a3a" },
};

function BurdenSection({ id, title, burden }) {
  const theme = BURDEN_ICON[id];
  const Icon = theme?.icon;
  return (
    <section className="lgl-fs-burden" id={id}>
      <div className="lgl-fs-burden-headrow">
        {Icon && (
          <span className="lgl-fs-burden-icon" style={{ "--burden-color": theme.color }}>
            <Icon size={22} />
          </span>
        )}
        <h2 className="lgl-fs-burden-title">{title}</h2>
      </div>
      {burden.renamedNote && <p className="lgl-fs-burden-note"><em>({burden.renamedNote})</em></p>}
      {burden.favoredWeapon && <div className="lgl-fs-favweapon">Favored Weapon(s): <strong>{burden.favoredWeapon}</strong></div>}
      {burden.intro.map((p, i) => <p className="lgl-fs-p" key={i}>{mdInline(p)}</p>)}
      {burden.features.map((f, i) => <FeatureCard feat={f} key={i} />)}
    </section>
  );
}

const BURDEN_PAGES = [
  { id: "burden-malveth", title: "Burden of Malveth", key: "burdenMalveth" },
  { id: "burden-vaeloria", title: "Burden of Vaeloria", key: "burdenVaeloria" },
  { id: "burden-invidiva", title: "Burden of Invidiva", key: "burdenInvidiva" },
  { id: "burden-ivsil", title: "Burden of Ivsil", key: "burdenIvsil" },
  { id: "burden-lussuria", title: "Burden of Lussuria", key: "burdenLussuria" },
  { id: "burden-tithiss", title: "Burden of Tithiss", key: "burdenTithiss" },
  { id: "burden-vestias", title: "Burden of Vestias", key: "burdenVestias" },
  { id: "burden-burtromet", title: "Burden of Burtromet", key: "burdenBurtromet" },
  { id: "burden-ilsrabae", title: "Burden of Ilsrabae", key: "burdenIlsrabae" },
  { id: "burden-mortuous", title: "Burden of Mortuous", key: "burdenMortuous" },
  { id: "burden-scorn", title: "Burden of Scorn", key: "burdenScorn" },
];

function FavoredSoulPage() {
  const d = FAVSOUL_DATA;
  const [burdenId, setBurdenId] = useState(null);
  const burdensRef = useRef(null);
  useEffect(() => {
    document.querySelector(".lgl-main")?.scrollTo({ top: 0, behavior: "auto" });
  }, [burdenId]);

  const jumpToBurdens = () => {
    burdensRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (burdenId) {
    const page = BURDEN_PAGES.find((b) => b.id === burdenId);
    return (
      <article className="lgl-entry wide lgl-fs">
        <button className="lgl-backlink" onClick={() => setBurdenId(null)}><ChevronLeft size={14} /> All Cosmic Burdens</button>
        <BurdenSection id={page.id} title={page.title} burden={d[page.key]} />
      </article>
    );
  }

  return (
    <article className="lgl-entry wide lgl-fs">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Homebrew Class</div>
        <h1>The Favored Soul</h1>
        <p className="lgl-tagline">A caster shaped by an involuntary divine bargain, between the versatility of a Warlock and the martial edge of a Paladin.</p>
      </header>

      <button className="lgl-fs-jumpbtn" onClick={jumpToBurdens}>
        <Dices size={22} className="lgl-fs-jumpbtn-icon" />
        <span className="lgl-fs-jumpbtn-text">
          <span className="lgl-fs-jumpbtn-label">Jump to Cosmic Burdens</span>
          <span className="lgl-fs-jumpbtn-sub">Skip straight to the subclasses</span>
        </span>
        <ChevronRight size={20} className="lgl-fs-jumpbtn-arrow" />
      </button>

      {d.intro.map((p, i) => <p className="lgl-fs-p" key={i}>{mdInline(p)}</p>)}

      <h2 className="lgl-fs-h2">The Favored Soul Table</h2>
      <ClassLevelTable table={d.table} />

      <h2 className="lgl-fs-h2">Class Features</h2>
      {d.classFeaturesPreamble.map((p, i) => <p className="lgl-fs-p" key={i}>{mdInline(p)}</p>)}
      {d.classFeatures.map((f, i) => <FeatureCard feat={f} key={i} />)}

      <h2 className="lgl-fs-h2" ref={burdensRef}>Cosmic Burdens</h2>
      <p className="lgl-fs-p">{mdInline(d.cosmicBurdens.intro)}</p>
      <div className="lgl-fs-burdengrid">
        {d.cosmicBurdens.items.map((it, i) => {
          const bid = "burden-" + it.name.toLowerCase().replace(/\s+/g, "-");
          const t = BURDEN_ICON[bid];
          const Icon = t?.icon;
          const hasPage = BURDEN_PAGES.some((b) => b.id === bid);
          return (
            <button
              key={i}
              className="lgl-fs-burdenbtn"
              style={{ "--burden-color": t?.color || "var(--accent)" }}
              onClick={() => hasPage && setBurdenId(bid)}
              disabled={!hasPage}
            >
              {Icon && <span className="lgl-fs-burdenbtn-icon"><Icon size={22} /></span>}
              <span className="lgl-fs-burdenbtn-name">{it.name}</span>
              <span className="lgl-fs-burdenbtn-desc">{it.desc}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}


function MechanicsHome({ onOpen }) {
  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Loglandia</div>
        <h1>Mechanics</h1>
        <p className="lgl-tagline">The rules that differ from standard 5e, plus a searchable index of every legacy trait in the world.</p>
      </header>
      <div className="lgl-mechhome-grid">
        <button className="lgl-mechtile is-feature" onClick={() => onOpen(MECH_TRAIT_INDEX)}>
          <span className="lgl-mechtile-icon"><Layers size={26} /></span>
          <span className="lgl-mechtile-name">Legacy Trait Index</span>
          <span className="lgl-mechtile-desc">Every legacy trait, grouped by what it actually does. Searchable.</span>
          <span className="lgl-mechtile-cta">Browse <ChevronRight size={13} /></span>
        </button>
        {CONTENT.mechanics.map((m) => {
          const Icon = MECH_ICONS[m.id] || Scroll;
          return (
            <button key={m.id} className="lgl-mechtile" onClick={() => onOpen(m.id)}>
              <span className="lgl-mechtile-icon"><Icon size={24} /></span>
              <span className="lgl-mechtile-name">{m.name}</span>
              {m.tagline && <span className="lgl-mechtile-desc">{m.tagline}</span>}
              <span className="lgl-mechtile-cta">Read <ChevronRight size={13} /></span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

function MechanicsModule({ params, navigate }) {
  const [selectedId, setSelectedId] = useState(params?.entryId || MECH_HOME);
  useEffect(() => { if (params?.entryId) setSelectedId(params.entryId); }, [params?.entryId]);
  useEffect(() => { document.querySelector(".lgl-main")?.scrollTo({ top: 0, behavior: "auto" }); }, [selectedId]);
  const entry = CONTENT.mechanics.find((e) => e.id === selectedId);
  const aside = (
    <nav className="lgl-side" aria-label="Mechanics navigation">
      <div className="lgl-side-head">Mechanics</div>
      <div className="lgl-nav-scroll">
        <div className="lgl-nav-group">
          <button className={"lgl-nav-item lgl-nav-home" + (selectedId === MECH_HOME ? " is-active" : "")} onClick={() => setSelectedId(MECH_HOME)}>
            <Home size={13} /> Mechanics Home
          </button>
          <button className={"lgl-nav-item lgl-nav-home" + (selectedId === MECH_TRAIT_INDEX ? " is-active" : "")} onClick={() => setSelectedId(MECH_TRAIT_INDEX)}>
            <Layers size={13} /> Legacy Trait Index
          </button>
          {CONTENT.mechanics.map((it) => (
            <button key={it.id} className={"lgl-nav-item" + (it.id === selectedId ? " is-active" : "")} onClick={() => setSelectedId(it.id)}>
              {it.name}{it.isNew && <span className="lgl-dot" title="New" />}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
  return (
    <ModuleShell aside={aside} asideTitle="Mechanics">
      {selectedId === MECH_HOME ? <MechanicsHome onOpen={setSelectedId} />
        : selectedId === MECH_TRAIT_INDEX ? <LegacyTraitIndex navigate={navigate} />
        : selectedId === "favoredsoul" ? <FavoredSoulPage />
        : <EntryPage entry={entry} />}
    </ModuleShell>
  );
}

/* ===================================================== MODULE: GLOSSARY ==== */
function GlossaryModule() {
  return (
    <ModuleShell>
      <EntryPage entry={GLOSSARY_PAGE} hideArt />
    </ModuleShell>
  );
}

/* ============================================== MODULE: HARVESTING & CRAFTING */
const CRAFT_HOME = "__crafthome__";
const CRAFT_CARDS = [
  { id: "harvesting", name: "Harvesting", desc: "Pull usable materials from Loglandia itself.", icon: Sparkles },
  { id: "crafting", name: "Crafting", desc: "Turn raw materials into gear, tools, and consumables.", icon: Wrench },
];

function CraftHome({ onOpen, onJumpToHarvest }) {
  return (
    <article className="lgl-entry wide lgl-centered">
      <header className="lgl-entry-head">
        <div className="lgl-eyebrow">Mechanic · New in this edition</div>
        <h1>Harvesting &amp; Crafting</h1>
        <p className="lgl-tagline">Pull materials from the world, then turn them into gear. Pick a page below.</p>
      </header>
      <div className="lgl-wikihome-grid">
        {CRAFT_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.id} className="lgl-wikihome-card" onClick={() => onOpen(c.id)}>
              <span className="lgl-wikihome-card-icon"><Icon size={18} /></span>
              <span className="lgl-wikihome-card-label">{c.name}</span>
              <span className="lgl-wikihome-card-count">{c.desc}</span>
            </button>
          );
        })}
      </div>
      <section className="lgl-block">
        <h2 className="lgl-h2">Jump to a Harvest Table</h2>
        <p className="lgl-lore">Skip straight to a creature type's table on the Harvesting page.</p>
        <div className="lgl-jumprow">
          {HARVEST_TABLES.map((t) => (
            <button key={t.type} className="lgl-jumpchip" onClick={() => onJumpToHarvest(t.type)}>
              {t.type}
            </button>
          ))}
        </div>
      </section>
    </article>
  );
}

function CraftModule({ params }) {
  const initial = params?.entryId === "harvesting" || params?.entryId === "crafting" ? params.entryId : CRAFT_HOME;
  const [selectedId, setSelectedId] = useState(initial);
  const pendingScroll = useRef(null);
  useEffect(() => {
    if (params?.entryId === "harvesting" || params?.entryId === "crafting") setSelectedId(params.entryId);
  }, [params?.entryId]);
  useEffect(() => {
    if (selectedId === "harvesting" && pendingScroll.current) {
      const target = pendingScroll.current;
      pendingScroll.current = null;
      requestAnimationFrame(() => {
        document.getElementById(`harvest-${slugify(target)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [selectedId]);
  const jumpToHarvest = (creatureType) => {
    pendingScroll.current = creatureType;
    setSelectedId("harvesting");
  };
  const aside = (
    <nav className="lgl-side" aria-label="Harvesting & Crafting navigation">
      <div className="lgl-side-head">Harvesting &amp; Crafting</div>
      <div className="lgl-nav-scroll">
        <button className={"lgl-nav-item lgl-nav-home" + (selectedId === CRAFT_HOME ? " is-active" : "")} onClick={() => setSelectedId(CRAFT_HOME)}>
          <BookOpen size={13} /> Overview
        </button>
        <div className="lgl-nav-group">
          {CRAFT_CARDS.map((c) => (
            <button key={c.id} className={"lgl-nav-item" + (c.id === selectedId ? " is-active" : "")} onClick={() => setSelectedId(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
  return (
    <ModuleShell aside={aside} asideTitle="Harvesting & Crafting">
      {selectedId === "harvesting" ? <HarvestingPage />
        : selectedId === "crafting" ? <CraftingPage />
        : <CraftHome onOpen={setSelectedId} onJumpToHarvest={jumpToHarvest} />}
    </ModuleShell>
  );
}

const HOME_CARDS = [
  { key: "wiki", label: "Codex", icon: BookOpen, desc: "Races, gods, regions, characters, and the timeline. Look anything up." },
  { key: "heroes", label: "Heroes of Loglandia", icon: Swords, desc: "A page for every hero the party has brought to life — pictures, sheets, whatever you want on it." },
  { key: "map", label: "Map", icon: MapIcon, desc: "An interactive atlas. Click a region to delve into its lore." },
  { key: "mechanics", label: "New Rules", icon: Wrench, desc: "Legacy traits, house rules, and resurrection rules." },
  { key: "craft", label: "Harvesting & Crafting", icon: Anvil, desc: "Pull materials from the world, then turn them into gear." },
  { key: "glossary", label: "Glossary", icon: Puzzle, desc: "What the shorthand in every trait actually means." },
];
const HOME_FEATURE = { key: "builder", label: "Character Builder", icon: UserPlus, desc: "Build a character from race to final details, eight steps, your way." };

function HomeModule({ navigate }) {
  return (
    <div className="lgl-home">
      <div className="lgl-home-hero">
        <h1 className="lgl-home-title">Loglandia</h1>
      </div>
      <div className="lgl-home-grid">
        {HOME_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.key} className="lgl-home-card" onClick={() => navigate(c.key)}>
              <span className="lgl-home-card-icon"><Icon size={20} /></span>
              <span className="lgl-home-card-label">{c.label}</span>
              <span className="lgl-home-card-desc">{c.desc}</span>
              <span className="lgl-home-card-go">Enter <ChevronRight size={13} /></span>
            </button>
          );
        })}
        <button key={HOME_FEATURE.key} className="lgl-home-feature" onClick={() => navigate(HOME_FEATURE.key)}>
          <span className="lgl-home-feature-icon"><UserPlus size={30} /></span>
          <span className="lgl-home-feature-label">{HOME_FEATURE.label}</span>
          <span className="lgl-home-feature-desc">{HOME_FEATURE.desc}</span>
          <span className="lgl-home-feature-go">Enter <ChevronRight size={15} /></span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ THE REGISTRY  */
const MODULES = [
  { key: "wiki", label: "Codex", icon: BookOpen },
  { key: "heroes", label: "Heroes of Loglandia", icon: Swords },
  { key: "map", label: "Map", icon: MapIcon },
  { key: "mechanics", label: "New Rules", icon: Wrench },
  { key: "craft", label: "Harvesting & Crafting", icon: Anvil },
  { key: "glossary", label: "Glossary", icon: Puzzle },
  { key: "builder", label: "Character Builder", icon: UserPlus },
];

/* --------------------------------------------------------------------- APP */
/* ============================================ GM ACCESS ==================== */
/* A light password gate in front of "Behind the Screen" GM content (god
   DM Back sections, character DM Back fields). This is not real security —
   it's a static site, so the password is sitting right there in the bundle
   for anyone who opens devtools. It's just a speed bump so a player glancing
   at the DM's screen doesn't see spoilers by accident. Change the password
   below to whatever you want. */
const GM_PASSWORD = "loglandia";
const GM_UNLOCK_KEY = "lgl-gm-unlocked-v1";

const GMAccessContext = createContext(null);

/* ============================================ DEV MODE ===================== */
/* Lets you edit Codex prose right on the page. Edits save to this browser's
   localStorage only — they never touch the source file, so use "Export
   Edits" to hand the JSON back for folding into the real data. */
const DEV_EDITS_KEY = "lgl-dev-edits-v1";
const DEV_MODE_KEY = "lgl-dev-mode-v1";

function loadDevEdits() {
  try { return JSON.parse(localStorage.getItem(DEV_EDITS_KEY) || "{}"); } catch { return {}; }
}
function saveDevEdits(edits) {
  try { localStorage.setItem(DEV_EDITS_KEY, JSON.stringify(edits)); } catch {}
}

const DevModeContext = createContext(null);

/* Applies this browser's saved edits over an entry's lore text at render
   time. Never mutates CONTENT — always non-destructive and reversible. */
function applyDevEdits(entry, edits) {
  if (!entry) return entry;
  const e = edits[entry.id];
  if (!e) return entry;
  return {
    ...entry,
    lore: e.lore !== undefined ? e.lore : entry.lore,
    tagline: e.tagline !== undefined ? e.tagline : entry.tagline,
    loreSections: entry.loreSections?.map((sec, i) => {
      const se = e.sections?.[i];
      if (!se) return sec;
      return {
        ...sec,
        h: se.h !== undefined ? se.h : sec.h,
        p: sec.p.map((para, j) => (typeof para === "string" && se.p?.[j] !== undefined ? se.p[j] : para)),
      };
    }),
  };
}

/* A piece of text that becomes contentEditable when Dev Mode is on. Saves
   to the Dev Mode context on blur, so typing never triggers a re-render. */
function DevEditable({ as: Tag = "p", value, onSave, className }) {
  const { devMode } = useContext(DevModeContext) || {};
  if (!devMode) return <Tag className={className}>{parseLore(value)}</Tag>;
  return (
    <Tag
      className={(className || "") + " lgl-dev-editable"}
      contentEditable
      suppressContentEditableWarning
      title="Editing raw text — [[links]] use double brackets"
      onBlur={(e) => {
        const t = e.currentTarget.textContent;
        if (t !== value) onSave(t);
      }}
    >
      {value}
    </Tag>
  );
}

function DevModeProvider({ children }) {
  const [devMode, setDevMode] = useState(() => { try { return localStorage.getItem(DEV_MODE_KEY) === "1"; } catch { return false; } });
  const [edits, setEdits] = useState(() => loadDevEdits());
  const [history, setHistory] = useState([]); // stack of previous `edits` snapshots, for Undo
  const [confirmingReset, setConfirmingReset] = useState(false);
  const toggleDevMode = () => setDevMode((d) => { const next = !d; try { localStorage.setItem(DEV_MODE_KEY, next ? "1" : "0"); } catch {} return next; });

  const updateEdit = (entryId, updater) => {
    setEdits((prev) => {
      setHistory((h) => [...h, prev].slice(-25)); // cap history so it can't grow unbounded
      const merged = { ...prev, [entryId]: updater(prev[entryId] || {}) };
      saveDevEdits(merged);
      return merged;
    });
  };
  const editCount = Object.keys(edits).length;
  const exportEdits = () => {
    const blob = new Blob([JSON.stringify(edits, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "loglandia-dev-edits.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  /* window.confirm() is blocked in some sandboxed previews, so Reset All
     confirms inline in the bar instead of using a browser dialog. */
  const requestReset = () => {
    if (!confirmingReset) { setConfirmingReset(true); return; }
    setHistory((h) => [...h, edits].slice(-25));
    setEdits({}); saveDevEdits({});
    setConfirmingReset(false);
  };
  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prevState = h[h.length - 1];
      setEdits(prevState);
      saveDevEdits(prevState);
      return h.slice(0, -1);
    });
    setConfirmingReset(false);
  };
  return (
    <DevModeContext.Provider value={{ devMode, edits, updateEdit }}>
      {children}
      <button className={"lgl-devfab" + (devMode ? " is-on" : "")} onClick={toggleDevMode} title={devMode ? "Turn off Dev Mode" : "Turn on Dev Mode"}>
        <Wrench size={17} />
      </button>
      {devMode && (
        <div className="lgl-devbar">
          <span className="lgl-devbar-dot" /> Dev Mode — click any lore text to edit. Saves to this browser only.
          {editCount > 0 && <span className="lgl-devbar-count">{editCount} entr{editCount === 1 ? "y" : "ies"} edited</span>}
          <button className="lgl-devbar-btn" onClick={exportEdits} disabled={editCount === 0}>Export Edits</button>
          <button className="lgl-devbar-btn" onClick={undo} disabled={history.length === 0} title="Undo the last change">Undo</button>
          <button className={"lgl-devbar-btn is-danger" + (confirmingReset ? " is-confirming" : "")} onClick={requestReset} onMouseLeave={() => setConfirmingReset(false)} disabled={editCount === 0}>
            {confirmingReset ? "Click to confirm" : "Reset All"}
          </button>
        </div>
      )}
    </DevModeContext.Provider>
  );
}

function GMAccessProvider({ children }) {
  const [unlocked, setUnlocked] = useState(() => { try { return localStorage.getItem(GM_UNLOCK_KEY) === "1"; } catch { return false; } });
  const unlock = (pw) => {
    if (pw === GM_PASSWORD) {
      setUnlocked(true);
      try { localStorage.setItem(GM_UNLOCK_KEY, "1"); } catch {}
      return true;
    }
    return false;
  };
  const lock = () => {
    setUnlocked(false);
    try { localStorage.removeItem(GM_UNLOCK_KEY); } catch {}
  };
  return <GMAccessContext.Provider value={{ unlocked, unlock, lock }}>{children}</GMAccessContext.Provider>;
}


export default function LoglandiaShell() {
  const [route, setRoute] = useState({ module: "home", params: {} });
  const [character, setCharacter] = useState({ raceId: null, subraceName: null, legacyPicks: [], classId: null, backgroundId: null, backstory: "", abilities: { rolled: null, assign: {} }, name: "", alignment: "", campaignId: null, skillChoices: [] });
  const [playerName, setPlayerNameState] = useState(() => getStoredName());
  const setPlayerName = (name) => { setPlayerNameState(name); setStoredName(name); };
  const [builderStep, setBuilderStep] = useState(0);
  const [builderPhase, setBuilderPhase] = useState("start");
  const navigate = (module, params = {}) => setRoute({ module, params });
  useEffect(() => {
    const id = "lgl-fonts"; if (document.getElementById(id)) return;
    const link = document.createElement("link"); link.id = id; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
  const mk = route.module;
  return (
    <GMAccessProvider>
    <DevModeProvider>
    <div className="lgl">
      <style>{CSS}</style>
      <header className="lgl-topbar">
        <button className={"lgl-brand" + (mk === "home" ? " is-active" : "")} onClick={() => navigate("home")} aria-label="Go to homepage"><Home size={17} /><span>Home</span></button>
        <nav className="lgl-tabs" aria-label="Modules">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.key} className={"lgl-tab" + (mk === m.key ? " is-active" : "") + (m.key === "builder" ? " is-apart" : "")} aria-current={mk === m.key} onClick={() => navigate(m.key)}>
                <Icon size={16} /><span>{m.label}</span>
              </button>
            );
          })}
        </nav>
      </header>
      <div className="lgl-body">
        <NavContext.Provider value={navigate}>
          {mk === "home" && <HomeModule navigate={navigate} />}
          {mk === "wiki" && <WikiModule params={route.params} navigate={navigate} />}
          {mk === "heroes" && <HeroesModule />}
          {mk === "map" && <MapModule navigate={navigate} />}
          {mk === "mechanics" && <MechanicsModule params={route.params} navigate={navigate} />}
          {mk === "craft" && <CraftModule params={route.params} />}
          {mk === "glossary" && <GlossaryModule />}
          {mk === "builder" && <BuilderModule character={character} setCharacter={setCharacter} step={builderStep} setStep={setBuilderStep} phase={builderPhase} setPhase={setBuilderPhase} navigate={navigate} playerName={playerName} setPlayerName={setPlayerName} />}
        </NavContext.Provider>
      </div>
    </div>
    </DevModeProvider>
    </GMAccessProvider>
  );
}

/* ------------------------------------------------------------------- THEME */
const CSS = `
.lgl{
  --bg:#0E0E10; --surface:#181819; --elev:#232327; --line:#343438;
  --hi:#ECECEE; --mid:#A6A6AD; --faint:#6E6E76;
  --accent:#C8A86B; --accent-soft:rgba(200,168,107,.12);
  --parchment:#E9E5DA; --parchment-ink:#24242A; --parchment-line:#CFCBBF;
  --serif:"Spectral", Georgia, "Times New Roman", serif;
  --sans:"Inter", system-ui, -apple-system, sans-serif;
  position:relative; display:flex; flex-direction:column; width:100%; height:100vh; min-height:100vh;
  background:var(--bg); color:var(--hi); font-family:var(--sans); line-height:1.6; font-size:16px;
  border-radius:0; overflow:hidden;
  text-align:center;
}
.lgl *{ box-sizing:border-box; }
.lgl button{ font-family:inherit; }
html, body{ margin:0; padding:0; height:100%; width:100%; background:#0E0E10; }
body{ display:block; place-items:unset; }
#root{ min-height:100vh; width:100%; max-width:none; margin:0; padding:0; display:block; }

/* Centering is the default everywhere. Two exceptions, both functional:
   - form fields stay left-aligned so typing/reading a value doesn't jump around
   - the timeline keeps its left-anchored rail (dot + vertical line), where
     centered text would float disconnected from its marker */
.lgl input, .lgl select, .lgl textarea{ text-align:left; }
.lgl select{
  background:var(--surface); color:var(--hi); border:1px solid var(--line);
  border-radius:7px; padding:7px 11px; font-size:14px; font-family:var(--sans); cursor:pointer;
  -webkit-appearance:none; appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23A6A6AD' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 10px center; padding-right:30px;
}
.lgl select:focus{ outline:2px solid var(--accent); outline-offset:1px; border-color:transparent; }
.lgl select option{ background:var(--surface); color:var(--hi); }
.lgl select option:checked{ background:var(--accent-soft); color:var(--accent); }
.lgl-timeline, .lgl-tl-item{ text-align:left; }
.lgl-topbar{ flex:0 0 auto; display:flex; align-items:center; gap:18px; height:56px; padding:0 16px; background:#0A0A0C; border-bottom:1px solid var(--line); z-index:20; }
.lgl-brand{ display:flex; align-items:center; gap:8px; font-family:var(--serif); font-weight:600; font-size:16px; color:var(--accent); flex:0 0 auto; background:none; border:none; cursor:pointer; padding:6px 8px; border-radius:8px; }
.lgl-brand:hover{ background:var(--surface); }
.lgl-brand:focus-visible{ outline:2px solid var(--accent); outline-offset:1px; }
.lgl-brand.is-active{ background:var(--accent-soft); }
.lgl-brand span{ color:var(--hi); }
.lgl-tabs{ display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; width:100%; }
.lgl-tabs::-webkit-scrollbar{ display:none; }
.lgl-tab{ flex:0 0 auto; display:flex; align-items:center; gap:7px; padding:8px 14px; border:none; background:none; color:var(--faint); border-radius:8px; cursor:pointer; font-size:14px; white-space:nowrap; }
.lgl-tab:hover{ color:var(--mid); background:var(--surface); }
.lgl-tab.is-active{ color:var(--accent); background:var(--accent-soft); font-weight:500; }
.lgl-tab:focus-visible{ outline:2px solid var(--accent); outline-offset:1px; }
.lgl-tab.is-apart{ margin-left:auto; position:relative; }
.lgl-tab.is-apart::before{ content:''; position:absolute; left:-9px; top:9px; bottom:9px; width:1px; background:var(--line); }
.lgl-body{ flex:1; display:flex; min-height:0; position:relative; }
.lgl-module{ flex:1; display:flex; min-width:0; }
.lgl-aside-wrap{ position:relative; flex:0 0 212px; border-right:1px solid var(--line); background:var(--bg); }
.lgl-aside-inner{ height:100%; }
.lgl-main-wrap{ flex:1; min-width:0; display:flex; flex-direction:column; }
.lgl-aside-toggle{ display:none; align-items:center; gap:7px; margin:12px 12px 0; padding:8px 12px; background:var(--surface); border:1px solid var(--line); color:var(--hi); border-radius:8px; font-size:13px; cursor:pointer; }
.lgl-main{ flex:1; overflow:auto; }
.lgl-side{ display:flex; flex-direction:column; height:100%; }
.lgl-side-head{ font-family:var(--serif); font-size:13px; font-weight:600; color:var(--hi); padding:14px 14px 8px; }
.lgl-search{ padding:0 14px 12px; }
.lgl-search input{ width:100%; background:var(--surface); border:1px solid var(--line); color:var(--hi); border-radius:8px; padding:9px 11px; font-size:13px; }
.lgl-search input::placeholder{ color:var(--faint); }
.lgl-search input:focus{ outline:2px solid var(--accent); outline-offset:1px; border-color:transparent; }
.lgl-nav-scroll{ overflow-y:auto; overflow-x:hidden; padding:2px 8px 14px; }
.lgl-nav-group{ margin-bottom:14px; }
.lgl-nav-label{ font-family:var(--serif); font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--accent); font-weight:600; text-align:center; white-space:normal; }
.lgl-nav-empty{ font-size:12px; color:var(--faint); padding:2px 10px; font-style:italic; }
.lgl-nav-item{ display:flex; align-items:center; justify-content:center; gap:6px; width:100%; text-align:center; background:none; border:none; cursor:pointer; color:var(--mid); font-size:14px; padding:7px 10px; border-radius:7px; }
.lgl-nav-item:hover{ color:var(--hi); background:var(--surface); }
.lgl-nav-item.is-active{ color:var(--accent); background:var(--accent-soft); font-weight:500; }
.lgl-dot{ width:6px; height:6px; border-radius:50%; background:var(--accent); }
.lgl-step{ display:flex; align-items:center; justify-content:flex-start; gap:8px; width:100%; text-align:left; background:none; border:none; cursor:pointer; color:var(--mid); font-size:12px; padding:6px 8px; border-radius:7px; }
.lgl-step:hover{ background:var(--surface); color:var(--hi); }
.lgl-step.is-active{ color:var(--accent); background:var(--accent-soft); font-weight:500; }
.lgl-step-n{ width:17px; height:17px; flex:0 0 auto; border:1px solid var(--line); border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; color:var(--faint); }
.lgl-step:hover{ background:var(--surface); color:var(--hi); }
.lgl-step.is-active{ color:var(--accent); background:var(--accent-soft); font-weight:500; }
.lgl-step-n{ width:20px; height:20px; flex:0 0 auto; border:1px solid var(--line); border-radius:50%; font-size:11px; display:flex; align-items:center; justify-content:center; color:var(--faint); }
.lgl-step.is-active .lgl-step-n{ border-color:var(--accent); color:var(--accent); }
.lgl-step.is-done .lgl-step-n{ background:var(--accent); color:var(--bg); border-color:var(--accent); }
.lgl-entry{ max-width:680px; margin:0 auto; padding:46px 40px 80px; }
.lgl-entry.wide{ max-width:980px; }
.lgl-entry.lgl-entry-start{ max-width:1140px; }
.lgl-entry.lgl-entry-race{ max-width:1340px; }
.lgl-entry-head{ border-bottom:1px solid var(--line); padding-bottom:22px; margin-bottom:26px; text-align:center; }
.lgl-eyebrow-row{ display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
.lgl-eyebrow{ font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:var(--accent); font-weight:600; }
.lgl-badge{ font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--bg); background:var(--accent); padding:3px 8px; border-radius:999px; font-weight:600; }
.lgl-badge.soft{ color:var(--mid); background:transparent; border:1px solid var(--line); }
.lgl-entry h1{ font-family:var(--serif); font-weight:600; font-size:52px; line-height:1.04; margin:0; letter-spacing:-.01em; }
.lgl-tagline{ font-family:var(--serif); font-style:italic; font-size:19px; color:var(--mid); margin:14px 0 0; }
.lgl-art{ height:200px; border:1px solid var(--line); border-radius:10px; background:repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,.012) 22px 44px), linear-gradient(180deg, var(--elev), var(--surface)); display:flex; align-items:center; justify-content:center; margin-bottom:28px; }
.lgl-art-real{ display:block; width:auto; max-width:100%; height:auto; max-height:480px; margin:0 auto 28px; object-fit:contain; background:none; border:none; border-radius:0; filter:drop-shadow(0 0 1px rgba(255,255,255,.3)) drop-shadow(0 0 1px rgba(255,255,255,.3)) drop-shadow(0 10px 22px rgba(0,0,0,.55)); }
.lgl-art span{ font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:var(--faint); }
.lgl-lore{ font-size:17px; color:var(--hi); margin:0 0 22px; }
.lgl-facts{ margin:0 0 26px; display:flex; flex-wrap:wrap; justify-content:center; gap:10px; }
.lgl-fact{ display:flex; flex-direction:column; align-items:center; gap:5px; border:1px solid var(--line); border-radius:9px; background:var(--surface); padding:10px 16px; min-width:120px; }
.lgl-fact-label{ font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--faint); }
.lgl-fact-value{ display:flex; flex-wrap:wrap; justify-content:center; gap:6px; color:var(--mid); font-size:14px; }
.lgl-fchip{ font-size:12px; color:var(--accent); border:1px solid var(--line); background:var(--accent-soft); border-radius:999px; padding:2px 10px; }
.lgl-muted{ color:var(--faint); font-size:13px; margin-top:24px; }
.lgl-muted code, .lgl-tales-note code{ background:var(--surface); border:1px solid var(--line); border-radius:4px; padding:1px 5px; font-size:12px; color:var(--accent); }
.lgl-aside{ margin:6px 0 30px; padding:20px 24px; border-radius:6px; background:repeating-linear-gradient(0deg, transparent 0 26px, rgba(0,0,0,.025) 26px 27px), var(--parchment); color:var(--parchment-ink); border:1px solid var(--parchment-line); border-left:4px solid var(--accent); font-family:var(--serif); font-style:italic; font-size:16px; line-height:1.55; box-shadow:0 10px 30px -22px #000; }
.lgl-aside .lgl-link{ color:#6a4e16; border-bottom-color:#6a4e16; }
.lgl-block{ margin-top:34px; }
.lgl-h2{ font-family:var(--serif); font-weight:600; font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:var(--mid); margin:0 0 16px; padding-bottom:8px; border-bottom:1px solid var(--line); }
.lgl-legacy-panel{
  margin-top:34px; padding:22px 24px 24px; border-radius:14px;
  background:
    radial-gradient(140% 100% at 0% 0%, rgba(200,168,107,.09), transparent 60%),
    linear-gradient(180deg, var(--elev), var(--surface));
  border:1px solid var(--line); position:relative; overflow:hidden;
  box-shadow: 0 0 0 1px rgba(200,168,107,.06) inset, 0 22px 50px -34px #000;
}
.lgl-legacy-panel::before{ content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg, transparent, var(--accent), transparent); }
.lgl-legacy-head{ display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:6px; }
.lgl-legacy-head-left{ display:flex; align-items:center; gap:9px; }
.lgl-legacy-mark{ width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--accent-soft); color:var(--accent); border:1px solid var(--line); }
.lgl-legacy-title{ font-family:var(--serif); font-weight:600; font-size:19px; color:var(--hi); letter-spacing:.01em; }
.lgl-legacy-badge{ font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--bg); background:var(--accent); border-radius:999px; padding:4px 11px; font-weight:600; white-space:nowrap; }
.lgl-legacy-def{ font-size:13.5px; color:var(--mid); margin:8px 0 18px; line-height:1.55; }
.lgl-legacy-def em{ color:var(--accent); font-style:normal; font-weight:600; }
.lgl-legacy-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:11px; }
.lgl-legacy-card{
  display:flex; flex-direction:column;
  border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:9px;
  padding:13px 15px; background:rgba(200,168,107,.04); text-align:center;
  min-width:190px; max-width:280px; flex:0 1 auto;
  transition:border-color .15s ease, background .15s ease;
}
.lgl-legacy-card:hover{ border-color:var(--accent); background:rgba(200,168,107,.08); }
.lgl-legacy-card-name{ font-family:var(--serif); font-weight:600; font-size:14.5px; color:var(--accent); margin-bottom:4px; }
.lgl-legacy-card-note{ font-size:13px; color:var(--mid); line-height:1.5; }

/* interactive legacy trait PICKER (Builder only — distinct from the read-only wiki panel) */
.lgl-legacypick-panel{ margin-top:34px; padding:22px 24px 24px; border-radius:14px; background:linear-gradient(180deg, var(--elev), var(--surface)); border:1px solid var(--line); }
.lgl-universal-section{ margin-top:30px; padding-top:24px; border-top:1px solid var(--line); }
.lgl-universal-section-head{ display:flex; align-items:center; gap:9px; flex-wrap:wrap; justify-content:center; margin-bottom:14px; font-family:var(--serif); font-weight:600; font-size:16px; color:var(--hi); text-align:center; }
.lgl-universal-section-sub{ font-family:var(--sans); font-size:12px; color:var(--faint); font-weight:400; flex:1 1 100%; margin-top:2px; text-align:center; }
.lgl-univcat{ border:1px solid var(--line); border-radius:11px; overflow:hidden; margin-bottom:10px; }
.lgl-univcat-toggle{ position:relative; display:flex; align-items:center; gap:10px; width:100%; text-align:center; justify-content:center; background:var(--surface); border:none; cursor:pointer; padding:13px 44px; color:var(--hi); font-size:14px; font-family:var(--sans); transition:background .15s ease; }
.lgl-univcat-toggle:hover{ background:var(--elev); }
.lgl-univcat-name{ font-family:var(--serif); font-weight:600; font-size:16px; text-transform:uppercase; letter-spacing:.1em; color:var(--accent); }
.lgl-univcat-badge{ position:absolute; right:40px; top:50%; transform:translateY(-50%); font-size:11px; font-weight:600; letter-spacing:.04em; color:var(--bg); background:var(--accent); border-radius:999px; padding:2px 9px; }
.lgl-univcat-chevron{ position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--faint); transition:transform .2s ease; }
.lgl-univcat-chevron.is-open{ transform:translateY(-50%) rotate(90deg); }
.lgl-univcat-body{ padding:16px 20px 20px; background:var(--bg); border-top:1px solid var(--line); }
.lgl-univcat-desc{ font-size:13px; color:var(--mid); font-style:italic; margin:0 0 16px; text-align:center; }
.lgl-legacystatus{ font-size:13px; border-radius:8px; padding:10px 14px; margin-bottom:18px; }
.lgl-legacystatus.is-warn{ color:var(--accent); background:var(--accent-soft); border:1px solid var(--line); }
.lgl-legacystatus.is-ok{ color:#8fd19e; background:rgba(143,209,158,.10); border:1px solid rgba(143,209,158,.3); }

/* Save & Post + My Characters */
.lgl-savebox{ margin-top:34px; padding-top:24px; border-top:1px solid var(--line); text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px; }
.lgl-savenote{ font-size:13px; color:var(--mid); background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:11px 16px; max-width:440px; }

/* ---- Heroes of Loglandia ---- */
.lgl-prewrap{ white-space:pre-wrap; }
.lgl-hero-addbtn{ margin:0 auto 30px; display:block; }

.lgl-herogrid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:16px; }
.lgl-herocard{ display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px; padding:16px 14px; cursor:pointer; border:1px solid var(--line); border-radius:12px; background:var(--surface); color:inherit; transition:transform .15s, border-color .15s, box-shadow .15s; }
.lgl-herocard:hover{ transform:translateY(-3px); border-color:var(--accent); box-shadow:0 10px 26px -16px rgba(200,168,107,.6); }
.lgl-herocard-img{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px; margin-bottom:8px; }
.lgl-herocard-img-empty{ display:flex; align-items:center; justify-content:center; color:var(--faint); background:var(--elev); }
.lgl-herocard-name{ font-family:var(--serif); font-size:15px; font-weight:700; color:var(--hi); }
.lgl-herocard-player{ font-size:11.5px; color:var(--faint); }

.lgl-hero-editbar{ display:flex; justify-content:center; margin:6px 0 20px; }
.lgl-hero-editbtn{ display:inline-flex; align-items:center; gap:7px; padding:8px 16px; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--mid); font-size:12px; letter-spacing:.04em; cursor:pointer; }
.lgl-hero-editbtn:hover{ border-color:var(--accent); color:var(--accent); }
.lgl-hero-editbar-actions{ display:flex; gap:10px; }
.lgl-hero-editbtn.is-save{ border-color:var(--accent); background:var(--accent-soft); color:var(--accent); font-weight:700; }
.lgl-hero-editbtn.is-cancel{ color:var(--faint); }
.lgl-hero-editbtn:disabled{ opacity:.5; cursor:default; }

.lgl-hero-edit{ display:flex; flex-direction:column; gap:18px; max-width:480px; margin:0 auto; }
.lgl-hero-edit-row{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.lgl-hero-edit-label{ display:flex; flex-direction:column; gap:6px; font-size:12px; letter-spacing:.04em; color:var(--faint); text-transform:uppercase; }
.lgl-hero-edit-label input, .lgl-hero-edit-label select, .lgl-hero-edit-label textarea{ font-family:var(--sans); font-size:14px; text-transform:none; letter-spacing:normal; color:var(--hi); background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:9px 12px; resize:vertical; }
.lgl-hero-edit-label input:focus, .lgl-hero-edit-label select:focus, .lgl-hero-edit-label textarea:focus{ outline:none; border-color:var(--accent); }

.lgl-avatar-upload{ display:flex; flex-direction:column; align-items:center; gap:10px; }
.lgl-avatar-preview{ width:140px; height:140px; border-radius:999px; object-fit:cover; border:1px solid var(--line); }
.lgl-avatar-empty{ display:flex; align-items:center; justify-content:center; background:var(--elev); color:var(--faint); }
.lgl-avatar-upload-controls{ display:flex; flex-direction:column; align-items:center; gap:6px; }
.lgl-avatar-btn{ padding:8px 16px; border-radius:999px; border:1px solid var(--accent); background:var(--accent-soft); color:var(--accent); font-size:12px; font-weight:600; cursor:pointer; }
.lgl-avatar-btn:disabled{ opacity:.5; cursor:default; border-color:var(--line); background:none; color:var(--faint); }
.lgl-avatar-status{ font-size:11.5px; color:var(--faint); }
.lgl-avatar-status.is-warn{ color:#e0574f; }

.lgl-heroblocks-edit{ display:flex; flex-direction:column; gap:14px; }
.lgl-heroblock-edit{ border:1px solid var(--line); border-radius:10px; padding:12px 14px; background:var(--surface); }
.lgl-heroblock-edit-head{ display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.lgl-heroblock-title-input{ flex:1; font-family:var(--serif); font-weight:700; font-size:14px; background:none; border:none; border-bottom:1px solid var(--line); padding:4px 2px; color:var(--hi); }
.lgl-heroblock-title-input:focus{ outline:none; border-bottom-color:var(--accent); }
.lgl-heroblock-edit-controls{ display:flex; gap:4px; flex:0 0 auto; }
.lgl-heroblock-edit-controls button{ width:26px; height:26px; border-radius:6px; border:1px solid var(--line); background:none; color:var(--faint); cursor:pointer; font-size:12px; }
.lgl-heroblock-edit-controls button:hover:not(:disabled){ border-color:var(--accent); color:var(--accent); }
.lgl-heroblock-edit-controls button:disabled{ opacity:.3; cursor:default; }
.lgl-heroblock-edit-controls button.is-danger:hover{ border-color:#e0574f; color:#e0574f; }
.lgl-heroblock-body-input{ width:100%; font-size:13.5px; }
.lgl-heroblock-add{ align-self:center; padding:8px 18px; border-radius:999px; border:1px dashed var(--line); background:none; color:var(--faint); font-size:12.5px; cursor:pointer; }
.lgl-heroblock-add:hover{ border-color:var(--accent); color:var(--accent); }
.lgl-heroblock{ margin-top:26px; }
.lgl-savenote.is-ok{ color:#8fd19e; background:rgba(143,209,158,.10); border-color:rgba(143,209,158,.3); }
.lgl-savenote.is-warn{ color:var(--accent); background:var(--accent-soft); }
.lgl-mychars{ margin-top:30px; padding-top:22px; border-top:1px solid var(--line); }
.lgl-pcdetail-by{ text-align:center; font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--faint); margin-bottom:16px; }
.lgl-gallery-sort{ display:flex; justify-content:center; margin-bottom:20px; }
.lgl-gallery-sort label{ display:flex; align-items:center; gap:9px; font-size:12px; color:var(--faint); }
.lgl-gallery-sort select{ background:var(--surface); border:1px solid var(--line); color:var(--hi); border-radius:7px; padding:6px 10px; font-size:13px; }
.lgl-gallery-tag{ display:inline-block; margin-top:4px; font-size:10.5px; letter-spacing:.08em; color:var(--accent); border:1px solid var(--line); background:var(--accent-soft); border-radius:999px; padding:2px 10px; }

/* Skill chips: automatic grants, the class's choosable list, and the final unlocked set */
.lgl-skillchip-row{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px; }
.lgl-skillchip{ font-size:13px; border-radius:999px; padding:6px 14px; border:1px solid var(--line); }
.lgl-skillchip.is-auto{ color:var(--mid); background:var(--surface); }
.lgl-skillchip.is-final{ color:var(--accent); background:var(--accent-soft); border-color:var(--accent); font-weight:600; }
.lgl-skillchip-pick{ cursor:pointer; background:var(--surface); color:var(--mid); }
.lgl-skillchip-pick:hover{ border-color:var(--accent); color:var(--hi); }
.lgl-skillchip-pick.is-active{ background:var(--accent); color:var(--bg); border-color:var(--accent); font-weight:600; }
.lgl-skillchip-pick.is-disabled{ opacity:.4; cursor:not-allowed; }
.lgl-skillchip-tag{ font-size:10.5px; opacity:.75; }

/* Spells step's referral to the Logpendium */
.lgl-logpendium-box{ margin-top:28px; padding:28px 22px; border-radius:14px; background:var(--surface); border:1px solid var(--line); text-align:center; display:flex; flex-direction:column; align-items:center; gap:18px; }
.lgl-logpendium-btn{ display:inline-flex; text-decoration:none; border-radius:14px; overflow:hidden; position:relative; }
.lgl-logpendium-btn-inner{ display:flex; align-items:center; gap:12px; padding:16px 36px; font-size:16px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--bg); background:linear-gradient(135deg, #E8C87A 0%, #C8A86B 40%, #A07840 70%, #C8A86B 100%); background-size:200% 200%; animation:lgl-logp-shimmer 2.5s ease infinite; border-radius:14px; font-family:var(--serif); }
.lgl-fs-jumpbtn{ display:flex; align-items:center; gap:18px; width:100%; margin:22px 0 32px; padding:22px 30px; cursor:pointer; border:none; border-radius:16px; background:linear-gradient(135deg, #E8C87A 0%, #C8A86B 40%, #A07840 70%, #C8A86B 100%); background-size:200% 200%; animation:lgl-logp-shimmer 3s ease infinite; box-shadow:0 14px 34px -14px rgba(200,168,107,.65); transition:transform .18s ease, box-shadow .18s ease; }
.lgl-fs-jumpbtn:hover{ transform:translateY(-3px); box-shadow:0 18px 40px -12px rgba(200,168,107,.8); }
.lgl-fs-jumpbtn-icon{ flex:0 0 auto; color:var(--bg); animation:lgl-pulse 2s ease-in-out infinite; }
.lgl-fs-jumpbtn-text{ flex:1; display:flex; flex-direction:column; gap:2px; text-align:left; }
.lgl-fs-jumpbtn-label{ font-family:var(--serif); font-size:19px; font-weight:700; letter-spacing:.03em; color:var(--bg); }
.lgl-fs-jumpbtn-sub{ font-size:12.5px; color:rgba(22,22,26,.72); font-style:italic; }
.lgl-fs-jumpbtn-arrow{ flex:0 0 auto; color:var(--bg); transition:transform .18s ease; }
.lgl-fs-jumpbtn:hover .lgl-fs-jumpbtn-arrow{ transform:translateX(4px); }
.lgl-logpendium-btn:hover .lgl-logpendium-btn-inner{ filter:brightness(1.1); transform:scale(1.02); }
.lgl-logpendium-star{ opacity:.8; }
.lgl-logpendium-star-l{ animation:lgl-pulse 1.8s ease-in-out infinite; }
.lgl-logpendium-star-r{ animation:lgl-pulse 1.8s ease-in-out 0.9s infinite; }
@keyframes lgl-logp-shimmer{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes lgl-pulse{ 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.18)} }
.lgl-legacypick-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:14px; }
.lgl-legacypick-card{
  display:flex; flex-direction:column; align-items:center; text-align:center; gap:11px; cursor:pointer;
  border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:13px;
  background:rgba(200,168,107,.04); padding:26px 26px; min-width:270px; max-width:350px; flex:0 1 auto;
  transition:border-color .15s ease, background .15s ease, transform .15s ease;
}
.lgl-legacypick-card:hover{ border-color:var(--accent); background:rgba(200,168,107,.09); transform:translateY(-2px); }
.lgl-legacypick-card.is-active{ border-color:var(--accent); background:rgba(200,168,107,.16); box-shadow:0 0 0 1px var(--accent) inset; }
.lgl-legacypick-card.is-disabled{ opacity:.4; cursor:not-allowed; transform:none; }
.lgl-legacypick-name{ font-family:var(--serif); font-weight:700; font-size:22px; color:var(--accent); line-height:1.2; }
.lgl-legacypick-note{ font-size:15px; color:var(--mid); line-height:1.55; }
.lgl-legacypick-source{ margin-top:auto; padding-top:9px; font-size:11.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--faint); }
.lgl-legacypick-card.is-active .lgl-legacypick-source{ color:var(--accent); }
.lgl-legacy-card .lgl-legacypick-source{ display:block; margin-top:8px; padding-top:0; }
.lgl-traitbox-source{ display:block; margin-top:auto; padding-top:6px; font-size:9.5px; letter-spacing:.13em; text-transform:uppercase; color:var(--faint); }
.lgl-legacypick-card.lgl-recap-static{ cursor:default; }
.lgl-legacypick-card.lgl-recap-static:hover{ transform:none; }

/* Background step's feature callout */
.lgl-bg-feature{ margin-top:14px; padding:13px 16px; border-radius:8px; background:var(--bg); border:1px solid var(--line); border-left:3px solid var(--accent); }
.lgl-custombg-divider{ display:flex; align-items:center; gap:12px; margin:28px 0 14px; color:var(--faint); font-size:11px; letter-spacing:.16em; text-transform:uppercase; }
.lgl-custombg-divider::before, .lgl-custombg-divider::after{ content:''; flex:1; height:1px; background:var(--line); }
.lgl-custombg-card{
  display:block; width:100%; max-width:480px; margin:0 auto; text-align:center; cursor:pointer;
  border:1px dashed var(--line); border-radius:11px; background:var(--surface); padding:16px 20px; color:inherit;
}
.lgl-custombg-card:hover{ border-color:var(--accent); }
.lgl-custombg-card.is-active{ border-style:solid; border-color:var(--accent); background:var(--accent-soft); }
.lgl-custombg-warn{ display:block; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin-bottom:7px; font-weight:600; }
.lgl-bg-feature-name{ display:block; font-family:var(--serif); font-weight:600; color:var(--accent); font-size:14.5px; margin-bottom:4px; }
.lgl-bg-feature-note{ display:block; font-size:13.5px; color:var(--mid); line-height:1.5; }

/* Final Details: name/alignment inputs + full sheet recap */
.lgl-fd-inputs{ display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin-bottom:10px; }
.lgl-fd-field{ display:flex; flex-direction:column; gap:6px; min-width:220px; }
.lgl-fd-field span{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--faint); }
.lgl-fd-field input{ background:var(--surface); border:1px solid var(--line); color:var(--hi); border-radius:8px; padding:10px 13px; font-size:14px; font-family:var(--sans); }
.lgl-backstory-input{ background:var(--surface); border:1px solid var(--line); color:var(--hi); border-radius:8px; padding:11px 14px; font-size:14px; font-family:var(--sans); resize:vertical; line-height:1.5; }
.lgl-backstory-input:focus{ outline:2px solid var(--accent); outline-offset:1px; border-color:transparent; }
.lgl-fd-field input:focus{ outline:2px solid var(--accent); outline-offset:1px; border-color:transparent; }
.lgl-recapgrid{ display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-bottom:8px; }
.lgl-recapcard{ border:1px solid var(--line); border-radius:9px; background:var(--surface); padding:12px 18px; min-width:140px; flex:0 1 auto; text-align:center; }
.lgl-recapcard-label{ font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--faint); margin-bottom:4px; }
.lgl-recapcard-value{ font-family:var(--serif); font-size:15px; color:var(--hi); font-weight:600; }
.lgl-recapblock{ margin-top:28px; padding-top:24px; border-top:1px solid var(--line); }
.lgl-recapblock-title{ font-family:var(--serif); font-weight:600; font-size:13px; letter-spacing:.1em; text-transform:uppercase; color:var(--mid); margin-bottom:14px; }
.lgl-recapability-row{ display:flex; flex-wrap:wrap; justify-content:center; gap:10px; }
.lgl-recapability{ display:flex; flex-direction:column; align-items:center; gap:3px; border:1px solid var(--line); border-radius:9px; background:var(--surface); padding:10px 16px; min-width:64px; }
.lgl-recapability-name{ font-size:10.5px; letter-spacing:.1em; color:var(--accent); font-weight:600; }
.lgl-recapability-val{ font-family:var(--serif); font-size:19px; color:var(--hi); font-weight:600; }
.lgl-recapability-mod{ font-size:12px; color:var(--faint); }
.lgl-recapability-bonus{ color:var(--accent); }

/* Race step: split list + detail pane */
/* ---- Step sidebar collapsed rail ---- */
.lgl-aside-wrap.is-collapsed{ flex:0 0 48px !important; }
.lgl-aside-wrap.is-collapsed .lgl-step-label{ display:none; }
.lgl-aside-wrap.is-collapsed .lgl-step{ justify-content:center; padding:8px 0; }
.lgl-aside-wrap.is-collapsed .lgl-side-head{ display:none; }
.lgl-builder-side-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 10px 6px; }
.lgl-builder-side-head .lgl-side-head{ padding:0; margin:0; }
.lgl-collapse-btn{ display:flex; align-items:center; justify-content:center; gap:4px; padding:4px 6px; min-height:26px; border-radius:6px; border:1px solid var(--line); background:var(--surface); cursor:pointer; color:var(--faint); flex:0 0 auto; }
.lgl-collapse-btn:hover{ border-color:var(--accent); color:var(--accent); }
.lgl-collapse-btn.is-show{ width:auto; padding:5px 10px; border-color:var(--accent); color:var(--accent); background:var(--accent-soft); }
.lgl-show-steps-label{ font-size:9px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; line-height:1; }
.lgl-aside-wrap.is-collapsed .lgl-builder-side-head{ justify-content:center; padding:12px 4px; }
.lgl-roll-sum{ margin-top:10px; font-size:13px; color:var(--mid); }
.lgl-roll-sum strong{ color:var(--accent); font-size:16px; margin-left:4px; }
.lgl-loglandia-class-section{ margin-top:24px; padding-top:20px; border-top:1px solid var(--line); }
.lgl-loglandia-class-label{ display:flex; align-items:center; gap:8px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--accent); font-weight:600; margin-bottom:14px; justify-content:center; }
.lgl-classpick-homebrew{ font-size:10px; letter-spacing:.1em; color:var(--accent); border:1px solid var(--line); background:var(--accent-soft); border-radius:999px; padding:2px 8px; margin-top:4px; }
.lgl-classpick-loglandia{ border-color:rgba(200,168,107,.35); }
.lgl-lore-btn{ display:inline-flex; align-items:center; gap:12px; padding:20px 56px; border-radius:13px; border:1px solid var(--line); border-left:4px solid var(--accent); background:rgba(200,168,107,.04); color:var(--accent); cursor:pointer; font-size:20px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; font-family:var(--serif); transition:border-color .15s, background .15s, transform .15s, box-shadow .15s; flex:0 0 auto; }
.lgl-lore-btn:hover{ border-color:var(--accent); background:rgba(200,168,107,.09); transform:translateY(-2px); box-shadow:0 6px 30px -8px rgba(200,168,107,.5); }
.lgl-univcat-icon-l,.lgl-univcat-icon-r{ color:var(--accent); flex:0 0 auto; }
/* ---- Lore sections in Codex entries ---- */
.lgl-lore-open{ font-size:17px; line-height:1.75; color:var(--hi); }
.lgl-loresec{ margin-top:26px; }
.lgl-loresec-h{ font-family:var(--serif); font-size:15px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--accent); margin:0 0 12px; padding-bottom:9px; border-bottom:1px solid transparent; border-image:linear-gradient(90deg, rgba(200,168,107,.5), rgba(200,168,107,.12) 55%, transparent) 1; }
.lgl-loresec .lgl-lore{ margin:0 0 14px; }
.lgl-loresec .lgl-lore:last-child{ margin-bottom:0; }

/* ---- Death's asides ---- */
.lgl-deathaside{ position:relative; display:flex; gap:12px; align-items:flex-start; margin:20px 0; padding:16px 20px 16px 18px; border:none; border-left:2px solid rgba(190,180,200,.35); border-radius:0 8px 8px 0; background:linear-gradient(90deg, rgba(120,110,140,.13), rgba(120,110,140,.03)); }
.lgl-deathaside-mark{ flex:0 0 auto; margin-top:3px; color:rgba(200,195,210,.55); }
.lgl-deathaside-text{ font-family:var(--serif); font-style:italic; font-size:15.5px; line-height:1.7; color:rgba(214,210,220,.86); letter-spacing:.01em; }

/* ---- Godmarked chapter intro ---- */
.lgl-gmintro{ margin:0 0 30px; padding:22px 24px; border:1px solid var(--line); border-radius:12px; background:var(--surface); }
.lgl-gmintro-label{ display:flex; align-items:center; justify-content:center; gap:14px; font-family:var(--serif); font-size:12px; font-weight:600; letter-spacing:.26em; text-transform:uppercase; color:var(--accent); margin-bottom:16px; }
.lgl-orn-rule{ flex:1 1 auto; max-width:110px; height:1px; background:linear-gradient(90deg, transparent, rgba(200,168,107,.55), transparent); }
.lgl-gmintro-label > span:not(.lgl-orn-rule){ flex:0 0 auto; }
.lgl-gmintro .lgl-lore{ margin:0 0 13px; font-size:14.5px; }
.lgl-gmintro .lgl-lore:last-child{ margin-bottom:0; }
.lgl-gmintro .lgl-deathaside{ margin-bottom:0; }

/* ---- Codex nav: clickable section labels + category subgroups ---- */
.lgl-nav-label-btn{ position:relative; display:block; width:100%; text-align:center; background:none; border:none; cursor:pointer; font:inherit; color:var(--accent); padding:11px 18px 6px; transition:color .15s ease; }
.lgl-nav-label-btn:hover{ color:var(--hi); }
.lgl-nav-label-chevron{ position:absolute; right:6px; top:50%; transform:translateY(-50%); opacity:.55; transition:transform .2s ease, opacity .15s ease; }
.lgl-nav-label-btn:hover .lgl-nav-label-chevron{ opacity:.9; }
.lgl-nav-label-chevron.is-open{ transform:translateY(-50%) rotate(90deg); }
.lgl-nav-label-btn:hover{ color:var(--hi); }
.lgl-nav-label-btn.is-active{ color:var(--hi); }
.lgl-nav-subgroup{ margin-bottom:8px; }
.lgl-nav-sublabel{ font-family:var(--serif); font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:var(--accent); font-weight:600; padding:9px 10px 6px; text-align:center; opacity:.72; }

/* ---- Section landing: entry bubbles ---- */
.lgl-bubblegroup{ margin-top:26px; }
.lgl-bubblegroup-label{ display:flex; align-items:center; justify-content:center; gap:8px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--accent); font-weight:600; margin-bottom:14px; }
.lgl-bubblegroup-count{ font-size:10px; color:var(--faint); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:1px 8px; letter-spacing:.04em; }
.lgl-bubbles{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px; }
.lgl-chargroup{ margin-bottom:30px; }
.lgl-chargroup-label{ display:flex; align-items:center; justify-content:center; gap:8px; font-family:var(--serif); font-size:13px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin-bottom:14px; }
.lgl-chargroup-count{ font-size:10px; color:var(--faint); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:1px 8px; letter-spacing:.02em; text-transform:none; }
.lgl-charbubble{ display:flex; flex-direction:column; align-items:center; gap:2px; padding:10px 20px; border-radius:999px; border:1px solid var(--line); background:var(--surface); cursor:pointer; transition:border-color .15s, background .15s, transform .15s; }
.lgl-charbubble:hover{ border-color:var(--accent); background:var(--accent-soft); transform:translateY(-2px); }
.lgl-charbubble-name{ font-family:var(--serif); font-size:14.5px; font-weight:700; color:var(--hi); }
.lgl-charbubble-player{ font-size:11px; color:var(--faint); }
.lgl-bubble{ display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--hi); cursor:pointer; font-family:var(--serif); font-size:14.5px; transition:border-color .15s, background .15s, transform .15s, color .15s; }
.lgl-bubble:hover{ border-color:var(--accent); background:var(--accent-soft); color:var(--accent); transform:translateY(-2px); }

/* ---- Codex home: random entry ---- */
.lgl-randomblock{ margin-top:34px; }
.lgl-randomblock-head{ display:flex; align-items:center; justify-content:center; gap:9px; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--accent); font-weight:600; margin-bottom:14px; }
.lgl-randomblock-reroll{ display:flex; align-items:center; justify-content:center; gap:11px; width:100%; margin-top:14px; padding:16px 28px; cursor:pointer; border:1px solid var(--line); border-radius:12px; background:var(--surface); color:var(--mid); font-family:var(--serif); font-size:16px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; transition:border-color .15s, color .15s, background .15s, transform .15s; }
.lgl-randomblock-reroll:hover{ border-color:var(--accent); color:var(--accent); background:var(--elev); transform:translateY(-2px); }
.lgl-randomblock-reroll:active{ transform:translateY(0); }
.lgl-randomblock-reroll svg{ transition:transform .35s ease; }
.lgl-randomblock-reroll:hover svg{ transform:rotate(-24deg); }
.lgl-randomblock-card{ display:flex; flex-direction:column; align-items:center; gap:7px; width:100%; padding:26px 28px; border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:12px; background:rgba(200,168,107,.04); cursor:pointer; text-align:center; transition:border-color .15s, background .15s, transform .15s; }
.lgl-randomblock-card:hover{ border-color:var(--accent); background:rgba(200,168,107,.09); transform:translateY(-2px); }
.lgl-randomblock-name{ font-family:var(--serif); font-size:26px; font-weight:600; color:var(--hi); line-height:1.15; }
.lgl-randomblock-tagline{ font-size:14px; color:var(--mid); font-style:italic; max-width:52ch; }
.lgl-randomblock-cta{ display:inline-flex; align-items:center; gap:5px; margin-top:8px; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); font-weight:600; }

/* ---- Elf entry: the nine lines ---- */
.lgl-elflanding{ margin-top:30px; padding-top:26px; border-top:1px solid var(--line); }
.lgl-elflanding-label{ font-family:var(--serif); font-size:13px; font-weight:600; letter-spacing:.24em; text-transform:uppercase; color:var(--accent); text-align:center; }
.lgl-elflanding-sub{ font-size:13.5px; color:var(--mid); font-style:italic; text-align:center; margin:8px 0 20px; }
.lgl-elflanding-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:12px; }
.lgl-elfline-btn{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; width:150px; flex:0 0 150px; padding:20px 14px; cursor:pointer; border:1px solid var(--line); border-top:3px solid var(--line-color); border-radius:12px; background:linear-gradient(180deg, color-mix(in srgb, var(--line-color) 13%, transparent), transparent 78%); color:var(--hi); transition:transform .15s, border-color .15s, box-shadow .15s, background .15s; }
.lgl-elfline-btn:hover{ transform:translateY(-3px); border-color:var(--line-color); background:linear-gradient(180deg, color-mix(in srgb, var(--line-color) 26%, transparent), transparent 82%); box-shadow:0 8px 26px -12px var(--line-color); }
.lgl-elfline-icon{ display:flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:999px; color:var(--line-color); background:color-mix(in srgb, var(--line-color) 16%, transparent); border:1px solid color-mix(in srgb, var(--line-color) 40%, transparent); }
.lgl-elfline-name{ font-family:var(--serif); font-size:16px; font-weight:600; line-height:1.15; text-align:center; }
.lgl-elfline-el{ font-size:9.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--line-color); font-weight:600; opacity:.9; }

.lgl-racecard-subcount{ font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--faint); margin-top:5px; border-top:1px solid var(--line); padding-top:6px; width:100%; text-align:center; }
.lgl-racecard.is-active .lgl-racecard-subcount{ color:var(--accent); border-top-color:rgba(200,168,107,.3); }
.lgl-bubble-count{ font-size:10px; font-weight:600; color:var(--accent); background:var(--accent-soft); border-radius:999px; padding:1px 7px; letter-spacing:.02em; }
.lgl-nav-count{ font-size:9.5px; font-weight:600; color:var(--faint); opacity:.65; margin-left:6px; letter-spacing:.02em; }

/* ---- Codex home: Timeline gets its own treatment, not a section card ---- */
.lgl-timeline-btn{ display:flex; align-items:center; gap:18px; width:100%; margin-top:16px; padding:22px 26px; cursor:pointer; text-align:left; border:1px solid rgba(200,168,107,.35); border-radius:14px; background:linear-gradient(115deg, rgba(200,168,107,.16), rgba(200,168,107,.04) 55%, transparent); color:var(--hi); transition:border-color .15s, transform .15s, box-shadow .15s, background .15s; }
.lgl-timeline-btn:hover{ border-color:var(--accent); transform:translateY(-2px); background:linear-gradient(115deg, rgba(200,168,107,.26), rgba(200,168,107,.08) 55%, transparent); box-shadow:0 10px 32px -14px rgba(200,168,107,.6); }
.lgl-timeline-btn-icon{ display:flex; align-items:center; justify-content:center; width:54px; height:54px; flex:0 0 54px; border-radius:999px; color:var(--accent); background:rgba(200,168,107,.12); border:1px solid rgba(200,168,107,.4); }
.lgl-timeline-btn-text{ display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.lgl-timeline-btn-label{ font-family:var(--serif); font-size:23px; font-weight:600; letter-spacing:.04em; color:var(--hi); line-height:1.1; }
.lgl-timeline-btn-sub{ font-size:13px; color:var(--mid); font-style:italic; }
.lgl-timeline-btn-arrow{ color:var(--accent); flex:0 0 auto; opacity:.75; }
.lgl-timeline-btn:hover .lgl-timeline-btn-arrow{ opacity:1; }

/* ---- Legacy Trait Index ---- */
.lgl-traitindex-search{ position:relative; display:flex; align-items:center; margin-bottom:22px; }
.lgl-traitindex-search input{ width:100%; padding:13px 108px 13px 18px; border-radius:10px; border:1px solid var(--line); background:var(--surface); color:var(--hi); font-size:14px; font-family:var(--sans); }
.lgl-traitindex-search input:focus{ outline:none; border-color:var(--accent); }
.lgl-traitindex-count{ position:absolute; right:14px; font-size:11px; color:var(--faint); letter-spacing:.06em; }
.lgl-traitcat{ border:1px solid var(--line); border-radius:11px; overflow:hidden; margin-bottom:10px; }
.lgl-traitcat-toggle{ position:relative; display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:14px 44px; cursor:pointer; border:none; background:var(--surface); color:var(--hi); font-family:var(--sans); font-size:14px; transition:background .15s; }
.lgl-traitcat-toggle:hover{ background:var(--elev); }
.lgl-traitcat-icon{ color:var(--accent); flex:0 0 auto; }
.lgl-traitcat-name{ font-family:var(--serif); font-weight:600; font-size:16px; letter-spacing:.1em; text-transform:uppercase; color:var(--accent); }
.lgl-traitcat-count{ font-size:11px; font-weight:600; color:var(--bg); background:var(--accent); border-radius:999px; padding:2px 9px; }
.lgl-traitcat-chevron{ position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--faint); transition:transform .2s ease; }
.lgl-traitcat-chevron.is-open{ transform:translateY(-50%) rotate(90deg); }
.lgl-traitcat-body{ padding:14px 16px 16px; background:var(--bg); border-top:1px solid var(--line); display:flex; flex-direction:column; gap:10px; }
.lgl-traitindex-row{ border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:9px; padding:13px 16px; background:rgba(200,168,107,.04); text-align:left; }
.lgl-traitindex-head{ display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
.lgl-traitindex-name{ font-family:var(--serif); font-weight:700; font-size:17px; color:var(--accent); }
.lgl-traitindex-src{ font-size:10px; letter-spacing:.12em; text-transform:uppercase; font-weight:600; color:var(--mid); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:3px 10px; cursor:pointer; transition:border-color .15s, color .15s; }
.lgl-traitindex-src:hover{ border-color:var(--accent); color:var(--accent); }
.lgl-traitindex-src.is-universal{ cursor:default; color:var(--accent); border-color:rgba(200,168,107,.4); }
.lgl-traitindex-note{ font-size:13.5px; color:var(--mid); line-height:1.6; }
.lgl-traitindex-also{ margin-top:8px; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--faint); }

/* ---- Mechanics landing tiles ---- */
.lgl-mechhome-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:14px; margin-top:8px; }
.lgl-mechtile{ display:flex; flex-direction:column; align-items:center; text-align:center; gap:9px; width:250px; flex:0 0 250px; padding:26px 22px; cursor:pointer; border:1px solid var(--line); border-radius:14px; background:var(--surface); color:var(--hi); transition:border-color .15s, transform .15s, background .15s, box-shadow .15s; }
.lgl-mechtile:hover{ border-color:var(--accent); transform:translateY(-3px); background:var(--elev); box-shadow:0 10px 30px -16px rgba(200,168,107,.6); }
.lgl-mechtile.is-feature{ width:100%; flex:0 0 100%; border-left:4px solid var(--accent); background:linear-gradient(120deg, rgba(200,168,107,.14), rgba(200,168,107,.03) 60%, transparent); }
.lgl-mechtile-icon{ display:flex; align-items:center; justify-content:center; width:50px; height:50px; border-radius:999px; color:var(--accent); background:rgba(200,168,107,.1); border:1px solid rgba(200,168,107,.34); }
.lgl-mechtile-name{ font-family:var(--serif); font-size:20px; font-weight:600; line-height:1.15; }
.lgl-mechtile-desc{ font-size:13px; color:var(--mid); line-height:1.5; max-width:44ch; }
.lgl-mechtile-cta{ display:inline-flex; align-items:center; gap:4px; margin-top:4px; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--accent); font-weight:600; }

/* ---- Tales landing: campaign cards ---- */
.lgl-taleshome-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:16px; margin-bottom:22px; }
.lgl-campaigncard{ display:flex; flex-direction:column; width:340px; flex:0 0 340px; padding:0; overflow:hidden; cursor:pointer; border:1px solid var(--line); border-radius:14px; background:var(--surface); color:var(--hi); text-align:left; transition:border-color .15s, transform .15s, box-shadow .15s; }
.lgl-campaigncard:hover{ border-color:var(--accent); transform:translateY(-3px); box-shadow:0 12px 34px -16px rgba(200,168,107,.6); }
.lgl-campaigncard-art{ display:flex; align-items:center; justify-content:center; height:150px; width:100%; background:repeating-linear-gradient(135deg, transparent 0 22px, rgba(255,255,255,.012) 22px 44px), linear-gradient(180deg, var(--elev), var(--surface)); border-bottom:1px solid var(--line); overflow:hidden; }
.lgl-campaigncard-img{ width:100%; height:100%; object-fit:cover; display:block; }
.lgl-campaigncard-artslot{ font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:var(--faint); }
.lgl-campaigncard-body{ display:flex; flex-direction:column; gap:6px; padding:18px 20px 20px; }
.lgl-campaigncard-name{ font-family:var(--serif); font-size:21px; font-weight:600; line-height:1.15; }
.lgl-campaigncard-blurb{ font-size:13px; color:var(--mid); line-height:1.5; font-style:italic; }
.lgl-campaigncard-meta{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; padding-top:10px; border-top:1px solid var(--line); font-size:11px; letter-spacing:.06em; color:var(--faint); text-transform:uppercase; }
.lgl-campaigncard-cta{ display:inline-flex; align-items:center; gap:4px; color:var(--accent); font-weight:600; letter-spacing:.12em; }
.lgl-backlink{ display:inline-flex; align-items:center; gap:5px; margin-bottom:14px; padding:6px 12px 6px 8px; border:1px solid var(--line); border-radius:999px; background:none; cursor:pointer; color:var(--faint); font-size:11px; letter-spacing:.1em; text-transform:uppercase; }
.lgl-codex-back{ display:flex; width:fit-content; max-width:680px; margin:20px auto 0; }
.lgl-backlink:hover{ border-color:var(--accent); color:var(--accent); }

/* ---- Dark sidebar scroller ---- */
.lgl-nav-scroll{ scrollbar-width:thin; scrollbar-color:rgba(120,112,100,.5) transparent; }
.lgl-nav-scroll::-webkit-scrollbar{ width:8px; }
.lgl-nav-scroll::-webkit-scrollbar-track{ background:rgba(0,0,0,.28); border-radius:8px; }
.lgl-nav-scroll::-webkit-scrollbar-thumb{ background:linear-gradient(180deg, rgba(150,138,118,.55), rgba(96,90,80,.5)); border-radius:8px; border:2px solid transparent; background-clip:padding-box; }
.lgl-nav-scroll::-webkit-scrollbar-thumb:hover{ background:linear-gradient(180deg, rgba(200,168,107,.7), rgba(150,126,80,.6)); background-clip:padding-box; }
.lgl-aside-wrap{ scrollbar-width:thin; scrollbar-color:rgba(120,112,100,.5) transparent; }
.lgl-aside-wrap::-webkit-scrollbar{ width:8px; }
.lgl-aside-wrap::-webkit-scrollbar-track{ background:rgba(0,0,0,.28); }
.lgl-aside-wrap::-webkit-scrollbar-thumb{ background:rgba(120,112,100,.5); border-radius:8px; }

/* ---- Dev Mode ---- */
.lgl-devfab{ position:fixed; right:20px; bottom:20px; z-index:60; display:flex; align-items:center; justify-content:center; width:46px; height:46px; border-radius:999px; border:1px solid var(--line); background:var(--surface); color:var(--faint); cursor:pointer; box-shadow:0 8px 26px -10px rgba(0,0,0,.6); transition:border-color .15s, color .15s, background .15s, transform .15s; }
.lgl-devfab:hover{ transform:translateY(-2px); border-color:var(--accent); color:var(--accent); }
.lgl-devfab.is-on{ border-color:var(--accent); color:var(--accent); background:var(--accent-soft); }
.lgl-devbar{ position:fixed; left:50%; transform:translateX(-50%); bottom:20px; z-index:59; display:flex; align-items:center; gap:12px; padding:10px 18px; border-radius:999px; border:1px solid rgba(200,168,107,.45); background:#141416; color:var(--mid); font-size:12.5px; box-shadow:0 10px 30px -10px rgba(0,0,0,.7); }
.lgl-devbar-dot{ width:7px; height:7px; border-radius:999px; background:#e0574f; flex:0 0 auto; animation:lgl-pulse 1.6s ease-in-out infinite; }
.lgl-devbar-count{ font-size:11px; color:var(--accent); letter-spacing:.04em; }
.lgl-devbar-btn{ background:none; border:1px solid var(--line); border-radius:999px; padding:5px 13px; cursor:pointer; color:var(--hi); font-size:11px; letter-spacing:.06em; text-transform:uppercase; font-weight:600; }
.lgl-devbar-btn:hover:not(:disabled){ border-color:var(--accent); color:var(--accent); }
.lgl-devbar-btn:disabled{ opacity:.35; cursor:default; }
.lgl-devbar-btn.is-danger:hover:not(:disabled){ border-color:#e0574f; color:#e0574f; }
.lgl-devbar-btn.is-danger.is-confirming{ border-color:#e0574f; color:#e0574f; background:rgba(224,87,79,.12); }
.lgl-dev-editable{ cursor:text; border-radius:6px; outline:1px dashed rgba(200,168,107,.4); outline-offset:4px; transition:background .15s, outline-color .15s; }
.lgl-dev-editable:hover{ background:rgba(200,168,107,.05); }
.lgl-dev-editable:focus{ outline:1px solid var(--accent); background:rgba(200,168,107,.08); }

/* ---- GM password prompt (inside GMFold) ---- */
.lgl-gmfold-lock{ margin-top:16px; padding:20px; border:1px dashed rgba(200,90,80,.35); border-radius:10px; background:rgba(200,90,80,.03); display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; }
.lgl-gmfold-lock-icon{ color:#c97a72; opacity:.8; }
.lgl-gmfold-lock-text{ font-size:12.5px; color:var(--mid); margin:0; }
.lgl-gmfold-lock-row{ display:flex; gap:8px; margin-top:4px; }
.lgl-gmfold-lock-input{ padding:8px 12px; border-radius:8px; border:1px solid var(--line); background:var(--surface); color:var(--hi); font-size:13px; width:160px; }
.lgl-gmfold-lock-input:focus{ outline:none; border-color:#c97a72; }
.lgl-gmfold-lock-input.is-wrong{ border-color:#e0574f; }
.lgl-gmfold-lock-btn{ padding:8px 16px; border-radius:8px; border:1px solid rgba(200,90,80,.4); background:rgba(200,90,80,.1); color:#c97a72; font-size:12px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; cursor:pointer; }
.lgl-gmfold-lock-btn:hover{ background:rgba(200,90,80,.18); }
.lgl-gmfold-lock-error{ font-size:11.5px; color:#e0574f; margin:2px 0 0; }

/* ---- Worship block (gods) ---- */
.lgl-worship{ margin:28px 0; padding:22px 24px; border:1px solid var(--line); border-radius:12px; background:var(--surface); }
.lgl-worship-label{ display:flex; align-items:center; justify-content:center; gap:14px; font-family:var(--serif); font-size:12px; font-weight:600; letter-spacing:.26em; text-transform:uppercase; color:var(--accent); margin-bottom:16px; }
.lgl-worship-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:10px 20px; margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid var(--line); }
.lgl-worship-row{ display:flex; justify-content:space-between; gap:10px; font-size:12.5px; }
.lgl-worship-row-label{ color:var(--faint); }
.lgl-worship-row-value{ color:var(--accent); font-weight:600; text-align:right; }
.lgl-worship .lgl-lore{ font-size:14px; margin:0 0 10px; }
.lgl-worship .lgl-lore:last-child{ margin-bottom:0; }

/* ---- GM-only fold (Behind the Screen) ---- */
.lgl-gmfold{ margin-top:30px; border-top:1px solid var(--line); padding-top:22px; }
.lgl-gmfold-toggle{ position:relative; display:flex; align-items:center; justify-content:center; gap:9px; width:100%; padding:13px 44px; border:1px solid rgba(200,90,80,.35); border-radius:11px; background:rgba(200,90,80,.05); cursor:pointer; color:#c97a72; font-family:var(--serif); font-weight:600; font-size:13.5px; letter-spacing:.14em; text-transform:uppercase; transition:border-color .15s, background .15s; }
.lgl-gmfold-toggle:hover{ border-color:rgba(200,90,80,.6); background:rgba(200,90,80,.09); }
.lgl-gmfold-chevron{ position:absolute; right:16px; top:50%; transform:translateY(-50%); transition:transform .2s ease; }
.lgl-gmfold-chevron.is-open{ transform:translateY(-50%) rotate(90deg); }
.lgl-gmfold-body{ margin-top:16px; display:flex; flex-direction:column; gap:14px; padding:18px 20px; border:1px dashed rgba(200,90,80,.3); border-radius:10px; background:rgba(200,90,80,.03); }
.lgl-gmfold-row{ display:flex; flex-direction:column; gap:4px; }
.lgl-gmfold-row-label{ font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#c97a72; font-weight:600; }
.lgl-gmfold-row-text{ font-size:13.5px; color:var(--mid); line-height:1.6; }
.lgl-gmfold-p{ font-size:13.5px; margin:0; }

/* ---- Gods landing: type groups + planned-god state ---- */
.lgl-godgroup{ margin-bottom:30px; }
.lgl-godgroup:last-child{ margin-bottom:0; }
.lgl-godgroup-label{ display:flex; align-items:center; justify-content:center; gap:8px; font-family:var(--serif); font-size:13px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:var(--line-color); margin-bottom:14px; }
.lgl-godgroup-count{ font-size:10px; color:var(--faint); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:1px 8px; letter-spacing:.02em; text-transform:none; }
.lgl-elfline-btn.is-planned{ opacity:.72; border-style:dashed; }
.lgl-elfline-btn.is-planned:hover{ opacity:1; }

/* ---- Shared "more to come" empty state ---- */
.lgl-morecoming{ padding:60px 20px; text-align:center; font-family:var(--serif); font-size:18px; font-style:italic; color:var(--faint); }

/* ---- Favored Soul: D&D-wiki-style class page ---- */
.lgl-fs{ max-width:760px; }
.lgl-fs-p{ font-size:15px; line-height:1.7; color:var(--mid); margin:0 0 14px; }
.lgl-fs-p strong{ color:var(--hi); font-weight:700; }
.lgl-fs-p em{ color:var(--accent); font-style:italic; }
.lgl-fs-h2{ font-family:var(--serif); font-size:22px; font-weight:700; color:var(--hi); margin:38px 0 14px; padding-bottom:8px; border-bottom:2px solid var(--accent); }
.lgl-fs-callout{ margin:20px 0 28px; padding:18px 22px; border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:8px; background:rgba(200,168,107,.05); }
.lgl-fs-callout-h{ font-family:var(--serif); font-size:15px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--accent); margin-bottom:10px; }
.lgl-fs-callout .lgl-fs-p{ font-size:14px; margin-bottom:10px; }
.lgl-fs-callout .lgl-fs-p:last-child{ margin-bottom:0; }

/* Table */
.lgl-fs-tablewrap{ overflow-x:auto; margin:0 0 30px; border:1px solid var(--line); border-radius:8px; }
.lgl-fs-table{ width:100%; border-collapse:collapse; font-size:13.5px; }
.lgl-fs-table th{ background:var(--elev); color:var(--accent); font-family:var(--serif); font-weight:700; letter-spacing:.03em; text-align:left; padding:10px 14px; border-bottom:2px solid var(--accent); white-space:nowrap; }
.lgl-fs-table td{ padding:8px 14px; border-bottom:1px solid var(--line); color:var(--mid); white-space:nowrap; }
.lgl-fs-table td strong{ color:var(--hi); }
.lgl-fs-table tr:last-child td{ border-bottom:none; }
.lgl-fs-table tr:nth-child(even){ background:rgba(255,255,255,.014); }
.lgl-fs-table tr:hover{ background:rgba(200,168,107,.06); }

/* Feature cards */
.lgl-fs-feature{ margin:0 0 26px; padding-left:16px; border-left:2px solid var(--line); }
.lgl-fs-subs{ display:flex; flex-direction:column; gap:12px; margin:10px 0 14px; }
.lgl-fs-sub{ padding:10px 14px; border-left:2px solid var(--accent); border-radius:0 6px 6px 0; background:rgba(200,168,107,.04); }
.lgl-fs-sub-name{ font-size:13.5px; font-weight:700; color:var(--hi); margin-bottom:4px; }
.lgl-fs-sub-tag{ font-size:11.5px; font-weight:400; font-style:italic; color:var(--accent); }
.lgl-fs-sub .lgl-fs-p{ font-size:13.5px; margin:0; }
.lgl-fs-feature-name{ font-family:var(--serif); font-size:17px; font-weight:700; color:var(--hi); margin:0 0 2px; }
.lgl-fs-feature-level{ font-size:11.5px; font-style:italic; color:var(--accent); letter-spacing:.02em; margin-bottom:8px; }
.lgl-fs-feature .lgl-fs-p{ font-size:14.5px; }
.lgl-fs-list{ margin:0 0 14px; padding-left:22px; }
.lgl-fs-list li{ font-size:14.5px; line-height:1.65; color:var(--mid); margin-bottom:6px; }
.lgl-fs-list li strong{ color:var(--hi); }
.lgl-fs-list li em{ color:var(--accent); font-style:italic; }

/* Cosmic Burdens list + note callout */
.lgl-fs-notecallout{ font-size:13px; line-height:1.6; color:var(--mid); padding:14px 18px; margin:14px 0 24px; border:1px dashed var(--line); border-radius:8px; background:rgba(255,255,255,.02); }
.lgl-fs-notecallout strong{ color:var(--accent); text-transform:uppercase; font-size:11px; letter-spacing:.08em; }
.lgl-fs-burdengrid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:14px; margin:20px 0 10px; }
.lgl-fs-burdenbtn{ display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:20px 16px; cursor:pointer; border:1px solid var(--line); border-top:3px solid var(--burden-color); border-radius:12px; background:linear-gradient(180deg, color-mix(in srgb, var(--burden-color) 12%, transparent), transparent 78%); color:var(--hi); transition:transform .15s, border-color .15s, box-shadow .15s, background .15s; }
.lgl-fs-burdenbtn:not(:disabled):hover{ transform:translateY(-3px); border-color:var(--burden-color); box-shadow:0 10px 28px -14px var(--burden-color); }
.lgl-fs-burdenbtn:disabled{ cursor:default; opacity:.55; }
.lgl-fs-burdenbtn-icon{ display:flex; align-items:center; justify-content:center; width:44px; height:44px; border-radius:999px; color:var(--burden-color); background:color-mix(in srgb, var(--burden-color) 16%, transparent); border:1px solid color-mix(in srgb, var(--burden-color) 40%, transparent); }
.lgl-fs-burdenbtn-name{ font-family:var(--serif); font-size:16px; font-weight:700; color:var(--hi); }
.lgl-fs-burdenbtn-desc{ font-size:12px; line-height:1.5; color:var(--mid); }
.lgl-fs-burdenlist{ list-style:none; margin:0 0 20px; padding:0; display:flex; flex-direction:column; gap:10px; }
.lgl-fs-burdenlist li{ font-size:14px; line-height:1.65; color:var(--mid); padding:12px 16px; border:1px solid var(--line); border-radius:7px; background:var(--surface); }
.lgl-fs-burdenlist-item{ display:flex; align-items:flex-start; gap:12px; }
.lgl-fs-burdenlist-icon{ display:flex; align-items:center; justify-content:center; width:28px; height:28px; flex:0 0 auto; margin-top:1px; border-radius:999px; color:var(--burden-color); background:color-mix(in srgb, var(--burden-color) 16%, transparent); border:1px solid color-mix(in srgb, var(--burden-color) 45%, transparent); }
.lgl-fs-burdenlist li strong{ color:var(--hi); }

/* Subclass (Burden) sections */
.lgl-fs-burden{ margin-top:48px; padding-top:8px; border-top:3px double var(--line); }
.lgl-fs-burden-headrow{ display:flex; align-items:center; gap:14px; margin-top:20px; }
.lgl-fs-burden-icon{ display:flex; align-items:center; justify-content:center; width:44px; height:44px; flex:0 0 auto; border-radius:999px; color:var(--burden-color); background:color-mix(in srgb, var(--burden-color) 16%, transparent); border:1px solid color-mix(in srgb, var(--burden-color) 45%, transparent); }
.lgl-fs-burden-title{ font-family:var(--serif); font-size:26px; font-weight:700; color:var(--accent); margin:0 0 6px; }
.lgl-fs-burden-note{ font-size:12.5px; color:var(--faint); margin:0 0 12px; }
.lgl-fs-favweapon{ font-size:12.5px; letter-spacing:.04em; color:var(--mid); text-transform:uppercase; margin-bottom:14px; }
.lgl-fs-favweapon strong{ color:var(--hi); text-transform:none; }

/* Stat block card */
.lgl-statblock{ margin:16px 0 20px; padding:18px 20px; border:1px solid rgba(200,168,107,.4); border-radius:8px; background:linear-gradient(180deg, rgba(200,168,107,.06), var(--surface)); max-width:420px; }
.lgl-statblock-name{ font-family:var(--serif); font-size:19px; font-weight:700; color:var(--hi); }
.lgl-statblock-type{ font-size:12.5px; font-style:italic; color:var(--mid); margin-bottom:8px; }
.lgl-statblock-rule{ height:2px; background:linear-gradient(90deg, var(--accent), transparent); margin:8px 0; }
.lgl-statblock-row{ font-size:13px; color:var(--mid); margin:3px 0; }
.lgl-statblock-row strong{ color:var(--hi); margin-right:5px; }
.lgl-statblock-abilities{ display:grid; grid-template-columns:repeat(6, 1fr); gap:4px; text-align:center; margin:6px 0; }
.lgl-statblock-ability{ display:flex; flex-direction:column; padding:4px 2px; border:1px solid var(--line); border-radius:5px; background:var(--elev); }
.lgl-statblock-ability-label{ font-size:10px; font-weight:700; letter-spacing:.06em; color:var(--accent); }
.lgl-statblock-ability-val{ font-size:12px; color:var(--hi); }
.lgl-statblock-section-h{ font-family:var(--serif); font-size:13px; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:.05em; margin:12px 0 6px; }
.lgl-statblock-trait{ font-size:13px; line-height:1.6; color:var(--mid); margin:0 0 8px; }
.lgl-statblock-trait em{ color:var(--hi); font-style:italic; }

/* MECHANICS fold on Codex race entries */
.lgl-mechfold{ margin-top:34px; border-top:1px solid var(--line); padding-top:22px; }
.lgl-mechfold-toggle{ display:flex; align-items:center; justify-content:center; gap:9px; width:100%; padding:14px 18px; border:1px solid var(--line); border-radius:11px; background:var(--surface); cursor:pointer; color:var(--accent); font-family:var(--serif); font-weight:600; font-size:15px; letter-spacing:.14em; text-transform:uppercase; transition:border-color .15s, background .15s; }
.lgl-mechfold-toggle:hover{ border-color:var(--accent); background:var(--elev); }
.lgl-mechfold-chevron{ transition:transform .2s ease; }
.lgl-mechfold-chevron.is-open{ transform:rotate(90deg); }
.lgl-mechfold-body{ margin-top:22px; }
/* Legacy trait gold treatment — matches the Luck & Love card look everywhere */
.lgl-traitbox.is-legacy{ border-left:4px solid var(--accent); background:rgba(200,168,107,.04); }
.lgl-traitbox.is-legacy:hover{ background:rgba(200,168,107,.08); }
.lgl-step-label{ flex:1; }

/* ---- Race step: tabs + cards + stats panel ---- */
.lgl-entry-racestep{ max-width:1100px !important; }
.lgl-racestep{ display:flex; flex-direction:column; gap:0; }
.lgl-racestep-tabs{ display:flex; gap:4px; border-bottom:1px solid var(--line); margin-bottom:24px; overflow-x:auto; scrollbar-width:none; justify-content:center; }
.lgl-racestep-tabs::-webkit-scrollbar{ display:none; }
.lgl-racestep-tab{ flex:0 0 auto; display:flex; align-items:center; gap:7px; padding:10px 16px; background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-1px; cursor:pointer; color:var(--mid); font-size:14px; font-weight:500; white-space:nowrap; transition:color .15s; }
.lgl-racestep-tab:hover{ color:var(--hi); }
.lgl-racestep-tab.is-active{ color:var(--accent); border-bottom-color:var(--accent); }
.lgl-racestep-tab-count{ font-size:11px; color:var(--faint); background:var(--surface); border:1px solid var(--line); border-radius:999px; padding:1px 8px; }
.lgl-racestep-tab.is-active .lgl-racestep-tab-count{ color:var(--accent); background:var(--accent-soft); border-color:var(--accent); }
.lgl-racestep-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:12px; margin-bottom:28px; }
.lgl-racecard{ display:flex; flex-direction:column; align-items:center; text-align:center; cursor:pointer; border:1px solid var(--line); border-radius:12px; padding:18px 18px; background:var(--surface); color:inherit; gap:6px; transition:border-color .15s, transform .15s, background .15s; width:210px; flex:0 0 210px; justify-content:center; }
.lgl-racecard:hover{ border-color:var(--accent); transform:translateY(-2px); background:var(--elev); }
.lgl-racecard.is-active{ border-color:var(--accent); border-left:3px solid var(--accent); background:var(--accent-soft); }
.lgl-racecard-name{ font-family:var(--serif); font-size:22px; font-weight:600; color:var(--hi); line-height:1.15; }
.lgl-racecard-keywords{ font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); font-weight:600; margin-top:3px; }
.lgl-racecard-tagline{ font-size:12px; color:var(--mid); line-height:1.4; margin-top:2px; font-style:italic; }
.lgl-racecard-badge{ margin-top:6px; font-size:10px; letter-spacing:.1em; color:var(--bg); background:var(--accent); border-radius:999px; padding:2px 8px; font-weight:600; }
.lgl-racecard-badge.soft{ color:var(--mid); background:transparent; border:1px solid var(--line); }
.lgl-race-statsbox{ border:1px solid var(--line); border-radius:14px; padding:24px 26px 26px; background:linear-gradient(180deg, var(--elev), var(--surface)); margin-bottom:8px; }
.lgl-race-statsbox-head{ display:flex; flex-direction:column; align-items:center; gap:14px; margin-bottom:18px; text-align:center; }
.lgl-race-statsbox-title-block{ display:flex; flex-direction:column; gap:4px; align-items:center; }
.lgl-race-statsbox-title{ font-family:var(--serif); font-size:30px; font-weight:600; color:var(--hi); margin:0; }
.lgl-racestep-empty{ padding:40px 20px; color:var(--faint); font-size:14px; text-align:center; }

/* ---- Old race split (keep for any remnant refs, but zero-out layout) ---- */
.lgl-race-split{ display:flex; gap:32px; align-items:flex-start; max-width:1340px; margin:0 auto; }
.lgl-race-list{ flex:0 0 300px; max-height:82vh; overflow:auto; position:sticky; top:0; padding-top:2px; }
.lgl-race-detail-pane{ flex:1; min-width:0; }
.lgl-race-list .lgl-nav-group{ display:grid; grid-template-columns:repeat(2, 1fr); gap:3px 8px; margin-bottom:18px; padding-bottom:12px; border-bottom:1px solid var(--line); }
.lgl-race-list .lgl-nav-group:last-child{ border-bottom:none; margin-bottom:0; padding-bottom:0; }
.lgl-race-list .lgl-nav-label{ grid-column:1 / -1; font-weight:600; color:var(--accent); opacity:.9; }
.lgl-race-list .lgl-nav-item{ font-size:15.5px; padding:9px 12px; }
.lgl-race-detail-pane{ flex:1; min-width:0; }
.lgl-race-detail-pane .lgl-entry{ padding:0 0 10px; max-width:none; }
.lgl-race-detail-pane .lgl-empty-page{ padding:60px 20px; }
.lgl-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:12px; }
.lgl-card-name{ font-family:var(--serif); font-size:18px; color:var(--hi); font-weight:500; margin-bottom:6px; display:block; }
.lgl-card-note{ font-size:14px; color:var(--mid); display:block; }
.lgl-pick{ text-align:center; cursor:pointer; border:1px solid var(--line); border-radius:10px; padding:18px 20px; background:var(--surface); color:inherit; min-width:220px; max-width:320px; flex:0 1 auto; }
.lgl-classpick{ display:flex; flex-direction:column; align-items:center; gap:10px; min-width:130px; max-width:155px; padding:22px 14px; }
.lgl-classpick-icon{ width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--accent-soft); color:var(--accent); }
.lgl-classpick.is-active .lgl-classpick-icon{ background:var(--accent); color:var(--bg); }
.lgl-pick:hover{ border-color:var(--accent); }
.lgl-pick.is-active{ border-color:var(--accent); background:var(--accent-soft); }
.lgl-traitbox-row{ display:flex; flex-wrap:wrap; justify-content:center; gap:10px; }
.lgl-traitbox{
  display:flex; flex-direction:column; gap:4px; text-align:center;
  border:1px solid var(--line); border-radius:10px; background:var(--surface);
  padding:14px 19px; min-width:175px; max-width:290px; flex:0 1 auto;
}
.lgl-trait-name{ font-weight:600; color:var(--accent); font-size:15px; }
.lgl-trait-flavor{ display:block; font-family:var(--serif); font-style:italic; color:var(--faint); font-size:13px; line-height:1.45; margin:3px 0 2px; }
.lgl-trait-note{ color:var(--mid); font-size:15px; }
.lgl-usechip-wrap{ display:block; padding-top:10px; }
.lgl-tn-text{ display:block; }
/* Read-only wiki boxes: size to content, chip flows right under the text. */
.lgl-legacy-card-note .lgl-tn-body, .lgl-trait-note .lgl-tn-body{ display:block; }
.lgl-legacy-card, .lgl-traitbox{ align-self:flex-start; }
/* Builder legacy picker: equal-height tiles, text centered, chip pinned bottom. */
.lgl-legacypick-note{ display:flex; flex-direction:column; flex:1 1 auto; }
.lgl-legacypick-note .lgl-tn-body{ display:flex; flex-direction:column; justify-content:center; flex:1 1 auto; }
.lgl-usechip{ display:inline-flex; align-items:center; font-size:11px; font-weight:600; letter-spacing:.04em; color:var(--accent); background:var(--accent-soft); border:1px solid var(--line); border-radius:999px; padding:3px 11px; white-space:nowrap; }
.lgl-usechip.is-passive{ color:var(--faint); background:var(--surface); }
.lgl-subrace{ border:1px solid var(--line); border-radius:9px; padding:14px 16px; margin-bottom:12px; background:var(--surface); }
.lgl-subrace .lgl-traitbox{ background:var(--elev); }
.lgl-subrace-head{ font-family:var(--serif); font-size:16px; color:var(--accent); font-weight:600; margin-bottom:4px; }
.lgl-subrace-desc{ font-size:13px; color:var(--mid); margin-bottom:8px; font-style:italic; }
.lgl-guide-note{ background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:8px; padding:12px 15px; font-size:13.5px; color:var(--mid); margin-bottom:26px; }
.lgl-racedetail{ margin-top:10px; border:1px solid var(--line); border-radius:10px; padding:18px 20px; background:var(--surface); }
.lgl-racedetail-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; font-family:var(--serif); font-size:20px; color:var(--hi); font-weight:600; margin-bottom:14px; }
.lgl-inline-link2{ background:none; border:none; cursor:pointer; color:var(--accent); font-size:13px; display:inline-flex; align-items:center; gap:4px; }
.lgl-sub-label{ font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--faint); margin:14px 0 8px; }
.lgl-subrace-panel{
  margin-top:22px; padding:22px 24px 24px; border-radius:14px;
  background:
    radial-gradient(140% 100% at 100% 0%, rgba(200,168,107,.07), transparent 60%),
    linear-gradient(180deg, var(--elev), var(--surface));
  border:1px solid var(--line);
}
.lgl-subrace-panel-head{ display:flex; align-items:center; justify-content:center; gap:9px; margin-bottom:6px; }
.lgl-subrace-mark{ width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--accent-soft); color:var(--accent); border:1px solid var(--line); }
.lgl-subrace-title{ font-family:var(--serif); font-weight:600; font-size:21px; color:var(--hi); }
.lgl-subrace-def{ font-size:14.5px; color:var(--mid); margin:8px 0 18px; line-height:1.55; }
.lgl-subrace-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:12px; }
.lgl-subrace-fulldetail{ margin-top:22px; padding-top:20px; border-top:1px solid var(--line); }

/* Compact "what's available" preview on the race-selection page — chips only, not pickable */
.lgl-traitspreview{ margin-top:30px; padding-top:24px; border-top:1px solid var(--line); }
.lgl-traitspreview-row{ display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; margin-top:12px; }
.lgl-traitspreview-label{ flex:0 0 auto; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--faint); min-width:110px; text-align:right; }
.lgl-traitspreview-chips{ display:flex; flex-wrap:wrap; gap:6px; justify-content:center; flex:1; }

/* The dedicated Subrace & Legacy Traits page */
.lgl-traits-page{ max-width:1340px; margin:0 auto; text-align:center; }
.lgl-subrace-card{
  display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center;
  border:1px solid var(--line); border-radius:13px; background:var(--surface); cursor:pointer;
  padding:22px 24px; min-width:250px; max-width:330px; flex:0 1 auto;
  transition:border-color .15s ease, background .15s ease, transform .15s ease;
}
.lgl-subrace-card:hover{ border-color:var(--accent); transform:translateY(-2px); }
.lgl-subrace-card.is-active{ border-color:var(--accent); background:var(--accent-soft); }
.lgl-subrace-card-name{ font-family:var(--serif); font-size:21px; font-weight:600; color:var(--hi); }
.lgl-subrace-card.is-active .lgl-subrace-card-name{ color:var(--accent); }
.lgl-subrace-card-desc{ font-size:14.5px; color:var(--mid); line-height:1.55; }
.lgl-subrace-card-traits{ display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin-top:3px; }
.lgl-subrace-chip{ font-size:12.5px; color:var(--accent); border:1px solid var(--line); background:rgba(200,168,107,.08); border-radius:999px; padding:3px 11px; }
.lgl-stub{ padding:6px 0 0; }
.lgl-roll-btn{ background:var(--accent); color:var(--bg); border:none; border-radius:8px; padding:11px 18px; font-weight:600; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; }
.lgl-roll-btn:hover{ filter:brightness(1.07); }
.lgl-roll-pool{ display:flex; gap:8px; margin:18px 0; flex-wrap:wrap; justify-content:center; }
.lgl-roll-chip{ width:46px; height:46px; display:flex; align-items:center; justify-content:center; border:1px solid var(--line); border-radius:8px; background:var(--surface); font-family:var(--serif); font-size:19px; color:var(--hi); transition:transform .15s ease, border-color .2s ease, background .2s ease; }
.lgl-roll-chip.is-tumbling{ color:var(--faint); border-color:var(--line); animation:lgl-tumble .14s ease-in-out infinite; }
.lgl-roll-chip.is-settled{ border-color:var(--accent); background:var(--accent-soft); color:var(--accent); animation:lgl-settle .38s ease; }
.lgl-roll-chip.is-used{ opacity:.35; }
@keyframes lgl-tumble{ 0%,100%{ transform:translateY(0) rotate(0deg); } 50%{ transform:translateY(-3px) rotate(-4deg); } }
@keyframes lgl-settle{ 0%{ transform:scale(1.32); } 60%{ transform:scale(0.94); } 100%{ transform:scale(1); } }
.lgl-sealed{ display:inline-flex; align-items:center; gap:7px; font-size:12.5px; color:var(--accent); background:var(--accent-soft); border:1px solid var(--line); border-radius:8px; padding:8px 12px; margin-bottom:18px; width:fit-content; }
@media (prefers-reduced-motion:reduce){ .lgl-roll-chip.is-tumbling{ animation:none; } .lgl-roll-chip.is-settled{ animation:none; } }
.lgl-ability-rows{ display:flex; flex-direction:column; gap:8px; max-width:340px; margin:0 auto; }
.lgl-ability-row{ display:flex; align-items:center; gap:12px; }
.lgl-ability-name{ flex:0 0 44px; font-weight:600; color:var(--accent); font-size:13px; letter-spacing:.08em; }
.lgl-ability-row select{ flex:1; background:var(--surface); border:1px solid var(--line); color:var(--hi); border-radius:7px; padding:7px 10px; font-size:14px; }
.lgl-ability-mod{ flex:0 0 36px; text-align:right; color:var(--mid); font-size:14px; }
.lgl-stepcards-grid{ display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin:0 0 32px; }
.lgl-stepcard{
  display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px;
  border:1px solid var(--line); border-radius:13px; background:var(--surface);
  padding:22px 18px 20px;
}
.lgl-stepcard-top{ position:relative; display:flex; align-items:center; justify-content:center; }
.lgl-stepcard-icon{ width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--accent-soft); color:var(--accent); }
.lgl-stepcard-n{
  position:absolute; top:-6px; right:-10px; width:21px; height:21px; border-radius:50%;
  background:var(--bg); border:1px solid var(--accent); color:var(--accent);
  display:flex; align-items:center; justify-content:center; font-size:10.5px; font-weight:700;
}
.lgl-stepcard-name{ font-family:var(--serif); font-size:16.5px; color:var(--hi); font-weight:600; }
.lgl-stepcard-blurb{ font-size:13px; color:var(--mid); line-height:1.5; }
.lgl-rulesnote{ font-size:11.5px; color:var(--faint); max-width:480px; margin:0 auto 18px; line-height:1.5; }
@media (max-width:1100px){
  .lgl-stepcards-grid{ grid-template-columns:repeat(2, 1fr); }
}
.lgl-make-btn{ background:var(--accent); color:var(--bg); border:none; border-radius:9px; padding:13px 24px; font-weight:600; font-size:14px; letter-spacing:.06em; text-transform:uppercase; cursor:pointer; }
.lgl-make-btn:hover{ filter:brightness(1.07); }
.lgl-flow-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.lgl-mode-pill{ font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); border:1px solid var(--line); background:var(--accent-soft); border-radius:999px; padding:4px 11px; }
.lgl-stepnav{ display:flex; justify-content:space-between; margin-top:40px; padding-top:22px; border-top:1px solid var(--line); }
.lgl-stepnav button{ display:inline-flex; align-items:center; gap:5px; background:var(--surface); border:1px solid var(--line); color:var(--hi); padding:9px 16px; border-radius:8px; cursor:pointer; font-size:14px; }
.lgl-stepnav button.primary{ background:var(--accent); color:var(--bg); border-color:var(--accent); font-weight:600; }
.lgl-stepnav button:disabled{ opacity:.4; cursor:not-allowed; }
.lgl-timeline{ list-style:none; margin:0; padding:0 0 0 6px; }
.lgl-tl-item{ position:relative; padding:0 0 30px 28px; border-left:1px solid var(--line); }
.lgl-tl-item:last-child{ border-left-color:transparent; }
.lgl-tl-dot{ position:absolute; left:-6px; top:3px; width:11px; height:11px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 4px var(--bg); }
.lgl-tl-era{ font-size:10px; letter-spacing:.22em; text-transform:uppercase; color:var(--faint); margin-bottom:5px; }
.lgl-tl-title{ font-family:var(--serif); font-size:21px; color:var(--hi); font-weight:600; margin-bottom:6px; }
.lgl-tl-img{ display:block; width:100%; max-width:440px; border-radius:8px; border:1px solid var(--line); margin:4px 0 12px; }
.lgl-tl-body{ color:var(--mid); font-size:15px; }
.lgl-map{ position:relative; height:340px; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:radial-gradient(120% 120% at 30% 20%, #1d1d21, #121214 70%), repeating-linear-gradient(45deg, transparent 0 16px, rgba(255,255,255,.02) 16px 17px); }
.lgl-hotspot{ position:absolute; transform:translate(-50%,-50%); background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:7px; color:var(--hi); }
.lgl-hotspot-dot{ width:13px; height:13px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 5px rgba(200,168,107,.18); flex:0 0 auto; }
.lgl-hotspot-label{ font-family:var(--serif); font-size:14px; background:rgba(14,14,16,.82); border:1px solid var(--line); padding:3px 9px; border-radius:6px; white-space:nowrap; }
.lgl-hotspot:hover .lgl-hotspot-label{ color:var(--accent); border-color:var(--accent); }
.lgl-hotspot:focus-visible{ outline:2px solid var(--accent); outline-offset:3px; border-radius:4px; }
.lgl-subtabs{ display:flex; gap:4px; border-bottom:1px solid var(--line); margin-bottom:20px; overflow-x:auto; scrollbar-width:thin; }
.lgl-subtab{ flex:0 0 auto; padding:9px 14px; border:none; background:none; color:var(--mid); cursor:pointer; font-size:14px; border-bottom:2px solid transparent; margin-bottom:-1px; white-space:nowrap; }
.lgl-subtab:hover{ color:var(--hi); }
.lgl-subtab.is-active{ color:var(--accent); border-bottom-color:var(--accent); font-weight:500; }
.lgl-tales-note{ background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:8px; padding:13px 15px; font-size:13.5px; color:var(--mid); margin-bottom:24px; }
.lgl-tales{ display:flex; flex-direction:column; gap:14px; }
.lgl-tale{ border:1px solid var(--line); border-radius:10px; padding:16px 18px; background:var(--surface); }
.lgl-tale-img{ display:block; width:100%; border-radius:8px; border:1px solid var(--line); margin-bottom:12px; }
.lgl-tale-stamp{ font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--accent); margin-bottom:6px; }
.lgl-tale-title{ font-family:var(--serif); font-size:19px; color:var(--hi); font-weight:600; margin-bottom:5px; }
.lgl-tale-body{ color:var(--mid); font-size:15px; }
.lgl-link-wrap{ position:relative; }
.lgl-link{ font:inherit; background:none; border:none; padding:0; cursor:help; color:var(--accent); border-bottom:1px dashed var(--accent); }
.lgl-link.is-entry{ cursor:pointer; border-bottom-style:solid; }
.lgl-link:focus-visible{ outline:2px solid var(--accent); outline-offset:3px; border-radius:2px; }
.lgl-pop{ position:absolute; top:calc(100% + 9px); left:0; z-index:50; width:270px; max-width:78vw; display:flex; flex-direction:column; gap:6px; background:var(--elev); border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:9px; padding:12px 14px; box-shadow:0 18px 40px -18px #000; text-align:center; white-space:normal; cursor:default; }
.lgl-pop-tag{ font-size:9.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--faint); }
.lgl-pop-term{ font-family:var(--serif); font-size:16px; color:var(--hi); font-weight:600; }
.lgl-pop-body{ font-size:13px; color:var(--mid); line-height:1.5; }
.lgl-pop-open{ font-size:11px; color:var(--accent); margin-top:2px; }
.lgl-empty-page{ padding:60px 40px; color:var(--faint); }

/* Harvesting & Crafting */
.lgl-datatable-wrap{ overflow-x:auto; margin:18px 0 8px; border:1px solid var(--line); border-radius:10px; }
.lgl-datatable-wrap.is-fit{ overflow-x:visible; }
.lgl-datatable-wrap.is-fit .lgl-datatable{ table-layout:auto; }
.lgl-datatable{ width:100%; border-collapse:collapse; font-size:13.5px; text-align:left; }
.lgl-datatable th{ background:var(--elev); color:var(--accent); font-weight:600; font-size:11px; letter-spacing:.08em; text-transform:uppercase; padding:10px 14px; border-bottom:1px solid var(--line); white-space:nowrap; }
.lgl-datatable td{ padding:10px 14px; border-bottom:1px solid var(--line); color:var(--mid); vertical-align:top; }
.lgl-datatable tr:last-child td{ border-bottom:none; }
.lgl-datatable tr:hover td{ background:rgba(255,255,255,.02); }

.lgl-formula-box{ margin:14px auto; max-width:560px; border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:9px; background:var(--surface); padding:13px 18px; font-family:var(--serif); font-weight:600; color:var(--hi); font-size:14.5px; text-align:center; }
.lgl-example-box{ font-size:14.5px; }

.lgl-dcchip{ display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; border-radius:999px; padding:3px 11px; border:1px solid; white-space:nowrap; }
.lgl-dcchip-plain{ background:var(--surface); color:var(--mid); border-color:var(--line); }
.lgl-dckey{ display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:8px; margin:14px 0 26px; }
.lgl-jumprow{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin:14px 0 22px; }
.lgl-jumpchip{ font-size:13px; color:var(--accent); background:var(--accent-soft); border:1px solid var(--line); border-radius:999px; padding:6px 14px; cursor:pointer; transition:border-color .15s ease, background .15s ease; }
.lgl-jumpchip:hover{ border-color:var(--accent); background:rgba(200,168,107,.2); }
.lgl-jumpchip:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }
.lgl-dckey-v{ font-size:12px; color:var(--faint); margin-left:6px; }

.lgl-componentpill{ display:inline-flex; align-items:center; font-size:12.5px; color:var(--mid); border:1px solid var(--line); background:var(--bg); border-radius:999px; padding:3px 11px; }
.lgl-componentpill.is-volatile{ color:rgb(241,220,220); border-color:rgba(178,58,58,.55); background:rgba(178,58,58,.16); }
.lgl-componentpill sup{ margin-left:2px; font-size:10px; }

.lgl-harvestblock{ margin-bottom:26px; padding:18px 20px; border:1px solid var(--line); border-radius:12px; background:var(--surface); text-align:left; scroll-margin-top:24px; }
.lgl-harvestblock-head{ font-family:var(--serif); font-weight:600; font-size:18px; color:var(--hi); margin-bottom:12px; text-align:center; }
.lgl-harvestblock-skill{ color:var(--accent); font-weight:400; font-size:14px; }
.lgl-harvestrow{ display:flex; flex-wrap:wrap; align-items:center; gap:12px; padding:8px 0; border-top:1px solid var(--line); }
.lgl-harvestrow:first-of-type{ border-top:none; }
.lgl-harvestrow-items{ display:flex; flex-wrap:wrap; gap:6px; flex:1; }

/* home */
.lgl-home{ flex:1; overflow:auto; padding:64px 24px 70px; }
.lgl-home-hero{ max-width:760px; margin:0 auto 40px; text-align:center; }
.lgl-home-title{
  font-family:var(--serif); font-weight:600; margin:0; letter-spacing:.04em;
  font-size:76px; line-height:1; text-transform:uppercase;
  background:linear-gradient(180deg, #F3E2BB 0%, var(--accent) 55%, #9A7B45 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  text-shadow:0 2px 30px rgba(200,168,107,.35);
  position:relative; display:inline-block; padding:0 .06em;
}
.lgl-home-title::before, .lgl-home-title::after{
  content:''; position:absolute; top:50%; height:1px; width:64px;
  background:linear-gradient(90deg, transparent, var(--accent)); opacity:.55;
}
.lgl-home-title::before{ right:calc(100% + 22px); }
.lgl-home-title::after{ left:calc(100% + 22px); transform:scaleX(-1); }
.lgl-home-grid{ max-width:860px; margin:0 auto; display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; align-items:stretch; }
.lgl-home-card{ text-align:center; cursor:pointer; border:1px solid var(--line); border-radius:13px; padding:22px 20px 18px; background:var(--surface); color:inherit; display:flex; flex-direction:column; align-items:center; gap:9px; }
.lgl-home-card:hover{ border-color:var(--accent); transform:translateY(-2px); }
.lgl-home-card-icon{ width:36px; height:36px; border-radius:9px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; }
.lgl-home-card-label{ font-family:var(--serif); font-size:18px; font-weight:600; color:var(--hi); }
.lgl-home-card-desc{ font-size:13px; color:var(--mid); line-height:1.5; flex:1; }
.lgl-home-card-go{ font-size:12px; color:var(--accent); display:inline-flex; align-items:center; gap:3px; margin-top:4px; }
.lgl-home-feature{
  grid-column:1 / -1; display:flex; flex-direction:column; align-items:center; gap:11px; text-align:center; cursor:pointer; color:inherit;
  padding:34px 28px 28px; border-radius:18px; margin-top:6px;
  border:1px solid var(--accent); background:
    radial-gradient(120% 160% at 50% -10%, rgba(200,168,107,.16), transparent 60%),
    linear-gradient(180deg, var(--elev), var(--surface));
  box-shadow:0 0 0 1px rgba(200,168,107,.08) inset, 0 28px 60px -32px #000;
  transition:transform .15s ease, box-shadow .15s ease;
}
.lgl-home-feature:hover{ transform:translateY(-2px); box-shadow:0 0 0 1px rgba(200,168,107,.14) inset, 0 32px 70px -30px #000; }
.lgl-home-feature-icon{ width:58px; height:58px; border-radius:50%; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; border:1px solid var(--line); }
.lgl-home-feature-label{ font-family:var(--serif); font-size:28px; font-weight:600; color:var(--hi); }
.lgl-home-feature-desc{ font-size:15px; color:var(--mid); max-width:480px; line-height:1.55; }
.lgl-home-feature-go{ font-size:13px; color:var(--accent); display:inline-flex; align-items:center; gap:4px; margin-top:2px; font-weight:600; }

/* wiki home */
.lgl-centered .lgl-h2{ text-align:center; }
.lgl-pick-centered{ text-align:center; }
.lgl-wikihome-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:12px; margin-bottom:8px; }
.lgl-wikihome-card{ text-align:center; cursor:pointer; border:1px solid var(--line); border-radius:12px; padding:20px 16px 18px; background:var(--surface); color:inherit; display:flex; flex-direction:column; align-items:center; gap:8px; min-width:150px; max-width:200px; flex:0 1 auto; transition:border-color .15s ease, transform .15s ease; }
.lgl-wikihome-card:hover{ border-color:var(--accent); transform:translateY(-2px); }
.lgl-wikihome-card-icon{ width:34px; height:34px; border-radius:9px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center; }
.lgl-wikihome-card-label{ display:block; font-family:var(--serif); font-size:16px; color:var(--hi); font-weight:600; }
.lgl-wikihome-card-count{ display:block; font-size:12px; color:var(--faint); }
.lgl-nav-home{ font-weight:500; margin-bottom:8px; border-bottom:1px solid var(--line); border-radius:0; padding-bottom:11px; }
.lgl-aside-scrim{ display:none; }
@media (max-width:820px){
  .lgl-brand span{ display:none; }
  .lgl-aside-toggle{ display:inline-flex; }
  .lgl-aside-wrap{ position:absolute; top:0; bottom:0; left:0; width:212px; z-index:25; transform:translateX(-115%); transition:transform .22s ease; box-shadow:0 0 50px -10px #000; }
  .lgl-aside-wrap.is-open{ transform:translateX(0); }
  .lgl-aside-scrim{ display:block; position:absolute; inset:0; z-index:24; background:rgba(0,0,0,.5); }
  .lgl-entry{ padding:24px 22px 70px; }
  .lgl-entry h1{ font-size:38px; }
  .lgl-pick, .lgl-legacy-card, .lgl-modecard, .lgl-home-card, .lgl-wikihome-card, .lgl-traitbox, .lgl-legacypick-card, .lgl-subrace-card{ max-width:100%; }
  .lgl-race-split{ flex-direction:column; }
  .lgl-race-list{ flex:0 0 auto; max-height:none; position:static; width:100%; display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; }
  .lgl-race-list .lgl-nav-group{ display:flex; flex-direction:column; flex:0 0 auto; border-bottom:none; padding-bottom:0; margin-bottom:0; }
  .lgl-home-title{ font-size:46px; }
  .lgl-home-title::before, .lgl-home-title::after{ display:none; }
  .lgl-home-grid{ grid-template-columns:1fr; }
  .lgl-home-feature{ padding:26px 20px 22px; }
  .lgl-home-feature-label{ font-size:22px; }
  .lgl-stepcards-grid{ grid-template-columns:1fr; }
}
@media (prefers-reduced-motion:reduce){ .lgl-aside-wrap{ transition:none; } }
`;
