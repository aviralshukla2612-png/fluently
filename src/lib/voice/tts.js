/**
 * Browser-native Text-To-Speech (SpeechSynthesis) Service
 * Provides multilingual reference voice playback with locale matching,
 * speed control, cancellation, and error recovery.
 */

let activeUtterance = null;

export function isSpeechSynthesisSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

/**
 * Normalizes a BCP 47 locale tag (e.g., 'en-US', 'hi-in', 'es_ES').
 *
 * @param {string} [locale]
 * @returns {string}
 */
export function normalizeLocale(locale) {
  if (!locale || typeof locale !== "string") return "en-US";
  return locale.trim().replace(/_/g, "-");
}

/**
 * Finds the most suitable voice for a requested BCP 47 locale from a list of voices.
 * 
 * Matching Priority:
 * 1. Exact BCP 47 locale match (e.g. 'hi-IN' matches 'hi-IN' or 'hi-in')
 * 2. Primary language subtag match (e.g. 'hi' matches 'hi-IN', 'hi-NP', etc.)
 * 3. None: returns null voice with matchType: 'none'
 *
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} requestedLocale
 * @returns {{ voice: SpeechSynthesisVoice|null, matchType: 'exact'|'subtag'|'none' }}
 */
export function findMatchingVoice(voices, requestedLocale) {
  if (!Array.isArray(voices) || voices.length === 0) {
    return { voice: null, matchType: "none" };
  }

  const normalizedTarget = normalizeLocale(requestedLocale).toLowerCase();
  const targetPrimarySubtag = normalizedTarget.split("-")[0];

  // 1. Exact locale match
  const exact = voices.find((v) => {
    const vLang = normalizeLocale(v.lang).toLowerCase();
    return vLang === normalizedTarget;
  });
  if (exact) {
    return { voice: exact, matchType: "exact" };
  }

  // 2. Same primary language subtag (e.g., 'es-ES' matching 'es-MX' or 'gu-IN' matching 'gu')
  const subtag = voices.find((v) => {
    const vLang = normalizeLocale(v.lang).toLowerCase();
    return vLang.split("-")[0] === targetPrimarySubtag;
  });
  if (subtag) {
    return { voice: subtag, matchType: "subtag" };
  }

  // 3. Name or voiceURI match for the language name (e.g. "Microsoft Niranjan - Gujarati", "Google ગુજરાતી")
  const langNameKeywords = {
    gu: ["gujarati", "ગુજરાતી"],
    hi: ["hindi", "हिन्दी"],
    es: ["spanish", "español"],
    fr: ["french", "français"],
    de: ["german", "deutsch"],
    en: ["english"],
  };

  const keywords = langNameKeywords[targetPrimarySubtag] || [];
  if (keywords.length > 0) {
    const nameMatch = voices.find((v) => {
      const vName = (v.name || "").toLowerCase();
      const vURI = (v.voiceURI || "").toLowerCase();
      return keywords.some((kw) => vName.includes(kw) || vURI.includes(kw));
    });
    if (nameMatch) {
      return { voice: nameMatch, matchType: "subtag" };
    }
  }

  // 4. Indic Regional fallback (for Gujarati, if Hindi or Indian English voice is installed, it can pronounce Indic phonemes with authentic flow)
  if (targetPrimarySubtag === "gu") {
    const hindiVoice = voices.find((v) => {
      const vLang = normalizeLocale(v.lang).toLowerCase();
      const vName = (v.name || "").toLowerCase();
      return vLang.startsWith("hi") || vName.includes("hindi") || vName.includes("हिन्दी") || vName.includes("swara") || vName.includes("madhur");
    });
    if (hindiVoice) {
      return { voice: hindiVoice, matchType: "regional-fallback" };
    }

    const indianEnglishVoice = voices.find((v) => {
      const vLang = normalizeLocale(v.lang).toLowerCase();
      const vName = (v.name || "").toLowerCase();
      return (
        vLang.includes("en-in") ||
        (vLang.startsWith("en") &&
          (vName.includes("india") ||
            vName.includes("neerja") ||
            vName.includes("prabhat") ||
            vName.includes("heera") ||
            vName.includes("ravi")))
      );
    });
    if (indianEnglishVoice) {
      return { voice: indianEnglishVoice, matchType: "regional-fallback" };
    }
  }

  return { voice: null, matchType: "none" };
}

/**
 * Returns all voices matching a requested locale, with exact matches prioritized.
 *
 * @param {string} requestedLocale
 * @param {SpeechSynthesisVoice[]} [voicesList]
 * @returns {SpeechSynthesisVoice[]}
 */
export function getMatchingVoices(requestedLocale, voicesList) {
  if (!isSpeechSynthesisSupported() && !voicesList) return [];
  const voices = voicesList || window.speechSynthesis.getVoices();
  if (!Array.isArray(voices) || voices.length === 0) return [];

  const target = normalizeLocale(requestedLocale).toLowerCase();
  const targetPrimary = target.split("-")[0];

  const exact = [];
  const subtag = [];
  const fallback = [];

  for (const v of voices) {
    const vLang = normalizeLocale(v.lang).toLowerCase();
    const vName = (v.name || "").toLowerCase();
    if (vLang === target) {
      exact.push(v);
    } else if (
      vLang.split("-")[0] === targetPrimary ||
      (targetPrimary === "gu" && (vName.includes("gujarati") || vName.includes("ગુજરાતી")))
    ) {
      subtag.push(v);
    } else if (
      targetPrimary === "gu" &&
      (vLang.startsWith("hi") ||
        vName.includes("hindi") ||
        vName.includes("हिन्दी") ||
        vLang.includes("en-in") ||
        vName.includes("india") ||
        vName.includes("neerja"))
    ) {
      fallback.push(v);
    }
  }

  return [...exact, ...subtag, ...fallback];
}

