// MOTIF LEXICON — 24 archetypes (A4). Matching code lives in the engine (A2).
// Each archetype: lowercase keywords (whole words or phrases, with common
// misspellings and synonyms), the flags it implies, a place and 6 sensory
// details (both are token VALUES for {motif.place} / {motif.detail}: lowercase
// noun phrases, no final punctuation, readable mid-sentence), 3 living moments
// and 2 witness lines. Lines are stage-neutral present-tense moments, so they
// read correctly in any chapter and next to any focus's beats.
// Keywords avoid bare words that collide across archetypes or desires
// ('run' in 'run my own business', 'home' in 'at home in my body', 'raise' in
// 'raise my kids'); phrases carry those meanings instead.
// STYLE HEADER (binding for every content file; full guide: docs/CONTRACTS.md §7–§8)
// - Original prose only. Second person, present tense. Never 'I' in narration.
// - Template sentences ≤ 24 words (each {token} counts as one word). No parentheses,
//   abbreviations or '&'. Curly quotes only. At most one em dash per fragment.
// - No 'not X but Y'. Nothing from BANNED_PHRASES in ./types.ts: no 'future self', no
//   moon or astrology, no weekdays, no health or money guarantees, no stock LLM words.
// - No gendered pronouns for other people. Never assume a body, gender or relationship:
//   a line that assumes a partner, child, boss or client declares `requires: [flag]`.
// - Only the tokens ALLOWED_TOKENS permits for this content kind. Never start a sentence
//   with a lowercase-valued token ({desire.np}, {desire.done}, {proof.done}, {feeling}…).
// - Ids are permanent once shipped: never rename, never reuse. Prefixes: CONTRACTS.md §7.2.
// - Self-check: bun test lib/story/content

import type { ContentStatus, Fragment, MotifArchetype } from "./types";

export const STATUS: ContentStatus = "final";

const fr = (id: string, text: string): Fragment => ({ id, text });

