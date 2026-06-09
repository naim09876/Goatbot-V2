const TikTokScraper = require("nexora-tiktok-search");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "anisearch",
    aliases: ["anivideo", "ttanime"],
    version: "1.0.2",
    author: "NeoKEX",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Search and download random anime TikToks" },
    category: "anime",
    guide: { en: "{pn} <query>" }
  },

  onStart: async function ({ message, args, event, api }) {
    api.setMessageReaction("🌚", event.messageID, (err) => {}, true);

    const query = args.join(" ").trim();
    if (!query) return message.reply("Please provide a search term.");

    const searchQuery = `Anime Edit ${query}`;

    try {
      const tiktok = new TikTokScraper();
      const results = await tiktok.search(searchQuery, 10);

      if (!results || results.length === 0) {
        return message.reply("No videos found.");
      }

      const validVideos = results.filter(v => v.downloadUrl);
      if (validVideos.length === 0) {
        return message.reply("No downloadable videos found.");
      }

      const shuffledVideos = validVideos.sort(() => 0.5 - Math.random());
      
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      
      let downloadedPath = null;
      let finalVideo = null;

      for (const video of shuffledVideos) {
        try {
          const filePath = path.join(cacheDir, `anisearch_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`);
          
          const response = await axios({
            method: 'get',
            url: video.downloadUrl,
            responseType: 'stream',
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://www.tiktok.com/'
            }
          });

          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          downloadedPath = filePath;
          finalVideo = video;
          break;
        } catch (err) {
          continue;
        }
      }

      if (!downloadedPath || !finalVideo) {
        return message.reply("Failed to download the videos. The links might be expired or restricted.");
      }

      const description = finalVideo.description 
        ? finalVideo.description.length > 100 
          ? finalVideo.description.substring(0, 100) + "..." 
          : finalVideo.description
        : "Anime Video";

      await message.reply({
        body: description,
        attachment: fs.createReadStream(downloadedPath)
      });

      fs.remove(downloadedPath).catch(() => {});

    } catch (error) {
      message.reply("An error occurred during the search or download process.");
    }
  }
};