/**
 * Checks whether an installed voice exists for the given locale.
 *
 * @param {string} requestedLocale
 * @param {SpeechSynthesisVoice[]} [voicesList]
 * @returns {boolean}
 */
export function hasMatchingVoice(requestedLocale, voicesList) {
  const match = findMatchingVoice(
    voicesList || (isSpeechSynthesisSupported() ? window.speechSynthesis.getVoices() : []),
    requestedLocale
  );
  return match.matchType !== "none";
}

/**
 * Sorts voices prioritizing a target locale or language.
 */
export function filterAndSortVoices(voices, targetLocale = "en-US") {
  if (!voices || !Array.isArray(voices)) return [];

  const normalizedTarget = normalizeLocale(targetLocale).toLowerCase();
  const targetPrimary = normalizedTarget.split("-")[0];

  return [...voices].sort((a, b) => {
    const aLang = normalizeLocale(a.lang).toLowerCase();
    const bLang = normalizeLocale(b.lang).toLowerCase();

    const aExact = aLang === normalizedTarget;
    const bExact = bLang === normalizedTarget;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aSubtag = aLang.split("-")[0] === targetPrimary;
    const bSubtag = bLang.split("-")[0] === targetPrimary;
    if (aSubtag && !bSubtag) return -1;
    if (!aSubtag && bSubtag) return 1;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Returns available voices, filtered or prioritized for target locale.
 * Supports asynchronous voice loading common in Chromium browsers.
 *
 * @param {string} [targetLocale='en-US']
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export function getAvailableVoices(targetLocale = "en-US") {
  if (!isSpeechSynthesisSupported()) {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(filterAndSortVoices(voices, targetLocale));
      return;
    }

    // Chromium often loads voices asynchronously
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(filterAndSortVoices(window.speechSynthesis.getVoices(), targetLocale));
    };

    window.speechSynthesis.addEventListener("voiceschanged", finish);

    // Timeout safety fallback
    setTimeout(finish, 1000);
  });
}

/**
 * Cancels all current and pending speech activity.
 */
export function cancelSpeech() {
  if (!isSpeechSynthesisSupported()) return;

  try {
    if (activeUtterance) {
      activeUtterance.onstart = null;
      activeUtterance.onend = null;
      activeUtterance.onerror = null;
      activeUtterance = null;
    }
    window.speechSynthesis.cancel();
  } catch (err) {
    console.warn("[TTS] Error during cancelSpeech:", err);
  }
}

export const stopSpeaking = cancelSpeech;

/**
 * Speaks the provided text using SpeechSynthesis in the requested language.
 * Automatically chooses the best matching installed voice for that language.
 * 
 * @param {string} text - Sentence to speak
 * @param {Object} options - Configuration options
 * @param {string} [options.lang='en-US'] - BCP 47 language code (e.g. 'en-US', 'hi-IN', 'es-ES')
 * @param {number} [options.rate=1.0] - Playback speed rate (0.5 to 2.0)
 * @param {number} [options.pitch=1.0] - Vocal pitch
 * @param {SpeechSynthesisVoice} [options.voice=null] - Explicit voice override
 * @param {Function} [options.onStart] - Callback when speech starts ({ type, voice, matchType })
 * @param {Function} [options.onEnd] - Callback when speech ends normally
 * @param {Function} [options.onError] - Callback on error
 * @returns {SpeechSynthesisUtterance|null}
 */
/**
 * Transliterates Gujarati unicode script to Devanagari script.
 * Gujarati (0x0A80-0x0AFF) and Devanagari (0x0900-0x097F) have identical
 * character layout in Unicode with a fixed offset of -0x0180.
 *
 * @param {string} text
 * @returns {string}
 */
export function gujaratiToDevanagari(text) {
  if (!text || typeof text !== "string") return "";
  return text.replace(/[\u0A80-\u0AFF]/g, (c) => {
    const code = c.charCodeAt(0);
    return String.fromCharCode(code - 0x0180);
  });
}

