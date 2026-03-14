import type React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	as?: "div" | "section" | "article";
}

const Card = ({
	as: Component = "div",
	className,
	...props
}: CardProps) => {
	return (
		<Component
			className={["ui-card", className].filter(Boolean).join(" ")}
			{...props}
		/>
	);
};

export default Card;
