
import React, { useState } from 'react';
import { Chapter, ContentType, User } from '../types';
import { Crown, BookOpen, Lock, X, HelpCircle, FileText, Printer, Star, FileJson, CheckCircle, Youtube, Video, Headphones } from 'lucide-react';
import { InfoPopup } from './InfoPopup';
import { DEFAULT_CONTENT_INFO_CONFIG } from '../constants';
import { SystemSettings } from '../types';

interface Props {
  chapter: Chapter;
  user: User; // Added User to check subscription
  credits: number;
  isAdmin: boolean;
  onSelect: (type: ContentType, count?: number) => void;
  onClose: () => void;
  settings?: SystemSettings; // NEW: Added settings prop
}

export const PremiumModal: React.FC<Props> = ({ chapter, user, credits, isAdmin, onSelect, onClose, settings }) => {
  const [mcqCount, setMcqCount] = useState(20);
  const [infoPopup, setInfoPopup] = useState<{isOpen: boolean, config: any, type: any}>({isOpen: false, config: {}, type: 'FREE'});

  const canAccess = (cost: number, type: string) => {
      if (isAdmin) return true;

      // Global Access Control
      const accessTier = settings?.appMode?.accessTier || 'ALL_ACCESS';
      if (accessTier === 'FREE_ONLY' && cost > 0) return false;

      // Subscription Logic
      if (user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()) {
          const level = user.subscriptionLevel || 'BASIC';

          // Ultra Logic (Global Override check)
          if (level === 'ULTRA') {
              if (accessTier === 'FREE_BASIC') {
                  // Downgrade behavior: Ultra behaves like Basic
                  if (['NOTES_HTML_FREE', 'NOTES_HTML_PREMIUM', 'MCQ_ANALYSIS', 'NOTES_PREMIUM', 'NOTES_SIMPLE', 'NOTES_IMAGE_AI'].includes(type)) return true;
                  return false; // Video Locked
              }
              return true; // Full Access
          }

          // Basic accesses MCQ and Notes
          if (level === 'BASIC' && ['NOTES_HTML_FREE', 'NOTES_HTML_PREMIUM', 'MCQ_ANALYSIS', 'NOTES_PREMIUM', 'NOTES_SIMPLE', 'NOTES_IMAGE_AI'].includes(type)) {
              return true;
          }
      }
      // Credit Fallback (Only if allowed)
      if (accessTier === 'FREE_ONLY') return false; // Double check
      return credits >= cost;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden relative">

            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/50 p-1 rounded-full"><X size={20} /></button>
                <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Selected Chapter</div>
                <h3 className="text-xl font-bold leading-tight">{chapter.title}</h3>
            </div>

            <div className="p-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Study Material</p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* FREE NOTES */}
                    <button
                        onClick={() => onSelect('NOTES_HTML_FREE')}
                        className="w-full bg-white border-2 border-slate-100 hover:border-green-200 hover:bg-green-50 rounded-xl p-3 flex flex-col items-center gap-2 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText size={20} />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-xs text-slate-700">Notes</p>
                            <p className="text-[9px] text-green-600 font-bold">Read Now</p>
                        </div>
                    </button>

                    {/* VIDEO */}
                    <button
                        onClick={() => onSelect('VIDEO_LECTURE')}
                        className="w-full bg-white border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 rounded-xl p-3 flex flex-col items-center gap-2 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Video size={20} />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-xs text-slate-700">Video</p>
                            <p className="text-[9px] text-red-600 font-bold">Watch</p>
                        </div>
                    </button>

                    {/* AUDIO */}
                    <button
                        onClick={() => onSelect('AUDIO')}
                        className="w-full bg-white border-2 border-slate-100 hover:border-pink-200 hover:bg-pink-50 rounded-xl p-3 flex flex-col items-center gap-2 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Headphones size={20} />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-xs text-slate-700">Audio</p>
                            <p className="text-[9px] text-pink-600 font-bold">Listen</p>
                        </div>
                    </button>

                    {/* MCQ */}
                    <button
                        onClick={() => onSelect('MCQ_ANALYSIS', 20)}
                        className="w-full bg-white border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 rounded-xl p-3 flex flex-col items-center gap-2 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CheckCircle size={20} />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-xs text-slate-700">MCQ Test</p>
                            <p className="text-[9px] text-blue-600 font-bold">Practice</p>
                        </div>
                    </button>
                </div>

                {/* PREMIUM OPTION */}
                <button
                    onClick={() => onSelect('NOTES_HTML_PREMIUM')}
                    className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 flex items-center justify-between hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center shadow-sm">
                             <Crown size={16} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-xs text-slate-800">Premium Notes</p>
                            <p className="text-[9px] text-yellow-700">High Quality Material</p>
                        </div>
                    </div>
                    <div className="bg-white px-2 py-1 rounded text-[10px] font-bold text-slate-600 shadow-sm group-hover:scale-105 transition-transform">
                        OPEN
                    </div>
                </button>
            </div>

            {!canAccess(2, 'MCQ_ANALYSIS') && !isAdmin && (
                <div className="bg-orange-50 p-3 text-center text-[10px] font-bold text-orange-600 border-t border-orange-100">
                    Low Credits! Study 3 hours or use Spin Wheel to earn.
                </div>
            )}
        </div>

        {/* INFO POPUP */}
       <InfoPopup
           isOpen={infoPopup.isOpen}
           onClose={() => setInfoPopup({...infoPopup, isOpen: false})}
           config={infoPopup.config}
           type={infoPopup.type}
       />
    </div>
  );
};