const GUJARATI_WORDS = [
  // Greetings & Courtesies
  ["નમસ્તે", "Nuh-mus-tay"],
  ["નમસ્કાર", "Nuh-mus-kaar"],
  ["જય શ્રી કૃષ્ણ", "Jye Shree Krish-nuh"],
  ["જય માતાજી", "Jye Maa-taa-jee"],
  ["જય જિનેન્દ્ર", "Jye Jee-nayn-druh"],
  ["કેમ છો", "Came chho"],
  ["કેમ છે", "Came chhay"],
  ["આવજો", "Aahv-joh"],
  ["આભાર", "Aah-bhaar"],
  ["ધન્યવાદ", "Dhun-yuh-vaad"],
  ["સુપ્રભાત", "Soo-pruh-bhaat"],
  ["શુભ સવાર", "Shoobh Suh-vaar"],
  ["શુભ બપોર", "Shoobh Buh-pohr"],
  ["શુભ સાંજ", "Shoobh Saanj"],
  ["શુભ રાત્રિ", "Shoobh Raa-tree"],
  ["માફ કરશો", "Maaf Kur-sho"],
  ["કૃપા કરીને", "Kroo-paa Kuh-ree-nay"],
  ["સ્વાગત છે", "Svaa-gut chhay"],
  ["સ્વાગત", "Svaa-gut"],
  ["ફરી મળીશું", "Fuh-ree Muh-lee-shoo"],
  ["અભિનંદન", "Uh-bhee-nun-dun"],
  ["શુભેચ્છાઓ", "Shoo-bhay-chhaao"],
  ["શુભેચ્છા", "Shoo-bhay-chhaa"],

  // Pronouns, Helpers & Conjunctions
  ["હું", "Hoo"],
  ["તમે", "Tuh-may"],
  ["તું", "Too"],
  ["આપણે", "Aah-puh-nay"],
  ["અમે", "Uh-may"],
  ["તેઓ", "Tay-oh"],
  ["તેણે", "Tay-nay"],
  ["તેણી", "Tay-nee"],
  ["મારું", "Maa-roo"],
  ["મારો", "Maa-ro"],
  ["મારી", "Maa-ree"],
  ["તમારું", "Tuh-maa-roo"],
  ["તમારો", "Tuh-maa-ro"],
  ["તમારી", "Tuh-maa-ree"],
  ["તેનું", "Tay-noo"],
  ["તેનો", "Tay-no"],
  ["તેની", "Tay-nee"],
  ["પોતાનું", "Poh-taa-noo"],
  ["મને", "Muh-nay"],
  ["તમને", "Tuhm-nay"],
  ["અમને", "Uhm-nay"],
  ["તેમને", "Taym-nay"],
  ["સાથે", "Saa-thay"],
  ["વિના", "Vee-naa"],
  ["માટે", "Maa-tay"],
  ["છું", "chhoo"],
  ["છો", "chho"],
  ["છે", "chhay"],
  ["છીએ", "chhee-ay"],
  ["હતા", "Huh-taa"],
  ["હતો", "Huh-to"],
  ["હતી", "Huh-tee"],
  ["હતું", "Huh-too"],
  ["હશે", "Huh-shay"],
  ["નથી", "Nuh-thee"],
  ["નહોતા", "Nuh-hoh-taa"],
  ["નહોતું", "Nuh-hoh-too"],
  ["અને", "uh-nay"],
  ["પણ", "pun"],
  ["કે", "kay"],
  ["જો", "jo"],
  ["તો", "to"],
  ["કારણ કે", "Kaa-run kay"],
  ["એટલે", "Ayt-lay"],
  ["તેથી", "Tay-thee"],
  ["પરંતુ", "Puh-run-too"],
  ["છતાં", "Chhuh-taan"],
  ["એક", "Ake"],
  ["બે", "Bay"],
  ["ત્રણ", "Trun"],
  ["ચાર", "Chaar"],
  ["પાંચ", "Paanch"],
  ["આ", "Aah"],
  ["જ", "juh"],
  ["ન", "nuh"],

  // Conversational Vocabulary & Hard Words
  ["મજામાં", "Muh-jaa-maa"],
  ["વાતચીત", "Vaat-cheet"],
  ["વાર્તાલાપ", "Vaar-taa-laap"],
  ["સંવાદ", "Sum-vaad"],
  ["વાત", "vaat"],
  ["વાતો", "vaa-toh"],
  ["કરીને", "kuh-ree-nay"],
  ["કરવા", "kur-vaa"],
  ["કરવું", "kur-voo"],
  ["કરવો", "kur-voh"],
  ["કરો", "kuh-roh"],
  ["કરીશું", "kuh-ree-shoo"],
  ["કરે છે", "kuh-ray chhay"],
  ["કરું છું", "kuh-roo chhoo"],
  ["ઘણો", "ghuh-no"],
  ["ઘણી", "ghuh-nee"],
  ["ઘણું", "ghuh-noo"],
  ["આનંદ", "Aah-nund"],
  ["ખુશી", "Khoo-shee"],
  ["થયો", "thuh-yo"],
  ["થઈ", "thuh-yee"],
  ["થયું", "thuh-yoo"],
  ["થાય છે", "thaay chhay"],
  ["થશે", "thuh-shay"],
  ["આજે", "Aah-jay"],
  ["કાલે", "Kaa-lay"],
  ["ગઈકાલે", "Gyee-kaa-lay"],
  ["પરમદિવસે", "Pur-um-dee-vuh-say"],
  ["શું", "Shoo"],
  ["શા માટે", "Shaa maa-tay"],
  ["કેમ", "Kaym"],
  ["ક્યાં", "Kyaa"],
  ["ક્યારે", "Kyaa-ray"],
  ["નવું", "Nuh-voo"],
  ["નવા", "Nuh-vaa"],
  ["નવી", "Nuh-vee"],
  ["શીખી", "Shee-khee"],
  ["શીખવું", "Shee-khvoo"],
  ["શીખવા", "Shee-khvaa"],
  ["શીખવો", "Shee-khvoh"],
  ["શીખવી", "Shee-khvee"],
  ["શીખો", "Shee-khoh"],
  ["શીખે છે", "shee-khay chhay"],
  ["શીખીશું", "Shee-khee-shoo"],
  ["રહ્યા", "Ruh-yaa"],
  ["રહી", "Ruh-hee"],
  ["રહ્યો", "Ruh-yo"],
  ["રહેવું", "Ruh-hay-voo"],
  ["રહો છો", "Ruh-hoh chho"],
  ["ખૂબ", "Khoob"],
  ["સરસ", "Suh-rus"],
  ["સુંદર", "Soon-dur"],
  ["ઉત્તમ", "Oot-tum"],
  ["શ્રેષ્ઠ", "Shray-shth"],
  ["મહત્વનો", "Muh-hut-vuh-no"],
  ["મહત્વની", "Muh-hut-vuh-nee"],
  ["મહત્વનું", "Muh-hut-vuh-noo"],
  ["મહત્વપૂર્ણ", "Muh-hut-vuh-poor-nuh"],
  ["મુદ્દો", "Mood-doh"],
  ["મુદ્દા", "Mood-daa"],
  ["રસપ્રદ", "Rus-pruh-d"],
  ["બરાબર", "Buh-raa-bur"],
  ["ચોક્કસ", "Choke-kus"],
  ["ચોક્કસપણે", "Choke-kus-puh-nay"],
  ["બિલકુલ", "Beel-kool"],
  ["હા", "Haa"],
  ["ના", "Naa"],
  ["સારું", "Saa-roo"],
  ["સારા", "Saa-raa"],
  ["સારી", "Saa-ree"],
  ["નામ", "Naam"],
  ["શૅડોલી", "Shadowly"],
  ["ટ્યુટર", "Tutor"],
  ["શિક્ષક", "Shik-shuk"],
  ["શિક્ષિકા", "Shik-shee-kaa"],
  ["શિક્ષણ", "Shik-shun"],
  ["વિદ્યાલય", "Vid-yaa-luy"],
  ["પાઠ", "Paath"],
  ["દિવસ", "Dee-vus"],
  ["દિવસો", "Dee-vuh-soh"],
  ["રાત", "Raat"],
  ["સમય", "Suh-muy"],
  ["કલાક", "Kuh-laak"],
  ["મિનિટ", "Mee-neet"],
  ["કેવો", "Kay-vo"],
  ["કેવી", "Kay-vee"],
  ["કેવું", "Kay-voo"],
  ["કેવા", "Kay-vaa"],
  ["કેવી રીતે", "Kay-vee ree-tay"],
  ["કેટલું", "Kayt-loo"],
  ["કેટલા", "Kayt-laa"],
  ["કેટલી", "Kayt-lee"],
  ["પસંદ", "Puh-sund"],
  ["વિષય", "Vee-shuy"],
  ["વિષયો", "Vee-shuh-yoh"],
  ["વિચાર", "Vee-chaar"],
  ["વિચારો", "Vee-chaa-roh"],
  ["પરિચય", "Puh-ree-chuy"],
  ["પૂરી", "poo-ree"],
  ["પૂરું", "poo-roo"],
  ["રીતે", "Ree-tay"],
  ["સમજી", "Sum-jee"],
  ["સમજવું", "Sum-jvoo"],
  ["સમજવા", "Sum-jvaa"],
  ["સમજો", "Sum-joh"],
  ["સમજાય છે", "Sum-jaay chhay"],
  ["શકું", "Shuh-koo"],
  ["શકો છો", "Shuh-koh chho"],
  ["પાણી", "Paa-nee"],
  ["ખોરાક", "Khoh-raak"],
  ["ભોજન", "Bhoh-jun"],
  ["જમવાનું", "Jum-vaa-noo"],
  ["જમવું", "Jum-voo"],
  ["જમો", "Jum-oh"],
  ["ભૂખ", "Bhoo-kh"],
  ["તરસ", "Tuh-rus"],
  ["લાગી", "Laa-gee"],
  ["લાગે છે", "Laa-gay chhay"],
  ["ચા", "Chaa"],
  ["કોફી", "Coffee"],
  ["પરિવાર", "Puh-ree-vaar"],
  ["માતાપિતા", "Maa-taa-pee-taa"],
  ["ભાઈ", "Bhaai"],
  ["બહેન", "Buh-hayn"],
  ["મિત્ર", "Mee-truh"],
  ["મિત્રો", "Mee-tro"],
  ["દોસ્ત", "Dost"],
  ["દોસ્તો", "Dos-toh"],
  ["પુસ્તક", "Poos-tuk"],
  ["પુસ્તકો", "Poos-tuh-ko"],
  ["પુસ્તકાલય", "Poos-tuh-kaa-luy"],
  ["અભ્યાસ", "Ubh-yaas"],
  ["વિદ્યાર્થી", "Vid-yaar-thee"],
  ["વિદ્યાર્થીઓ", "Vid-yaar-thee-o"],
  ["મુશ્કેલ", "Moosh-kayl"],
  ["અઘરું", "Ugh-roo"],
  ["સરળ", "Suh-rul"],
  ["સહેલું", "Suh-hay-loo"],
  ["સાંભળવું", "Saam-bhul-voo"],
  ["સાંભળો", "Saam-bhuh-loh"],
  ["બોલવું", "Bole-voo"],
  ["બોલવા", "Bole-vaa"],
  ["બોલો", "Boh-loh"],
  ["વાંચવું", "Vaanch-voo"],
  ["વાંચો", "Vaan-choh"],
  ["લખવું", "Lukh-voo"],
  ["લખો", "Luh-khoh"],
  ["જોવું", "Joh-voo"],
  ["જુઓ", "Joo-oh"],
  ["મળવું", "Mul-voo"],
  ["મળો", "Mul-oh"],
  ["આવવું", "Aahv-voo"],
  ["આવો", "Aah-voh"],
  ["જવું", "Juh-voo"],
  ["જાઓ", "Jaa-oh"],
  ["ચાલો", "Chaa-loh"],
  ["ભાષા", "Bhaa-shaa"],
  ["ભાષાઓ", "Bhaa-shaa-oh"],
  ["ગુજરાતી", "Goo-juh-raa-tee"],
  ["અંગ્રેજી", "Ung-gray-jee"],
  ["હિન્દી", "Heen-dee"],
  ["કુશળતા", "Koo-shul-taa"],
  ["પ્રગતિ", "Pruh-guh-tee"],
  ["સુધારો", "Soo-dhaa-roh"],
  ["પ્રયાસ", "Pruh-yaas"],
  ["પ્રયત્ન", "Pruh-yut-nuh"],
  ["નિયમિત", "Nee-yuh-mit"],
  ["દરરોજ", "Dur-roh-j"],
  ["પ્રશ્ન", "Prush-nuh"],
  ["પ્રશ્નો", "Prush-noh"],
  ["ઉત્તર", "Oot-tur"],
  ["ઉત્તરો", "Oot-tuh-roh"],
  ["જવાબ", "Juh-vaab"],
  ["જવાબો", "Juh-vaa-boh"],
  ["માંગો છો", "Maang-oh chho"],
  ["માંગો", "Maang-oh"],
  ["માંગવું", "Maang-voo"],
  ["પૂછવામાં", "Poochh-vaa-maa"],
  ["પૂછવું", "Poochh-voo"],
  ["પૂછો", "Poo-chhoh"],
  ["પૂછે છે", "Poo-chhay chhay"],
  ["કહેવું", "Kuh-hay-voo"],
  ["કહો", "Kuh-hoh"],
  ["કહે છે", "Kuh-hay chhay"],
  ["પાઠવું છું", "Paa-thuh-voo chhoo"],
  ["પાઠવું", "Paa-thuh-voo"],
  ["સંબંધો", "Sum-bun-dho"],
  ["સંબંધ", "Sum-bundh"],
  ["સંકોચ", "Sun-koch"],
  ["મદદ", "Muh-dud"],
  ["સહાય", "Suh-haay"],
  ["માર્ગદર્શન", "Maarg-dur-shun"],
  ["જ્ઞાન", "Gyaan"],
  ["વિજ્ઞાન", "Vig-nyaan"],
  ["ટેકનોલોજી", "Tech-noh-loh-jee"],
  ["સંસ્કૃતિ", "Sun-skri-tee"],
  ["સમાજ", "Suh-maaj"],
  ["ઇતિહાસ", "Eet-hee-haas"],
  ["રાજકારણ", "Raaj-kaa-run"],
  ["રાષ્ટ્રીય", "Raash-tree-yuh"],
  ["આંતરરાષ્ટ્રીય", "Aan-tur-raash-tree-yuh"],
  ["પરિસ્થિતિ", "Puh-ree-sthee-tee"],
  ["પરિણામ", "Puh-ree-naam"],
  ["અનુભવ", "Uh-noo-bhuv"],
  ["શાંતિ", "Shaan-tee"],
  ["સંતોષ", "Sun-tosh"],
  ["વિશ્વાસ", "Veesh-vaas"],
  ["સત્ય", "Sut-yuh"],
  ["હિંમત", "Heem-mut"],
  ["સ્વાસ્થ્ય", "Svaas-thyuh"],
  ["તંદુરસ્તી", "Tun-doo-rus-tee"],
  ["શબ્દ", "Shub-d"],
  ["શબ્દો", "Shub-doh"],
  ["વાક્ય", "Vaak-yuh"],
  ["વાક્યો", "Vaak-yoh"],
  ["ઉચ્ચારણ", "Ooch-chaa-run"],
  ["ઉચ્ચાર", "Ooch-chaar"],
];

