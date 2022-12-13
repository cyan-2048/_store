import fs from "fs";

export function getToken() {
  if (fs.existsSync("./token.json")) {
    return JSON.parse(fs.readFileSync("./token.json", "utf-8"));
  }
  return null;
}

export function saveToken(token) {
  fs.writeFileSync("./token.json", JSON.stringify(token, null, "\t"));
}
