import React, { useState, useEffect } from 'react';

interface AdFollowPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdFollowPopup({ isOpen, onClose, onSuccess }: AdFollowPopupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(10); // Har ad 10 second chalega

  const AD_LINKS = [
    "https://www.google.com?q=adsterra_link_1",
    "https://www.google.com?q=adsterra_link_2",
    "https://www.google.com?q=adsterra_link_3"
  ];

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentStep < 3) {
            setCurrentStep((next) => next + 1);
            return 10;
          } else {
            clearInterval(timer);
            onSuccess(); // Success handler trigger
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-purple-500 rounded-xl p-6 w-full max-w-md text-center shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">🔓 Connection Jodein...</h2>
        <p className="text-gray-400 text-sm mb-4">
          Aap bina random queue ke is user se direct connections se kabhi bhi baat kar payenge!
        </p>

        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 w-16 rounded ${
                step === currentStep
                  ? 'bg-purple-500 animate-pulse'
                  : step < currentStep
                  ? 'bg-green-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="text-lg font-semibold text-yellow-400 mb-6 animate-bounce">
          Ad {currentStep} Chal Raha Hai: {timeLeft} Seconds Rukein
        </div>

        <div className="w-full h-64 bg-black rounded-lg overflow-hidden border border-gray-800 mb-4 relative">
          <iframe
            src={AD_LINKS[currentStep - 1]}
            className="w-full h-full"
            title="Ad Content"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
          <div className="absolute inset-0 bg-transparent pointer-events-none" />
        </div>

        <p className="text-xs text-gray-500">
          ⚠️ Kripya is screen ko band mat karein jab tak ads complete na ho jayein.
        </p>
      </div>
    </div>
  );
}
