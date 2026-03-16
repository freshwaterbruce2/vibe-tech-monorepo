import { Mic, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { aiService } from '@/services/aiService';
import { useSearchStore } from '@/store/searchStore';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface NaturalLanguageInputProps {
	className?: string;
	placeholder?: string;
	size?: 'sm' | 'md' | 'lg';
}

interface SpeechRecognitionResultAlternative {
	transcript: string;
}

interface SpeechRecognitionResult {
	0: SpeechRecognitionResultAlternative;
	length: number;
}

interface SpeechRecognitionResultList {
	0: SpeechRecognitionResult;
	length: number;
}

interface SpeechRecognitionEvent {
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onstart: (() => void) | null;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: (() => void) | null;
	onend: (() => void) | null;
	start: () => void;
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognitionInstance;
}

const iconSizeClasses = {
	sm: 'h-4 w-4',
	md: 'h-5 w-5',
	lg: 'h-6 w-6',
} as const;

export function NaturalLanguageInput({
	className,
	placeholder = 'Describe your perfect trip...',
	size = 'lg',
}: NaturalLanguageInputProps) {
	const [isProcessing, setIsProcessing] = useState(false);
	const [isListening, setIsListening] = useState(false);

	const {
		naturalLanguageQuery,
		setNaturalLanguageQuery,
		setAiProcessedQuery,
		setDateRange,
		setGuestCount,
		setFilters,
	} = useSearchStore();

	const handleSearch = async () => {
		if (!naturalLanguageQuery.trim()) {
			return;
		}

		setIsProcessing(true);
		try {
			const processedQuery =
				await aiService.processNaturalLanguage(naturalLanguageQuery);
			setAiProcessedQuery(processedQuery);

			if (processedQuery.extractedDetails.dates) {
				setDateRange(
					processedQuery.extractedDetails.dates.checkIn,
					processedQuery.extractedDetails.dates.checkOut,
				);
			}

			if (processedQuery.extractedDetails.guests) {
				setGuestCount(
					processedQuery.extractedDetails.guests.adults,
					processedQuery.extractedDetails.guests.children,
					processedQuery.extractedDetails.guests.rooms,
				);
			}

			if (processedQuery.extractedDetails.budget) {
				setFilters({
					priceRange: [
						processedQuery.extractedDetails.budget.min,
						processedQuery.extractedDetails.budget.max,
					],
				});
			}
		} catch (error) {
			toast.error('Unable to process your request', {
				description:
					error instanceof Error
						? error.message
						: 'Please try a different search phrase.',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	const handleVoiceInput = () => {
		if (
			!('webkitSpeechRecognition' in window) &&
			!('SpeechRecognition' in window)
		) {
			toast.error('Speech recognition is not supported in your browser.');
			return;
		}

		const SpeechRecognition =
			window.webkitSpeechRecognition ?? window.SpeechRecognition;
		if (!SpeechRecognition) {
			toast.error('Speech recognition is not supported in your browser.');
			return;
		}

		const recognition = new SpeechRecognition();

		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.lang = 'en-US';

		recognition.onstart = () => {
			setIsListening(true);
		};

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			const { transcript } = event.results[0][0];
			setNaturalLanguageQuery(transcript);
			setIsListening(false);
		};

		recognition.onerror = () => {
			setIsListening(false);
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognition.start();
	};

	const sizeClasses = {
		sm: 'h-10 text-sm',
		md: 'h-12 text-base',
		lg: 'h-14 text-lg',
	};

	return (
		<div className={cn('relative w-full max-w-2xl', className)}>
			<div className="relative">
				<div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
					<Sparkles
						className={cn(
							'transition-colors',
							iconSizeClasses[size],
							isProcessing && 'text-primary-500 animate-pulse',
						)}
					/>
				</div>

				<Input
					value={naturalLanguageQuery}
					onChange={(e) => setNaturalLanguageQuery(e.target.value)}
					placeholder={placeholder}
					className={cn(
						'pl-12 pr-24 glass-morphism border-white/30 placeholder:text-gray-400',
						sizeClasses[size],
					)}
					onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
				/>

				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={handleVoiceInput}
						disabled={isListening || isProcessing}
						className={cn(
							'h-8 w-8',
							isListening && 'text-red-500 animate-pulse',
						)}
					>
						<Mic className="h-4 w-4" />
					</Button>

					<Button
						type="button"
						onClick={() => void handleSearch()}
						disabled={!naturalLanguageQuery.trim() || isProcessing}
						loading={isProcessing}
						size={size === 'lg' ? 'md' : 'sm'}
						className="bg-primary-600 hover:bg-primary-700"
					>
						<Search className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{isProcessing && (
				<div className="absolute top-full mt-2 left-0 right-0">
					<div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
						<div className="flex items-center space-x-2 text-sm text-primary-700 dark:text-primary-300">
							<Sparkles className="h-4 w-4 animate-spin" />
							<span>AI is analyzing your request...</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

declare global {
	interface Window {
		webkitSpeechRecognition?: SpeechRecognitionConstructor;
		SpeechRecognition?: SpeechRecognitionConstructor;
	}
}