// Precompiled word dictionary with suffix awareness
const GUJARATI_WORD_RULES = GUJARATI_WORDS.map(([w, r]) => {
  const pattern = new RegExp(
    `(?<![\\u0A80-\\u0AFF])${w}(?:(\\u0AAE\\u0ABE\\u0A82)|(\\u0AA5\\u0AC0)|(\\u0AA8\\u0AC7)|(\\u0A93)|(\\u0AA8\\u0ACB)|(\\u0AA8\\u0AC0)|(\\u0AA8\\u0AC1\\u0A82)|(\\u0AA8\\u0ABE)|(\\u0A8F))?(?![\\u0A80-\\u0AFF])`,
    "g"
  );
  return {
    pattern,
    replace: (match, pMaa, pThee, pNay, pO, pNo, pNee, pNoo, pNaa, pAy) => {
      let suffix = "";
      if (pMaa) suffix = "-maa";
      else if (pThee) suffix = "-thee";
      else if (pNay) suffix = "-nay";
      else if (pO) suffix = "-o";
      else if (pNo) suffix = "-no";
      else if (pNee) suffix = "-nee";
      else if (pNoo) suffix = "-noo";
      else if (pNaa) suffix = "-naa";
      else if (pAy) suffix = "-ay";
      return r + suffix;
    },
  };
});

