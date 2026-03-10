import { ChevronRight, Lightbulb, MessageCircle } from 'lucide-react';
import React, { useState } from 'react';

interface SocialTip {
    id: string;
    category: 'conversation' | 'friendship' | 'family' | 'gaming';
    title: string;
    tip: string;
    example?: string;
}

const SOCIAL_TIPS: SocialTip[] = [
    // Conversation
    {
        id: 'greeting-1',
        category: 'conversation',
        title: 'How to Start Conversations',
        tip: 'Start with simple greetings like "Hey, how\'s it going?" You don\'t need a perfect opening line.',
        example: 'At school: "Hey! Did you finish the math homework? That last problem was tricky."'
    },
    {
        id: 'small-talk-1',
        category: 'conversation',
        title: 'Small Talk Isn\'t Meaningless',
        tip: 'When people ask "How are you?" they\'re showing friendliness, not asking for details. "Good, thanks! You?" is perfect.',
        example: 'Teacher: "How are you?" You: "Good, thanks! How was your weekend?"'
    },
    {
        id: 'listening-1',
        category: 'conversation',
        title: 'Active Listening Signals',
        tip: 'Show you\'re listening: nod, say "mm-hmm," make eye contact (or look near their face if that\'s easier), ask follow-up questions.',
        example: 'Friend: "I went to the movies." You: "Cool! What did you see? Was it good?"'
    },
    {
        id: 'share-balance-1',
        category: 'conversation',
        title: 'Balanced Sharing',
        tip: 'When talking about your interests, share for 20-30 seconds, then check if they\'re still engaged (nodding, asking questions). If not, ask about them.',
        example: 'You: "I\'m playing this new RPG..." (watch for interest) "...have you played anything cool lately?"'
    },

    // Friendship
    {
        id: 'friend-maintain-1',
        category: 'friendship',
        title: 'Keeping Friendships Alive',
        tip: 'Reach out first sometimes. Text "Hey, want to hang out?" or "Saw this meme and thought of you." Don\'t wait for them to always initiate.',
        example: 'Text: "Hey! Want to play [game] this weekend?" or "How\'d your test go?"'
    },
    {
        id: 'friend-boundaries-1',
        category: 'friendship',
        title: 'Respecting Boundaries',
        tip: 'If someone says they\'re busy or need space, believe them. Don\'t take it personally. They\'ll reach out when ready.',
        example: 'Friend: "Can\'t hang out today, I have family stuff." You: "No problem! Maybe next weekend?"'
    },
    {
        id: 'friend-reciprocity-1',
        category: 'friendship',
        title: 'Friendship is Two-Way',
        tip: 'Ask about their life too. "How was your day?" "How\'s your family?" "Did you finish that project?" People like feeling cared about.',
        example: 'Friend helped you? Next time: "Hey, need help with anything? You helped me last week."' 
    },

    // Family
    {
        id: 'family-respect-1',
        category: 'family',
        title: 'Why Parents Set Rules',
        tip: 'Parents set rules because they care and want you safe, not to annoy you. Explaining your perspective calmly can help them understand.',
        example: 'Instead of "That\'s not fair!" try "Can we talk about this rule? I feel frustrated because..."'
    },
    {
        id: 'family-chores-1',
        category: 'family',
        title: 'Chores Show Contribution',
        tip: 'Doing chores without being asked shows maturity and helps the family. It also builds independence skills for when you live alone.',
        example: 'Do your chores → Parents less stressed → More likely to say yes to things you want'
    },

    // Gaming & Online
    {
        id: 'gaming-team-1',
        category: 'gaming',
        title: 'Team Communication',
        tip: 'In team games, stay positive even when losing. "Good try, we\'ll get them next round" keeps morale up. Blaming teammates makes everyone play worse.',
        example: 'Team loses: "My bad on that play. Let\'s try [strategy] next time?" NOT "You guys suck!"'
    },
    {
        id: 'gaming-toxic-1',
        category: 'gaming',
        title: 'Handling Toxic Players',
        tip: 'Mute toxic players immediately. Don\'t argue or try to convince them. Report if needed. Your mental health > winning one game.',
        example: 'Someone raging in voice chat? Mute them, type "Focusing on gameplay, chat off" and move on.'
    },
    {
        id: 'gaming-balance-1',
        category: 'gaming',
        title: 'Gaming Breaks Are Important',
        tip: 'Take a 10-minute break every hour (stand up, stretch, drink water). Your eyes, back, and focus will thank you. You\'ll play better too.',
        example: 'After each match or quest, stand up, look out window for 30 seconds, grab a snack.'
    },
];

interface SocialSkillsTipsProps {
    onAskBuddy?: (question: string) => void;
}

const SocialSkillsTips = ({ onAskBuddy }: SocialSkillsTipsProps) => {
    const [expandedTip, setExpandedTip] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'conversation' | 'friendship' | 'family' | 'gaming'>('all');

    const categories = [
        { id: 'all', label: 'All Tips', icon: '💡' },
        { id: 'conversation', label: 'Conversation', icon: '💬' },
        { id: 'friendship', label: 'Friendship', icon: '❤️' },
        { id: 'family', label: 'Family', icon: '🏠' },
        { id: 'gaming', label: 'Gaming', icon: '🎮' }
    ];

    const filteredTips = selectedCategory === 'all'
        ? SOCIAL_TIPS
        : SOCIAL_TIPS.filter(t => t.category === selectedCategory);

    return (
        <div className="glass-card p-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-6">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">Social Skills Tips</h3>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Tips List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTips.map(tip => {
                    const isExpanded = expandedTip === tip.id;
                    return (
                        <div
                            key={tip.id}
                            className="bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all"
                        >
                            <button
                                onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-all"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <MessageCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                    <span className="text-white font-medium">{tip.title}</span>
                                </div>
                                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            {isExpanded && (
                                <div className="px-4 pb-4 space-y-3 border-t border-white/10">
                                    <p className="text-sm text-gray-300 leading-relaxed">{tip.tip}</p>
                                    {tip.example && (
                                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                                            <p className="text-xs text-gray-400 mb-1">Example:</p>
                                            <p className="text-sm text-purple-300">{tip.example}</p>
                                        </div>
                                    )}
                                    {onAskBuddy && (
                                        <button
                                            onClick={() => onAskBuddy(`Can you help me practice: ${tip.title}?`)}
                                            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                        >
                                            Practice with AI Buddy →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SocialSkillsTips;
