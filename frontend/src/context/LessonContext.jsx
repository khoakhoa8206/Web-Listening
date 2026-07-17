import React, { createContext, useContext, useState, useCallback } from "react";
import { generateLesson as apiGenerateLesson, getLesson as apiGetLesson } from "../services/api";

const LessonContext = createContext(null);

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

  // Gọi backend 1 lần duy nhất -> nhận đủ nội dung (nghe, viết, từ vựng, ý tưởng, T/F, speaking)
  // questionCount: "it" | "vua" | "nhieu" — số lượng blank trong dictation
  const generateLesson = useCallback(async (url, transcript, topic, band, questionCount) => {
    setStatus("generating");
    setError(null);
    try {
      const data = await apiGenerateLesson(url, transcript, topic, band, questionCount);
      setLessonId(data.lessonId);
      setVideoUrl(url);
      setTitle(data.title || url);
      setDictation(data.dictation);
      setWritingQuestions(data.writingQuestions);
      setVocabCards(data.vocabCards);
      setIdeaBank(data.ideaBank);
      setTrueFalseQuestions(data.trueFalseQuestions);
      setSpeakingPrompt(data.speakingPrompt);
      setReadingPassage(data.readingPassage || null);
      setStatus("ready");
      return data;
    } catch (err) {
      console.error("generateLesson error:", err);
      setStatus("error");
      setError(err?.response?.data?.error || err.message || "Có lỗi khi tạo bài học");
      throw err;
    }
  }, []);

  // Mở lại 1 bài học đã có sẵn (nút "Làm lại") — không gọi lại Gemini
  const loadLesson = useCallback(async (id) => {
    setStatus("generating");
    setError(null);
    try {
      const data = await apiGetLesson(id);
      setLessonId(data.lessonId);
      setVideoUrl(data.videoUrl);
      setTitle(data.title || data.videoUrl);
      setDictation(data.dictation);
      setWritingQuestions(data.writingQuestions);
      setVocabCards(data.vocabCards);
      setIdeaBank(data.ideaBank);
      setTrueFalseQuestions(data.trueFalseQuestions);
      setSpeakingPrompt(data.speakingPrompt);
      setReadingPassage(data.readingPassage || null);
      setStatus("ready");
      return data;
    } catch (err) {
      console.error("loadLesson error:", err);
      setStatus("error");
      setError(err?.response?.data?.error || err.message || "Không tải lại được bài học");
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setLessonId(null);
    setVideoUrl(null);
    setTitle(null);
    setDictation(null);
    setWritingQuestions(null);
    setVocabCards(null);
    setIdeaBank(null);
    setTrueFalseQuestions(null);
    setSpeakingPrompt(null);
    setReadingPassage(null);
    setStatus("idle");
    setError(null);
  }, []);

  return (
    <LessonContext.Provider
      value={{
        lessonId,
        videoUrl,
        title,
        dictation,
        writingQuestions,
        vocabCards,
        ideaBank,
        trueFalseQuestions,
        speakingPrompt,
        readingPassage,
        status,
        error,
        generateLesson,
        loadLesson,
        reset,
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
