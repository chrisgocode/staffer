export const staffColors = [
	"bg-blue-500/20 border-blue-500/50 text-foreground",
	"bg-emerald-500/20 border-emerald-500/50 text-foreground",
	"bg-purple-500/20 border-purple-500/50 text-foreground",
	"bg-amber-500/20 border-amber-500/50 text-foreground",
	"bg-rose-500/20 border-rose-500/50 text-foreground",
	"bg-cyan-500/20 border-cyan-500/50 text-foreground",
	"bg-indigo-500/20 border-indigo-500/50 text-foreground",
	"bg-teal-500/20 border-teal-500/50 text-foreground",
	"bg-orange-500/20 border-orange-500/50 text-foreground",
	"bg-pink-500/20 border-pink-500/50 text-foreground",
	"bg-lime-500/20 border-lime-500/50 text-foreground",
	"bg-fuchsia-500/20 border-fuchsia-500/50 text-foreground",
	"bg-violet-500/20 border-violet-500/50 text-foreground",
	"bg-sky-500/20 border-sky-500/50 text-foreground",
	"bg-red-500/20 border-red-500/50 text-foreground",
];

export function getStaffColor(index: number): string {
	return staffColors[
		((index % staffColors.length) + staffColors.length) % staffColors.length
	];
}
