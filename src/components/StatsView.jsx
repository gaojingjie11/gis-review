import React from 'react';

export default function StatsView({ reviewsData }) {
  const stats = reviewsData?.stats;
  const loading = reviewsData?.loading;

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>正在统计题库掌握程度与盲区数据...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>暂无统计数据，请先开始背诵复习。</p>
        <button 
          className="text-btn" 
          onClick={() => reviewsData?.fetchReviews()}
          style={{ marginTop: '1rem' }}
        >
          🔄 重新加载
        </button>
      </div>
    );
  }

  // Box details helper
  const levelNames = {
    0: { name: '0 未学习', desc: '新入库尚未背过的概念', color: 'var(--text-muted)' },
    1: { name: '1 完全不会', desc: '刚开始背或错题重置', color: 'var(--danger)' },
    2: { name: '2 模糊印象', desc: '能大概想起但漏掉核心得分点', color: 'var(--warning)' },
    3: { name: '3 基本会', desc: '能说出大部分关键点', color: 'var(--info)' },
    4: { name: '4 熟练掌握', desc: '基本无遗漏地完成回忆', color: 'var(--success)' },
    5: { name: '5 长期熟记', desc: '牢固掌握，安排极长复习周期', color: 'var(--secondary)' }
  };

  return (
    <div className="stats-view-container animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="section-title">
        <span>📊 考研背诵统计与弱点分析</span>
      </div>

      {/* Priority Chapter & Weakest Chapter Recommendation Banner */}
      <div className="glass-panel" style={{ 
        padding: '1.25rem 1.5rem', 
        background: 'rgba(0, 210, 255, 0.05)', 
        borderColor: 'var(--primary)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem' 
      }}>
        <div>
          <h4 style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1rem' }}>💡 智能复习决策建议</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            建议最优先攻坚章节：<strong>{stats.highestPriorityChapter || '无'}</strong> | 最薄弱模块：<strong>{stats.weakestChapter || '无'}</strong>
          </p>
        </div>
        <button 
          className="text-btn" 
          style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
          onClick={() => reviewsData?.fetchReviews()}
        >
          🔄 刷新统计
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel stat-card">
          <div className="stat-label">总题库数</div>
          <div className="stat-number">{stats.totalQuestions}</div>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="stat-label">已背诵数</div>
          <div className="stat-number" style={{ color: 'var(--primary)' }}>{stats.learnedQuestions}</div>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
          <div className="stat-label">今日完成</div>
          <div className="stat-number" style={{ color: 'var(--success)' }}>{stats.completedToday}</div>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="stat-label">今日待复习</div>
          <div className="stat-number" style={{ color: 'var(--warning)' }}>{stats.remainingReviewsToday}</div>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--secondary)' }}>
          <div className="stat-label">平均分 (10分制)</div>
          <div className="stat-number" style={{ color: 'var(--secondary)' }}>{stats.averageScore}</div>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
          <div className="stat-label">累计错题</div>
          <div className="stat-number" style={{ color: 'var(--danger)' }}>{stats.totalErrors}</div>
        </div>
      </div>

      {/* Grid: Mastery Levels & Weakness Chapters */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Mastery Distribution */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
            📦 掌握度分布 (Leitner 级别)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {Object.keys(levelNames).map(lvlKey => {
              const lvl = parseInt(lvlKey);
              const count = stats.levelDistribution?.[lvl] || 0;
              const barPercentage = stats.totalQuestions > 0 ? Math.round((count / stats.totalQuestions) * 100) : 0;
              
              return (
                <div key={lvl} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: '600', color: levelNames[lvl].color }}>
                      {levelNames[lvl].name}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {count} 题 ({barPercentage}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${barPercentage}%`, 
                      height: '100%', 
                      background: levelNames[lvl].color,
                      borderRadius: '4px',
                      boxShadow: `0 0 8px ${levelNames[lvl].color}66`
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weakness Chapter Analysis */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--danger)', fontFamily: 'var(--font-display)' }}>
            ⚠️ 知识模块薄弱点分析
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats.chapterWeaknesses && stats.chapterWeaknesses.length > 0 ? (
              stats.chapterWeaknesses.map((ch, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.03)', borderColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '600' }}>{ch.chapter}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      错题命中：{ch.error_count} 次
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>模块平均分</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--danger)' }}>
                      {parseFloat(ch.avg_score || 0).toFixed(1)}分
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                🎉 暂无明显弱点章节！继续保持。
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid: AI Mistakes & Hardest Questions */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* AI Common Mistakes */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
            🤖 AI 常见漏答/失分要点 (Top 5)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.aiCommonMistakes && stats.aiCommonMistakes.length > 0 ? (
              stats.aiCommonMistakes.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ flex: 1, marginRight: '1rem' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>#{idx+1}</span>
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{m.point}</span>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    遗漏 {m.count} 次
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                暂无 AI 漏答点数据。在深度或标准自测中，AI 会自动记录被遗漏的得分点。
              </div>
            )}
          </div>
        </div>

        {/* Top 10 Hardest Questions */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--warning)', fontFamily: 'var(--font-display)' }}>
            🔥 高频错题攻坚 (Top 10)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
            {stats.top10Hardest && stats.top10Hardest.length > 0 ? (
              stats.top10Hardest.map((q, idx) => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ flex: 1, marginRight: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>#{idx+1}</span>
                    <span style={{ fontWeight: '500' }}>{q.question}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--danger)' }}>错误: {q.error_count}次</span>
                    <span style={{ color: 'var(--primary)' }}>均分: {parseFloat(q.average_score || 0).toFixed(1)}分</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                暂无高频错误题目。
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Upcoming Forgotten & Chapter progress */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Upcoming Forgotten */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
            ⏳ 即将遗忘/待温故题目 (前5)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.upcomingForgotten && stats.upcomingForgotten.length > 0 ? (
              stats.upcomingForgotten.map((q, idx) => {
                const nextTime = q.next_review_time ? new Date(q.next_review_time) : null;
                const isOverdue = nextTime ? nextTime <= new Date() : true;
                const timeStr = nextTime 
                  ? nextTime.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) 
                  : '已到期';
                
                return (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <div style={{ flex: 1, marginRight: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>#{idx+1}</span>
                      <span style={{ fontWeight: '500' }}>{q.question}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      <span style={{ color: isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {isOverdue ? '已到期' : `计划: ${timeStr}`}
                      </span>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Box {q.mastery_level}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                暂无记忆库中的卡片。
              </div>
            )}
          </div>
        </div>

        {/* Chapter Progress */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
            📖 各章节背诵进度
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            {stats.chapterProgress && stats.chapterProgress.length > 0 ? (
              stats.chapterProgress.map((ch, idx) => {
                const total = parseInt(ch.total_count) || 1;
                const mastered = parseInt(ch.mastered_count) || 0;
                const learning = parseInt(ch.learning_count) || 0;
                const masteredPercent = Math.round((mastered / total) * 100);
                const learningPercent = Math.round((learning / total) * 100);

                return (
                  <div key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '500' }}>{ch.chapter}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {mastered}/{total} 已掌握
                      </span>
                    </div>
                    {/* Multi-colored bar */}
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', display: 'flex', overflow: 'hidden' }}>
                      <div style={{ width: `${masteredPercent}%`, background: 'var(--success)' }} title="掌握" />
                      <div style={{ width: `${learningPercent}%`, background: 'var(--primary)' }} title="学习中" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                暂无章节统计数据。
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 7 Days Trend Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
          📈 近 7 天背诵趋势
        </h3>
        {stats.last7DaysActivity && stats.last7DaysActivity.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>日期</th>
                  <th style={{ padding: '0.5rem' }}>完成次数</th>
                  <th style={{ padding: '0.5rem' }}>日平均得分</th>
                  <th style={{ padding: '0.5rem' }}>完成率评估</th>
                </tr>
              </thead>
              <tbody>
                {stats.last7DaysActivity.map((day, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: '500' }}>{day.date}</td>
                    <td style={{ padding: '0.5rem' }}>{day.count} 次</td>
                    <td style={{ padding: '0.5rem', color: 'var(--primary)', fontWeight: '600' }}>
                      {parseFloat(day.avg_score || 0).toFixed(1)} 分
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.1rem 0.5rem', 
                        borderRadius: '4px',
                        backgroundColor: day.count > 5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 210, 255, 0.15)',
                        color: day.count > 5 ? 'var(--success)' : 'var(--primary)',
                      }}>
                        {day.count > 5 ? '高效冲刺' : '稳步复习'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            近 7 天内尚未记录背诵历史。开启复习作答后将自动记录趋势。
          </div>
        )}
      </div>

    </div>
  );
}
