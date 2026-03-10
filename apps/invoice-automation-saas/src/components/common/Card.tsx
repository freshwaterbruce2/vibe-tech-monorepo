import type React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	as?: "div" | "section" | "article";
}

const Card: React.FC<CardProps> = ({
	as: Component = "div",
	className,
	...props
}) => {
	return (
		<Component
			className={["ui-card", className].filter(Boolean).join(" ")}
			{...props}
		/>
	);
};

export default Card;
