import React, { useState, useEffect, useRef } from 'react';

export default function ReciteCard({ recitationData, onRateCard }) {
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedChapter, setSelectedChapter] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [maskKeywords, setMaskKeywords] = useState(true);
  const [revealedKeywords, setRevealedKeywords] = useState({});
  
  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  
  const synthRef = useRef(window.speechSynthesis);
  const sentencesRef = useRef([]);
  const currentUtteranceRef = useRef(null);
  const currentSentenceIdxRef = useRef(-1);

  // Extract unique subjects and chapters from flat questions list
  const subjects = [...new Set(recitationData.map(q => q.subject).filter(Boolean))];
  const chapters = [...new Set(recitationData.map(q => q.chapter).filter(Boolean))];

  // Filter cards based on subject and chapter
  const filteredCards = recitationData.filter(q => {
    const subjectMatch = selectedSubject === 'all' || q.subject === selectedSubject;
    const chapterMatch = selectedChapter === 'all' || q.chapter === selectedChapter;
    return subjectMatch && chapterMatch;
  });

  const currentCard = filteredCards[currentIndex];

  // Reset when filters change
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    stopTTS();
  }, [selectedSubject, selectedChapter]);

  // Reset flip when card changes
  useEffect(() => {
    setIsFlipped(false);
    setRevealedKeywords({});
    stopTTS();
  }, [currentIndex]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, []);

  const handleFlip = (e) => {
    if (
      e.target.classList.contains('keyword-masked') || 
      e.target.closest('.eval-btn') || 
      e.target.closest('.tts-controls-panel') ||
      e.target.closest('.nav-buttons-row') ||
      e.target.closest('.custom-select') ||
      e.target.closest('.switch')
    ) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleRate = async (rating) => {
    if (currentCard) {
      await onRateCard(currentCard.id, rating);
      // Automatically advance to next card after rating
      if (currentIndex < filteredCards.length - 1) {
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
        }, 300);
      } else {
        await window.customAlert('这是本分类的最后一张卡片啦！已完成本轮自评。');
      }
    }
  };

  const toggleKeyword = (kw, index) => {
    const key = `${kw}_${index}`;
    setRevealedKeywords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // --- TTS Implementation ---
  const splitIntoSentences = (text) => {
    const cleanText = text.replace(/\*\*/g, '');
    const matches = cleanText.split(/([。！吗？；;!?\n])/);
    const sentences = [];
    for (let i = 0; i < matches.length; i += 2) {
      const sentence = (matches[i] || '') + (matches[i + 1] || '');
      if (sentence.trim()) {
        sentences.push(sentence.trim());
      }
    }
    return sentences;
  };

  const startTTS = () => {
    if (!currentCard) return;
    
    stopTTS();
    
    const fullText = `概念：${currentCard.question}。填空答案是：${currentCard.cloze_answer || ''}。简答要点是：${currentCard.short_answer || ''}。论述细节是：${currentCard.full_answer || ''}`;
    const sentences = splitIntoSentences(fullText);
    sentencesRef.current = sentences;
    currentSentenceIdxRef.current = 0;
    
    setIsSpeaking(true);
    speakSentence();
  };

  const speakSentence = () => {
    if (!synthRef.current) return;
    
    const idx = currentSentenceIdxRef.current;
    if (idx >= sentencesRef.current.length) {
      stopTTS();
      return;
    }

    setActiveSentenceIndex(idx);
    const text = sentencesRef.current[idx];
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = ttsSpeed;
    
    utterance.onend = () => {
      currentSentenceIdxRef.current += 1;
      speakSentence();
    };

    utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      stopTTS();
    };

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const stopTTS = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setActiveSentenceIndex(-1);
    currentSentenceIdxRef.current = -1;
  };

  const toggleTTS = () => {
    if (isSpeaking) {
      stopTTS();
    } else {
      startTTS();
    }
  };

  useEffect(() => {
    if (isSpeaking) {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      speakSentence();
    }
  }, [ttsSpeed]);

  const renderDescription = (description) => {
    const parts = description.split(/(\*\*.*?\*\*)/);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const kw = part.slice(2, -2);
        const isRevealed = !maskKeywords || revealedKeywords[`${kw}_${index}`];
        return (
          <span 
            key={index} 
            className={`keyword ${maskKeywords ? 'keyword-masked' : ''} ${isRevealed ? 'revealed' : ''}`}
            onClick={() => toggleKeyword(kw, index)}
            title={maskKeywords ? "点击显现/遮罩" : ""}
          >
            {kw}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const renderSentencesHighlight = (description) => {
    const parts = description.split(/([。！吗？；;!?\n])/);
    const sentences = [];
    for (let i = 0; i < parts.length; i += 2) {
      const sentence = (parts[i] || '') + (parts[i + 1] || '');
      if (sentence.trim()) {
        sentences.push(sentence);
      }
    }

    return sentences.map((sentence, index) => {
      const isCurrentSpoken = isSpeaking && (activeSentenceIndex === index + 2);
      return (
        <span key={index} className={isCurrentSpoken ? 'tts-reading-sentence' : ''}>
          {renderDescription(sentence)}
        </span>
      );
    });
  };

  if (!currentCard) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h3>暂无背诵卡片</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>请尝试调整分类筛选，或前往“编辑题库”新增内容。</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
          <select className="custom-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            <option value="all">所有科目</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="custom-select" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}>
            <option value="all">所有章节</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="recite-container animate-fade">
      {/* Recite Toolbar */}
      <div className="recite-toolbar" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select className="custom-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            <option value="all">所有科目</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="custom-select" value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)}>
            <option value="all">所有章节</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="toolbar-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>核心词隐藏</span>
          <label className="switch">
            <input type="checkbox" checked={maskKeywords} onChange={(e) => setMaskKeywords(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Spaced Repetition Card Box */}
      <div className={`flashcard-wrapper ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
        <div className="flashcard-inner">
          
          {/* Card Front */}
          <div className="flashcard-face glass-panel flashcard-front">
            <div className="card-index">
              {currentCard.chapter} • {currentIndex + 1} / {filteredCards.length}
            </div>
            
            <div className="card-title" style={{ fontSize: '1.6rem', padding: '0 1rem' }}>
              {currentCard.question}
            </div>
            
            <div className="card-hint">
              <span>🖱️ 点击卡片翻面显示释义</span>
            </div>
          </div>
          
          {/* Card Back */}
          <div className="flashcard-face glass-panel flashcard-back" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-content-header" style={{ marginBottom: '0.5rem' }}>
              <span>{currentCard.question}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {currentCard.chapter} • 三合一复习卡
              </span>
            </div>
            
            <div className="card-points-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
              
              {/* Cloze section */}
              <div className="card-point-item" style={{ fontSize: '0.95rem', lineHeight: '1.6', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <span className="point-concept" style={{ color: 'var(--primary)', fontWeight: '600', marginRight: '0.5rem', display: 'block', marginBottom: '0.25rem' }}>
                  🧩 填空背诵要点
                </span>
                <div style={{ color: 'var(--text-primary)' }}>
                  {renderSentencesHighlight(currentCard.cloze_answer)}
                </div>
              </div>

              {/* Short answer section */}
              <div className="card-point-item" style={{ fontSize: '0.95rem', lineHeight: '1.6', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <span className="point-concept" style={{ color: 'var(--info)', fontWeight: '600', marginRight: '0.5rem', display: 'block', marginBottom: '0.25rem' }}>
                  ✍️ 简答框架大类
                </span>
                <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line', marginBottom: '0.5rem' }}>
                  {currentCard.short_answer}
                </div>
                {currentCard.short_score_points && currentCard.short_score_points.length > 0 && (
                  <div style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>核心得分点：</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                      {currentCard.short_score_points.map((pt, idx) => <li key={idx}>{pt}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Essay section */}
              <div className="card-point-item" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                <span className="point-concept" style={{ color: 'var(--success)', fontWeight: '600', marginRight: '0.5rem', display: 'block', marginBottom: '0.25rem' }}>
                  📝 论述展开细节
                </span>
                <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line', marginBottom: '0.5rem' }}>
                  {currentCard.full_answer}
                </div>
                {currentCard.full_score_points && currentCard.full_score_points.length > 0 && (
                  <div style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>详细得分点：</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                      {currentCard.full_score_points.map((pt, idx) => <li key={idx}>{pt}</li>)}
                    </ul>
                  </div>
                )}
              </div>

            </div>
            
            {/* Embedded Audio Guide Controls */}
            <div className="tts-controls-panel glass-panel" style={{ marginTop: '0.75rem', background: 'rgba(0, 0, 0, 0.25)', padding: '0.5rem 0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <button className="tts-play-btn" onClick={toggleTTS} title={isSpeaking ? "停止" : "朗读带背"} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSpeaking ? '⏹️' : '▶️'}
                </button>
                <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                  {isSpeaking ? '正在朗读三合一卡片背诵内容...' : '语音朗读卡片'}
                </span>
              </div>
              
              <div className="tts-speed-slider" style={{ gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem' }}>语速 {ttsSpeed.toFixed(1)}x</span>
                <input 
                  type="range" 
                  min="0.6" 
                  max="1.6" 
                  step="0.1" 
                  value={ttsSpeed} 
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))} 
                  style={{ width: '60px' }}
                />
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Actions & Leitner Self Assessment (Show only when flipped) */}
      {isFlipped ? (
        <div className="evaluation-bar-container animate-fade">
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            评估记忆程度，自动安排下次复习：
          </div>
          <div className="evaluation-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            <button className="eval-btn forgot" onClick={() => handleRate('forgot')}>
              <span>❌ 忘记</span>
              <span className="eval-interval">1天后复习</span>
            </button>
            <button className="eval-btn hard" onClick={() => handleRate('hard')}>
              <span>⚠️ 困难</span>
              <span className="eval-interval">2天后复习</span>
            </button>
            <button className="eval-btn good" onClick={() => handleRate('good')}>
              <span>👍 良好</span>
              <span className="eval-interval">5天后复习</span>
            </button>
            <button className="eval-btn easy" onClick={() => handleRate('easy')}>
              <span>✨ 简单</span>
              <span className="eval-interval">12天后复习</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ height: '74px' }}></div>
      )}

      {/* Footer Navigation Buttons */}
      <div className="nav-buttons-row">
        <button className="text-btn" onClick={handlePrev} disabled={currentIndex === 0}>
          ◀️ 上一张
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          进度: {currentIndex + 1} / {filteredCards.length}
        </span>
        <button className="text-btn" onClick={handleNext} disabled={currentIndex === filteredCards.length - 1}>
          下一张 ▶️
        </button>
      </div>
    </div>
  );
}
