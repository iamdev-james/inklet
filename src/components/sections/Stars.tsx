const STARS: Array<[number, number, number, number]> = [
  [8, 12, 2, 0], [16, 68, 1, 1.2], [22, 30, 1, 2.1], [31, 84, 2, 0.4],
  [38, 18, 1, 3.2], [44, 55, 1, 1.8], [52, 8, 2, 2.6], [58, 74, 1, 0.9],
  [64, 26, 1, 3.8], [71, 62, 2, 1.5], [78, 14, 1, 2.9], [84, 46, 1, 0.2],
  [90, 78, 2, 3.5], [12, 44, 1, 4.1], [95, 28, 1, 1.1], [27, 6, 1, 2.4],
  [69, 90, 1, 0.7], [48, 38, 1, 4.4], [86, 66, 1, 1.9], [5, 88, 1, 3.0],
];

export function Stars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map(([x, y, size, delay], index) => (
        <span
          key={index}
          className="star"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}
