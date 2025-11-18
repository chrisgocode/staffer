export const staffColors = [
  "bg-blue-500/20 border-blue-500/50 text-black",
  "bg-emerald-500/20 border-emerald-500/50 text-black",
  "bg-purple-500/20 border-purple-500/50 text-black",
  "bg-amber-500/20 border-amber-500/50 text-black",
  "bg-rose-500/20 border-rose-500/50 text-black",
  "bg-cyan-500/20 border-cyan-500/50 text-black",
  "bg-indigo-500/20 border-indigo-500/50 text-black",
  "bg-teal-500/20 border-teal-500/50 text-black",
  "bg-orange-500/20 border-orange-500/50 text-black",
  "bg-pink-500/20 border-pink-500/50 text-black",
  "bg-lime-500/20 border-lime-500/50 text-black",
  "bg-fuchsia-500/20 border-fuchsia-500/50 text-black",
  "bg-violet-500/20 border-violet-500/50 text-black",
  "bg-sky-500/20 border-sky-500/50 text-black",
  "bg-red-500/20 border-red-500/50 text-black",
];

export function getStaffColor(index: number): string {
  return staffColors[
    ((index % staffColors.length) + staffColors.length) % staffColors.length
  ];
}
