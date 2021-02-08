export default function mapOutput(dataObject) {
  const obj = {
    id: dataObject.id,
    positions: [],
  };

  // change the schema to xyz
  for (let i = 0; i < dataObject.x.length; i++) {
    obj.positions.push({
      x: dataObject.x[i],
      y: dataObject.y[i],
      z: dataObject.z[i],
    });
  }

  return obj;
}
