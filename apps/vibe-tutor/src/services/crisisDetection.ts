/**
 * Code-level crisis safety backstop for the Vibe Tutor AND Vibe Buddy chats.
 *
 * Child-safety guardrails must NOT depend solely on the LLM following its
 * system prompt — the model can be swapped to a weaker free fallback, the
 * system prompt can be dropped, or the network can fail. This module detects
 * crisis language in the child's own message and returns a fixed, supportive
 * response with real help resources, independent of any model output.
 *
 * SCOPE & LIMITATION (important): this is a deterministic FLOOR for the
 * clearest, highest-confidence signals — NOT a complete classifier. Adversarial
 * red-teaming confirmed that a child can disclose self-harm or abuse in
 * countless indirect ways that no finite pattern set will catch ("i already
 * wrote the note", "he puts his hands under my clothes", somatic fear like
 * "my hands are shaking as he comes up the stairs"). The real safety net is the
 * LLM's own safety behaviour on the online path plus human systems (trusted
 * adults, 988). For production, an ML/LLM safety classifier should run on the
 * online path with this regex as the offline/last-resort floor.
 *
 * Precision bias: we lean toward catching real disclosures over avoiding the
 * occasional benign match — BUT never at the cost of obviously-wrong fires like
 * video-game combat ("the boss hits me", "want to die every time I lose"). Bare
 * verbs ("hits me", "beats me") require a caregiver/family subject; bare "die"
 * and "safe at home" never fire on their own.
 */

export type CrisisCategory = 'self-harm' | 'abuse';

interface CrisisRule {
  category: CrisisCategory;
  patterns: RegExp[];
}

