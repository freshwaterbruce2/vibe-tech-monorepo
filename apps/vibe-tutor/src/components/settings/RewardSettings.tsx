import React, { useState } from 'react';
import type { Reward, ClaimedReward } from '../../types';
import { PlusIcon } from '../ui/icons/PlusIcon';

interface RewardSettingsProps {
    rewards: Reward[];
    onUpdateRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
    claimedRewards: ClaimedReward[];
    onApproval: (claimedRewardId: string, isApproved: boolean) => void;
}

const generateId = () => `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const RewardSettings = ({ rewards, onUpdateRewards, claimedRewards, onApproval }: RewardSettingsProps) => {
    const [newName, setNewName] = useState('');
    const [newCost, setNewCost] = useState('');

    const handleAddReward = (e: React.FormEvent) => {
        e.preventDefault();
        const cost = parseInt(newCost, 10);
        if (newName.trim() && !isNaN(cost) && cost > 0) {
            const newReward: Reward = {
                id: generateId(),
                name: newName.trim(),
                cost,
            };
            onUpdateRewards(prev => [...prev, newReward]);
            setNewName('');
            setNewCost('');
        }
    };

    const handleDeleteReward = (id: string) => {
        if (window.confirm("Are you sure you want to delete this reward?")) {
            onUpdateRewards(prev => prev.filter(r => r.id !== id));
        }
    };

    return (
        <div className="p-6 bg-background-surface border border-[var(--border-color)] rounded-2xl">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)] mb-4">Reward System</h3>
            
            {/* Add Reward Form */}
            <form onSubmit={handleAddReward} className="mb-8 p-4 bg-slate-800/50 rounded-lg">
                <h4 className="font-semibold text-lg mb-3">Create a New Reward</h4>
                <div className="flex flex-col md:flex-row gap-4">
                    <input 
                        type="text" 
                        placeholder="Reward Name (e.g., Pizza Night)" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="flex-grow p-3 bg-slate-700/50 border border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
                    />
                    <input 
                        type="number" 
                        placeholder="Point Cost" 
                        value={newCost}
                        onChange={e => setNewCost(e.target.value)}
                        className="w-full md:w-32 p-3 bg-slate-700/50 border border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary-accent)]"
                    />
                    <button type="submit" className="flex items-center justify-center gap-2 px-5 py-3 font-semibold text-background-main bg-[var(--primary-accent)] rounded-lg hover:opacity-80 transition-opacity">
                        <PlusIcon className="w-5 h-5" /> Add
                    </button>
                </div>
            </form>

            {/* Pending Approvals */}
            {claimedRewards.length > 0 && (
                 <div className="mb-8">
                    <h4 className="font-semibold text-lg mb-3 text-yellow-400">Pending Approval</h4>
                    <div className="space-y-3">
                        {claimedRewards.map(reward => (
                            <div key={reward.id} className="p-4 bg-slate-800/50 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-bold">{reward.name}</p>
                                    <p className="text-sm text-slate-400">{reward.cost} Points</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => onApproval(reward.id, false)} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700">Deny</button>
                                    <button onClick={() => onApproval(reward.id, true)} className="px-4 py-2 font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700">Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Manage Existing Rewards */}
            <div>
                <h4 className="font-semibold text-lg mb-3">Manage Rewards</h4>
                {rewards.length > 0 ? (
                    <div className="space-y-3">
                        {rewards.map(reward => (
                             <div key={reward.id} className="p-4 bg-slate-800/50 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="font-bold">{reward.name}</p>
                                    <p className="text-sm text-slate-400">{reward.cost} Points</p>
                                </div>
                                <button onClick={() => handleDeleteReward(reward.id)} className="px-4 py-2 font-semibold text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600">Delete</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed border-slate-700/50 rounded-xl">
                        <p className="text-slate-400">No rewards created yet. Add one above to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RewardSettings;