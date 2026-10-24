/**
 * Browser Speech Recognition Adapter
 * Interfaces with window.SpeechRecognition / window.webkitSpeechRecognition.
 * Decoupled from audio recording so transcription failure never breaks recording playback.
 */

let activeRecognizer = null;
let currentSessionToken = 0;

export function isSpeechRecognitionSupported() {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Creates and starts a speech recognition session with session-token isolation.
 * 
 * @param {Object} options
 * @param {string} [options.lang='en-US'] - Language code (e.g. 'en-US')
 * @param {boolean} [options.interimResults=true] - Stream interim words
 * @param {boolean} [options.continuous=true] - Keep listening until explicitly stopped
 * @param {Function} [options.onInterimResult] - Callback for partial transcript
 * @param {Function} [options.onFinalResult] - Callback for finalized sentence transcript
 * @param {Function} [options.onError] - Callback with diagnostic error message
 * @param {Function} [options.onStart] - Callback when recognition engine starts
 * @param {Function} [options.onEnd] - Callback when recognition engine closes
 * @returns {Object|null} Recognizer controller { stop, abort, sessionToken }
 */
export function startSpeechRecognition(options = {}) {
  const SpeechRecognition = getSpeechRecognitionConstructor();

  if (!SpeechRecognition) {
    if (options.onError) {
      options.onError({
        code: "unsupported",
        message: "Speech recognition is not supported in this browser. You can still type your message.",
      });
    }
    return null;
  }

  // Abort any prior recognition session and invalidate previous tokens
  abortSpeechRecognition();

  const thisSessionToken = ++currentSessionToken;

  try {
    const recognizer = new SpeechRecognition();
    activeRecognizer = recognizer;

    recognizer.lang = options.lang || "en-US";
    recognizer.continuous = options.continuous !== false;
    recognizer.interimResults = options.interimResults !== false;
    recognizer.maxAlternatives = 1;

    let accumulatedFinal = "";
    let isExplicitlyStopped = false;

    recognizer.onstart = () => {
      if (thisSessionToken !== currentSessionToken) return;
      if (options.onStart) options.onStart();
    };

    recognizer.onresult = (event) => {
      if (thisSessionToken !== currentSessionToken) return;

      let currentFinal = "";
      let currentInterim = "";

      const results = event.results || [];
      for (let i = 0; i < results.length; ++i) {
        const result = results[i];
        const text = result?.[0]?.transcript || "";
        if (result.isFinal) {
          currentFinal += (currentFinal ? " " : "") + text.trim();
        } else {
          currentInterim += (currentInterim ? " " : "") + text.trim();
        }
      }

      accumulatedFinal = currentFinal;

      const fullCombined = currentFinal
        ? currentInterim ? `${currentFinal} ${currentInterim}` : currentFinal
        : currentInterim;

      if (options.onInterimResult && (currentInterim || currentFinal)) {
        options.onInterimResult(currentInterim || fullCombined, {
          interim: currentInterim,
          final: currentFinal,
          fullText: fullCombined,
        });
      }

      if (options.onFinalResult && currentFinal) {
        options.onFinalResult(currentFinal);
      }
    };

    recognizer.onerror = (event) => {
      if (thisSessionToken !== currentSessionToken) return;

      const errorCode = event.error || "unknown";
      let friendlyMessage = "Speech recognition encountered an issue.";

      switch (errorCode) {
        case "not-allowed":
          friendlyMessage = "Microphone access was denied. Please allow microphone permission in your browser.";
          break;
        case "no-speech":
          friendlyMessage = "No speech was detected. Please try speaking again.";
          break;
        case "network":
          friendlyMessage = "Network error: speech recognition service could not be reached.";
          break;
        case "audio-capture":
          friendlyMessage = "Microphone capture failed. Please verify your microphone is connected.";
          break;
        case "service-not-allowed":
          friendlyMessage = "Speech recognition is not allowed by this browser or system policy.";
          break;
        case "aborted":
          // User or programmatic stop - don't treat as fatal error
          return;
        default:
          friendlyMessage = `Recognition error: ${errorCode}`;
      }

      if (options.onError) {
        options.onError({
          code: errorCode,
          message: friendlyMessage,
        });
      }
    };

    recognizer.onend = () => {
      if (thisSessionToken !== currentSessionToken) return;
      if (activeRecognizer === recognizer) {
        activeRecognizer = null;
      }
      if (options.onEnd) {
        options.onEnd({
          finalTranscript: accumulatedFinal.trim(),
          isExplicitlyStopped,
        });
      }
    };

    recognizer.start();

    return {
      sessionToken: thisSessionToken,
      stop: () => {
        isExplicitlyStopped = true;
        try {
          recognizer.stop();
        } catch {
          // Ignore if already stopped
        }
      },
      abort: () => {
        isExplicitlyStopped = true;
        try {
          recognizer.abort();
        } catch {
          // Ignore if already aborted
        }
      },
    };
  } catch (err) {
    if (activeRecognizer) {
      activeRecognizer = null;
    }
    if (options.onError) {
      options.onError({
        code: "init_failed",
        message: err.message || "Failed to initialize speech recognition.",
      });
    }
    return null;
  }
}

/**
 * Aborts any ongoing speech recognition immediately and invalidates pending callbacks.
 */
export function abortSpeechRecognition() {
  currentSessionToken++;
  if (activeRecognizer) {
    try {
      activeRecognizer.abort();
    } catch {
      // Ignore
    }
    activeRecognizer = null;
  }
}
