
import { ClassLevel, Subject, Chapter, LessonContent, Language, Board, Stream, ContentType, MCQItem, SystemSettings } from "../types";
import { STATIC_SYLLABUS } from "../constants";
import { getChapterData, getCustomSyllabus } from "../firebase";
import { AIOperatingSystem } from "./ai/AIOperatingSystem";
import { AITask } from "./ai/types";

// Helper to clean JSON (Shared Utility)
const cleanJson = (text: string) => {
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const chapterCache: Record<string, Chapter[]> = {};

// --- UPDATED CONTENT LOOKUP (ASYNC) ---
// (Kept identical to original to preserve logic)
const getAdminContent = async (
    board: Board,
    classLevel: ClassLevel,
    stream: Stream | null,
    subject: Subject,
    chapterId: string,
    type: ContentType,
    syllabusMode: 'SCHOOL' | 'COMPETITION' = 'SCHOOL'
): Promise<LessonContent | null> => {
    // STRICT KEY MATCHING WITH ADMIN
    const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
    // Key format used in AdminDashboard to save content
    const key = `nst_content_${board}_${classLevel}${streamKey}_${subject.name}_${chapterId}`;

    try {
        // FETCH FROM FIREBASE FIRST
        let parsed = await getChapterData(key);

        if (!parsed) {
            // Fallback to LocalStorage (for Admin's offline view)
            const stored = localStorage.getItem(key);
            if(stored) parsed = JSON.parse(stored);
        }

        if (parsed) {
            // ... (Logic preserved from original)
            if (type === 'PDF_FREE' || type === 'NOTES_SIMPLE') {
                const linkKey = syllabusMode === 'SCHOOL' ? 'schoolPdfLink' : 'competitionPdfLink';
                const htmlKey = syllabusMode === 'SCHOOL' ? 'schoolFreeNotesHtml' : 'competitionFreeNotesHtml';
                const link = parsed[linkKey] || parsed.freeLink;
                const html = parsed[htmlKey] || parsed.freeNotesHtml;

                if (link && type === 'PDF_FREE') {
                    return {
                        id: Date.now().toString(),
                        title: "Free Study Material",
                        subtitle: "Provided by Admin",
                        content: link,
                        type: 'PDF_FREE',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false
                    };
                }
                if (html && (type === 'NOTES_SIMPLE' || type === 'PDF_FREE')) {
                     return {
                        id: Date.now().toString(),
                        title: "Study Notes",
                        subtitle: "Detailed Notes (Admin)",
                        content: html,
                        type: 'NOTES_SIMPLE',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false
                    };
                }
            }
            if (type === 'PDF_PREMIUM' || type === 'NOTES_PREMIUM') {
                const linkKey = syllabusMode === 'SCHOOL' ? 'schoolPdfPremiumLink' : 'competitionPdfPremiumLink';
                const htmlKey = syllabusMode === 'SCHOOL' ? 'schoolPremiumNotesHtml' : 'competitionPremiumNotesHtml';
                const link = parsed[linkKey] || parsed.premiumLink;
                const html = parsed[htmlKey] || parsed.premiumNotesHtml;

                if (link && type === 'PDF_PREMIUM') {
                    return {
                        id: Date.now().toString(),
                        title: "Premium Notes",
                        subtitle: "High Quality Content",
                        content: link,
                        type: 'PDF_PREMIUM',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false
                    };
                }
                if (html && (type === 'NOTES_PREMIUM' || type === 'PDF_PREMIUM')) {
                    return {
                        id: Date.now().toString(),
                        title: "Premium Notes",
                        subtitle: "Exclusive Content (Admin)",
                        content: html,
                        type: 'NOTES_PREMIUM',
                        dateCreated: new Date().toISOString(),
                        subjectName: subject.name,
                        isComingSoon: false
                    };
                }
            }
            if (type === 'VIDEO_LECTURE' && (parsed.premiumVideoLink || parsed.freeVideoLink)) {
                return {
                    id: Date.now().toString(),
                    title: "Video Lecture",
                    subtitle: "Watch Class",
                    content: parsed.premiumVideoLink || parsed.freeVideoLink,
                    type: 'PDF_VIEWER',
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    isComingSoon: false
                };
            }
            if (type === 'PDF_VIEWER' && parsed.link) {
                return {
                    id: Date.now().toString(),
                    title: "Class Notes",
                    subtitle: "Provided by Teacher",
                    content: parsed.link,
                    type: 'PDF_VIEWER',
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    isComingSoon: false
                };
            }
            if ((type === 'MCQ_SIMPLE' || type === 'MCQ_ANALYSIS') && parsed.manualMcqData) {
                return {
                    id: Date.now().toString(),
                    title: "Class Test (Admin)",
                    subtitle: `${parsed.manualMcqData.length} Questions`,
                    content: '',
                    type: type,
                    dateCreated: new Date().toISOString(),
                    subjectName: subject.name,
                    mcqData: parsed.manualMcqData
                }
            }
        }
    } catch (e) {
        console.error("Content Lookup Error", e);
    }
    return null;
};

const getCustomChapters = (key: string): Chapter[] | null => {
    try {
        const data = localStorage.getItem(`nst_custom_chapters_${key}`);
        return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
};

export const fetchChapters = async (
  board: Board,
  classLevel: ClassLevel,
  stream: Stream | null,
  subject: Subject,
  language: Language
): Promise<Chapter[]> => {
  const streamKey = (classLevel === '11' || classLevel === '12') && stream ? `-${stream}` : '';
  const cacheKey = `${board}-${classLevel}${streamKey}-${subject.name}-${language}`;

  const firebaseChapters = await getCustomSyllabus(cacheKey);
  if (firebaseChapters && firebaseChapters.length > 0) return firebaseChapters;

  const customChapters = getCustomChapters(cacheKey);
  if (customChapters && customChapters.length > 0) return customChapters;

  if (chapterCache[cacheKey]) return chapterCache[cacheKey];

  const staticKey = `${board}-${classLevel}-${subject.name}`;
  const staticList = STATIC_SYLLABUS[staticKey];
  if (staticList && staticList.length > 0) {
      const chapters: Chapter[] = staticList.map((title, idx) => ({
          id: `static-${idx + 1}`,
          title: title,
          description: `Chapter ${idx + 1}`
      }));
      chapterCache[cacheKey] = chapters;
      return chapters;
  }

  // AI Generation
  const prompt = `List 15 standard chapters for ${classLevel === 'COMPETITION' ? 'Competitive Exam' : `Class ${classLevel}`} ${stream ? stream : ''} Subject: ${subject.name} (${board}). Return JSON array: [{"title": "...", "description": "..."}].`;

  try {
    const result = await AIOperatingSystem.getInstance().execute({
        type: 'JSON',
        prompt: prompt,
        modelPreference: 'NOTES_ENGINE' // Use Canonical ID
    });

    // Safety parse
    const data = JSON.parse(cleanJson(result.text || '[]'));

    const chapters: Chapter[] = data.map((item: any, index: number) => ({
      id: `ch-${index + 1}`,
      title: item.title,
      description: item.description || ''
    }));
    chapterCache[cacheKey] = chapters;
    return chapters;
  } catch (error) {
    console.error("Chapter Fetch Error:", error);
    const data = [{id:'1', title: 'Chapter 1'}, {id:'2', title: 'Chapter 2'}];
    chapterCache[cacheKey] = data;
    return data;
  }
};

const processTemplate = (template: string, replacements: Record<string, string>) => {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{${key}}`, 'gi'), value);
    }
    return result;
};

export const fetchLessonContent = async (
  board: Board,
  classLevel: ClassLevel,
  stream: Stream | null,
  subject: Subject,
  chapter: Chapter,
  language: Language,
  type: ContentType,
  existingMCQCount: number = 0,
  isPremium: boolean = false,
  targetQuestions: number = 15,
  adminPromptOverride: string = "",
  allowAiGeneration: boolean = false,
  syllabusMode: 'SCHOOL' | 'COMPETITION' = 'SCHOOL',
  forceRegenerate: boolean = false
): Promise<LessonContent> => {

  // Load Settings
  let customInstruction = "";
  let promptNotes = "";
  let promptNotesPremium = "";
  let promptMCQ = "";

  try {
      const stored = localStorage.getItem('nst_system_settings');
      if (stored) {
          const s = JSON.parse(stored) as SystemSettings;
          if (s.aiInstruction) customInstruction = `IMPORTANT INSTRUCTION: ${s.aiInstruction}`;

          if (syllabusMode === 'COMPETITION') {
              if (board === 'CBSE') {
                  if (s.aiPromptNotesCompetitionCBSE) promptNotes = s.aiPromptNotesCompetitionCBSE;
                  if (s.aiPromptNotesPremiumCompetitionCBSE) promptNotesPremium = s.aiPromptNotesPremiumCompetitionCBSE;
                  if (s.aiPromptMCQCompetitionCBSE) promptMCQ = s.aiPromptMCQCompetitionCBSE;
              }
              if (!promptNotes && s.aiPromptNotesCompetition) promptNotes = s.aiPromptNotesCompetition;
              if (!promptNotesPremium && s.aiPromptNotesPremiumCompetition) promptNotesPremium = s.aiPromptNotesPremiumCompetition;
              if (!promptMCQ && s.aiPromptMCQCompetition) promptMCQ = s.aiPromptMCQCompetition;
          } else {
              if (board === 'CBSE') {
                  if (s.aiPromptNotesCBSE) promptNotes = s.aiPromptNotesCBSE;
                  if (s.aiPromptNotesPremiumCBSE) promptNotesPremium = s.aiPromptNotesPremiumCBSE;
                  if (s.aiPromptMCQCBSE) promptMCQ = s.aiPromptMCQCBSE;
              }
              if (!promptNotes && s.aiPromptNotes) promptNotes = s.aiPromptNotes;
              if (!promptNotesPremium && s.aiPromptNotesPremium) promptNotesPremium = s.aiPromptNotesPremium;
              if (!promptMCQ && s.aiPromptMCQ) promptMCQ = s.aiPromptMCQ;
          }
      }
  } catch(e) {}

  if (!forceRegenerate) {
      const adminContent = await getAdminContent(board, classLevel, stream, subject, chapter.id, type, syllabusMode);
      if (adminContent) {
          return { ...adminContent, title: chapter.title };
      }
  }

  if (type === 'PDF_FREE' || type === 'PDF_PREMIUM' || type === 'PDF_VIEWER') {
      return {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: "Content Unavailable",
          content: "",
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          isComingSoon: true
      };
  }

  if (!allowAiGeneration) {
      return {
          id: Date.now().toString(),
          title: chapter.title,
          subtitle: "Content Unavailable",
          content: "",
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          isComingSoon: true
      };
  }

  // MCQ Mode
  if (type === 'MCQ_ANALYSIS' || type === 'MCQ_SIMPLE') {
      let prompt = "";
      if (promptMCQ) {
           prompt = processTemplate(promptMCQ, {
               board: board || '',
               class: classLevel,
               stream: stream || '',
               subject: subject.name,
               chapter: chapter.title,
               language: language,
               count: targetQuestions.toString(),
               instruction: customInstruction
           });
           if (adminPromptOverride) prompt += `\nINSTRUCTION: ${adminPromptOverride}`;
      } else {
          prompt = `${customInstruction}
          ${adminPromptOverride ? `INSTRUCTION: ${adminPromptOverride}` : ''}
          Create ${targetQuestions} MCQs for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}".
          Language: ${language}.
          Return valid JSON array:
          [
            {
              "question": "Question text",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": 0,
              "explanation": "Explanation here",
              "mnemonic": "Short memory trick",
              "concept": "Core concept"
            }
          ]
          CRITICAL: You MUST return EXACTLY ${targetQuestions} questions.`;
      }

      let data: any[] = [];
      const ai = AIOperatingSystem.getInstance();

      if (targetQuestions > 30) {
          const batchSize = 20;
          const batches = Math.ceil(targetQuestions / batchSize);
          const promises = [];

          for (let i = 0; i < batches; i++) {
               const batchPrompt = processTemplate(prompt, {
                    board: board || '',
                    class: classLevel,
                    stream: stream || '',
                    subject: subject.name,
                    chapter: chapter.title,
                    language: language,
                    count: batchSize.toString(),
                    instruction: `${customInstruction}\nBATCH ${i+1}/${batches}. Ensure diversity.`
               });

               promises.push(ai.execute({
                   type: 'JSON',
                   prompt: batchPrompt,
                   modelPreference: 'MCQ_ENGINE'
               }));
          }

          const results = await Promise.all(promises);
          results.forEach(res => {
              try {
                  const items = JSON.parse(cleanJson(res.text));
                  if (Array.isArray(items)) data.push(...items);
              } catch(e) {}
          });

          // Deduplicate
          const seen = new Set();
          data = data.filter(q => {
              const duplicate = seen.has(q.question);
              seen.add(q.question);
              return !duplicate;
          });
          if (data.length > targetQuestions) data = data.slice(0, targetQuestions);
      } else {
          const res = await ai.execute({
              type: 'JSON',
              prompt: prompt,
              modelPreference: 'MCQ_ENGINE'
          });
          try {
              data = JSON.parse(cleanJson(res.text));
          } catch(e) { data = []; }
      }

      return {
          id: Date.now().toString(),
          title: `MCQ Test: ${chapter.title}`,
          subtitle: `${data.length} Questions`,
          content: '',
          type: type,
          dateCreated: new Date().toISOString(),
          subjectName: subject.name,
          mcqData: data
      };
  }

  // NOTES Mode
  const isDetailed = type === 'NOTES_PREMIUM' || type === 'NOTES_HTML_PREMIUM';
  let prompt = "";
  const template = isDetailed ? promptNotesPremium : promptNotes;

  if (template) {
       prompt = processTemplate(template, {
           board: board || '',
           class: classLevel,
           stream: stream || '',
           subject: subject.name,
           chapter: chapter.title,
           language: language,
           instruction: customInstruction
       });
  } else {
      prompt = `${customInstruction}
      Write detailed study notes for ${board} Class ${classLevel} ${subject.name}, Chapter: "${chapter.title}".
      Language: Bilingual (English AND Hindi).

      CRITICAL REQUIREMENT:
      Return the content in two distinct sections separated by "|||" delimiter.
      [ENGLISH MARKDOWN] ||| [HINDI MARKDOWN]

      ${isDetailed ? 'Include deep insights, memory tips, and exam strategies.' : 'Keep it concise.'}`;
  }

  let text = "Content generation failed.";
  try {
      const res = await AIOperatingSystem.getInstance().execute({
          type: 'TEXT',
          prompt: prompt,
          modelPreference: 'NOTES_ENGINE'
      });
      text = res.text;
  } catch(e) { console.error(e); }

  return {
      id: Date.now().toString(),
      title: chapter.title,
      subtitle: isDetailed ? "Premium Study Notes" : "Quick Revision Notes",
      content: text,
      type: type,
      dateCreated: new Date().toISOString(),
      subjectName: subject.name,
      isComingSoon: false
  };
};

export const generateTestPaper = async (topics: any, count: number, language: Language): Promise<MCQItem[]> => {
    return [];
};
export const generateDevCode = async (userPrompt: string): Promise<string> => { return "// Dev Console Disabled"; };
