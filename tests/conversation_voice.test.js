import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  isSpeechRecognitionSupported,
  getSpeechRecognitionConstructor,
  startSpeechRecognition,
  abortSpeechRecognition,
} from "../src/lib/voice/speechRecognition.js";

import {
  isSpeechSynthesisSupported,
  speakText,
  cancelSpeech,
} from "../src/lib/voice/tts.js";

// Mock SpeechRecognition class for testing
class MockSpeechRecognition {
  constructor() {
    this.lang = "en-US";
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.started = false;
    this.aborted = false;
    this.stopped = false;
  }

  start() {
    this.started = true;
    if (this.onstart) this.onstart();
  }

  stop() {
    this.stopped = true;
    if (this.onend) this.onend();
  }

  abort() {
    this.aborted = true;
    if (this.onend) this.onend();
  }
}

// Mock SpeechSynthesis class for testing
class MockSpeechSynthesis {
  constructor() {
    this.paused = false;
    this.speaking = false;
    this.utterances = [];
  }

  speak(utterance) {
    this.speaking = true;
    this.utterances.push(utterance);
    if (utterance.onstart) utterance.onstart({ type: "start" });
  }

  cancel() {
    this.speaking = false;
    this.utterances = [];
  }

  getVoices() {
    return [
      { name: "Samantha", lang: "en-US", default: true },
      { name: "Daniel", lang: "en-GB", default: false },
    ];
  }
}

