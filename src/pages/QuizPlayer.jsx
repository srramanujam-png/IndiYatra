import { useState, useEffect, useRef, useCallback } from "react";
import { SAFFRON, HERITAGE, GREEN } from "../lib/supabase";
import { saveQuizAttempt } from "../lib/auth";
import PageHeader from "../components/PageHeader";
import { globalStyles } from "../styles/global";

const BLUE = HERITAGE;
const RED  = "#DC2626";

// Shuffle an array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const styles = `
  .qp-wrap { min-height: 100vh; background: #FAFAF7; display: flex; flex-direction: column; }

  /* ── Top bar ── */
  .qp-topbar {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
    border-bottom: 1px solid #E5E7EB;
    padding: 0 1.5rem; height: 54px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .qp-back {
    display: flex; align-items: center; gap: 5px; background: none; border: none;
    cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #4A5565;
    transition: color 0.2s; flex-shrink: 0;
  }
  .qp-back:hover { color: ${SAFFRON}; }
  .qp-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.0625rem; font-weight: 700;
    color: ${BLUE}; flex: 1; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .qp-counter { font-size: 0.8125rem; color: #4A5565; font-weight: 600; flex-shrink: 0; }

  /* ── Progress bar ── */
  .qp-progress { height: 3px; background: #F3F4F6; }
  .qp-progress-fill { height: 100%; background: ${SAFFRON}; transition: width 0.35s ease; }

  /* ── Quiz timer bar (top-level) ── */
  .qp-quiz-timer {
    background: #FFF3E0; padding: 6px 1.5rem;
    display: flex; align-items: center; gap: 10px; font-size: 0.8125rem; color: #B45309; font-weight: 600;
  }
  .qp-quiz-timer-bar { flex: 1; height: 6px; background: #FEE0A0; border-radius: 999px; overflow: hidden; }
  .qp-quiz-timer-fill { height: 100%; background: ${SAFFRON}; transition: width 0.5s linear; border-radius: 999px; }

  /* ── Body ── */
  .qp-body { flex: 1; max-width: 680px; width: 100%; margin: 0 auto; padding: 24px 1rem 120px; }

  /* ── Question timer (per-question) ── */
  .qp-q-timer {
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    font-size: 0.8125rem; font-weight: 700; color: #B45309;
  }
  .qp-q-timer-bar { flex: 1; height: 8px; background: #FEE0A0; border-radius: 999px; overflow: hidden; }
  .qp-q-timer-fill { height: 100%; background: ${SAFFRON}; transition: width 0.25s linear; border-radius: 999px; }
  .qp-q-timer-fill.urgent { background: ${RED}; }

  /* ── Card ── */
  .qp-card {
    background: white; border-radius: 14px; border: 1px solid #E5E7EB;
    overflow: hidden; margin-bottom: 16px;
    animation: qpFadeIn 0.2s ease both;
  }
  @keyframes qpFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }

  .qp-img {
    width: 100%; max-height: 300px; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background: #F9F9F7;
  }
  .qp-img img { width: 100%; max-height: 300px; object-fit: contain; display: block; }

  .qp-card-body { padding: 20px 20px 8px; }

  .qp-q-num {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    color: ${SAFFRON}; margin-bottom: 8px;
  }
  .qp-question {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.375rem; font-weight: 700;
    color: #0A0A0A; line-height: 1.4; margin-bottom: 20px;
  }

  /* ── Options ── */
  .qp-options { display: flex; flex-direction: column; gap: 10px; padding: 0 20px 20px; }
  .qp-option {
    border: 2px solid #E5E7EB; border-radius: 10px; padding: 13px 16px;
    cursor: pointer; display: flex; align-items: center; gap: 12px;
    transition: border-color 0.15s, background 0.15s; background: white;
    font-size: 0.9375rem; font-weight: 500; color: #1F1F1F; text-align: left;
  }
  .qp-option:hover:not(.locked) { border-color: ${SAFFRON}; background: #FFF8EE; }
  .qp-option.selected  { border-color: ${SAFFRON}; background: #FFF8EE; }
  .qp-option.correct   { border-color: ${GREEN};   background: #EDFBF3; color: #065F3E; }
  .qp-option.wrong     { border-color: ${RED};     background: #FEF2F2; color: #7F1D1D; }
  .qp-option.locked    { cursor: default; }
  .qp-option-marker {
    flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 700; background: #F3F4F6; color: #6B6B6B;
    transition: background 0.15s, color 0.15s;
  }
  .qp-option.correct .qp-option-marker  { background: ${GREEN}; color: white; }
  .qp-option.wrong   .qp-option-marker  { background: ${RED};   color: white; }
  .qp-option.selected:not(.correct):not(.wrong) .qp-option-marker { background: ${SAFFRON}; color: white; }

  /* ── Reveal block (post-answer) ── */
  .qp-reveal {
    border-top: 1px solid #E5E7EB; padding: 20px;
    animation: qpFadeIn 0.25s ease both;
  }
  .qp-reveal-label {
    font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    color: ${BLUE}; margin-bottom: 10px;
  }
  .qp-reveal-explanation {
    font-size: 0.9375rem; color: #1F1F1F; line-height: 1.75; margin-bottom: 14px;
  }
  .qp-reveal-block { margin-bottom: 10px; }
  .qp-reveal-block-label { font-size: 0.75rem; font-weight: 700; color: #6B6B6B; text-transform: uppercase; letter-spacing: 0.05em; }
  .qp-reveal-block-value { font-size: 0.875rem; color: #1F1F1F; margin-top: 2px; line-height: 1.6; }

  /* ── Unanswered indicator ── */
  .qp-unanswered-badge {
    margin: 0 20px 16px; padding: 10px 14px; border-radius: 8px;
    background: #FFF3E0; border: 1px solid #FED7AA;
    font-size: 0.8125rem; color: #92400E; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
  }

  /* ── Navigation bar ── */
  .qp-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
    background: white; border-top: 1px solid #E5E7EB;
    padding: 12px 1.5rem; display: flex; align-items: center; gap: 10px;
    max-width: 680px; margin: 0 auto;
  }
  /* full-width fixed needs left/right 0, but max-width centering trick: */
  @media (min-width: 712px) {
    .qp-nav { left: 50%; right: auto; transform: translateX(-50%); width: 680px; border-radius: 14px 14px 0 0; }
  }
  .qp-nav-btn {
    flex: 1; border-radius: 999px; padding: 11px 0; font-size: 0.9375rem; font-weight: 700;
    border: 2px solid #E5E7EB; background: white; color: #4A5565; cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .qp-nav-btn:hover:not(:disabled) { border-color: ${SAFFRON}; color: ${SAFFRON}; }
  .qp-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .qp-nav-btn.primary { background: ${SAFFRON}; border-color: ${SAFFRON}; color: white; }
  .qp-nav-btn.primary:hover:not(:disabled) { background: #E07E00; border-color: #E07E00; color: white; }
  .qp-nav-btn.finish  { background: ${BLUE};   border-color: ${BLUE};   color: white; }
  .qp-nav-btn.finish:hover:not(:disabled) { background: #003E7E; border-color: #003E7E; }

  /* ── Confirmation overlay ── */
  .qp-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .qp-confirm-card {
    background: white; border-radius: 16px; padding: 28px 24px; max-width: 380px; width: 100%;
    text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  }
  .qp-confirm-icon { font-size: 2.5rem; margin-bottom: 12px; }
  .qp-confirm-title { font-family: 'Alumni Sans', sans-serif; font-size: 1.5rem; font-weight: 700; color: #0A0A0A; margin-bottom: 8px; }
  .qp-confirm-body  { font-size: 0.9375rem; color: #4A5565; margin-bottom: 24px; line-height: 1.6; }
  .qp-confirm-btns  { display: flex; flex-direction: column; gap: 10px; }
  .qp-confirm-btn   { border-radius: 999px; padding: 12px; font-size: 0.9375rem; font-weight: 700; cursor: pointer; border: 2px solid transparent; }
  .qp-confirm-btn.primary { background: ${BLUE}; color: white; border-color: ${BLUE}; }
  .qp-confirm-btn.cancel  { background: white; color: #4A5565; border-color: #E5E7EB; }

  /* ── Score screen ── */
  .qp-score-wrap { max-width: 680px; margin: 0 auto; padding: 32px 1rem 120px; }
  .qp-score-card {
    background: white; border-radius: 16px; border: 1px solid #E5E7EB;
    padding: 32px 24px; text-align: center; margin-bottom: 24px;
  }
  .qp-score-emoji { font-size: 3rem; margin-bottom: 12px; }
  .qp-score-title { font-family: 'Alumni Sans', sans-serif; font-size: 2rem; font-weight: 700; color: #0A0A0A; margin-bottom: 4px; }
  .qp-score-subtitle { font-size: 0.9375rem; color: #4A5565; margin-bottom: 20px; }
  .qp-score-numbers {
    display: flex; justify-content: center; gap: 28px; margin-bottom: 16px;
  }
  .qp-score-stat { text-align: center; }
  .qp-score-stat-num { font-family: 'Alumni Sans', sans-serif; font-size: 2.5rem; font-weight: 700; line-height: 1; }
  .qp-score-stat-lbl { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6B6B6B; margin-top: 2px; }
  .qp-score-stat-num.correct  { color: ${GREEN}; }
  .qp-score-stat-num.wrong    { color: ${RED}; }
  .qp-score-stat-num.skipped  { color: #D97706; }

  .qp-pass-badge {
    display: inline-block; border-radius: 999px; padding: 5px 20px; font-size: 0.875rem; font-weight: 700;
    letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 16px;
  }
  .qp-pass-badge.pass { background: #EDFBF3; color: #065F3E; border: 1.5px solid ${GREEN}; }
  .qp-pass-badge.fail { background: #FEF2F2; color: #7F1D1D; border: 1.5px solid ${RED}; }

  .qp-score-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
  .qp-score-btn {
    border-radius: 999px; padding: 13px; font-size: 1rem; font-weight: 700;
    cursor: pointer; border: 2px solid transparent;
  }
  .qp-score-btn.primary  { background: ${SAFFRON}; color: white; border-color: ${SAFFRON}; }
  .qp-score-btn.secondary { background: white; color: ${BLUE}; border-color: ${BLUE}; }
  .qp-score-btn.ghost    { background: white; color: #4A5565; border-color: #E5E7EB; }

  /* ── Answer review ── */
  .qp-review-title {
    font-family: 'Alumni Sans', sans-serif; font-size: 1.25rem; font-weight: 700;
    color: #0A0A0A; margin-bottom: 16px; padding: 0 4px;
  }
  .qp-review-item {
    background: white; border-radius: 12px; border: 1px solid #E5E7EB;
    margin-bottom: 14px; overflow: hidden;
  }
  .qp-review-header {
    padding: 14px 16px 10px; border-bottom: 1px solid #F3F4F6;
    display: flex; align-items: flex-start; gap: 12px;
  }
  .qp-review-icon { font-size: 1.125rem; flex-shrink: 0; margin-top: 2px; }
  .qp-review-q    { font-size: 0.9375rem; font-weight: 600; color: #0A0A0A; line-height: 1.45; }
  .qp-review-answers { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
  .qp-review-ans-row  { font-size: 0.875rem; line-height: 1.5; }
  .qp-review-ans-label { font-weight: 700; color: #6B6B6B; }
  .qp-review-ans-val.correct { color: ${GREEN}; font-weight: 600; }
  .qp-review-ans-val.wrong   { color: ${RED};   font-weight: 600; }
  .qp-review-ans-val.skipped { color: #D97706;  font-weight: 600; }
  .qp-review-explanation {
    padding: 10px 16px 14px; border-top: 1px solid #F3F4F6;
    font-size: 0.875rem; color: #4A5565; line-height: 1.7;
  }

  .qp-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; font-size: 1rem; color: #6B6B6B; }
  .qp-error   { max-width: 480px; margin: 80px auto; text-align: center; color: ${RED}; font-size: 0.9375rem; padding: 1rem; }
`;

const OPTION_LABELS = ["A", "B", "C", "D"];

export default function QuizPlayer({
  quiz,
  questions: rawQuestions = [],
  lesson,
  settings,
  user,
  onBack,
  onDashboard,
  onRetake,
  onSignIn,
  onHome,
  onDiscover,
  onLikes,
  onBookmarks,
  activePage,
  onSaveSettings,
  languages = [],
}) {
  const isTimed = !!(quiz?.question_time_limit);
  const quizTimeLimit = quiz?.time_limit || null; // overall quiz seconds

  // ── Shuffle questions + options on mount ─────────────────────────────────
  const [questions] = useState(() => {
    const qs = quiz?.shuffle_questions ? shuffle(rawQuestions) : [...rawQuestions];
    return qs.map(q => ({
      ...q,
      _options: shuffle([
        { label: q.correct_option, isCorrect: true },
        { label: q.wrong_option_1, isCorrect: false },
        { label: q.wrong_option_2, isCorrect: false },
        { label: q.wrong_option_3, isCorrect: false },
      ])
    }));
  });

  const [current,   setCurrent]   = useState(0);
  // answers: Map<index, { chosen: string|null, isCorrect: bool|null, revealed: bool }>
  const [answers,   setAnswers]   = useState(() => new Map());
  const [phase,     setPhase]     = useState("quiz"); // 'quiz' | 'confirm_finish' | 'score'
  const [saving,    setSaving]    = useState(false);
  const [scoreData, setScoreData] = useState(null);

  // Timers
  const [qTimeLeft,    setQTimeLeft]    = useState(quiz?.question_time_limit || 0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(quizTimeLimit || 0);
  const qTimerRef   = useRef(null);
  const quizTimerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const total = questions.length;
  const q     = questions[current];
  const ans   = answers.get(current);
  const isAnswered  = !!ans;
  const isUnanswered = !ans;

  // ── Question timer ────────────────────────────────────────────────────────
  const clearQTimer = useCallback(() => {
    if (qTimerRef.current) { clearInterval(qTimerRef.current); qTimerRef.current = null; }
  }, []);

  const startQTimer = useCallback(() => {
    if (!isTimed || isAnswered) return;
    clearQTimer();
    setQTimeLeft(quiz.question_time_limit);
    qTimerRef.current = setInterval(() => {
      setQTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(qTimerRef.current);
          qTimerRef.current = null;
          // Record as unanswered (null)
          setAnswers(m => {
            const next = new Map(m);
            if (!next.has(current)) next.set(current, { chosen: null, isCorrect: null, revealed: true });
            return next;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isTimed, isAnswered, quiz, current, clearQTimer]);

  useEffect(() => {
    if (phase !== "quiz") { clearQTimer(); return; }
    startQTimer();
    return clearQTimer;
  }, [current, phase]);

  // ── Quiz-level timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!quizTimeLimit || phase !== "quiz") return;
    quizTimerRef.current = setInterval(() => {
      setQuizTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(quizTimerRef.current);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (quizTimerRef.current) clearInterval(quizTimerRef.current); };
  }, [phase]);

  // ── Answer a question ─────────────────────────────────────────────────────
  function selectOption(optionLabel, isCorrect) {
    if (isAnswered) return;
    clearQTimer();
    setAnswers(m => {
      const next = new Map(m);
      next.set(current, { chosen: optionLabel, isCorrect, revealed: true });
      return next;
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function goNext() {
    if (current < total - 1) { setCurrent(c => c + 1); }
  }
  function goPrev() {
    if (isTimed) return; // disabled in timed mode
    if (current > 0) { setCurrent(c => c - 1); }
  }
  function requestFinish() {
    const unansweredCount = questions.reduce((n, _, i) => n + (answers.has(i) ? 0 : 1), 0);
    if (unansweredCount > 0) {
      setPhase("confirm_finish");
    } else {
      finishQuiz();
    }
  }
  function finishQuiz() {
    clearQTimer();
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);

    let correct = 0, wrong = 0, skipped = 0, totalPoints = 0, earnedPoints = 0;
    const answersArr = questions.map((q, i) => {
      const a = answers.get(i);
      const pts = q.points || 1;
      totalPoints += pts;
      if (!a || a.chosen === null) {
        skipped++;
        return { question_id: q.question_id, question_type: q.question_type, chosen_option: null, correct_option: q.correct_option, is_correct: null, points_awarded: 0 };
      }
      if (a.isCorrect) { correct++; earnedPoints += pts; }
      else { wrong++; }
      return { question_id: q.question_id, question_type: q.question_type, chosen_option: a.chosen, correct_option: q.correct_option, is_correct: a.isCorrect, points_awarded: a.isCorrect ? pts : 0 };
    });

    const passPct = quiz?.pass_percent;
    const passed  = passPct != null ? (earnedPoints / totalPoints * 100) >= passPct : null;

    setScoreData({ correct, wrong, skipped, total, totalPoints, earnedPoints, answersArr, passed });
    setPhase("score");

    // Save attempt
    if (user) {
      setSaving(true);
      saveQuizAttempt(user.id, quiz.quiz_id, earnedPoints, totalPoints, answersArr)
        .finally(() => setSaving(false));
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getOptionClass(opt) {
    if (!isAnswered) return ans?.chosen === opt.label ? "selected" : "";
    const a = answers.get(current);
    if (!a || a.chosen === null) return ""; // unanswered (timer)
    if (opt.isCorrect) return "correct locked";
    if (a.chosen === opt.label) return "wrong locked";
    return "locked";
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  if (!quiz || total === 0) {
    return (
      <div className="qp-wrap">
        <style>{globalStyles}{styles}</style>
        <div className="qp-loading">No questions available for this quiz.</div>
      </div>
    );
  }

  // ── Score Screen ──────────────────────────────────────────────────────────
  if (phase === "score" && scoreData) {
    const { correct, wrong, skipped, passed } = scoreData;
    const emoji = correct === total ? "🏆" : correct >= total / 2 ? "👍" : "📖";

    return (
      <div className="qp-wrap">
        <style>{globalStyles}{styles}</style>
        <div className="qp-topbar">
          <button className="qp-back" onClick={onBack}>
            <i className="ti ti-arrow-left" /> Back
          </button>
          <div className="qp-title">{quiz.title}</div>
          <div style={{ width: 60 }} />
        </div>

        <div className="qp-score-wrap">
          <div className="qp-score-card">
            <div className="qp-score-emoji">{emoji}</div>
            <div className="qp-score-title">Quiz Complete!</div>
            <div className="qp-score-subtitle">{quiz.title}</div>

            {passed !== null && (
              <div className={`qp-pass-badge ${passed ? "pass" : "fail"}`}>
                {passed ? "✓ Passed" : "✗ Not Passed"}
              </div>
            )}

            <div className="qp-score-numbers">
              <div className="qp-score-stat">
                <div className="qp-score-stat-num correct">{correct}</div>
                <div className="qp-score-stat-lbl">Correct</div>
              </div>
              <div className="qp-score-stat">
                <div className="qp-score-stat-num wrong">{wrong}</div>
                <div className="qp-score-stat-lbl">Wrong</div>
              </div>
              {skipped > 0 && (
                <div className="qp-score-stat">
                  <div className="qp-score-stat-num skipped">{skipped}</div>
                  <div className="qp-score-stat-lbl">Skipped</div>
                </div>
              )}
              <div className="qp-score-stat">
                <div className="qp-score-stat-num" style={{ color: BLUE }}>{total}</div>
                <div className="qp-score-stat-lbl">Total</div>
              </div>
            </div>

            <div className="qp-score-actions">
              {onRetake && (
                <button className="qp-score-btn primary" onClick={onRetake}>
                  Retake Quiz
                </button>
              )}
              <button className="qp-score-btn secondary" onClick={onBack}>
                Back to Lessons
              </button>
              <button className="qp-score-btn ghost" onClick={onDashboard}>
                Go to Dashboard
              </button>
            </div>
          </div>

          {/* Answer review */}
          <div className="qp-review-title">Answer Review</div>
          {questions.map((qItem, i) => {
            const a = scoreData.answersArr[i];
            const isCorrect  = a.is_correct === true;
            const isWrong    = a.is_correct === false;
            const isSkipped  = a.is_correct === null;
            const icon = isCorrect ? "✅" : isWrong ? "❌" : "⏭️";

            return (
              <div className="qp-review-item" key={qItem.question_id || i}>
                <div className="qp-review-header">
                  <div className="qp-review-icon">{icon}</div>
                  <div className="qp-review-q">Q{i + 1}. {qItem.question}</div>
                </div>
                <div className="qp-review-answers">
                  {isSkipped ? (
                    <div className="qp-review-ans-row">
                      <span className="qp-review-ans-label">Status: </span>
                      <span className="qp-review-ans-val skipped">Not answered</span>
                    </div>
                  ) : (
                    <>
                      <div className="qp-review-ans-row">
                        <span className="qp-review-ans-label">Your answer: </span>
                        <span className={`qp-review-ans-val ${isCorrect ? "correct" : "wrong"}`}>{a.chosen_option}</span>
                      </div>
                      {!isCorrect && (
                        <div className="qp-review-ans-row">
                          <span className="qp-review-ans-label">Correct answer: </span>
                          <span className="qp-review-ans-val correct">{a.correct_option}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {qItem.explanation && (
                  <div className="qp-review-explanation">{qItem.explanation}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Quiz player ───────────────────────────────────────────────────────────
  const progressPct = ((current) / total) * 100;
  const qTimePct    = isTimed && quiz.question_time_limit ? (qTimeLeft / quiz.question_time_limit) * 100 : 100;
  const quizTimePct = quizTimeLimit ? (quizTimeLeft / quizTimeLimit) * 100 : 100;
  const isUrgent    = isTimed && qTimeLeft <= 5;

  return (
    <div className="qp-wrap">
      <style>{globalStyles}{styles}</style>

      {/* Top bar */}
      <div className="qp-topbar">
        <button className="qp-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <div className="qp-title">{quiz.title}</div>
        <div className="qp-counter">{current + 1} / {total}</div>
      </div>

      {/* Progress bar */}
      <div className="qp-progress">
        <div className="qp-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Quiz-level timer bar */}
      {quizTimeLimit > 0 && (
        <div className="qp-quiz-timer">
          <i className="ti ti-clock" />
          <span>{formatTime(quizTimeLeft)} remaining</span>
          <div className="qp-quiz-timer-bar">
            <div className="qp-quiz-timer-fill" style={{ width: `${quizTimePct}%` }} />
          </div>
        </div>
      )}

      <div className="qp-body">

        {/* Per-question timer */}
        {isTimed && !isAnswered && (
          <div className="qp-q-timer">
            <i className="ti ti-hourglass" />
            <span>{qTimeLeft}s</span>
            <div className="qp-q-timer-bar">
              <div className={`qp-q-timer-fill${isUrgent ? " urgent" : ""}`} style={{ width: `${qTimePct}%` }} />
            </div>
          </div>
        )}

        {/* Unanswered (timer expired) indicator */}
        {isAnswered && ans?.chosen === null && (
          <div className="qp-unanswered-badge">
            <i className="ti ti-clock-x" /> Time expired — this question was not answered
          </div>
        )}

        {/* Question card */}
        <div className="qp-card" key={current}>
          {q.asset?.file_path && (
            <div className="qp-img">
              <img src={q.asset.file_path} alt={q.asset.alt_text || ""} />
            </div>
          )}
          <div className="qp-card-body">
            <div className="qp-q-num">Question {current + 1}</div>
            <div className="qp-question">{q.question}</div>
          </div>

          {/* Options */}
          <div className="qp-options">
            {q._options.map((opt, oi) => (
              <button
                key={opt.label}
                className={`qp-option ${getOptionClass(opt)}`}
                onClick={() => selectOption(opt.label, opt.isCorrect)}
                disabled={isAnswered}
              >
                <span className="qp-option-marker">{OPTION_LABELS[oi]}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Reveal block */}
          {isAnswered && ans?.chosen !== null && (q.explanation || q.key_term || q.life_connection || q.quiz_recap || q.source_citation) && (
            <div className="qp-reveal">
              <div className="qp-reveal-label">Explanation</div>
              {q.explanation && <div className="qp-reveal-explanation">{q.explanation}</div>}
              {q.key_term && (
                <div className="qp-reveal-block">
                  <div className="qp-reveal-block-label">Key Term</div>
                  <div className="qp-reveal-block-value">
                    <strong>{q.key_term}</strong>
                    {q.key_term_meaning ? ` — ${q.key_term_meaning}` : ""}
                  </div>
                </div>
              )}
              {q.life_connection && (
                <div className="qp-reveal-block">
                  <div className="qp-reveal-block-label">Life Connection</div>
                  <div className="qp-reveal-block-value">{q.life_connection}</div>
                </div>
              )}
              {q.quiz_recap && (
                <div className="qp-reveal-block">
                  <div className="qp-reveal-block-label">Refresher</div>
                  <div className="qp-reveal-block-value">{q.quiz_recap}</div>
                </div>
              )}
              {q.source_citation && (
                <div className="qp-reveal-block">
                  <div className="qp-reveal-block-label">Source</div>
                  <div className="qp-reveal-block-value" style={{ color: "#6B6B6B" }}>{q.source_citation}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="qp-nav">
        <button
          className="qp-nav-btn"
          onClick={goPrev}
          disabled={current === 0 || isTimed}
        >
          ← Prev
        </button>
        <button
          className="qp-nav-btn primary"
          onClick={goNext}
          disabled={current === total - 1}
        >
          Next →
        </button>
        <button
          className="qp-nav-btn finish"
          onClick={requestFinish}
        >
          Finish
        </button>
      </div>

      {/* Finish confirmation overlay */}
      {phase === "confirm_finish" && (
        <div className="qp-overlay">
          <div className="qp-confirm-card">
            <div className="qp-confirm-icon">⚠️</div>
            <div className="qp-confirm-title">Submit Quiz?</div>
            <div className="qp-confirm-body">
              You have <strong>{questions.reduce((n, _, i) => n + (answers.has(i) ? 0 : 1), 0)}</strong> unanswered question(s).
              Unanswered questions will not count towards your score.
            </div>
            <div className="qp-confirm-btns">
              <button className="qp-confirm-btn primary" onClick={finishQuiz}>
                Submit Anyway
              </button>
              <button className="qp-confirm-btn cancel" onClick={() => setPhase("quiz")}>
                Go Back &amp; Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
