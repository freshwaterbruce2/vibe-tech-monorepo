import React, { useRef, useTransition } from 'react';
import { dataStore } from '../../services/dataStore';

const DataManagement = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [_isPending, startTransition] = useTransition();

    const handleExport = () => {
        startTransition(async () => {
            try {
                const data: Record<string, unknown> = {};

                // Export from dataStore (single source of truth)
                const homeworkItems = await dataStore.getHomeworkItems();
                if (homeworkItems.length > 0) {
                    data['homeworkItems'] = homeworkItems;
                }

                const achievements = await dataStore.getAchievements();
                if (achievements.length > 0) {
                    data['achievements'] = achievements;
                }

                const studentPoints = await dataStore.getStudentPoints();
                if (studentPoints > 0) {
                    data['studentPoints'] = studentPoints;
                }

                const rewards = await dataStore.getRewards();
                if (rewards.length > 0) {
                    data['parentRewards'] = rewards;
                }

                const claimedRewards = await dataStore.getClaimedRewards();
                if (claimedRewards.length > 0) {
                    data['claimedRewards'] = claimedRewards;
                }

                const focusSessions = await dataStore.getFocusSessions();
                if (focusSessions.length > 0) {
                    data['focusSessions'] = focusSessions;
                }

                const sensoryPrefs = await dataStore.getSensoryPreferences();
                if (sensoryPrefs) {
                    data['sensory-prefs'] = sensoryPrefs;
                }

                const jsonString = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vibe-tutor-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('Data exported successfully!');
            } catch (error) {
                console.error('Failed to export data:', error);
                alert('An error occurred during export.');
            }
        });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            startTransition(async () => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error("Invalid file format");

                    const data = JSON.parse(text);
                    const confirmed = window.confirm(
                        'Are you sure you want to import this data? This will overwrite all current progress.'
                    );

                    if (confirmed) {
                        // Import data through dataStore (single source of truth)
                        if (data.homeworkItems && Array.isArray(data.homeworkItems)) {
                            await dataStore.saveHomeworkItems(data.homeworkItems);
                        }

                        if (data.achievements && Array.isArray(data.achievements)) {
                            await dataStore.saveAchievements(data.achievements);
                        }

                        if (data.studentPoints) {
                            await dataStore.saveStudentPoints(data.studentPoints);
                        }

                        if (data.parentRewards && Array.isArray(data.parentRewards)) {
                            await dataStore.saveRewards(data.parentRewards);
                        }

                        if (data.focusSessions && Array.isArray(data.focusSessions)) {
                            for (const session of data.focusSessions) {
                                await dataStore.saveFocusSession(session);
                            }
                        }

                        if (data['sensory-prefs']) {
                            await dataStore.saveSensoryPreferences(data['sensory-prefs']);
                        }

                        alert('Data imported successfully! The app will now reload.');
                        window.location.reload();
                    }
                } catch (error) {
                    console.error('Failed to import data:', error);
                    alert('Failed to import data. Please ensure it is a valid backup file.');
                } finally {
                    // Reset file input
                    if(fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            });
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        const confirmed = window.confirm(
            'Are you sure you want to reset all app data? This action cannot be undone.'
        );
        if (confirmed) {
            startTransition(async () => {
                try {
                    // Reset all data through dataStore
                    await dataStore.saveHomeworkItems([]);
                    await dataStore.saveAchievements([]);
                    await dataStore.saveStudentPoints(0);
                    await dataStore.saveRewards([]);
                    await dataStore.saveSensoryPreferences({
                      animationSpeed: 'normal',
                      soundEnabled: true,
                      hapticEnabled: true,
                      fontSize: 'medium',
                      dyslexiaFont: false,
                      colorMode: 'default'
                    });

                    alert('Application data has been reset. The app will now reload.');
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to reset data:', error);
                    alert('An error occurred while resetting data. Please try again.');
                }
            });
        }
    };

  return (
    <div className="p-6 bg-background-surface border border-[var(--border-color)] rounded-2xl">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)] mb-4">Data Management</h3>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={handleExport} className="px-5 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Export Data
            </button>
            <button onClick={handleImportClick} className="px-5 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                Import Data
            </button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={handleReset} className="px-5 py-3 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Reset App
            </button>
       </div>
    </div>
  );
};

export default DataManagement;
