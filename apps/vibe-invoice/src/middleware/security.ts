export const sanitizeText = (value: string) => {
	return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
};

export const sanitizeEmail = (value: string) =>
	sanitizeText(value).toLowerCase();

export const sanitizeMoney = (value: number) => {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.round(value * 100) / 100);
};