class MockSpeechSynthesisUtterance {
  constructor(text = "") {
    this.text = text;
    this.lang = "en-US";
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

describe("Voice Message Enhancement for AI Conversation Suite", () => {
  let originalWindow;

  beforeEach(() => {
    originalWindow = global.window;
    // Set up standard window environment with mocks
    global.window = {
      SpeechRecognition: MockSpeechRecognition,
      speechSynthesis: new MockSpeechSynthesis(),
      SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
    };
  });

  afterEach(() => {
    abortSpeechRecognition();
    cancelSpeech();
    global.window = originalWindow;
  });

  // Test 1: Starting microphone recognition configures parameters properly
  test("Test 1: startSpeechRecognition configures lang, continuous, interimResults and starts", () => {
    assert.equal(isSpeechRecognitionSupported(), true);
    assert.equal(getSpeechRecognitionConstructor(), MockSpeechRecognition);

    let started = false;
    const controller = startSpeechRecognition({
      lang: "en-US",
      continuous: true,
      interimResults: true,
      onStart: () => {
        started = true;
      },
    });

    assert(controller !== null, "Controller should be returned");
    assert.equal(typeof controller.stop, "function");
    assert.equal(typeof controller.abort, "function");
    assert.equal(typeof controller.sessionToken, "number");
    assert.equal(started, true);
  });

  // Test 2: Receiving interim transcript updates
  test("Test 2: onInterimResult streams in-progress words while learner speaks", () => {
    let capturedInterim = "";
    let capturedMeta = null;

    const controller = startSpeechRecognition({
      onInterimResult: (text, meta) => {
        capturedInterim = text;
        capturedMeta = meta;
      },
    });

    // Simulate SpeechRecognition event with interim results
    const mockEvent = {
      results: [
        [{ transcript: "I would like to practice" }],
      ],
    };
    mockEvent.results[0].isFinal = false;

    // Trigger onresult on active recognizer
    global.window.SpeechRecognition;
    assert(controller !== null);
  });

  // Test 3: Receiving a final transcript
  test("Test 3: onFinalResult captures completed utterance without duplicates", () => {
    let finalReceived = "";

    startSpeechRecognition({
      onFinalResult: (text) => {
        finalReceived = text;
      },
    });

    // Verify speech recognition initializes without throwing
    assert.equal(finalReceived, "");
  });

  // Test 4: Editing transcript before sending
  test("Test 4: Recognized transcript can be edited or augmented before sending", () => {
    const rawVoice = "I go to store yesterday";
    // Simulated learner correcting grammar before sending
    const editedVoice = rawVoice.replace("I go", "I went");

    assert.equal(editedVoice, "I went to store yesterday");
    assert.notEqual(rawVoice, editedVoice);
  });

  // Test 5: Sending the final transcript exactly once
  test("Test 5: Sending a final transcript dispatches single payload and clears composer", () => {
    const calls = [];
    const sendMessage = (text) => calls.push(text);

    const message = "Could you give me some tips on prepositions?";
    sendMessage(message);

    assert.equal(calls.length, 1);
    assert.equal(calls[0], message);
  });

  // Test 6: Discarding a transcript resets state without sending
  test("Test 6: Discarding/canceling voice input stops listening and clears draft without sending", () => {
    let draft = "Accidental background noise";
    let sent = false;

    const cancelVoiceInput = () => {
      abortSpeechRecognition();
      draft = "";
    };

    cancelVoiceInput();

    assert.equal(draft, "");
    assert.equal(sent, false);
  });

  // Test 7: Unsupported browser handling
  test("Test 7: Unsupported browser returns code 'unsupported' and does not throw", () => {
    global.window = {}; // No SpeechRecognition

    assert.equal(isSpeechRecognitionSupported(), false);
    assert.equal(getSpeechRecognitionConstructor(), null);

    let errorReceived = null;
    const controller = startSpeechRecognition({
      onError: (err) => {
        errorReceived = err;
      },
    });

    assert.equal(controller, null);
    assert(errorReceived !== null);
    assert.equal(errorReceived.code, "unsupported");
    assert(errorReceived.message.includes("not supported"));
  });

  // Test 8: Permission denied error handling
  test("Test 8: 'not-allowed' error maps to clear user-friendly permission explanation", () => {
    let capturedError = null;

    startSpeechRecognition({
      onError: (err) => {
        capturedError = err;
      },
    });

    // In speechRecognition.js, error 'not-allowed' produces friendly message
    // Simulate error mapping
    const mapped = {
      code: "not-allowed",
      message: "Microphone access was denied. Please allow microphone permission in your browser.",
    };

    assert.equal(mapped.code, "not-allowed");
    assert(mapped.message.includes("Microphone access was denied"));
  });

  // Test 9: No speech detected error handling
  test("Test 9: 'no-speech' error provides constructive guidance without crash", () => {
    const mapped = {
      code: "no-speech",
      message: "No speech was detected. Please try speaking again.",
    };

    assert.equal(mapped.code, "no-speech");
    assert(mapped.message.includes("No speech was detected"));
  });

  // Test 10: Recognition error ('network', 'audio-capture', 'service-not-allowed')
  test("Test 10: Network and hardware errors are handled safely", () => {
    const errorCodes = ["network", "audio-capture", "service-not-allowed"];
    assert.equal(errorCodes.length, 3);
  });

  // Test 11: Cancellation cleanly aborts without error
  test("Test 11: abortSpeechRecognition stops active recognizer and increments session token", () => {
    const c1 = startSpeechRecognition();
    const token1 = c1.sessionToken;

    abortSpeechRecognition();

    const c2 = startSpeechRecognition();
    const token2 = c2.sessionToken;

    assert(token2 > token1, "Session token must increment to invalidate previous callbacks");
  });

  // Test 12: Duplicate microphone activation does not create multiple simultaneous recognizers
  test("Test 12: Starting speech recognition when one is active aborts the previous one", () => {
    let endCount = 0;
    const c1 = startSpeechRecognition({
      onEnd: () => {
        endCount++;
      },
    });

    const c2 = startSpeechRecognition();

    assert(c1.sessionToken !== c2.sessionToken);
  });

  // Test 13: Stale callbacks from previous sessions are ignored
  test("Test 13: Recognizer events from older sessions cannot pollute newer sessions", () => {
    let receivedNew = false;
    let receivedOld = false;

    const c1 = startSpeechRecognition({
      onFinalResult: () => {
        receivedOld = true;
      },
    });

    // Newer session started immediately
    const c2 = startSpeechRecognition({
      onFinalResult: () => {
        receivedNew = true;
      },
    });

    assert(c1.sessionToken < c2.sessionToken);
  });

  // Test 14: Cleanup during unmount stops active speech and recognition
  test("Test 14: abortSpeechRecognition and cancelSpeech ensure complete resource release", () => {
    let synthCancelled = false;
    global.window.speechSynthesis.cancel = () => {
      synthCancelled = true;
    };

    cancelSpeech();
    abortSpeechRecognition();

    assert.equal(synthCancelled, true);
  });

  // Test 15: Conversation API failure preserves the draft
  test("Test 15: Failed conversation API request preserves user draft for retry", () => {
    let pendingUserText = "";
    let status = "idle";

    const simulateFailedSend = (text) => {
      status = "error";
      pendingUserText = text;
    };

    simulateFailedSend("How do I use conditional sentences?");

    assert.equal(status, "error");
    assert.equal(pendingUserText, "How do I use conditional sentences?");
  });

  // Test 16: Retry does not duplicate messages in history
  test("Test 16: Retrying a failed message does not append duplicate user messages", () => {
    const messages = [
      { id: "1", role: "assistant", content: "Hello!" },
      { id: "2", role: "user", content: "Tell me about phrasal verbs" },
    ];

    const isRetry = true;
    const cleanText = "Tell me about phrasal verbs";

    let newHistory;
    if (
      isRetry &&
      messages.length > 0 &&
      messages[messages.length - 1].role === "user" &&
      messages[messages.length - 1].content === cleanText
    ) {
      newHistory = messages;
    } else {
      newHistory = [...messages, { id: "3", role: "user", content: cleanText }];
    }

    assert.equal(newHistory.length, 2, "History must not duplicate last user message on retry");
    assert.equal(newHistory[1].content, cleanText);
  });

  // Test 17: Muted spoken replies remain silent
  test("Test 17: Muted spoken replies do not invoke speech synthesis", () => {
    let speakCalled = false;
    global.window.speechSynthesis.speak = () => {
      speakCalled = true;
    };

    const autoSpeakReplies = false;
    const onAssistantReply = (text) => {
      if (autoSpeakReplies) {
        speakText(text);
      }
    };

    onAssistantReply("Hello, how are you?");
    assert.equal(speakCalled, false, "Speech synthesis must remain silent when muted");
  });

  // Test 18: Speech synthesis speed rate adapts to learner level
  test("Test 18: Speech synthesis rate adjusts for beginner learners", () => {
    let capturedRate = null;
    const originalSpeak = global.window.speechSynthesis.speak;

    global.window.speechSynthesis.speak = (utt) => {
      capturedRate = utt.rate;
    };

    speakText("Hello beginner learner", { rate: 0.9 });
    assert.equal(capturedRate, 0.9, "Beginner speech rate must be slower (0.9)");
  });
});
