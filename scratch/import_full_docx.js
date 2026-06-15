import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createQuestion } from '../db.js';

// Load .env from project root
const projectRoot = '/Users/gao/Downloads/jiyi';
dotenv.config({ path: path.join(projectRoot, '.env') });

const apiKey = process.env.AI_API_KEY;
const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1';
const model = process.env.AI_API_MODEL || 'gpt-4o-mini';

if (!apiKey) {
  console.error("Fatal: AI_API_KEY is not defined in .env");
  process.exit(1);
}

// Function to call LLM
async function callLLM(systemPrompt, userPrompt) {
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Provider HTTP Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Main logic
async function runImport() {
  const txtPath = path.join(projectRoot, 'scratch/bold_text.txt');
  if (!fs.existsSync(txtPath)) {
    console.error(`Error: File not found at ${txtPath}`);
    process.exit(1);
  }

  const fullText = fs.readFileSync(txtPath, 'utf8');
  const lines = fullText.split('\n');

  let currentSubject = '测绘地理信息学基础'; // Default from H1
  let currentChapter = '地理信息系统基础理论';
  
  // We will split paragraphs into segments
  // A segment starts with a question header like "**1、" or "1、"
  const questionSegments = [];
  let currentSegment = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for H1 subject headers
    if (line.includes('近期每日背诵汇总') || line.startsWith('# ')) {
      const cleanSub = line.replace(/[\*#]/g, '').split('-')[0].trim();
      if (cleanSub) currentSubject = cleanSub;
      continue;
    }

    // Check for chapter headers: e.g. "**6月12日背诵内容：地理信息系统基础理论**"
    const chapterMatch = line.match(/(?:背诵内容[：:])\s*(.*)/) || line.match(/^##\s*(.*)/);
    if (chapterMatch) {
      currentChapter = chapterMatch[1].replace(/\*/g, '').trim();
      console.log(`Found Chapter: "${currentChapter}" under Subject: "${currentSubject}"`);
      continue;
    }

    // Check for question headers: e.g. "**1、地理数据和地理信息**"
    const qHeaderMatch = line.match(/^\*\*?(\d+)、(.*?)\*\*?$/) || line.match(/^(\d+)、(.*)/);
    if (qHeaderMatch) {
      if (currentSegment) {
        questionSegments.push(currentSegment);
      }
      currentSegment = {
        questionNum: parseInt(qHeaderMatch[1]),
        questionTitle: qHeaderMatch[2].replace(/\*/g, '').trim(),
        subject: currentSubject,
        chapter: currentChapter,
        contentLines: []
      };
    } else {
      if (currentSegment) {
        currentSegment.contentLines.push(lines[i]); // Keep original line for formatting
      }
    }
  }
  // Add last segment
  if (currentSegment) {
    questionSegments.push(currentSegment);
  }

  console.log(`Successfully identified ${questionSegments.length} questions to import.`);

  // Process in chunks of 4 questions to avoid LLM limits
  const chunkSize = 4;
  let successCount = 0;

  for (let idx = 0; idx < questionSegments.length; idx += chunkSize) {
    const chunk = questionSegments.slice(idx, idx + chunkSize);
    console.log(`\n--- Processing questions ${idx + 1} to ${Math.min(idx + chunkSize, questionSegments.length)} ---`);

    // Prepare text representation of the chunk for LLM
    const chunkText = chunk.map(q => {
      return `【章节】：${q.chapter}\n【题目】：${q.questionNum}、${q.questionTitle}\n${q.contentLines.join('\n')}`;
    }).join('\n\n');

    const systemPrompt = `你是一位专业的GIS（地理信息系统）考研专业课辅导老师。请解析用户提供的地理实体背诵文本段落（包含已用 **加粗标出核心词**）。
你需要提取并构建“三合一”背诵卡片结构。

对于传入的每一个【题目】，构建如下 JSON 对象：
1. "question": 概念或问题的名称。去除开头的数字序号。
2. "subject": 学科科目名称，使用原本题目所配属的 "${currentSubject}"。
3. "chapter": 章节名称，使用本题目所属的章节名。
4. "cloze_answer": 填空背诵要点。你必须完整、原封不动地保留所有原始输入文本中被 ** 包裹的关键词加粗格式。填空题将对这些加粗词进行挖空。
5. "cloze_keywords": 从 cloze_answer 中提取的所有被 ** 包裹的关键词数组（例如：["空间分布性", "空间定位"]），去除星号本身。
6. "short_answer": 简答框架大类。整理出要点大类标题，去除过于累赘的详细展开，适合快速记忆框架（例如："（1）空间相关性：空间上越接近相关性越强。\n（2）空间区域性：按区域组织与应用。"）。
7. "short_score_points": 简答题核心得分点数组（通常是每个大类框架的标题核心词，例如：["空间相关性", "空间区域性", "空间多样性", "空间层次性"]）。
8. "full_answer": 论述展开细节。包含最完整的详细展开内容，字数要求饱满详实。
9. "full_score_points": 详细得分点数组。用于与用户的长答案进行匹配打分（通常是每个大要点加上其核心解释的组合，例如：["空间相关性：空间依赖性（地理学第一定律）", "空间区域性：按区域组织应用"]）。
10. "difficulty": 难度 (1-5 整数，根据题目难度合理评估，默认3)。
11. "importance": 重要度 (1-5 整数，根据常考度合理评估，默认3)。

你必须输出且仅输出一个合法的 JSON 格式对象，结构如下：
{
  "questions": [
    // 数组长度必须和本次请求的题目数量完全一致！
    {
      "question": "...",
      "subject": "...",
      "chapter": "...",
      "cloze_answer": "...",
      "cloze_keywords": ["...", "..."],
      "short_answer": "...",
      "short_score_points": ["...", "..."],
      "full_answer": "...",
      "full_score_points": ["...", "..."],
      "difficulty": 3,
      "importance": 3
    }
  ]
}
不要有任何 Markdown 包裹，直接输出 JSON 内容。`;

    const userPrompt = `需要解析的文本内容如下：\n\n${chunkText}`;

    let attempts = 0;
    let completed = false;

    while (attempts < 2 && !completed) {
      try {
        attempts++;
        const aiResponse = await callLLM(systemPrompt, userPrompt);
        let parsed;
        try {
          parsed = JSON.parse(aiResponse.trim());
        } catch (parseErr) {
          const cleaned = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        }

        if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
          throw new Error("Invalid response format from AI.");
        }

        // Insert into database
        for (const q of parsed.questions) {
          await createQuestion({
            question: q.question,
            subject: q.subject || currentSubject,
            chapter: q.chapter || '未分类',
            cloze_answer: q.cloze_answer,
            cloze_keywords: q.cloze_keywords || [],
            short_answer: q.short_answer,
            short_score_points: q.short_score_points || [],
            full_answer: q.full_answer,
            full_score_points: q.full_score_points || [],
            difficulty: parseInt(q.difficulty || '3') || 3,
            importance: parseInt(q.importance || '3') || 3
          });
          console.log(`✔ Imported question: "${q.question}"`);
          successCount++;
        }
        completed = true;
      } catch (err) {
        console.error(`Attempt ${attempts} failed for chunk:`, err.message);
        if (attempts >= 2) {
          console.error("Skipping chunk due to persistent errors.");
        }
      }
    }
  }

  console.log(`\n🎉 Import completed! Successfully parsed and inserted ${successCount} / ${questionSegments.length} questions into the PostgreSQL database.`);
  process.exit(0);
}

runImport();