// Common Indic Conjuncts (Jodakshar)
const GUJARATI_CONJUNCTS = [
  ["\u0A9C\u0ACD\u0A9E\u0ABE", "Gyaa"],
  ["\u0A9C\u0ACD\u0A9E\u0AC7", "Gyay"],
  ["\u0A9C\u0ACD\u0A9E\u0ACB", "Gyoh"],
  ["\u0A9C\u0ACD\u0A9E\u0AC0", "Gyee"],
  ["\u0A9C\u0ACD\u0A9E\u0ABF", "Gyee"],
  ["\u0A9C\u0ACD\u0A9E", "Gya"],

  ["\u0A95\u0ACD\u0AB7\u0ABE", "Kshaa"],
  ["\u0A95\u0ACD\u0AB7\u0AC7", "Kshay"],
  ["\u0A95\u0ACD\u0AB7\u0ACB", "Kshoh"],
  ["\u0A95\u0ACD\u0AB7\u0AC0", "Kshee"],
  ["\u0A95\u0ACD\u0AB7\u0ABF", "Kshee"],
  ["\u0A95\u0ACD\u0AB7", "Kshuh"],

  ["\u0AB6\u0ACD\u0AB0\u0AC0", "Shree"],
  ["\u0AB6\u0ACD\u0AB0\u0AC7", "Shray"],
  ["\u0AB6\u0ACD\u0AB0\u0ABE", "Shraa"],
  ["\u0AB6\u0ACD\u0AB0", "Shruh"],

  ["\u0AA4\u0ACD\u0AB0\u0AC0", "Tree"],
  ["\u0AA4\u0ACD\u0AB0\u0ABF", "Tree"],
  ["\u0AA4\u0ACD\u0AB0\u0AC7", "Tray"],
  ["\u0AA4\u0ACD\u0AB0\u0ABE", "Traa"],
  ["\u0AA4\u0ACD\u0AB0", "Truh"],

  ["\u0AB7\u0ACD\u0A9F\u0ACD\u0AB0\u0AC0", "Shtree"],
  ["\u0AB7\u0ACD\u0A9F\u0ACD\u0AB0", "Shtr"],
  ["\u0AB7\u0ACD\u0A9F\u0AC0", "Shtee"],
  ["\u0AB7\u0ACD\u0A9F\u0ABF", "Shtee"],
  ["\u0AB7\u0ACD\u0A9F\u0AC7", "Shtay"],
  ["\u0AB7\u0ACD\u0A9F\u0ABE", "Shtaa"],
  ["\u0AB7\u0ACD\u0A9F", "Sht"],
  ["\u0AB7\u0ACD\u0AA0", "Shth"],

  ["\u0AB8\u0ACD\u0AA5\u0ABE", "Sthaa"],
  ["\u0AB8\u0ACD\u0AA5\u0AC0", "Sthee"],
  ["\u0AB8\u0ACD\u0AA5\u0ABF", "Sthee"],
  ["\u0AB8\u0ACD\u0AA5\u0AC7", "Sthay"],
  ["\u0AB8\u0ACD\u0AA5", "Sth"],

  ["\u0AB8\u0ACD\u0AAA", "Sp"],
  ["\u0AB8\u0ACD\u0AB5\u0ABE", "Svaa"],
  ["\u0AB8\u0ACD\u0AB5", "Sv"],

  ["\u0AA6\u0ACD\u0AAF\u0ABE", "Dyaa"],
  ["\u0AA6\u0ACD\u0AAF", "Dy"],
  ["\u0AA6\u0ACD\u0AA7", "D-dh"],
  ["\u0AA7\u0ACD\u0AAF\u0ABE", "Dhyaa"],
  ["\u0AA7\u0ACD\u0AAF", "Dhy"],

  ["\u0AAD\u0ACD\u0AAF\u0ABE", "Bhyaa"],
  ["\u0AAD\u0ACD\u0AAF", "Bhy"],
  ["\u0AB5\u0ACD\u0AAF\u0ABE", "Vyaa"],
  ["\u0AB5\u0ACD\u0AAF", "Vy"],
  ["\u0A95\u0ACD\u0AAF\u0ABE", "Kyaa"],
  ["\u0A95\u0ACD\u0AAF", "Ky"],
  ["\u0A96\u0ACD\u0AAF\u0ABE", "Khyaa"],
  ["\u0A96\u0ACD\u0AAF", "Khy"],

  ["\u0AB8\u0ACD\u0AAF", "Sy"],
  ["\u0AB9\u0ACD\u0AAF", "Hy"],
  ["\u0AA4\u0ACD\u0AA4", "Tt"],
  ["\u0AA8\u0ACD\u0AA8", "Nn"],
  ["\u0AAE\u0ACD\u0AAE", "Mm"],
  ["\u0AB2\u0ACD\u0AB2", "Ll"],
];