export const MOTIFS: readonly MotifArchetype[] = [
  /* ------------------------------------------------------------ work and making */
  {
    id: "own-business",
    focus: "career",
    label: "Own business or studio",
    keywords: [
      "my own business", "own business", "small business", "a business", "start a business", "starting a business",
      "launch a business", "business of my own", "my own company", "own company", "my own brand", "startup", "start-up",
      "studio", "agency", "boutique", "salon", "workshop", "my own shop", "own shop", "online shop", "online store",
      "my own practice", "entrepreneur", "founder", "be my own boss", "my own boss", "own boss",
      "buisness", "bussiness", "busines", "bizness", "entreprenuer", "entrepeneur",
    ],
    flags: ["business"],
    place: "the studio",
    details: [
      "a key on a paper tag",
      "fabric swatches pinned above the desk",
      "your name lettered on the window",
      "a stack of invoices with your logo at the top",
      "the bell above the door",
      "coffee rings on the first sketchbook",
    ],
    living: [
      fr("mo-own-business-li1", "You let yourself in before anyone else arrives. Your name is on the window, slightly crooked, and you still haven’t fixed it. You like it crooked. It looks like a beginning that stuck."),
      fr("mo-own-business-li2", "An enquiry lands while you are eating lunch at your own desk. You read it twice, grin, and reply before the sandwich is finished. Nobody signs off on your answer. It is yours to give."),
      fr("mo-own-business-li3", "At closing time you switch off the lights and pause in the doorway, looking back at the room you built. It still hums with the day. You feel {feeling}, {name}, and a little proud."),
    ],
    witness: [
      fr("mo-own-business-wi1", "A first client lingers at the door on the way out and says the place feels exactly like you. After they have gone you stay very still for a moment, smiling at the floor."),
      fr("mo-own-business-wi2", "A friend from the old days walks in, turns a slow circle and laughs. “You actually did it,” they say. You hand them a coffee in a mug with your logo on it."),
    ],
  },
  {
    id: "food-venture",
    focus: "career",
    label: "Bakery, café or food",
    keywords: [
      "bakery", "bakeries", "baker", "patisserie", "cafe", "café", "coffee shop", "coffee house", "tea room", "tearoom",
      "restaurant", "bistro", "deli", "food truck", "food van", "food stall", "street food", "catering", "caterer",
      "supper club", "pop-up", "cake business", "cake shop", "bake shop", "food business", "my own kitchen", "chef",
      "ice cream shop", "juice bar", "wine bar",
      "bakary", "bakerie", "resturant", "restraunt", "restaraunt", "resteraunt", "caffe", "catring",
    ],
    flags: ["business"],
    place: "the shop",
    details: [
      "flour dusting the backs of your hands",
      "the first tray cooling by the window",
      "a chalkboard menu in your handwriting",
      "the coffee machine gleaming on the counter",
      "a queue forming before you turn the sign",
      "the till drawer sliding shut",
    ],
    living: [
      fr("mo-food-venture-li1", "In before dawn, sleeves rolled, flour on your wrists. The ovens tick as they heat. When the first batch comes out, the whole street smells of it, and you breathe it in like a prize."),
      fr("mo-food-venture-li2", "A regular orders the usual without looking at the board, and you have started making it. You chat about the weather and their dog. It is the smallest exchange there is, and you love it."),
      fr("mo-food-venture-li3", "At closing you wipe the counter, count the till and turn the sign. Your hands smell of butter and coffee. You have never been happier to be this tired."),
    ],
    witness: [
      fr("mo-food-venture-wi1", "A customer takes one bite, closes their eyes and says it tastes like a holiday. You laugh and wrap another one for later, on the house, because it is your house to give from."),
      fr("mo-food-venture-wi2", "Someone who knew you before all this waits in the queue, grinning. When they reach the front, they say they always knew you would end up behind a counter like this one."),
    ],
  },
  {
    id: "creative-work",
    focus: "career",
    label: "Creative work: writing, music, art",
    keywords: [
      "a book", "my book", "first book", "my first book", "write a book", "writing a book", "writing my book", "book deal", "novel", "novelist", "memoir", "writer", "author",
      "published", "get published", "publish", "poetry", "poet", "screenplay", "album", "an album", "music", "musician",
      "songwriter", "my songs", "my band", "a band", "in a band", "art", "artist", "painting", "painter", "illustrator", "illustration", "exhibition",
      "gallery", "film", "filmmaker", "photography", "photographer", "ceramics", "pottery", "sculpture", "creative",
      "creativity", "design work", "designer", "singer", "dancer", "actor", "acting", "theatre", "theater", "comic",
      "novle", "writting", "auther", "artis", "musican", "photograper",
    ],
    flags: [],
    place: "the work table",
    details: [
      "a mug of pencils worn down to stubs",
      "pages pinned to the wall in a long row",
      "a pen left uncapped on a page of notes",
      "paint drying in thin ridges on the palette",
      "a guitar leaning against the radiator",
      "the first proof copy with its corners still sharp",
    ],
    living: [
      fr("mo-creative-work-li1", "You sit at the work table before checking anything and pick up where you left off. The first hour goes by like a minute. When you look up, the tea beside you is stone cold."),
      fr("mo-creative-work-li2", "A sentence, a phrase of melody, a stroke of colour lands exactly right, and you sit back and laugh out loud. Nobody else heard it. You did, and it carries you through the whole day."),
      fr("mo-creative-work-li3", "You finish a piece and set it where you can see it from across the room. You will fix things tomorrow. Tonight you just look at it, {name}, and let yourself feel {feeling}."),
    ],
    witness: [
      fr("mo-creative-work-wi1", "A stranger writes to say your work kept them company through a hard month. You read the message three times and then print it out, because some things deserve paper."),
      fr("mo-creative-work-wi2", "Someone who has watched you make things for years looks at the finished piece for a long time. Then they turn to you and say it is the best thing you have ever made."),
    ],
  },
  {
    id: "promotion",
    focus: "career",
    label: "Promotion or leadership",
    keywords: [
      "promotion", "promoted", "get promoted", "pay rise", "a raise", "get a raise", "salary increase",
      "become a manager", "a manager", "manager role", "management", "lead a team", "lead my team", "leading a team", "team lead", "team leader", "leadership", "head of",
      "director", "senior role", "executive", "partner at", "corner office", "career growth", "next level",
      "promtion", "promotoin", "promotian", "leadership role", "managment",
    ],
    flags: ["employer"],
    place: "the office",
    details: [
      "your name on the new nameplate",
      "a calendar full of meetings you chose",
      "the view from a higher floor",
      "a team photo pinned beside your screen",
      "the new pass clipped to your bag",
      "a handwritten note of congratulations on the desk",
    ],
    living: [
      fr("mo-promotion-li1", "You walk into the office and people look up the way they look up for someone whose opinion matters. You say good morning and start with the decision everyone has been waiting on."),
      fr("mo-promotion-li2", "In the meeting, the room turns to you for the final word. You take a breath, weigh it out loud and decide. The decision is yours to make, and it is a good one."),
      fr("mo-promotion-li3", "Before leaving, you write a short note thanking someone on your team by name. You know what that kind of note means. Someone once sent you one, and you kept it for years."),
    ],
    witness: [
      fr("mo-promotion-wi1", "Someone you used to report to stops by and says, without ceremony, that you were the obvious choice. After they leave you sit for a second and let the word obvious land."),
      fr("mo-promotion-wi2", "Someone newer on the team says they want to lead like you one day. You don’t know what to say at first. Then you tell them they can, and you mean every word."),
    ],
  },
  {
    id: "new-job",
    focus: "career",
    label: "New job or career change",
    keywords: [
      "new job", "a new job", "dream job", "a job", "job offer", "new role", "new position", "career change",
      "change careers", "changing careers", "switch careers", "new career", "first job", "better job", "remote job",
      "get hired", "hired", "job interview", "a job at", "job at", "full time job", "permanent job",
      "dreamjob", "dream jobb", "carrer", "carreer", "carrier change", "new carrer",
    ],
    flags: ["employer"],
    place: "the new building",
    details: [
      "a lanyard with your new name badge",
      "the welcome email still starred in your inbox",
      "a desk that is still almost empty",
      "a map of the building folded in your pocket",
      "a coffee from the place next door",
      "a notebook full of first-week questions",
    ],
    living: [
      fr("mo-new-job-li1", "You still have to check which entrance to use. You find it, tap your new pass and ride up with your new colleagues. Your stomach flutters in the good way."),
      fr("mo-new-job-li2", "Someone shows you around and you notice how much you already understand. The questions you would once have hidden, you ask out loud. People answer kindly. By lunch you have made your first small contribution."),
      fr("mo-new-job-li3", "On the way home you realise the old dread is gone. Tomorrow is just tomorrow. You are looking forward to work, {name}, a sentence you once thought belonged to other people."),
    ],
    witness: [
      fr("mo-new-job-wi1", "At the end of your first week, someone on the team says they are glad you joined. They say you already feel like part of the place. You carry that home like something warm."),
      fr("mo-new-job-wi2", "A friend who heard about the old job for years listens to you describe the new one and starts laughing. You sound different, they say. Lighter. You realise they are right."),
    ],
  },
  {
    id: "freelance",
    focus: "career",
    label: "Freelancing and clients",
    keywords: [
      "freelance", "freelancer", "freelancing", "go freelance", "self employed", "self-employed", "work for myself",
      "working for myself", "clients", "my clients", "client work", "contractor", "consultant", "consulting",
      "consultancy", "side hustle", "side business", "coaching business", "my own hours", "location independent",
      "commissions", "retainer", "retainers",
      "freelence", "freelanse", "free lance", "freelancr", "self employeed",
    ],
    flags: ["business"],
    place: "the desk by the window",
    details: [
      "a client folder labelled in your handwriting",
      "invoices marked paid in a neat column",
      "a calendar with your own hours blocked out",
      "a coffee going cold beside the keyboard",
      "a sticky note with your rate on it",
      "the laptop closed at four on purpose",
    ],
    living: [
      fr("mo-freelance-li1", "You start work when you choose, at the desk by the window, with a slow coffee. The first client email is a thank you. You file it in a folder called good days."),
      fr("mo-freelance-li2", "A new enquiry comes in and you quote your real rate without flinching. You press send and go to make lunch. When you come back, they have said yes without asking for a discount."),
      fr("mo-freelance-li3", "At four you close the laptop because the work is done and nobody can make you stay. You head out while it is still light. The freedom tastes like fresh air."),
    ],
    witness: [
      fr("mo-freelance-wi1", "A client writes that you are the easiest person they have ever worked with and asks if you have room for more. You read it twice, then raise your rate on the next quote, smiling."),
      fr("mo-freelance-wi2", "Someone who doubted the leap asks how you are doing, carefully, as if expecting bad news. You tell them about your week. They go quiet, then say they wish they had been that brave."),
    ],
  },
  {
    id: "study",
    focus: "career",
    label: "Exam, degree or course",
    keywords: [
      "exam", "exams", "pass my exam", "pass my exams", "degree", "my degree", "university", "uni", "college", "graduate",
      "graduating", "graduation", "masters", "master's", "master’s", "phd", "doctorate", "diploma", "qualification",
      "qualified", "certification", "certificate", "bar exam", "med school", "medical school", "law school", "nursing school",
      "scholarship", "thesis", "dissertation", "study", "studying", "a student", "student again", "a course", "fluent in", "become fluent",
      "exsam", "examz", "univercity", "universty", "colledge", "graduat", "scolarship", "disertation",
    ],
    flags: [],
    place: "the library",
    details: [
      "highlighters lined up by colour",
      "a stack of notes with dog-eared corners",
      "rows of desks under green lamps",
      "flashcards held together with a rubber band",
      "a timetable pinned above the desk",
      "a pen that has written a thousand pages",
    ],
    living: [
      fr("mo-study-li1", "You take your usual seat as the library opens, radiators still clanking. The material that once felt like a wall feels more like a map. You know where you are on it."),
      fr("mo-study-li2", "You explain a difficult idea to a classmate out loud and realise halfway through that you understand it completely. They nod, and you both laugh with relief. All those evenings went somewhere."),
      fr("mo-study-li3", "You close the book at the time you promised yourself and go home to rest. The knowledge stays where you put it. Tomorrow you will build on it, {name}, one page at a time."),
    ],
    witness: [
      fr("mo-study-wi1", "Someone who knew how hard you worked sends a message the moment they hear: so proud of you, never doubted it. You read it with your hand over your mouth and let yourself believe them."),
      fr("mo-study-wi2", "A tutor hands back your work and says, in front of everyone, that it is some of the best they have seen this year. You keep your face calm. Inside, the whole room lights up."),
    ],
  },

  /* ------------------------------------------------------------ money and place */
  {
    id: "debt-free",
    focus: "abundance",
    label: "Debt free",
    keywords: [
      "debt", "debts", "debt free", "debt-free", "no debt", "zero debt", "out of debt", "pay off", "paid off", "pay it off",
      "credit card", "credit cards", "loan", "loans", "student loan", "student loans", "car loan", "overdraft",
      "mortgage free", "mortgage-free", "owe nothing", "owing", "arrears", "bankruptcy", "clear my debt",
      "dept", "depts", "dept free", "det free", "debit free", "detb", "over draft",
    ],
    flags: [],
    place: "the kitchen table",
    details: [
      "a final statement showing a zero balance",
      "a shredder full of old letters",
      "an envelope you no longer dread opening",
      "a spreadsheet with every line finally closed",
      "an old card cut in half and kept as a souvenir",
      "a banking app you open without bracing",
    ],
    living: [
      fr("mo-debt-free-li1", "The post arrives and you open every envelope at the kitchen table without bracing. Nothing in there can frighten you. Then you sort it in two minutes and put the kettle on."),
      fr("mo-debt-free-li2", "You check your account the way you check the weather, briefly and without fear. What is there is yours, owed to nobody. You close the app and get on with your morning."),
      fr("mo-debt-free-li3", "You pay for something small with no mental arithmetic and no tightening in your chest. The cashier hands you the receipt and you fold it into your pocket, {name}, feeling {feeling}."),
    ],
    witness: [
      fr("mo-debt-free-wi1", "A friend who knew the whole story asks how things are with money. You tell them that you owe nothing to anyone. They put down their cup and hug you there in the café."),
      fr("mo-debt-free-wi2", "Someone who helped you through the worst of it hears the news and goes quiet on the phone. Then they say they are proud of you, and that they always believed you would get here."),
    ],
  },
  {
    id: "savings",
    focus: "abundance",
    label: "Savings, deposit or financial security",
    keywords: [
      "savings", "save money", "saving money", "save up", "saving up", "emergency fund", "nest egg", "rainy day fund",
      "house deposit", "a deposit", "down payment", "invest", "investing", "investments", "retirement", "pension",
      "financial freedom", "financially free", "financial security", "financially secure", "financially stable",
      "money in the bank", "six figures", "seven figures", "wealth", "wealthy", "rich", "abundance", "abundant",
      "more money", "passive income", "extra income", "my finances", "money",
      "savngs", "savigns", "finacial", "financal", "finanical", "abundence", "abudance", "welth",
    ],
    flags: [],
    place: "the bank",
    details: [
      "a savings balance with a comma in it",
      "a savings goal with its bar nearly full",
      "a folder labelled for the deposit",
      "a jar of coins on the shelf for small joys",
      "a statement you actually want to read",
      "a bill marked paid on the day it arrived",
    ],
    living: [
      fr("mo-savings-li1", "Payday arrives and the first thing that happens is the transfer to savings, automatic, no decision needed. You barely notice. The balance grows like a plant on the windowsill while you get on with life."),
      fr("mo-savings-li2", "The washing machine breaks, and for once it is just an annoyance. You pay for the repair from the fund you built for exactly this. Your heart rate doesn’t change. That steadiness took years."),
      fr("mo-savings-li3", "At the end of the month you look at the balance and let yourself really see it. Safety, built with your own hands, one small transfer at a time. You feel {feeling}, {name}."),
    ],
    witness: [
      fr("mo-savings-wi1", "When a friend is in a tight spot, you are able to help without it costing you sleep. They thank you again and again. You remember being on the other side of that call."),
      fr("mo-savings-wi2", "Someone you trust looks over your plans with you and says, a little surprised, that you are in a really good position. You nod. You know. You built it."),
    ],
  },
  {
    id: "home",
    focus: "abundance",
    label: "A home of your own",
    keywords: [
      "a home", "my home", "our home", "my own home", "own home", "home of my own", "new home", "dream home", "first home",
      "forever home", "buy a home", "buying a home", "a house", "my house", "own house", "buy a house", "buying a house",
      "dream house", "house of my own", "a flat", "my own flat", "apartment", "my own apartment", "condo", "my own place",
      "a place of my own", "cottage", "cabin", "farmhouse", "homeowner", "home owner", "a garden", "home by the sea",
      "appartment", "apartement", "apartament", "hous", "cottege",
    ],
    flags: ["home"],
    place: "your own place",
    details: [
      "a set of keys that are entirely yours",
      "boxes still labelled in thick black marker",
      "the first picture hung a little crooked",
      "morning light across a floor you chose",
      "your own front door with its new lock",
      "a plant on the windowsill exactly where you want it",
    ],
    living: [
      fr("mo-home-li1", "You close the front door behind you and the click sounds different. It is your door. You drop your keys in the bowl, kick off your shoes and smile at nothing."),
      fr("mo-home-li2", "You hang a picture on a wall that belongs to you. It is a little crooked. You leave it that way, {name}, because nobody can tell you otherwise."),
      fr("mo-home-li3", "On a slow morning you sit with a coffee in the room with the best light and plan nothing. The rooms tick and settle around you like something breathing. You are home, all the way."),
    ],
    witness: [
      fr("mo-home-wi1", "Your first guest pauses in the doorway, looks around and says it already feels like you. You make them tea in your own kitchen and give them the good chair, delighted."),
      fr("mo-home-wi2", "A friend carrying in the last box stops and says, quietly, that you did it. You look around at the light and the boxes and your own front door, and nod."),
    ],
  },
  {
    id: "relocation",
    focus: "peace",
    label: "Relocation, new city or country",
    keywords: [
      "move to", "moving to", "move abroad", "moving abroad", "live abroad", "living abroad", "relocate", "relocating",
      "relocation", "emigrate", "emigrating", "immigrate", "new country", "new city", "move overseas", "start over",
      "fresh start", "visa", "green card", "residency", "citizenship", "expat", "by the sea", "by the ocean", "near the sea",
      "near the beach", "seaside", "the coast", "countryside", "move to the country", "the mountains",
      "relocte", "reloacte", "emmigrate", "imigrate", "abroard", "oversea",
    ],
    flags: ["relocation", "home"],
    place: "the new city",
    details: [
      "a street name you can finally pronounce",
      "a café where they already know your order",
      "streetlights in a colour you are still getting used to",
      "a map with your favourite places circled",
      "a travel card in an unfamiliar colour",
      "a window onto rooftops you are still learning",
    ],
    living: [
      fr("mo-relocation-li1", "At the corner bakery you order the local way, a little clumsily, and get exactly what you wanted. The person behind the counter smiles. Small wins like this make a place yours."),
      fr("mo-relocation-li2", "You take a new route home on purpose, to know the city better. A square you hadn’t seen. A tree full of noisy birds. Nobody here is in a hurry, least of all you."),
      fr("mo-relocation-li3", "In the evening you open the window to the sounds of the new place: unfamiliar voices, a scooter, someone practising the trumpet badly. You chose this, {name}. You feel {feeling}."),
    ],
    witness: [
      fr("mo-relocation-wi1", "A neighbour on the stairs asks how you are settling in, then invites you to a gathering in the courtyard. You say yes, and belong here a little more already."),
      fr("mo-relocation-wi2", "On a video call an old friend asks what the light is like there. You turn the camera to the window. They go quiet, then say the place suits you."),
    ],
  },
  {
    id: "travel",
    focus: "abundance",
    label: "Travel",
    keywords: [
      "travel", "travelling", "traveling", "travel the world", "see the world", "around the world", "world trip", "a trip",
      "road trip", "holiday", "holidays", "vacation", "backpacking", "backpack", "explore the world", "adventure",
      "adventures", "gap year", "sabbatical", "digital nomad", "passport", "visit japan", "visit italy", "visit paris",
      "travle", "travell", "vacaction", "vaccation", "holliday", "backpacing",
    ],
    flags: [],
    place: "the departure gate",
    details: [
      "a passport with fresh stamps",
      "a backpack packed and repacked",
      "a boarding pass tucked into a paperback",
      "signs in a language you don’t speak yet",
      "a window seat over unfamiliar rooftops",
      "a paper map gone soft at the creases",
    ],
    living: [
      fr("mo-travel-li1", "You step out of the station into warm air and a language you don’t speak, and you laugh out loud. You made it. Everything smells different, of heat and coffee and somewhere new."),
      fr("mo-travel-li2", "You sit at a café table on a street whose name you can’t pronounce and watch the world go by. Nobody here knows you. You are exactly where you said you would be."),
      fr("mo-travel-li3", "At the end of a long day exploring, your face hurts from smiling. Before sleep you write three lines in the travel notebook, {name}, so you never forget this one."),
    ],
    witness: [
      fr("mo-travel-wi1", "A stranger at the next table asks where you are from and how long you are staying. When you tell them, they say you have chosen well. You raise your cup to them, feeling {feeling}."),
      fr("mo-travel-wi2", "Back home, a friend flicks through your photos and stops on one of you mid-laugh under a foreign sky. They say they have never seen you look so free. You decide to frame that one."),
    ],
  },

  /* ------------------------------------------------------------ people */
  {
    id: "partner",
    focus: "love",
    label: "Partner",
    keywords: [
      "a partner", "my partner", "life partner", "loving partner", "romantic partner", "soulmate", "soul mate",
      "in a relationship", "a loving relationship", "a romantic relationship", "a happy relationship",
      "boyfriend", "girlfriend", "husband", "wife", "spouse", "find the one", "meet the one", "my person", "love of my life", "someone to love",
      "fall in love", "falling in love", "find love", "finding love", "true love", "romance", "romantic", "dating", "on dates",
      "go on dates", "first date", "lover",
      "significant other", "twin flame", "a man", "a woman",
      "soulmat", "sole mate", "boyfreind", "girlfreind", "relationsip", "realtionship", "husbund", "partener",
    ],
    flags: ["romance"],
    place: "the kitchen",
    details: [
      "two cups on the counter",
      "a coat that isn’t yours on the hook",
      "a note left by the kettle",
      "a second toothbrush in the glass",
      "two pairs of shoes by the door",
      "the rumpled other side of the bed",
    ],
    living: [
      fr("mo-partner-li1", "Someone who loves you hands you a cup made how you like it, without asking. You lean against each other at the counter, barely talking. It is the best part of the morning."),
      fr("mo-partner-li2", "You come home to music in the kitchen and someone singing along badly. They look up and smile as if you are the day’s good news. You put your bag down and join in."),
      fr("mo-partner-li3", "On an ordinary evening you sit close on the sofa, each reading your own book. Every so often one of you reads a line out loud. You feel {feeling}, {name}, and entirely at home."),
    ],
    witness: [
      fr("mo-partner-wi1", "A friend watches the two of you laughing at a private joke and catches your eye. Later they say it is lovely to see you this happy. You know it is true."),
      fr("mo-partner-wi2", "After meeting your person properly, your closest friend says they get it, that the two of you make sense. You walk home hand in hand, replaying it, grinning in the dark."),
    ],
  },
  {
    id: "wedding",
    focus: "love",
    label: "Wedding or engagement",
    keywords: [
      "wedding", "my wedding", "dream wedding", "married", "get married", "getting married", "marry", "marriage",
      "engaged", "get engaged", "engagement", "proposal", "propose", "fiance", "fiancé", "fiancee", "fiancée", "bride",
      "groom", "honeymoon", "vows", "elope", "eloping", "wedding day",
      "weding", "wedidng", "marrige", "marraige", "maried", "engagment", "fiancey",
    ],
    flags: ["romance"],
    place: "the venue",
    details: [
      "a ring catching the light on your hand",
      "place cards in careful handwriting",
      "flowers crowding every table",
      "a seating plan covered in crossings-out",
      "shoes you will dance out of by midnight",
      "a guest list taped to the fridge",
    ],
    living: [
      fr("mo-wedding-li1", "You catch the light on your ring while doing something ordinary, like rinsing a cup, and stop for a second. It still surprises you. You turn your hand in the sun and smile at it."),
      fr("mo-wedding-li2", "You sit together at the table with the seating plan spread out, gently arguing about who sits where. It is the least romantic job in the world, and you are both laughing."),
      fr("mo-wedding-li3", "At the venue the music starts and the room turns toward you. Every face you love is there. You take a breath, {name}, and make your way toward the person waiting for you."),
    ],
    witness: [
      fr("mo-wedding-wi1", "An old friend finds you in a quiet corner and says they have never seen you look so sure of anything. You hug them hard. Over their shoulder, the dance floor is full."),
      fr("mo-wedding-wi2", "Someone who has known you all your life raises a glass and talks about who you have become. Their voice wobbles at the end. The whole room is listening. So are you."),
    ],
  },
  {
    id: "family",
    focus: "love",
    label: "Family or a baby",
    keywords: [
      "a baby", "babies", "have a baby", "having a baby", "pregnant", "pregnancy", "conceive", "fertility", "ivf",
      "become a mum", "become a mom", "become a dad", "become a parent", "becoming a parent", "be a parent", "parenthood",
      "motherhood", "fatherhood", "a child", "my children", "my kids", "our kids", "have kids", "have children",
      "having kids", "having children", "kids of my own", "children of my own", "a son", "a daughter",
      "adopt a child", "adopting a child", "adoption", "foster a child", "fostering", "start a family", "starting a family", "a family", "family of my own",
      "my own family", "growing family", "big family", "happy family", "newborn", "toddler",
      "pregant", "pregnent", "familly", "childern", "adoptoin",
    ],
    flags: ["family", "children"],
    place: "the living room",
    details: [
      "a small pair of shoes by the door",
      "a high chair pulled up to the table",
      "crayon drawings stuck to the fridge",
      "a night light glowing in the hallway",
      "a tiny sock lost under the sofa",
      "someone small asleep on the sofa",
    ],
    living: [
      fr("mo-family-li1", "Small footsteps come down the hallway before your alarm, and a warm, sleepy person climbs into your lap. You breathe in the smell of their hair. The day can wait a minute."),
      fr("mo-family-li2", "The living room is a mess of toys and blankets, and you don’t mind. Someone small is building a tower and narrating it seriously. You sit on the floor to help, {name}, feeling {feeling}."),
      fr("mo-family-li3", "At dinner the table is loud with talk and spilled water and someone refusing peas. You catch the eye of the person beside you and laugh. This noise is what you used to wish for."),
    ],
    witness: [
      fr("mo-family-wi1", "An old friend visits and watches you with the little one for a while, then says you are a natural. You wave it away. They say it again, slower, until you hear it."),
      fr("mo-family-wi2", "A neighbour stops you in the street to admire the small person with you and says they have never seen such a happy pair. You walk on glowing, holding on a little tighter."),
    ],
  },
  {
    id: "family-repair",
    focus: "love",
    label: "Family repair",
    keywords: [
      "reconnect", "reconnecting", "reconcile", "reconciliation", "estranged", "make peace with", "make up with",
      "mend", "mending", "repair", "forgive", "forgiveness", "back in touch", "speaking again", "talking again",
      "my mum", "my mom", "my mother", "my dad", "my father", "my parents", "my brother", "my sister", "my siblings",
      "with my family", "close to my family", "closer to my family", "relationship with my family", "relationship with my mum",
      "relationship with my mom", "relationship with my mother", "relationship with my dad", "relationship with my father",
      "relationship with my parents", "relationship with my brother", "relationship with my sister",
      "reconect", "reconsile", "estrainged", "forgivness", "familiy",
    ],
    flags: ["family"],
    place: "the doorstep",
    details: [
      "a name back in your recent calls",
      "an old photo back on the shelf",
      "two mugs out for a visit after years",
      "a birthday card propped on the shelf",
      "a message that starts with your old nickname",
      "a gate you haven’t opened in years",
    ],
    living: [
      fr("mo-family-repair-li1", "The phone rings and the name on the screen is one you weren’t sure you would see again. You pick up. The conversation is awkward and completely real. Afterwards you sit holding the phone."),
      fr("mo-family-repair-li2", "You wait on the doorstep with something you baked, heart going fast. The door opens. There is a pause, then a smile you haven’t seen in years. The kettle goes on."),
      fr("mo-family-repair-li3", "Over a long, ordinary lunch you laugh at an old family joke, and nobody has to pretend. Some of the old ache is still there. So is the warmth, {name}, and the warmth is louder."),
    ],
    witness: [
      fr("mo-family-repair-wi1", "Someone else in the family pulls you aside and says everyone feels lighter since you two started talking again. You didn’t know anyone had noticed. You carry that carefully all the way home."),
      fr("mo-family-repair-wi2", "A friend who heard about the silence for years listens to you describe the visit and has to look away for a moment. Then they say they are so glad, and squeeze your hand."),
    ],
  },
  {
    id: "friendship",
    focus: "love",
    label: "Friendship or community",
    keywords: [
      "friend", "friends", "new friends", "best friend", "close friends", "real friends", "friendship", "friendships",
      "community", "my people", "my tribe", "a tribe", "chosen family", "found family", "belong", "belonging",
      "social life", "social circle", "a circle", "less lonely", "lonely", "loneliness", "connection", "neighbours",
      "neighbors",
      "freinds", "frends", "freind", "friendsip", "comunity", "communtiy",
    ],
    flags: ["friendship"],
    place: "the corner table",
    details: [
      "a group chat buzzing with plans",
      "a spare chair pulled up without asking",
      "a photo strip from a night out, stuck to the fridge",
      "an invitation on the fridge, weeks ahead",
      "coats piled high on someone’s bed at a party",
      "a reserved sign on the corner table",
    ],
    living: [
      fr("mo-friendship-li1", "Your phone buzzes with the group chat: plans for the weekend, a terrible photo, someone asking if you are coming. Of course you are. You reply with a joke and three people laugh at it."),
      fr("mo-friendship-li2", "At the corner table someone pulls up a chair before your coat is off. The talk goes on for hours. At one point you laugh so hard you have to put your drink down."),
      fr("mo-friendship-li3", "On the way home your cheeks ache from smiling. You feel known, {name}, by people who chose you back. That feeling stays with you all the way to your door."),
    ],
    witness: [
      fr("mo-friendship-wi1", "A friend raises a glass at dinner and says the group was never quite complete until you came along. Everyone cheers. You go red, and you let yourself enjoy every second of it."),
      fr("mo-friendship-wi2", "Someone new to the group tells you that you made them feel welcome from the first night. You remember being new. You remember who did that for you, and you feel {feeling}."),
    ],
  },

  /* ------------------------------------------------------------ body and rest */
  {
    id: "running",
    focus: "health",
    label: "Running or a race",
    keywords: [
      "marathon", "half marathon", "a marathon", "ultra", "ultramarathon", "5k", "10k", "a 5k", "a 10k", "parkrun",
      "couch to 5k", "a race", "my first race", "runner", "a runner", "go running", "start running", "running again",
      "run a marathon", "run a half", "run a 5k", "run a 10k", "run every day", "run every morning", "jogging", "jog",
      "trail running", "triathlon",
      "marathan", "marthon", "maraton", "half marathan", "runnner", "joging",
    ],
    flags: [],
    place: "the park",
    details: [
      "shoes by the door with the laces loose",
      "a gravel path curving out of sight",
      "breath clouding in the cold air",
      "a race number pinned to your shirt",
      "a medal hanging on a hook by the door",
      "dew on the grass at the edge of the path",
    ],
    living: [
      fr("mo-running-li1", "Your feet find their rhythm on the park path while the city is still waking. Easy, steady, unhurried. Your breath keeps perfect time, and the distance goes by like conversation."),
      fr("mo-running-li2", "You reach the hill that used to stop you and keep going, shortening your stride the way you learned. At the top you don’t stop. You smile and carry on."),
      fr("mo-running-li3", "After the run you stretch on the grass, cheeks hot, legs humming. A dog trots over to inspect you. You laugh and scratch its ears, feeling {feeling}, {name}, and wonderfully alive."),
    ],
    witness: [
      fr("mo-running-wi1", "A runner coming the other way lifts a hand as you pass, the small salute of people who are out early. You lift yours back. You belong to that club, {name}."),
      fr("mo-running-wi2", "A neighbour watching you jog back up the street calls out that you make it look easy. You laugh, breathless, and wave. You decide to believe them."),
    ],
  },
  {
    id: "strength",
    focus: "health",
    label: "Strength and fitness",
    keywords: [
      "strong body", "feel strong", "feels strong", "be strong", "get strong", "physically strong", "stronger body",
      "get stronger", "strength", "get fit", "be fit", "fitter", "fitness", "fit and healthy", "in shape", "get in shape",
      "gym", "the gym", "lifting", "weightlifting", "weights", "powerlifting", "deadlift", "muscle", "muscles",
      "pull up", "pull-up", "push up", "push-up", "work out", "workout", "working out", "exercise", "athletic", "pilates",
      "yoga", "crossfit", "swim", "swimming", "rock climbing", "bouldering",
      "strenght", "streng", "excercise", "exersise", "fitnes", "work-out",
    ],
    flags: [],
    place: "the gym",
    details: [
      "chalk on your palms",
      "plates stacked neatly by the rack",
      "a training log with the numbers climbing",
      "a water bottle covered in stickers",
      "a foam roller by the sofa",
      "a gym bag packed by the door",
    ],
    living: [
      fr("mo-strength-li1", "You arrive at the gym knowing exactly what you are there to do. Warm-up, first set, rest. Your body answers every ask with a quiet confidence you never used to feel here."),
      fr("mo-strength-li2", "You lift something today that you couldn’t have lifted a year ago, and you do it cleanly. You set it down and laugh, alone in the corner. Strength feels a lot like joy."),
      fr("mo-strength-li3", "Carrying the shopping up the hill, you notice it is easy. Your arms are strong, your back is steady, your breathing barely changes. You feel {feeling}, {name}, built for your own life."),
    ],
    witness: [
      fr("mo-strength-wi1", "Someone at the gym asks you to show them how you do a lift, because your form is so good. You show them patiently, remembering when you were too nervous to ask anyone."),
      fr("mo-strength-wi2", "A friend helping you move watches you pick up one end of the sofa without a second thought. They raise an eyebrow and say you have got strong. You grin and lift your end higher."),
    ],
  },
  {
    id: "healing",
    focus: "health",
    label: "Healing or recovery",
    keywords: [
      "heal", "healing", "healed", "recover", "recovery", "recovering", "recover from", "get better",
      "getting better", "get well", "well again", "healthy again", "pain free", "pain-free", "without pain", "chronic pain",
      "chronic illness", "illness", "injury", "surgery", "rehab", "rehabilitation", "physio", "physiotherapy", "remission",
      "burnout", "back pain", "my back", "my knee", "my health back", "feel well",
      "heeling", "healling", "recovry", "recoverey", "rehabilitaion", "surgury", "injurie",
    ],
    flags: [],
    place: "the garden",
    details: [
      "a mug of tea held in steady hands",
      "sunlight warming your face through the glass",
      "a calendar filling up with plans again",
      "a ticket stub from the first day out in months",
      "an appointment card with a long gap before the next one",
      "fresh flowers on the kitchen table",
    ],
    living: [
      fr("mo-healing-li1", "You sit in the garden with your face to the sun and notice that nothing hurts the way it used to. You don’t make a fuss. You close your eyes and let the warmth in."),
      fr("mo-healing-li2", "You say yes to a whole afternoon out with friends, and you trust your body to come along. It does. Coming home tired and happy, you realise you didn’t think about it once."),
      fr("mo-healing-li3", "On a slow evening you write down what your body did today, the way you once listed what it couldn’t. The list is long. You read it twice, {name}, feeling {feeling}."),
    ],
    witness: [
      fr("mo-healing-wi1", "Someone who sat with you through the hardest weeks sees you laughing across the room and has to look away for a second. Later they tell you how good it is to have you back."),
      fr("mo-healing-wi2", "The person who has guided your recovery reads through your notes, sits back and says you have worked so hard for this. You leave light-headed with pride, holding the door for the next person."),
    ],
  },
  {
    id: "sleep",
    focus: "health",
    label: "Sleep and rest",
    keywords: [
      "sleep", "sleeping", "asleep", "sleep better", "better sleep", "sleep well", "deep sleep", "good sleep",
      "sleep through the night", "a full night", "good night's sleep", "good night’s sleep", "insomnia", "rested",
      "well rested", "well-rested", "wake up rested", "waking up rested", "wake rested", "more rest", "rest more",
      "proper rest", "less tired", "not tired", "exhausted", "exhaustion", "bedtime", "nap",
      "insomina", "insomia", "sleap", "sleeep", "slepp", "restfull",
    ],
    flags: [],
    place: "the bedroom",
    details: [
      "cool sheets turned down at a sensible hour",
      "a phone charging in another room",
      "curtains drawn against the street lights",
      "a book left open on the pillow",
      "the soft glow of a lamp turned low",
      "daylight behind the curtains instead of an alarm",
    ],
    living: [
      fr("mo-sleep-li1", "You get into bed when you meant to. The sheets are cool and clean. You read two pages and switch off the lamp. Sleep comes like a friend arriving on time."),
      fr("mo-sleep-li2", "You wake before the alarm, rested to the bone, the room already grey with light. For a moment you lie there, enjoying the feeling. Then you stretch slowly and get up."),
      fr("mo-sleep-li3", "The phone charges in the hallway, the window is open a crack and the street outside is quiet. You breathe out, long and slow, and drift off feeling {feeling}, {name}."),
    ],
    witness: [
      fr("mo-sleep-wi1", "Someone at breakfast looks at you over their coffee and says you seem so rested these days. You smile. You haven’t woken at three in weeks, and you can feel it everywhere."),
      fr("mo-sleep-wi2", "A friend asks what your secret is, because you have so much energy lately. You tell them, a bit sheepishly, that you just go to bed. They laugh, and then they ask how."),
    ],
  },

  /* ------------------------------------------------------------ self */
  {
    id: "visibility",
    focus: "confidence",
    label: "Public speaking or being seen",
    keywords: [
      "public speaking", "speak in public", "speaking in public", "give a talk", "giving talks", "ted talk", "keynote",
      "speaker", "a speech", "give a speech", "presentation", "presentations", "present at", "on stage", "the stage",
      "audience", "on camera", "be seen", "being seen", "visible", "visibility", "content creator", "creator",
      "influencer", "followers", "social media", "post online", "known for", "recognised", "recognized", "famous",
      "spotlight", "performing", "perform on stage", "podcast", "my voice", "be heard",
      "public speeking", "speach", "presentaion", "presentasion", "audiance", "influenser",
    ],
    flags: [],
    place: "the stage",
    details: [
      "a microphone waiting on its stand",
      "notes in your pocket you barely need",
      "rows of faces turned toward you",
      "a glass of water waiting on the lectern",
      "your name printed in the programme",
      "hands going up across the room",
    ],
    living: [
      fr("mo-visibility-li1", "You take the stage and the lights are warm on your face. You find one friendly face in the second row and begin. Your voice comes out steady and clear, and entirely yours."),
      fr("mo-visibility-li2", "You post something you made with your name on it, no apology, no hiding. People respond. You don’t check the numbers every five minutes. You already said what you came to say."),
      fr("mo-visibility-li3", "Halfway through your talk you pause for a laugh, and it comes. The whole room relaxes with you. You feel {feeling}, {name}, and completely at home in front of all these people."),
    ],
    witness: [
      fr("mo-visibility-wi1", "After the talk, a stranger finds you by the coffee and says your words were exactly what they needed today. You thank them, a little stunned, and keep that sentence with you all week."),
      fr("mo-visibility-wi2", "Someone who knew you when you hid at the back of every room watches you on stage. Afterwards they send one line: who is this person, and where have they been?"),
    ],
  },
  {
    id: "work-confidence",
    focus: "confidence",
    label: "Confidence at work",
    keywords: [
      "confident at work", "confidence at work", "speak up", "speaking up", "speak up in meetings", "in meetings",
      "meetings", "at work", "my boss", "my manager", "my colleagues", "colleagues", "coworkers", "co-workers",
      "workplace", "the office", "my team", "imposter syndrome", "impostor syndrome", "imposter", "impostor",
      "negotiate", "negotiating", "negotiation", "ask for a raise", "assertive", "assertiveness", "set boundaries at work",
      "say no at work", "professional confidence",
      "confidant at work", "imposter sydrome", "imposter syndrom", "colleages", "colegues", "asertive", "negociate",
    ],
    flags: ["employer"],
    place: "the meeting room",
    details: [
      "a seat in the middle of the table",
      "notes with your own points underlined",
      "an email sent without three rereads",
      "a calendar invite with your name as organiser",
      "the coffee you carried into the meeting",
      "a raised hand that doesn’t shake",
    ],
    living: [
      fr("mo-work-confidence-li1", "In the meeting room you take the seat in the middle of the table, set your notes down and wait for your moment. When it comes, you speak plainly, and people turn to listen."),
      fr("mo-work-confidence-li2", "Your manager asks what you think, and you tell them, with reasons, without softening it into nothing. They nod and adjust the plan. You go back to your desk feeling {feeling}."),
      fr("mo-work-confidence-li3", "You disagree with a colleague’s idea and say so, kindly and clearly. The conversation that follows is better for it. Afterwards they thank you for pushing back. You walk out taller, {name}."),
    ],
    witness: [
      fr("mo-work-confidence-wi1", "A colleague catches you after the meeting to say they love how you handled that question, calm and clear. You thank them without deflecting. You know exactly what they mean."),
      fr("mo-work-confidence-wi2", "In your review, the feedback says people rely on you to say the true thing in the room. You read that sentence three times and save a copy somewhere you will find it again."),
    ],
  },
  {
    id: "calm-mind",
    focus: "peace",
    label: "Calm mind",
    keywords: [
      "calm", "calmer", "calm mind", "a calm mind", "peace of mind", "inner peace", "peaceful mind", "quiet mind",
      "anxiety", "anxious", "less anxious", "anxiety free", "anxiety-free", "stress", "stressed", "less stress",
      "stress free", "stress-free", "overthinking", "overthink", "stop overthinking", "worry", "worrying", "worry less",
      "panic", "panic attacks", "mental health", "mindful", "mindfulness", "meditation", "meditate", "serenity", "serene",
      "zen", "relaxed", "relax", "unbothered", "grounded", "centered", "centred", "at ease", "nervous system",
      "anxeity", "anxity", "anxiaty", "stres", "over thinking", "overthiking", "meditaion", "calmn",
    ],
    flags: [],
    place: "the reading chair",
    details: [
      "a cup of tea going cool in your hands",
      "a window left open to the birds",
      "a notebook of worries written down and closed",
      "a candle burning low on the table",
      "a phone face down on the table",
      "an empty street before anyone is up",
    ],
    living: [
      fr("mo-calm-mind-li1", "You settle into the reading chair with your tea, and your mind settles with you. A thought drifts by. You watch it go like a boat on a river, and take another sip."),
      fr("mo-calm-mind-li2", "Something small goes wrong and you feel the old surge start in your chest. You breathe out slowly, name what you can do, and do it. The surge fades. Four minutes, and you are back."),
      fr("mo-calm-mind-li3", "You lie down at night and your thoughts lie down with you. No midnight replays, no lists. Just the dark, the quiet and your breathing. You feel {feeling}, {name}, and you sleep."),
    ],
    witness: [
      fr("mo-calm-mind-wi1", "A friend calls in a panic, and halfway through they say your voice is making them calmer. You smile into the phone. You remember needing a voice like that."),
      fr("mo-calm-mind-wi2", "Someone close mentions that you seem so peaceful these days, as if something heavy has been set down. You realise it has. You set it down yourself."),
    ],
  },
];
