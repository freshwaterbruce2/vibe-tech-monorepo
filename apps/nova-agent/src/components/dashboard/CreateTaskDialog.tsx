import { Loader2, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTaskManager } from "@/hooks/useNovaData";

interface CreateTaskDialogProps {
	onTaskCreated?: () => void;
	trigger?: React.ReactNode;
	defaultProjectPath?: string;
}

export function CreateTaskDialog({
	onTaskCreated,
	trigger,
	defaultProjectPath,
}: CreateTaskDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const { createTask } = useTaskManager();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState("medium");
	const [projectPath, setProjectPath] = useState(defaultProjectPath ?? "");

	useEffect(() => {
		if (!open) {
			setProjectPath(defaultProjectPath ?? "");
		}
	}, [defaultProjectPath, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !projectPath.trim()) return;

		setLoading(true);
		try {
			const result = await createTask({
				title,
				description: description || undefined,
				priority,
				projectPath: projectPath || undefined,
			});

			if (result.isDuplicate) {
				toast.warning("Duplicate task detected", {
					description: "This task already exists.",
				});
			} else {
				toast.success("Task created successfully", {
					description: "The task is now tied to the latest grounded project review.",
				});
				setOpen(false);
				setTitle("");
				setDescription("");
				setPriority("medium");
				setProjectPath(defaultProjectPath ?? "");
				onTaskCreated?.();
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			toast.error("Failed to create task", {
				description: message.includes("grounded project review")
					? message
					: "Task creation now requires a valid project path and grounded review.",
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button variant="outline" className="gap-2">
						<PlusCircle className="w-4 h-4" />
						Add Task
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create Task</DialogTitle>
						<DialogDescription>
							Add a new task tied to a reviewed project path. Tasks without a grounded
							review will be blocked from execution.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="projectPath">Project Path</Label>
							<Input
								id="projectPath"
								value={projectPath}
								onChange={(e) => setProjectPath(e.target.value)}
								placeholder="C:\\dev\\apps\\nova-agent"
								required
							/>
							<p className="text-xs text-muted-foreground">
								Run `nova analyze --path &lt;project&gt;` first if this project has not been reviewed yet.
							</p>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="title">Title</Label>
							<Input
								id="title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Fix bug in..."
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="priority">Priority</Label>
							<Select value={priority} onValueChange={setPriority}>
								<SelectTrigger id="priority">
									<SelectValue placeholder="Select priority" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="urgent">Urgent</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Add details..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setOpen(false);
								setProjectPath(defaultProjectPath ?? "");
							}}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Create Task
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