const CRISIS_RULES: CrisisRule[] = [
  {
    category: 'self-harm',
    patterns: [
      // Explicit intent
      /\bkill(ing)?\s+myself\b/,
      /\bend(ing)?\s+my\s+life\b/,
      // "want to die" but NOT hyperbole ("die of boredom", "die every time i lose").
      /\b(want|wanna|going|gonna|need|ready|about)\s+to\s+die\b(?!\s+(of|from|for|laughing|when|if|every|each|any|in\s+the\s+game))/,
      /\bwish\s+(i\s+)?(was|were|wasn'?t|weren'?t)\s+(dead|alive|here|born)\b/,
      /\bwish\s+i\s+(could\s+)?(die|disappear)\b/,
      /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up|be\s+here|exist)\b/,
      /\bno\s+(reason|point)\s+(to|in)\s+(live|living|life|be(ing)?\s+here|go\s+on|going\s+on)\b/,
      /\bpoint\s+(of|in)\s+(anything|it\s+all|living|life|going\s+on|even\s+trying)\b/,
      /\bsuicid(e|al)\b/,
      // Self-harm / cutting
      /\b(hurt|harm|cut|cutting|hurting|harming|kill)\s+myself\b/,
      /\b(been\s+)?cutting\s+(again|myself|my\s+(wrists?|arms?|legs?|skin|thighs?))\b/,
      /\b(leaving|left|make|making|made|been\s+making)\s+(little\s+|small\s+|some\s+)?(cuts?|marks?)\s+(on\s+)?(my\s+)?(thighs?|arms?|wrists?|legs?|skin|hips?)\b/,
      /\bself[\s-]?harm(ing)?\b/,
      // "better off / they don't need me / nobody would care"
      /\bbetter\s+off\s+(dead|without\s+me|if\s+i\s+(was|were|wasn'?t|weren'?t)\s+(dead|gone|not\s+here|around|born|alive|here))\b/,
      /\b(everyone|everybody|they|world|people|my\s+family)\b.{0,45}\b(better\s+off|happier|easier|be\s+easier|spinning\s+fine|fine)\b.{0,35}\b(without\s+me|if\s+i\s+(was|were|wasn'?t|weren'?t)\s+(here|around|gone|dead|in\s+them|born))\b/,
      /\b(if\s+i\s+(died|was\s+gone|wasn'?t\s+here|disappeared|killed\s+myself))\b.{0,45}\b(nobody|no\s+one|wouldn'?t\s+(matter|care|notice))\b/,
      /\b(nobody|no\s+one|no-?one)\s+would\s+(even\s+)?(care|notice|miss\s+me)\b/,
      // Stop / end it / hopeless / expected death
      /\bwant\s+it\s+(all\s+)?to\s+stop\b/,
      /\b(want|wanna|going|gonna)\s+to\s+end\s+(it\s+all|my\s+life|myself)\b/,
      /\bthink(ing)?\s+about\s+(ending\s+it|killing\s+myself|suicide|not\s+being\s+here|dying)\b/,
      /\btired\s+of\s+(being\s+alive|living|life|it\s+all)\b/,
      /\b(never\s+wake\s+up|sleep\s+forever|(fall\s+asleep|go\s+to\s+sleep)\s+(forever|and\s+never\s+wake|and\s+not\s+wake))\b/,
      /\b(want|wanna)\s+to\s+disappear\b/,
      /\bwanna\s+disappear\b/,
      /\bdisappear\s+and\s+never\s+come\s+back\b/,
      /\b(won'?t|wont|not\s+gonna)\s+be\s+(around|here)\s+(much\s+longer|for\s+(much\s+)?long|anymore)\b/,
      // Method / planning
      /\b(saving|stockpil\w+|hoarding|hiding|collecting|been\s+saving)\b.{0,20}\b(pills|meds|medication|tablets)\b/,
      /\bhow\s+many\s+(pills|tablets|meds)\b.{0,25}\b(it\s+takes|to\s+(die|od|overdose|kill|end))\b/,
      /\blooked\s+up\s+how\s+(many\s+(pills|tablets)|to\s+(die|kill|hang|od|overdose))\b/,
      /\bwho\s+gets\s+my\s+(stuff|things|belongings)\s+(after|when)\s+i'?m\s+(gone|not\s+here)\b/,
      /\bwrote\s+(a\s+|my\s+|the\s+)?(suicide\s+)?note\b.{0,40}\b(decided\s+when|when\s+(to|i)|before\s+i)\b/,
      /\bsuicide\s+note\b/,
      /\b(step(ping)?|walk(ing)?|jump(ing)?|run(ning)?)\s+(in\s?to|in\s+front\s+of)\s+(traffic|the\s+road|a\s+(car|bus|train)|the\s+(highway|freeway))\b/,
    ],
  },
  {
    category: 'abuse',
    patterns: [
      /\b(being|getting|been|was|i'?m)\s+abused\b/,
      /\b(physical|sexual|verbal)(ly)?\s+abus(e|ed|ing)\b/,
      /\bsomeone\s+(is\s+|keeps\s+)?(hurt(ing|s)?|hit(ting|s)?|touch(ing|es|ed)?|beat(ing|s)?)\s+me\b/,
      // Physical assault — REQUIRES a caregiver/family subject (bare "hits me" was
      // dropped: it fired on "the boss hits me" / "the enemy hits me").
      /\b(he|she|they|dad|mom|mum|mother|father|stepdad|stepmom|stepfather|uncle|aunt|grandpa|grandad|my\s+\w+)\s+(hits|hit|hurts|punches|punched|slaps|slapped|chokes|choked|kicks|kicked|whips|whipped|burns|burned|beats?|beaten)\s+me\b/,
      /\bbeat(s|en)?\s+me\s+(up|black\s+and\s+blue|senseless)\b/,
      /\b(is\s+)?(gonna|going\s+to|will|might|about\s+to)\s+hurt\s+me\b/,
      /\bleaves?\s+(bruises|marks|welts)\b/,
      // Injury descriptions (assault indicators only — swollen/bleeding dropped to
      // avoid allergy/sports fires; black eye/lip require an assault context).
      /\bmy\s+(arm|face|eye|lip|head|back|leg|wrist|neck|jaw|nose|rib)\s+(is|was|got|are)\s+(all\s+)?(purple|bruised|black|split\s+open|busted)\b/,
      /\b(have|got|has|had)\s+a\s+black\s+eye\b.{0,30}\b(from\s+(last\s+night|him|her|my|dad|mom)|because|but\s+(i\s+)?told|cover)\b/,
      /\bsplit\s+my\s+lip\s+open\b/,
      /\bgrab(bed|s)?\s+me\s+by\s+(the|my)\s+(hair|neck|throat|arm|wrist|face)\b/,
      /\bslam(med|s|ming)?\s+(my\s+)?(head|face)\s+(in\s?to|against|on)\s+(the\s+)?(wall|floor|table|door|ground)\b/,
      /\b(threw|throws|thrown|chucked|hurled)\s+(the|a|his|her|it|stuff|things)\b.{0,20}\bat\s+my\s+(head|face)\b/,
      /\b(threw|throws|throwing)\s+me\s+(across|into|down|against|at\s+the|on\s+the|to\s+the)\b/,
      /\block(s|ed|ing)?\s+me\s+(in|out|outside|up)\b/,
      /\b(use[sd]?|hit(s|ting)?\s+me\s+with|beat(s|ing)?\s+me\s+with|whip(s|ped|ping)?\s+(me\s+)?with)\s+(his|her|a|the)?\s*(belt|cord|extension\s+cord|hanger|shoe|stick|fist)\b/,
      // Sexual abuse — includes non-"touch" verbs the red-team surfaced.
      /\b(touch(ed|es|ing)?|grab(bed|s)?)\s+me\s+(in|where|down\s+there|somewhere|inappropriately|in\s+my\s+privates?)\b/,
      /\btouch(ed|es|ing)?\s+me\s+(in\s+a\s+)?(bad|weird|wrong|creepy|private|funny)\s+(way|place|spot)\b/,
      /\btouch(ed|es|ing)?\s+(me\s+)?(where\s+)?(he|she|they)\s+(shouldn'?t|should\s+not|isn'?t\s+supposed)\b/,
      /\btouch(ed|es|ing)?\s+my\s+(private|privates|no[\s-]?no)\b/,
      /\binappropriate(ly)?\s+touch(ed|es|ing)?\b/,
      /\bmade\s+me\s+touch\s+(him|her|them|their|his)\b/,
      /\b(puts?|putting|put|slid|sticks?|reaches?)\s+(his|her|their)\s+hands?\s+(under|down|in|up)\s+(my\s+)?(clothes|pants|shirt|underwear|dress|skirt|shorts)\b/,
      /\b(does|did|doing|do)\s+(stuff|things|weird\s+stuff)\s+to\s+me\b.{0,45}\b(at\s+night|can'?t\s+tell|not\s+to\s+tell|our\s+(little\s+)?(secret|game)|hurt\s+me|don'?t\s+tell)\b/,
      /\bmakes?\s+me\s+do\s+(things|stuff)\b.{0,45}\b(our\s+(little\s+)?(secret|game)|don'?t\s+tell|can'?t\s+tell|not\s+to\s+tell|special)\b/,
      /\b(comes?|coming|came|gets?)\s+in\s?to\s+(the\s+)?(shower|bath|bed)\s+with\s+me\b/,
      /\b(uncle|aunt|cousin|stepdad|stepbrother|stepfather|stepmom|grandpa|grandad|granddad|neighbou?r|coach|babysitter|mom'?s\s+boyfriend|dad'?s\s+girlfriend)\b.{0,25}\btouch(ed|es|ing)?\s+me\b/,
      /\btouch(ed|es|ing)?\s+me\b.{0,40}\b(not\s+to\s+tell|our\s+secret|don'?t\s+tell|keep\s+it\s+(a\s+)?secret)\b/,
      /\b(comes?|came|come)\s+(in|into)\s+my\s+room\s+at\s+night\b/,
      /\btold\s+me\s+not\s+to\s+tell\b/,
      // Fear of / avoidance of a caregiver
      /\b(scared|afraid|terrified|frightened)\s+of\s+(my\s+)?(dad|mom|mum|mother|father|parent|parents|uncle|aunt|brother|sister|stepdad|stepmom|stepfather|stepmother|grandpa|grandad|granddad|him|her)\b/,
      /\b(scared|afraid|terrified|frightened)\s+of\s+what\s+(my\s+)?(dad|mom|mum|mother|father|parents?|stepdad|stepmom|stepfather|uncle|aunt|grandpa|grandad|brother|sister|he|she|they)\s+(will|would|might|'?d|is\s+gonna|'?s\s+gonna|gonna)\s+do\b/,
      /\b(scared|afraid|terrified|frightened)\s+of\s+being\s+(around|near|alone\s+with|at\s+home\s+with)\s+(my\s+)?(dad|mom|mum|mother|father|stepdad|stepmom|stepfather|uncle|aunt|grandpa|grandad|brother|sister)\b/,
      /\b(scared|afraid|terrified|frightened)\b(?=.{0,50}\b(gets?\s+home|comes?\s+home|get\s+back\s+home|is\s+home|drunk|drinking|been\s+drinking))(?=.{0,50}\b(dad|mom|mum|mother|father|parent|parents|uncle|aunt|brother|sister|stepdad|stepmom|stepfather|stepmother|grandpa|him|her|he|she|they))/,
      /\b(scared|afraid|terrified|frightened)\s+(to|of)\s+go(ing)?\s+home\b/,
      /\bdon'?t\s+want\s+to\s+go\s+home\b/,
      /\b(please\s+)?(dont|don'?t)\s+make\s+me\s+go\s+(back|home|there|to\s+his)\b/,
      /\bcan'?t\s+be\s+around\s+(him|her|them|dad|mom|my\s+\w+)\s+(tonight|anymore|right\s+now|today)\b/,
      /\bwhen\s+(he|she|they|dad|mom|mum|my\s+\w+)('?s)?\s+(is\s+|gets\s+|been\s+)?(drunk|drinking|drinks)\b/,
      /\b(he|she|they|dad|mom|mum|my\s+\w+)\s+(is|gets|'?s|been)\s+(drunk|drinking|drinks)\b/,
      /\bwhen\s+(he|she|dad|mom|mum|my\s+\w+)\s+gets?\s+home\b/,
      /\bhide\s+in\s+my\s+room\s+(when|because|cause|cuz)\b/,
      /\b(dresser|furniture|chair|desk|bed)\b.{0,25}\b(against|in\s+front\s+of|blocking)\s+(the\s+|my\s+)?door\b/,
      /\bso\s+(he|she|they|dad|mom)\s+can'?t\s+get\s+in\b/,
      /\b(hands?\s+(are\s+)?shaking|heart\s+(is\s+)?(racing|pounding))\b.{0,50}\b(been\s+drinking|drunk|drinking|coming\s+(up|home)|hear\s+him)\b/,
      /\bflinch\s+(every\s+time|when(ever)?|each\s+time)\b/,
      /\b(screams?|yells?)\s+at\s+me\b.{0,20}\b(throws?|hits?|hit|hurts?)\b/,
      /\b(mom'?s\s+boyfriend|dad'?s\s+girlfriend)\b.{0,30}\b(scary|scares?|hits?|touch|drunk|hurts?|creepy)\b/,
      // Safety / neglect ("safe at home" alone dropped — fired on "is it safe at
      // home to leave the oven on"; negated forms below still fire).
      /\b(not|never|don'?t|do\s+not)\s+feel\s+safe\b/,
      /\b(not|never)\s+safe\s+(at\s+home|in\s+my\s+(house|home)|anymore)\b/,
      /\b(left|leave|leaves)\s+(me\s+)?(home\s+)?alone\s+(for\s+(like\s+)?(\d+\s+)?(days|hours|weeks)|all\s+(day|night|the\s+time)|again|without|most\s+(days|nights)|with\s+no\s+(food|dinner|one))\b/,
      /\bhome\s+alone\s+(for\s+(days|a\s+week|hours)|every\s+(night|day)|most\s+nights)\b/,
      /\b(nobody|no\s+one)('?s)?\s+(home\s+)?(to\s+)?(feeds?|take[s]?\s+care\s+of|looks?\s+after)\s+me\b/,
      /\b(mom|dad|mum|my\s+\w+)\s+(hasn'?t|hasnt|has\s+not|didn'?t)\s+(come\s+(back|home)|been\s+home)\s+(in|for)\s+(\d+\s+)?(days|a\s+week|weeks)\b/,
      /\b(nothing|no\s+food)\s+in\s+the\s+(fridge|house|kitchen|cupboards?)\b.{0,30}\b(again|for\s+days|and\s+(mom|dad|no\s+one)|hasn'?t|hungry)\b/,
      /\b(no|not\s+enough|never\s+any|hardly\s+any|isn'?t\s+any|there'?s\s+no)\s+food\s+(at\s+home|to\s+eat|in\s+the\s+house|for\s+(days|me)|again)\b/,
      /\b(haven'?t|hadn'?t|dont|don'?t)\s+(eaten|had\s+food|had\s+anything\s+to\s+eat)\s+(in|since|for)\s+(days|a\s+day|two\s+days|yesterday|a\s+while)\b/,
      /\bwish\s+(someone|somebody)\s+would\s+(just\s+)?(take\s+care\s+of\s+me|look\s+after\s+me)\b/,
      /\bis\s+it\s+(normal|okay|ok)\s+(for\s+a\s+(grown\s?up|adult|parent)|if\s+(my|a))\b.{0,30}\b(hit|hits|touch|touches|hurt|hurts|beat|beats)\b/,
      /\b(whats?|what'?s)\s+happening\s+at\s+home\b/,
      /\bhappening\s+at\s+home\b/,
    ],
  },
];

/**
 * Returns the crisis category if the message contains crisis language, else
 * null. Case-insensitive; matches on the raw child message. Best-effort floor —
 * see the module doc comment on scope & limitations.
 */
export function detectCrisis(message: string): CrisisCategory | null {
  if (!message) return null;
  const text = message.toLowerCase();
  for (const rule of CRISIS_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.category;
    }
  }
  return null;
}

const SELF_HARM_RESPONSE =
  "I'm really glad you told me, and I want you to be safe. 💙 You don't have to go " +
  'through this alone. Please talk to a trusted adult right now — a parent, teacher, ' +
  'or school counselor. You can also call or text 988 (the Suicide & Crisis Lifeline) ' +
  'any time, day or night, to talk with someone who cares. If you are in immediate ' +
  'danger, call 911. You matter, and people want to help you.';

const ABUSE_RESPONSE =
  'Thank you for trusting me with this. What you feel matters, and you deserve to be ' +
  'safe. 💙 Please tell a trusted adult you feel safe with — a parent, teacher, school ' +
  'counselor, or another grown-up. You can also call or text 988 any time, or call the ' +
  'Childhelp National Child Abuse Hotline at 1-800-422-4453 (1-800-4-A-CHILD) to talk with ' +
  'someone who will listen and help. If you are in immediate danger, call 911. This is ' +
  'not your fault.';

/** The fixed, supportive response for a detected crisis category. */
export function getCrisisResponse(category: CrisisCategory): string {
  return category === 'abuse' ? ABUSE_RESPONSE : SELF_HARM_RESPONSE;
}
