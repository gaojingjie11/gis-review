import { useState } from 'react';

export default function useSettings() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('gis_review_theme') || 'misty-rose';
  });

  const [dailyNewGoal, setDailyNewGoalScore] = useState(() => {
    return parseInt(localStorage.getItem('gis_daily_new_goal') || '20', 10);
  });

  const [dailyReviewGoal, setDailyReviewGoalScore] = useState(() => {
    const saved = localStorage.getItem('gis_daily_review_goal');
    if (saved === 'unlimited') return 'unlimited';
    return parseInt(saved || '60', 10);
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('gis_review_theme', newTheme);
  };

  const setDailyNewGoal = (val) => {
    setDailyNewGoalScore(val);
    localStorage.setItem('gis_daily_new_goal', val.toString());
  };

  const setDailyReviewGoal = (val) => {
    setDailyReviewGoalScore(val);
    localStorage.setItem('gis_daily_review_goal', val.toString());
  };

  return {
    theme,
    setTheme,
    dailyNewGoal,
    setDailyNewGoal,
    dailyReviewGoal,
    setDailyReviewGoal
  };
}
