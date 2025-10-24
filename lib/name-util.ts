export function getInitialsFromName(fullName?: string) {
  return (
    fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || ""
  );
}
