import { Badge, Button, Card, Input } from '@vibetech/ui';

export function TestSharedUI() {
	return (
		<div className="p-8 space-y-6">
			<h1 className="text-2xl font-bold">Testing @vibetech/ui Components</h1>

			<Card className="p-6">
				<h2 className="text-xl font-semibold mb-4">Shared UI Test</h2>

				<div className="space-y-4">
					<div>
						<h3 className="text-sm font-medium mb-2">Button Variants</h3>
						<div className="flex gap-2 flex-wrap">
							<Button variant="default">Default</Button>
							<Button variant="destructive">Destructive</Button>
							<Button variant="outline">Outline</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="link">Link</Button>
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium mb-2">Badge Variants</h3>
						<div className="flex gap-2">
							<Badge>Default</Badge>
							<Badge variant="secondary">Secondary</Badge>
							<Badge variant="destructive">Destructive</Badge>
							<Badge variant="outline">Outline</Badge>
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium mb-2">Input Component</h3>
						<Input placeholder="Enter text from shared UI package..." />
					</div>
				</div>
			</Card>
		</div>
	);
}