const GUJARATI_CONSONANTS = {
  "\u0A85": "uh", "\u0A86": "aah", "\u0A87": "ee", "\u0A88": "ee", "\u0A89": "oo", "\u0A8A": "oo",
  "\u0A8B": "ree", "\u0A8F": "ay", "\u0A90": "ai", "\u0A93": "oh", "\u0A94": "au",
  "\u0A95": "k", "\u0A96": "kh", "\u0A97": "g", "\u0A98": "gh", "\u0A99": "ng",
  "\u0A9A": "ch", "\u0A9B": "chh", "\u0A9C": "j", "\u0A9D": "jh", "\u0A9E": "ny",
  "\u0A9F": "t", "\u0AA0": "th", "\u0AA1": "d", "\u0AA2": "dh", "\u0AA3": "n",
  "\u0AA4": "t", "\u0AA5": "th", "\u0AA6": "d", "\u0AA7": "dh", "\u0AA8": "n",
  "\u0AAA": "p", "\u0AAB": "f", "\u0AAC": "b", "\u0AAD": "bh", "\u0AAE": "m",
  "\u0AAF": "y", "\u0AB0": "r", "\u0AB2": "l", "\u0AB3": "l", "\u0AB5": "v",
  "\u0AB6": "sh", "\u0AB7": "sh", "\u0AB8": "s", "\u0AB9": "h",
};

