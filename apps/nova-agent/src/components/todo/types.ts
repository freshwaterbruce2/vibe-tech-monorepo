export interface Todo {
	id: string;
	text: string;
	completed: boolean;
	dueDate?: Date;
	category: string;
	priority: "low" | "medium" | "high";
	created_at?: string;
	updated_at?: string;
}

export type TodoPriority = "low" | "medium" | "high";
export type TodoCategory = string;
