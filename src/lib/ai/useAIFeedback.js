"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export const AI_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

export function useAIFeedback() {
  const [status, setStatus] = useState(AI_STATUS.IDLE);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Tracking tokens to prevent race conditions and stale updates
  const activeAttemptIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastParamsRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Resets AI feedback state and invalidates any in-flight requests.
   */
  const resetFeedback = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    activeAttemptIdRef.current = null;
    lastParamsRef.current = null;
    setStatus(AI_STATUS.IDLE);
    setFeedback(null);
    setError(null);
  }, []);

  /**
   * Requests feedback for a completed, scoreable attempt.
   * 
   * @param {Object} params
   * @param {string} params.referenceText
   * @param {string} params.transcriptText
   * @param {string} [params.attemptId] - Unique ID for the attempt to prevent duplicate requests
   * @param {string} [params.difficulty]
   * @param {string} [params.contextNote]
   */
  const requestFeedback = useCallback(
    async ({ referenceText, transcriptText, attemptId, difficulty, contextNote }) => {
      // Input validation
      if (!referenceText || typeof referenceText !== "string") {
        return;
      }

      // Prevent duplicate requests for the exact same attempt
      if (attemptId && activeAttemptIdRef.current === attemptId && status === AI_STATUS.SUCCESS) {
        return;
      }

      // Abort previous in-flight request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeAttemptIdRef.current = attemptId || `attempt-${Date.now()}`;
      lastParamsRef.current = { referenceText, transcriptText, attemptId, difficulty, contextNote };

      setStatus(AI_STATUS.LOADING);
      setError(null);

      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            referenceText,
            transcriptText: transcriptText || "",
            difficulty,
            contextNote,
          }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        if (res.ok && data?.success && data?.feedback) {
          setFeedback(data.feedback);
          setError(null);
          setStatus(AI_STATUS.SUCCESS);
        } else {
          const errPayload = data?.error || {
            code: "REQUEST_FAILED",
            message: "Unable to generate AI feedback at this time.",
          };
          setError(errPayload);
          setStatus(AI_STATUS.ERROR);
        }
      } catch (err) {
        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        setError({
          code: "CLIENT_NETWORK_ERROR",
          message: err.message || "Failed to contact AI feedback service.",
        });
        setStatus(AI_STATUS.ERROR);
      }
    },
    [status]
  );

  /**
   * Retries feedback using the last requested parameters.
   */
  const retryFeedback = useCallback(() => {
    if (lastParamsRef.current) {
      activeAttemptIdRef.current = null; // allow retry
      requestFeedback(lastParamsRef.current);
    }
  }, [requestFeedback]);

  return {
    status,
    feedback,
    error,
    isLoading: status === AI_STATUS.LOADING,
    isSuccess: status === AI_STATUS.SUCCESS,
    isError: status === AI_STATUS.ERROR,
    requestFeedback,
    retryFeedback,
    resetFeedback,
  };
}
