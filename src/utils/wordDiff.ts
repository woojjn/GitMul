import { diffWords, Change } from 'diff';

export interface WordDiffResult {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * Word-level diff를 수행하여 변경된 단어를 강조할 수 있는 결과를 반환합니다.
 * 
 * @param oldText 이전 텍스트
 * @param newText 새 텍스트
 * @returns 단어 단위로 분할된 diff 결과 배열
 */
export function getWordDiff(oldText: string, newText: string): WordDiffResult[] {
  const changes = diffWords(oldText, newText);
  return changes.map((change: Change) => ({
    value: change.value,
    added: change.added,
    removed: change.removed,
  }));
}

/**
 * 라인별 Word-level diff를 수행합니다.
 * 각 라인을 개별적으로 비교하여 단어 단위 변경사항을 반환합니다.
 * 
 * @param oldLine 이전 라인 텍스트
 * @param newLine 새 라인 텍스트
 * @returns 단어 단위로 분할된 diff 결과 배열
 */
export function getLineWordDiff(oldLine: string, newLine: string): WordDiffResult[] {
  // 빈 라인 처리
  if (!oldLine && !newLine) {
    return [{ value: '' }];
  }
  
  if (!oldLine) {
    return [{ value: newLine, added: true }];
  }
  
  if (!newLine) {
    return [{ value: oldLine, removed: true }];
  }

  // 단어 단위로 diff 수행
  return getWordDiff(oldLine, newLine);
}

/**
 * Word diff 결과를 React 컴포넌트에서 렌더링하기 쉬운 형태로 변환합니다.
 * 
 * @param wordDiffs Word diff 결과 배열
 * @returns 렌더링용 객체 배열 (각 객체는 text, type, key 포함)
 */
export function formatWordDiffForRender(wordDiffs: WordDiffResult[]): Array<{
  text: string;
  type: 'normal' | 'added' | 'removed';
  key: string;
}> {
  return wordDiffs.map((diff, index) => ({
    text: diff.value,
    type: diff.added ? 'added' : diff.removed ? 'removed' : 'normal',
    key: `word-${index}-${diff.value.slice(0, 10)}`,
  }));
}
