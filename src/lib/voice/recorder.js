/**
 * Browser Audio Recording Service using MediaRecorder and getUserMedia.
 * Safely manages media streams, tracks, runtime MIME selection, and audio Blobs.
 */

let activeMediaStream = null;
let activeMediaRecorder = null;
let activeAudioChunks = [];
let recordingStartTime = null;

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/aac",
];

export function isRecordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof window.MediaRecorder === "function"
  );
}

/**
 * Returns the best supported audio MIME type for the current browser, or empty string.
 */
export function getSupportedMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return "";
  }

  for (const mimeType of CANDIDATE_MIME_TYPES) {
    try {
      if (window.MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    } catch {
      // Ignore exception and continue testing candidates
    }
  }

  return "";
}

/**
 * Releases any active microphone media stream tracks immediately.
 */
export function releaseMediaStream() {
  if (activeMediaStream) {
    try {
      activeMediaStream.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (err) {
      console.warn("[Recorder] Error stopping media tracks:", err);
    }
    activeMediaStream = null;
  }
}

/**
 * Requests microphone permission and returns the MediaStream.
 */
export async function requestMicrophoneAccess() {
  if (!isRecordingSupported()) {
    throw new Error("Microphone recording is not supported in this browser environment.");
  }

  // Release any stale prior stream
  releaseMediaStream();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    activeMediaStream = stream;
    return stream;
  } catch (err) {
    releaseMediaStream();
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      throw new Error("Microphone permission was denied. Please allow microphone access in your browser settings to record your voice.");
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      throw new Error("No microphone device was detected on your system.");
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      throw new Error("Your microphone is already in use by another application.");
    }
    throw new Error(err.message || "Failed to initialize microphone access.");
  }
}

/**
 * Starts audio recording.
 * 
 * @param {Object} [options]
 * @param {Function} [options.onDataAvailable]
 * @param {Function} [options.onStart]
 * @param {Function} [options.onError]
 * @returns {Promise<MediaRecorder>}
 */
export async function startRecording(options = {}) {
  // 1. Acquire microphone access
  const stream = await requestMicrophoneAccess();

  activeAudioChunks = [];
  recordingStartTime = Date.now();

  const selectedMime = getSupportedMimeType();
  const recorderOptions = selectedMime ? { mimeType: selectedMime } : {};

  try {
    const recorder = new window.MediaRecorder(stream, recorderOptions);
    activeMediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        activeAudioChunks.push(event.data);
        if (options.onDataAvailable) options.onDataAvailable(event.data);
      }
    };

    recorder.onerror = (event) => {
      releaseMediaStream();
      if (options.onError) {
        options.onError(new Error(event.error?.message || "Recording error occurred."));
      }
    };

    recorder.start(250); // Emit chunks every 250ms

    if (options.onStart) {
      options.onStart();
    }

    return recorder;
  } catch (err) {
    releaseMediaStream();
    throw new Error(`Failed to start MediaRecorder: ${err.message}`);
  }
}

/**
 * Stops the active recording, releases microphone tracks, and returns the audio Blob & metadata.
 * 
 * @returns {Promise<{ blob: Blob, duration: number, mimeType: string, audioUrl: string }>}
 */
export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!activeMediaRecorder || activeMediaRecorder.state === "inactive") {
      releaseMediaStream();
      reject(new Error("No active recording session to stop."));
      return;
    }

    const duration = recordingStartTime ? Math.max(0.5, (Date.now() - recordingStartTime) / 1000) : 0;
    const recorder = activeMediaRecorder;

    recorder.onstop = () => {
      try {
        const mimeType = recorder.mimeType || getSupportedMimeType() || "audio/webm";
        const blob = new Blob(activeAudioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);

        // Always release hardware tracks after stop
        releaseMediaStream();
        activeMediaRecorder = null;
        activeAudioChunks = [];
        recordingStartTime = null;

        resolve({
          blob,
          duration,
          mimeType,
          audioUrl,
        });
      } catch (err) {
        releaseMediaStream();
        activeMediaRecorder = null;
        reject(err);
      }
    };

    try {
      recorder.stop();
    } catch (err) {
      releaseMediaStream();
      activeMediaRecorder = null;
      reject(err);
    }
  });
}

/**
 * Cancels recording without producing a blob and releases microphone immediately.
 */
export function cancelRecording() {
  try {
    if (activeMediaRecorder && activeMediaRecorder.state !== "inactive") {
      activeMediaRecorder.ondataavailable = null;
      activeMediaRecorder.onerror = null;
      activeMediaRecorder.onstop = null;
      activeMediaRecorder.stop();
    }
  } catch (err) {
    console.warn("[Recorder] Error cancelling MediaRecorder:", err);
  } finally {
    releaseMediaStream();
    activeMediaRecorder = null;
    activeAudioChunks = [];
    recordingStartTime = null;
  }
}
