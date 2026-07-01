/**
 * Code-level crisis safety backstop for the Vibe Tutor AND Vibe Buddy chats.
 *
 * Child-safety guardrails must NOT depend solely on the LLM following its
 * system prompt — the model can be swapped to a weaker free fallback, the
 * system prompt can be dropped, or the network can fail. This module detects
 * crisis language in the child's own message and returns a fixed, supportive
 * response with real help resources, independent of any model output.
 *
 * Design bias (child safety): patterns lean toward catching real disclosures
 * (self-harm, physical/sexual abuse, fear at home, neglect) even at the cost of
 * an occasional benign match — a false negative (missing a cry for help) is far
 * worse than a false positive (an extra supportive 988 message). Bare words
 * like "die"/"kill"/"dead" never fire on their own, so ordinary hyperbole
 * ("this homework is killing me", "my mom will kill me if I fail") passes
 * through. This is a deterministic backstop, not a complete classifier — the
 * most oblique disclosures still rely on the model and human escalation.
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
      /\bkill(ing)?\s+myself\b/,
      /\bend(ing)?\s+my\s+life\b/,
      // "want to die" but NOT hyperbole like "die of boredom" / "die laughing".
      /\b(want|wanna|going|gonna|need|ready|about)\s+to\s+die\b(?!\s+(of|from|for|laughing|when|if))/,
      /\bwish\s+(i\s+)?(was|were|wasn'?t|weren'?t)\s+(dead|alive|here|born)\b/,
      /\bwish\s+i\s+(could\s+)?(die|disappear)\b/,
      /\bdon'?t\s+want\s+to\s+(be\s+alive|live|wake\s+up|be\s+here|exist)\b/,
      /\bno\s+(reason|point)\s+(to|in)\s+(live|living|life|be(ing)?\s+here|go\s+on|going\s+on)\b/,
      /\bpoint\s+(of|in)\s+(anything|it\s+all|living|life|going\s+on|even\s+trying)\b/,
      /\bsuicid(e|al)\b/,
      /\b(hurt|harm|cut|cutting|hurting|harming|kill)\s+myself\b/,
      /\b(been\s+)?cutting\s+(again|myself|my\s+(wrists?|arms?|legs?|skin|thighs?))\b/,
      /\bself[\s-]?harm(ing)?\b/,
      /\bbetter\s+off\s+(dead|without\s+me|if\s+i\s+(was|were|wasn'?t|weren'?t)\s+(dead|gone|not\s+here|around|born|alive|here))\b/,
      /\b(everyone|they|world|you\s+all|people|everybody)\s+(would\s+be\s+)?(better\s+off|happier)\s+(off\s+)?(if\s+i\s+(was|were|wasn'?t|weren'?t)\s+(around|here|born|gone|dead)|without\s+me)\b/,
      /\bwant\s+it\s+(all\s+)?to\s+stop\b/,
      /\b(want|wanna|going|gonna)\s+to\s+end\s+(it\s+all|my\s+life|myself)\b/,
      /\bthink(ing)?\s+about\s+(ending\s+it|killing\s+myself|suicide|not\s+being\s+here|dying)\b/,
      /\btired\s+of\s+(being\s+alive|living|life|it\s+all)\b/,
      /\bnever\s+wake\s+up\b/,
      /\b(want|wanna)\s+to\s+disappear\b/,
      /\bwanna\s+disappear\b/,
      /\bdisappear\s+and\s+never\s+come\s+back\b/,
      /\b(nobody|no\s+one|no-?one)\s+would\s+(even\s+)?(care|notice|miss\s+me)\b/,
    ],
  },
  {
    category: 'abuse',
    patterns: [
      /\b(being|getting|been|was|i'?m)\s+abused\b/,
      /\b(physical|sexual|verbal)(ly)?\s+abus(e|ed|ing)\b/,
      /\bsomeone\s+(is\s+|keeps\s+)?(hurt(ing|s)?|hit(ting|s)?|touch(ing|es|ed)?|beat(ing|s)?)\s+me\b/,
      /\b(he|she|they|dad|mom|mum|mother|father|my\s+\w+)\s+(hits|hit|hurts|punches|punched|slaps|slapped|chokes|choked|kicks|kicked|whips|whipped|burns|burned)\s+me\b/,
      /\b(hits|hurts|punches|slaps|chokes|kicks|whips|burns)\s+me\b/,
      /\bbeat(s|en)?\s+me\b(?!\s+(at|in|on|to|by)\b)/,
      /\bbeat(s|en)?\s+me\s+(up|black\s+and\s+blue|senseless)\b/,
      /\b(is\s+)?(gonna|going\s+to|will|might|about\s+to)\s+hurt\s+me\b/,
      /\bleaves?\s+(bruises|marks|welts)\b/,
      /\bgrab(bed|s)?\s+me\s+by\s+(the|my)\s+(hair|neck|throat|arm|wrist|face)\b/,
      /\b(threw|throws|throwing)\s+me\s+(across|into|down|against|at\s+the|on\s+the|to\s+the)\b/,
      /\block(s|ed|ing)?\s+me\s+(in|out|outside|up)\b/,
      /\b(touch(ed|es|ing)?|grab(bed|s)?)\s+me\s+(in|where|down\s+there|somewhere|inappropriately|in\s+my\s+privates?)\b/,
      /\btouch(ed|es|ing)?\s+me\s+(in\s+a\s+)?(bad|weird|wrong|creepy|private|funny)\s+(way|place|spot)\b/,
      /\btouch(ed|es|ing)?\s+(me\s+)?(where\s+)?(he|she|they)\s+(shouldn'?t|should\s+not|isn'?t\s+supposed)\b/,
      /\btouch(ed|es|ing)?\s+my\s+(private|privates|no[\s-]?no)\b/,
      /\binappropriate(ly)?\s+touch(ed|es|ing)?\b/,
      /\bmade\s+me\s+touch\s+(him|her|them|their|his)\b/,
      /\b(uncle|aunt|cousin|stepdad|stepbrother|stepfather|stepmom|grandpa|grandad|granddad|neighbou?r|coach|babysitter|mom'?s\s+boyfriend|dad'?s\s+girlfriend)\b.{0,25}\btouch(ed|es|ing)?\s+me\b/,
      /\btouch(ed|es|ing)?\s+me\b.{0,40}\b(not\s+to\s+tell|our\s+secret|don'?t\s+tell|keep\s+it\s+(a\s+)?secret)\b/,
      /\b(comes?|came|come)\s+(in|into)\s+my\s+room\s+at\s+night\b/,
      /\btold\s+me\s+not\s+to\s+tell\b/,
      /\b(scared|afraid|terrified|frightened)\s+of\s+(my\s+)?(dad|mom|mum|mother|father|parent|parents|uncle|aunt|brother|sister|stepdad|stepmom|stepfather|stepmother|grandpa|grandad|granddad|him|her)\b/,
      /\b(scared|afraid|terrified|frightened|nervous)\b(?=.{0,50}\b(gets?\s+home|comes?\s+home|get\s+back\s+home|is\s+home|go(ing)?\s+home|home|drunk|drinking|been\s+drinking|angry|mad|yell))(?=.{0,50}\b(dad|mom|mum|mother|father|parent|parents|uncle|aunt|brother|sister|stepdad|stepmom|stepfather|stepmother|grandpa|him|her|he|she|they|home))/,
      /\b(scared|afraid|terrified|frightened)\s+(to|of)\s+go(ing)?\s+home\b/,
      /\bdon'?t\s+want\s+to\s+go\s+home\b/,
      /\bwhen\s+(he|she|they|dad|mom|mum|my\s+\w+)('?s)?\s+(is\s+|gets\s+|been\s+)?(drunk|drinking)\b/,
      /\b(he|she|they|dad|mom|mum|my\s+\w+)\s+(is|gets|'?s)\s+(drunk|drinking)\b/,
      /\bwhen\s+(he|she|dad|mom|mum|my\s+\w+)\s+gets?\s+home\b/,
      /\bhide\s+in\s+my\s+room\s+(when|because|cause|cuz)\b/,
      /\bflinch\s+(every\s+time|when(ever)?|each\s+time)\b/,
      /\b(screams?|yells?)\s+at\s+me\b.{0,20}\b(throws?|hits?|hit|hurts?)\b/,
      /\b(mom'?s\s+boyfriend|dad'?s\s+girlfriend)\b.{0,30}\b(scary|scares?|hits?|touch|drunk|hurts?|creepy)\b/,
      /\b(not|never|don'?t|do\s+not)\s+feel\s+safe\b/,
      /\b(not|never)\s+safe\s+(at\s+home|in\s+my\s+(house|home)|anymore)\b/,
      /\bsafe\s+at\s+home\b/,
      /\b(left|leave|leaves)\s+(me\s+)?(home\s+)?alone\s+(for\s+(like\s+)?(\d+\s+)?(days|hours|weeks)|all\s+(day|night|the\s+time)|again|without|most\s+(days|nights)|with\s+no\s+(food|dinner|one))\b/,
      /\bhome\s+alone\s+(for\s+(days|a\s+week|hours)|every\s+(night|day)|most\s+nights)\b/,
      /\b(nobody|no\s+one)('?s)?\s+(home\s+)?(to\s+)?(feeds?|take[s]?\s+care\s+of|looks?\s+after)\s+me\b/,
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
 * null. Case-insensitive; matches on the raw child message.
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
  'counselor, or another grown-up. You can also call or text 988 any time to talk with ' +
  'someone who will listen and help. If you are in immediate danger, call 911. This is ' +
  'not your fault.';

/** The fixed, supportive response for a detected crisis category. */
export function getCrisisResponse(category: CrisisCategory): string {
  return category === 'abuse' ? ABUSE_RESPONSE : SELF_HARM_RESPONSE;
}
