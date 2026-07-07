import React, { useState, useEffect } from 'react';

interface AdFollowPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdFollowPopup({ isOpen, onClose, onSuccess }: AdFollowPopupProps) {
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, ya 3 ad
  const [timeLeft, setTimeLeft] = useState(10); // Har ad 10 second chalega

  // --- AAPKI ADSTERRA KI DIRECT LINKS YAHAN AAYENGI ---
  const AD_LINKS = [
    "https://www.google.com?q=adsterra_link_1", // Pehli link
    "https://www.google.com?q=adsterra_link_2", // Doosri link
    "https://www.google.com?q=adsterra_link_3"  // Teesri link
  ];

  useEffect(() => {
    if (!isOpen) return;

    // Timer chalane ka dimaag
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentStep < 3) {
            // Agle ad par jao
            setCurrentStep((next) => next + 1);
            return 10; // Timer wapas 10 sec kar do
          } else {
            // Teeno ads khatam!
            clearInterval(timer);
            onSuccess(); // Success function ko chalu karo
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
        
        {/* Header */}
        <h2 className="text-xl font-bold text-white mb-2">
          🔓 Chat Unlock Ho Joega...
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Aap Lifetime ke liye bina matching ke chat kar paenge!
        </p>

        {/* Steps and Timer Indicators */}
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

        {/* IFRAME: Jo Adsterra ke Page ko App ke andar hi khol ke rakhega */}
        <div className="w-full h-64 bg-black rounded-lg overflow-hidden border border-gray-800 mb-4 relative">
          <iframe
            src={AD_LINKS[currentStep - 1]}
            className="w-full h-full"
            title="Ad Content"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
          {/* Ek transparent parda taki user ad par click karke bhag na paye */}
          <div className="absolute inset-0 bg-transparent pointer-events-none" />
        </div>

        <p className="text-xs text-gray-500">
          ⚠️ Kripya is screen ko band mat karein jab tak timer chal raha hai.
        </p>
      </div>
    </div>
  );
}
