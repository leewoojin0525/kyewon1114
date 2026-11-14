import * as migration_20261114_054325_initial from "./20261114_054325_initial";

export const migrations = [
  {
    up: migration_20261114_054325_initial.up,
    down: migration_20261114_054325_initial.down,
    name: "20261114_054325_initial",
  },
];
