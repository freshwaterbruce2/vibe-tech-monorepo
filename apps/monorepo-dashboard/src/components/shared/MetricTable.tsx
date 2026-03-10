// Sortable table component with mobile responsiveness

import { clsx } from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";

export interface TableColumn<T = any> {
	header: string;
	accessor: keyof T | string;
	render?: (value: any, row: T) => React.ReactNode;
	sortable?: boolean;
	className?: string;
}

export interface MetricTableProps<T = any> {
	columns: TableColumn<T>[];
	data: T[];
	emptyMessage?: string;
	stickyHeader?: boolean;
}

type SortDirection = "asc" | "desc" | null;

export function MetricTable<T extends Record<string, any>>({
	columns,
	data,
	emptyMessage = "No data available",
	stickyHeader = false,
}: MetricTableProps<T>) {
	const [sortColumn, setSortColumn] = useState<string | null>(null);
	const [sortDirection, setSortDirection] = useState<SortDirection>(null);

	// Handle column sort
	const handleSort = (accessor: string, sortable: boolean = true) => {
		if (!sortable) return;

		if (sortColumn === accessor) {
			// Toggle direction or reset
			if (sortDirection === "asc") {
				setSortDirection("desc");
			} else if (sortDirection === "desc") {
				setSortDirection(null);
				setSortColumn(null);
			}
		} else {
			setSortColumn(accessor);
			setSortDirection("asc");
		}
	};

	// Sort data
	const sortedData =
		sortColumn && sortDirection
			? [...data].sort((a, b) => {
					const aValue = a[sortColumn];
					const bValue = b[sortColumn];

					if (aValue === bValue) return 0;

					const comparison = aValue < bValue ? -1 : 1;
					return sortDirection === "asc" ? comparison : -comparison;
				})
			: data;

	// Get cell value using accessor
	const getCellValue = (row: T, accessor: string) => {
		// Support nested accessors like 'user.name'
		return accessor.split(".").reduce((obj, key) => obj?.[key], row as any);
	};

	// Render sort icon
	const SortIcon = ({ column }: { column: string }) => {
		if (sortColumn !== column) {
			return <ArrowUpDown className="w-4 h-4 opacity-40" />;
		}
		return sortDirection === "asc" ? (
			<ArrowUp className="w-4 h-4 text-primary" />
		) : (
			<ArrowDown className="w-4 h-4 text-primary" />
		);
	};

	if (data.length === 0) {
		return (
			<div className="bg-secondary/20 rounded-lg p-12 text-center">
				<p className="text-muted-foreground">{emptyMessage}</p>
			</div>
		);
	}

	return (
		<div className="bg-secondary/20 rounded-lg overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead
						className={clsx(
							"bg-secondary/40 border-b border-border",
							stickyHeader && "sticky top-0 z-10",
						)}
					>
						<tr>
							{columns.map((column, index) => {
								const accessor = column.accessor as string;
								const sortable = column.sortable !== false;

								return (
									<th
										key={index}
										className={clsx(
											"px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider",
											sortable &&
												"cursor-pointer select-none hover:bg-secondary/60 transition-colors",
											column.className,
										)}
										onClick={() => handleSort(accessor, sortable)}
									>
										<div className="flex items-center gap-2">
											<span>{column.header}</span>
											{sortable && <SortIcon column={accessor} />}
										</div>
									</th>
								);
							})}
						</tr>
					</thead>

					<tbody className="divide-y divide-border/50">
						{sortedData.map((row, rowIndex) => (
							<tr
								key={rowIndex}
								className="hover:bg-secondary/30 transition-colors"
							>
								{columns.map((column, colIndex) => {
									const accessor = column.accessor as string;
									const value = getCellValue(row, accessor);

									return (
										<td
											key={colIndex}
											className={clsx("px-6 py-4 text-sm", column.className)}
										>
											{column.render ? column.render(value, row) : value}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
