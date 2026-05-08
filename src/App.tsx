import { useState, useEffect } from 'react';
import { Word, vocabulary, getRandomDisclaimerKana, splitKana, categories } from './data/vocabulary';
import { Target, Trophy, Clock, Zap, RefreshCw, Eye, X, ChevronDown, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

type GameState = 'START' | 'PLAYING' | 'GAME_OVER';
type GameMode = 'MODE_1' | 'MODE_2' | 'MODE_3';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [gameMode, setGameMode] = useState<GameMode>('MODE_1');
  const [currentSubMode, setCurrentSubMode] = useState<1 | 2>(1);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);
  
  const [wordPool, setWordPool] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  
  // Mode 1 state
  const [meaningOptions, setMeaningOptions] = useState<string[]>([]);
  
  // Mode 2 state
  const [wordKanaParts, setWordKanaParts] = useState<string[]>([]);
  const [kanaOptions, setKanaOptions] = useState<string[]>([]);
  const [selectedKanas, setSelectedKanas] = useState<(string | null)[]>([]);
  const [showHint, setShowHint] = useState<boolean>(false);
  
  // General game state
  const [score, setScore] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const getMeaningOptions = (correctMeaning: string) => {
    const options = new Set<string>();
    options.add(correctMeaning);
    const activeWords = categories[selectedCategoryIndex].words;
    // Check if we have at least 4 unique meanings in the current category
    const uniqueMeanings = new Set(activeWords.map((w: Word) => w.meaning));
    const pool = uniqueMeanings.size >= 4 ? activeWords : vocabulary;
    
    while (options.size < 4) {
      const randomWord = pool[Math.floor(Math.random() * pool.length)];
      options.add(randomWord.meaning);
    }
    return Array.from(options).sort(() => Math.random() - 0.5);
  };

  const startGame = (mode: GameMode) => {
    // Unlock audio on mobile browsers
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    }

    const activeWords = categories[selectedCategoryIndex].words;
    // ensure that if a category has very few words, we don't crash
    const pool = activeWords.length > 0 ? activeWords : vocabulary;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    
    setWordPool(shuffled);
    setCurrentIndex(0);
    
    setGameMode(mode);
    setCurrentSubMode(1);
    setScore(0);
    setGameState('PLAYING');
    setupWord(mode, 1, shuffled[0]);
  };

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP' || v.lang.includes('ja'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const setupWord = (mode: GameMode, subMode: 1 | 2, targetWord: Word) => {
    setCurrentWord(targetWord);
    setIsCorrect(null);
    setShowHint(false);

    playAudio(targetWord.kana);
    
    if (mode === 'MODE_1' || (mode === 'MODE_3' && subMode === 1)) {
      setMeaningOptions(getMeaningOptions(targetWord.meaning));
    } else if (mode === 'MODE_2' || (mode === 'MODE_3' && subMode === 2)) {
      const parts = splitKana(targetWord.kana);
      setWordKanaParts(parts);
      setSelectedKanas(new Array(parts.length).fill(null));
      setKanaOptions(getRandomDisclaimerKana(targetWord.kana, Math.max(12, parts.length + 6)));
    }
  };

  const handleNext = () => {
    if (gameMode === 'MODE_3' && currentSubMode === 1) {
      setCurrentSubMode(2);
      setupWord(gameMode, 2, currentWord!);
    } else {
      const nextIndex = currentIndex + 1;
      if (nextIndex < wordPool.length) {
        setCurrentIndex(nextIndex);
        setCurrentSubMode(1);
        setupWord(gameMode, 1, wordPool[nextIndex]);
      } else {
        setGameState('GAME_OVER');
      }
    }
  };

  // Mode 1: Check meaning
  const handleMeaningClick = (meaning: string) => {
    if (isCorrect !== null) return;
    
    if (meaning === currentWord?.meaning) {
      setIsCorrect(true);
      setScore(prev => prev + 10);
      setTimeout(() => {
        handleNext();
      }, 800);
    } else {
      setIsCorrect(false);
      setTimeout(() => {
        setIsCorrect(null);
      }, 800);
    }
  };

  // Mode 2: Check kana spelling
  const handleKanaClick = (kana: string) => {
    if (isCorrect !== null) return;
    
    const firstEmptyIndex = selectedKanas.findIndex((k) => k === null);
    if (firstEmptyIndex !== -1) {
      const newSelected = [...selectedKanas];
      newSelected[firstEmptyIndex] = kana;
      setSelectedKanas(newSelected);
      
      if (newSelected.every(k => k !== null)) {
        checkKanaAnswer(newSelected as string[]);
      }
    }
  };

  const handleRemoveKana = (index: number) => {
    if (isCorrect !== null) return;
    const newSelected = [...selectedKanas];
    newSelected[index] = null;
    setSelectedKanas(newSelected);
  };

  const checkKanaAnswer = (selected: string[]) => {
    const guessedKana = selected.join('');
    const targetKana = currentWord?.kana;
    
    if (guessedKana === targetKana) {
      setIsCorrect(true);
      setScore(prev => prev + (showHint ? 5 : 20)); // Less points if hint used
      setTimeout(() => {
        handleNext();
      }, 800);
    } else {
      setIsCorrect(false);
      setTimeout(() => {
        setIsCorrect(null);
        setSelectedKanas(new Array(wordKanaParts.length).fill(null));
      }, 800);
    }
  };

  const isMode1Active = gameMode === 'MODE_1' || (gameMode === 'MODE_3' && currentSubMode === 1);
  const isMode2Active = gameMode === 'MODE_2' || (gameMode === 'MODE_3' && currentSubMode === 2);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 text-white text-center rounded-t-2xl">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Japanese Vocab Master</h1>
          <p className="text-indigo-200">背单词、拼假名，看谁记得牢！🔥</p>
        </div>

        {gameState === 'START' && (
          <div className="p-8">
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                选择词汇分类 (Select Category)
              </label>
              <div className="relative">
                <select
                  value={selectedCategoryIndex}
                  onChange={(e) => setSelectedCategoryIndex(Number(e.target.value))}
                  className="w-full appearance-none px-4 py-3.5 pr-12 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-base sm:text-lg bg-white shadow-sm cursor-pointer hover:border-slate-400 font-medium text-slate-700 active:bg-slate-50 truncate"
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={idx}>
                      {cat.name} ({cat.words.length} 词)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <ChevronDown className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">选择游戏模式：</h3>
              <div className="space-y-3">
                <button
                  onClick={() => startGame('MODE_1')}
                  className="w-full bg-white hover:bg-indigo-50 active:bg-indigo-100 border-2 border-slate-200 hover:border-indigo-300 text-slate-700 text-left px-6 py-4 rounded-xl transition-all shadow-sm"
                >
                  <div className="font-bold text-lg mb-1">模式一：看日语选中文</div>
                  <div className="text-sm text-slate-500">显示日语单词（假名/汉字），从四个选项中选择正确的中文意思。</div>
                </button>
                
                <button
                  onClick={() => startGame('MODE_2')}
                  className="w-full bg-white hover:bg-indigo-50 active:bg-indigo-100 border-2 border-slate-200 hover:border-indigo-300 text-slate-700 text-left px-6 py-4 rounded-xl transition-all shadow-sm"
                >
                  <div className="font-bold text-lg mb-1">模式二：看中文拼假名</div>
                  <div className="text-sm text-slate-500">显示中文和汉字，通过点击下方给出的假名来拼写正确的日语单词，可查看答案。</div>
                </button>

                <button
                  onClick={() => startGame('MODE_3')}
                  className="w-full bg-white hover:bg-indigo-50 active:bg-indigo-100 border-2 border-indigo-400 hover:border-indigo-500 text-indigo-900 text-left px-6 py-4 rounded-xl transition-all shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
                  <div className="font-bold text-lg mb-1">模式三：综合挑战</div>
                  <div className="text-sm text-indigo-600/80">先根据日语选择中文，紧接着再拼写出对应的假名，彻底巩固记忆！</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'PLAYING' && currentWord && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8 bg-slate-100 p-4 rounded-xl">
              <button 
                onClick={() => setGameState('START')}
                className="p-2 rounded-lg flex items-center gap-2 hover:bg-slate-200 text-slate-500 transition-colors"
                title="退出当前模式"
              >
                <X className="w-5 h-5" />
                <span className="font-medium hidden sm:inline">退出</span>
              </button>
              
              <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-100 px-4 py-2 rounded-lg">
                <span>{currentIndex + 1}</span>
                <span className="text-indigo-400">/</span>
                <span>{wordPool.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                <span className="text-lg font-bold">Score: <span className="text-indigo-600">{score}</span></span>
              </div>
            </div>

            {/* Mode 1 Layout */}
            {isMode1Active && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-10">
                  <p className="text-slate-500 uppercase tracking-widest text-sm font-bold mb-2">Word / 单词</p>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="text-4xl font-extrabold text-slate-800">{currentWord.kanji !== currentWord.kana ? currentWord.kanji : currentWord.kana}</h2>
                    <button 
                      onClick={() => playAudio(currentWord.kana)}
                      className="text-slate-400 hover:text-indigo-600 focus:outline-none p-2 hover:bg-slate-100 rounded-full transition-colors"
                      title="朗读单词"
                    >
                      <Volume2 className="w-8 h-8" />
                    </button>
                  </div>
                  <p className="text-2xl text-slate-400 font-medium tracking-widest">【 {currentWord.kana} 】</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {meaningOptions.map((meaning, i) => (
                    <button
                      key={i}
                      onClick={() => handleMeaningClick(meaning)}
                      disabled={isCorrect !== null}
                      className={`bg-white hover:bg-slate-50 border-2 rounded-xl p-6 text-xl font-medium transition-all shadow-sm
                        ${isCorrect !== null && meaning === currentWord.meaning ? 'border-green-500 bg-green-50 text-green-700' : 
                          isCorrect === false && meaning !== currentWord.meaning ? 'border-red-200 opacity-50' : 
                          'border-slate-200 text-slate-700 hover:border-indigo-300'
                        }
                      `}
                    >
                      {meaning}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Mode 2 Layout */}
            {isMode2Active && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-6">
                  <p className="text-slate-500 uppercase tracking-widest text-sm font-bold mb-2">Meaning & Kanji / 含义与汉字</p>
                  <h2 className="text-3xl font-extrabold text-slate-800 mb-2">{currentWord.meaning}</h2>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-xl text-slate-400 font-medium tracking-widest">【 {currentWord.kanji !== currentWord.kana ? currentWord.kanji : '无汉字'} 】</p>
                    <button 
                      onClick={() => playAudio(currentWord.kana)}
                      className="text-slate-400 hover:text-indigo-600 focus:outline-none p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                      title="朗读单词"
                    >
                      <Volume2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <button
                    onClick={() => setShowHint(true)}
                    disabled={showHint || isCorrect !== null}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4" /> 
                    {showHint ? `答案: ${currentWord.kana}` : '显示提示 (-15 pts)'}
                  </button>
                </div>

                <div className="flex justify-center gap-3 mb-10 min-h-16 flex-wrap">
                  {selectedKanas.map((kana, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`w-14 h-14 md:w-16 md:h-16 border-b-4 rounded-xl flex items-center justify-center text-2xl font-medium cursor-pointer transition-all shadow-sm ${
                        kana 
                          ? isCorrect === true 
                            ? 'bg-green-100 border-green-500 text-green-700 shadow-green-100'
                            : isCorrect === false
                              ? 'bg-red-100 border-red-500 text-red-700 shadow-red-100 animate-shake'
                              : 'bg-white border-indigo-500 text-indigo-900 hover:bg-slate-50'
                          : 'bg-slate-100 border-slate-300 text-transparent'
                      }`}
                      onClick={() => handleRemoveKana(i)}
                    >
                      {kana || '_'}
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-5 md:grid-cols-5 gap-2 md:gap-3">
                  {kanaOptions.map((kana, i) => (
                    <button
                      key={i}
                      onClick={() => handleKanaClick(kana)}
                      disabled={isCorrect !== null}
                      className="bg-white hover:bg-indigo-50 active:bg-indigo-100 border-2 border-slate-200 hover:border-indigo-300 rounded-xl p-3 md:p-4 text-xl md:text-2xl font-medium text-slate-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {kana}
                    </button>
                  ))}
                </div>
                
                <div className="mt-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> 提示：拼写出正确的假名即可验证！
                </div>
              </motion.div>
            )}

          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="p-10 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-12 h-12 text-indigo-600" />
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-2">太棒了！</h2>
              <p className="text-xl text-slate-500">你已经完成了该分类下的所有单词！</p>
            </motion.div>
            
            <div className="bg-slate-50 rounded-2xl p-8 mb-8 border border-slate-200">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-6xl font-black text-indigo-600 font-mono tracking-tight">{score}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setGameState('START')}
                className="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-lg font-bold py-4 rounded-xl transition-colors"
              >
                回到首页
              </button>
              <button
                onClick={() => startGame(gameMode)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold py-4 rounded-xl transition-colors shadow-md hover:shadow-lg"
              >
                <RefreshCw className="w-5 h-5" /> 再记一遍
              </button>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}} />
    </div>
  );
}
