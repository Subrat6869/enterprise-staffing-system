// ============================================
// MATH CAPTCHA COMPONENT
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';

interface MathCaptchaProps {
  onVerified: (success: boolean) => void;
  className?: string;
}

const generateQuestion = () => {
  const ops = ['+', '-'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === '+') {
    a = Math.floor(Math.random() * 15) + 3;
    b = Math.floor(Math.random() * 15) + 3;
    answer = a + b;
  } else {
    a = Math.floor(Math.random() * 15) + 8;
    b = Math.floor(Math.random() * (a - 2)) + 1;
    answer = a - b;
  }

  return { question: `${a} ${op} ${b}`, answer };
};

const MathCaptcha: React.FC<MathCaptchaProps> = ({ onVerified, className = '' }) => {
  const [captcha, setCaptcha] = useState(generateQuestion);
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const refresh = useCallback(() => {
    setCaptcha(generateQuestion());
    setUserAnswer('');
    setStatus('idle');
    onVerified(false);
  }, [onVerified]);

  // Reset captcha on mount
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (val: string) => {
    setUserAnswer(val);

    if (val.trim() === '') {
      setStatus('idle');
      onVerified(false);
      return;
    }

    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num === captcha.answer) {
        setStatus('correct');
        onVerified(true);
      } else {
        setStatus('wrong');
        onVerified(false);
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Security Check
      </label>
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            {status === 'correct' ? (
              <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : status === 'wrong' ? (
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
            <span className="font-mono text-base font-semibold whitespace-nowrap">
              {captcha.question} = ?
            </span>
          </div>
          <input
            type="number"
            value={userAnswer}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="?"
            className={`w-20 px-3 py-1.5 rounded-lg text-center font-semibold border text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
              status === 'correct'
                ? 'border-green-400 ring-1 ring-green-400'
                : status === 'wrong'
                ? 'border-red-400 ring-1 ring-red-400'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={refresh}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-teal-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="New question"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {status === 'wrong' && userAnswer.trim() !== '' && (
        <p className="text-xs text-red-500">Incorrect answer — try again</p>
      )}
      {status === 'correct' && (
        <p className="text-xs text-green-500">✓ Verified</p>
      )}
    </div>
  );
};

export default MathCaptcha;
