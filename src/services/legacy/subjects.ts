export interface SubjectAsset {
  id: string;
  code: string;
  en: string;
  ur: string;
  image: string;
  defaultMedium: 'en' | 'ur' | 'bilingual';
  hasMathFormula: boolean;
}

export const BOARD_SUBJECTS: readonly SubjectAsset[] = [
  { id: 'english', code: 'ENG', en: 'English', ur: 'انگریزی', image: '/assets/subjects/english.jpg', defaultMedium: 'en', hasMathFormula: false },
  { id: 'urdu', code: 'URD', en: 'Urdu', ur: 'اردو', image: '/assets/subjects/urdu.jpg', defaultMedium: 'ur', hasMathFormula: false },
  { id: 'mathematics', code: 'MTH', en: 'Mathematics', ur: 'ریاضی', image: '/assets/subjects/mathematics.jpg', defaultMedium: 'bilingual', hasMathFormula: true },
  { id: 'physics', code: 'PHY', en: 'Physics', ur: 'طبیعیات', image: '/assets/subjects/physics.jpg', defaultMedium: 'bilingual', hasMathFormula: true },
  { id: 'chemistry', code: 'CHM', en: 'Chemistry', ur: 'کیمیا', image: '/assets/subjects/chemistry.jpg', defaultMedium: 'bilingual', hasMathFormula: true },
  { id: 'biology', code: 'BIO', en: 'Biology', ur: 'حیاتیات', image: '/assets/subjects/biology.jpg', defaultMedium: 'bilingual', hasMathFormula: false },
  { id: 'computer-science', code: 'CSC', en: 'Computer Science', ur: 'کمپیوٹر سائنس', image: '/assets/subjects/computer-science.jpg', defaultMedium: 'bilingual', hasMathFormula: false },
  { id: 'tarjuma-quran', code: 'TRQ', en: 'Tarjuma-tul-Quran', ur: 'ترجمۃ القرآن المجید', image: '/assets/subjects/tarjuma-quran.jpg', defaultMedium: 'ur', hasMathFormula: false },
  { id: 'islamiat', code: 'ISL', en: 'Islamiat Compulsory', ur: 'اسلامیات لازمی', image: '/assets/subjects/islamiat.jpg', defaultMedium: 'ur', hasMathFormula: false },
  { id: 'pakistan-studies', code: 'PST', en: 'Pakistan Studies', ur: 'مطالعہ پاکستان', image: '/assets/subjects/pakistan-studies.jpg', defaultMedium: 'bilingual', hasMathFormula: false },
] as const;

export function getSubjectAsset(id: string): SubjectAsset | undefined {
  return BOARD_SUBJECTS.find((s) => s.id === id);
}
