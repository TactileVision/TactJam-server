export default function mapForDatabase(positions) {
  const x = [];
  const y = [];
  const z = [];

  // change the schema to xyz
  for (let i = 0; i < positions.length; i++) {
    if (
      positions[i].x != null &&
      positions[i].y != null &&
      positions[i].z != null
    ) {
      x.push(positions[i].x);
      y.push(positions[i].y);
      z.push(positions[i].z);
    }
  }

  return {
    x: x,
    y: y,
    z: z,
  };
}
