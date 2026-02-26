import fs from "fs";

const REMAPPINGS_FILE = "remappings.txt";

function getRemappings() {
  if (!fs.existsSync(REMAPPINGS_FILE)) {
    return [];
  }
  return fs
    .readFileSync(REMAPPINGS_FILE, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("="));
}

export function remapImportPaths() {
  return {
    eachLine: (hre: any) => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          for (const [find, replace] of getRemappings()) {
            if (line.includes(find)) {
              line = line.replace(find, replace);
            }
          }
        }
        return line;
      },
    }),
  };
}

