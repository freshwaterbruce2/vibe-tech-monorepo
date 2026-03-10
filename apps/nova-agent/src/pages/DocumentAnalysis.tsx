import { FileText, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DocumentAnalysis = () => {
	const [fileName, setFileName] = useState<string>("");
	const [content, setContent] = useState<string>("");
	const navigate = useNavigate();

	const handleFile = async (file?: File) => {
		if (!file) return;
		setFileName(file.name);
		const text = await file.text();
		setContent(text);
		toast.success(`Loaded ${file.name}`);
	};

	const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

	const sendToChat = () => {
		if (!content.trim()) {
			toast.error("Add content first");
			return;
		}
		void navigate("/chat", {
			state: {
				initialMessage: `Analyze this document (${fileName || "untitled"}):\n\n${content}`,
			},
		});
	};

	return (
		<>
			<div className="min-h-screen bg-black text-white pt-24 px-6 pb-10 relative">
				<div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/10 pointer-events-none" />
				<div className="relative z-10 max-w-5xl mx-auto space-y-6">
					<div>
						<h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
							Document Analysis
						</h1>
						<p className="text-gray-400">
							Drop a text file or paste content to send it to Nova for review.
						</p>
					</div>

					<Card className="p-6 bg-black/60 border-purple-500/20">
						<div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
							<label
								className="text-sm text-gray-300 flex items-center gap-2"
								htmlFor="doc-upload"
							>
								<FileText className="w-4 h-4 text-purple-300" />
								Choose a file (text/markdown)
							</label>
							<Input
								id="doc-upload"
								type="file"
								accept=".txt,.md,.log,.json"
								onChange={(e) => {
									void handleFile(e.target.files?.[0]);
								}}
								className="bg-black/60"
							/>
						</div>

						<Textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Paste document content here..."
							className="h-64 bg-black/60 border-purple-500/20 text-white"
						/>

						<div className="mt-3 flex items-center justify-between text-sm text-gray-400">
							<span>{fileName || "No file selected"}</span>
							<span>{wordCount} words</span>
						</div>

						<div className="mt-4 flex gap-3">
							<Button
								onClick={sendToChat}
								className="bg-purple-600 hover:bg-purple-700"
							>
								<Send className="w-4 h-4 mr-2" />
								Send to Chat for Analysis
							</Button>
							<Button
								variant="outline"
								onClick={() => setContent("")}
								className="border-purple-500/30 text-purple-200"
							>
								Clear
							</Button>
						</div>
					</Card>
				</div>
			</div>
		</>
	);
};

export default DocumentAnalysis;
