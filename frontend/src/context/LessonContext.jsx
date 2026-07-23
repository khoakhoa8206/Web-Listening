import React, { createContext, useContext, useState, useCallback } from "react";
import { generateLesson as apiGenerateLesson, getLesson as apiGetLesson } from "../services/api";

const LessonContext = createContext(null);

const STORAGE_KEY = "listening_ielts_lesson";

export function LessonProvider({ children }) {
  const [lessonId, setLessonId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [title, setTitle] = useState(null);
  const [dictation, setDictation] = useState(null);
  const [writingQuestions, setWritingQuestions] = useState(null);
  const [vocabCards, setVocabCards] = useState(null);
  const [ideaBank, setIdeaBank] = useState(null);
  const [trueFalseQuestions, setTrueFalseQuestions] = useState(null);
  const [speakingPrompt, setSpeakingPrompt] = useState(null);
  const [readingPassage, setReadingPassage] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | generating | ready | error
  const [error, setError] = useState(null);
  const [saveToast, setSaveToast] = useState(null); // null | "success" | "error"

  const applyData = (data, url) => {
    setLessonId(data.lessonId);
    setVideoUrl(url || data.videoUrl);
    setTitle(data.title || url || data.videoUrl);
    setDictation(data.dictation);
    setWritingQuestions(data.writingQuestions);
    setVocabCards(data.vocabCards);
    setIdeaBank(data.ideaBank);
    setTrueFalseQuestions(data.trueFalseQuestions);
    setSpeakingPrompt(data.speakingPrompt);
    setReadingPassage(data.readingPassage || null);
    setStatus("ready");
  };

  // --- Xuất bài tập dưới dạng JSON file ---
  const exportLessonAsJSON = useCallback(() => {
    try {
      const payload = {
        lessonId, videoUrl, title, dictation, writingQuestions,
        vocabCards, ideaBank, trueFalseQuestions, speakingPrompt, readingPassage,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (title || "lesson").replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 40);
      a.download = `ielts_${safeName}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSaveToast("success");
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error("exportLessonAsJSON error:", err);
      setSaveToast("error");
      setTimeout(() => setSaveToast(null), 3000);
    }
  }, [lessonId, videoUrl, title, dictation, writingQuestions, vocabCards, ideaBank, trueFalseQuestions, speakingPrompt, readingPassage]);

  // --- Lưu bài tập vào LocalStorage ---
  const saveLessonToLocalStorage = useCallback(() => {
    try {
      const payload = {
        lessonId, videoUrl, title, dictation, writingQuestions,
        vocabCards, ideaBank, trueFalseQuestions, speakingPrompt, readingPassage,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setSaveToast("success");
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error("saveLessonToLocalStorage error:", err);
      setSaveToast("error");
      setTimeout(() => setSaveToast(null), 3000);
    }
  }, [lessonId, videoUrl, title, dictation, writingQuestions, vocabCards, ideaBank, trueFalseQuestions, speakingPrompt, readingPassage]);

  // --- Tải lại bài tập đã lưu trong LocalStorage ---
  const loadLessonFromLocalStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      applyData(data, data.videoUrl);
      return true;
    } catch (err) {
      console.error("loadLessonFromLocalStorage error:", err);
      return false;
    }
  }, []);

  const hasSavedLesson = useCallback(() => {
    try { return !!localStorage.getItem(STORAGE_KEY); }
    catch { return false; }
  }, []);

  const generateLesson = useCallback(async (url, transcript, topic, band, questionCount) => {
    setStatus("generating");
    setError(null);
    try {
      const data = await apiGenerateLesson(url, transcript, topic, band, questionCount);
      applyData(data, url);
      // Auto-save to localStorage after each successful generation
      const payload = { ...data, videoUrl: url, savedAt: new Date().toISOString() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
      return data;
    } catch (err) {
      console.error("generateLesson error:", err);
      setStatus("error");
      setError(err?.response?.data?.error || err.message || "Có lỗi khi tạo bài học");
      throw err;
    }
  }, []);

  const loadLesson = useCallback(async (id) => {
    setStatus("generating");
    setError(null);
    try {
      const data = await apiGetLesson(id);
      applyData(data, data.videoUrl);
      return data;
    } catch (err) {
      console.error("loadLesson error:", err);
      setStatus("error");
      setError(err?.response?.data?.error || err.message || "Không tải lại được bài học");
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setLessonId(null); setVideoUrl(null); setTitle(null);
    setDictation(null); setWritingQuestions(null); setVocabCards(null);
    setIdeaBank(null); setTrueFalseQuestions(null); setSpeakingPrompt(null);
    setReadingPassage(null); setStatus("idle"); setError(null);
  }, []);

  return (
    <LessonContext.Provider
      value={{
        lessonId, videoUrl, title, dictation, writingQuestions, vocabCards,
        ideaBank, trueFalseQuestions, speakingPrompt, readingPassage,
        status, error, saveToast,
        generateLesson, loadLesson, reset,
        exportLessonAsJSON, saveLessonToLocalStorage,
        loadLessonFromLocalStorage, hasSavedLesson,
      }}
    >
      {children}
    </LessonContext.Provider>
  );
}

export function useLesson() {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error("useLesson phải được gọi bên trong <LessonProvider>");
  return ctx;
}
