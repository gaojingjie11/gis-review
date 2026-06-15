import React, { useState, useEffect } from 'react';

export default function TodayReview({ onNavigate, customQueue, customQueueName, practiceMode, onClearCustomQueue, reviewsData }) {
  const [loading, setLoading] = useState(true);
  const [currentPracticeMode, setCurrentPracticeMode] = useState(practiceMode || 'standard');
  const [aiSkipped, setAiSkipped] = useState(false);
  
  const reviews = reviewsData?.reviews || {
    newQuestions: [],
    dueQuestions: [],
    errorReinforcement: [],
    delayedQuestions: [],
    allReviews: []
  };
  
  // Database wide questions for Free Practice
  const [allQuestions, setAllQuestions] = useState([]);
  
  const [activeQueue, setActiveQueue] = useState([]);
  const [queueName, setQueueName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Free Practice Filters
  const [freeSubject, setFreeSubject] = useState('');
  const [freeChapter, setFreeChapter] = useState('');
  const [freeType, setFreeType] = useState('');

  // Study states (Bi-Test Stepper Workflow)
  const [step, setStep] = useState(1); // 1: Cloze (填空), 2: Essay (论述)
  const [clozeAnswers, setClozeAnswers] = useState({});
  const [fullAnswerInput, setFullAnswerInput] = useState('');
  const [clozeScore, setClozeScore] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingResult, setGradingResult] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('cloze'); // 'cloze', 'full'
  
  // Load review queues
  useEffect(() => {
    fetchReviews();
  }, []);

  // Auto-start custom practice queue if passed from parent
  useEffect(() => {
    if (customQueue && customQueue.length > 0) {
      startQueue(customQueueName || '自主练习', customQueue, practiceMode);
    }
  }, [customQueue, customQueueName, practiceMode]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // 1. Fetch all questions for free practice options
      const resAll = await fetch('/api/questions');
      const dataAll = await resAll.json();
      if (dataAll.success) {
        setAllQuestions(dataAll.data);
      }

      // 2. Refresh parent review data
      if (reviewsData && reviewsData.fetchReviews) {
        await reviewsData.fetchReviews();
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const startQueue = (name, list, mode = 'standard') => {
    if (list.length === 0) return;
    setActiveQueue(list);
    setQueueName(name);
    setCurrentIndex(0);
    
    // Resolve mode based on queue name defaults or requested mode
    let targetMode = mode || 'standard';
    if (name === '错题强化') {
      targetMode = 'deep';
    }
    setCurrentPracticeMode(targetMode);
    
    resetStudyState();
  };

  const resetStudyState = () => {
    setStep(1);
    setClozeAnswers({});
    setFullAnswerInput('');
    setClozeScore(0);
    setIsSubmitted(false);
    setGradingResult(null);
    setIsGrading(false);
    setActiveReportTab('cloze');
    setAiSkipped(false);
  };

  // Reset study state whenever question index or queue changes
  useEffect(() => {
    if (activeQueue.length > 0) {
      resetStudyState();
    }
  }, [currentIndex, activeQueue]);

  // --- Cloze validation and loose grading helpers ---
  const shouldDigKeyword = (kw, questionTitle, clozeAnswer) => {
    if (!kw || typeof kw !== 'string') return false;
    
    const cleanStr = (s) => (s || '').toLowerCase().replace(/[\s\(\)（）\-\_\,\.\?\!\，\。等是：\:：；;\s]/g, '');
    const cleanKw = cleanStr(kw);
    const cleanTitle = cleanStr(questionTitle);
    
    if (cleanKw.length < 2) return false; // Too short to be a meaningful blank
    
    // Rule 1: Do not dig if keyword is inside title or title is inside keyword
    if (cleanTitle.includes(cleanKw) || cleanKw.includes(cleanTitle)) {
      return false;
    }
    
    // Rule 2: Do not dig opening repetition of the concept
    const kwIndex = clozeAnswer.toLowerCase().indexOf(kw.toLowerCase());
    if (kwIndex !== -1 && kwIndex < 20) {
      let commonChars = 0;
      for (const char of cleanKw) {
        if (cleanTitle.includes(char)) commonChars++;
      }
      if (commonChars / cleanKw.length > 0.5) {
        return false;
      }
    }

    // Rule 3: Do not dig words around/before/after hint tags
    if (kwIndex !== -1) {
      const startIdx = Math.max(0, kwIndex - 20);
      const precedingText = clozeAnswer.substring(startIdx, kwIndex);
      const hintRegex = /(核心定义|基本本质|主要包括|是指|概念|定义|本质|包括|即为|称为|简述)[：:\s是]*$/i;
      if (hintRegex.test(precedingText.trim())) {
        let commonChars = 0;
        for (const char of cleanKw) {
          if (cleanTitle.includes(char)) commonChars++;
        }
        if (commonChars / cleanKw.length > 0.4) {
          return false;
        }
      }
    }

    return true;
  };

  const isClozeAnswerCorrect = (userAns, standardKw) => {
    if (!userAns || !standardKw) return false;
    
    const cleanStr = (s) => s.toLowerCase().replace(/[\s\(\)（）\-\_\,\.\?\!\，\。等是：\:：；;\"\'“”‘’]/g, '');
    const u = cleanStr(userAns);
    const s = cleanStr(standardKw);
    
    if (!u || !s) return false;
    
    // Rule 1: Exact match
    if (u === s) return true;
    
    // Rule 2: Inclusion match (length >= 2 to avoid trivial matches)
    if (u.length >= 2 && (s.includes(u) || u.includes(s))) {
      return true;
    }
    
    // Rule 3: Synonym dictionary match
    const SYNONYMS = [
      ["gis", "地理信息系统"],
      ["gps", "全球定位系统"],
      ["rs", "遥感"],
      ["空间", "地理空间"],
      ["属性", "非几何"],
      ["矢量", "向量"],
      ["栅格", "网格", "象元"],
      ["拓扑", "空间拓扑"],
      ["元数据", "metadata"],
      ["客户端", "client"],
      ["服务端", "server"],
      ["数据库", "db"]
    ];
    
    for (const group of SYNONYMS) {
      const stdMatches = group.some(item => s.includes(cleanStr(item)) || cleanStr(item).includes(s));
      const userMatches = group.some(item => u.includes(cleanStr(item)) || cleanStr(item).includes(u));
      if (stdMatches && userMatches) {
        return true;
      }
    }
    
    // Rule 4: Typo / Character overlap (length >= 3, threshold 70%)
    if (s.length >= 3) {
      let matchCount = 0;
      const sChars = s.split('');
      const uChars = u.split('');
      const matchedIndices = new Set();
      
      uChars.forEach(char => {
        const idx = sChars.findIndex((sChar, index) => sChar === char && !matchedIndices.has(index));
        if (idx !== -1) {
          matchCount++;
          matchedIndices.add(idx);
        }
      });
      
      const maxLen = Math.max(s.length, u.length);
      if (matchCount / maxLen >= 0.7) {
        return true;
      }
    }
    
    return false;
  };

  const getFilteredClozeParts = (questionTitle, clozeAnswer) => {
    const parts = (clozeAnswer || '').split(/(\*\*.*?\*\*)/);
    const processedParts = [];
    let dugCount = 0;
    
    parts.forEach((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const kw = part.slice(2, -2);
        const isValid = shouldDigKeyword(kw, questionTitle, clozeAnswer);
        
        if (isValid && dugCount < 5) {
          processedParts.push({
            type: 'blank',
            text: kw,
            inputKey: `kw_${dugCount}`
          });
          dugCount++;
        } else {
          processedParts.push({
            type: 'text',
            text: kw,
            isBold: true
          });
        }
      } else {
        processedParts.push({
          type: 'text',
          text: part,
          isBold: false
        });
      }
    });

    return { processedParts, dugCount };
  };

  // Step 1: Cloze evaluation locally, transition to Step 2
  const handleClozeNext = () => {
    const currentQ = activeQueue[currentIndex];
    if (!currentQ) return;

    const { processedParts, dugCount } = getFilteredClozeParts(currentQ.question, currentQ.cloze_answer);
    let correctCount = 0;

    processedParts.forEach((part) => {
      if (part.type === 'blank') {
        const ans = (clozeAnswers[part.inputKey] || '').trim();
        if (isClozeAnswerCorrect(ans, part.text)) {
          correctCount++;
        }
      }
    });

    const score = dugCount > 0 ? parseFloat(((correctCount / dugCount) * 10).toFixed(1)) : 10;
    setClozeScore(score);
    setStep(2);
  };

  // Step 2: Submit all answers for combined AI grading
  const handleCombinedSubmit = async () => {
    const currentQ = activeQueue[currentIndex];
    if (!currentQ) return;

    setIsGrading(true);
    setIsSubmitted(true);
    
    try {
      const res = await fetch('/api/ai/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          clozeScore: clozeScore,
          clozeAnswers,
          fullAnswerInput: fullAnswerInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setGradingResult(data.data);
      } else {
        await window.customAlert('AI 联合评分失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      await window.customAlert('打分请求错误，请检查网络或后端配置。');
    } finally {
      setIsGrading(false);
    }
  };

  // For Quick Mode: submit cloze answers, grade locally, and save attempt
  const handleClozeSubmit = async () => {
    const currentQ = activeQueue[currentIndex];
    if (!currentQ) return;

    setIsGrading(true);
    setIsSubmitted(true);

    const { processedParts, dugCount } = getFilteredClozeParts(currentQ.question, currentQ.cloze_answer);
    let correctCount = 0;

    processedParts.forEach((part) => {
      if (part.type === 'blank') {
        const ans = (clozeAnswers[part.inputKey] || '').trim();
        if (isClozeAnswerCorrect(ans, part.text)) {
          correctCount++;
        }
      }
    });

    const score = dugCount > 0 ? parseFloat(((correctCount / dugCount) * 10).toFixed(1)) : 10;
    setClozeScore(score);

    try {
      const res = await fetch('/api/cloze/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          score: score,
          answers: clozeAnswers,
          result: {
            score: score,
            full_evaluation: {
              score: score,
              level: score >= 8 ? '熟练掌握' : score >= 5 ? '基本掌握' : '模糊印象',
              covered_points: [],
              missing_points: [],
              wrong_points: [],
              suggestion: '快速复习模式：仅填空自测。',
              exam_comment: `[本地评分] 填空正确率: ${score * 10}%`
            }
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setGradingResult({
          clozeScore: score,
          fullScore: null,
          totalScore: score,
          full_evaluation: {
            score: score,
            level: score >= 8 ? '熟练掌握' : score >= 5 ? '基本掌握' : '模糊印象',
            covered_points: [],
            missing_points: [],
            wrong_points: [],
            suggestion: '快速复习模式已完成填空核对，论述部分已跳过。',
            exam_comment: `填空正确率: ${score * 10}%`
          }
        });
      } else {
        await window.customAlert('保存填空结果失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      await window.customAlert('打分请求错误，请检查网络或后端配置。');
    } finally {
      setIsGrading(false);
    }
  };

  // For Standard Mode: submit answers and grade using local keyword matching (bypass LLM)
  const handleSkipAI = async () => {
    const currentQ = activeQueue[currentIndex];
    if (!currentQ) return;

    setIsGrading(true);
    setIsSubmitted(true);
    setAiSkipped(true);

    try {
      const res = await fetch('/api/ai/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          clozeScore: clozeScore,
          clozeAnswers,
          fullAnswerInput: fullAnswerInput.trim(),
          skipAI: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setGradingResult(data.data);
      } else {
        await window.customAlert('保存评阅结果失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      await window.customAlert('打分请求错误，请检查网络或后端配置。');
    } finally {
      setIsGrading(false);
    }
  };

  // Standard Mode: Request AI detailed review recheck and save to database
  const handleRequestAiRecheck = async () => {
    const currentQ = activeQueue[currentIndex];
    if (!currentQ) return;

    setIsGrading(true);

    try {
      const res = await fetch('/api/ai/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          clozeScore: clozeScore,
          clozeAnswers,
          fullAnswerInput: fullAnswerInput.trim(),
          skipAI: false
        })
      });
      const data = await res.json();
      if (data.success) {
        setGradingResult(data.data);
        setAiSkipped(false);
        if (reviewsData && reviewsData.fetchReviews) {
          await reviewsData.fetchReviews();
        }
      } else {
        await window.customAlert('AI 复核评估失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      await window.customAlert('打分请求错误，请检查网络或后端配置。');
    } finally {
      setIsGrading(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < activeQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetStudyState();
    } else {
      await window.customAlert('恭喜你，完成了本次复习！');
      if (customQueue) {
        onClearCustomQueue();
        onNavigate('daily-practice');
      } else {
        fetchReviews();
        setActiveQueue([]);
        setQueueName('');
      }
    }
  };

  // --- Helper: Render standard answer with input boxes for Cloze mode ---
  const renderClozeText = (questionTitle, description) => {
    const { processedParts } = getFilteredClozeParts(questionTitle, description);
    
    return processedParts.map((part, index) => {
      if (part.type === 'blank') {
        const standardKw = part.text;
        const inputKey = part.inputKey;
        
        const userAnswer = (clozeAnswers[inputKey] || '').trim();
        const isCorrect = isClozeAnswerCorrect(userAnswer, standardKw);
        
        return (
          <span key={index} style={{ display: 'inline-flex', alignItems: 'center', margin: '0 4px', verticalAlign: 'middle' }}>
            <input
              type="text"
              className={`cloze-input ${isSubmitted ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
              placeholder="请输入"
              value={clozeAnswers[inputKey] || ''}
              onChange={(e) => handleClozeChange(inputKey, e.target.value)}
              disabled={isSubmitted}
              style={{
                width: `${Math.max(standardKw.length * 16, 90)}px`,
                padding: '0.2rem 0.5rem',
                fontSize: '0.9rem',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-primary)',
                textAlign: 'center',
                borderColor: isSubmitted ? (isCorrect ? 'var(--success)' : 'var(--danger)') : 'var(--border-color)'
              }}
            />
            {isSubmitted && !isCorrect && (
              <span className="cloze-correction" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginLeft: '4px', fontWeight: 'bold' }}>
                ({standardKw})
              </span>
            )}
          </span>
        );
      }
      return part.isBold ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>;
    });
  };

  const handleClozeChange = (key, val) => {
    setClozeAnswers(prev => ({ ...prev, [key]: val }));
  };

  // Unique filters for Free Practice options
  const subjects = [...new Set(allQuestions.map(q => q.subject).filter(Boolean))];
  const chapters = [...new Set(allQuestions.map(q => q.chapter).filter(Boolean))];

  // Calculate count for current Free Practice filter selections
  const filteredFreeList = allQuestions.filter(q => {
    const subMatch = !freeSubject || q.subject === freeSubject;
    const chapMatch = !freeChapter || q.chapter === freeChapter;
    const typeMatch = !freeType || q.question_type === freeType;
    return subMatch && chapMatch && typeMatch;
  });

  const startFreePractice = async () => {
    if (filteredFreeList.length === 0) {
      await window.customAlert('所选分类中没有匹配的背诵题目。');
      return;
    }
    startQueue(`自由练习 (${freeType || '全部题型'})`, filteredFreeList);
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>正在为你生成今日专属复习计划...</p>
      </div>
    );
  }

  // Render Queue Selection Screen
  if (activeQueue.length === 0) {
    const totalDueCount = reviews.dueQuestions.length + reviews.delayedQuestions.length;
    
    return (
      <div className="today-review-panel animate-fade">
        <div className="section-title">
          <span>📅 今日复习任务</span>
        </div>

        <div className="dashboard-grid">
          {/* Left Side Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Main action card */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifySpace: 'between', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
                  今日复习推荐
                </h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  根据艾宾浩斯记忆规律与莱特纳卡片盒算法，今天共有 <strong>{reviewsData?.actualDueCount || 0}</strong> 道到期复习题目，今日计划复习 <strong>{reviewsData?.dueReviewCount || 0}</strong> 道。
                  包含 <strong>{reviews.delayedQuestions.length}</strong> 道延误题目，以及 <strong>{reviews.dueQuestions.length}</strong> 道到期复习题目。
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {(reviewsData?.dueReviewCount || 0) > 0 ? (
                  <button 
                    className="text-btn primary-btn" 
                    style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
                    onClick={() => startQueue('今日复习', reviewsData.cappedReviewQueue, 'standard')}
                  >
                    🚀 开始今日复习 ({reviewsData.dueReviewCount})
                  </button>
                ) : (reviewsData?.cappedLearnQueue?.length || 0) > 0 ? (
                  <button 
                    className="text-btn primary-btn" 
                    style={{ padding: '0.8rem 2rem', fontSize: '1rem', background: 'var(--primary)', boxShadow: '0 0 15px rgba(0, 210, 255, 0.4)' }}
                    onClick={() => startQueue('新题学习', reviewsData.cappedLearnQueue, 'standard')}
                  >
                    🆕 开始新题学习 ({reviewsData.cappedLearnQueue.length})
                  </button>
                ) : (
                  <button 
                    className="text-btn primary-btn" 
                    style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
                    disabled={true}
                  >
                    🎉 今日任务已全部完成！
                  </button>
                )}
                <button 
                  className="text-btn" 
                  onClick={() => onNavigate('home')}
                >
                  返回首页
                </button>
              </div>
            </div>

            {/* Free Practice Card */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>🎲 自由回忆自测</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  按科目、章节、题型（名词解释、简答、论述）筛选您的背诵题库进行自定义特训。
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Subject filter */}
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>科目</label>
                  <select 
                    className="form-input-text" 
                    value={freeSubject} 
                    onChange={(e) => setFreeSubject(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.8rem', height: 'auto' }}
                  >
                    <option value="">全部科目</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Chapter filter */}
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>章节</label>
                  <select 
                    className="form-input-text" 
                    value={freeChapter} 
                    onChange={(e) => setFreeChapter(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.8rem', height: 'auto' }}
                  >
                    <option value="">全部章节</option>
                    {chapters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Type filter */}
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem' }}>题型</label>
                  <select 
                    className="form-input-text" 
                    value={freeType} 
                    onChange={(e) => setFreeType(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.8rem', height: 'auto' }}
                  >
                    <option value="">全部题型</option>
                    <option value="名词解释">名词解释</option>
                    <option value="简答题">简答题</option>
                    <option value="论述题">论述题</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button 
                  className="text-btn" 
                  onClick={startFreePractice} 
                  disabled={filteredFreeList.length === 0}
                  style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
                >
                  🎯 开始自由练习 ({filteredFreeList.length} 题)
                </button>
              </div>
            </div>

          </div>

          {/* Right Side Column: Queues grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Category selection */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>🎯 专项学习通道</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* 1. Delayed / Overdue */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontWeight: '600', color: 'var(--danger)' }}>⚠️ 拖延未复习</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>超过2天没有进行复习的题目</span>
                  </div>
                  <button 
                    className="text-btn" 
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={reviews.delayedQuestions.length === 0}
                    onClick={() => startQueue('拖延未复习', reviews.delayedQuestions)}
                  >
                    开始 ({reviews.delayedQuestions.length})
                  </button>
                </div>

                {/* 2. Error Reinforcement */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontWeight: '600', color: 'var(--warning)' }}>❌ 错题/弱点强化</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>多次答错或近期低于5分的盲区题目</span>
                  </div>
                  <button 
                    className="text-btn" 
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={reviews.errorReinforcement.length === 0}
                    onClick={() => startQueue('错题强化', reviews.errorReinforcement)}
                  >
                    开始 ({reviews.errorReinforcement.length})
                  </button>
                </div>

                {/* 3. New Questions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                  <div>
                    <span style={{ fontWeight: '600', color: 'var(--primary)' }}>🆕 新题学习</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>尚未加入记忆序列的新知识点</span>
                  </div>
                  <button 
                    className="text-btn" 
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                    disabled={(reviewsData?.cappedLearnQueue?.length || 0) === 0}
                    onClick={() => startQueue('新题学习', reviewsData.cappedLearnQueue, 'standard')}
                  >
                    开始 ({reviewsData?.cappedLearnQueue?.length || 0})
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active recall study screen
  const currentQ = activeQueue[currentIndex];

  return (
    <div className="active-recall-container animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Header Info */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem' }}>
            {queueName} ({currentIndex + 1} / {activeQueue.length})
          </span>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            科目: {currentQ.subject} | 章节: {currentQ.chapter}
          </h4>
        </div>
        <button 
          className="text-btn" 
          style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
          onClick={async () => {
            if (await window.customConfirm('确认退出本次复习？')) {
              if (customQueue) {
                onClearCustomQueue();
                onNavigate('daily-practice');
              } else {
                setActiveQueue([]);
                setQueueName('');
                fetchReviews();
              }
            }
          }}
        >
          退出复习
        </button>
      </div>

      {/* Stepper Header (Disabled if submitted) */}
      {!isSubmitted && currentPracticeMode !== 'quick' && (
        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(16, 22, 42, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step >= 1 ? 1 : 0.4 }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: step === 1 ? 'var(--primary)' : 'rgba(0, 210, 255, 0.2)',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                color: '#fff',
                boxShadow: step === 1 ? '0 0 10px var(--primary)' : 'none'
              }}>1</div>
              <span style={{ fontSize: '0.85rem', fontWeight: step === 1 ? 'bold' : 'normal' }}>填空自测</span>
            </div>
            <div style={{ flexGrow: 1, height: '2px', background: step >= 2 ? 'var(--primary)' : 'var(--border-color)' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step >= 2 ? 1 : 0.4 }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: step === 2 ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                border: step >= 2 ? '2px solid var(--primary)' : '2px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                color: '#fff',
                boxShadow: step === 2 ? '0 0 10px var(--primary)' : 'none'
              }}>2</div>
              <span style={{ fontSize: '0.85rem', fontWeight: step === 2 ? 'bold' : 'normal' }}>论述自测</span>
            </div>
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', background: 'rgba(16, 22, 42, 0.45)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{
            fontSize: '0.75rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 210, 255, 0.15)',
            color: 'var(--primary)',
            fontWeight: '600'
          }}>
            {currentQ.question_type || '名词解释'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            掌握等级: Box {currentQ.mastery_level}
          </span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '700', lineHeight: '1.4' }}>
          {currentQ.question}
        </h2>
      </div>

      {/* Input Area (Stepper) */}
      {!isSubmitted && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {step === 1 && (
            /* Step 1: Cloze test */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>🧩 第一步：请填入正确的加粗关键字</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  挖空数量: {getFilteredClozeParts(currentQ.question, currentQ.cloze_answer).dugCount}空
                </span>
              </div>
              
              <div style={{ 
                padding: '1.5rem', 
                background: 'rgba(0, 0, 0, 0.25)', 
                borderRadius: '8px', 
                lineHeight: '2.2', 
                fontSize: '1rem',
                border: '1px solid var(--border-color)',
                whiteSpace: 'pre-line'
              }}>
                {renderClozeText(currentQ.question, currentQ.cloze_answer)}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                {currentPracticeMode === 'quick' ? (
                  <button
                    type="button"
                    className="text-btn primary-btn"
                    onClick={handleClozeSubmit}
                    style={{ padding: '0.6rem 2rem' }}
                  >
                    提交检查 ➔
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-btn primary-btn"
                    onClick={handleClozeNext}
                    style={{ padding: '0.6rem 2rem' }}
                  >
                    下一步：论述自测 ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            /* Step 2: Essay */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontWeight: '600', fontSize: '0.95rem', display: 'block' }}>✍️ 第二步：详细论述自测</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  要求：尽量完整详尽地写出所有展开细节、背景理论及完整的对比阐述。
                </span>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--accent)', 
                  background: 'rgba(0, 210, 255, 0.1)', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '6px', 
                  marginTop: '0.5rem',
                  borderLeft: '3px solid var(--accent)'
                }}>
                  💡 <strong>提示：</strong>请先回忆核心定义、关键词和主要要点，再尽量写成考场可直接作答的完整答案。
                </div>
              </div>
              
              <textarea
                className="form-input-text"
                placeholder="在此写下完整的论述答案。AI 随后将对您的论述细节进行判卷评分..."
                value={fullAnswerInput}
                onChange={(e) => setFullAnswerInput(e.target.value)}
                style={{
                  minHeight: '220px',
                  lineHeight: '1.6',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.2)'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => setStep(1)}
                  style={{ padding: '0.6rem 1.5rem' }}
                >
                  ↩️ 返回填空
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {currentPracticeMode === 'standard' && (
                    <button
                      type="button"
                      className="text-btn"
                      onClick={handleSkipAI}
                      style={{ padding: '0.6rem 1.5rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    >
                      🔍 查看答案并跳过 AI
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-btn primary-btn"
                    onClick={handleCombinedSubmit}
                    style={{ padding: '0.6rem 2.5rem' }}
                  >
                    🚀 提交整题 AI 阅卷评估
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grading / Results Area */}
      {isSubmitted && (
        <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isGrading ? (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1.5rem', color: 'var(--primary)', fontWeight: '500', fontSize: '1.05rem' }}>
                考研辅导 AI 正在评阅您的卷面，请稍候...
              </p>
            </div>
          ) : (
            gradingResult && (
              <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: `5px solid ${gradingResult.totalScore >= 8 ? 'var(--success)' : gradingResult.totalScore >= 5 ? 'var(--info)' : 'var(--danger)'}` }}>
                
                {/* Total Score Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)' }}>📊 综合考评阅卷报告</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      计算权重：填空（40%）+ 论述（60%）。综合评分将更新卡片复习间隔。
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '2.2rem', 
                      fontWeight: '800', 
                      color: gradingResult.totalScore >= 8 ? 'var(--success)' : gradingResult.totalScore >= 5 ? 'var(--info)' : 'var(--danger)',
                      fontFamily: 'var(--font-display)'
                    }}>
                      {gradingResult.totalScore} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/ 10分</span>
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.1rem 0.5rem', 
                      borderRadius: '4px',
                      background: gradingResult.totalScore >= 8 ? 'rgba(16, 185, 129, 0.15)' : gradingResult.totalScore >= 5 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: gradingResult.totalScore >= 8 ? 'var(--success)' : gradingResult.totalScore >= 5 ? 'var(--info)' : 'var(--danger)',
                      fontWeight: 'bold'
                    }}>
                      {gradingResult.totalScore >= 8 ? '优秀掌握' : gradingResult.totalScore >= 5 ? '基本合格' : '需强化复习'}
                    </span>
                  </div>
                </div>

                {/* Weighted Sub-Scores Cards */}
                {currentPracticeMode !== 'quick' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '0.75rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>填空自测 (40%)</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0.2rem 0', color: 'var(--text-primary)' }}>
                        {gradingResult.clozeScore} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 10</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>折合加权: {(gradingResult.clozeScore * 0.4).toFixed(1)}分</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '0.75rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>论述细节 (60%)</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0.2rem 0', color: 'var(--text-primary)' }}>
                        {gradingResult.fullScore} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 10</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>折合加权: {(gradingResult.fullScore * 0.6).toFixed(2)}分</span>
                    </div>
                  </div>
                )}

                {/* Tabbed Report Selector */}
                {currentPracticeMode !== 'quick' && (
                  <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginTop: '0.5rem', paddingBottom: '0.5rem' }}>
                    <button 
                      type="button" 
                      className={`nav-tab ${activeReportTab === 'cloze' ? 'active' : ''}`}
                      onClick={() => setActiveReportTab('cloze')}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 1rem' }}
                    >
                      🧩 填空核对
                    </button>
                    <button 
                      type="button" 
                      className={`nav-tab ${activeReportTab === 'full' ? 'active' : ''}`}
                      onClick={() => setActiveReportTab('full')}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 1rem' }}
                    >
                      📝 论述细节分析
                    </button>
                  </div>
                )}

                {/* Tab Content 1: Cloze */}
                {(activeReportTab === 'cloze' || currentPracticeMode === 'quick') && (
                  <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '600' }}>🧩 填空对照分析</h4>
                    <div style={{ 
                      padding: '1.25rem', 
                      background: 'rgba(0, 0, 0, 0.25)', 
                      borderRadius: '8px', 
                      lineHeight: '2.2', 
                      fontSize: '0.95rem',
                      border: '1px solid var(--border-color)',
                      whiteSpace: 'pre-line'
                    }}>
                      {renderClozeText(currentQ.question, currentQ.cloze_answer)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      说明：加粗部分为记忆核心词。答错词后面会用括号标注标准词汇。
                    </div>
                  </div>
                )}

                {/* Tab Content 2: Essay */}
                {currentPracticeMode !== 'quick' && activeReportTab === 'full' && (
                  <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                        <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 'bold' }}>🟢 叙述充分细节要点 ({gradingResult.full_evaluation?.covered_points?.length || 0})</span>
                        <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                          {gradingResult.full_evaluation?.covered_points?.length > 0 ? (
                            gradingResult.full_evaluation.covered_points.map((pt, i) => <li key={i}>{pt}</li>)
                          ) : <li style={{ listStyle: 'none', color: 'var(--text-muted)' }}>无详细论述对上</li>}
                        </ul>
                      </div>
                      <div className="glass-panel" style={{ padding: '0.85rem', background: 'rgba(239, 68, 68, 0.03)', borderColor: 'rgba(239, 68, 68, 0.15)' }}>
                        <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 'bold' }}>🔴 阐述不够或遗漏细节 ({gradingResult.full_evaluation?.missing_points?.length || 0})</span>
                        <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                          {gradingResult.full_evaluation?.missing_points?.length > 0 ? (
                            gradingResult.full_evaluation.missing_points.map((pt, i) => <li key={i}>{pt}</li>)
                          ) : <li style={{ listStyle: 'none', color: 'var(--success)' }}>论述非常饱满，无细节遗漏！</li>}
                        </ul>
                      </div>
                    </div>

                    {gradingResult.full_evaluation?.wrong_points?.length > 0 && (
                      <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <strong style={{ color: 'var(--danger)' }}>⚠️ 错漏之处：</strong>
                        <span style={{ color: 'var(--text-primary)' }}>{gradingResult.full_evaluation.wrong_points.join('；')}</span>
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>🧑‍🏫 深度卷面点评</span>
                      <p style={{ fontSize: '0.85rem', lineHeight: '1.5', fontStyle: 'italic', margin: '0.25rem 0' }}>
                        “ {gradingResult.full_evaluation?.exam_comment || '无'} ”
                      </p>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>💡 论证改进建议</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
                        {gradingResult.full_evaluation?.suggestion || '无'}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📋 参考最完整论述答案</span>
                      <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', fontSize: '0.85rem', whiteSpace: 'pre-line', marginTop: '0.25rem', lineHeight: '1.6' }}>
                        {currentQ.full_answer}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    {currentPracticeMode === 'standard' && aiSkipped && (
                      <button 
                        type="button"
                        className="text-btn"
                        style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: 'var(--bg-dark)', fontWeight: '700' }}
                        onClick={handleRequestAiRecheck}
                      >
                        🧠 申请 AI 深度阅卷复核
                      </button>
                    )}
                  </div>
                  <button 
                    className="text-btn primary-btn"
                    style={{ padding: '0.75rem 2.5rem' }}
                    onClick={handleNext}
                  >
                    {currentIndex < activeQueue.length - 1 ? '下一题' : '完成复习'}
                  </button>
                </div>

              </div>
            )
          )}
        </div>
      )}

    </div>
  );
}
