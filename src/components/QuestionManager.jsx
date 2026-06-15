import React, { useState, useEffect } from 'react';

export default function QuestionManager() {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Form states (Tri-Test Schema)
  const [formQuestion, setFormQuestion] = useState('');
  const [formType, setFormType] = useState('三合一综合题');
  const [formSubject, setFormSubject] = useState('地理信息系统');
  const [formChapter, setFormChapter] = useState('第一章 地理信息系统基础理论');
  
  const [formClozeAnswer, setFormClozeAnswer] = useState('');
  const [formClozeKeywords, setFormClozeKeywords] = useState('');
  
  const [formShortAnswer, setFormShortAnswer] = useState('');
  const [formShortScorePoints, setFormShortScorePoints] = useState(['']);
  
  const [formFullAnswer, setFormFullAnswer] = useState('');
  const [formFullScorePoints, setFormFullScorePoints] = useState(['']);

  const [formKnowledgePoints, setFormKnowledgePoints] = useState('');
  const [formDifficulty, setFormDifficulty] = useState(3);
  const [formImportance, setFormImportance] = useState(3);

  // Import State
  const [importFormat, setImportFormat] = useState('markdown');
  const [importContent, setImportContent] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importUseAI, setImportUseAI] = useState(false);
  const [importSubject, setImportSubject] = useState('');
  const [importChapter, setImportChapter] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, [subjectFilter, chapterFilter, typeFilter]);

  const fetchQuestions = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (subjectFilter) queryParams.append('subject', subjectFilter);
      if (chapterFilter) queryParams.append('chapter', chapterFilter);
      if (typeFilter) queryParams.append('type', typeFilter);
      if (searchFilter) queryParams.append('search', searchFilter);

      const res = await fetch(`/api/questions?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchQuestions();
    }
  };

  const handleSelectQuestion = (q) => {
    setSelectedQuestion(q);
    setIsEditing(true);

    // Populate form
    setFormQuestion(q.question);
    setFormType(q.type || '三合一综合题');
    setFormSubject(q.subject || '');
    setFormChapter(q.chapter || '');
    
    setFormClozeAnswer(q.cloze_answer || '');
    setFormClozeKeywords((q.cloze_keywords || []).join(', '));
    
    setFormShortAnswer(q.short_answer || '');
    if (q.short_score_points && q.short_score_points.length > 0) {
      setFormShortScorePoints(q.short_score_points);
    } else {
      setFormShortScorePoints(['']);
    }
    
    setFormFullAnswer(q.full_answer || '');
    if (q.full_score_points && q.full_score_points.length > 0) {
      setFormFullScorePoints(q.full_score_points);
    } else {
      setFormFullScorePoints(['']);
    }
    
    setFormKnowledgePoints((q.knowledge_points || []).join(', '));
    setFormDifficulty(q.difficulty || 3);
    setFormImportance(q.importance || 3);
  };

  const handleNewQuestion = () => {
    setSelectedQuestion(null);
    setIsEditing(true);

    // Reset form
    setFormQuestion('');
    setFormType('三合一综合题');
    setFormSubject('地理信息系统');
    setFormChapter('第一章 地理信息系统基础理论');
    setFormClozeAnswer('');
    setFormClozeKeywords('');
    setFormShortAnswer('');
    setFormShortScorePoints(['']);
    setFormFullAnswer('');
    setFormFullScorePoints(['']);
    setFormKnowledgePoints('');
    setFormDifficulty(3);
    setFormImportance(3);
  };

  const handleShortScorePointChange = (index, value) => {
    const updated = [...formShortScorePoints];
    updated[index] = value;
    setFormShortScorePoints(updated);
  };

  const addShortScorePointInput = () => {
    setFormShortScorePoints([...formShortScorePoints, '']);
  };

  const removeShortScorePointInput = (index) => {
    setFormShortScorePoints(formShortScorePoints.filter((_, i) => i !== index));
  };

  const handleFullScorePointChange = (index, value) => {
    const updated = [...formFullScorePoints];
    updated[index] = value;
    setFormFullScorePoints(updated);
  };

  const addFullScorePointInput = () => {
    setFormFullScorePoints([...formFullScorePoints, '']);
  };

  const removeFullScorePointInput = (index) => {
    setFormFullScorePoints(formFullScorePoints.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Prepare keywords and score points
    const cloze_keywords = formClozeKeywords.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    const short_score_points = formShortScorePoints.map(s => s.trim()).filter(Boolean);
    const full_score_points = formFullScorePoints.map(s => s.trim()).filter(Boolean);
    const knowledge_points = formKnowledgePoints.split(/[,，]/).map(s => s.trim()).filter(Boolean);

    const payload = {
      question: formQuestion,
      type: formType,
      subject: formSubject,
      chapter: formChapter,
      cloze_answer: formClozeAnswer,
      cloze_keywords,
      short_answer: formShortAnswer,
      short_score_points,
      full_answer: formFullAnswer,
      full_score_points,
      knowledge_points,
      difficulty: parseInt(formDifficulty),
      importance: parseInt(formImportance)
    };

    try {
      let res;
      if (selectedQuestion) {
        // Update
        res = await fetch(`/api/questions/${selectedQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        res = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        await window.customAlert(selectedQuestion ? '更新成功！' : '创建成功！');
        setIsEditing(false);
        setSelectedQuestion(null);
        fetchQuestions();
      } else {
        await window.customAlert('保存失败: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      await window.customAlert('保存出错。');
    }
  };

  const handleDelete = async () => {
    if (!selectedQuestion) return;
    if (!(await window.customConfirm('确定删除这道题吗？该操作不可逆，且对应的复习状态和作答记录都将被级联删除！'))) return;

    try {
      const res = await fetch(`/api/questions/${selectedQuestion.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await window.customAlert('删除成功！');
        setIsEditing(false);
        setSelectedQuestion(null);
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Import Handler
  const handleImport = async (e) => {
    e.preventDefault();
    if (!importContent.trim()) return;

    setIsImporting(true);
    setImportMessage('');

    try {
      const endpoint = importUseAI ? '/api/questions/import-ai' : '/api/questions/import';
      const bodyPayload = importUseAI 
        ? { text: importContent, defaultSubject: importSubject, defaultChapter: importChapter }
        : { format: importFormat, content: importContent };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success) {
        setImportMessage(`🎉 成功导入：${data.message}`);
        setImportContent('');
        fetchQuestions();
      } else {
        setImportMessage(`❌ 导入失败：${data.message}`);
      }
    } catch (err) {
      setImportMessage(`❌ 发生错误：${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      setIsImporting(true);
      setImportMessage('正在解析 Word 文档...');

      const loadMammoth = () => {
        return new Promise((resolve, reject) => {
          if (window.mammoth) {
            resolve(window.mammoth);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
          script.onload = () => resolve(window.mammoth);
          script.onerror = (err) => reject(err);
          document.head.appendChild(script);
        });
      };

      loadMammoth()
        .then((mammoth) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const arrayBuffer = evt.target.result;
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
              .then((result) => {
                const html = result.value;
                // Convert html to simple markdown (replacing <strong> and <b> with **)
                let markdown = html
                  .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                  .replace(/<b>(.*?)<\/b>/gi, '**$1**')
                  .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n')
                  .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n')
                  .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n')
                  .replace(/<p>(.*?)<\/p>/gi, '$1\n')
                  .replace(/<li>(.*?)<\/li>/gi, '* $1\n')
                  .replace(/<[^>]+>/g, '');
                
                // Decode HTML entities
                const entities = {
                  '&amp;': '&',
                  '&lt;': '<',
                  '&gt;': '>',
                  '&quot;': '"',
                  '&#39;': "'",
                  '&nbsp;': ' '
                };
                for (let key in entities) {
                  markdown = markdown.replace(new RegExp(key, 'g'), entities[key]);
                }

                setImportContent(markdown);
                setImportFormat('markdown');
                setImportUseAI(true); // Automatically enable AI parsing for Word
                setImportMessage('✅ Word 文档解析成功！已自动开启 AI 智能提取模式。');
                setIsImporting(false);
              })
              .catch((err) => {
                setImportMessage(`❌ Word 解析出错：${err.message}`);
                setIsImporting(false);
              });
          };
          reader.readAsArrayBuffer(file);
        })
        .catch((err) => {
          setImportMessage(`❌ 无法加载 Word 解析库：${err.message}`);
          setIsImporting(false);
        });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImportContent(evt.target.result);
        if (file.name.endsWith('.json')) {
          setImportFormat('json');
        } else {
          setImportFormat('markdown');
        }
        setImportMessage(`✅ 文件 ${file.name} 已加载。`);
      };
      reader.readAsText(file);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/questions/export');
      const data = await res.json();
      if (data.success) {
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gis_questions_bank.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      await window.customAlert('导出失败');
    }
  };

  const handleClearDb = async () => {
    if (!(await window.customConfirm('🚨 危险警告！这会清空题库的所有题目、打分历史、以及学习进度，操作不可恢复！请问确定要彻底清空数据库吗？'))) return;
    if (!(await window.customConfirm('请再次确认：您是否真的要抹去所有背诵数据？'))) return;

    try {
      const res = await fetch('/api/questions/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await window.customAlert('数据库已彻底清空。');
        fetchQuestions();
        setIsEditing(false);
        setSelectedQuestion(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Unique lists for filters
  const subjects = [...new Set(questions.map(q => q.subject).filter(Boolean))];
  const chapters = [...new Set(questions.map(q => q.chapter).filter(Boolean))];

  return (
    <div className="editor-container animate-fade">
      
      {/* Sidebar - Search and Filters */}
      <div className="editor-sidebar glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="section-title" style={{ fontSize: '1rem', marginBottom: '0' }}>📚 题库大纲 ({questions.length}题)</span>
          <button className="text-btn primary-btn" onClick={handleNewQuestion} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>
            ➕ 新增题目
          </button>
        </div>

        {/* Filters Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="form-input-text" 
            placeholder="搜索题目或答案要点... (回车键)" 
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
          />
          
          <select 
            className="form-input-text" 
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            style={{ padding: '0.35rem', fontSize: '0.8rem', height: 'auto' }}
          >
            <option value="">全部科目</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            className="form-input-text" 
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            style={{ padding: '0.35rem', fontSize: '0.8rem', height: 'auto' }}
          >
            <option value="">全部章节</option>
            {chapters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            className="form-input-text" 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '0.35rem', fontSize: '0.8rem', height: 'auto' }}
          >
            <option value="">全部题型</option>
            <option value="名词解释">名词解释</option>
            <option value="简答题">简答题</option>
            <option value="论述题">论述题</option>
          </select>
        </div>

        {/* Questions List */}
        <div className="sidebar-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
          {questions.length > 0 ? (
            questions.map(q => (
              <button
                key={q.id}
                className={`sidebar-item ${selectedQuestion?.id === q.id ? 'active' : ''}`}
                onClick={() => handleSelectQuestion(q)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>{q.type}</span>
                  <span>Box {q.mastery_level || 0}</span>
                </div>
                <div className="sidebar-item-title" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                  {q.question}
                </div>
              </button>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              无匹配题目，请清空筛选或导入题库。
            </div>
          )}
        </div>

        {/* Database Management Tools */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="text-btn" onClick={handleExport} style={{ fontSize: '0.8rem', padding: '0.35rem' }}>
            📥 导出完整题库 (JSON)
          </button>
          <button className="text-btn" onClick={handleClearDb} style={{ fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', padding: '0.35rem' }}>
            🚨 彻底清空数据库
          </button>
        </div>
      </div>

      {/* Main Editing / Importing Area */}
      <div className="editor-main-pane glass-panel" style={{ padding: '1.5rem', overflowY: 'auto' }}>
        {isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card-content-header" style={{ marginBottom: '0', display: 'flex', justifyContent: 'space-between' }}>
              <span>{selectedQuestion ? '✏️ 编辑背诵题目' : '➕ 添加背诵题目'}</span>
              {selectedQuestion && (
                <button type="button" onClick={handleDelete} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  🗑️ 删除题目
                </button>
              )}
            </div>

            {/* Title / Question */}
            <div className="form-group">
              <label>题目 / 概念名词</label>
              <input 
                type="text" 
                className="form-input-text" 
                value={formQuestion} 
                onChange={(e) => setFormQuestion(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Type */}
              <div className="form-group">
                <label>题型</label>
                <select className="form-input-text" value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="三合一综合题">三合一综合题</option>
                  <option value="名词解释">名词解释</option>
                  <option value="简答题">简答题</option>
                  <option value="论述题">论述题</option>
                </select>
              </div>
 
              {/* Subject */}
              <div className="form-group">
                <label>所属科目</label>
                <input 
                  type="text" 
                  className="form-input-text" 
                  value={formSubject} 
                  onChange={(e) => setFormSubject(e.target.value)} 
                />
              </div>
            </div>
 
            {/* Chapter */}
            <div className="form-group">
              <label>所属章节</label>
              <input 
                type="text" 
                className="form-input-text" 
                value={formChapter} 
                onChange={(e) => setFormChapter(e.target.value)} 
              />
            </div>
 
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Difficulty */}
              <div className="form-group">
                <label>难度 (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  className="form-input-text" 
                  value={formDifficulty} 
                  onChange={(e) => setFormDifficulty(e.target.value)} 
                />
              </div>
 
              {/* Importance */}
              <div className="form-group">
                <label>重要程度 (1-5)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  className="form-input-text" 
                  value={formImportance} 
                  onChange={(e) => setFormImportance(e.target.value)} 
                />
              </div>
            </div>
 
            {/* Tags / Knowledge Points */}
            <div className="form-group">
              <label>知识点标签 (以逗号分隔)</label>
              <input 
                type="text" 
                className="form-input-text" 
                placeholder="例如: GIS基础, 空间数据" 
                value={formKnowledgePoints} 
                onChange={(e) => setFormKnowledgePoints(e.target.value)} 
              />
            </div>

            {/* Section 1: Cloze */}
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>🧩 填空自测设定 (Cloze)</strong>
              
              <div className="form-group">
                <label>填空题干标准答案 (使用 **加粗** 标记挖空词汇)</label>
                <textarea 
                  className="form-input-text" 
                  value={formClozeAnswer} 
                  onChange={(e) => setFormClozeAnswer(e.target.value)} 
                  placeholder="例如: 地理信息系统由**硬件**、**软件**、**数据**、**人员**和方法构成。"
                  style={{ minHeight: '80px', resize: 'vertical', fontSize: '0.85rem' }} 
                  required
                />
              </div>

              <div className="form-group">
                <label>挖空关键词列表 (逗号分隔，留空可根据上方 **加粗** 自动提取)</label>
                <input 
                  type="text" 
                  className="form-input-text" 
                  placeholder="例如: 硬件, 软件, 数据, 人员" 
                  value={formClozeKeywords} 
                  onChange={(e) => setFormClozeKeywords(e.target.value)} 
                />
              </div>
            </div>

            {/* Section 2: Short Answer */}
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <strong style={{ color: 'var(--info)', fontSize: '0.9rem' }}>✍️ 简答框架设定 (Short Answer)</strong>
              
              <div className="form-group">
                <label>简答标准框架答案</label>
                <textarea 
                  className="form-input-text" 
                  value={formShortAnswer} 
                  onChange={(e) => setFormShortAnswer(e.target.value)} 
                  placeholder="提供框架分类和简短解释的框架结构..."
                  style={{ minHeight: '100px', resize: 'vertical', fontSize: '0.85rem' }} 
                  required
                />
              </div>

              <div className="form-group" style={{ gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>简答要点得分点 (判定依据)</label>
                  <button type="button" className="text-btn" onClick={addShortScorePointInput} style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                    ➕ 添加得分点
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {formShortScorePoints.map((pt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                      <input 
                        type="text" 
                        className="form-input-text" 
                        value={pt} 
                        onChange={(e) => handleShortScorePointChange(idx, e.target.value)} 
                        placeholder="例如: 硬件系统"
                      />
                      <button type="button" onClick={() => removeShortScorePointInput(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Essay */}
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <strong style={{ color: 'var(--success)', fontSize: '0.9rem' }}>📝 论述展开设定 (Essay)</strong>
              
              <div className="form-group">
                <label>论述详细标准答案</label>
                <textarea 
                  className="form-input-text" 
                  value={formFullAnswer} 
                  onChange={(e) => setFormFullAnswer(e.target.value)} 
                  placeholder="包含所有展开细节与论证逻辑的完整参考答案..."
                  style={{ minHeight: '120px', resize: 'vertical', fontSize: '0.85rem' }} 
                  required
                />
              </div>

              <div className="form-group" style={{ gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>论述细节得分点 (判定依据)</label>
                  <button type="button" className="text-btn" onClick={addFullScorePointInput} style={{ padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>
                    ➕ 添加得分点
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {formFullScorePoints.map((pt, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                      <input 
                        type="text" 
                        className="form-input-text" 
                        value={pt} 
                        onChange={(e) => handleFullScorePointChange(idx, e.target.value)} 
                        placeholder="例如: 硬件系统包括计算机主机、网络设备..."
                      />
                      <button type="button" onClick={() => removeFullScorePointInput(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="text-btn" onClick={() => setIsEditing(false)}>
                取消
              </button>
              <button type="submit" className="text-btn primary-btn">
                💾 保存题目
              </button>
            </div>
          </form>
        ) : (
          /* Import Tool Screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>📥 导入题库资料</h2>
                <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: '600', marginBottom: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  ⚡ 已接入 AI 智能解析
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                支持将已整理好的考研背诵 Markdown 文档、Word 笔记本（.docx）或结构化 JSON 文件导入数据库。
                系统支持 AI 智能拆分，能自动匹配填空、简答和论述得分点。
              </p>
            </div>

            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Option checkboxes */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={importUseAI} 
                    onChange={(e) => setImportUseAI(e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  💡 使用 AI 智能提取与格式拆分 (支持 Word / Markdown / 纯文本)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {!importUseAI ? (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>导入格式</label>
                    <select className="form-input-text" value={importFormat} onChange={(e) => setImportFormat(e.target.value)}>
                      <option value="markdown">Markdown (.md - 兼容原背诵大纲格式)</option>
                      <option value="json">JSON (.json - 备份题库结构)</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>默认学科科目 (选填)</label>
                      <input 
                        type="text" 
                        className="form-input-text" 
                        value={importSubject} 
                        onChange={(e) => setImportSubject(e.target.value)} 
                        placeholder="例如: 地理信息系统学基础"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>默认章节名称 (选填)</label>
                      <input 
                        type="text" 
                        className="form-input-text" 
                        value={importChapter} 
                        onChange={(e) => setImportChapter(e.target.value)} 
                        placeholder="例如: 地理信息系统基础理论"
                      />
                    </div>
                  </>
                )}
                
                <div className="form-group" style={{ flex: 1 }}>
                  <label>上传文件</label>
                  <input type="file" accept=".md,.json,.docx,.txt" onChange={handleFileUpload} className="form-input-text" style={{ padding: '0.25rem' }} />
                </div>
              </div>

              <div className="form-group">
                <label>文件原文内容</label>
                <textarea 
                  className="form-input-text" 
                  value={importContent} 
                  onChange={(e) => setImportContent(e.target.value)} 
                  placeholder={importUseAI ? "在此处贴入要用 AI 提取的任意段落、大纲或 Word 文本..." : "在此处贴入文件内容，或直接点击上方上传文件完成解析..."} 
                  style={{ minHeight: '220px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>

              {importMessage && (
                <div className="glass-panel" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--primary)', borderColor: 'var(--primary)', backgroundColor: 'rgba(0, 210, 255, 0.05)' }}>
                  {importMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="text-btn primary-btn" disabled={isImporting || !importContent.trim()} style={{ padding: '0.6rem 2rem' }}>
                  {isImporting ? '⏳ 正在解析并导入数据...' : '🚀 确认开始导入'}
                </button>
              </div>
            </form>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {importUseAI ? (
                <>
                  <strong>💡 AI 智能解析说明：</strong>
                  <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem', lineHeight: '1.5' }}>
                    <li>可以直接解析<strong>包含加粗重点</strong>（用 <code>**加粗**</code> 或 Word 中的加黑体表示）的普通文本。</li>
                    <li>AI 会将加粗的核心词汇提取为填空词。</li>
                    <li>AI 会自动将问答题分解为简答题框架与论述题细节，无需人工转换格式。</li>
                  </ul>
                </>
              ) : (
                <>
                  <strong>💡 Markdown 解析说明：</strong>
                  <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem', lineHeight: '1.5' }}>
                    <li><code># [学科名称]</code> 将定义所属科目。</li>
                    <li><code>## [章节名称]</code> 将定义所属章节，并以此作为知识点默认标签。</li>
                    <li><code>* **概念**：标准定义</code> 结构会自动识别为名词解释。</li>
                    <li><code>### 标题</code> 下的段落会被解析为简答/论述题的答案，列表项 <code>* 得分点</code> 会被解析为判定得分点。</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
