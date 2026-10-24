/**
 * Word Alignment Algorithm
 * Deterministic Levenshtein edit distance and dynamic programming alignment.
 * 
 * Supported Operations:
 * - 'match': Reference token equals transcript token (cost 0)
 * - 'substitution': Reference token replaced by learner transcript token (cost 1)
 * - 'deletion': Reference token omitted by learner (missing word, cost 1)
 * - 'insertion': Extra token spoken by learner not in reference (extra word, cost 1)
 */

/**
 * Normalizes input token array into plain string array with original metadata preserved.
 */
function extractTokens(tokens) {
  if (!tokens || !Array.isArray(tokens)) return [];
  return tokens.map((t, idx) => {
    if (typeof t === "string") {
      return { text: t, index: idx };
    }
    return {
      text: t.text || "",
      index: typeof t.index === "number" ? t.index : idx,
    };
  });
}

/**
 * Aligns reference tokens with recognized transcript tokens deterministically.
 * 
 * @param {Array<string|Object>} refTokens - Array of reference tokens
 * @param {Array<string|Object>} transTokens - Array of transcript tokens
 * @returns {Array<{
 *   type: 'match' | 'substitution' | 'deletion' | 'insertion',
 *   referenceWord: string | null,
 *   transcriptWord: string | null,
 *   referenceIndex: number | null,
 *   transcriptIndex: number | null
 * }>}
 */
export function alignWords(refTokens = [], transTokens = []) {
  const R = extractTokens(refTokens);
  const T = extractTokens(transTokens);

  const n = R.length;
  const m = T.length;

  // Handle edge cases
  if (n === 0 && m === 0) {
    return [];
  }

  if (n === 0) {
    // All insertions (extra words)
    return T.map((t) => ({
      type: "insertion",
      referenceWord: null,
      transcriptWord: t.text,
      referenceIndex: null,
      transcriptIndex: t.index,
    }));
  }

  if (m === 0) {
    // All deletions (missing words)
    return R.map((r) => ({
      type: "deletion",
      referenceWord: r.text,
      transcriptWord: null,
      referenceIndex: r.index,
      transcriptIndex: null,
    }));
  }

  // 1. Build DP Matrix of minimum edit distances
  // dp[i][j] represents distance between R[0..i-1] and T[0..j-1]
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

  for (let i = 0; i <= n; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= m; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    const rWord = R[i - 1].text;
    for (let j = 1; j <= m; j++) {
      const tWord = T[j - 1].text;

      if (rWord === tWord) {
        dp[i][j] = dp[i - 1][j - 1]; // Match (cost 0)
      } else {
        const subCost = dp[i - 1][j - 1] + 1; // Substitution (cost 1)
        const delCost = dp[i - 1][j] + 1;     // Deletion of R[i-1] (cost 1)
        const insCost = dp[i][j - 1] + 1;     // Insertion of T[j-1] (cost 1)

        dp[i][j] = Math.min(subCost, delCost, insCost);
      }
    }
  }

  // 2. Backtrack with deterministic tie-breaking priority:
  // Priority order:
  // 1. Match (cost 0)
  // 2. Substitution (cost 1)
  // 3. Deletion (cost 1)
  // 4. Insertion (cost 1)
  const alignment = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && R[i - 1].text === T[j - 1].text && dp[i][j] === dp[i - 1][j - 1]) {
      // 1. Exact match
      alignment.push({
        type: "match",
        referenceWord: R[i - 1].text,
        transcriptWord: T[j - 1].text,
        referenceIndex: R[i - 1].index,
        transcriptIndex: T[j - 1].index,
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      // 2. Substitution
      alignment.push({
        type: "substitution",
        referenceWord: R[i - 1].text,
        transcriptWord: T[j - 1].text,
        referenceIndex: R[i - 1].index,
        transcriptIndex: T[j - 1].index,
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      // 3. Deletion (reference word omitted)
      alignment.push({
        type: "deletion",
        referenceWord: R[i - 1].text,
        transcriptWord: null,
        referenceIndex: R[i - 1].index,
        transcriptIndex: null,
      });
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      // 4. Insertion (extra transcript word)
      alignment.push({
        type: "insertion",
        referenceWord: null,
        transcriptWord: T[j - 1].text,
        referenceIndex: null,
        transcriptIndex: T[j - 1].index,
      });
      j--;
    } else {
      // Fallback safety (e.g. boundary conditions)
      if (i > 0) {
        alignment.push({
          type: "deletion",
          referenceWord: R[i - 1].text,
          transcriptWord: null,
          referenceIndex: R[i - 1].index,
          transcriptIndex: null,
        });
        i--;
      } else if (j > 0) {
        alignment.push({
          type: "insertion",
          referenceWord: null,
          transcriptWord: T[j - 1].text,
          referenceIndex: null,
          transcriptIndex: T[j - 1].index,
        });
        j--;
      }
    }
  }

  // Reverse since we backtracked from (n, m) down to (0, 0)
  return alignment.reverse();
}