const GUJARATI_MATRAS = {
  "\u0ABE": "aa", "\u0ABF": "ee", "\u0AC0": "ee", "\u0AC1": "oo", "\u0AC2": "oo",
  "\u0AC5": "ay", "\u0AC7": "ay", "\u0AC8": "ai", "\u0AC9": "oh", "\u0ACB": "oh", "\u0ACC": "au",
  "\u0A82": "n", "\u0A81": "n", "\u0A83": "h",
};

/**
 * Transliterates Gujarati unicode text to smooth, natural phonetic syllables with schwa deletion.
 * Provides fluent, rhythmic speech flow across all installed speech synthesizers.
 *
 * @param {string} text
 * @returns {string}
 */
export function gujaratiToPhoneticLatin(text) {
  if (!text || typeof text !== "string") return "";

  // 1. High-frequency vocabulary & phrases with suffix awareness
  let s = text;
  for (const rule of GUJARATI_WORD_RULES) {
    s = s.replace(rule.pattern, rule.replace);
  }

  // 2. Common verb forms: -વામાં (-vaa-maa), -વાથી (-vaa-thee), -વાનું (-vaa-noo)
  s = s.replace(/(\S+)વામાં(?![\\u0A80-\\u0AFF])/g, "$1-vaa-maa");
  s = s.replace(/(\S+)વાથી(?![\\u0A80-\\u0AFF])/g, "$1-vaa-thee");
  s = s.replace(/(\S+)વાનું(?![\\u0A80-\\u0AFF])/g, "$1-vaa-noo");

  // 3. Indic conjunct replacement
  for (const [conj, rep] of GUJARATI_CONJUNCTS) {
    s = s.replaceAll(conj, rep);
  }

  // 4. Character-level phonetic mapping with Indic phonology
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    const afterNext = s[i + 2];
    const code = ch.charCodeAt(0);

    if (code >= 0x0A80 && code <= 0x0AFF) {
      if (GUJARATI_CONSONANTS[ch]) {
        const base = GUJARATI_CONSONANTS[ch];
        const isVowelChar = code >= 0x0A85 && code <= 0x0A94;

        if (isVowelChar) {
          result += base;
        } else if (next === "\u0ACD") {
          // Halant / virama (conjunct consonant)
          result += base;
          i++;
        } else if (next === "\u0A82") {
          // Consonant directly followed by anusvara without explicit matra: "સં" -> "sun" / "sum"
          const labials = ["\u0AAA", "\u0AAB", "\u0AAC", "\u0AAD", "\u0AAE"]; // p, ph, b, bh, m
          const velars = ["\u0A95", "\u0A96", "\u0A97", "\u0A98"]; // k, kh, g, gh
          if (labials.includes(afterNext)) {
            result += base + "um";
          } else if (velars.includes(afterNext)) {
            result += base + "ung";
          } else {
            result += base + "un";
          }
          i++;
        } else if (GUJARATI_MATRAS[next]) {
          // Explicit matra vowel attached
          let matraStr = GUJARATI_MATRAS[next];
          // Check if followed by anusvara on top of matra (e.g. "માં" -> "maa", "હું" -> "hoo")
          if (afterNext === "\u0A82") {
            if (next === "\u0ABE") {
              matraStr = "aa"; // "માં" -> "maa"
            } else if (next === "\u0AC1" || next === "\u0AC2") {
              matraStr = "oo"; // "હું" -> "hoo", "છું" -> "chhoo"
            } else {
              matraStr += "n";
            }
            i++; // skip afterNext anusvara
          }
          result += base + matraStr;
          i++;
        } else {
          // Unmarked consonant: apply word-final schwa deletion, but preserve monosyllables
          const nextCode = next ? next.charCodeAt(0) : 0;
          const isNextGujarati = nextCode >= 0x0A80 && nextCode <= 0x0AFF;
          const isWordEnd = !next || !isNextGujarati || /\s|[.,!?'"()]/.test(next);

          // Check if this was a single-letter word like "ન" or "જ"
          const prev = s[i - 1];
          const isPrevWordBoundary = !prev || /\s|[.,!?'"()]/.test(prev);

          if (isWordEnd) {
            if (isPrevWordBoundary) {
              // Single-consonant word: "ન" -> "nuh", "જ" -> "juh"
              result += base + "uh";
            } else {
              result += base; // "મદદ" -> "Muh-dud", "આભાર" -> "Aah-bhaar"
            }
          } else {
            result += base + "uh";
          }
        }
      } else if (GUJARATI_MATRAS[ch]) {
        result += GUJARATI_MATRAS[ch];
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }

  // 5. Clean up duplicate hyphens and spaces
  return result
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/-([.,!?'"])/g, "$1")
    .trim();
}

export function speakText(text, options = {}) {
  if (!isSpeechSynthesisSupported()) {
    if (options.onError) {
      options.onError(new Error("Browser speech synthesis is not supported on this device."));
    }
    return null;
  }

  // Cancel any prior speech to prevent overlapping audio
  cancelSpeech();

  if (!text || typeof text !== "string") {
    if (options.onError) options.onError(new Error("Invalid text supplied to speech synthesis."));
    return null;
  }

  try {
    const requestedLocale = normalizeLocale(options.lang || "en-US");

    // Voice selection
    let selectedVoice = options.voice || null;
    let matchType = "explicit";

    if (!selectedVoice) {
      const allVoices = window.speechSynthesis.getVoices();
      const matchResult = findMatchingVoice(allVoices, requestedLocale);
      if (matchResult.voice) {
        selectedVoice = matchResult.voice;
        matchType = matchResult.matchType;
      } else {
        selectedVoice = null;
        matchType = "none";
      }
    }

    let textToSpeak = text;
    let actualSpeechLocale = requestedLocale;

    // Fluent multi-tier routing for Gujarati speech:
    if (requestedLocale.startsWith("gu")) {
      const voiceLang = selectedVoice ? (selectedVoice.lang || "").toLowerCase() : "";
      const voiceName = selectedVoice ? (selectedVoice.name || "").toLowerCase() : "";
      const isExactGujarati =
        voiceLang.startsWith("gu") ||
        voiceName.includes("gujarati") ||
        voiceName.includes("ગુજરાતી") ||
        voiceName.includes("niranjan") ||
        voiceName.includes("dhwani");
      const isHindi =
        voiceLang.startsWith("hi") ||
        voiceName.includes("hindi") ||
        voiceName.includes("हिन्दी") ||
        voiceName.includes("swara") ||
        voiceName.includes("madhur");
      const isIndianEnglish =
        voiceLang.includes("en-in") ||
        voiceName.includes("india") ||
        voiceName.includes("neerja") ||
        voiceName.includes("prabhat");

      if (isExactGujarati) {
        // Native Gujarati voice reads original script with native flow
        textToSpeak = text;
        actualSpeechLocale = "gu-IN";
      } else if (isHindi) {
        // Hindi voice reads Devanagari script with natural Indic phonetics
        textToSpeak = gujaratiToDevanagari(text);
        actualSpeechLocale = "hi-IN";
      } else if (isIndianEnglish) {
        // Indian English voice speaks fluent Romanized Gujarati with authentic Indian rhythm
        textToSpeak = gujaratiToPhoneticLatin(text);
        actualSpeechLocale = "en-IN";
      } else {
        // Western English voice speaks clean phonetic syllables without glitching
        textToSpeak = gujaratiToPhoneticLatin(text);
        actualSpeechLocale = "en-US";
      }
    }

    const utterance = new window.SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = actualSpeechLocale;

    // Fluent speech rate: Gujarati and Hindi sound most natural at 0.90
    const defaultRate = requestedLocale.startsWith("gu") || requestedLocale.startsWith("hi") ? 0.90 : 1.0;
    utterance.rate = Math.max(0.5, Math.min(2.0, options.rate || defaultRate));
    utterance.pitch = options.pitch || 1.0;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = (event) => {
      if (options.onStart) {
        options.onStart({
          ...event,
          voice: selectedVoice,
          matchType,
          locale: requestedLocale,
        });
      }
    };

    utterance.onend = (event) => {
      activeUtterance = null;
      if (options.onEnd) options.onEnd(event);
    };

    utterance.onerror = (event) => {
      activeUtterance = null;
      // 'canceled' or 'interrupted' is normal when user cancels or switches language
      if (event.error === "canceled" || event.error === "interrupted") {
        return;
      }
      if (options.onError) {
        options.onError(new Error(event.error || "Speech synthesis playback failed."));
      }
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);

    // Chrome bug workaround: speech synthesis can stall for long texts unless resumed
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    return utterance;
  } catch (err) {
    activeUtterance = null;
    if (options.onError) {
      options.onError(err);
    }
    return null;
  }
}
