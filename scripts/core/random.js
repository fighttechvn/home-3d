/** Số ngẫu nhiên có hạt giống: cùng hạt giống cho ra cùng vân gỗ, cùng dáng cây mỗi lần dựng lại. */

let randomSeed = 7;

export function seededRandom() {
  randomSeed = (randomSeed * 16807) % 2147483647;
  return (randomSeed - 1) / 2147483646;
}
export const getRandomSeed = () => randomSeed;
export function setRandomSeed(seed) { randomSeed = seed; }
