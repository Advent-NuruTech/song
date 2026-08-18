const fs = require("fs");
const path = require("path");

// BIG JSON FILE
const sourceFile =
  "C:/Users/ADVENT/Desktop/song/luo-songs.json";

// OUTPUT FOLDER
const outputDir =
  "C:/Users/ADVENT/Desktop/song/content/songs/english";

// Read JSON file
const rawData = fs.readFileSync(sourceFile, "utf8");

// Convert to JS object
const songs = JSON.parse(rawData);

console.log(`Found ${songs.length} songs...`);

songs.forEach((song) => {
  // Create file number like 001
  const fileNumber = String(song.hymnNumber).padStart(3, "0");

  // Create file path
  const filePath = path.join(
    outputDir,
    `${fileNumber}.json`
  );

  // Save individual song
  fs.writeFileSync(
    filePath,
    JSON.stringify(song, null, 2),
    "utf8"
  );

  console.log(`Created ${fileNumber}.json`);
});

console.log("All songs imported successfully!");